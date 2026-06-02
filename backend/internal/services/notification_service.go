package services

import (
	"encoding/json"
	"queuesmart/internal/models"
	"queuesmart/internal/repository"
	"github.com/google/uuid"
)

type NotificationService struct {
	repo repository.NotificationRepository
}

func NewNotificationService(r repository.NotificationRepository) *NotificationService {
	return &NotificationService{repo: r}
}

func (s *NotificationService) CreateNotification(userID uuid.UUID, title, body, notifType string, metadata map[string]interface{}) error {
	metaJSON := "{}"
	if metadata != nil {
		if b, err := json.Marshal(metadata); err == nil {
			metaJSON = string(b)
		}
	}
	return s.repo.Create(&models.Notification{
		UserID:   userID,
		Title:    title,
		Body:     body,
		Type:     notifType,
		Metadata: metaJSON,
	})
}

func (s *NotificationService) GetUserNotifications(userID uuid.UUID, page, limit int) ([]models.Notification, int64, error) {
	return s.repo.GetByUserID(userID, page, limit)
}

func (s *NotificationService) MarkRead(id uuid.UUID, userID uuid.UUID) error {
	return s.repo.MarkRead(id, userID)
}

func (s *NotificationService) MarkAllRead(userID uuid.UUID) error {
	return s.repo.MarkAllRead(userID)
}

func (s *NotificationService) CountUnread(userID uuid.UUID) (int64, error) {
	return s.repo.CountUnread(userID)
}
