package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"queuesmart/internal/repository"
	"queuesmart/internal/services"
	pkgqr "queuesmart/pkg/qrcode"
	"queuesmart/pkg/response"
	"queuesmart/config"
)

type QueueHandler struct {
	queueService *services.QueueService
	tokenRepo    repository.TokenRepository
	cfg          *config.Config
}

func NewQueueHandler(qs *services.QueueService, tr repository.TokenRepository, cfg *config.Config) *QueueHandler {
	return &QueueHandler{queueService: qs, tokenRepo: tr, cfg: cfg}
}

func (h *QueueHandler) GetQueue(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid queue ID")
		return
	}
	queue, err := h.queueService.GetQueueStatus(id)
	if err != nil {
		response.NotFound(c, "Queue not found")
		return
	}
	response.Success(c, queue)
}

func (h *QueueHandler) JoinQueue(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid queue ID")
		return
	}
	var input struct {
		GuestName  string `json:"guest_name"`
		GuestPhone string `json:"guest_phone"`
		Priority   bool   `json:"priority"`
	}
	c.ShouldBindJSON(&input)

	var userID *uuid.UUID
	if uid, exists := c.Get("userID"); exists {
		parsed, _ := uuid.Parse(uid.(string))
		userID = &parsed
	}

	token, err := h.queueService.JoinQueue(id, userID, input.GuestName, input.GuestPhone, input.Priority)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": token})
}

func (h *QueueHandler) GetPosition(c *gin.Context) {
	queueID, _ := uuid.Parse(c.Param("id"))
	tokenID, _ := uuid.Parse(c.Param("tokenId"))
	pos, estimated, readyAt, err := h.queueService.GetTokenPosition(queueID, tokenID)
	if err != nil {
		response.NotFound(c, "Token not found")
		return
	}
	response.Success(c, gin.H{
		"position":              pos,
		"estimated_wait_seconds": estimated,
		"estimated_ready_at":    readyAt, // absolute UTC deadline for stable countdown
	})
}

func (h *QueueHandler) GetQueueQR(c *gin.Context) {
	id := c.Param("id")
	url := h.cfg.FrontendURL + "/join/" + id
	png, err := pkgqr.GenerateQRCode(url)
	if err != nil {
		response.InternalError(c)
		return
	}
	c.Header("Content-Disposition", "attachment; filename=queue-qr.png")
	c.Data(http.StatusOK, "image/png", png)
}

func (h *QueueHandler) GetToken(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	token, err := h.tokenRepo.GetByID(id)
	if err != nil {
		response.NotFound(c, "Token not found")
		return
	}
	response.Success(c, token)
}

func (h *QueueHandler) CancelToken(c *gin.Context) {
	tokenID, _ := uuid.Parse(c.Param("id"))
	var userID *uuid.UUID
	if uid, exists := c.Get("userID"); exists {
		parsed, _ := uuid.Parse(uid.(string))
		userID = &parsed
	}
	token, err := h.queueService.CancelToken(tokenID, userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(c, token)
}
