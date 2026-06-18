package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Counter struct {
	ID        uuid.UUID `json:"id" gorm:"type:char(36);primaryKey"`
	QueueID   uuid.UUID `json:"queue_id" gorm:"type:char(36);not null;index;uniqueIndex:idx_counter_queue_name"`
	Name      string    `json:"name" gorm:"not null;uniqueIndex:idx_counter_queue_name"`
	IsActive  bool      `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Queue     *Queue    `json:"queue,omitempty" gorm:"foreignKey:QueueID"`
}

func (c *Counter) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
