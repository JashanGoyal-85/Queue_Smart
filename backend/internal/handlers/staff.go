package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"queuesmart/internal/models"
	"queuesmart/internal/repository"
	"queuesmart/internal/services"
	"queuesmart/pkg/response"
)

type StaffHandler struct {
	queueService *services.QueueService
	queueRepo    repository.QueueRepository
	tokenRepo    repository.TokenRepository
	auditRepo    repository.AuditRepository
	analyticsRepo repository.AnalyticsRepository
	userRepo     repository.UserRepository
}

func NewStaffHandler(qs *services.QueueService, qr repository.QueueRepository, tr repository.TokenRepository, ar repository.AuditRepository, anr repository.AnalyticsRepository, ur repository.UserRepository) *StaffHandler {
	return &StaffHandler{queueService: qs, queueRepo: qr, tokenRepo: tr, auditRepo: ar, analyticsRepo: anr, userRepo: ur}
}

func (h *StaffHandler) audit(c *gin.Context, action, entityType, entityID string) {
	uid, _ := c.Get("userID")
	userID, _ := uuid.Parse(uid.(string))
	h.auditRepo.Create(&models.AuditLog{
		UserID:     userID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		IPAddress:  c.ClientIP(),
	})
}

func (h *StaffHandler) GetStaffQueues(c *gin.Context) {
	uid, _ := c.Get("userID")
	userID, _ := uuid.Parse(uid.(string))
	user, err := h.userRepo.GetByID(userID)
	if err != nil || user.VenueID == nil {
		response.Error(c, http.StatusBadRequest, "No venue assigned")
		return
	}
	queues, err := h.queueRepo.GetByVenueID(*user.VenueID)
	if err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, queues)
}

func (h *StaffHandler) GetQueueTokens(c *gin.Context) {
	queueID, _ := uuid.Parse(c.Param("id"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	_ = page
	statuses := []string{models.TokenStatusWaiting, models.TokenStatusCalled, models.TokenStatusServing}
	tokens, err := h.tokenRepo.GetByQueueID(queueID, statuses)
	if err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, tokens)
}

func (h *StaffHandler) CallToken(c *gin.Context) {
	tokenID, _ := uuid.Parse(c.Param("id"))
	token, err := h.queueService.CallToken(tokenID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.audit(c, "call_token", "token", tokenID.String())
	response.Success(c, token)
}

func (h *StaffHandler) CallNextToken(c *gin.Context) {
	queueID, _ := uuid.Parse(c.Param("id"))
	token, err := h.queueService.CallNextToken(queueID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.audit(c, "call_next_token", "queue", queueID.String())
	response.Success(c, token)
}

func (h *StaffHandler) CompleteToken(c *gin.Context) {
	tokenID, _ := uuid.Parse(c.Param("id"))
	token, err := h.queueService.CompleteToken(tokenID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.audit(c, "complete_token", "token", tokenID.String())
	response.Success(c, token)
}

func (h *StaffHandler) SkipToken(c *gin.Context) {
	tokenID, _ := uuid.Parse(c.Param("id"))
	token, err := h.queueService.SkipToken(tokenID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.audit(c, "skip_token", "token", tokenID.String())
	response.Success(c, token)
}

func (h *StaffHandler) TogglePriority(c *gin.Context) {
	tokenID, _ := uuid.Parse(c.Param("id"))
	token, err := h.queueService.TogglePriority(tokenID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(c, token)
}

func (h *StaffHandler) UpdateQueueStatus(c *gin.Context) {
	queueID, _ := uuid.Parse(c.Param("id"))
	var input struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	queue, err := h.queueService.UpdateQueueStatus(queueID, input.Status)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.audit(c, "update_queue_status", "queue", queueID.String())
	response.Success(c, queue)
}

func (h *StaffHandler) GetQueueAnalytics(c *gin.Context) {
	queueID, _ := uuid.Parse(c.Param("id"))
	waiting, _ := h.tokenRepo.CountByStatus(queueID, models.TokenStatusWaiting)
	completed, _ := h.tokenRepo.CountByStatus(queueID, models.TokenStatusCompleted)
	cancelled, _ := h.tokenRepo.CountByStatus(queueID, models.TokenStatusCancelled)
	response.Success(c, gin.H{
		"waiting":   waiting,
		"completed": completed,
		"cancelled": cancelled,
		"total":     waiting + completed + cancelled,
	})
}
