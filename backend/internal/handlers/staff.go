package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"queuesmart/internal/models"
	"queuesmart/internal/repository"
	"queuesmart/internal/services"
	"queuesmart/internal/websocket"
	"queuesmart/pkg/response"
)


type StaffHandler struct {
	queueService  *services.QueueService
	queueRepo     repository.QueueRepository
	counterRepo   repository.CounterRepository
	tokenRepo     repository.TokenRepository
	auditRepo     repository.AuditRepository
	analyticsRepo repository.AnalyticsRepository
	userRepo      repository.UserRepository
	hub           *websocket.Hub
}

func NewStaffHandler(qs *services.QueueService, qr repository.QueueRepository, cr repository.CounterRepository, tr repository.TokenRepository, ar repository.AuditRepository, anr repository.AnalyticsRepository, ur repository.UserRepository, hub *websocket.Hub) *StaffHandler {
	return &StaffHandler{queueService: qs, queueRepo: qr, counterRepo: cr, tokenRepo: tr, auditRepo: ar, analyticsRepo: anr, userRepo: ur, hub: hub}
}

func (h *StaffHandler) audit(c *gin.Context, action, entityType, entityID string) {
	uid, _ := c.Get("userID")
	userID, _ := uuid.Parse(uid.(string))
	h.auditRepo.Create(&models.AuditLog{
		UserID:     userID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		IPAddress:  c.ClientIP(),
	})
}

func (h *StaffHandler) GetStaffQueues(c *gin.Context) {
	uid, _ := c.Get("userID")
	userID, _ := uuid.Parse(uid.(string))
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		response.InternalError(c)
		return
	}

	// Allow an optional ?venue_id= query param (used by superadmins).
	// For regular staff/admin, fall back to their profile VenueID.
	// If neither is available, return an empty list gracefully.
	var venueID uuid.UUID
	if qv := c.Query("venue_id"); qv != "" {
		venueID, err = uuid.Parse(qv)
		if err != nil {
			response.Error(c, http.StatusBadRequest, "Invalid venue_id")
			return
		}
	} else if user.VenueID != nil {
		venueID = *user.VenueID
	} else {
		// No venue assigned — return empty list instead of error
		response.Success(c, []interface{}{})
		return
	}

	queues, err := h.queueRepo.GetByVenueID(venueID)
	if err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, queues)
}


func (h *StaffHandler) GetQueueTokens(c *gin.Context) {
	queueID, _ := uuid.Parse(c.Param("id"))

	// ?status=all returns every token; default returns only active ones
	var statuses []string
	if c.Query("status") == "all" {
		statuses = []string{
			models.TokenStatusWaiting,
			models.TokenStatusCalled,
			models.TokenStatusServing,
			models.TokenStatusCompleted,
			models.TokenStatusCancelled,
			models.TokenStatusSkipped,
		}
	} else {
		statuses = []string{models.TokenStatusWaiting, models.TokenStatusCalled, models.TokenStatusServing}
	}

	tokens, err := h.tokenRepo.GetByQueueID(queueID, statuses)
	if err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, tokens)
}

func (h *StaffHandler) CallToken(c *gin.Context) {
	tokenID, _ := uuid.Parse(c.Param("id"))
	counterID, ok := parseCounterID(c)
	if !ok {
		return
	}
	token, err := h.queueService.CallToken(tokenID, counterID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.audit(c, "call_token", "token", tokenID.String())
	response.Success(c, token)
}

func (h *StaffHandler) CallNextToken(c *gin.Context) {
	queueID, _ := uuid.Parse(c.Param("id"))
	counterID, ok := parseCounterID(c)
	if !ok {
		return
	}
	token, err := h.queueService.CallNextToken(queueID, counterID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.audit(c, "call_next_token", "queue", queueID.String())
	response.Success(c, token)
}

func parseCounterID(c *gin.Context) (*uuid.UUID, bool) {
	var input struct {
		CounterID string `json:"counter_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil && err.Error() != "EOF" {
		response.ValidationError(c, err.Error())
		return nil, false
	}
	if input.CounterID == "" {
		return nil, true
	}
	id, err := uuid.Parse(input.CounterID)
	if err != nil {
		response.ValidationError(c, "invalid counter_id")
		return nil, false
	}
	return &id, true
}

func (h *StaffHandler) GetCounters(c *gin.Context) {
	queueID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.ValidationError(c, "invalid queue id")
		return
	}
	counters, err := h.counterRepo.GetByQueueID(queueID)
	if err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, counters)
}

func (h *StaffHandler) CreateCounter(c *gin.Context) {
	queueID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.ValidationError(c, "invalid queue id")
		return
	}
	var input struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	if input.Name == "" {
		response.ValidationError(c, "name is required")
		return
	}
	counter := &models.Counter{QueueID: queueID, Name: input.Name, IsActive: true}
	if err := h.counterRepo.Create(counter); err != nil {
		response.Error(c, http.StatusBadRequest, "counter name must be unique in this queue")
		return
	}
	h.audit(c, "create_counter", "counter", counter.ID.String())
	response.Success(c, counter)
}

func (h *StaffHandler) UpdateCounter(c *gin.Context) {
	counterID, err := uuid.Parse(c.Param("counterId"))
	if err != nil {
		response.ValidationError(c, "invalid counter id")
		return
	}
	counter, err := h.counterRepo.GetByID(counterID)
	if err != nil {
		response.NotFound(c, "counter not found")
		return
	}
	var input struct {
		Name     *string `json:"name"`
		IsActive *bool   `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	if input.Name != nil {
		name := strings.TrimSpace(*input.Name)
		if name == "" {
			response.ValidationError(c, "name cannot be empty")
			return
		}
		counter.Name = name
	}
	if input.IsActive != nil {
		if !*input.IsActive {
			busy, _ := h.counterRepo.HasActiveToken(counterID)
			if busy {
				response.Error(c, http.StatusBadRequest, "complete or skip the active token first")
				return
			}
		}
		counter.IsActive = *input.IsActive
	}
	if err := h.counterRepo.Update(counter); err != nil {
		response.Error(c, http.StatusBadRequest, "could not update counter")
		return
	}
	h.audit(c, "update_counter", "counter", counter.ID.String())
	response.Success(c, counter)
}

func (h *StaffHandler) CompleteToken(c *gin.Context) {
	tokenID, _ := uuid.Parse(c.Param("id"))
	token, err := h.queueService.CompleteToken(tokenID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.audit(c, "complete_token", "token", tokenID.String())
	response.Success(c, token)
}

func (h *StaffHandler) SkipToken(c *gin.Context) {
	tokenID, _ := uuid.Parse(c.Param("id"))
	token, err := h.queueService.SkipToken(tokenID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.audit(c, "skip_token", "token", tokenID.String())
	response.Success(c, token)
}

func (h *StaffHandler) TogglePriority(c *gin.Context) {
	tokenID, _ := uuid.Parse(c.Param("id"))
	token, err := h.queueService.TogglePriority(tokenID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(c, token)
}

func (h *StaffHandler) UpdateQueueStatus(c *gin.Context) {
	queueID, _ := uuid.Parse(c.Param("id"))
	var input struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	queue, err := h.queueService.UpdateQueueStatus(queueID, input.Status)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	h.audit(c, "update_queue_status", "queue", queueID.String())
	response.Success(c, queue)
}

func (h *StaffHandler) GetQueueAnalytics(c *gin.Context) {
	queueID, _ := uuid.Parse(c.Param("id"))
	waiting, _ := h.tokenRepo.CountByStatus(queueID, models.TokenStatusWaiting)
	completed, _ := h.tokenRepo.CountByStatus(queueID, models.TokenStatusCompleted)
	cancelled, _ := h.tokenRepo.CountByStatus(queueID, models.TokenStatusCancelled)
	response.Success(c, gin.H{
		"waiting":   waiting,
		"completed": completed,
		"cancelled": cancelled,
		"total":     waiting + completed + cancelled,
	})
}

// ExtendTokenTime lets staff add extra seconds to a token's estimated wait time.
// Body: { "add_seconds": N }  (1–3600)
//
// Two key behaviours:
//  1. Deadline-based: stores EstimatedReadyAt = NOW + remaining + added so the
//     countdown is accurate after page refreshes (no more "reset to initial").
//  2. Cascade: every waiting/called token BEHIND the extended one in the same
//     queue also has its deadline shifted forward by the same amount, so the
//     downstream queue members see their wait increase realistically.
func (h *StaffHandler) ExtendTokenTime(c *gin.Context) {
	tokenID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.ValidationError(c, "invalid token id")
		return
	}

	var input struct {
		AddSeconds int `json:"add_seconds" binding:"required,min=1,max=3600"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, "add_seconds must be between 1 and 3600")
		return
	}

	token, err := h.tokenRepo.GetByID(tokenID)
	if err != nil {
		response.NotFound(c, "Token not found")
		return
	}

	if token.Status != models.TokenStatusWaiting && token.Status != models.TokenStatusCalled {
		response.Error(c, http.StatusBadRequest, "Can only extend wait time for waiting or called tokens")
		return
	}

	// ── Compute how much time is currently left ───────────────────────────────
	// Use the stored deadline if available (most accurate), otherwise fall back
	// to position × avg_serve_time.
	now := time.Now()
	queue, _ := h.queueRepo.GetByID(token.QueueID)
	pos, _ := h.tokenRepo.GetPosition(token.QueueID, token.TokenNumber, token.Priority)

	var currentRemaining int
	if token.EstimatedReadyAt != nil && token.EstimatedReadyAt.After(now) {
		currentRemaining = int(token.EstimatedReadyAt.Sub(now).Seconds())
	} else if queue != nil && pos > 0 {
		currentRemaining = queue.AvgServeTimeSeconds * pos
	}

	// New deadline = NOW + remaining + added
	newReadyAt := now.Add(time.Duration(currentRemaining+input.AddSeconds) * time.Second)
	token.EstimatedWaitSeconds = currentRemaining + input.AddSeconds
	token.EstimatedReadyAt = &newReadyAt

	if err := h.tokenRepo.Update(token); err != nil {
		response.InternalError(c)
		return
	}

	// ── Broadcast real-time update to the extended token's TrackToken page ───
	h.hub.Broadcast(
		"token:"+tokenID.String(),
		"time_extended",
		map[string]interface{}{
			"token_id":               tokenID.String(),
			"estimated_wait_seconds": token.EstimatedWaitSeconds,
			"estimated_ready_at":     token.EstimatedReadyAt,
			"added_seconds":          input.AddSeconds,
		},
	)

	// ── Cascade: shift all downstream tokens' deadlines by the same amount ───
	// "Downstream" = waiting/called tokens with a higher token number in the
	// same queue (they are behind the extended person in the physical queue).
	downstream, _ := h.tokenRepo.GetWaitingAfter(token.QueueID, token.TokenNumber)
	for i := range downstream {
		dt := &downstream[i]
		var newDt time.Time
		if dt.EstimatedReadyAt != nil && dt.EstimatedReadyAt.After(now) {
			newDt = dt.EstimatedReadyAt.Add(time.Duration(input.AddSeconds) * time.Second)
		} else if queue != nil {
			// Fallback: recompute from position and add extension on top
			dtPos, _ := h.tokenRepo.GetPosition(dt.QueueID, dt.TokenNumber, dt.Priority)
			dtRemaining := queue.AvgServeTimeSeconds * dtPos
			newDt = now.Add(time.Duration(dtRemaining+input.AddSeconds) * time.Second)
		} else {
			newDt = now.Add(time.Duration(input.AddSeconds) * time.Second)
		}
		dt.EstimatedReadyAt = &newDt
		dt.EstimatedWaitSeconds = int(time.Until(newDt).Seconds())
		h.tokenRepo.Update(dt)

		// Notify each downstream token's TrackToken page in real time
		h.hub.Broadcast(
			"token:"+dt.ID.String(),
			"time_extended",
			map[string]interface{}{
				"token_id":               dt.ID.String(),
				"estimated_wait_seconds": dt.EstimatedWaitSeconds,
				"estimated_ready_at":     dt.EstimatedReadyAt,
				"added_seconds":          input.AddSeconds,
				"cascaded":               true,
			},
		)
	}

	// Also notify the queue room so staff dashboards refresh
	h.hub.Broadcast("queue:"+token.QueueID.String(), "token.updated", token)

	h.audit(c, "extend_token_time", "token", tokenID.String())
	response.Success(c, token)
}

// ResetQueueCounter cancels all in-flight tokens and resets the display-code
// sequence to A001 for the next token issued in this queue.
func (h *StaffHandler) ResetQueueCounter(c *gin.Context) {
	queueID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid queue ID")
		return
	}
	if err := h.queueService.ResetQueueCounter(queueID); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	h.audit(c, "reset_queue_counter", "queue", queueID.String())
	response.Success(c, map[string]string{"message": "Queue counter reset. Next token will be A001."})
}
