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
