package postgres

import (
	"fmt"
	"queuesmart/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type analyticsRepo struct{ db *gorm.DB }

func NewAnalyticsRepository(db *gorm.DB) *analyticsRepo { return &analyticsRepo{db} }

func (r *analyticsRepo) Upsert(a *models.QueueAnalytics) error {
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "queue_id"}, {Name: "date"}, {Name: "hour"}},
		DoUpdates: clause.AssignmentColumns([]string{"tokens_issued", "tokens_completed", "tokens_cancelled", "avg_wait_seconds", "peak_concurrent"}),
	}).Create(a).Error
}

func (r *analyticsRepo) GetByQueueAndDate(queueID uuid.UUID, date string) (*models.QueueAnalytics, error) {
	var a models.QueueAnalytics
	err := r.db.Where("queue_id = ? AND date = ?", queueID, date).First(&a).Error
	return &a, err
}

func (r *analyticsRepo) GetPeakHours(venueID uuid.UUID) ([]models.QueueAnalytics, error) {
	var analytics []models.QueueAnalytics
	err := r.db.Where("venue_id = ?", venueID).
		Order("date DESC, hour ASC").
		Limit(7 * 24).
		Find(&analytics).Error
	return analytics, err
}

func (r *analyticsRepo) GetVenueStats(venueID uuid.UUID, from, to string) (map[string]interface{}, error) {
	type Result struct {
		TotalIssued    int64
		TotalCompleted int64
		TotalCancelled int64
		AvgWait        float64
	}
	var result Result
	err := r.db.Model(&models.QueueAnalytics{}).
		Select("SUM(tokens_issued) as total_issued, SUM(tokens_completed) as total_completed, SUM(tokens_cancelled) as total_cancelled, AVG(avg_wait_seconds) as avg_wait").
		Where("venue_id = ? AND date BETWEEN ? AND ?", venueID, from, to).
		Scan(&result).Error
	if err != nil {
		return nil, err
	}
	completionRate := 0.0
	if result.TotalIssued > 0 {
		completionRate = float64(result.TotalCompleted) / float64(result.TotalIssued) * 100
	}
	return map[string]interface{}{
		"total_issued":    result.TotalIssued,
		"total_completed": result.TotalCompleted,
		"total_cancelled": result.TotalCancelled,
		"avg_wait_seconds": fmt.Sprintf("%.0f", result.AvgWait),
		"completion_rate": fmt.Sprintf("%.1f", completionRate),
	}, nil
}
