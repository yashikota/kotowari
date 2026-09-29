package store

import (
	"path/filepath"
	"time"
)

// ProcessDueRecurringIssues creates the next scheduled issue after the current
// instance's due date has passed. Issue frontmatter is checked before writes to
// recover safely if the app stopped between creating an issue and updating its
// schedule file.
func (s *Store) ProcessDueRecurringIssues() error {
	s.state.recurringMu.Lock()
	defer s.state.recurringMu.Unlock()
	recurring, err := s.ListRecurringIssues()
	if err != nil {
		return err
	}
	if len(recurring) == 0 {
		return nil
	}
	issues, err := s.ListIssues(IssueFilter{})
	if err != nil {
		return err
	}
	today, err := s.workspaceToday()
	if err != nil {
		return err
	}
	for _, schedule := range recurring {
		if !schedule.Enabled {
			continue
		}
		current := findRecurringInstance(issues, schedule.Slug, schedule.NextDueDate)
		if current == nil {
			created, err := s.createRecurringInstance(schedule, schedule.NextDueDate)
			if err != nil {
				return err
			}
			current = &created
			issues = append(issues, created)
		}
		originalLastIssue := schedule.LastIssueIdentifier
		originalNextDueDate := schedule.NextDueDate
		schedule.LastIssueIdentifier = current.Identifier
		for generated := 0; schedule.NextDueDate < today && generated < 366; generated++ {
			next, err := nextRecurringDate(schedule.NextDueDate, schedule.Interval, schedule.Unit)
			if err != nil {
				return err
			}
			current = findRecurringInstance(issues, schedule.Slug, next)
			if current == nil {
				created, err := s.createRecurringInstance(schedule, next)
				if err != nil {
					return err
				}
				current = &created
				issues = append(issues, created)
			}
			schedule.LastIssueIdentifier = current.Identifier
			schedule.NextDueDate = next
		}
		if schedule.LastIssueIdentifier != originalLastIssue || schedule.NextDueDate != originalNextDueDate {
			if err := s.persistRecurringIssue(schedule); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *Store) createRecurringInstance(schedule RecurringIssue, dueDate string) (Issue, error) {
	labels, err := s.ListLabels()
	if err != nil {
		return Issue{}, err
	}
	labelIDs := make([]int64, 0, len(schedule.Labels))
	for _, name := range schedule.Labels {
		for _, label := range labels {
			if label.Name == name {
				labelIDs = append(labelIDs, label.ID)
				break
			}
		}
	}
	var projectID *int64
	if schedule.ProjectSlug != nil {
		projects, err := s.ListProjects()
		if err != nil {
			return Issue{}, err
		}
		for _, project := range projects {
			if project.Slug == *schedule.ProjectSlug {
				id := project.ID
				projectID = &id
				break
			}
		}
	}
	slug := schedule.Slug
	return s.CreateIssue(CreateIssueInput{
		Title: schedule.Title, Body: schedule.Body, Status: schedule.Status, Assignee: schedule.Assignee,
		Type: schedule.Type, Priority: schedule.Priority, Estimate: schedule.Estimate,
		ProjectID: projectID, DueDate: &dueDate, LabelIDs: labelIDs, RecurringSlug: &slug, ExternalLinks: schedule.Links,
	})
}

func (s *Store) persistRecurringIssue(recurring RecurringIssue) error {
	s.state.mu.Lock()
	defer s.state.mu.Unlock()
	return writeRecurringIssue(filepath.Join(s.root, "TEMPLATE", "RECURRING-"+recurring.Slug+".md"), recurring)
}

func (s *Store) workspaceToday() (string, error) {
	workspace, err := s.Workspace()
	if err != nil {
		return "", err
	}
	location, err := time.LoadLocation(workspace.Timezone)
	if err != nil {
		location = time.Local
	}
	return time.Now().In(location).Format("2006-01-02"), nil
}

func findRecurringInstance(issues []Issue, slug, dueDate string) *Issue {
	for index := range issues {
		issue := &issues[index]
		if issue.RecurringSlug != nil && *issue.RecurringSlug == slug && issue.DueDate != nil && *issue.DueDate == dueDate {
			return issue
		}
	}
	return nil
}

func nextRecurringDate(current string, interval int, unit string) (string, error) {
	date, err := time.Parse("2006-01-02", current)
	if err != nil {
		return "", err
	}
	switch unit {
	case "day":
		date = date.AddDate(0, 0, interval)
	case "week":
		date = date.AddDate(0, 0, 7*interval)
	case "month":
		date = addMonthsClamped(date, interval)
	case "year":
		date = addMonthsClamped(date, 12*interval)
	default:
		return "", validationf("invalid recurring interval unit")
	}
	return date.Format("2006-01-02"), nil
}

func addMonthsClamped(date time.Time, months int) time.Time {
	monthStart := time.Date(date.Year(), date.Month()+time.Month(months), 1, 0, 0, 0, 0, time.UTC)
	lastDay := time.Date(monthStart.Year(), monthStart.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
	day := date.Day()
	if day > lastDay {
		day = lastDay
	}
	return time.Date(monthStart.Year(), monthStart.Month(), day, 0, 0, 0, 0, time.UTC)
}

func validRecurringUnit(unit string) bool {
	return unit == "day" || unit == "week" || unit == "month" || unit == "year"
}
