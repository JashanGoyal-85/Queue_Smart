package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuditLog struct {
	ID         uuid.UUID `json:"id" gorm:"type:char(36);primaryKey"`
	UserID     uuid.UUID `json:"user_id" gorm:"type:char(36);not null;index"`
	Action     string    `json:"action" gorm:"not null"`
	EntityType string    `json:"entity_type"`
	EntityID   string    `json:"entity_id"`
	Metadata   string    `json:"metadata" gorm:"type:text"`
	IPAddress  string    `json:"ip_address"`
	CreatedAt  time.Time `json:"created_at"`
	User       *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
