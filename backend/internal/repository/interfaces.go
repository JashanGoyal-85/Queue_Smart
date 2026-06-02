package repository

import (
	"queuesmart/internal/models"
	"github.com/google/uuid"
)

type UserRepository interface {
	Create(user *models.User) error
	GetByID(id uuid.UUID) (*models.User, error)
	GetByEmail(email string) (*models.User, error)
	Update(user *models.User) error
	Delete(id uuid.UUID) error
	List(page, limit int, role, search string) ([]models.User, int64, error)
	CountAll() (int64, error)
}

type VenueRepository interface {
	Create(venue *models.Venue) error
	GetByID(id uuid.UUID) (*models.Venue, error)
	GetBySlug(slug string) (*models.Venue, error)
	Update(venue *models.Venue) error
	List(page, limit int, city, category, search string) ([]models.Venue, int64, error)
	ListAll() ([]models.Venue, error)
}

type QueueRepository interface {
	Create(queue *models.Queue) error
	GetByID(id uuid.UUID) (*models.Queue, error)
	GetByVenueID(venueID uuid.UUID) ([]models.Queue, error)
	Update(queue *models.Queue) error
	Delete(id uuid.UUID) error
	UpdateStatus(id uuid.UUID, status string) error
	IncrementCount(id uuid.UUID) error
	DecrementCount(id uuid.UUID) error
}

type TokenRepository interface {
	Create(token *models.Token) error
	GetByID(id uuid.UUID) (*models.Token, error)
	GetByQueueID(queueID uuid.UUID, statuses []string) ([]models.Token, error)
	GetByUserID(userID uuid.UUID, page, limit int) ([]models.Token, int64, error)
	Update(token *models.Token) error
	GetNextToken(queueID uuid.UUID) (*models.Token, error)
	GetPosition(queueID uuid.UUID, tokenNumber int, priority string) (int, error)
	CountByStatus(queueID uuid.UUID, status string) (int64, error)
	GetMaxTokenNumber(queueID uuid.UUID) (int, error)
}

type AnalyticsRepository interface {
	Upsert(analytics *models.QueueAnalytics) error
	GetByQueueAndDate(queueID uuid.UUID, date string) (*models.QueueAnalytics, error)
	GetPeakHours(venueID uuid.UUID) ([]models.QueueAnalytics, error)
	GetVenueStats(venueID uuid.UUID, from, to string) (map[string]interface{}, error)
}

type NotificationRepository interface {
	Create(notif *models.Notification) error
	GetByUserID(userID uuid.UUID, page, limit int) ([]models.Notification, int64, error)
	MarkRead(id uuid.UUID, userID uuid.UUID) error
	MarkAllRead(userID uuid.UUID) error
	CountUnread(userID uuid.UUID) (int64, error)
}

type AuditRepository interface {
	Create(log *models.AuditLog) error
	List(page, limit int, userID *uuid.UUID, action string) ([]models.AuditLog, int64, error)
}
