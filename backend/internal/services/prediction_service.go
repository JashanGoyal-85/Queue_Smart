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
	heatmap := make(map[string]map[int]int)
	days := []string{"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"}
	for _, d := range days {
		heatmap[d] = make(map[int]int)
	}
	for _, a := range analytics {
		day := days[a.Date.Weekday()]
		heatmap[day][a.Hour] += a.TokensIssued
	}
	return map[string]interface{}{"heatmap": heatmap, "days": days}, nil
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
