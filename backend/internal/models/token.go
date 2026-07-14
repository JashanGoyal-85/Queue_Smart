package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Token struct {
	ID                   uuid.UUID  `json:"id" gorm:"type:char(36);primaryKey"`
	QueueID              uuid.UUID  `json:"queue_id" gorm:"type:char(36);not null"`
	CounterID            *uuid.UUID `json:"counter_id" gorm:"type:char(36);index"`
	UserID               *uuid.UUID `json:"user_id" gorm:"type:char(36)"`
	TokenNumber          int        `json:"token_number" gorm:"not null"`
	DisplayCode          string     `json:"display_code" gorm:"not null"`
	Status               string     `json:"status" gorm:"default:'waiting'"`
	Priority             string     `json:"priority" gorm:"default:'normal'"`
	EstimatedWaitSeconds int        `json:"estimated_wait_seconds"`
	// EstimatedReadyAt is the absolute UTC deadline for this token.
	// Computed as NOW + estimated_wait at join time, and updated on each extension.
	// Using a deadline (instead of a static duration) means the countdown remains
	// accurate after page refreshes and correctly cascades to downstream tokens.
	EstimatedReadyAt     *time.Time `json:"estimated_ready_at" gorm:"index"`
	ActualWaitSeconds    int        `json:"actual_wait_seconds"`
	Notes                string     `json:"notes"`
	GuestName            string     `json:"guest_name"`
	GuestPhone           string     `json:"guest_phone"`
	JoinedAt             time.Time  `json:"joined_at"`
	CalledAt             *time.Time `json:"called_at"`
	ServedAt             *time.Time `json:"served_at"`
	CompletedAt          *time.Time `json:"completed_at"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
	Queue                *Queue     `json:"queue,omitempty" gorm:"foreignKey:QueueID"`
	Counter              *Counter   `json:"counter,omitempty" gorm:"foreignKey:CounterID"`
	User                 *User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

func (t *Token) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}
