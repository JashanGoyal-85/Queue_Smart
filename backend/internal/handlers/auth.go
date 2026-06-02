package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"queuesmart/config"
	"queuesmart/internal/models"
	"queuesmart/internal/repository"
	pkgjwt "queuesmart/pkg/jwt"
	pkgredis "queuesmart/pkg/redis"
	"queuesmart/pkg/response"
	rdb "github.com/redis/go-redis/v9"
)

type AuthHandler struct {
	userRepo repository.UserRepository
	redis    *rdb.Client
	cfg      *config.Config
}

func NewAuthHandler(ur repository.UserRepository, rc *rdb.Client, cfg *config.Config) *AuthHandler {
	return &AuthHandler{userRepo: ur, redis: rc, cfg: cfg}
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
	if _, err := h.userRepo.GetByEmail(input.Email); err == nil {
		response.Error(c, http.StatusConflict, "Email already registered")
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
	access, _ := pkgjwt.GenerateAccessToken(user.ID, user.Role, h.cfg)
	refresh, _ := pkgjwt.GenerateRefreshToken(user.ID, h.cfg)
	ctx := context.Background()
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
		response.SuccessWithMessage(c, "If that email exists, a reset link has been sent", nil)
		return
	}
	resetToken := uuid.New().String()
	ctx := context.Background()
	pkgredis.SetWithExpiry(ctx, h.redis, "reset:"+resetToken, user.ID.String(), time.Hour)
	response.SuccessWithMessage(c, "Password reset link sent to your email", gin.H{"reset_token": resetToken})
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
