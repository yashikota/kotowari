package store

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/pelletier/go-toml/v2"
	"github.com/yashikota/kotowari/internal/domain"
)

// ProjectTemplate is a workspace-local project recipe stored under TEMPLATE/.
// Milestone dates and project relations are intentionally omitted: they are
// project-specific, while milestone names and descriptions are reusable.
type ProjectTemplate struct {
	Slug           string                     `json:"slug"`
	Name           string                     `json:"name"`
	Summary        string                     `json:"summary,omitempty"`
	Icon           string                     `json:"icon,omitempty"`
	IconColor      string                     `json:"iconColor,omitempty"`
	Description    string                     `json:"description"`
	Status         string                     `json:"status"`
	WorkflowStatus string                     `json:"workflowStatus,omitempty"`
	Lead           string                     `json:"lead,omitempty"`
	Priority       int                        `json:"priority"`
	Labels         []string                   `json:"labels"`
	Milestones     []ProjectTemplateMilestone `json:"milestones"`
}

type ProjectTemplateMilestone struct {
	Name        string `json:"name" toml:"name"`
	Description string `json:"description,omitempty" toml:"description,omitempty"`
}

type projectTemplateFM struct {
	Name           string                     `toml:"name"`
	Summary        string                     `toml:"summary,omitempty"`
	Icon           string                     `toml:"icon,omitempty"`
	IconColor      string                     `toml:"icon_color,omitempty"`
	Status         string                     `toml:"status"`
	WorkflowStatus string                     `toml:"workflow_status,omitempty"`
	Lead           string                     `toml:"lead,omitempty"`
	Priority       int                        `toml:"priority"`
	Labels         []string                   `toml:"labels,omitempty"`
	Milestones     []ProjectTemplateMilestone `toml:"milestones,omitempty"`
}

func (s *Store) ListProjectTemplates() ([]ProjectTemplate, error) {
	var out []ProjectTemplate
	err := s.snapshot(func(_ *mem) error {
		entries, err := os.ReadDir(filepath.Join(s.root, "TEMPLATE"))
		if err != nil && !os.IsNotExist(err) {
			return err
		}
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasPrefix(entry.Name(), "PROJECT-") || !strings.HasSuffix(entry.Name(), ".md") {
				continue
			}
			template, err := readProjectTemplate(filepath.Join(s.root, "TEMPLATE", entry.Name()))
			if err != nil {
				return fmt.Errorf("%s: %w", entry.Name(), err)
			}
			template.Slug = strings.TrimSuffix(strings.TrimPrefix(entry.Name(), "PROJECT-"), ".md")
			out = append(out, template)
		}
		return nil
	})
	if out == nil {
		out = []ProjectTemplate{}
	}
	return out, err
}

// CreateProjectTemplate captures reusable project properties without changing
// the source project. Dates and dependency links are intentionally not copied.
func (s *Store) CreateProjectTemplate(projectSlug, name string) (ProjectTemplate, error) {
	name = strings.TrimSpace(name)
	slug := issueTemplateSlug(name)
	if name == "" || slug == "" || len([]rune(name)) > 100 {
		return ProjectTemplate{}, validationf("template name must contain 1 to 100 characters")
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	m, err := load(s.root)
	if err != nil {
		return ProjectTemplate{}, err
	}
	project, ok := projectBySlug(m, projectSlug)
	if !ok {
		return ProjectTemplate{}, ErrNotFound
	}
	path := filepath.Join(s.root, "TEMPLATE", "PROJECT-"+slug+".md")
	if _, err := os.Stat(path); err == nil {
		return ProjectTemplate{}, errf(ErrConflict, "template name already exists")
	} else if !os.IsNotExist(err) {
		return ProjectTemplate{}, err
	}
	milestones := make([]ProjectTemplateMilestone, 0, len(project.Milestones))
	for _, milestone := range project.Milestones {
		milestones = append(milestones, ProjectTemplateMilestone{
			Name: milestone.Name, Description: milestone.Description,
		})
	}
	template := ProjectTemplate{
		Slug: slug, Name: name, Summary: project.Summary, Icon: project.Icon,
		IconColor: project.IconColor, Description: project.Description,
		Status: project.Status, WorkflowStatus: project.WorkflowStatus,
		Lead:     project.Lead,
		Priority: project.Priority, Labels: append([]string{}, project.Labels...),
		Milestones: milestones,
	}
	if err := writeProjectTemplate(path, template); err != nil {
		return ProjectTemplate{}, err
	}
	return template, nil
}

func (s *Store) DeleteProjectTemplate(slug string) error {
	if issueTemplateSlug(slug) != slug || slug == "" {
		return validationf("invalid template identifier")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	err := os.Remove(filepath.Join(s.root, "TEMPLATE", "PROJECT-"+slug+".md"))
	if os.IsNotExist(err) {
		return ErrNotFound
	}
	return err
}

func readProjectTemplate(path string) (ProjectTemplate, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return ProjectTemplate{}, err
	}
	block, body, err := splitFrontmatter(string(raw))
	if err != nil {
		return ProjectTemplate{}, err
	}
	var fm projectTemplateFM
	if err := toml.Unmarshal([]byte(block), &fm); err != nil {
		return ProjectTemplate{}, err
	}
	if strings.TrimSpace(fm.Name) == "" || !domain.ValidProjectStatus(fm.Status) || !domain.ValidPriority(fm.Priority) || !validProjectLead(fm.Lead) ||
		!validProjectIcon(fm.Icon) || !validProjectIconColor(fm.IconColor) {
		return ProjectTemplate{}, validationf("invalid project template")
	}
	for _, milestone := range fm.Milestones {
		if strings.TrimSpace(milestone.Name) == "" {
			return ProjectTemplate{}, validationf("project template milestone name required")
		}
	}
	return ProjectTemplate{
		Name: fm.Name, Summary: fm.Summary, Icon: fm.Icon, IconColor: fm.IconColor,
		Description: body, Status: fm.Status, WorkflowStatus: fm.WorkflowStatus,
		Lead:     fm.Lead,
		Priority: fm.Priority, Labels: append([]string{}, fm.Labels...),
		Milestones: append([]ProjectTemplateMilestone{}, fm.Milestones...),
	}, nil
}

func writeProjectTemplate(path string, template ProjectTemplate) error {
	if strings.TrimSpace(template.Name) == "" || !domain.ValidProjectStatus(template.Status) || !domain.ValidPriority(template.Priority) || !validProjectLead(template.Lead) ||
		!validProjectIcon(template.Icon) || !validProjectIconColor(template.IconColor) {
		return validationf("invalid project template")
	}
	for _, milestone := range template.Milestones {
		if strings.TrimSpace(milestone.Name) == "" {
			return validationf("project template milestone name required")
		}
	}
	fm := projectTemplateFM{
		Name: template.Name, Summary: template.Summary, Icon: template.Icon,
		IconColor: template.IconColor, Status: template.Status,
		WorkflowStatus: template.WorkflowStatus, Lead: template.Lead, Priority: template.Priority,
		Labels: template.Labels, Milestones: template.Milestones,
	}
	metadata, err := toml.Marshal(fm)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	content := append([]byte("+++\n"), metadata...)
	content = append(content, []byte("+++\n\n")...)
	content = append(content, []byte(template.Description)...)
	return atomicWrite(path, content)
}
