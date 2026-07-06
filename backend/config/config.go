package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv             string
	AppPort            string
	JWTSecret          string
	JWTAccessExpires   string
	JWTRefreshExpires  string
	DBHost             string
	DBPort             string
	DBUser             string
	DBPassword         string
	DBName             string
	DBSSLMode          string
	RedisURL           string
	RabbitMQURL        string
	BaseURL            string
	FrontendURL        string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
}

var cfg *Config

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}
	cfg = &Config{
		AppEnv:             getEnv("APP_ENV", "development"),
		AppPort:            getEnv("APP_PORT", "8080"),
		JWTSecret:          getEnv("JWT_SECRET", "super-secret-change-me"),
		JWTAccessExpires:   getEnv("JWT_ACCESS_EXPIRES", "15m"),
		JWTRefreshExpires:  getEnv("JWT_REFRESH_EXPIRES", "168h"),
		DBHost:             getEnv("DB_HOST", "localhost"),
		DBPort:             getEnv("DB_PORT", "5432"),
		DBUser:             getEnv("DB_USER", "queuesmart"),
		DBPassword:         getEnv("DB_PASSWORD", "queuesmart123"),
		DBName:             getEnv("DB_NAME", "queuesmart"),
		DBSSLMode:          getEnv("DB_SSLMODE", "disable"),
		RedisURL:           getEnv("REDIS_URL", "redis://localhost:6379"),
		RabbitMQURL:        getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),
		BaseURL:            getEnv("BASE_URL", "http://localhost:8080"),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:3000"),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/v1/auth/google/callback"),
	}
	return cfg
}

func Get() *Config {
	if cfg == nil {
		return Load()
	}
	return cfg
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}
