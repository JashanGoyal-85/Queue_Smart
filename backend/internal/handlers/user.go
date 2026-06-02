package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"queuesmart/internal/repository"
	"queuesmart/internal/services"
	"queuesmart/pkg/response"
)

type UserHandler struct {
	userRepo     repository.UserRepository
	tokenRepo    repository.TokenRepository
	notifService *services.NotificationService
}

func NewUserHandler(ur repository.UserRepository, tr repository.TokenRepository, ns *services.NotificationService) *UserHandler {
	return &UserHandler{userRepo: ur, tokenRepo: tr, notifService: ns}
}

func (h *UserHandler) GetMe(c *gin.Context) {
	userIDStr, _ := c.Get("userID")
	userID, _ := uuid.Parse(userIDStr.(string))
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}
	response.Success(c, user)
}

func (h *UserHandler) UpdateMe(c *gin.Context) {
	userIDStr, _ := c.Get("userID")
	userID, _ := uuid.Parse(userIDStr.(string))
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}
	var input struct {
		Name      string `json:"name"`
		Phone     string `json:"phone"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	if input.Name != "" {
		user.Name = input.Name
	}
	if input.Phone != "" {
		user.Phone = input.Phone
	}
	if input.AvatarURL != "" {
		user.AvatarURL = input.AvatarURL
	}
	if err := h.userRepo.Update(user); err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, user)
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
	userIDStr, _ := c.Get("userID")
	userID, _ := uuid.Parse(userIDStr.(string))
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}
	var input struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.OldPassword)); err != nil {
		response.Error(c, http.StatusBadRequest, "Current password is incorrect")
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	user.PasswordHash = string(hash)
	h.userRepo.Update(user)
	response.SuccessWithMessage(c, "Password updated successfully", nil)
}

func (h *UserHandler) GetMyTokens(c *gin.Context) {
	userIDStr, _ := c.Get("userID")
	userID, _ := uuid.Parse(userIDStr.(string))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	tokens, total, err := h.tokenRepo.GetByUserID(userID, page, limit)
	if err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, gin.H{"tokens": tokens, "total": total, "page": page, "limit": limit})
}

func (h *UserHandler) GetMyStats(c *gin.Context) {
	userIDStr, _ := c.Get("userID")
	userID, _ := uuid.Parse(userIDStr.(string))
	tokens, total, _ := h.tokenRepo.GetByUserID(userID, 1, 1000)
	avgWait := 0
	timeSaved := 0
	completed := 0
	for _, t := range tokens {
		if t.Status == "completed" && t.ActualWaitSeconds > 0 {
			avgWait += t.ActualWaitSeconds
			completed++
			timeSaved += t.EstimatedWaitSeconds - t.ActualWaitSeconds
		}
	}
	if completed > 0 {
		avgWait = avgWait / completed
	}
	response.Success(c, gin.H{
		"total_joined": total,
		"completed":    completed,
		"avg_wait_seconds": avgWait,
		"time_saved_seconds": timeSaved,
	})
}

func (h *UserHandler) GetNotifications(c *gin.Context) {
	userIDStr, _ := c.Get("userID")
	userID, _ := uuid.Parse(userIDStr.(string))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	notifs, total, _ := h.notifService.GetUserNotifications(userID, page, limit)
	unread, _ := h.notifService.CountUnread(userID)
	response.Success(c, gin.H{"notifications": notifs, "total": total, "unread": unread})
}

func (h *UserHandler) MarkNotificationRead(c *gin.Context) {
	userIDStr, _ := c.Get("userID")
	userID, _ := uuid.Parse(userIDStr.(string))
	notifID, _ := uuid.Parse(c.Param("id"))
	h.notifService.MarkRead(notifID, userID)
	response.SuccessWithMessage(c, "Marked as read", nil)
}

func (h *UserHandler) MarkAllNotificationsRead(c *gin.Context) {
	userIDStr, _ := c.Get("userID")
	userID, _ := uuid.Parse(userIDStr.(string))
	h.notifService.MarkAllRead(userID)
	response.SuccessWithMessage(c, "All notifications marked as read", nil)
}
