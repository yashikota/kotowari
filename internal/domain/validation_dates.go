package domain

import (
	"strings"
	"time"
)

func ValidDate(value string) bool {
	_, err := time.Parse("2006-01-02", value)
	return err == nil
}

func ValidDueDateFilter(value string) bool {
	switch value {
	case "", "overdue", "today", "tomorrow", "threeDays", "week", "month", "quarter", "custom", "none":
		return true
	default:
		return strings.HasPrefix(value, "on:") && ValidDate(strings.TrimPrefix(value, "on:"))
	}
}

func ValidIssueDateFilter(field, dateRange string) bool {
	if field == "" && dateRange == "" {
		return true
	}
	if !ValidIssueDateField(field) || !ValidIssueDateRange(dateRange) || dateRange == "" {
		return false
	}
	if field == "timeInCurrentStatus" && strings.HasPrefix(dateRange, "on:") {
		return false
	}
	if field == "timeInCurrentStatus" {
		switch dateRange {
		case "dayAgo", "weekAgo", "twoWeeksAgo", "monthAgo", "quarterAgo", "halfYearAgo":
		default:
			return false
		}
	}
	return true
}

func ValidIssueDateField(value string) bool {
	switch value {
	case "createdAt", "updatedAt", "startedAt", "completedAt", "timeInCurrentStatus":
		return true
	default:
		return false
	}
}

func ValidIssueDateRange(value string) bool {
	switch value {
	case "", "dayAgo", "threeDaysAgo", "weekAgo", "twoWeeksAgo", "monthAgo", "quarterAgo", "halfYearAgo", "yearAgo":
		return true
	default:
		return strings.HasPrefix(value, "on:") && ValidDate(strings.TrimPrefix(value, "on:"))
	}
}
