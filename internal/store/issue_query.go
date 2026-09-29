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
	dates := issueQueryDates{asOf: asOf, rangeEnd: rangeEnd, dateAsOf: dateAsOf, dateRangeStart: dateRangeStart, statusAgeAnchor: statusAgeAnchor, statusAgeDays: statusAgeDays, customDueDate: customDueDate}
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
			if !dates.matchesDateRange(f, iss) {
				continue
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
			if !dates.matchesDueDate(f, iss) {
				continue
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
