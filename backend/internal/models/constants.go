package models

// Role constants
const (
	RoleUser       = "user"
	RoleStaff      = "staff"
	RoleAdmin      = "admin"
	RoleSuperAdmin = "superadmin"
)

// Queue status constants
const (
	QueueStatusInactive = "inactive"
	QueueStatusActive   = "active"
	QueueStatusPaused   = "paused"
	QueueStatusClosed   = "closed"
)

// Token status constants
const (
	TokenStatusWaiting   = "waiting"
	TokenStatusCalled    = "called"
	TokenStatusServing   = "serving"
	TokenStatusCompleted = "completed"
	TokenStatusSkipped   = "skipped"
	TokenStatusCancelled = "cancelled"
)

// Token priority constants
const (
	TokenPriorityNormal   = "normal"
	TokenPriorityPriority = "priority"
)
