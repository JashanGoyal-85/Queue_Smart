package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type ipLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	limiters = make(map[string]*ipLimiter)
	mu       sync.Mutex
)

func getVisitor(ip string, r rate.Limit, b int) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()
	v, exists := limiters[ip]
	if !exists {
		l := rate.NewLimiter(r, b)
		limiters[ip] = &ipLimiter{l, time.Now()}
		return l
	}
	v.lastSeen = time.Now()
	return v.limiter
}

func cleanupVisitors() {
	for {
		time.Sleep(time.Minute)
		mu.Lock()
		for ip, v := range limiters {
			if time.Since(v.lastSeen) > 3*time.Minute {
				delete(limiters, ip)
			}
		}
		mu.Unlock()
	}
}

func init() {
	go cleanupVisitors()
}

func RateLimit(r rate.Limit, b int) gin.HandlerFunc {
	return func(c *gin.Context) {
		limiter := getVisitor(c.ClientIP(), r, b)
		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{"success": false, "message": "Too many requests, please try again later"})
			c.Abort()
			return
		}
		c.Next()
	}
}
