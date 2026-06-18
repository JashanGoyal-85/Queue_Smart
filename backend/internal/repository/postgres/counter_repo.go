package postgres

import (
	"queuesmart/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type counterRepo struct{ db *gorm.DB }

func NewCounterRepository(db *gorm.DB) *counterRepo { return &counterRepo{db} }

func (r *counterRepo) Create(counter *models.Counter) error { return r.db.Create(counter).Error }

func (r *counterRepo) GetByID(id uuid.UUID) (*models.Counter, error) {
	var counter models.Counter
	err := r.db.First(&counter, "id = ?", id).Error
	return &counter, err
}

func (r *counterRepo) GetByQueueID(queueID uuid.UUID) ([]models.Counter, error) {
	var counters []models.Counter
	err := r.db.Where("queue_id = ?", queueID).Order("name ASC").Find(&counters).Error
	return counters, err
}

func (r *counterRepo) Update(counter *models.Counter) error { return r.db.Save(counter).Error }

func (r *counterRepo) Delete(id uuid.UUID) error {
	return r.db.Model(&models.Counter{}).Where("id = ?", id).Update("is_active", false).Error
}

func (r *counterRepo) HasActiveToken(id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.Token{}).
		Where("counter_id = ? AND status IN ?", id, []string{models.TokenStatusCalled, models.TokenStatusServing}).
		Count(&count).Error
	return count > 0, err
}
