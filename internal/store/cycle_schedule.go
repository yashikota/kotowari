package store

import (
	"fmt"
	"time"
)

func (s *Store) EnsureCycleSchedule() ([]Cycle, error) {
	var cycles []Cycle
	err := s.mutate(func(m *mem) error {
		ensureCycleSchedule(m, time.Now())
		cycles = append([]Cycle{}, m.Cycles...)
		return nil
	})
	return cycles, err
}

func ensureCycleSchedule(m *mem, now time.Time) {
	settings := normalizedCycleSettings(m.Workspace.CycleSettings)
	if settings.AutoCreateAhead == 0 || len(m.Cycles) == 0 {
		return
	}

	location, err := time.LoadLocation(m.Workspace.Timezone)
	if err != nil {
		location = time.UTC
	}
	now = now.In(location)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location)
	targetWeekday, ok := cycleStartWeekday(settings.StartDay)
	if !ok {
		return
	}

	upcoming := 0
	latest := m.Cycles[0]
	for _, cycle := range m.Cycles {
		end := cycleDate(cycle.EndsAt, location)
		if end == nil {
			continue
		}
		latestEnd := cycleDate(latest.EndsAt, location)
		if latestEnd == nil || end.After(*latestEnd) {
			latest = cycle
		}
		if cycle.Status == "upcoming" && end.After(today) {
			upcoming++
		}
	}
	if upcoming >= settings.AutoCreateAhead {
		return
	}

	latestEnd := cycleDate(latest.EndsAt, location)
	if latestEnd == nil {
		return
	}
	start := latestEnd.AddDate(0, 0, settings.CooldownDays)
	if start.Before(today) {
		start = today
	}
	start = nextCycleWeekday(start, targetWeekday)
	maxNumber := latest.Number
	for _, cycle := range m.Cycles {
		if cycle.Number > maxNumber {
			maxNumber = cycle.Number
		}
	}
	for upcoming < settings.AutoCreateAhead {
		end := start.AddDate(0, 0, settings.DurationDays)
		nowStamp := now.Format(time.RFC3339Nano)
		cycle := Cycle{
			ID:        m.nextID(),
			Number:    maxNumber + 1,
			Name:      fmt.Sprintf("Cycle %d", maxNumber+1),
			StartsAt:  start.Format(time.RFC3339),
			EndsAt:    end.Format(time.RFC3339),
			Status:    "upcoming",
			Resources: []IssueLink{},
			CreatedAt: nowStamp,
			UpdatedAt: nowStamp,
		}
		m.Cycles = append(m.Cycles, cycle)
		addActivity(m, "cycle", cycle.ID, "created", map[string]any{"number": cycle.Number}, nowStamp)
		maxNumber++
		upcoming++
		start = nextCycleWeekday(end.AddDate(0, 0, settings.CooldownDays), targetWeekday)
	}
	m.bump(now.Format(time.RFC3339Nano))
}

func cycleDate(value string, location *time.Location) *time.Time {
	if len(value) < len("2006-01-02") {
		return nil
	}
	date, err := time.ParseInLocation("2006-01-02", value[:len("2006-01-02")], location)
	if err != nil {
		return nil
	}
	return &date
}

func cycleStartWeekday(value string) (time.Weekday, bool) {
	switch value {
	case "sunday":
		return time.Sunday, true
	case "monday":
		return time.Monday, true
	case "tuesday":
		return time.Tuesday, true
	case "wednesday":
		return time.Wednesday, true
	case "thursday":
		return time.Thursday, true
	case "friday":
		return time.Friday, true
	case "saturday":
		return time.Saturday, true
	default:
		return time.Sunday, false
	}
}

func nextCycleWeekday(date time.Time, weekday time.Weekday) time.Time {
	days := (int(weekday) - int(date.Weekday()) + 7) % 7
	return date.AddDate(0, 0, days)
}
