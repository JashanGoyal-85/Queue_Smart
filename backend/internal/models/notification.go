package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Notification struct {
	ID        uuid.UUID `json:"id" gorm:"type:char(36);primaryKey"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:char(36);not null;index"`
	Title     string    `json:"title" gorm:"not null"`
	Body      string    `json:"body"`
	Type      string    `json:"type" gorm:"default:'system'"`
	IsRead    bool      `json:"is_read" gorm:"default:false"`
	Metadata  string    `json:"metadata" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
	User      *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}

const (
	NotifTypeTokenCalled  = "token_called"
	NotifTypeQueueUpdate  = "queue_update"
	NotifTypeSystem       = "system"
	NotifTypeAnnouncement = "announcement"
)
