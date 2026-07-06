package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"queuesmart/config"
	"queuesmart/internal/models"
	"queuesmart/internal/repository"
	pkgemail "queuesmart/pkg/email"
	pkgjwt "queuesmart/pkg/jwt"
	pkgredis "queuesmart/pkg/redis"
	"queuesmart/pkg/response"
	rdb "github.com/redis/go-redis/v9"
)

type AuthHandler struct {
	userRepo repository.UserRepository
	redis    *rdb.Client
	cfg      *config.Config
	email    *pkgemail.Config
}

func NewAuthHandler(ur repository.UserRepository, rc *rdb.Client, cfg *config.Config, emailCfg *pkgemail.Config) *AuthHandler {
	return &AuthHandler{userRepo: ur, redis: rc, cfg: cfg, email: emailCfg}
}

type registerInput struct {
	Name     string `json:"name" binding:"required,min=2"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Phone    string `json:"phone"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var input registerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	ctx := context.Background()

	// Check if email already exists
	if existingUser, err := h.userRepo.GetByEmail(input.Email); err == nil {
		if existingUser.IsVerified {
			// Fully verified account — hard block
			response.Error(c, http.StatusConflict, "Email already registered. Please sign in instead.")
			return
		}
		// Account exists but NOT verified — resend verification email with a fresh code
		verifyCode := uuid.New().String()
		pkgredis.SetWithExpiry(ctx, h.redis, "verify:"+verifyCode, existingUser.ID.String(), 24*time.Hour)
		go h.email.SendVerificationEmail(existingUser.Email, existingUser.Name, verifyCode)
		// Return the same shape as a fresh registration so the frontend shows "Check your inbox"
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"user": existingUser}})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		response.InternalError(c)
		return
	}
	user := &models.User{
		Name:         input.Name,
		Email:        input.Email,
		PasswordHash: string(hash),
		Phone:        input.Phone,
		Role:         models.RoleUser,
	}
	if err := h.userRepo.Create(user); err != nil {
		response.InternalError(c)
		return
	}

	// Generate and store verification code in Redis (24h TTL)
	verifyCode := uuid.New().String()
	pkgredis.SetWithExpiry(ctx, h.redis, "verify:"+verifyCode, user.ID.String(), 24*time.Hour)

	// Send verification email asynchronously (don't block the HTTP response)
	go h.email.SendVerificationEmail(user.Email, user.Name, verifyCode)

	access, _ := pkgjwt.GenerateAccessToken(user.ID, user.Role, h.cfg)
	refresh, _ := pkgjwt.GenerateRefreshToken(user.ID, h.cfg)
	pkgredis.SetWithExpiry(ctx, h.redis, "refresh:"+user.ID.String(), refresh, 168*time.Hour)
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"user": user, "access_token": access, "refresh_token": refresh}})
}

type loginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input loginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	user, err := h.userRepo.GetByEmail(input.Email)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		response.Error(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}
	if !user.IsActive {
		response.Error(c, http.StatusForbidden, "Account is deactivated")
		return
	}
	access, _ := pkgjwt.GenerateAccessToken(user.ID, user.Role, h.cfg)
	refresh, _ := pkgjwt.GenerateRefreshToken(user.ID, h.cfg)
	ctx := context.Background()
	pkgredis.SetWithExpiry(ctx, h.redis, "refresh:"+user.ID.String(), refresh, 168*time.Hour)
	response.Success(c, gin.H{"user": user, "access_token": access, "refresh_token": refresh})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	userID, _ := c.Get("userID")
	ctx := context.Background()
	pkgredis.Delete(ctx, h.redis, "refresh:"+userID.(string))
	response.SuccessWithMessage(c, "Logged out successfully", nil)
}

type refreshInput struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var input refreshInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	claims, err := pkgjwt.ValidateToken(input.RefreshToken, h.cfg.JWTSecret)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "Invalid refresh token")
		return
	}
	ctx := context.Background()
	stored, err := pkgredis.Get(ctx, h.redis, "refresh:"+claims.UserID)
	if err != nil || stored != input.RefreshToken {
		response.Error(c, http.StatusUnauthorized, "Refresh token expired or invalid")
		return
	}
	userID, _ := uuid.Parse(claims.UserID)
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "User not found")
		return
	}
	access, _ := pkgjwt.GenerateAccessToken(user.ID, user.Role, h.cfg)
	response.Success(c, gin.H{"access_token": access})
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	user, err := h.userRepo.GetByEmail(input.Email)
	if err != nil {
		// Don't reveal whether the email exists — always return success
		response.SuccessWithMessage(c, "If that email is registered, a reset link has been sent", nil)
		return
	}
	resetToken := uuid.New().String()
	ctx := context.Background()
	// Store token in Redis with 1 hour TTL
	pkgredis.SetWithExpiry(ctx, h.redis, "reset:"+resetToken, user.ID.String(), time.Hour)
	// Send the reset email asynchronously
	go h.email.SendResetPasswordEmail(user.Email, user.Name, resetToken)
	// Never expose the token in the response — it's only delivered via email
	response.SuccessWithMessage(c, "If that email is registered, a reset link has been sent", nil)
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var input struct {
		Token    string `json:"token" binding:"required"`
		Password string `json:"password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	ctx := context.Background()
	userIDStr, err := pkgredis.Get(ctx, h.redis, "reset:"+input.Token)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Reset token invalid or expired")
		return
	}
	userID, _ := uuid.Parse(userIDStr)
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "User not found")
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	user.PasswordHash = string(hash)
	h.userRepo.Update(user)
	pkgredis.Delete(ctx, h.redis, "reset:"+input.Token)
	response.SuccessWithMessage(c, "Password reset successfully", nil)
}

func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		response.Error(c, http.StatusBadRequest, "Verification code required")
		return
	}
	ctx := context.Background()
	userIDStr, err := pkgredis.Get(ctx, h.redis, "verify:"+code)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid or expired verification code")
		return
	}
	userID, _ := uuid.Parse(userIDStr)
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		response.InternalError(c)
		return
	}
	user.IsVerified = true
	h.userRepo.Update(user)
	pkgredis.Delete(ctx, h.redis, "verify:"+code)
	response.SuccessWithMessage(c, "Email verified successfully", nil)
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

func (h *AuthHandler) googleOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     h.cfg.GoogleClientID,
		ClientSecret: h.cfg.GoogleClientSecret,
		RedirectURL:  h.cfg.GoogleRedirectURL,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}
}

// GoogleLogin redirects the browser to Google's OAuth consent screen.
func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	if h.cfg.GoogleClientID == "" {
		response.Error(c, http.StatusServiceUnavailable, "Google OAuth not configured")
		return
	}
	// Generate a random state token and store it in Redis (5 min TTL) to prevent CSRF
	state := uuid.New().String()
	ctx := context.Background()
	pkgredis.SetWithExpiry(ctx, h.redis, "oauth_state:"+state, "1", 5*time.Minute)

	url := h.googleOAuthConfig().AuthCodeURL(state, oauth2.AccessTypeOnline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// GoogleCallback handles the redirect from Google after the user approves access.
func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	ctx := context.Background()

	// 1. Validate CSRF state
	state := c.Query("state")
	_, err := pkgredis.Get(ctx, h.redis, "oauth_state:"+state)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=invalid_state")
		return
	}
	pkgredis.Delete(ctx, h.redis, "oauth_state:"+state)

	// 2. Exchange code for Google access token
	code := c.Query("code")
	oauthToken, err := h.googleOAuthConfig().Exchange(ctx, code)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=oauth_exchange_failed")
		return
	}

	// 3. Fetch Google user info
	client := h.googleOAuthConfig().Client(ctx, oauthToken)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=userinfo_failed")
		return
	}
	defer resp.Body.Close()

	var googleUser struct {
		ID         string `json:"id"`
		Email      string `json:"email"`
		Name       string `json:"name"`
		Picture    string `json:"picture"`
		VerifiedEmail bool `json:"verified_email"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&googleUser); err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=decode_failed")
		return
	}

	// 4. Find or create user
	var user *models.User

	// Try by Google ID first
	user, err = h.userRepo.GetByGoogleID(googleUser.ID)
	if err != nil {
		// Try by email (existing email-password account — link it)
		user, err = h.userRepo.GetByEmail(googleUser.Email)
		if err != nil {
			// New user — create account (Google-verified, no password)
			user = &models.User{
				Name:       googleUser.Name,
				Email:      googleUser.Email,
				GoogleID:   googleUser.ID,
				AvatarURL:  googleUser.Picture,
				Role:       models.RoleUser,
				IsActive:   true,
				IsVerified: true, // Google already verified the email
			}
			if err := h.userRepo.Create(user); err != nil {
				c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=create_failed")
				return
			}
		} else {
			// Existing email-password user — link Google account
			user.GoogleID = googleUser.ID
			if user.AvatarURL == "" {
				user.AvatarURL = googleUser.Picture
			}
			user.IsVerified = true
			h.userRepo.Update(user)
		}
	}

	if !user.IsActive {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=account_deactivated")
		return
	}

	// 5. Issue JWT tokens
	access, _ := pkgjwt.GenerateAccessToken(user.ID, user.Role, h.cfg)
	refresh, _ := pkgjwt.GenerateRefreshToken(user.ID, h.cfg)
	pkgredis.SetWithExpiry(ctx, h.redis, "refresh:"+user.ID.String(), refresh, 168*time.Hour)

	// 6. Redirect to frontend callback page with tokens
	redirectURL := fmt.Sprintf("%s/auth/callback?access_token=%s&refresh_token=%s",
		h.cfg.FrontendURL, access, refresh)
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}
