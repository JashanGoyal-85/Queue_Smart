package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"queuesmart/internal/repository"
	"queuesmart/pkg/response"
)

type VenueHandler struct {
	venueRepo repository.VenueRepository
}

func NewVenueHandler(vr repository.VenueRepository) *VenueHandler {
	return &VenueHandler{venueRepo: vr}
}

func (h *VenueHandler) ListVenues(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	city := c.Query("city")
	category := c.Query("category")
	search := c.Query("q")
	venues, total, err := h.venueRepo.List(page, limit, city, category, search)
	if err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, gin.H{"venues": venues, "total": total, "page": page, "limit": limit})
}

func (h *VenueHandler) GetVenue(c *gin.Context) {
	slug := c.Param("slug")
	venue, err := h.venueRepo.GetBySlug(slug)
	if err != nil {
		response.NotFound(c, "Venue not found")
		return
	}
	response.Success(c, venue)
}
