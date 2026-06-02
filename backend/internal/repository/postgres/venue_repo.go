package postgres

import (
	"queuesmart/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type venueRepo struct{ db *gorm.DB }

func NewVenueRepository(db *gorm.DB) *venueRepo { return &venueRepo{db} }

func (r *venueRepo) Create(v *models.Venue) error { return r.db.Create(v).Error }

func (r *venueRepo) GetByID(id uuid.UUID) (*models.Venue, error) {
	var v models.Venue
	err := r.db.Where("id = ?", id).First(&v).Error
	return &v, err
}

func (r *venueRepo) GetBySlug(slug string) (*models.Venue, error) {
	var v models.Venue
	err := r.db.Where("slug = ?", slug).Preload("Queues", "deleted_at IS NULL").First(&v).Error
	return &v, err
}

func (r *venueRepo) Update(v *models.Venue) error { return r.db.Save(v).Error }

func (r *venueRepo) List(page, limit int, city, category, search string) ([]models.Venue, int64, error) {
	var venues []models.Venue
	var total int64
	q := r.db.Model(&models.Venue{}).Where("is_active = true")
	if city != "" { q = q.Where("city LIKE ?", "%"+city+"%") }
	if category != "" { q = q.Where("category = ?", category) }
	if search != "" { q = q.Where("name LIKE ? OR city LIKE ?", "%"+search+"%", "%"+search+"%") }
	q.Count(&total)
	offset := (page - 1) * limit
	err := q.Offset(offset).Limit(limit).Order("name ASC").Find(&venues).Error
	return venues, total, err
}

func (r *venueRepo) ListAll() ([]models.Venue, error) {
	var venues []models.Venue
	err := r.db.Order("name ASC").Find(&venues).Error
	return venues, err
}
