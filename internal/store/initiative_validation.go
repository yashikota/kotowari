package store

import "time"

func validInitiativeStatus(status string) bool {
	switch status {
	case "proposed", "planned", "active", "completed", "canceled":
		return true
	default:
		return false
	}
}

func validInitiativeDates(start, target *string) bool {
	if !validMilestoneDate(start) || !validMilestoneDate(target) {
		return false
	}
	if start == nil || target == nil || *start == "" || *target == "" {
		return true
	}
	startDate, startErr := time.Parse("2006-01-02", *start)
	targetDate, targetErr := time.Parse("2006-01-02", *target)
	return startErr == nil && targetErr == nil && !startDate.After(targetDate)
}

func cloneString(value *string) *string {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
}
