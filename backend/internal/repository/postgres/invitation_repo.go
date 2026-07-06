package postgres

import (
	"queuesmart/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type invitationRepo struct{ db *gorm.DB }

func NewInvitationRepository(db *gorm.DB) *invitationRepo {
	return &invitationRepo{db}
}

func (r *invitationRepo) Create(inv *models.Invitation) error {
	return r.db.Create(inv).Error
}

func (r *invitationRepo) GetByToken(token string) (*models.Invitation, error) {
	var inv models.Invitation
	err := r.db.Where("token = ?", token).First(&inv).Error
	return &inv, err
}

func (r *invitationRepo) GetByEmail(email string) (*models.Invitation, error) {
	var inv models.Invitation
	err := r.db.Where("email = ? AND accepted_at IS NULL", email).
		Order("created_at DESC").First(&inv).Error
	return &inv, err
}

func (r *invitationRepo) MarkAccepted(id uuid.UUID) error {
	return r.db.Model(&models.Invitation{}).
		Where("id = ?", id).
		Update("accepted_at", gorm.Expr("NOW()")).Error
}

func (r *invitationRepo) ListByVenue(venueID uuid.UUID) ([]models.Invitation, error) {
	var invs []models.Invitation
	err := r.db.Where("venue_id = ?", venueID).
		Order("created_at DESC").Find(&invs).Error
	return invs, err
}
