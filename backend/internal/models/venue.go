package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Venue struct {
	ID           uuid.UUID      `json:"id" gorm:"type:char(36);primaryKey"`
	Name         string         `json:"name" gorm:"type:varchar(191);not null"`
	Slug         string         `json:"slug" gorm:"type:varchar(191);uniqueIndex;not null"`
	Description  string         `json:"description"`
	Address      string         `json:"address"`
	City         string         `json:"city"`
	State        string         `json:"state"`
	Country      string         `json:"country"`
	Category     string         `json:"category" gorm:"default:'other'"`
	LogoURL      string         `json:"logo_url"`
	CoverURL     string         `json:"cover_url"`
	ContactEmail string         `json:"contact_email"`
	ContactPhone string         `json:"contact_phone"`
	Settings     string         `json:"settings" gorm:"type:text"`
	IsActive     bool           `json:"is_active" gorm:"default:true"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	Queues       []Queue        `json:"queues,omitempty" gorm:"foreignKey:VenueID"`
}

func (v *Venue) BeforeCreate(tx *gorm.DB) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return nil
}

const (
	CategoryHospital   = "hospital"
	CategoryBank       = "bank"
	CategorySalon      = "salon"
	CategoryCanteen    = "canteen"
	CategoryGovernment = "government"
	CategoryOther      = "other"
)
