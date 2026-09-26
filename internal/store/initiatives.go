package store

import (
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/yashikota/kotowari/internal/domain"
)

func validInitiativeStatus(status string) bool {
	switch status {
	case "planned", "active", "completed", "canceled":
		return true
	default:
		return false
	}
}

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

func (s *Store) ListInitiatives() ([]Initiative, error) {
	var out []Initiative
	err := s.snapshot(func(m *mem) error {
		out = make([]Initiative, 0, len(m.Initiatives))
		for _, initiative := range m.Initiatives {
			out = append(out, normalizeInitiative(m, initiative))
		}
		return nil
	})
	return out, err
}

func (s *Store) GetInitiative(slug string) (Initiative, error) {
	var out Initiative
	err := s.snapshot(func(m *mem) error {
		for _, initiative := range m.Initiatives {
			if initiative.Slug == slug {
				out = normalizeInitiative(m, initiative)
				return nil
			}
		}
		return ErrNotFound
	})
	return out, err
}

func (s *Store) CreateInitiative(name, slug, description, status, color string, start, target *string) (Initiative, error) {
	return s.CreateInitiativeWithProjects(name, slug, description, status, color, start, target, nil)
}

func (s *Store) CreateInitiativeWithProjects(name, slug, description, status, color string, start, target *string, projectSlugs []string) (Initiative, error) {
	return s.CreateInitiativeWithOptions(name, slug, description, status, color, start, target, projectSlugs, "", 0, nil)
}

func (s *Store) CreateInitiativeWithOptions(name, slug, description, status, color string, start, target *string, projectSlugs []string, health string, priority int, labels []string) (Initiative, error) {
	name = strings.TrimSpace(name)
	slug = strings.TrimSpace(slug)
	description = strings.TrimSpace(description)
	if name == "" || utf8.RuneCountInString(name) > 120 {
		return Initiative{}, validationf("initiative name must contain 1 to 120 characters")
	}
	if !domain.ValidSlug(slug) {
		return Initiative{}, validationf("invalid slug")
	}
	if status == "" {
		status = "planned"
	}
	if !validInitiativeStatus(status) {
		return Initiative{}, validationf("invalid initiative status")
	}
	if !validProjectIconColor(color) {
		return Initiative{}, validationf("invalid initiative color")
	}
	if !domain.ValidProjectHealth(health) {
		return Initiative{}, validationf("invalid initiative health")
	}
	if !domain.ValidPriority(priority) {
		return Initiative{}, validationf("invalid initiative priority")
	}
	if !validInitiativeDates(start, target) {
		return Initiative{}, validationf("initiative dates must use YYYY-MM-DD and start before target")
	}
	if utf8.RuneCountInString(description) > 20000 {
		return Initiative{}, validationf("initiative description is too long")
	}
	now := domain.Now()
	var out Initiative
	err := s.mutate(func(m *mem) error {
		if initiativeIndex(m, slug) >= 0 {
			return errf(ErrConflict, "initiative slug")
		}
		canonicalLabels, err := canonicalProjectLabels(m, labels)
		if err != nil {
			return err
		}
		out = Initiative{
			ID: m.nextID(), Name: name, Slug: slug, Description: description,
			Status: status, Color: color, Health: health, Priority: priority, Labels: canonicalLabels,
			StartDate: cloneString(start), TargetDate: cloneString(target),
			CreatedAt: now, UpdatedAt: now, ProjectSlugs: []string{},
		}
		if status == "completed" {
			out.CompletedAt = cloneString(&now)
		}
		if err := replaceInitiativeProjects(m, out, projectSlugs); err != nil {
			return err
		}
		m.Initiatives = append(m.Initiatives, out)
		addActivity(m, "initiative", out.ID, "created", map[string]any{"slug": slug}, now)
		m.bump(now)
		return nil
	})
	if err == nil {
		out.ProjectSlugs = append([]string{}, projectSlugs...)
		sort.Strings(out.ProjectSlugs)
	}
	return out, err
}

func (s *Store) UpdateInitiative(slug string, in UpdateInitiativeInput) (Initiative, error) {
	var out Initiative
	err := s.mutate(func(m *mem) error {
		i := initiativeIndex(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		initiative := m.Initiatives[i]
		if in.Name != nil {
			name := strings.TrimSpace(*in.Name)
			if name == "" || utf8.RuneCountInString(name) > 120 {
				return validationf("initiative name must contain 1 to 120 characters")
			}
			initiative.Name = name
		}
		if in.Description != nil {
			if utf8.RuneCountInString(*in.Description) > 20000 {
				return validationf("initiative description is too long")
			}
			initiative.Description = *in.Description
		}
		if in.Status != nil {
			if !validInitiativeStatus(*in.Status) {
				return validationf("invalid initiative status")
			}
			initiative.Status = *in.Status
		}
		if in.Health != nil {
			if !domain.ValidProjectHealth(*in.Health) {
				return validationf("invalid initiative health")
			}
			initiative.Health = *in.Health
		}
		if in.Priority != nil {
			if !domain.ValidPriority(*in.Priority) {
				return validationf("invalid initiative priority")
			}
			initiative.Priority = *in.Priority
		}
		if in.Labels != nil {
			labels, err := canonicalProjectLabels(m, *in.Labels)
			if err != nil {
				return err
			}
			initiative.Labels = labels
		}
		if in.Color != nil {
			if !validProjectIconColor(*in.Color) {
				return validationf("invalid initiative color")
			}
			initiative.Color = *in.Color
		}
		if in.StartDate != nil {
			initiative.StartDate = cloneString(*in.StartDate)
		}
		if in.TargetDate != nil {
			initiative.TargetDate = cloneString(*in.TargetDate)
		}
		if !validInitiativeDates(initiative.StartDate, initiative.TargetDate) {
			return validationf("initiative dates must use YYYY-MM-DD and start before target")
		}
		if in.ProjectSlugs != nil {
			if err := replaceInitiativeProjects(m, initiative, *in.ProjectSlugs); err != nil {
				return err
			}
		}
		now := domain.Now()
		if initiative.Status == "completed" && initiative.CompletedAt == nil {
			initiative.CompletedAt = cloneString(&now)
		} else if initiative.Status != "completed" {
			initiative.CompletedAt = nil
		}
		initiative.UpdatedAt = now
		m.Initiatives[i] = initiative
		addActivity(m, "initiative", initiative.ID, "updated", map[string]any{"slug": slug}, now)
		m.bump(now)
		out = normalizeInitiative(m, initiative)
		return nil
	})
	return out, err
}

func (s *Store) DeleteInitiative(slug string) error {
	return s.mutate(func(m *mem) error {
		i := initiativeIndex(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		initiative := m.Initiatives[i]
		now := domain.Now()
		for projectIndex := range m.Projects {
			project := m.Projects[projectIndex]
			if !containsString(project.InitiativeSlugs, slug) {
				continue
			}
			project.InitiativeSlugs = removeString(project.InitiativeSlugs, slug)
			project.UpdatedAt = now
			m.Projects[projectIndex] = project
			addActivity(m, "project", project.ID, "initiative_removed", map[string]any{"initiativeSlug": slug}, now)
		}
		m.Initiatives = append(m.Initiatives[:i], m.Initiatives[i+1:]...)
		addActivity(m, "initiative", initiative.ID, "deleted", map[string]any{"slug": slug}, now)
		m.bump(now)
		return nil
	})
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

func validInitiativeDates(start, target *string) bool {
	if !validMilestoneDate(start) || !validMilestoneDate(target) {
		return false
	}
	if start == nil || target == nil || *start == "" || *target == "" {
		return true
	}
	startDate, startErr := time.Parse("2006-01-02", *start)
	targetDate, targetErr := time.Parse("2006-01-02", *target)
	return startErr == nil && targetErr == nil && !startDate.After(targetDate)
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

func cloneString(value *string) *string {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
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
