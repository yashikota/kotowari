package store

import (
	"strings"
	"time"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) ListIssues(f IssueFilter) ([]Issue, error) {
	var out []Issue
	f, validationErr := s.normalizeIssueFilter(f)
	if validationErr != nil {
		return nil, validationErr
	}
	asOf := f.DueDateAsOf
	if f.DueDate != "" && !domain.ValidDueDateFilter(f.DueDate) {
		return nil, validationf("invalid due date filter")
	}
	if asOf != "" && !domain.ValidDate(asOf) {
		return nil, validationf("invalid date filter anchor")
	}
	if asOf == "" {
		asOf = domain.Now()[:10]
	}
	dateAsOf := f.DateAsOf
	if dateAsOf == "" {
		dateAsOf = asOf
	}
	if !domain.ValidIssueDateFilter(f.DateField, f.DateRange) {
		return nil, validationf("invalid issue date filter")
	}
	if dateAsOf != "" && !domain.ValidDate(dateAsOf) {
		return nil, validationf("invalid date filter anchor")
	}
	rangeDays := map[string]int{"tomorrow": 1, "threeDays": 3, "week": 7, "month": 30, "quarter": 90}
	rangeEnd := ""
	if days := rangeDays[f.DueDate]; days > 0 {
		day, err := time.Parse("2006-01-02", asOf)
		if err != nil {
			return nil, validationf("invalid date filter anchor")
		}
		rangeEnd = day.AddDate(0, 0, days).Format("2006-01-02")
	}
	dateRangeDays := map[string]int{"dayAgo": 1, "threeDaysAgo": 3, "weekAgo": 7, "twoWeeksAgo": 14, "monthAgo": 30, "quarterAgo": 90, "halfYearAgo": 180, "yearAgo": 365}
	statusAgeDays := map[string]int{"dayAgo": 1, "weekAgo": 7, "twoWeeksAgo": 14, "monthAgo": 30, "quarterAgo": 90, "halfYearAgo": 180}
	statusAgeAnchor := time.Now().UTC()
	dateRangeStart := ""
	if days := dateRangeDays[f.DateRange]; days > 0 {
		day, err := time.Parse("2006-01-02", dateAsOf)
		if err != nil {
			return nil, validationf("invalid date filter anchor")
		}
		dateRangeStart = day.AddDate(0, 0, -days).Format("2006-01-02")
	}
	customDueDate := strings.TrimPrefix(f.DueDate, "on:")
	err := s.snapshot(func(m *mem) error {
		for _, iss := range m.Issues {
			if len(f.Statuses) > 0 {
				matches := false
				for _, status := range f.Statuses {
					if iss.Status == status || iss.WorkflowStatus == status {
						matches = true
						break
					}
				}
				if !matches {
					continue
				}
			}
			if f.Assignee == "none" && iss.Assignee != "" ||
				f.Assignee != "" && f.Assignee != "none" && iss.Assignee != f.Assignee {
				continue
			}
			if f.Archived == nil && iss.ArchivedAt != nil {
				continue
			}
			if f.Archived != nil && (*f.Archived != (iss.ArchivedAt != nil)) {
				continue
			}
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
					if err != nil || changedAt.After(statusAgeAnchor.Add(-time.Duration(statusAgeDays[f.DateRange])*24*time.Hour)) {
						continue
					}
				} else {
					if len(date) > 10 {
						date = date[:10]
					}
					matches := false
					if strings.HasPrefix(f.DateRange, "on:") {
						matches = date == strings.TrimPrefix(f.DateRange, "on:")
					} else if dateRangeStart != "" {
						matches = date != "" && date >= dateRangeStart && date <= dateAsOf
					}
					if !matches {
						continue
					}
				}
			}
			if f.Content != "" {
				needle := strings.ToLower(strings.TrimSpace(f.Content))
				if !strings.Contains(strings.ToLower(iss.Title), needle) &&
					!strings.Contains(strings.ToLower(iss.Identifier), needle) &&
					!strings.Contains(strings.ToLower(iss.Body), needle) {
					continue
				}
			}
			if f.MilestoneName != "" && (iss.MilestoneName == nil || !strings.Contains(strings.ToLower(*iss.MilestoneName), strings.ToLower(strings.TrimSpace(f.MilestoneName)))) {
				continue
			}
			if f.Relation != "" && !matchesIssueRelationFilter(m, iss, f.Relation) {
				continue
			}
			if len(f.LinkSources) > 0 && !matchesIssueLinkSources(iss, f.LinkSources) {
				continue
			}
			if len(f.TemplateSlugs) > 0 && !matchesIssueTemplateSlugs(iss, f.TemplateSlugs) {
				continue
			}
			if f.DueDate != "" {
				date := ""
				if iss.DueDate != nil {
					date = *iss.DueDate
					if len(date) > 10 {
						date = date[:10]
					}
				}
				matches := f.DueDate == "none" && date == "" ||
					f.DueDate == "overdue" && date != "" && date < asOf && iss.Status != "done" && iss.Status != "canceled" ||
					f.DueDate == "today" && date == asOf ||
					strings.HasPrefix(f.DueDate, "on:") && date == customDueDate ||
					rangeEnd != "" && date > asOf && date <= rangeEnd
				if !matches {
					continue
				}
			}
			if f.Status != "" && iss.Status != f.Status && iss.WorkflowStatus != f.Status {
				continue
			}
			if f.ProjectSlug != "" && (iss.ProjectSlug == nil || *iss.ProjectSlug != f.ProjectSlug) {
				if iss.ProjectID != nil {
					if p, ok := projectByID(m, *iss.ProjectID); !ok || p.Slug != f.ProjectSlug {
						continue
					}
				} else {
					continue
				}
			}
			if f.ProjectStatus != "" || f.ProjectPriority != nil {
				project, found := Project{}, false
				if iss.ProjectID != nil {
					project, found = projectByID(m, *iss.ProjectID)
				}
				if !found && iss.ProjectSlug != nil {
					for _, candidate := range m.Projects {
						if candidate.Slug == *iss.ProjectSlug {
							project, found = candidate, true
							break
						}
					}
				}
				if !found || (f.ProjectStatus != "" && normalizeProjectWorkflowStatus(project, m.Workspace).WorkflowStatus != f.ProjectStatus && project.Status != f.ProjectStatus) ||
					(f.ProjectPriority != nil && project.Priority != *f.ProjectPriority) {
					continue
				}
			}
			if len(f.ProjectLabels) > 0 {
				project, found := Project{}, false
				if iss.ProjectID != nil {
					project, found = projectByID(m, *iss.ProjectID)
				}
				if !found && iss.ProjectSlug != nil {
					project, found = projectBySlug(m, *iss.ProjectSlug)
				}
				if !found {
					continue
				}
				have := make(map[string]struct{}, len(project.Labels))
				for _, name := range project.Labels {
					have[strings.ToLower(name)] = struct{}{}
				}
				matches := true
				for _, name := range f.ProjectLabels {
					if name == "__none__" {
						if len(have) != 0 {
							matches = false
						}
						continue
					}
					if _, ok := have[strings.ToLower(name)]; !ok {
						matches = false
						break
					}
				}
				if !matches {
					continue
				}
			}
			if f.CycleNumber != 0 {
				ok := iss.CycleNumber != nil && *iss.CycleNumber == f.CycleNumber
				if !ok && iss.CycleID != nil {
					if c, found := cycleByID(m, *iss.CycleID); found && c.Number == f.CycleNumber {
						ok = true
					}
				}
				if !ok {
					continue
				}
			}
			if len(f.AddedToCycle) > 0 {
				phase := addedToCyclePhase(m, iss)
				matches := false
				for _, wanted := range f.AddedToCycle {
					if phase == wanted {
						matches = true
						break
					}
				}
				if !matches {
					continue
				}
			}
			if len(f.Priorities) > 0 {
				matches := false
				for _, priority := range f.Priorities {
					if iss.Priority == priority {
						matches = true
						break
					}
				}
				if !matches {
					continue
				}
			} else if f.Priority != nil && iss.Priority != *f.Priority {
				continue
			}
			if f.Type != "" && iss.Type != f.Type {
				continue
			}
			if len(f.Estimates) > 0 || f.NoEstimate {
				matches := f.NoEstimate && iss.Estimate == nil
				for _, estimate := range f.Estimates {
					if iss.Estimate != nil && *iss.Estimate == estimate {
						matches = true
						break
					}
				}
				if !matches {
					continue
				}
			} else if f.Estimate != nil && (iss.Estimate == nil || *iss.Estimate != *f.Estimate) {
				continue
			}
			if f.IsFavorite != nil && iss.IsFavorite != *f.IsFavorite {
				continue
			}
			if len(f.Labels) > 0 {
				have := map[string]struct{}{}
				for _, l := range iss.Labels {
					have[l.Name] = struct{}{}
				}
				matchesCount := 0
				for _, name := range f.Labels {
					if _, found := have[name]; found {
						matchesCount++
					}
				}
				operator := f.LabelOperator
				if operator == "" {
					operator = "includeAll"
				}
				ok := false
				switch operator {
				case "includeAny":
					ok = matchesCount > 0
				case "includeAll":
					ok = matchesCount == len(f.Labels)
				case "excludeAny":
					ok = matchesCount == 0
				case "excludeAll":
					ok = matchesCount != len(f.Labels)
				}
				if !ok {
					continue
				}
			}
			out = append(out, iss)
		}
		if out == nil {
			out = []Issue{}
		}
		out = sortIssueTree(out)
		return nil
	})
	return out, err
}

func validIssueLabelOperator(operator string) bool {
	switch operator {
	case "includeAny", "includeAll", "excludeAny", "excludeAll":
		return true
	default:
		return false
	}
}

func defaultIssueLabelOperator(labels []string) string {
	if len(labels) > 1 {
		return "includeAll"
	}
	return "includeAny"
}

func validateAddedToCycle(values []string) error {
	if len(values) > 3 {
		return validationf("too many added-to-cycle filters")
	}
	for _, value := range values {
		if value != "planned" && value != "during" && value != "after" {
			return validationf("invalid added-to-cycle filter")
		}
	}
	return nil
}

func addedToCyclePhase(m *mem, issue Issue) string {
	cycle, found := Cycle{}, false
	if issue.CycleID != nil {
		cycle, found = cycleByID(m, *issue.CycleID)
	}
	if !found && issue.CycleNumber != nil {
		cycle, found = cycleByNumber(m, *issue.CycleNumber)
	}
	if !found {
		return ""
	}
	addedAt := issue.CreatedAt
	if issue.CycleAddedAt != nil {
		addedAt = *issue.CycleAddedAt
	}
	added, addedErr := time.Parse(time.RFC3339, addedAt)
	start, startErr := time.Parse(time.RFC3339, cycle.StartsAt)
	end, endErr := time.Parse(time.RFC3339, cycle.EndsAt)
	if addedErr != nil || startErr != nil || endErr != nil {
		return ""
	}
	if added.Before(start) {
		return "planned"
	}
	if added.After(end) {
		return "after"
	}
	return "during"
}

func matchesIssueRelationFilter(m *mem, issue Issue, filter string) bool {
	switch filter {
	case "parent":
		for _, child := range m.Issues {
			if child.ParentID != nil && *child.ParentID == issue.ID {
				return true
			}
		}
		return false
	case "subissue":
		return issue.ParentID != nil
	case "recurring":
		return issue.RecurringSlug != nil
	case "related":
		return len(issue.Relations) > 0
	case "blocked", "blocking", "duplicate":
		for _, relation := range issue.Relations {
			switch filter {
			case "blocked":
				if relation.Kind == "blockedBy" {
					return true
				}
			case "blocking":
				if relation.Kind == "blocks" {
					return true
				}
			case "duplicate":
				if relation.Kind == "duplicateOf" || relation.Kind == "duplicateBy" {
					return true
				}
			}
		}
		return false
	default:
		return false
	}
}
