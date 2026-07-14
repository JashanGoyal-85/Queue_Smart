package services

import (
	"queuesmart/internal/repository"
	"github.com/google/uuid"
)

type PredictionService struct {
	analyticsRepo repository.AnalyticsRepository
	queueRepo     repository.QueueRepository
}

func NewPredictionService(ar repository.AnalyticsRepository, qr repository.QueueRepository) *PredictionService {
	return &PredictionService{analyticsRepo: ar, queueRepo: qr}
}

func (s *PredictionService) GetEstimatedWait(avgServeTime, position int) int {
	if position <= 0 {
		return 0
	}
	return avgServeTime * position
}

func (s *PredictionService) GetPeakHours(venueID uuid.UUID) (map[string]interface{}, error) {
	analytics, err := s.analyticsRepo.GetPeakHours(venueID)
	if err != nil {
		return nil, err
	}

	// Build [7][24] heatmap where:
	//   rows 0-6 = Mon, Tue, Wed, Thu, Fri, Sat, Sun (matching frontend DAYS array)
	//   cols 0-23 = hour of day
	// Go's time.Weekday(): Sun=0, Mon=1 … Sat=6
	// Conversion to frontend index: (goWeekday + 6) % 7
	heatmap := make([][]int, 7)
	for i := range heatmap {
		heatmap[i] = make([]int, 24)
	}
	for _, a := range analytics {
		goDay := int(a.Date.Weekday()) // 0=Sun … 6=Sat
		dayIdx := (goDay + 6) % 7    // 0=Mon … 6=Sun
		h := a.Hour
		if h >= 0 && h < 24 {
			heatmap[dayIdx][h] += a.TokensIssued
		}
	}

	// Compute summary stats
	frontendDays := []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
	busiestDayIdx := 0
	busiestDayTotal := 0
	for d := 0; d < 7; d++ {
		total := 0
		for h := 0; h < 24; h++ {
			total += heatmap[d][h]
		}
		if total > busiestDayTotal {
			busiestDayTotal = total
			busiestDayIdx = d
		}
	}

	busiestHour := 0
	busiestHourTotal := 0
	peakVolume := 0
	for h := 0; h < 24; h++ {
		hourTotal := 0
		for d := 0; d < 7; d++ {
			v := heatmap[d][h]
			hourTotal += v
			if v > peakVolume {
				peakVolume = v
			}
		}
		if hourTotal > busiestHourTotal {
			busiestHourTotal = hourTotal
			busiestHour = h
		}
	}

	summary := map[string]interface{}{
		"busiest_day":  frontendDays[busiestDayIdx],
		"busiest_hour": busiestHour,
		"peak_volume":  peakVolume,
	}

	return map[string]interface{}{
		"heatmap": heatmap,
		"summary": summary,
	}, nil
}

type SlotRecommendation struct {
	Hour            int    `json:"hour"`
	Label           string `json:"label"`
	PredictedLoad   int    `json:"predicted_load"`
	RecommendedLoad string `json:"recommended_load"`
}

func (s *PredictionService) GetSlotRecommendation(venueID uuid.UUID) ([]SlotRecommendation, error) {
	result := []SlotRecommendation{}
	for i := 0; i < 4; i++ {
		label := "Now"
		if i > 0 {
			label = "+" + string(rune('0'+i)) + "h"
		}
		result = append(result, SlotRecommendation{
			Hour:            i,
			Label:           label,
			PredictedLoad:   10 - i*2,
			RecommendedLoad: "moderate",
		})
	}
	return result, nil
}
