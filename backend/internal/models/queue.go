package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Queue struct {
	ID                  uuid.UUID      `json:"id" gorm:"type:char(36);primaryKey"`
	VenueID             uuid.UUID      `json:"venue_id" gorm:"type:char(36);not null"`
	Name                string         `json:"name" gorm:"not null"`
	Description         string         `json:"description"`
	Category            string         `json:"category"`
	Status              string         `json:"status" gorm:"default:'inactive'"`
	MaxCapacity         int            `json:"max_capacity" gorm:"default:100"`
	CurrentCount        int            `json:"current_count" gorm:"default:0"`
	AvgServeTimeSeconds int            `json:"avg_serve_time_seconds" gorm:"default:180"`
	IsPriorityEnabled   bool           `json:"is_priority_enabled" gorm:"default:false"`
	ScheduledOpen       *time.Time     `json:"scheduled_open"`
	ScheduledClose      *time.Time     `json:"scheduled_close"`
	CreatedBy           uuid.UUID      `json:"created_by" gorm:"type:char(36)"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `json:"-" gorm:"index"`
	Venue               *Venue         `json:"venue,omitempty" gorm:"foreignKey:VenueID"`
	Tokens              []Token        `json:"tokens,omitempty" gorm:"foreignKey:QueueID"`
}

func (q *Queue) BeforeCreate(tx *gorm.DB) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return nil
}


