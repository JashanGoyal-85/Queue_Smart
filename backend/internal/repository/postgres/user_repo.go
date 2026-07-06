package postgres

import (
	"queuesmart/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type userRepo struct{ db *gorm.DB }

func NewUserRepository(db *gorm.DB) *userRepo { return &userRepo{db} }

func (r *userRepo) Create(u *models.User) error { return r.db.Create(u).Error }

func (r *userRepo) GetByID(id uuid.UUID) (*models.User, error) {
	var u models.User
	err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&u).Error
	return &u, err
}

func (r *userRepo) GetByEmail(email string) (*models.User, error) {
	var u models.User
	err := r.db.Where("email = ? AND deleted_at IS NULL", email).First(&u).Error
	return &u, err
}

func (r *userRepo) GetByGoogleID(googleID string) (*models.User, error) {
	var u models.User
	err := r.db.Where("google_id = ? AND deleted_at IS NULL", googleID).First(&u).Error
	return &u, err
}

func (r *userRepo) Update(u *models.User) error { return r.db.Save(u).Error }

func (r *userRepo) Delete(id uuid.UUID) error {
	return r.db.Where("id = ?", id).Delete(&models.User{}).Error
}

func (r *userRepo) List(page, limit int, role, search string) ([]models.User, int64, error) {
	var users []models.User
	var total int64
	q := r.db.Model(&models.User{})
	if role != "" { q = q.Where("role = ?", role) }
	if search != "" { q = q.Where("name LIKE ? OR email LIKE ?", "%"+search+"%", "%"+search+"%") }
	q.Count(&total)
	offset := (page - 1) * limit
	err := q.Offset(offset).Limit(limit).Order("created_at DESC").Find(&users).Error
	return users, total, err
}

func (r *userRepo) CountAll() (int64, error) {
	var count int64
	err := r.db.Model(&models.User{}).Count(&count).Error
	return count, err
}
