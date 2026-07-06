package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Invitation holds a pending staff/admin invite.
// Once accepted, AcceptedAt is set and the linked user account is activated.
type Invitation struct {
	ID          uuid.UUID  `json:"id"           gorm:"type:char(36);primaryKey"`
	Email       string     `json:"email"        gorm:"type:varchar(191);not null;index"`
	Name        string     `json:"name"         gorm:"type:varchar(191);not null"`
	Role        string     `json:"role"         gorm:"type:varchar(50);not null;default:'staff'"`
	VenueID     uuid.UUID  `json:"venue_id"     gorm:"type:char(36);not null"`
	Token       string     `json:"-"            gorm:"type:varchar(128);uniqueIndex;not null"`
	ExpiresAt   time.Time  `json:"expires_at"`
	AcceptedAt  *time.Time `json:"accepted_at"`
	CreatedBy   uuid.UUID  `json:"created_by"   gorm:"type:char(36)"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (i *Invitation) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

func (i *Invitation) IsExpired() bool {
	return time.Now().After(i.ExpiresAt)
}

func (i *Invitation) IsAccepted() bool {
	return i.AcceptedAt != nil
}
