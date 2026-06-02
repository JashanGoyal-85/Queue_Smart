package postgres

import (
	"queuesmart/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type queueRepo struct{ db *gorm.DB }

func NewQueueRepository(db *gorm.DB) *queueRepo { return &queueRepo{db} }

func (r *queueRepo) Create(q *models.Queue) error { return r.db.Create(q).Error }

func (r *queueRepo) GetByID(id uuid.UUID) (*models.Queue, error) {
	var q models.Queue
	err := r.db.Where("id = ?", id).Preload("Venue").First(&q).Error
	return &q, err
}

func (r *queueRepo) GetByVenueID(venueID uuid.UUID) ([]models.Queue, error) {
	var queues []models.Queue
	err := r.db.Where("venue_id = ? AND deleted_at IS NULL", venueID).Order("name ASC").Find(&queues).Error
	return queues, err
}

func (r *queueRepo) Update(q *models.Queue) error { return r.db.Save(q).Error }

func (r *queueRepo) Delete(id uuid.UUID) error {
	return r.db.Where("id = ?", id).Delete(&models.Queue{}).Error
}

func (r *queueRepo) UpdateStatus(id uuid.UUID, status string) error {
	return r.db.Model(&models.Queue{}).Where("id = ?", id).Update("status", status).Error
}

func (r *queueRepo) IncrementCount(id uuid.UUID) error {
	return r.db.Model(&models.Queue{}).Where("id = ?", id).UpdateColumn("current_count", gorm.Expr("current_count + 1")).Error
}

func (r *queueRepo) DecrementCount(id uuid.UUID) error {
	return r.db.Model(&models.Queue{}).Where("id = ?", id).UpdateColumn("current_count", gorm.Expr("GREATEST(current_count - 1, 0)")).Error
}
