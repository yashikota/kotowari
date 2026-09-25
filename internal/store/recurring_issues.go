package store

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pelletier/go-toml/v2"
	"github.com/yashikota/kotowari/internal/domain"
)

// RecurringIssue describes a single-user local schedule. Each generated issue
// remains an ordinary Markdown issue and records the schedule slug in its
// frontmatter so missed runs can recover without creating duplicates.
type RecurringIssue struct {
	Slug                string                 `json:"slug"`
	Name                string                 `json:"name"`
	Title               string                 `json:"title"`
	Body                string                 `json:"body"`
	Status              string                 `json:"status"`
	Assignee            string                 `json:"assignee,omitempty"`
	Type                string                 `json:"type,omitempty"`
	Priority            int                    `json:"priority"`
	Estimate            *int                   `json:"estimate,omitempty"`
	ProjectSlug         *string                `json:"projectSlug,omitempty"`
	Labels              []string               `json:"labels"`
	Links               []CreateIssueLinkInput `json:"links,omitempty"`
	FirstDueDate        string                 `json:"firstDueDate"`
	Interval            int                    `json:"interval"`
	Unit                string                 `json:"unit"`
	NextDueDate         string                 `json:"nextDueDate"`
	LastIssueIdentifier string                 `json:"lastIssueIdentifier,omitempty"`
	Enabled             bool                   `json:"enabled"`
}

type recurringIssueFM struct {
	Name                string                 `toml:"name"`
	Title               string                 `toml:"title"`
	Status              string                 `toml:"status"`
	Assignee            string                 `toml:"assignee,omitempty"`
	Type                string                 `toml:"type,omitempty"`
	Priority            int                    `toml:"priority"`
	Estimate            *int                   `toml:"estimate,omitempty"`
	Project             *string                `toml:"project,omitempty"`
	Labels              []string               `toml:"labels,omitempty"`
	Links               []CreateIssueLinkInput `toml:"links,omitempty"`
	FirstDueDate        string                 `toml:"first_due_date"`
	Interval            int                    `toml:"interval"`
	Unit                string                 `toml:"unit"`
	NextDueDate         string                 `toml:"next_due_date"`
	LastIssueIdentifier string                 `toml:"last_issue,omitempty"`
	Enabled             bool                   `toml:"enabled"`
}

type CreateRecurringIssueInput struct {
	Name         string `json:"name"`
	FirstDueDate string `json:"firstDueDate"`
	Interval     int    `json:"interval"`
	Unit         string `json:"unit"`
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
	var slug string
	var err error
	in, slug, err = normalizeCreateRecurringIssueInput(in)
	if err != nil {
		return RecurringIssue{}, err
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
		Status: "backlog", Assignee: issue.Assignee, Type: issue.Type, Priority: issue.Priority,
		Estimate: issue.Estimate, ProjectSlug: issue.ProjectSlug, Labels: labels,
		Links:        issueLinksForRecurring(issue.ExternalLinks),
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

// CreateRecurringIssueFromInput creates the first due instance directly from a
// new issue form. Unlike converting an existing issue, it does not leave a
// separate seed issue behind.
func (s *Store) CreateRecurringIssueFromInput(issueInput CreateIssueInput, in CreateRecurringIssueInput) (RecurringIssue, error) {
	issueInput.Title = strings.TrimSpace(issueInput.Title)
	if issueInput.Title == "" {
		return RecurringIssue{}, validationf("title required")
	}
	if issueInput.Status == "" {
		issueInput.Status = "backlog"
	}
	if !domain.ValidIssueStatus(issueInput.Status) {
		return RecurringIssue{}, validationf("invalid status")
	}
	if !domain.ValidPriority(issueInput.Priority) {
		return RecurringIssue{}, validationf("invalid priority")
	}
	if !domain.ValidIssueType(issueInput.Type) {
		return RecurringIssue{}, validationf("invalid issue type")
	}
	if !domain.ValidEstimate(issueInput.Estimate) {
		return RecurringIssue{}, validationf("invalid estimate")
	}
	if !domain.ValidIssueAssignee(issueInput.Assignee) {
		return RecurringIssue{}, validationf("invalid issue assignee")
	}

	normalizedLinks, err := normalizeIssueLinks(issueInput.ExternalLinks)
	if err != nil {
		return RecurringIssue{}, err
	}
	issueInput.ExternalLinks = normalizedLinks
	if in.Name == "" {
		in.Name = issueInput.Title
	}
	var slug string
	in, slug, err = uniqueRecurringIssueInput(s.root, in)
	if err != nil {
		return RecurringIssue{}, err
	}
	if strings.TrimSpace(issueInput.Body) == "" {
		issueInput.Body = templateBody(s.root, "ISSUE.md", "")
	}

	var recurring RecurringIssue
	err = s.snapshot(func(m *mem) error {
		workflowStatus, ok := resolveIssueWorkflowStatus(m.Workspace, issueInput.Status, issueInput.WorkflowStatus)
		if !ok {
			return validationf("invalid workflow status")
		}
		recurring = RecurringIssue{
			Slug: slug, Name: in.Name, Title: issueInput.Title, Body: issueInput.Body,
			Status: workflowStatus.Category, Assignee: issueInput.Assignee, Type: issueInput.Type, Priority: issueInput.Priority,
			Estimate: issueInput.Estimate, Labels: []string{}, Links: issueLinksForRecurringInput(issueInput.ExternalLinks),
			FirstDueDate: in.FirstDueDate, Interval: in.Interval, Unit: in.Unit,
			NextDueDate: in.FirstDueDate, Enabled: true,
		}
		if issueInput.ProjectID != nil {
			project, ok := projectByID(m, *issueInput.ProjectID)
			if !ok {
				return validationf("project not found")
			}
			projectSlug := project.Slug
			recurring.ProjectSlug = &projectSlug
		}
		if issueInput.MilestoneID != nil {
			project, _, ok := milestoneByID(m, *issueInput.MilestoneID)
			if !ok || (issueInput.ProjectID != nil && *issueInput.ProjectID != project.ID) {
				return validationf("milestone must belong to the issue project")
			}
			if recurring.ProjectSlug == nil {
				projectSlug := project.Slug
				recurring.ProjectSlug = &projectSlug
			}
		}
		if issueInput.CycleID != nil {
			if _, ok := cycleByID(m, *issueInput.CycleID); !ok {
				return validationf("cycle not found")
			}
		}
		if err := checkIssueParent(m, 0, issueInput.ParentID); err != nil {
			return err
		}
		for _, labelID := range issueInput.LabelIDs {
			if label, ok := labelByID(m, labelID); ok {
				recurring.Labels = append(recurring.Labels, label.Name)
			}
		}
		return nil
	})
	if err != nil {
		return RecurringIssue{}, err
	}

	path := filepath.Join(s.root, "TEMPLATE", "RECURRING-"+slug+".md")
	s.mu.Lock()
	if _, err := os.Stat(path); err == nil {
		s.mu.Unlock()
		return RecurringIssue{}, errf(ErrConflict, "recurring issue name already exists")
	} else if !os.IsNotExist(err) {
		s.mu.Unlock()
		return RecurringIssue{}, err
	}
	err = writeRecurringIssue(path, recurring)
	s.mu.Unlock()
	if err != nil {
		return RecurringIssue{}, err
	}
	if err := s.ProcessDueRecurringIssues(); err != nil {
		return RecurringIssue{}, err
	}
	if issueInput.WorkflowStatus != "" || issueInput.CycleID != nil || issueInput.ParentID != nil || issueInput.MilestoneID != nil {
		issues, err := s.ListIssues(IssueFilter{})
		if err != nil {
			return RecurringIssue{}, err
		}
		firstInstance := findRecurringInstance(issues, slug, in.FirstDueDate)
		if firstInstance == nil {
			return RecurringIssue{}, ErrNotFound
		}
		patch := PatchIssueInput{
			CycleID: &issueInput.CycleID, ParentID: &issueInput.ParentID, MilestoneID: &issueInput.MilestoneID,
		}
		if issueInput.WorkflowStatus != "" {
			patch.WorkflowStatus = &issueInput.WorkflowStatus
		}
		if _, err := s.UpdateIssue(firstInstance.Identifier, patch); err != nil {
			return RecurringIssue{}, err
		}
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

func normalizeCreateRecurringIssueInput(in CreateRecurringIssueInput) (CreateRecurringIssueInput, string, error) {
	in.Name = strings.TrimSpace(in.Name)
	slug := issueTemplateSlug(in.Name)
	if in.Name == "" || slug == "" || len([]rune(in.Name)) > 100 {
		return CreateRecurringIssueInput{}, "", validationf("recurring issue name must contain 1 to 100 characters")
	}
	if in.Interval < 1 || in.Interval > 365 || !validRecurringUnit(in.Unit) {
		return CreateRecurringIssueInput{}, "", validationf("invalid recurring interval")
	}
	if _, err := time.Parse("2006-01-02", in.FirstDueDate); err != nil {
		return CreateRecurringIssueInput{}, "", validationf("first due date must use YYYY-MM-DD")
	}
	return in, slug, nil
}

func uniqueRecurringIssueInput(root string, in CreateRecurringIssueInput) (CreateRecurringIssueInput, string, error) {
	base := []rune(strings.TrimSpace(in.Name))
	if len(base) > 100 {
		base = base[:100]
	}
	for suffix := 1; ; suffix++ {
		name := string(base)
		if suffix > 1 {
			ending := fmt.Sprintf(" (%d)", suffix)
			available := 100 - len([]rune(ending))
			candidate := base
			if len(candidate) > available {
				candidate = candidate[:available]
			}
			name = strings.TrimSpace(string(candidate)) + ending
		}
		candidateInput := in
		candidateInput.Name = name
		candidateInput, slug, err := normalizeCreateRecurringIssueInput(candidateInput)
		if err != nil {
			return CreateRecurringIssueInput{}, "", err
		}
		_, err = os.Stat(filepath.Join(root, "TEMPLATE", "RECURRING-"+slug+".md"))
		if os.IsNotExist(err) {
			return candidateInput, slug, nil
		}
		if err != nil {
			return CreateRecurringIssueInput{}, "", err
		}
	}
}

func issueLinksForRecurring(links []IssueLink) []CreateIssueLinkInput {
	inputs := make([]CreateIssueLinkInput, 0, len(links))
	for _, link := range links {
		inputs = append(inputs, CreateIssueLinkInput{URL: link.URL, Title: link.Title, Kind: link.Kind})
	}
	return inputs
}

func issueLinksForRecurringInput(links []CreateIssueLinkInput) []CreateIssueLinkInput {
	inputs := make([]CreateIssueLinkInput, len(links))
	copy(inputs, links)
	return inputs
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
		Title: schedule.Title, Body: schedule.Body, Status: schedule.Status, Assignee: schedule.Assignee,
		Type: schedule.Type, Priority: schedule.Priority, Estimate: schedule.Estimate,
		ProjectID: projectID, DueDate: &dueDate, LabelIDs: labelIDs, RecurringSlug: &slug, ExternalLinks: schedule.Links,
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
	if !validTemplateProperties(fm.Status, fm.Type, fm.Priority, fm.Estimate) ||
		!domain.ValidIssueAssignee(fm.Assignee) {
		return RecurringIssue{}, validationf("recurring issue contains invalid issue properties")
	}
	links, err := normalizeIssueLinks(fm.Links)
	if err != nil {
		return RecurringIssue{}, err
	}
	return RecurringIssue{
		Name: fm.Name, Title: fm.Title, Body: body, Status: fm.Status, Assignee: fm.Assignee,
		Type: fm.Type, Priority: fm.Priority, Estimate: fm.Estimate,
		ProjectSlug: fm.Project, Labels: append([]string{}, fm.Labels...),
		Links:        links,
		FirstDueDate: fm.FirstDueDate, Interval: fm.Interval, Unit: fm.Unit,
		NextDueDate: fm.NextDueDate, LastIssueIdentifier: fm.LastIssueIdentifier,
		Enabled: fm.Enabled,
	}, nil
}

func writeRecurringIssue(path string, recurring RecurringIssue) error {
	links, err := normalizeIssueLinks(recurring.Links)
	if err != nil {
		return err
	}
	fm := recurringIssueFM{
		Name: recurring.Name, Title: recurring.Title, Status: recurring.Status, Assignee: recurring.Assignee,
		Type: recurring.Type, Priority: recurring.Priority, Estimate: recurring.Estimate,
		Project: recurring.ProjectSlug, Labels: recurring.Labels, Links: links,
		FirstDueDate: recurring.FirstDueDate, Interval: recurring.Interval,
		Unit: recurring.Unit, NextDueDate: recurring.NextDueDate,
		LastIssueIdentifier: recurring.LastIssueIdentifier, Enabled: recurring.Enabled,
	}
	if !validRecurringUnit(fm.Unit) || fm.Interval < 1 || fm.Interval > 365 ||
		!validTemplateProperties(fm.Status, fm.Type, fm.Priority, fm.Estimate) ||
		!domain.ValidIssueAssignee(fm.Assignee) {
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
