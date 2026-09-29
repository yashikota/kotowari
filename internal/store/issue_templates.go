package store

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func (s *Store) ListIssueTemplates() ([]IssueTemplate, error) {
	var out []IssueTemplate
	err := s.snapshot(func(_ *mem) error {
		entries, err := os.ReadDir(filepath.Join(s.root, "TEMPLATE"))
		if err != nil && !os.IsNotExist(err) {
			return err
		}
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasPrefix(entry.Name(), "ISSUE-") || !strings.HasSuffix(entry.Name(), ".md") {
				continue
			}
			template, err := readIssueTemplate(filepath.Join(s.root, "TEMPLATE", entry.Name()))
			if err != nil {
				return fmt.Errorf("%s: %w", entry.Name(), err)
			}
			template.Slug = strings.TrimSuffix(strings.TrimPrefix(entry.Name(), "ISSUE-"), ".md")
			out = append(out, template)
		}
		return nil
	})
	if out == nil {
		out = []IssueTemplate{}
	}
	return out, err
}

// CreateIssueTemplate captures an issue as a reusable template without
// removing or changing the source issue.
func (s *Store) CreateIssueTemplate(identifier string, in CreateTemplateInput) (IssueTemplate, error) {
	name := strings.TrimSpace(in.Name)
	slug := issueTemplateSlug(name)
	if name == "" || slug == "" || len([]rune(name)) > 100 {
		return IssueTemplate{}, validationf("template name must contain 1 to 100 characters")
	}
	s.state.mu.Lock()
	defer s.state.mu.Unlock()
	m, err := load(s.root)
	if err != nil {
		return IssueTemplate{}, err
	}
	issue, ok := issueByIdent(m, identifier)
	if !ok {
		return IssueTemplate{}, ErrNotFound
	}
	if err := ensureIssueActive(issue); err != nil {
		return IssueTemplate{}, err
	}
	path := filepath.Join(s.root, "TEMPLATE", "ISSUE-"+slug+".md")
	labels := make([]string, 0, len(issue.Labels))
	for _, label := range issue.Labels {
		labels = append(labels, label.Name)
	}
	template := IssueTemplate{
		Slug: slug, Name: name, Title: issue.Title, Body: issue.Body,
		Status: issue.Status, Assignee: issue.Assignee, Type: issue.Type, Priority: issue.Priority,
		Estimate: issue.Estimate, Labels: labels,
	}
	if err := createTemplateFile(path, "template name already exists", func() error {
		return writeIssueTemplate(path, template)
	}); err != nil {
		return IssueTemplate{}, err
	}
	return template, nil
}

func (s *Store) DeleteIssueTemplate(slug string) error {
	if issueTemplateSlug(slug) != slug || slug == "" {
		return validationf("invalid template identifier")
	}
	s.state.mu.Lock()
	defer s.state.mu.Unlock()
	err := os.Remove(filepath.Join(s.root, "TEMPLATE", "ISSUE-"+slug+".md"))
	if os.IsNotExist(err) {
		return ErrNotFound
	}
	return err
}
