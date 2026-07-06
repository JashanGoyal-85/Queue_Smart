package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"queuesmart/internal/models"
	"queuesmart/internal/repository"
	"queuesmart/pkg/response"
)

type SuperAdminHandler struct {
	venueRepo repository.VenueRepository
	userRepo  repository.UserRepository
	queueRepo repository.QueueRepository
	tokenRepo repository.TokenRepository
}

func NewSuperAdminHandler(vr repository.VenueRepository, ur repository.UserRepository, qr repository.QueueRepository, tr repository.TokenRepository) *SuperAdminHandler {
	return &SuperAdminHandler{venueRepo: vr, userRepo: ur, queueRepo: qr, tokenRepo: tr}
}

func (h *SuperAdminHandler) CreateVenue(c *gin.Context) {
	var input struct {
		Name         string `json:"name" binding:"required"`
		Slug         string `json:"slug" binding:"required"`
		Description  string `json:"description"`
		Address      string `json:"address"`
		City         string `json:"city"`
		State        string `json:"state"`
		Country      string `json:"country"`
		Category     string `json:"category"`
		ContactEmail string `json:"contact_email"`
		ContactPhone string `json:"contact_phone"`
		LogoURL      string `json:"logo_url"`
		CoverURL     string `json:"cover_url"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	venue := &models.Venue{
		Name:         input.Name,
		Slug:         input.Slug,
		Description:  input.Description,
		Address:      input.Address,
		City:         input.City,
		State:        input.State,
		Country:      input.Country,
		Category:     input.Category,
		ContactEmail: input.ContactEmail,
		ContactPhone: input.ContactPhone,
		LogoURL:      input.LogoURL,
		CoverURL:     input.CoverURL,
		IsActive:     true,
	}
	if err := h.venueRepo.Create(venue); err != nil {
		response.Error(c, http.StatusConflict, "Venue slug already exists")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": venue})
}

func (h *SuperAdminHandler) ListAllVenues(c *gin.Context) {
	venues, err := h.venueRepo.ListAll()
	if err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, venues)
}

func (h *SuperAdminHandler) UpdateVenue(c *gin.Context) {
	venueID, _ := uuid.Parse(c.Param("id"))
	venue, err := h.venueRepo.GetByID(venueID)
	if err != nil {
		response.NotFound(c, "Venue not found")
		return
	}
	var input struct {
		Name         string `json:"name"`
		Description  string `json:"description"`
		Address      string `json:"address"`
		City         string `json:"city"`
		IsActive     *bool  `json:"is_active"`
		ContactEmail string `json:"contact_email"`
		ContactPhone string `json:"contact_phone"`
		LogoURL      string `json:"logo_url"`
		CoverURL     string `json:"cover_url"`
	}
	c.ShouldBindJSON(&input)
	if input.Name != "" { venue.Name = input.Name }
	if input.Description != "" { venue.Description = input.Description }
	if input.Address != "" { venue.Address = input.Address }
	if input.City != "" { venue.City = input.City }
	if input.IsActive != nil { venue.IsActive = *input.IsActive }
	if input.ContactEmail != "" { venue.ContactEmail = input.ContactEmail }
	if input.ContactPhone != "" { venue.ContactPhone = input.ContactPhone }
	if input.LogoURL != "" { venue.LogoURL = input.LogoURL }
	if input.CoverURL != "" { venue.CoverURL = input.CoverURL }
	h.venueRepo.Update(venue)
	response.Success(c, venue)
}

func (h *SuperAdminHandler) ListAllUsers(c *gin.Context) {
	role := c.Query("role")
	search := c.Query("q")
	users, total, _ := h.userRepo.List(1, 100, role, search)
	response.Success(c, gin.H{"users": users, "total": total})
}

func (h *SuperAdminHandler) UpdateUserRole(c *gin.Context) {
	userID, _ := uuid.Parse(c.Param("id"))
	var input struct {
		Role    string     `json:"role" binding:"required"`
		VenueID *uuid.UUID `json:"venue_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}
	user.Role = input.Role
	if input.VenueID != nil {
		user.VenueID = input.VenueID
	}
	h.userRepo.Update(user)
	response.Success(c, user)
}

func (h *SuperAdminHandler) GetSystemStats(c *gin.Context) {
	totalUsers, _ := h.userRepo.CountAll()
	venues, _ := h.venueRepo.ListAll()
	totalVenues := int64(len(venues))
	response.Success(c, gin.H{
		"total_users":  totalUsers,
		"total_venues": totalVenues,
		"platform":     "QueueSmart",
	})
}

// AssignVenue sets or updates the venue_id for a specific user.
// PUT /superadmin/users/:id/venue  { "venue_id": "uuid" }
func (h *SuperAdminHandler) AssignVenue(c *gin.Context) {
	userID, _ := uuid.Parse(c.Param("id"))

	var input struct {
		VenueID string `json:"venue_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	venueID, err := uuid.Parse(input.VenueID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid venue_id")
		return
	}

	// Verify venue exists
	if _, err := h.venueRepo.GetByID(venueID); err != nil {
		response.NotFound(c, "Venue not found")
		return
	}

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}

	user.VenueID = &venueID
	if err := h.userRepo.Update(user); err != nil {
		response.InternalError(c)
		return
	}

	response.Success(c, user)
}

