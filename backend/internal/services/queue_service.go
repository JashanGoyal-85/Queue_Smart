package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"queuesmart/internal/models"
	"queuesmart/internal/repository"
	"queuesmart/internal/websocket"
)

type QueueService struct {
	queueRepo     repository.QueueRepository
	counterRepo   repository.CounterRepository
	tokenRepo     repository.TokenRepository
	analyticsRepo repository.AnalyticsRepository
	redis         *redis.Client
	hub           *websocket.Hub
}

func NewQueueService(qr repository.QueueRepository, cr repository.CounterRepository, tr repository.TokenRepository, ar repository.AnalyticsRepository, rc *redis.Client, hub *websocket.Hub) *QueueService {
	return &QueueService{queueRepo: qr, counterRepo: cr, tokenRepo: tr, analyticsRepo: ar, redis: rc, hub: hub}
}

func (s *QueueService) GetQueueStatus(queueID uuid.UUID) (*models.Queue, error) {
	return s.queueRepo.GetByID(queueID)
}

func (s *QueueService) JoinQueue(queueID uuid.UUID, userID *uuid.UUID, guestName, guestPhone string, isPriority bool) (*models.Token, error) {
	queue, err := s.queueRepo.GetByID(queueID)
	if err != nil {
		return nil, errors.New("queue not found")
	}
	if queue.Status != models.QueueStatusActive {
		return nil, errors.New("queue is not accepting tokens right now")
	}
	if queue.CurrentCount >= queue.MaxCapacity {
		return nil, errors.New("queue is at full capacity")
	}

	maxNum, _ := s.tokenRepo.GetMaxTokenNumber(queueID)
	tokenNum := maxNum + 1
	// displayNum is 1-based within the current session; resets to 1 after ResetQueueCounter.
	displayNum := tokenNum - queue.DisplayCodeBase
	if displayNum <= 0 {
		displayNum = 1
	}
	letter := string(rune('A' + (displayNum/1000)%26))
	displayCode := fmt.Sprintf("%s%03d", letter, displayNum%1000)

	priority := models.TokenPriorityNormal
	if isPriority && queue.IsPriorityEnabled {
		priority = models.TokenPriorityPriority
	}

	now := time.Now()
	serveTime := time.Duration(queue.AvgServeTimeSeconds) * time.Second

	// ── Chained-deadline model ────────────────────────────────────────────────
	// Find the latest EstimatedReadyAt among all currently waiting/called tokens.
	// The new token's deadline = lastDeadline + configured service time.
	//
	// Example: A joined 1 min ago with 3-min service → A's deadline = NOW+2min.
	//          B joins now → B's deadline = (NOW+2min) + 3min = NOW+5min.
	//          B's countdown starts at 5 min — exactly "remaining of A + service time".
	waitingTokens, _ := s.tokenRepo.GetByQueueID(queueID, []string{models.TokenStatusWaiting, models.TokenStatusCalled})
	var lastDeadline *time.Time
	for i := range waitingTokens {
		ra := waitingTokens[i].EstimatedReadyAt
		if ra != nil && ra.After(now) {
			if lastDeadline == nil || ra.After(*lastDeadline) {
				copy := *ra
				lastDeadline = &copy
			}
		}
	}

	var readyAt time.Time
	if lastDeadline != nil {
		// Chain: start after the last person in the queue finishes
		readyAt = lastDeadline.Add(serveTime)
	} else {
		// Queue is empty — this token is next; wait = one service slot
		readyAt = now.Add(serveTime)
	}
	estimatedWait := int(time.Until(readyAt).Seconds())

	token := &models.Token{
		QueueID:              queueID,
		UserID:               userID,
		TokenNumber:          tokenNum,
		DisplayCode:          displayCode,
		Status:               models.TokenStatusWaiting,
		Priority:             priority,
		EstimatedWaitSeconds: estimatedWait,
		EstimatedReadyAt:     &readyAt,
		GuestName:            guestName,
		GuestPhone:           guestPhone,
		JoinedAt:             time.Now(),
	}
	if err := s.tokenRepo.Create(token); err != nil {
		return nil, err
	}
	s.queueRepo.IncrementCount(queueID)
	s.updateAnalytics(queueID, queue.VenueID, "issued")

	s.hub.Broadcast(fmt.Sprintf("queue:%s", queueID.String()), "queue.joined", map[string]interface{}{
		"tokenNumber":  tokenNum,
		"displayCode":  displayCode,
		"currentCount": queue.CurrentCount + 1,
	})
	return token, nil
}

func (s *QueueService) CallToken(tokenID uuid.UUID, counterID *uuid.UUID) (*models.Token, error) {
	token, err := s.tokenRepo.GetByID(tokenID)
	if err != nil {
		return nil, errors.New("token not found")
	}
	if token.Status != models.TokenStatusWaiting {
		return nil, errors.New("only waiting tokens can be called")
	}
	if counterID != nil {
		counter, err := s.counterRepo.GetByID(*counterID)
		if err != nil || counter.QueueID != token.QueueID {
			return nil, errors.New("counter does not belong to this queue")
		}
		if !counter.IsActive {
			return nil, errors.New("counter is inactive")
		}
		busy, err := s.counterRepo.HasActiveToken(counter.ID)
		if err != nil {
			return nil, err
		}
		if busy {
			return nil, errors.New("counter is already serving another token")
		}
		token.CounterID = counterID
		token.Counter = counter
	}
	now := time.Now()
	token.Status = models.TokenStatusCalled
	token.CalledAt = &now
	if err := s.tokenRepo.Update(token); err != nil {
		return nil, err
	}
	s.hub.Broadcast(fmt.Sprintf("queue:%s", token.QueueID.String()), "token_called", map[string]interface{}{
		"tokenID":     token.ID,
		"tokenNumber": token.TokenNumber,
		"displayCode": token.DisplayCode,
		"calledAt":    now,
		"counter":     token.Counter,
	})
	s.hub.Broadcast(fmt.Sprintf("token:%s", token.ID.String()), "your_turn", map[string]interface{}{
		"tokenID":     token.ID,
		"displayCode": token.DisplayCode,
		"calledAt":    now,
		"counter":     token.Counter,
	})
	return token, nil
}

func (s *QueueService) CallNextToken(queueID uuid.UUID, counterID *uuid.UUID) (*models.Token, error) {
	token, err := s.tokenRepo.GetNextToken(queueID)
	if err != nil {
		return nil, errors.New("no tokens waiting")
	}
	return s.CallToken(token.ID, counterID)
}

func (s *QueueService) CompleteToken(tokenID uuid.UUID) (*models.Token, error) {
	token, err := s.tokenRepo.GetByID(tokenID)
	if err != nil {
		return nil, errors.New("token not found")
	}
	now := time.Now()
	token.Status = models.TokenStatusCompleted
	token.CompletedAt = &now
	if token.CalledAt != nil {
		token.ActualWaitSeconds = int(now.Sub(*token.CalledAt).Seconds())
	} else if !token.JoinedAt.IsZero() {
		token.ActualWaitSeconds = int(now.Sub(token.JoinedAt).Seconds())
	}
	if err := s.tokenRepo.Update(token); err != nil {
		return nil, err
	}
	s.queueRepo.DecrementCount(token.QueueID)
	s.updateAvgServeTime(token.QueueID, token.ActualWaitSeconds)
	s.updateAnalytics(token.QueueID, uuid.Nil, "completed")
	s.hub.Broadcast(fmt.Sprintf("queue:%s", token.QueueID.String()), "position.updated", map[string]interface{}{
		"tokenID":     token.ID,
		"status":      "completed",
		"completedAt": now,
	})
	return token, nil
}

func (s *QueueService) SkipToken(tokenID uuid.UUID) (*models.Token, error) {
	token, err := s.tokenRepo.GetByID(tokenID)
	if err != nil {
		return nil, errors.New("token not found")
	}
	token.Status = models.TokenStatusSkipped
	if err := s.tokenRepo.Update(token); err != nil {
		return nil, err
	}
	s.queueRepo.DecrementCount(token.QueueID)
	s.hub.Broadcast(fmt.Sprintf("queue:%s", token.QueueID.String()), "position.updated", map[string]interface{}{
		"tokenID": token.ID,
		"status":  "skipped",
	})
	return token, nil
}

func (s *QueueService) CancelToken(tokenID uuid.UUID, userID *uuid.UUID) (*models.Token, error) {
	token, err := s.tokenRepo.GetByID(tokenID)
	if err != nil {
		return nil, errors.New("token not found")
	}
	if userID != nil && token.UserID != nil && *token.UserID != *userID {
		return nil, errors.New("unauthorized to cancel this token")
	}
	if token.Status != models.TokenStatusWaiting && token.Status != models.TokenStatusCalled {
		return nil, errors.New("token cannot be cancelled")
	}
	token.Status = models.TokenStatusCancelled
	if err := s.tokenRepo.Update(token); err != nil {
		return nil, err
	}
	s.queueRepo.DecrementCount(token.QueueID)
	s.updateAnalytics(token.QueueID, uuid.Nil, "cancelled")
	s.hub.Broadcast(fmt.Sprintf("token:%s", token.ID.String()), "token.cancelled", map[string]interface{}{
		"tokenID": token.ID,
		"status":  "cancelled",
	})
	return token, nil
}

func (s *QueueService) TogglePriority(tokenID uuid.UUID) (*models.Token, error) {
	token, err := s.tokenRepo.GetByID(tokenID)
	if err != nil {
		return nil, errors.New("token not found")
	}
	if token.Priority == models.TokenPriorityNormal {
		token.Priority = models.TokenPriorityPriority
	} else {
		token.Priority = models.TokenPriorityNormal
	}
	err = s.tokenRepo.Update(token)
	return token, err
}

func (s *QueueService) UpdateQueueStatus(queueID uuid.UUID, status string) (*models.Queue, error) {
	if err := s.queueRepo.UpdateStatus(queueID, status); err != nil {
		return nil, err
	}
	queue, err := s.queueRepo.GetByID(queueID)
	if err != nil {
		return nil, err
	}
	s.hub.Broadcast(fmt.Sprintf("queue:%s", queueID.String()), "queue.status_changed", map[string]interface{}{
		"queueID": queueID,
		"status":  status,
	})
	return queue, nil
}

// GetTokenPosition returns the position, estimated wait seconds, and the
// absolute ready-by deadline for the given token.
// The deadline (estimated_ready_at) is the authoritative countdown source:
//   - At join time it equals NOW + position × avg_serve_time
//   - On extension it is shifted forward by the added seconds
//   - Downstream tokens are also shifted, so everyone behind sees the impact
//
// The returned estimatedWait is max(positionBased, deadlineRemaining).
func (s *QueueService) GetTokenPosition(queueID, tokenID uuid.UUID) (int, int, *time.Time, error) {
	token, err := s.tokenRepo.GetByID(tokenID)
	if err != nil {
		return 0, 0, nil, err
	}
	pos, err := s.tokenRepo.GetPosition(queueID, token.TokenNumber, token.Priority)
	queue, _ := s.queueRepo.GetByID(queueID)

	// Position-based estimate: how many people ahead × avg serve time
	positionBased := 0
	if queue != nil {
		positionBased = queue.AvgServeTimeSeconds * pos
	}

	now := time.Now()
	var readyAt *time.Time
	var estimatedWait int

	if token.EstimatedReadyAt != nil && token.EstimatedReadyAt.After(now) {
		// ✅ Stored deadline is still in the future — always trust it.
		// It was set at join time (chained model) or shifted by an extension.
		// Using it directly ensures refresh never resets the countdown.
		readyAt = token.EstimatedReadyAt
		estimatedWait = int(token.EstimatedReadyAt.Sub(now).Seconds())
	} else if token.EstimatedReadyAt == nil {
		// 🔧 Old token (created before deadline tracking was added).
		// Compute a position-based deadline ONCE and persist it to the DB so that
		// every subsequent refresh returns the same fixed timestamp.
		t := now.Add(time.Duration(positionBased) * time.Second)
		token.EstimatedReadyAt = &t
		_ = s.tokenRepo.Update(token) // save — future calls read from DB, no more drift
		readyAt = &t
		estimatedWait = positionBased
	} else {
		// Deadline has already passed — token is about to be called / being served.
		estimatedWait = 0
		t := now
		readyAt = &t
	}

	return pos, estimatedWait, readyAt, err
}


func (s *QueueService) updateAvgServeTime(_ uuid.UUID, _ int) {
	// AvgServeTimeSeconds is the admin-configured per-person service duration.
	// We intentionally do NOT auto-update it from actual completion times:
	// the moving-average update was corrupting the estimate every time a quick
	// test-token was completed (e.g. 10 s), causing wildly inconsistent countdowns.
	// Admins control this value explicitly via queue settings.
}

// ResetQueueCounter cancels all waiting/called tokens and resets the display
// code sequence so the next token issued starts from A001.
func (s *QueueService) ResetQueueCounter(queueID uuid.UUID) error {
	queue, err := s.queueRepo.GetByID(queueID)
	if err != nil {
		return errors.New("queue not found")
	}

	// Cancel every in-flight token so the queue is clean after the reset.
	waitingTokens, _ := s.tokenRepo.GetByQueueID(
		queueID, []string{models.TokenStatusWaiting, models.TokenStatusCalled},
	)
	for i := range waitingTokens {
		waitingTokens[i].Status = models.TokenStatusCancelled
		_ = s.tokenRepo.Update(&waitingTokens[i])
	}

	// Advance the base so the very next token gets displayNum = 1 → "A001".
	maxNum, _ := s.tokenRepo.GetMaxTokenNumber(queueID)
	queue.DisplayCodeBase = maxNum
	queue.CurrentCount = 0

	if err := s.queueRepo.Update(queue); err != nil {
		return err
	}

	// Notify all connected staff/admin dashboards.
	s.hub.Broadcast(
		fmt.Sprintf("queue:%s", queueID.String()),
		"queue.counter_reset",
		map[string]interface{}{"queueID": queueID.String()},
	)
	return nil
}

func (s *QueueService) updateAnalytics(queueID, venueID uuid.UUID, eventType string) {
	if queueID == uuid.Nil {
		return
	}
	queue, err := s.queueRepo.GetByID(queueID)
	if err != nil {
		return
	}
	now := time.Now()
	dateOnly := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	a := &models.QueueAnalytics{
		QueueID: queueID,
		VenueID: queue.VenueID,
		Date:    dateOnly,
		Hour:    now.Hour(),
	}
	switch eventType {
	case "issued":
		a.TokensIssued = 1
	case "completed":
		a.TokensCompleted = 1
	case "cancelled":
		a.TokensCancelled = 1
	}
	s.analyticsRepo.Upsert(a)
}
