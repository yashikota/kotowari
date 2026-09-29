package store

import (
	"strings"
	"time"
)

type issueQueryDates struct {
	asOf            string
	rangeEnd        string
	dateAsOf        string
	dateRangeStart  string
	statusAgeAnchor time.Time
	statusAgeDays   map[string]int
	customDueDate   string
}

func (dates issueQueryDates) matchesDateRange(f IssueFilter, iss Issue) bool {
	if f.DateRange != "" {
		date := ""
		switch f.DateField {
		case "createdAt":
			date = iss.CreatedAt
		case "updatedAt":
			date = iss.UpdatedAt
		case "startedAt":
			if iss.StartedAt != nil {
				date = *iss.StartedAt
			}
		case "completedAt":
			if iss.CompletedAt != nil {
				date = *iss.CompletedAt
			}
		case "timeInCurrentStatus":
			date = iss.StatusChangedAt
		}
		if f.DateField == "timeInCurrentStatus" {
			changedAt, err := time.Parse(time.RFC3339, date)
			if err != nil || changedAt.After(dates.statusAgeAnchor.Add(-time.Duration(dates.statusAgeDays[f.DateRange])*24*time.Hour)) {
				return false
			}
		} else {
			if len(date) > 10 {
				date = date[:10]
			}
			matches := false
			if strings.HasPrefix(f.DateRange, "on:") {
				matches = date == strings.TrimPrefix(f.DateRange, "on:")
			} else if dates.dateRangeStart != "" {
				matches = date != "" && date >= dates.dateRangeStart && date <= dates.dateAsOf
			}
			if !matches {
				return false
			}
		}
	}
	return true
}

func (dates issueQueryDates) matchesDueDate(f IssueFilter, iss Issue) bool {
	if f.DueDate != "" {
		date := ""
		if iss.DueDate != nil {
			date = *iss.DueDate
			if len(date) > 10 {
				date = date[:10]
			}
		}
		matches := f.DueDate == "none" && date == "" ||
			f.DueDate == "overdue" && date != "" && date < dates.asOf && iss.Status != "done" && iss.Status != "canceled" ||
			f.DueDate == "today" && date == dates.asOf ||
			strings.HasPrefix(f.DueDate, "on:") && date == dates.customDueDate ||
			dates.rangeEnd != "" && date > dates.asOf && date <= dates.rangeEnd
		if !matches {
			return false
		}
	}
	return true
}
