package store

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"unicode"

	"github.com/pelletier/go-toml/v2"
	"github.com/yashikota/kotowari/internal/domain"
)

type issueTemplateFM struct {
	Name     string   `toml:"name"`
	Title    string   `toml:"title"`
	Status   string   `toml:"status"`
	Assignee string   `toml:"assignee,omitempty"`
	Type     string   `toml:"type,omitempty"`
	Priority int      `toml:"priority"`
	Estimate *int     `toml:"estimate,omitempty"`
	Labels   []string `toml:"labels,omitempty"`
}

func validateIssueTemplateSlugs(slugs []string) error {
	if len(slugs) > 32 {
		return validationf("too many issue templates in filter")
	}
	for _, slug := range slugs {
		if slug != "no-template" && (slug == "" || issueTemplateSlug(slug) != slug) {
			return validationf("invalid issue template filter")
		}
	}
	return nil
}

func normalizeIssueTemplateSlugs(slugs []string) []string {
	seen := make(map[string]struct{}, len(slugs))
	out := make([]string, 0, len(slugs))
	for _, slug := range slugs {
		if _, ok := seen[slug]; ok {
			continue
		}
		seen[slug] = struct{}{}
		out = append(out, slug)
	}
	sort.Strings(out)
	return out
}

func matchesIssueTemplateSlugs(issue Issue, selected []string) bool {
	for _, slug := range selected {
		if slug == "no-template" && issue.TemplateSlug == "" ||
			slug != "no-template" && issue.TemplateSlug == slug {
			return true
		}
	}
	return false
}

func (s *Store) IssueTemplateFilterOptions() ([]IssueTemplateFilterOption, error) {
	templates, err := s.ListIssueTemplates()
	if err != nil {
		return nil, err
	}
	var out []IssueTemplateFilterOption
	err = s.snapshot(func(m *mem) error {
		counts := make(map[string]int)
		for _, issue := range m.Issues {
			if issue.ArchivedAt != nil {
				continue
			}
			id := issue.TemplateSlug
			if id == "" {
				id = "no-template"
			}
			counts[id]++
		}
		out = append(out, IssueTemplateFilterOption{
			ID: "no-template", Name: "No template", Count: counts["no-template"],
		})
		for _, template := range templates {
			out = append(out, IssueTemplateFilterOption{
				ID: template.Slug, Name: template.Name, Count: counts[template.Slug],
			})
		}
		sort.Slice(out, func(i, j int) bool {
			return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
		})
		return nil
	})
	return out, err
}

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
func (s *Store) CreateIssueTemplate(identifier, name string) (IssueTemplate, error) {
	name = strings.TrimSpace(name)
	slug := issueTemplateSlug(name)
	if name == "" || slug == "" || len([]rune(name)) > 100 {
		return IssueTemplate{}, validationf("template name must contain 1 to 100 characters")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
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
	if _, err := os.Stat(path); err == nil {
		return IssueTemplate{}, errf(ErrConflict, "template name already exists")
	} else if !os.IsNotExist(err) {
		return IssueTemplate{}, err
	}
	labels := make([]string, 0, len(issue.Labels))
	for _, label := range issue.Labels {
		labels = append(labels, label.Name)
	}
	template := IssueTemplate{
		Slug: slug, Name: name, Title: issue.Title, Body: issue.Body,
		Status: issue.Status, Assignee: issue.Assignee, Type: issue.Type, Priority: issue.Priority,
		Estimate: issue.Estimate, Labels: labels,
	}
	if err := writeIssueTemplate(path, template); err != nil {
		return IssueTemplate{}, err
	}
	return template, nil
}

func (s *Store) DeleteIssueTemplate(slug string) error {
	if issueTemplateSlug(slug) != slug || slug == "" {
		return validationf("invalid template identifier")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	err := os.Remove(filepath.Join(s.root, "TEMPLATE", "ISSUE-"+slug+".md"))
	if os.IsNotExist(err) {
		return ErrNotFound
	}
	return err
}

func issueTemplateSlug(name string) string {
	var out strings.Builder
	dash := false
	for _, r := range strings.ToLower(strings.TrimSpace(name)) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			if dash && out.Len() > 0 {
				out.WriteByte('-')
			}
			out.WriteRune(r)
			dash = false
			continue
		}
		if out.Len() > 0 {
			dash = true
		}
	}
	return strings.Trim(out.String(), "-")
}

func readIssueTemplate(path string) (IssueTemplate, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return IssueTemplate{}, err
	}
	block, body, err := splitFrontmatter(string(raw))
	if err != nil {
		return IssueTemplate{}, err
	}
	var fm issueTemplateFM
	if err := toml.Unmarshal([]byte(block), &fm); err != nil {
		return IssueTemplate{}, err
	}
	if strings.TrimSpace(fm.Name) == "" || strings.TrimSpace(fm.Title) == "" {
		return IssueTemplate{}, validationf("template name and title are required")
	}
	if fm.Status == "" {
		fm.Status = "todo"
	}
	if !validTemplateProperties(fm.Status, fm.Type, fm.Priority, fm.Estimate) ||
		!domain.ValidIssueAssignee(fm.Assignee) {
		return IssueTemplate{}, validationf("template contains invalid issue properties")
	}
	return IssueTemplate{
		Name: fm.Name, Title: fm.Title, Body: body, Status: fm.Status, Assignee: fm.Assignee,
		Type: fm.Type, Priority: fm.Priority, Estimate: fm.Estimate,
		Labels: append([]string{}, fm.Labels...),
	}, nil
}

func writeIssueTemplate(path string, template IssueTemplate) error {
	fm := issueTemplateFM{
		Name: template.Name, Title: template.Title, Status: template.Status, Assignee: template.Assignee,
		Type: template.Type, Priority: template.Priority,
		Estimate: template.Estimate, Labels: template.Labels,
	}
	if err := validateTemplateProperties(template); err != nil {
		return err
	}
	metadata, err := toml.Marshal(fm)
	if err != nil {
		return err
	}
	content := append([]byte("+++\n"), metadata...)
	content = append(content, []byte("+++\n\n")...)
	content = append(content, []byte(template.Body)...)
	if len(template.Body) > 0 && !strings.HasSuffix(template.Body, "\n") {
		content = append(content, '\n')
	}
	return atomicWrite(path, content)
}

func validTemplateProperties(status, issueType string, priority int, estimate *int) bool {
	return domain.ValidIssueStatus(status) && domain.ValidIssueType(issueType) &&
		domain.ValidPriority(priority) && domain.ValidEstimate(estimate)
}

func validateTemplateProperties(template IssueTemplate) error {
	if strings.TrimSpace(template.Name) == "" || strings.TrimSpace(template.Title) == "" ||
		!validTemplateProperties(template.Status, template.Type, template.Priority, template.Estimate) ||
		!domain.ValidIssueAssignee(template.Assignee) {
		return validationf("invalid issue template")
	}
	return nil
}
