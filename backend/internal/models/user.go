package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           uuid.UUID      `json:"id" gorm:"type:char(36);primaryKey"`
	Name         string         `json:"name" gorm:"type:varchar(191);not null"`
	Email        string         `json:"email" gorm:"type:varchar(191);uniqueIndex;not null"`
	PasswordHash string         `json:"-" gorm:"type:varchar(255)"`
	GoogleID     string         `json:"google_id,omitempty" gorm:"type:varchar(191);index"`
	Phone        string         `json:"phone"`
	AvatarURL    string         `json:"avatar_url"`
	Role         string         `json:"role" gorm:"default:'user'"`
	VenueID      *uuid.UUID     `json:"venue_id" gorm:"type:char(36)"`
	IsActive     bool           `json:"is_active" gorm:"default:true"`
	IsVerified   bool           `json:"is_verified" gorm:"default:false"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}


