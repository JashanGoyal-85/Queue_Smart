package postgres

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"queuesmart/internal/models"
)

type tokenRepo struct{ db *gorm.DB }

func NewTokenRepository(db *gorm.DB) *tokenRepo { return &tokenRepo{db} }

func (r *tokenRepo) Create(t *models.Token) error { return r.db.Create(t).Error }

func (r *tokenRepo) GetByID(id uuid.UUID) (*models.Token, error) {
	var t models.Token
	err := r.db.Where("id = ?", id).Preload("Queue").Preload("Counter").Preload("User").First(&t).Error
	return &t, err
}

func (r *tokenRepo) GetByQueueID(queueID uuid.UUID, statuses []string) ([]models.Token, error) {
	var tokens []models.Token
	q := r.db.Where("queue_id = ?", queueID)
	if len(statuses) > 0 {
		q = q.Where("status IN ?", statuses)
	}
	err := q.Preload("Counter").Order("priority DESC, token_number ASC").Find(&tokens).Error
	return tokens, err
}

func (r *tokenRepo) GetByUserID(userID uuid.UUID, page, limit int) ([]models.Token, int64, error) {
	var tokens []models.Token
	var total int64
	offset := (page - 1) * limit
	r.db.Model(&models.Token{}).Where("user_id = ?", userID).Count(&total)
	err := r.db.Where("user_id = ?", userID).
		Preload("Queue").
		Order("created_at DESC").
		Offset(offset).Limit(limit).
		Find(&tokens).Error
	return tokens, total, err
}

func (r *tokenRepo) Update(t *models.Token) error { return r.db.Save(t).Error }

func (r *tokenRepo) GetNextToken(queueID uuid.UUID) (*models.Token, error) {
	var t models.Token
	err := r.db.Where("queue_id = ? AND status = ?", queueID, models.TokenStatusWaiting).
		Order("CASE WHEN priority = 'priority' THEN 0 ELSE 1 END, token_number ASC").
		First(&t).Error
	return &t, err
}

func (r *tokenRepo) GetPosition(queueID uuid.UUID, tokenNumber int, priority string) (int, error) {
	var count int64
	q := r.db.Model(&models.Token{}).
		Where("queue_id = ? AND status = ? AND (priority = 'priority' AND ? != 'priority' OR (priority = ? AND token_number < ?))",
			queueID, models.TokenStatusWaiting, priority, priority, tokenNumber)
	if priority == models.TokenPriorityPriority {
		q = r.db.Model(&models.Token{}).
			Where("queue_id = ? AND status = ? AND priority = ? AND token_number < ?",
				queueID, models.TokenStatusWaiting, priority, tokenNumber)
	} else {
		q = r.db.Model(&models.Token{}).
			Where("queue_id = ? AND status = ? AND (priority = 'priority' OR token_number < ?)",
				queueID, models.TokenStatusWaiting, tokenNumber)
	}
	err := q.Count(&count).Error
	return int(count) + 1, err
}

func (r *tokenRepo) CountByStatus(queueID uuid.UUID, status string) (int64, error) {
	var count int64
	err := r.db.Model(&models.Token{}).Where("queue_id = ? AND status = ?", queueID, status).Count(&count).Error
	return count, err
}

func (r *tokenRepo) GetMaxTokenNumber(queueID uuid.UUID) (int, error) {
	var max int
	row := r.db.Model(&models.Token{}).Where("queue_id = ?", queueID).Select("COALESCE(MAX(token_number), 0)").Row()
	err := row.Scan(&max)
	return max, err
}
