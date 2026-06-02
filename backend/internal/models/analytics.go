package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type QueueAnalytics struct {
	ID               uuid.UUID `json:"id" gorm:"type:char(36);primaryKey"`
	QueueID          uuid.UUID `json:"queue_id" gorm:"type:char(36);not null;index"`
	VenueID          uuid.UUID `json:"venue_id" gorm:"type:char(36);not null;index"`
	Date             time.Time `json:"date" gorm:"type:date;not null"`
	Hour             int       `json:"hour" gorm:"not null"`
	TokensIssued     int       `json:"tokens_issued" gorm:"default:0"`
	TokensCompleted  int       `json:"tokens_completed" gorm:"default:0"`
	TokensCancelled  int       `json:"tokens_cancelled" gorm:"default:0"`
	AvgWaitSeconds   int       `json:"avg_wait_seconds" gorm:"default:0"`
	PeakConcurrent   int       `json:"peak_concurrent" gorm:"default:0"`
	CreatedAt        time.Time `json:"created_at"`
}

func (a *QueueAnalytics) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
