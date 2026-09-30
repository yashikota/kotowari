package store

import (
	"strings"
	"time"

	"github.com/yashikota/kotowari/internal/domain"
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

func newIssueQueryDates(filter IssueFilter) (issueQueryDates, error) {
	dateAsOfProvided := filter.DateAsOf != ""
	asOf := filter.DueDateAsOf
	if filter.DueDate != "" && !domain.ValidDueDateFilter(filter.DueDate) {
		return issueQueryDates{}, validationf("invalid due date filter")
	}
	if asOf != "" && !domain.ValidDate(asOf) {
		return issueQueryDates{}, validationf("invalid date filter anchor")
	}
	if asOf == "" {
		asOf = domain.Now()[:10]
	}
	dateAsOf := filter.DateAsOf
	if dateAsOf == "" {
		dateAsOf = asOf
	}
	if !domain.ValidIssueDateFilter(filter.DateField, filter.DateRange) {
		return issueQueryDates{}, validationf("invalid issue date filter")
	}
	if dateAsOf != "" && !domain.ValidDate(dateAsOf) {
		return issueQueryDates{}, validationf("invalid date filter anchor")
	}

	rangeDays := map[string]int{"tomorrow": 1, "threeDays": 3, "week": 7, "month": 30, "quarter": 90}
	rangeEnd := ""
	if days := rangeDays[filter.DueDate]; days > 0 {
		day, err := time.Parse("2006-01-02", asOf)
		if err != nil {
			return issueQueryDates{}, validationf("invalid date filter anchor")
		}
		rangeEnd = day.AddDate(0, 0, days).Format("2006-01-02")
	}
	dateRangeDays := map[string]int{"dayAgo": 1, "threeDaysAgo": 3, "weekAgo": 7, "twoWeeksAgo": 14, "monthAgo": 30, "quarterAgo": 90, "halfYearAgo": 180, "yearAgo": 365}
	statusAgeDays := map[string]int{"dayAgo": 1, "weekAgo": 7, "twoWeeksAgo": 14, "monthAgo": 30, "quarterAgo": 90, "halfYearAgo": 180}
	dateRangeStart := ""
	if days := dateRangeDays[filter.DateRange]; days > 0 {
		day, err := time.Parse("2006-01-02", dateAsOf)
		if err != nil {
			return issueQueryDates{}, validationf("invalid date filter anchor")
		}
		dateRangeStart = day.AddDate(0, 0, -days).Format("2006-01-02")
	}
	var statusAgeAnchor time.Time
	if filter.DateField == "timeInCurrentStatus" && !dateAsOfProvided {
		// Status age is elapsed time, so relative filters without an explicit
		// anchor use the current instant rather than the start/end of a date.
		statusAgeAnchor = time.Now().UTC()
	} else {
		anchoredStatusAge, err := time.Parse("2006-01-02", dateAsOf)
		if err != nil {
			return issueQueryDates{}, validationf("invalid date filter anchor")
		}
		// Explicit DateAsOf values keep anchored status-age filters stable.
		statusAgeAnchor = anchoredStatusAge.AddDate(0, 0, 1)
	}
	return issueQueryDates{
		asOf:            asOf,
		rangeEnd:        rangeEnd,
		dateAsOf:        dateAsOf,
		dateRangeStart:  dateRangeStart,
		statusAgeAnchor: statusAgeAnchor,
		statusAgeDays:   statusAgeDays,
		customDueDate:   strings.TrimPrefix(filter.DueDate, "on:"),
	}, nil
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
