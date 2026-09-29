package store

import (
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

type preparedProjectCreateInput struct {
	input        ProjectCreateInput
	dependencies []ProjectDependency
}

func (s *Store) prepareProjectCreateInput(in ProjectCreateInput) (preparedProjectCreateInput, error) {
	name, slug := in.Name, in.Slug
	icon, iconColor := in.Icon, in.IconColor
	status, priority := in.Status, in.Priority
	start, target, options := in.StartDate, in.TargetDate, in.Options
	name = strings.TrimSpace(name)
	slug = strings.TrimSpace(slug)
	if name == "" {
		return preparedProjectCreateInput{}, validationf("name required")
	}
	if !domain.ValidSlug(slug) {
		return preparedProjectCreateInput{}, validationf("invalid slug")
	}
	if status == "" {
		status = "planned"
	}
	if !domain.ValidProjectStatus(status) {
		return preparedProjectCreateInput{}, validationf("invalid status")
	}
	if !domain.ValidPriority(priority) {
		return preparedProjectCreateInput{}, validationf("invalid priority")
	}
	if !validProjectIcon(icon) || !validProjectIconColor(iconColor) {
		return preparedProjectCreateInput{}, validationf("invalid project appearance")
	}
	if options.TemplateSlug != "" && issueTemplateSlug(options.TemplateSlug) != options.TemplateSlug {
		return preparedProjectCreateInput{}, validationf("invalid project template identifier")
	}
	if !validProjectLead(options.Lead) {
		return preparedProjectCreateInput{}, validationf("invalid project lead")
	}
	if !validMilestoneDate(start) || !validMilestoneDate(target) {
		return preparedProjectCreateInput{}, validationf("project dates must use YYYY-MM-DD")
	}
	seenMilestones := make(map[string]struct{}, len(options.Milestones))
	for _, milestone := range options.Milestones {
		milestoneName := strings.TrimSpace(milestone.Name)
		if milestoneName == "" {
			return preparedProjectCreateInput{}, validationf("milestone name required")
		}
		if !validMilestoneDate(milestone.TargetDate) {
			return preparedProjectCreateInput{}, validationf("invalid milestone target date")
		}
		key := strings.ToLower(milestoneName)
		if _, exists := seenMilestones[key]; exists {
			return preparedProjectCreateInput{}, errf(ErrConflict, "milestone name")
		}
		seenMilestones[key] = struct{}{}
	}
	dependencies := make([]ProjectDependency, 0, len(options.Dependencies))
	seenDependencies := make(map[string]struct{}, len(options.Dependencies))
	for _, dependency := range options.Dependencies {
		dependencySlug := strings.TrimSpace(dependency.ProjectSlug)
		if dependencySlug == "" || dependencySlug == slug {
			return preparedProjectCreateInput{}, validationf("invalid project dependency")
		}
		if dependency.Kind != "blocks" && dependency.Kind != "blocked_by" && dependency.Kind != "related" {
			return preparedProjectCreateInput{}, validationf("invalid project dependency kind")
		}
		if _, exists := seenDependencies[dependencySlug]; exists {
			return preparedProjectCreateInput{}, errf(ErrConflict, "project dependency already exists")
		}
		seenDependencies[dependencySlug] = struct{}{}
		dependencies = append(dependencies, ProjectDependency{ProjectSlug: dependencySlug, Kind: dependency.Kind})
	}
	in.Name, in.Slug, in.Status = name, slug, status
	return preparedProjectCreateInput{input: in, dependencies: dependencies}, nil
}
