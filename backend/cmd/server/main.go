package main

import (
	"fmt"
	"log"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"queuesmart/config"
	"queuesmart/internal/handlers"
	"queuesmart/internal/middleware"
	"queuesmart/internal/models"
	"queuesmart/internal/repository"
	postgresr "queuesmart/internal/repository/postgres"
	"queuesmart/internal/services"
	"queuesmart/internal/websocket"
	pkgredis "queuesmart/pkg/redis"
)

func main() {
	cfg := config.Load()

	// Connect MySQL
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)

	var db *gorm.DB
	var err error
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err == nil {
			break
		}
		log.Printf("DB connection attempt %d failed: %v. Retrying in 3s...", i+1, err)
		time.Sleep(3 * time.Second)
	}
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto migrate
	if err := db.AutoMigrate(
		&models.User{},
		&models.Venue{},
		&models.Queue{},
		&models.Token{},
		&models.QueueAnalytics{},
		&models.Notification{},
		&models.AuditLog{},
	); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	log.Println("Database migrated successfully")

	// Connect Redis
	redisClient := pkgredis.NewRedisClient(cfg.RedisURL)

	// Init WebSocket hub
	hub := websocket.NewHub(redisClient)
	go hub.Run()

	// Init repositories
	var (
		userRepo     repository.UserRepository     = postgresr.NewUserRepository(db)
		venueRepo    repository.VenueRepository    = postgresr.NewVenueRepository(db)
		queueRepo    repository.QueueRepository    = postgresr.NewQueueRepository(db)
		tokenRepo    repository.TokenRepository    = postgresr.NewTokenRepository(db)
		analyticsRepo repository.AnalyticsRepository = postgresr.NewAnalyticsRepository(db)
		notifRepo    repository.NotificationRepository = postgresr.NewNotificationRepository(db)
		auditRepo    repository.AuditRepository    = postgresr.NewAuditRepository(db)
	)

	// Init services
	queueSvc   := services.NewQueueService(queueRepo, tokenRepo, analyticsRepo, redisClient, hub)
	notifSvc   := services.NewNotificationService(notifRepo)
	predSvc    := services.NewPredictionService(analyticsRepo, queueRepo)

	// Init handlers
	authH        := handlers.NewAuthHandler(userRepo, redisClient, cfg)
	userH        := handlers.NewUserHandler(userRepo, tokenRepo, notifSvc)
	venueH       := handlers.NewVenueHandler(venueRepo)
	queueH       := handlers.NewQueueHandler(queueSvc, tokenRepo, cfg)
	staffH       := handlers.NewStaffHandler(queueSvc, queueRepo, tokenRepo, auditRepo, analyticsRepo, userRepo)
	adminH       := handlers.NewAdminHandler(queueRepo, venueRepo, userRepo, auditRepo, analyticsRepo, predSvc)
	superAdminH  := handlers.NewSuperAdminHandler(venueRepo, userRepo, queueRepo, tokenRepo)
	wsH          := handlers.NewWSHandler(hub)

	// Gin setup
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendURL, "http://localhost:3000", "http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health check
	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

	// WebSocket routes
	r.GET("/ws/queue/:id", wsH.QueueWS)
	r.GET("/ws/token/:id", wsH.TokenWS)

	api := r.Group("/api/v1")

	// Auth routes
	auth := api.Group("/auth")
	{
		auth.POST("/register", authH.Register)
		auth.POST("/login", authH.Login)
		auth.POST("/logout", middleware.AuthRequired(cfg), authH.Logout)
		auth.POST("/refresh", authH.Refresh)
		auth.POST("/forgot-password", authH.ForgotPassword)
		auth.POST("/reset-password", authH.ResetPassword)
		auth.GET("/verify-email", authH.VerifyEmail)
	}

	// Public venue/queue routes
	api.GET("/venues", venueH.ListVenues)
	api.GET("/venues/:slug", venueH.GetVenue)
	api.GET("/queues/:id", queueH.GetQueue)
	api.GET("/queues/:id/qr", queueH.GetQueueQR)
	api.GET("/queues/:id/position/:tokenId", queueH.GetPosition)
	api.POST("/queues/:id/join", middleware.OptionalAuth(cfg), middleware.RateLimit(5.0/60, 5), queueH.JoinQueue)
	api.GET("/tokens/:id", queueH.GetToken)

	// Authenticated user routes
	me := api.Group("/me", middleware.AuthRequired(cfg))
	{
		me.GET("", userH.GetMe)
		me.PUT("", userH.UpdateMe)
		me.PUT("/password", userH.ChangePassword)
		me.GET("/tokens", userH.GetMyTokens)
		me.GET("/stats", userH.GetMyStats)
		me.GET("/notifications", userH.GetNotifications)
		me.PUT("/notifications/:id/read", userH.MarkNotificationRead)
		me.PUT("/notifications/read-all", userH.MarkAllNotificationsRead)
	}
	api.POST("/tokens/:id/cancel", middleware.AuthRequired(cfg), queueH.CancelToken)

	// Staff routes
	staff := api.Group("/staff", middleware.AuthRequired(cfg), middleware.RequireRole(models.RoleStaff, models.RoleAdmin, models.RoleSuperAdmin))
	{
		staff.GET("/queues", staffH.GetStaffQueues)
		staff.GET("/queues/:id/tokens", staffH.GetQueueTokens)
		staff.GET("/queues/:id/analytics", staffH.GetQueueAnalytics)
		staff.POST("/queues/:id/call-next", staffH.CallNextToken)
		staff.PUT("/queues/:id/status", staffH.UpdateQueueStatus)
		staff.POST("/tokens/:id/call", staffH.CallToken)
		staff.POST("/tokens/:id/complete", staffH.CompleteToken)
		staff.POST("/tokens/:id/skip", staffH.SkipToken)
		staff.POST("/tokens/:id/priority", staffH.TogglePriority)
	}

	// Admin routes
	admin := api.Group("/admin", middleware.AuthRequired(cfg), middleware.RequireRole(models.RoleAdmin, models.RoleSuperAdmin))
	{
		admin.POST("/queues", adminH.CreateQueue)
		admin.PUT("/queues/:id", adminH.UpdateQueue)
		admin.DELETE("/queues/:id", adminH.DeleteQueue)
		admin.GET("/venues/:id/stats", adminH.GetVenueStats)
		admin.GET("/venues/:id/peak-hours", adminH.GetPeakHours)
		admin.GET("/venues/:id/users", adminH.GetVenueUsers)
		admin.POST("/venues/:id/users", adminH.InviteStaffUser)
		admin.DELETE("/venues/:id/users/:userId", adminH.RemoveStaff)
		admin.GET("/audit-logs", adminH.GetAuditLogs)
	}

	// SuperAdmin routes
	sa := api.Group("/superadmin", middleware.AuthRequired(cfg), middleware.RequireRole(models.RoleSuperAdmin))
	{
		sa.POST("/venues", superAdminH.CreateVenue)
		sa.GET("/venues", superAdminH.ListAllVenues)
		sa.PUT("/venues/:id", superAdminH.UpdateVenue)
		sa.GET("/users", superAdminH.ListAllUsers)
		sa.PUT("/users/:id/role", superAdminH.UpdateUserRole)
		sa.GET("/system-stats", superAdminH.GetSystemStats)
	}

	// Start queue scheduler
	go scheduleQueues(queueRepo)

	addr := ":" + cfg.AppPort
	log.Printf("QueueSmart server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func scheduleQueues(qr repository.QueueRepository) {
	for {
		time.Sleep(time.Minute)
		now := time.Now()
		venues, err := qr.GetByVenueID([16]byte{}) // placeholder – iterates all in production
		if err != nil {
			continue
		}
		for _, q := range venues {
			if q.ScheduledOpen != nil && now.After(*q.ScheduledOpen) && q.Status == models.QueueStatusInactive {
				qr.UpdateStatus(q.ID, models.QueueStatusActive)
				log.Printf("Auto-opened queue %s", q.ID)
			}
			if q.ScheduledClose != nil && now.After(*q.ScheduledClose) && q.Status == models.QueueStatusActive {
				qr.UpdateStatus(q.ID, models.QueueStatusClosed)
				log.Printf("Auto-closed queue %s", q.ID)
			}
		}
	}
}
