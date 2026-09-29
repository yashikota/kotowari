package store

import (
	"sort"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) UpdateProject(in ProjectUpdateInput) (Project, error) {
	slug, name, summary := in.Slug, in.Name, in.Summary
	icon, iconColor, description := in.Icon, in.IconColor, in.Description
	status, workflowStatus, health, lead := in.Status, in.WorkflowStatus, in.Health, in.Lead
	priority, start, target := in.Priority, in.StartDate, in.TargetDate
	labels, initiativeSlugs := in.Labels, in.InitiativeSlugs
	if lead != nil && !validProjectLead(*lead) {
		return Project{}, validationf("invalid project lead")
	}
	var out Project
	err := s.mutate(func(m *mem) error {
		i := indexProject(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		p := m.Projects[i]
		previousStatus := p.Status
		previousWorkflowStatus := p.WorkflowStatus
		if previousWorkflowStatus == "" {
			previousWorkflowStatus = p.Status
		}
		previousHealth := p.Health
		previousPriority := p.Priority
		previousLead := p.Lead
		if name != nil {
			if strings.TrimSpace(*name) == "" {
				return validationf("name required")
			}
			p.Name = strings.TrimSpace(*name)
		}
		if description != nil {
			p.Description = *description
		}
		if lead != nil {
			p.Lead = *lead
		}
		if summary != nil {
			p.Summary = *summary
		}
		if icon != nil {
			if !validProjectIcon(*icon) {
				return validationf("invalid project icon")
			}
			p.Icon = *icon
		}
		if iconColor != nil {
			if !validProjectIconColor(*iconColor) {
				return validationf("invalid project icon color")
			}
			p.IconColor = *iconColor
		}
		if status != nil {
			if !domain.ValidProjectStatus(*status) {
				return validationf("invalid status")
			}
		}
		statusChanged := status != nil || workflowStatus != nil
		if health != nil {
			if !domain.ValidProjectHealth(*health) {
				return validationf("invalid project health")
			}
			p.Health = *health
		}
		if priority != nil {
			if !domain.ValidPriority(*priority) {
				return validationf("invalid priority")
			}
			p.Priority = *priority
		}
		if start != nil {
			if !validMilestoneDate(*start) {
				return validationf("project dates must use YYYY-MM-DD")
			}
			p.StartDate = *start
		}
		if target != nil {
			if !validMilestoneDate(*target) {
				return validationf("project dates must use YYYY-MM-DD")
			}
			p.TargetDate = *target
		}
		if labels != nil {
			nextLabels, err := canonicalProjectLabels(m, *labels)
			if err != nil {
				return err
			}
			p.Labels = nextLabels
		}
		now := domain.Now()
		if initiativeSlugs != nil {
			nextInitiatives := make(map[string]struct{}, len(*initiativeSlugs))
			for _, initiativeSlug := range *initiativeSlugs {
				if !domain.ValidSlug(initiativeSlug) {
					return validationf("invalid initiative slug")
				}
				if _, exists := nextInitiatives[initiativeSlug]; exists {
					return errf(ErrConflict, "initiative already assigned")
				}
				if initiativeIndex(m, initiativeSlug) < 0 {
					return ErrNotFound
				}
				nextInitiatives[initiativeSlug] = struct{}{}
			}
			previousInitiatives := make(map[string]struct{}, len(p.InitiativeSlugs))
			for _, initiativeSlug := range p.InitiativeSlugs {
				previousInitiatives[initiativeSlug] = struct{}{}
			}
			for initiativeSlug := range previousInitiatives {
				if _, keep := nextInitiatives[initiativeSlug]; !keep {
					addActivity(m, "project", p.ID, "initiative_removed", map[string]any{"initiativeSlug": initiativeSlug}, now)
				}
			}
			for initiativeSlug := range nextInitiatives {
				if _, wasLinked := previousInitiatives[initiativeSlug]; !wasLinked {
					addActivity(m, "project", p.ID, "initiative_added", map[string]any{"initiativeSlug": initiativeSlug}, now)
				}
			}
			p.InitiativeSlugs = append([]string{}, (*initiativeSlugs)...)
			sort.Strings(p.InitiativeSlugs)
		}
		if statusChanged {
			category := p.Status
			workflowID := ""
			if status != nil {
				category = *status
			}
			if workflowStatus != nil {
				workflowID = *workflowStatus
			}
			resolvedStatus, ok := resolveProjectWorkflowStatus(m.Workspace, category, workflowID)
			if !ok || (status != nil && workflowStatus != nil && resolvedStatus.Category != *status) {
				return validationf("invalid project workflow status")
			}
			p.Status = resolvedStatus.Category
			p.WorkflowStatus = resolvedStatus.ID
			if p.Status == "completed" && previousStatus != "completed" {
				p.CompletedAt = &now
			} else if p.Status != "completed" && previousStatus == "completed" {
				p.CompletedAt = nil
			}
		}
		p.UpdatedAt = now
		m.Projects[i] = p
		if previousWorkflowStatus != p.WorkflowStatus {
			addActivity(m, "project", p.ID, "status_changed", map[string]any{"from": previousWorkflowStatus, "to": p.WorkflowStatus}, now)
		}
		if previousHealth != p.Health {
			p.HealthUpdatedAt = &now
			addActivity(m, "project", p.ID, "health_changed", map[string]any{"from": previousHealth, "to": p.Health}, now)
		}
		if previousPriority != p.Priority {
			addActivity(m, "project", p.ID, "priority_changed", map[string]any{"from": previousPriority, "to": p.Priority}, now)
		}
		if previousLead != p.Lead {
			addActivity(m, "project", p.ID, "lead_changed", map[string]any{"from": previousLead, "to": p.Lead}, now)
		}
		m.bump(now)
		p = normalizeProjectWorkflowStatus(p, m.Workspace)
		p.Progress = projectProgress(m, p.ID)
		out = p
		return nil
	})
	return out, err
}
