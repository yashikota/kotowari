package store

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pelletier/go-toml/v2"
)

// RecurringIssue describes a single-user local schedule. Each generated issue
// remains an ordinary Markdown issue and records the schedule slug in its
// frontmatter so missed runs can recover without creating duplicates.
type RecurringIssue struct {
	Slug                string   `json:"slug"`
	Name                string   `json:"name"`
	Title               string   `json:"title"`
	Body                string   `json:"body"`
	Status              string   `json:"status"`
	Type                string   `json:"type,omitempty"`
	Priority            int      `json:"priority"`
	Estimate            *int     `json:"estimate,omitempty"`
	ProjectSlug         *string  `json:"projectSlug,omitempty"`
	Labels              []string `json:"labels"`
	FirstDueDate        string   `json:"firstDueDate"`
	Interval            int      `json:"interval"`
	Unit                string   `json:"unit"`
	NextDueDate         string   `json:"nextDueDate"`
	LastIssueIdentifier string   `json:"lastIssueIdentifier,omitempty"`
	Enabled             bool     `json:"enabled"`
}

type recurringIssueFM struct {
	Name                string   `toml:"name"`
	Title               string   `toml:"title"`
	Status              string   `toml:"status"`
	Type                string   `toml:"type,omitempty"`
	Priority            int      `toml:"priority"`
	Estimate            *int     `toml:"estimate,omitempty"`
	Project             *string  `toml:"project,omitempty"`
	Labels              []string `toml:"labels,omitempty"`
	FirstDueDate        string   `toml:"first_due_date"`
	Interval            int      `toml:"interval"`
	Unit                string   `toml:"unit"`
	NextDueDate         string   `toml:"next_due_date"`
	LastIssueIdentifier string   `toml:"last_issue,omitempty"`
	Enabled             bool     `toml:"enabled"`
}

type CreateRecurringIssueInput struct {
	Name         string
	FirstDueDate string
	Interval     int
	Unit         string
}

func (s *Store) ListRecurringIssues() ([]RecurringIssue, error) {
	var out []RecurringIssue
	err := s.snapshot(func(_ *mem) error {
		entries, err := os.ReadDir(filepath.Join(s.root, "TEMPLATE"))
		if err != nil && !os.IsNotExist(err) {
			return err
		}
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasPrefix(entry.Name(), "RECURRING-") || !strings.HasSuffix(entry.Name(), ".md") {
				continue
			}
			recurring, err := readRecurringIssue(filepath.Join(s.root, "TEMPLATE", entry.Name()))
			if err != nil {
				return fmt.Errorf("%s: %w", entry.Name(), err)
			}
			recurring.Slug = strings.TrimSuffix(strings.TrimPrefix(entry.Name(), "RECURRING-"), ".md")
			out = append(out, recurring)
		}
		return nil
	})
	if out == nil {
		out = []RecurringIssue{}
	}
	return out, err
}

func (s *Store) CreateRecurringIssue(identifier string, in CreateRecurringIssueInput) (RecurringIssue, error) {
	in.Name = strings.TrimSpace(in.Name)
	slug := issueTemplateSlug(in.Name)
	if in.Name == "" || slug == "" || len([]rune(in.Name)) > 100 {
		return RecurringIssue{}, validationf("recurring issue name must contain 1 to 100 characters")
	}
	if in.Interval < 1 || in.Interval > 365 || !validRecurringUnit(in.Unit) {
		return RecurringIssue{}, validationf("invalid recurring interval")
	}
	if _, err := time.Parse("2006-01-02", in.FirstDueDate); err != nil {
		return RecurringIssue{}, validationf("first due date must use YYYY-MM-DD")
	}
	s.mu.Lock()
	m, err := load(s.root)
	if err != nil {
		s.mu.Unlock()
		return RecurringIssue{}, err
	}
	issue, ok := issueByIdent(m, identifier)
	if !ok {
		s.mu.Unlock()
		return RecurringIssue{}, ErrNotFound
	}
	if err := ensureIssueActive(issue); err != nil {
		s.mu.Unlock()
		return RecurringIssue{}, err
	}
	path := filepath.Join(s.root, "TEMPLATE", "RECURRING-"+slug+".md")
	if _, err := os.Stat(path); err == nil {
		s.mu.Unlock()
		return RecurringIssue{}, errf(ErrConflict, "recurring issue name already exists")
	} else if !os.IsNotExist(err) {
		s.mu.Unlock()
		return RecurringIssue{}, err
	}
	labels := make([]string, 0, len(issue.Labels))
	for _, label := range issue.Labels {
		labels = append(labels, label.Name)
	}
	recurring := RecurringIssue{
		Slug: slug, Name: in.Name, Title: issue.Title, Body: issue.Body,
		Status: "backlog", Type: issue.Type, Priority: issue.Priority,
		Estimate: issue.Estimate, ProjectSlug: issue.ProjectSlug, Labels: labels,
		FirstDueDate: in.FirstDueDate, Interval: in.Interval, Unit: in.Unit,
		NextDueDate: in.FirstDueDate, Enabled: true,
	}
	if issue.ProjectID != nil {
		if project, ok := projectByID(m, *issue.ProjectID); ok {
			slug := project.Slug
			recurring.ProjectSlug = &slug
		}
	}
	err = writeRecurringIssue(path, recurring)
	s.mu.Unlock()
	if err != nil {
		return RecurringIssue{}, err
	}
	if err := s.ProcessDueRecurringIssues(); err != nil {
		return RecurringIssue{}, err
	}
	items, err := s.ListRecurringIssues()
	if err != nil {
		return RecurringIssue{}, err
	}
	for _, item := range items {
		if item.Slug == slug {
			return item, nil
		}
	}
	return RecurringIssue{}, ErrNotFound
}

func (s *Store) SetRecurringIssueEnabled(slug string, enabled bool) (RecurringIssue, error) {
	if issueTemplateSlug(slug) != slug || slug == "" {
		return RecurringIssue{}, validationf("invalid recurring issue identifier")
	}
	s.recurringMu.Lock()
	defer s.recurringMu.Unlock()
	s.mu.Lock()
	defer s.mu.Unlock()
	path := filepath.Join(s.root, "TEMPLATE", "RECURRING-"+slug+".md")
	recurring, err := readRecurringIssue(path)
	if os.IsNotExist(err) {
		return RecurringIssue{}, ErrNotFound
	}
	if err != nil {
		return RecurringIssue{}, err
	}
	recurring.Slug = slug
	recurring.Enabled = enabled
	if err := writeRecurringIssue(path, recurring); err != nil {
		return RecurringIssue{}, err
	}
	return recurring, nil
}

func (s *Store) DeleteRecurringIssue(slug string) error {
	if issueTemplateSlug(slug) != slug || slug == "" {
		return validationf("invalid recurring issue identifier")
	}
	s.recurringMu.Lock()
	defer s.recurringMu.Unlock()
	s.mu.Lock()
	defer s.mu.Unlock()
	err := os.Remove(filepath.Join(s.root, "TEMPLATE", "RECURRING-"+slug+".md"))
	if os.IsNotExist(err) {
		return ErrNotFound
	}
	return err
}

// ProcessDueRecurringIssues creates the next scheduled issue after the current
// instance's due date has passed. Issue frontmatter is checked before writes to
// recover safely if the app stopped between creating an issue and updating its
// schedule file.
func (s *Store) ProcessDueRecurringIssues() error {
	s.recurringMu.Lock()
	defer s.recurringMu.Unlock()
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
		Title: schedule.Title, Body: schedule.Body, Status: schedule.Status,
		Type: schedule.Type, Priority: schedule.Priority, Estimate: schedule.Estimate,
		ProjectID: projectID, DueDate: &dueDate, LabelIDs: labelIDs, RecurringSlug: &slug,
	})
}

func (s *Store) persistRecurringIssue(recurring RecurringIssue) error {
	s.mu.Lock()
	defer s.mu.Unlock()
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

func readRecurringIssue(path string) (RecurringIssue, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return RecurringIssue{}, err
	}
	block, body, err := splitFrontmatter(string(raw))
	if err != nil {
		return RecurringIssue{}, err
	}
	var fm recurringIssueFM
	if err := toml.Unmarshal([]byte(block), &fm); err != nil {
		return RecurringIssue{}, err
	}
	if strings.TrimSpace(fm.Name) == "" || strings.TrimSpace(fm.Title) == "" ||
		!validRecurringUnit(fm.Unit) || fm.Interval < 1 || fm.Interval > 365 {
		return RecurringIssue{}, validationf("invalid recurring issue metadata")
	}
	if _, err := time.Parse("2006-01-02", fm.FirstDueDate); err != nil {
		return RecurringIssue{}, validationf("invalid recurring issue first due date")
	}
	if _, err := time.Parse("2006-01-02", fm.NextDueDate); err != nil {
		return RecurringIssue{}, validationf("invalid recurring issue next due date")
	}
	if !validTemplateProperties(fm.Status, fm.Type, fm.Priority, fm.Estimate) {
		return RecurringIssue{}, validationf("recurring issue contains invalid issue properties")
	}
	return RecurringIssue{
		Name: fm.Name, Title: fm.Title, Body: body, Status: fm.Status,
		Type: fm.Type, Priority: fm.Priority, Estimate: fm.Estimate,
		ProjectSlug: fm.Project, Labels: append([]string{}, fm.Labels...),
		FirstDueDate: fm.FirstDueDate, Interval: fm.Interval, Unit: fm.Unit,
		NextDueDate: fm.NextDueDate, LastIssueIdentifier: fm.LastIssueIdentifier,
		Enabled: fm.Enabled,
	}, nil
}

func writeRecurringIssue(path string, recurring RecurringIssue) error {
	fm := recurringIssueFM{
		Name: recurring.Name, Title: recurring.Title, Status: recurring.Status,
		Type: recurring.Type, Priority: recurring.Priority, Estimate: recurring.Estimate,
		Project: recurring.ProjectSlug, Labels: recurring.Labels,
		FirstDueDate: recurring.FirstDueDate, Interval: recurring.Interval,
		Unit: recurring.Unit, NextDueDate: recurring.NextDueDate,
		LastIssueIdentifier: recurring.LastIssueIdentifier, Enabled: recurring.Enabled,
	}
	if !validRecurringUnit(fm.Unit) || fm.Interval < 1 || fm.Interval > 365 ||
		!validTemplateProperties(fm.Status, fm.Type, fm.Priority, fm.Estimate) {
		return validationf("invalid recurring issue")
	}
	metadata, err := toml.Marshal(fm)
	if err != nil {
		return err
	}
	content := append([]byte("+++\n"), metadata...)
	content = append(content, []byte("+++\n\n")...)
	content = append(content, []byte(recurring.Body)...)
	if len(recurring.Body) > 0 && !strings.HasSuffix(recurring.Body, "\n") {
		content = append(content, '\n')
	}
	return atomicWrite(path, content)
}
