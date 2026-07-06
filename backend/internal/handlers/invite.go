package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"queuesmart/internal/models"
	"queuesmart/internal/repository"
	"queuesmart/pkg/email"
	"queuesmart/pkg/response"
)


// InviteHandler handles staff invitation accept flow (public endpoints — no auth).
type InviteHandler struct {
	inviteRepo repository.InvitationRepository
	userRepo   repository.UserRepository
	venueRepo  repository.VenueRepository
}

func NewInviteHandler(
	ir repository.InvitationRepository,
	ur repository.UserRepository,
	vr repository.VenueRepository,
) *InviteHandler {
	return &InviteHandler{inviteRepo: ir, userRepo: ur, venueRepo: vr}
}

// generateToken returns a cryptographically-random 32-byte hex token.
func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// CreateInvite is the shared helper called by admin and superadmin to send an invite.
// It creates the Invitation record and fires off the email (or logs to console in dev).
func CreateInvite(
	inviteRepo repository.InvitationRepository,
	venueRepo repository.VenueRepository,
	emailCfg *email.Config,
	toEmail, toName, role string,
	venueIDStr string,
	createdByIDStr string,
) error {
	token, err := generateToken()
	if err != nil {
		return err
	}

	vid, err := uuid.Parse(venueIDStr)
	if err != nil {
		return err
	}
	cid, _ := uuid.Parse(createdByIDStr)

	inv := &models.Invitation{
		Email:     toEmail,
		Name:      toName,
		Role:      role,
		VenueID:   vid,
		Token:     token,
		ExpiresAt: time.Now().Add(72 * time.Hour),
		CreatedBy: cid,
	}

	if err := inviteRepo.Create(inv); err != nil {
		return err
	}

	venueName := "your venue"
	if v, err := venueRepo.GetByID(vid); err == nil {
		venueName = v.Name
	}

	_ = emailCfg.SendInvite(toEmail, toName, venueName, role, token)
	return nil
}

// ValidateInvite handles GET /auth/invite/validate?token=xxx
// Returns invitation details without accepting it (used to pre-fill the accept form).
func (h *InviteHandler) ValidateInvite(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		response.Error(c, http.StatusBadRequest, "token is required")
		return
	}

	inv, err := h.inviteRepo.GetByToken(token)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Invalid or expired invitation link")
		return
	}
	if inv.IsAccepted() {
		response.Error(c, http.StatusBadRequest, "This invitation has already been accepted")
		return
	}
	if inv.IsExpired() {
		response.Error(c, http.StatusBadRequest, "This invitation link has expired (72-hour window)")
		return
	}

	venueName := ""
	if v, err := h.venueRepo.GetByID(inv.VenueID); err == nil {
		venueName = v.Name
	}

	response.Success(c, gin.H{
		"email":      inv.Email,
		"name":       inv.Name,
		"role":       inv.Role,
		"venue_name": venueName,
		"expires_at": inv.ExpiresAt,
	})
}

// AcceptInvite handles POST /auth/invite/accept
// Body: { token, name, password }
// Creates or activates the staff account with the invite's venue_id.
func (h *InviteHandler) AcceptInvite(c *gin.Context) {
	var input struct {
		Token    string `json:"token"    binding:"required"`
		Name     string `json:"name"     binding:"required,min=2"`
		Password string `json:"password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	inv, err := h.inviteRepo.GetByToken(input.Token)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Invalid invitation")
		return
	}
	if inv.IsAccepted() {
		response.Error(c, http.StatusBadRequest, "Invitation already accepted")
		return
	}
	if inv.IsExpired() {
		response.Error(c, http.StatusBadRequest, "Invitation has expired")
		return
	}

	venueID := inv.VenueID

	// If user already exists (e.g. re-invited), just update their venue & role.
	if existing, err := h.userRepo.GetByEmail(inv.Email); err == nil {
		existing.VenueID = &venueID
		existing.Role = inv.Role
		existing.IsActive = true
		existing.IsVerified = true
		h.userRepo.Update(existing)
		h.inviteRepo.MarkAccepted(inv.ID)
		response.SuccessWithMessage(c, "Invitation accepted. You can now log in.", nil)
		return
	}

	// Create brand-new staff account.
	hash, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	user := &models.User{
		Name:         input.Name,
		Email:        inv.Email,
		PasswordHash: string(hash),
		Role:         inv.Role,
		VenueID:      &venueID,
		IsActive:     true,
		IsVerified:   true, // verified via invite link
	}
	if err := h.userRepo.Create(user); err != nil {
		response.Error(c, http.StatusConflict, "An account with that email already exists")
		return
	}

	h.inviteRepo.MarkAccepted(inv.ID)
	response.SuccessWithMessage(c, "Account created! You can now log in with your email and password.", nil)
}
