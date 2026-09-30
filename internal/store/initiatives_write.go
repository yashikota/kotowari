package store

import (
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) PostInitiativeUpdate(slug string, in PostHealthUpdateInput) (Activity, error) {
	health := strings.TrimSpace(in.Health)
	body := strings.TrimSpace(in.Body)
	if !domain.ValidProjectHealth(health) || health == "" {
		return Activity{}, validationf("invalid initiative health")
	}
	if body == "" || utf8.RuneCountInString(body) > 10000 {
		return Activity{}, validationf("initiative update body must contain 1 to 10000 characters")
	}
	now := domain.Now()
	var out Activity
	err := s.mutate(func(m *mem) error {
		index := initiativeIndex(m, slug)
		if index < 0 {
			return ErrNotFound
		}
		initiative := m.Initiatives[index]
		initiative.Health = health
		initiative.HealthUpdatedAt = cloneString(&now)
		initiative.UpdatedAt = now
		m.Initiatives[index] = initiative
		addActivity(m, "initiative", initiative.ID, "status_update_posted", map[string]any{
			"health": health,
			"body":   body,
		}, now)
		out = m.Activities[len(m.Activities)-1]
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) CreateInitiative(in CreateInitiativeInput) (Initiative, error) {
	var err error
	in, err = normalizeInitiativeCreateInput(in)
	if err != nil {
		return Initiative{}, err
	}
	name, slug, description := in.Name, in.Slug, in.Description
	status, owner, color := in.Status, in.Owner, in.Color
	start, target := in.StartDate, in.TargetDate
	projectSlugs, health, priority, labels := in.ProjectSlugs, in.Health, in.Priority, in.Labels
	now := domain.Now()
	var out Initiative
	err = s.mutate(func(m *mem) error {
		if initiativeIndex(m, slug) >= 0 {
			return errf(ErrConflict, "initiative slug")
		}
		canonicalLabels, err := canonicalProjectLabels(m, labels)
		if err != nil {
			return err
		}
		out = Initiative{
			ID: m.nextID(), Name: name, Slug: slug, Description: description,
			Status: status, Owner: owner, Color: color, Health: health, Priority: priority, Labels: canonicalLabels,
			StartDate: cloneString(start), TargetDate: cloneString(target),
			CreatedAt: now, UpdatedAt: now, ProjectSlugs: []string{},
		}
		if health != "" {
			out.HealthUpdatedAt = cloneString(&now)
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
		if in.Owner != nil {
			if !validInitiativeOwner(*in.Owner) {
				return validationf("invalid initiative owner")
			}
			initiative.Owner = *in.Owner
		}
		healthChanged := false
		if in.Health != nil {
			if !domain.ValidProjectHealth(*in.Health) {
				return validationf("invalid initiative health")
			}
			healthChanged = initiative.Health != *in.Health
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
		if healthChanged {
			if initiative.Health == "" {
				initiative.HealthUpdatedAt = nil
			} else {
				initiative.HealthUpdatedAt = cloneString(&now)
			}
		}
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
