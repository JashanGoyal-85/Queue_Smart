package postgres

import (
	"queuesmart/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type notificationRepo struct{ db *gorm.DB }

func NewNotificationRepository(db *gorm.DB) *notificationRepo { return &notificationRepo{db} }

func (r *notificationRepo) Create(n *models.Notification) error { return r.db.Create(n).Error }

func (r *notificationRepo) GetByUserID(userID uuid.UUID, page, limit int) ([]models.Notification, int64, error) {
	var notifs []models.Notification
	var total int64
	offset := (page - 1) * limit
	r.db.Model(&models.Notification{}).Where("user_id = ?", userID).Count(&total)
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Offset(offset).Limit(limit).Find(&notifs).Error
	return notifs, total, err
}

func (r *notificationRepo) MarkRead(id uuid.UUID, userID uuid.UUID) error {
	return r.db.Model(&models.Notification{}).Where("id = ? AND user_id = ?", id, userID).Update("is_read", true).Error
}

func (r *notificationRepo) MarkAllRead(userID uuid.UUID) error {
	return r.db.Model(&models.Notification{}).Where("user_id = ? AND is_read = false", userID).Update("is_read", true).Error
}

func (r *notificationRepo) CountUnread(userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&models.Notification{}).Where("user_id = ? AND is_read = false", userID).Count(&count).Error
	return count, err
}

type auditRepo struct{ db *gorm.DB }

func NewAuditRepository(db *gorm.DB) *auditRepo { return &auditRepo{db} }

func (r *auditRepo) Create(l *models.AuditLog) error { return r.db.Create(l).Error }

func (r *auditRepo) List(page, limit int, userID *uuid.UUID, action string) ([]models.AuditLog, int64, error) {
	var logs []models.AuditLog
	var total int64
	q := r.db.Model(&models.AuditLog{})
	if userID != nil { q = q.Where("user_id = ?", *userID) }
	if action != "" { q = q.Where("action = ?", action) }
	q.Count(&total)
	offset := (page - 1) * limit
	err := q.Preload("User").Order("created_at DESC").Offset(offset).Limit(limit).Find(&logs).Error
	return logs, total, err
}
