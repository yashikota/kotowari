package store

import "time"

func cycleForIssueAutomation(m *mem, issue Issue, now time.Time) *Cycle {
	settings := normalizedCycleSettings(m.Workspace.CycleSettings)
	completed := issue.Status == "done"
	if issue.Status == "canceled" ||
		(completed && !settings.AutoAddCompletedIssues) ||
		(!completed && !settings.AutoAddActiveIssues) {
		return nil
	}

	location, err := time.LoadLocation(m.Workspace.Timezone)
	if err != nil {
		location = time.UTC
	}
	now = now.In(location)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location)

	if settings.AutoAddActiveIssues && issue.DueDate != nil {
		if dueDate, err := time.ParseInLocation("2006-01-02", *issue.DueDate, location); err == nil {
			var dueCycle *Cycle
			var latestStart time.Time
			for i := range m.Cycles {
				cycle := &m.Cycles[i]
				if cycle.Status != "active" && cycle.Status != "upcoming" {
					continue
				}
				start, end := cycleDate(cycle.StartsAt, location), cycleDate(cycle.EndsAt, location)
				if start == nil || end == nil || !end.After(*start) || dueDate.Before(*start) || !dueDate.Before(*end) {
					continue
				}
				if dueCycle == nil || start.After(latestStart) {
					dueCycle = cycle
					latestStart = *start
				}
			}
			if dueCycle != nil {
				return dueCycle
			}
		}
	}

	var current *Cycle
	var currentStart time.Time
	for i := range m.Cycles {
		cycle := &m.Cycles[i]
		if cycle.Status != "active" && cycle.Status != "upcoming" {
			continue
		}
		start, end := cycleDate(cycle.StartsAt, location), cycleDate(cycle.EndsAt, location)
		if start == nil || end == nil || !end.After(*start) || today.Before(*start) || !today.Before(*end) {
			continue
		}
		if current == nil || (cycle.Status == "active" && current.Status != "active") ||
			(cycle.Status == current.Status && start.After(currentStart)) {
			current = cycle
			currentStart = *start
		}
	}
	if current != nil {
		return current
	}

	if settings.CooldownDays > 0 {
		var ended *Cycle
		var latestEnd time.Time
		for i := range m.Cycles {
			cycle := &m.Cycles[i]
			if cycle.Status != "active" && cycle.Status != "completed" {
				continue
			}
			end := cycleDate(cycle.EndsAt, location)
			if end == nil || end.After(today) {
				continue
			}
			if ended == nil || end.After(latestEnd) {
				ended = cycle
				latestEnd = *end
			}
		}
		if ended != nil {
			var next *Cycle
			var nextStart time.Time
			for i := range m.Cycles {
				cycle := &m.Cycles[i]
				if cycle.Status != "upcoming" {
					continue
				}
				start := cycleDate(cycle.StartsAt, location)
				if start == nil || start.Before(latestEnd) {
					continue
				}
				if next == nil || start.Before(nextStart) {
					next = cycle
					nextStart = *start
				}
			}
			if next != nil && !today.Before(latestEnd) && today.Before(nextStart) {
				return next
			}
		}
	}

	return nil
}

func autoAssignIssueCycle(m *mem, issue *Issue, now time.Time) {
	if issue.CycleID != nil {
		return
	}
	cycle := cycleForIssueAutomation(m, *issue, now)
	if cycle == nil {
		return
	}
	id, number, addedAt := cycle.ID, cycle.Number, now.Format(time.RFC3339Nano)
	issue.CycleID = &id
	issue.CycleNumber = &number
	issue.CycleAddedAt = &addedAt
}
