package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"queuesmart/internal/models"
	"queuesmart/internal/repository"
	"queuesmart/internal/services"
	"queuesmart/pkg/email"
	"queuesmart/pkg/response"
)

type AdminHandler struct {
	queueRepo     repository.QueueRepository
	venueRepo     repository.VenueRepository
	userRepo      repository.UserRepository
	auditRepo     repository.AuditRepository
	analyticsRepo repository.AnalyticsRepository
	predService   *services.PredictionService
	inviteRepo    repository.InvitationRepository
	emailCfg      *email.Config
}

func NewAdminHandler(
	qr repository.QueueRepository,
	vr repository.VenueRepository,
	ur repository.UserRepository,
	ar repository.AuditRepository,
	anr repository.AnalyticsRepository,
	ps *services.PredictionService,
	ir repository.InvitationRepository,
	ec *email.Config,
) *AdminHandler {
	return &AdminHandler{
		queueRepo: qr, venueRepo: vr, userRepo: ur,
		auditRepo: ar, analyticsRepo: anr, predService: ps,
		inviteRepo: ir, emailCfg: ec,
	}
}

func (h *AdminHandler) CreateQueue(c *gin.Context) {
	uid, _ := c.Get("userID")
	userID, _ := uuid.Parse(uid.(string))
	user, _ := h.userRepo.GetByID(userID)

	var input struct {
		Name                string     `json:"name" binding:"required"`
		Description         string     `json:"description"`
		Category            string     `json:"category"`
		MaxCapacity         int        `json:"max_capacity"`
		AvgServeTimeSeconds int        `json:"avg_serve_time_seconds"`
		IsPriorityEnabled   bool       `json:"is_priority_enabled"`
		VenueID             *uuid.UUID `json:"venue_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	if input.MaxCapacity == 0 {
		input.MaxCapacity = 100
	}
	if input.AvgServeTimeSeconds == 0 {
		input.AvgServeTimeSeconds = 180
	}

	// Determine which venue to create the queue in:
	// - If the request body supplies a venue_id (superadmin flow), use it.
	// - Otherwise fall back to the logged-in user's assigned venue (admin flow).
	var venueID uuid.UUID
	if input.VenueID != nil {
		venueID = *input.VenueID
	} else if user.VenueID != nil {
		venueID = *user.VenueID
	} else {
		response.Error(c, http.StatusBadRequest, "No venue associated with your account. Please provide a venue_id.")
		return
	}

	queue := &models.Queue{
		VenueID:             venueID,
		Name:                input.Name,
		Description:         input.Description,
		Category:            input.Category,
		Status:              models.QueueStatusInactive,
		MaxCapacity:         input.MaxCapacity,
		AvgServeTimeSeconds: input.AvgServeTimeSeconds,
		IsPriorityEnabled:   input.IsPriorityEnabled,
		CreatedBy:           userID,
	}
	if err := h.queueRepo.Create(queue); err != nil {
		response.InternalError(c)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": queue})
}

func (h *AdminHandler) UpdateQueue(c *gin.Context) {
	queueID, _ := uuid.Parse(c.Param("id"))
	queue, err := h.queueRepo.GetByID(queueID)
	if err != nil {
		response.NotFound(c, "Queue not found")
		return
	}
	var input struct {
		Name                string `json:"name"`
		Description         string `json:"description"`
		MaxCapacity         int    `json:"max_capacity"`
		AvgServeTimeSeconds int    `json:"avg_serve_time_seconds"`
		IsPriorityEnabled   *bool  `json:"is_priority_enabled"`
	}
	c.ShouldBindJSON(&input)
	if input.Name != "" { queue.Name = input.Name }
	if input.Description != "" { queue.Description = input.Description }
	if input.MaxCapacity > 0 { queue.MaxCapacity = input.MaxCapacity }
	if input.AvgServeTimeSeconds > 0 { queue.AvgServeTimeSeconds = input.AvgServeTimeSeconds }
	if input.IsPriorityEnabled != nil { queue.IsPriorityEnabled = *input.IsPriorityEnabled }
	h.queueRepo.Update(queue)
	response.Success(c, queue)
}

func (h *AdminHandler) DeleteQueue(c *gin.Context) {
	queueID, _ := uuid.Parse(c.Param("id"))
	if err := h.queueRepo.Delete(queueID); err != nil {
		response.InternalError(c)
		return
	}
	response.SuccessWithMessage(c, "Queue deleted", nil)
}

func (h *AdminHandler) GetVenueStats(c *gin.Context) {
	venueID, _ := uuid.Parse(c.Param("id"))
	from := c.DefaultQuery("from", "2024-01-01")
	to := c.DefaultQuery("to", "2099-12-31")
	stats, err := h.analyticsRepo.GetVenueStats(venueID, from, to)
	if err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, stats)
}

func (h *AdminHandler) GetPeakHours(c *gin.Context) {
	venueID, _ := uuid.Parse(c.Param("id"))
	data, err := h.predService.GetPeakHours(venueID)
	if err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, data)
}

func (h *AdminHandler) GetVenueUsers(c *gin.Context) {
	venueID, _ := uuid.Parse(c.Param("id"))
	users, _, _ := h.userRepo.List(1, 100, "", "")
	var venueUsers []models.User
	for _, u := range users {
		if u.VenueID != nil && *u.VenueID == venueID {
			venueUsers = append(venueUsers, u)
		}
	}
	response.Success(c, venueUsers)
}

// InviteStaffUser sends an email invitation to a new staff/admin member.
// The account is created only after the invitee accepts the link.
func (h *AdminHandler) InviteStaffUser(c *gin.Context) {
	venueID := c.Param("id")
	callerID, _ := c.Get("userID")

	var input struct {
		Name  string `json:"name"  binding:"required"`
		Email string `json:"email" binding:"required,email"`
		Role  string `json:"role"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	if input.Role == "" {
		input.Role = "staff"
	}

	if err := CreateInvite(
		h.inviteRepo, h.venueRepo, h.emailCfg,
		input.Email, input.Name, input.Role,
		venueID, callerID.(string),
	); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to send invitation: "+err.Error())
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Invitation sent to " + input.Email + ". They will receive an email with a link to set up their account.",
	})
}

// ListVenueInvites returns all pending invitations for a venue (admin view).
func (h *AdminHandler) ListVenueInvites(c *gin.Context) {
	venueID, _ := uuid.Parse(c.Param("id"))
	invites, err := h.inviteRepo.ListByVenue(venueID)
	if err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, invites)
}


func (h *AdminHandler) RemoveStaff(c *gin.Context) {
	userID, _ := uuid.Parse(c.Param("userId"))
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}
	user.VenueID = nil
	h.userRepo.Update(user)
	response.SuccessWithMessage(c, "Staff removed from venue", nil)
}

func (h *AdminHandler) GetAuditLogs(c *gin.Context) {
	action := c.Query("action")
	logs, total, _ := h.auditRepo.List(1, 50, nil, action)
	response.Success(c, gin.H{"logs": logs, "total": total})
}
