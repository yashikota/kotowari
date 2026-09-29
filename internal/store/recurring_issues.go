package store

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

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
	if err := s.createRecurringIssueFromIssue(identifier, in, slug); err != nil {
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

func (s *Store) createRecurringIssueFromIssue(identifier string, in CreateRecurringIssueInput, slug string) error {
	s.state.mu.Lock()
	defer s.state.mu.Unlock()

	m, err := load(s.root)
	if err != nil {
		return err
	}
	issue, ok := issueByIdent(m, identifier)
	if !ok {
		return ErrNotFound
	}
	if err := ensureIssueActive(issue); err != nil {
		return err
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
			projectSlug := project.Slug
			recurring.ProjectSlug = &projectSlug
		}
	}
	path := filepath.Join(s.root, "TEMPLATE", "RECURRING-"+slug+".md")
	return createTemplateFile(path, "recurring issue name already exists", func() error {
		return writeRecurringIssue(path, recurring)
	})
}

func (s *Store) createUniqueRecurringIssueFile(in CreateRecurringIssueInput, recurring RecurringIssue) (CreateRecurringIssueInput, string, error) {
	s.state.mu.Lock()
	defer s.state.mu.Unlock()

	in, slug, err := uniqueRecurringIssueInput(s.root, in)
	if err != nil {
		return CreateRecurringIssueInput{}, "", err
	}
	recurring.Slug = slug
	recurring.Name = in.Name
	path := filepath.Join(s.root, "TEMPLATE", "RECURRING-"+slug+".md")
	if err := createTemplateFile(path, "recurring issue name already exists", func() error {
		return writeRecurringIssue(path, recurring)
	}); err != nil {
		return CreateRecurringIssueInput{}, "", err
	}
	return in, slug, nil
}

func (s *Store) SetRecurringIssueEnabled(slug string, in SetRecurringIssueEnabledInput) (RecurringIssue, error) {
	if issueTemplateSlug(slug) != slug || slug == "" {
		return RecurringIssue{}, validationf("invalid recurring issue identifier")
	}
	if in.Enabled == nil {
		return RecurringIssue{}, validationf("enabled is required")
	}
	s.state.recurringMu.Lock()
	defer s.state.recurringMu.Unlock()
	s.state.mu.Lock()
	defer s.state.mu.Unlock()
	path := filepath.Join(s.root, "TEMPLATE", "RECURRING-"+slug+".md")
	recurring, err := readRecurringIssue(path)
	if os.IsNotExist(err) {
		return RecurringIssue{}, ErrNotFound
	}
	if err != nil {
		return RecurringIssue{}, err
	}
	recurring.Slug = slug
	recurring.Enabled = *in.Enabled
	if err := writeRecurringIssue(path, recurring); err != nil {
		return RecurringIssue{}, err
	}
	return recurring, nil
}

func (s *Store) DeleteRecurringIssue(slug string) error {
	if issueTemplateSlug(slug) != slug || slug == "" {
		return validationf("invalid recurring issue identifier")
	}
	s.state.recurringMu.Lock()
	defer s.state.recurringMu.Unlock()
	s.state.mu.Lock()
	defer s.state.mu.Unlock()
	err := os.Remove(filepath.Join(s.root, "TEMPLATE", "RECURRING-"+slug+".md"))
	if os.IsNotExist(err) {
		return ErrNotFound
	}
	return err
}
