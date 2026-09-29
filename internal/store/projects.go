package store

import (
	"strings"
	"unicode/utf8"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) ListProjects() ([]Project, error) {
	return s.listProjects(nil)
}

func (s *Store) ListProjectsByArchived(archived bool) ([]Project, error) {
	return s.listProjects(&archived)
}

func (s *Store) listProjects(archived *bool) ([]Project, error) {
	out := []Project{}
	err := s.snapshot(func(m *mem) error {
		for _, project := range m.Projects {
			if archived != nil && (*archived != (project.ArchivedAt != nil)) {
				continue
			}
			out = append(out, project)
		}
		for i := range out {
			out[i] = normalizeProjectWorkflowStatus(out[i], m.Workspace)
			out[i].Progress = projectProgress(m, out[i].ID)
			if out[i].Labels == nil {
				out[i].Labels = []string{}
			}
			if out[i].Dependencies == nil {
				out[i].Dependencies = []ProjectDependency{}
			}
		}
		return nil
	})
	return out, err
}

func (s *Store) SetProjectArchived(slug string, archived bool) (Project, error) {
	var out Project
	err := s.mutate(func(m *mem) error {
		index := indexProject(m, slug)
		if index < 0 {
			return ErrNotFound
		}
		project := m.Projects[index]
		if archived == (project.ArchivedAt != nil) {
			out = normalizeProjectWorkflowStatus(project, m.Workspace)
			out.Progress = projectProgress(m, project.ID)
			return nil
		}
		now := domain.Now()
		if archived {
			project.ArchivedAt = &now
		} else {
			project.ArchivedAt = nil
		}
		project.UpdatedAt = now
		m.Projects[index] = project
		action := "archived"
		if !archived {
			action = "unarchived"
		}
		addActivity(m, "project", project.ID, action, map[string]any{}, now)
		m.bump(now)
		out = normalizeProjectWorkflowStatus(project, m.Workspace)
		out.Progress = projectProgress(m, project.ID)
		return nil
	})
	return out, err
}

func (s *Store) GetProject(slug string) (Project, error) {
	var p Project
	err := s.snapshot(func(m *mem) error {
		got, ok := projectBySlug(m, slug)
		if !ok {
			return ErrNotFound
		}
		got = normalizeProjectWorkflowStatus(got, m.Workspace)
		got.Progress = projectProgress(m, got.ID)
		if got.Labels == nil {
			got.Labels = []string{}
		}
		if got.Dependencies == nil {
			got.Dependencies = []ProjectDependency{}
		}
		p = got
		return nil
	})
	return p, err
}

// UpdateProjectFavorite changes the personal favorite state without changing
// the project's content update timestamp.
func (s *Store) UpdateProjectFavorite(slug string, favorite bool) (Project, error) {
	var out Project
	err := s.mutate(func(m *mem) error {
		i := indexProject(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		m.Projects[i].IsFavorite = favorite
		out = m.Projects[i]
		return nil
	})
	return out, err
}

func (s *Store) PostProjectUpdate(slug, health, body string) (Activity, error) {
	health = strings.TrimSpace(health)
	body = strings.TrimSpace(body)
	if !domain.ValidProjectHealth(health) {
		return Activity{}, validationf("invalid project health")
	}
	if body == "" || utf8.RuneCountInString(body) > 10000 {
		return Activity{}, validationf("project update body must contain 1 to 10000 characters")
	}
	now := domain.Now()
	var out Activity
	err := s.mutate(func(m *mem) error {
		i := indexProject(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		project := m.Projects[i]
		project.Health = health
		project.HealthUpdatedAt = &now
		project.UpdatedAt = now
		m.Projects[i] = project
		addActivity(m, "project", project.ID, "status_update_posted", map[string]any{
			"health": health,
			"body":   body,
		}, now)
		out = m.Activities[len(m.Activities)-1]
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) DeleteProject(slug string) error {
	return s.mutate(func(m *mem) error {
		i := indexProject(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		id := m.Projects[i].ID
		m.Projects = append(m.Projects[:i], m.Projects[i+1:]...)
		now := domain.Now()
		for j := range m.Projects {
			m.Projects[j].Dependencies = removeProjectDependency(m.Projects[j].Dependencies, slug, nil)
		}
		for j := range m.ADRs {
			if m.ADRs[j].ProjectSlug != nil && *m.ADRs[j].ProjectSlug == slug {
				m.ADRs[j].ProjectSlug = nil
			}
		}
		for j := range m.Pages {
			if m.Pages[j].ProjectSlug != nil && *m.Pages[j].ProjectSlug == slug {
				m.Pages[j].ProjectSlug = nil
				m.Pages[j].ProjectID = nil
			}
		}
		for j := range m.Issues {
			if m.Issues[j].ProjectID != nil && *m.Issues[j].ProjectID == id {
				m.Issues[j].ProjectID = nil
				m.Issues[j].ProjectSlug = nil
				m.Issues[j].MilestoneID = nil
				m.Issues[j].MilestoneName = nil
			}
		}
		m.bump(now)
		return nil
	})
}
