package store

import (
	"sort"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func normalizeInitiative(m *mem, initiative Initiative) Initiative {
	initiative.ProjectSlugs = make([]string, 0)
	for _, project := range m.Projects {
		if containsString(project.InitiativeSlugs, initiative.Slug) {
			initiative.ProjectSlugs = append(initiative.ProjectSlugs, project.Slug)
		}
	}
	sort.Strings(initiative.ProjectSlugs)
	return initiative
}

func replaceInitiativeProjects(m *mem, initiative Initiative, requested []string) error {
	desired := make(map[string]struct{}, len(requested))
	for _, slug := range requested {
		slug = strings.TrimSpace(slug)
		if !domain.ValidSlug(slug) {
			return validationf("invalid project slug in initiative")
		}
		if _, exists := desired[slug]; exists {
			return errf(ErrConflict, "project already listed in initiative")
		}
		if indexProject(m, slug) < 0 {
			return ErrNotFound
		}
		desired[slug] = struct{}{}
	}
	now := domain.Now()
	for i, project := range m.Projects {
		wasLinked := containsString(project.InitiativeSlugs, initiative.Slug)
		_, shouldLink := desired[project.Slug]
		if wasLinked == shouldLink {
			continue
		}
		if shouldLink {
			project.InitiativeSlugs = append(project.InitiativeSlugs, initiative.Slug)
			sort.Strings(project.InitiativeSlugs)
			addActivity(m, "project", project.ID, "initiative_added", map[string]any{"initiativeSlug": initiative.Slug}, now)
		} else {
			project.InitiativeSlugs = removeString(project.InitiativeSlugs, initiative.Slug)
			addActivity(m, "project", project.ID, "initiative_removed", map[string]any{"initiativeSlug": initiative.Slug}, now)
		}
		project.UpdatedAt = now
		m.Projects[i] = project
	}
	return nil
}

func initiativeIndex(m *mem, slug string) int {
	for i := range m.Initiatives {
		if m.Initiatives[i].Slug == slug {
			return i
		}
	}
	return -1
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func removeString(values []string, target string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if value != target {
			result = append(result, value)
		}
	}
	return result
}
