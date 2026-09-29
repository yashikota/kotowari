package store

import (
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) AddProjectDependency(projectSlug string, in CreateProjectDependencyInput) (Project, error) {
	projectSlug = strings.TrimSpace(projectSlug)
	dependencySlug := strings.TrimSpace(in.ProjectSlug)
	kind := in.Kind
	if kind != "blocks" && kind != "blocked_by" && kind != "related" {
		return Project{}, validationf("invalid project dependency kind")
	}
	if projectSlug == dependencySlug {
		return Project{}, validationf("a project cannot depend on itself")
	}
	var out Project
	err := s.mutate(func(m *mem) error {
		projectIndex := indexProject(m, projectSlug)
		dependencyIndex := indexProject(m, dependencySlug)
		if projectIndex < 0 || dependencyIndex < 0 {
			return ErrNotFound
		}
		project := m.Projects[projectIndex]
		dependency := m.Projects[dependencyIndex]
		for _, existing := range project.Dependencies {
			if existing.ProjectSlug == dependencySlug {
				return errf(ErrConflict, "project dependency already exists")
			}
		}
		blocker, blocked := projectSlug, dependencySlug
		if kind == "blocked_by" {
			blocker, blocked = dependencySlug, projectSlug
		}
		if kind != "related" && projectBlocksReachable(m, blocked, blocker) {
			return validationf("project dependency would create a blocking cycle")
		}
		inverseKind := inverseProjectDependencyKind(kind)
		now := domain.Now()
		project.Dependencies = append(project.Dependencies, ProjectDependency{ProjectSlug: dependencySlug, Kind: kind})
		dependency.Dependencies = append(dependency.Dependencies, ProjectDependency{ProjectSlug: projectSlug, Kind: inverseKind})
		project.UpdatedAt = now
		dependency.UpdatedAt = now
		m.Projects[projectIndex] = project
		m.Projects[dependencyIndex] = dependency
		addActivity(m, "project", project.ID, "dependency_added", map[string]any{"projectSlug": dependencySlug, "kind": kind}, now)
		m.bump(now)
		project.Progress = projectProgress(m, project.ID)
		out = project
		return nil
	})
	return out, err
}

func inverseProjectDependencyKind(kind string) string {
	switch kind {
	case "blocks":
		return "blocked_by"
	case "blocked_by":
		return "blocks"
	default:
		return kind
	}
}

func projectBlocksReachable(m *mem, fromSlug, targetSlug string) bool {
	queue := []string{fromSlug}
	visited := map[string]struct{}{fromSlug: {}}
	for len(queue) > 0 {
		currentSlug := queue[0]
		queue = queue[1:]
		if currentSlug == targetSlug {
			return true
		}
		index := indexProject(m, currentSlug)
		if index < 0 {
			continue
		}
		for _, dependency := range m.Projects[index].Dependencies {
			if dependency.Kind != "blocks" {
				continue
			}
			if _, seen := visited[dependency.ProjectSlug]; seen {
				continue
			}
			visited[dependency.ProjectSlug] = struct{}{}
			queue = append(queue, dependency.ProjectSlug)
		}
	}
	return false
}

func (s *Store) DeleteProjectDependency(projectSlug, dependencySlug string) (Project, error) {
	var out Project
	err := s.mutate(func(m *mem) error {
		projectIndex := indexProject(m, projectSlug)
		dependencyIndex := indexProject(m, dependencySlug)
		if projectIndex < 0 || dependencyIndex < 0 {
			return ErrNotFound
		}
		project := m.Projects[projectIndex]
		dependency := m.Projects[dependencyIndex]
		found := false
		project.Dependencies = removeProjectDependency(project.Dependencies, dependencySlug, &found)
		if !found {
			return ErrNotFound
		}
		dependency.Dependencies = removeProjectDependency(dependency.Dependencies, projectSlug, nil)
		now := domain.Now()
		project.UpdatedAt = now
		dependency.UpdatedAt = now
		m.Projects[projectIndex] = project
		m.Projects[dependencyIndex] = dependency
		addActivity(m, "project", project.ID, "dependency_removed", map[string]any{"projectSlug": dependencySlug}, now)
		m.bump(now)
		project.Progress = projectProgress(m, project.ID)
		out = project
		return nil
	})
	return out, err
}

func removeProjectDependency(dependencies []ProjectDependency, slug string, found *bool) []ProjectDependency {
	filtered := make([]ProjectDependency, 0, len(dependencies))
	for _, dependency := range dependencies {
		if dependency.ProjectSlug == slug {
			if found != nil {
				*found = true
			}
			continue
		}
		filtered = append(filtered, dependency)
	}
	return filtered
}
