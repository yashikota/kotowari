package store

import (
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) CreateProjectFromInput(in ProjectCreateInput) (Project, error) {
	name, slug, summary := in.Name, in.Slug, in.Summary
	icon, iconColor, description := in.Icon, in.IconColor, in.Description
	status, workflowStatus, priority := in.Status, in.WorkflowStatus, in.Priority
	start, target, labels, options := in.StartDate, in.TargetDate, in.Labels, in.Options
	name = strings.TrimSpace(name)
	slug = strings.TrimSpace(slug)
	if name == "" {
		return Project{}, validationf("name required")
	}
	if !domain.ValidSlug(slug) {
		return Project{}, validationf("invalid slug")
	}
	if status == "" {
		status = "planned"
	}
	if !domain.ValidProjectStatus(status) {
		return Project{}, validationf("invalid status")
	}
	if !domain.ValidPriority(priority) {
		return Project{}, validationf("invalid priority")
	}
	if !validProjectIcon(icon) || !validProjectIconColor(iconColor) {
		return Project{}, validationf("invalid project appearance")
	}
	if options.TemplateSlug != "" && issueTemplateSlug(options.TemplateSlug) != options.TemplateSlug {
		return Project{}, validationf("invalid project template identifier")
	}
	if !validProjectLead(options.Lead) {
		return Project{}, validationf("invalid project lead")
	}
	if !validMilestoneDate(start) || !validMilestoneDate(target) {
		return Project{}, validationf("project dates must use YYYY-MM-DD")
	}
	seenMilestones := make(map[string]struct{}, len(options.Milestones))
	for _, milestone := range options.Milestones {
		milestoneName := strings.TrimSpace(milestone.Name)
		if milestoneName == "" {
			return Project{}, validationf("milestone name required")
		}
		if !validMilestoneDate(milestone.TargetDate) {
			return Project{}, validationf("invalid milestone target date")
		}
		key := strings.ToLower(milestoneName)
		if _, exists := seenMilestones[key]; exists {
			return Project{}, errf(ErrConflict, "milestone name")
		}
		seenMilestones[key] = struct{}{}
	}
	dependencies := make([]ProjectDependency, 0, len(options.Dependencies))
	seenDependencies := make(map[string]struct{}, len(options.Dependencies))
	for _, dependency := range options.Dependencies {
		dependencySlug := strings.TrimSpace(dependency.ProjectSlug)
		if dependencySlug == "" || dependencySlug == slug {
			return Project{}, validationf("invalid project dependency")
		}
		if dependency.Kind != "blocks" && dependency.Kind != "blocked_by" && dependency.Kind != "related" {
			return Project{}, validationf("invalid project dependency kind")
		}
		if _, exists := seenDependencies[dependencySlug]; exists {
			return Project{}, errf(ErrConflict, "project dependency already exists")
		}
		seenDependencies[dependencySlug] = struct{}{}
		dependencies = append(dependencies, ProjectDependency{ProjectSlug: dependencySlug, Kind: dependency.Kind})
	}
	now := domain.Now()
	var completedAt *string
	var out Project
	err := s.mutate(func(m *mem) error {
		resolvedStatus, ok := resolveProjectWorkflowStatus(m.Workspace, status, workflowStatus)
		if !ok {
			return validationf("invalid project workflow status")
		}
		if resolvedStatus.Category == "completed" {
			completedAt = &now
		}
		if _, ok := projectBySlug(m, slug); ok {
			return errf(ErrConflict, "slug")
		}
		projectLabels, err := canonicalProjectLabels(m, labels)
		if err != nil {
			return err
		}
		dependencyIndices := make([]int, 0, len(dependencies))
		for _, dependency := range dependencies {
			index := indexProject(m, dependency.ProjectSlug)
			if index < 0 {
				return ErrNotFound
			}
			dependencyIndices = append(dependencyIndices, index)
		}
		projectID := m.nextID()
		milestones := make([]Milestone, 0, len(options.Milestones))
		for _, milestoneInput := range options.Milestones {
			var targetDate *string
			if milestoneInput.TargetDate != nil && strings.TrimSpace(*milestoneInput.TargetDate) != "" {
				date := strings.TrimSpace(*milestoneInput.TargetDate)
				targetDate = &date
			}
			milestone := Milestone{
				ID: m.nextID(), Name: strings.TrimSpace(milestoneInput.Name),
				Description: strings.TrimSpace(milestoneInput.Description), TargetDate: targetDate,
				CreatedAt: now, UpdatedAt: now,
			}
			milestones = append(milestones, milestone)
		}
		out = Project{
			ID: projectID, Name: name, Slug: slug, Summary: summary, Icon: icon, IconColor: iconColor, Description: description, Status: resolvedStatus.Category, WorkflowStatus: resolvedStatus.ID,
			Lead: options.Lead, TemplateSlug: options.TemplateSlug, Health: "", CompletedAt: completedAt, Priority: priority, StartDate: start, TargetDate: target,
			Labels: projectLabels, Dependencies: dependencies, Milestones: milestones, CreatedAt: now, UpdatedAt: now,
		}
		for i, dependency := range dependencies {
			dependencyProject := m.Projects[dependencyIndices[i]]
			dependencyProject.Dependencies = append(dependencyProject.Dependencies, ProjectDependency{
				ProjectSlug: slug, Kind: inverseProjectDependencyKind(dependency.Kind),
			})
			dependencyProject.UpdatedAt = now
			m.Projects[dependencyIndices[i]] = dependencyProject
			addActivity(m, "project", dependencyProject.ID, "dependency_added", map[string]any{"projectSlug": slug, "kind": inverseProjectDependencyKind(dependency.Kind)}, now)
		}
		m.Projects = append(m.Projects, out)
		addActivity(m, "project", out.ID, "created", map[string]any{"slug": slug}, now)
		for _, milestone := range milestones {
			addActivity(m, "project", out.ID, "milestone_created", map[string]any{"milestoneId": milestone.ID, "name": milestone.Name}, now)
		}
		m.bump(now)
		return nil
	})
	return out, err
}
