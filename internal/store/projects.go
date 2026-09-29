package store

import (
	"sort"
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

func (s *Store) CreateProject(name, slug, description, status string, start, target *string) (Project, error) {
	return s.CreateProjectWithPriority(name, slug, description, status, 0, start, target)
}

func (s *Store) CreateProjectWithPriority(name, slug, description, status string, priority int, start, target *string) (Project, error) {
	return s.CreateProjectWithPriorityAndLabels(name, slug, description, status, priority, start, target, nil)
}

func (s *Store) CreateProjectWithPriorityAndLabels(name, slug, description, status string, priority int, start, target *string, labels []string) (Project, error) {
	return s.CreateProjectWithSummaryAndLabels(name, slug, "", description, status, priority, start, target, labels)
}

func (s *Store) CreateProjectWithSummaryAndLabels(name, slug, summary, description, status string, priority int, start, target *string, labels []string) (Project, error) {
	return s.CreateProjectWithAppearance(name, slug, summary, "", "", description, status, priority, start, target, labels)
}

func (s *Store) CreateProjectWithAppearance(name, slug, summary, icon, iconColor, description, status string, priority int, start, target *string, labels []string) (Project, error) {
	return s.CreateProjectWithWorkflow(name, slug, summary, icon, iconColor, description, status, "", priority, start, target, labels)
}

func (s *Store) CreateProjectWithWorkflow(name, slug, summary, icon, iconColor, description, status, workflowStatus string, priority int, start, target *string, labels []string) (Project, error) {
	return s.CreateProjectWithWorkflowAndOptions(name, slug, summary, icon, iconColor, description, status, workflowStatus, priority, start, target, labels, ProjectCreationOptions{})
}

func (s *Store) CreateProjectWithWorkflowAndOptions(name, slug, summary, icon, iconColor, description, status, workflowStatus string, priority int, start, target *string, labels []string, options ProjectCreationOptions) (Project, error) {
	return s.CreateProjectFromInput(ProjectCreateInput{
		Name: name, Slug: slug, Summary: summary, Icon: icon, IconColor: iconColor,
		Description: description, Status: status, WorkflowStatus: workflowStatus,
		Priority: priority, StartDate: start, TargetDate: target, Labels: labels, Options: options,
	})
}

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

func validProjectLead(lead string) bool {
	return lead == "" || lead == "self"
}

func validProjectIcon(icon string) bool {
	if icon == "" {
		return true
	}
	_, ok := projectIcons[icon]
	return ok
}

func validProjectIconColor(color string) bool {
	if color == "" {
		return true
	}
	if _, ok := projectIconColors[color]; ok {
		return true
	}
	if len(color) != 7 || color[0] != '#' {
		return false
	}
	for _, c := range color[1:] {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}

var projectIcons = map[string]struct{}{
	"folder": {}, "cube": {}, "rocket": {}, "bolt": {}, "book": {}, "bug": {}, "briefcase": {}, "building": {},
	"calendar": {}, "chart-bar": {}, "code": {}, "coffee": {}, "compass": {}, "cpu": {}, "database": {},
	"desktop": {}, "diamond": {}, "flame": {}, "flask": {}, "heart": {}, "home": {}, "leaf": {}, "lock": {},
	"map": {}, "message": {}, "moon": {}, "palette": {}, "puzzle": {}, "shield": {}, "sparkles": {},
	"star": {}, "sun": {}, "target": {}, "terminal": {}, "tools": {}, "trophy": {}, "world": {},
	"emoji:rocket": {}, "emoji:star": {}, "emoji:sparkles": {}, "emoji:fire": {}, "emoji:lightning": {},
	"emoji:bug": {}, "emoji:books": {}, "emoji:bulb": {}, "emoji:heart": {}, "emoji:leaf": {}, "emoji:globe": {},
	"emoji:moon": {}, "emoji:sun": {}, "emoji:rainbow": {}, "emoji:gem": {}, "emoji:coffee": {}, "emoji:computer": {},
	"emoji:paint": {}, "emoji:target": {}, "emoji:construction": {}, "emoji:package": {}, "emoji:seedling": {},
	"emoji:wave": {}, "emoji:mountain": {}, "emoji:music": {}, "emoji:camera": {}, "emoji:airplane": {},
}

var projectIconColors = map[string]struct{}{
	"grey": {}, "blue": {}, "purple": {}, "pink": {}, "red": {}, "orange": {}, "yellow": {}, "green": {},
}

func canonicalProjectLabels(m *mem, labels []string) ([]string, error) {
	available := make(map[string]string, len(m.Labels))
	for _, label := range m.Labels {
		available[strings.ToLower(label.Name)] = label.Name
	}
	seen := make(map[string]struct{}, len(labels))
	nextLabels := make([]string, 0, len(labels))
	for _, label := range labels {
		name := strings.TrimSpace(label)
		if name == "" {
			return nil, validationf("project labels must not be empty")
		}
		canonical, ok := available[strings.ToLower(name)]
		if !ok {
			return nil, validationf("unknown project label %q", name)
		}
		key := strings.ToLower(canonical)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		nextLabels = append(nextLabels, canonical)
	}
	return nextLabels, nil
}

func (s *Store) UpdateProject(slug string, name, description, status, health *string, priority *int, start, target **string, labels *[]string) (Project, error) {
	return s.UpdateProjectWithSummary(slug, name, nil, description, status, health, priority, start, target, labels)
}

func (s *Store) UpdateProjectWithSummary(slug string, name, summary, description, status, health *string, priority *int, start, target **string, labels *[]string) (Project, error) {
	return s.UpdateProjectWithAppearance(slug, name, summary, nil, nil, description, status, health, priority, start, target, labels)
}

func (s *Store) UpdateProjectWithAppearance(slug string, name, summary, icon, iconColor, description, status, health *string, priority *int, start, target **string, labels *[]string) (Project, error) {
	return s.UpdateProjectWithWorkflow(slug, name, summary, icon, iconColor, description, status, nil, health, priority, start, target, labels)
}

func (s *Store) UpdateProjectWithWorkflow(slug string, name, summary, icon, iconColor, description, status, workflowStatus, health *string, priority *int, start, target **string, labels *[]string) (Project, error) {
	return s.UpdateProjectWithWorkflowAndInitiatives(slug, name, summary, icon, iconColor, description, status, workflowStatus, health, priority, start, target, labels, nil)
}

func (s *Store) UpdateProjectWithWorkflowAndInitiatives(slug string, name, summary, icon, iconColor, description, status, workflowStatus, health *string, priority *int, start, target **string, labels, initiativeSlugs *[]string) (Project, error) {
	return s.UpdateProjectWithWorkflowInitiativesAndLead(slug, name, summary, icon, iconColor, description, status, workflowStatus, health, nil, priority, start, target, labels, initiativeSlugs)
}

func (s *Store) UpdateProjectWithWorkflowInitiativesAndLead(slug string, name, summary, icon, iconColor, description, status, workflowStatus, health, lead *string, priority *int, start, target **string, labels, initiativeSlugs *[]string) (Project, error) {
	return s.UpdateProjectFromInput(ProjectUpdateInput{
		Slug: slug, Name: name, Summary: summary, Icon: icon, IconColor: iconColor,
		Description: description, Status: status, WorkflowStatus: workflowStatus,
		Health: health, Lead: lead, Priority: priority, StartDate: start, TargetDate: target,
		Labels: labels, InitiativeSlugs: initiativeSlugs,
	})
}

func (s *Store) UpdateProjectFromInput(in ProjectUpdateInput) (Project, error) {
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
