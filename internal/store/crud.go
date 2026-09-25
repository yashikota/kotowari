package store

import (
	"encoding/json"
	"fmt"
	"mime"
	"net/url"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/yashikota/kotowari/internal/domain"
)

func ensureIssueActive(issue Issue) error {
	if issue.ArchivedAt != nil {
		return errf(ErrConflict, "issue is archived")
	}
	return nil
}

func isRestoreOnlyIssuePatch(in PatchIssueInput) bool {
	if in.Archived == nil || *in.Archived {
		return false
	}
	return in.Title == nil && in.Body == nil && in.Status == nil && in.WorkflowStatus == nil && in.Type == nil &&
		in.Priority == nil && in.Estimate == nil && in.ProjectID == nil && in.MilestoneID == nil &&
		in.Assignee == nil && in.CycleID == nil && in.ParentID == nil && in.DueDate == nil && in.ReminderAt == nil &&
		in.LabelIDs == nil && in.SortOrder == nil && in.IsFavorite == nil
}

func (s *Store) Workspace() (Workspace, error) {
	var ws Workspace
	err := s.snapshot(func(m *mem) error {
		ws = workspaceFrom(m)
		return nil
	})
	return ws, err
}

func workspaceFrom(m *mem) Workspace {
	locale := strings.TrimSpace(m.Workspace.Locale)
	if locale == "" {
		locale = "en"
	}
	return Workspace{
		Name:            m.Workspace.Name,
		Timezone:        m.Workspace.Timezone,
		Locale:          locale,
		URL:             strings.TrimSpace(m.Workspace.URL),
		Description:     m.Workspace.Description,
		GitHubURL:       strings.TrimSpace(m.Workspace.GitHubURL),
		IssueStatuses:   issueWorkflowStatuses(m.Workspace),
		ProjectStatuses: projectWorkflowStatuses(m.Workspace),
		UpdatedAt:       m.Workspace.UpdatedAt,
	}
}

func validLocale(locale string) bool {
	switch locale {
	case "en", "ja":
		return true
	default:
		return false
	}
}

func (s *Store) UpdateWorkspace(name, timezone, locale, url, description, githubURL *string) (Workspace, error) {
	var ws Workspace
	err := s.mutate(func(m *mem) error {
		if name != nil {
			if strings.TrimSpace(*name) == "" {
				return validationf("name required")
			}
			m.Workspace.Name = strings.TrimSpace(*name)
		}
		if timezone != nil {
			if strings.TrimSpace(*timezone) == "" {
				return validationf("timezone required")
			}
			m.Workspace.Timezone = strings.TrimSpace(*timezone)
		}
		if locale != nil {
			next := strings.TrimSpace(*locale)
			if next == "" {
				return validationf("locale required")
			}
			if !validLocale(next) {
				return validationf("unsupported locale")
			}
			m.Workspace.Locale = next
		}
		if url != nil {
			m.Workspace.URL = strings.TrimSpace(*url)
		}
		if description != nil {
			m.Workspace.Description = *description
		}
		if githubURL != nil {
			m.Workspace.GitHubURL = strings.TrimSpace(*githubURL)
		}
		m.bump(domain.Now())
		ws = workspaceFrom(m)
		return nil
	})
	return ws, err
}

func (s *Store) ListLabels() ([]Label, error) {
	var out []Label
	err := s.snapshot(func(m *mem) error {
		out = append([]Label{}, m.Labels...)
		return nil
	})
	return out, err
}

func (s *Store) CreateLabel(name, color string) (Label, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return Label{}, validationf("name required")
	}
	if !validColor(color) {
		return Label{}, validationf("color must be #RRGGBB")
	}
	var out Label
	err := s.mutate(func(m *mem) error {
		if _, ok := labelByName(m, name); ok {
			return errf(ErrConflict, "label name")
		}
		out = Label{ID: m.nextID(), Name: name, Color: color}
		m.Labels = append(m.Labels, out)
		m.bump(domain.Now())
		return nil
	})
	return out, err
}

func (s *Store) ListProjects() ([]Project, error) {
	var out []Project
	err := s.snapshot(func(m *mem) error {
		out = make([]Project, len(m.Projects))
		copy(out, m.Projects)
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
			TemplateSlug: options.TemplateSlug, Health: "", CompletedAt: completedAt, Priority: priority, StartDate: start, TargetDate: target,
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
	"folder": {}, "rocket": {}, "bolt": {}, "book": {}, "bug": {}, "briefcase": {}, "building": {},
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

func (s *Store) AddProjectDependency(projectSlug, dependencySlug, kind string) (Project, error) {
	projectSlug = strings.TrimSpace(projectSlug)
	dependencySlug = strings.TrimSpace(dependencySlug)
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

func validMilestoneDate(value *string) bool {
	if value == nil || strings.TrimSpace(*value) == "" {
		return true
	}
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*value))
	return err == nil && parsed.Format("2006-01-02") == strings.TrimSpace(*value)
}

func (s *Store) CreateMilestone(projectSlug, name string, targetDate *string) (Milestone, error) {
	return s.CreateMilestoneWithDescription(projectSlug, name, "", targetDate)
}

func (s *Store) CreateMilestoneWithDescription(projectSlug, name, description string, targetDate *string) (Milestone, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return Milestone{}, validationf("milestone name required")
	}
	if !validMilestoneDate(targetDate) {
		return Milestone{}, validationf("invalid milestone target date")
	}
	var out Milestone
	err := s.mutate(func(m *mem) error {
		projectIndex := indexProject(m, projectSlug)
		if projectIndex < 0 {
			return ErrNotFound
		}
		project := m.Projects[projectIndex]
		for _, existing := range project.Milestones {
			if strings.EqualFold(existing.Name, name) {
				return errf(ErrConflict, "milestone name")
			}
		}
		now := domain.Now()
		var normalizedTargetDate *string
		if targetDate != nil && strings.TrimSpace(*targetDate) != "" {
			date := strings.TrimSpace(*targetDate)
			normalizedTargetDate = &date
		}
		out = Milestone{
			ID: m.nextID(), Name: name, Description: strings.TrimSpace(description),
			TargetDate: normalizedTargetDate, CreatedAt: now, UpdatedAt: now,
		}
		project.Milestones = append(project.Milestones, out)
		project.UpdatedAt = now
		m.Projects[projectIndex] = project
		addActivity(m, "project", project.ID, "milestone_created", map[string]any{"milestoneId": out.ID, "name": out.Name}, now)
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) UpdateMilestone(projectSlug string, milestoneID int64, name *string, targetDate **string) (Milestone, error) {
	return s.UpdateMilestoneDetails(projectSlug, milestoneID, name, nil, targetDate)
}

func (s *Store) UpdateMilestoneDetails(projectSlug string, milestoneID int64, name, description *string, targetDate **string) (Milestone, error) {
	if name != nil && strings.TrimSpace(*name) == "" {
		return Milestone{}, validationf("milestone name required")
	}
	if targetDate != nil && !validMilestoneDate(*targetDate) {
		return Milestone{}, validationf("invalid milestone target date")
	}
	var out Milestone
	err := s.mutate(func(m *mem) error {
		projectIndex := indexProject(m, projectSlug)
		if projectIndex < 0 {
			return ErrNotFound
		}
		project := m.Projects[projectIndex]
		milestoneIndex := -1
		for i := range project.Milestones {
			if project.Milestones[i].ID == milestoneID {
				milestoneIndex = i
				break
			}
		}
		if milestoneIndex < 0 {
			return ErrNotFound
		}
		milestone := project.Milestones[milestoneIndex]
		if name != nil {
			nextName := strings.TrimSpace(*name)
			for i, existing := range project.Milestones {
				if i != milestoneIndex && strings.EqualFold(existing.Name, nextName) {
					return errf(ErrConflict, "milestone name")
				}
			}
			milestone.Name = nextName
		}
		if description != nil {
			milestone.Description = strings.TrimSpace(*description)
		}
		if targetDate != nil {
			milestone.TargetDate = *targetDate
		}
		now := domain.Now()
		milestone.UpdatedAt = now
		project.Milestones[milestoneIndex] = milestone
		project.UpdatedAt = now
		m.Projects[projectIndex] = project
		for i := range m.Issues {
			if m.Issues[i].MilestoneID != nil && *m.Issues[i].MilestoneID == milestone.ID {
				if name != nil {
					newName := milestone.Name
					m.Issues[i].MilestoneName = &newName
				}
				m.Issues[i].UpdatedAt = now
			}
		}
		addActivity(m, "project", project.ID, "milestone_updated", map[string]any{"milestoneId": milestone.ID, "name": milestone.Name}, now)
		m.bump(now)
		out = milestone
		return nil
	})
	return out, err
}

func (s *Store) DeleteMilestone(projectSlug string, milestoneID int64) error {
	return s.mutate(func(m *mem) error {
		projectIndex := indexProject(m, projectSlug)
		if projectIndex < 0 {
			return ErrNotFound
		}
		project := m.Projects[projectIndex]
		milestoneIndex := -1
		for i := range project.Milestones {
			if project.Milestones[i].ID == milestoneID {
				milestoneIndex = i
				break
			}
		}
		if milestoneIndex < 0 {
			return ErrNotFound
		}
		milestone := project.Milestones[milestoneIndex]
		project.Milestones = append(project.Milestones[:milestoneIndex], project.Milestones[milestoneIndex+1:]...)
		now := domain.Now()
		project.UpdatedAt = now
		m.Projects[projectIndex] = project
		for i := range m.Issues {
			if m.Issues[i].MilestoneID != nil && *m.Issues[i].MilestoneID == milestone.ID {
				m.Issues[i].MilestoneID = nil
				m.Issues[i].MilestoneName = nil
				m.Issues[i].UpdatedAt = now
			}
		}
		addActivity(m, "project", project.ID, "milestone_deleted", map[string]any{"milestoneId": milestone.ID, "name": milestone.Name}, now)
		m.bump(now)
		return nil
	})
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
		if name != nil {
			if strings.TrimSpace(*name) == "" {
				return validationf("name required")
			}
			p.Name = strings.TrimSpace(*name)
		}
		if description != nil {
			p.Description = *description
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
		m.bump(now)
		p = normalizeProjectWorkflowStatus(p, m.Workspace)
		p.Progress = projectProgress(m, p.ID)
		out = p
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

func (s *Store) ListCycles() ([]Cycle, error) {
	var out []Cycle
	err := s.snapshot(func(m *mem) error {
		out = append([]Cycle{}, m.Cycles...)
		for i := range out {
			if out[i].Resources == nil {
				out[i].Resources = []IssueLink{}
			}
		}
		return nil
	})
	return out, err
}

func (s *Store) GetCycle(number int) (Cycle, error) {
	var c Cycle
	err := s.snapshot(func(m *mem) error {
		got, ok := cycleByNumber(m, number)
		if !ok {
			return ErrNotFound
		}
		c = got
		if c.Resources == nil {
			c.Resources = []IssueLink{}
		}
		return nil
	})
	return c, err
}

func (s *Store) CreateCycle(startsAt, endsAt, status string) (Cycle, error) {
	if err := parseTime(startsAt); err != nil {
		return Cycle{}, err
	}
	if err := parseTime(endsAt); err != nil {
		return Cycle{}, err
	}
	if status == "" {
		status = "upcoming"
	}
	if !domain.ValidCycleStatus(status) {
		return Cycle{}, validationf("invalid status")
	}
	now := domain.Now()
	var out Cycle
	err := s.mutate(func(m *mem) error {
		next := 1
		for _, c := range m.Cycles {
			if c.Number >= next {
				next = c.Number + 1
			}
		}
		if next == 1 && status == "upcoming" {
			status = "active"
		}
		ensureSingleActive(m, 0, status)
		start, _ := time.Parse(time.RFC3339, startsAt)
		end, _ := time.Parse(time.RFC3339, endsAt)
		if !end.After(start) {
			return validationf("cycle end must be after start")
		}
		out = Cycle{ID: m.nextID(), Number: next, Name: fmt.Sprintf("Cycle %d", next), StartsAt: startsAt, EndsAt: endsAt, Status: status, Resources: []IssueLink{}, CreatedAt: now, UpdatedAt: now}
		m.Cycles = append(m.Cycles, out)
		addActivity(m, "cycle", out.ID, "created", map[string]any{"number": next}, now)
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) AddCycleLink(number int, in CreateIssueLinkInput) (IssueLink, error) {
	in.URL = strings.TrimSpace(in.URL)
	in.Title = strings.TrimSpace(in.Title)
	in.Kind = strings.TrimSpace(in.Kind)
	parsed, err := url.Parse(in.URL)
	if err != nil || !parsed.IsAbs() || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return IssueLink{}, validationf("link URL must be an absolute http or https URL")
	}
	if in.Kind == "" {
		in.Kind = "link"
	}
	if in.Kind != "link" && in.Kind != "document" {
		return IssueLink{}, validationf("invalid cycle resource kind")
	}
	var out IssueLink
	err = s.mutate(func(m *mem) error {
		i := indexCycle(m, number)
		if i < 0 {
			return ErrNotFound
		}
		cycle := m.Cycles[i]
		for _, existing := range cycle.Resources {
			if existing.URL == in.URL {
				return errf(ErrConflict, "resource already exists")
			}
		}
		var id int64 = 1
		for _, existing := range cycle.Resources {
			if existing.ID >= id {
				id = existing.ID + 1
			}
		}
		now := domain.Now()
		out = IssueLink{ID: id, URL: in.URL, Title: in.Title, Kind: in.Kind, CreatedAt: now}
		cycle.Resources = append(cycle.Resources, out)
		cycle.UpdatedAt = now
		m.Cycles[i] = cycle
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) RemoveCycleLink(number int, linkID int64) error {
	if linkID < 1 {
		return validationf("invalid resource id")
	}
	return s.mutate(func(m *mem) error {
		i := indexCycle(m, number)
		if i < 0 {
			return ErrNotFound
		}
		cycle := m.Cycles[i]
		for index, resource := range cycle.Resources {
			if resource.ID != linkID {
				continue
			}
			cycle.Resources = append(cycle.Resources[:index], cycle.Resources[index+1:]...)
			cycle.UpdatedAt = domain.Now()
			m.Cycles[i] = cycle
			m.bump(cycle.UpdatedAt)
			return nil
		}
		return ErrNotFound
	})
}

func (s *Store) UpdateCycle(number int, in UpdateCycleInput) (Cycle, error) {
	var out Cycle
	err := s.mutate(func(m *mem) error {
		i := indexCycle(m, number)
		if i < 0 {
			return ErrNotFound
		}
		c := m.Cycles[i]
		if c.Name == "" {
			c.Name = fmt.Sprintf("Cycle %d", c.Number)
		}
		if in.Name != nil {
			name := strings.TrimSpace(*in.Name)
			if name == "" || len(name) > 512 {
				return validationf("invalid cycle name")
			}
			c.Name = name
		}
		if in.Description != nil {
			if len(*in.Description) > 20000 {
				return validationf("cycle description is too long")
			}
			c.Description = *in.Description
		}
		if in.StartsAt != nil {
			if err := parseTime(*in.StartsAt); err != nil {
				return err
			}
			c.StartsAt = *in.StartsAt
		}
		if in.EndsAt != nil {
			if err := parseTime(*in.EndsAt); err != nil {
				return err
			}
			c.EndsAt = *in.EndsAt
		}
		start, _ := time.Parse(time.RFC3339, c.StartsAt)
		end, _ := time.Parse(time.RFC3339, c.EndsAt)
		if !end.After(start) {
			return validationf("cycle end must be after start")
		}
		if in.Status != nil {
			if !domain.ValidCycleStatus(*in.Status) {
				return validationf("invalid status")
			}
			c.Status = *in.Status
		}
		if in.IsFavorite != nil {
			c.IsFavorite = *in.IsFavorite
		}
		now := domain.Now()
		ensureSingleActive(m, c.ID, c.Status)
		c.UpdatedAt = now
		m.Cycles[i] = c
		m.bump(now)
		out = c
		return nil
	})
	return out, err
}

func ensureSingleActive(m *mem, id int64, status string) {
	if status != "active" {
		return
	}
	now := domain.Now()
	for i := range m.Cycles {
		if m.Cycles[i].Status == "active" && m.Cycles[i].ID != id {
			m.Cycles[i].Status = "completed"
			m.Cycles[i].UpdatedAt = now
		}
	}
}

func (s *Store) ListIssues(f IssueFilter) ([]Issue, error) {
	var out []Issue
	if f.Assignee != "" && f.Assignee != "self" {
		return nil, validationf("invalid issue assignee")
	}
	if f.ProjectStatus != "" {
		statuses, err := s.ProjectWorkflowStatuses()
		if err != nil {
			return nil, err
		}
		if !containsProjectWorkflowStatus(statuses, f.ProjectStatus) {
			return nil, validationf("invalid project status")
		}
	}
	if f.ProjectPriority != nil && !domain.ValidPriority(*f.ProjectPriority) {
		return nil, validationf("invalid project priority")
	}
	if utf8.RuneCountInString(f.Content) > 512 {
		return nil, validationf("content filter is too long")
	}
	if utf8.RuneCountInString(f.MilestoneName) > 512 {
		return nil, validationf("milestone name filter is too long")
	}
	if len(f.ProjectLabels) > 32 {
		return nil, validationf("too many project labels in filter")
	}
	for _, name := range f.ProjectLabels {
		if utf8.RuneCountInString(name) > 100 {
			return nil, validationf("project label filter is too long")
		}
	}
	if err := validateAddedToCycle(f.AddedToCycle); err != nil {
		return nil, err
	}
	if !domain.ValidIssueRelationFilter(f.Relation) {
		return nil, validationf("invalid issue relation filter")
	}
	asOf := f.DueDateAsOf
	if f.DueDate != "" && !domain.ValidDueDateFilter(f.DueDate) {
		return nil, validationf("invalid due date filter")
	}
	if asOf != "" && !domain.ValidDate(asOf) {
		return nil, validationf("invalid date filter anchor")
	}
	if asOf == "" {
		asOf = domain.Now()[:10]
	}
	dateAsOf := f.DateAsOf
	if dateAsOf == "" {
		dateAsOf = asOf
	}
	if !domain.ValidIssueDateFilter(f.DateField, f.DateRange) {
		return nil, validationf("invalid issue date filter")
	}
	if dateAsOf != "" && !domain.ValidDate(dateAsOf) {
		return nil, validationf("invalid date filter anchor")
	}
	rangeDays := map[string]int{"tomorrow": 1, "threeDays": 3, "week": 7, "month": 30, "quarter": 90}
	rangeEnd := ""
	if days := rangeDays[f.DueDate]; days > 0 {
		day, err := time.Parse("2006-01-02", asOf)
		if err != nil {
			return nil, validationf("invalid date filter anchor")
		}
		rangeEnd = day.AddDate(0, 0, days).Format("2006-01-02")
	}
	dateRangeDays := map[string]int{"dayAgo": 1, "threeDaysAgo": 3, "weekAgo": 7, "twoWeeksAgo": 14, "monthAgo": 30, "quarterAgo": 90, "halfYearAgo": 180, "yearAgo": 365}
	statusAgeDays := map[string]int{"dayAgo": 1, "weekAgo": 7, "twoWeeksAgo": 14, "monthAgo": 30, "quarterAgo": 90, "halfYearAgo": 180}
	statusAgeAnchor := time.Now().UTC()
	dateRangeStart := ""
	if days := dateRangeDays[f.DateRange]; days > 0 {
		day, err := time.Parse("2006-01-02", dateAsOf)
		if err != nil {
			return nil, validationf("invalid date filter anchor")
		}
		dateRangeStart = day.AddDate(0, 0, -days).Format("2006-01-02")
	}
	customDueDate := strings.TrimPrefix(f.DueDate, "on:")
	err := s.snapshot(func(m *mem) error {
		for _, iss := range m.Issues {
			if f.Assignee != "" && iss.Assignee != f.Assignee {
				continue
			}
			if f.Archived == nil && iss.ArchivedAt != nil {
				continue
			}
			if f.Archived != nil && (*f.Archived != (iss.ArchivedAt != nil)) {
				continue
			}
			if f.DateRange != "" {
				date := ""
				switch f.DateField {
				case "createdAt":
					date = iss.CreatedAt
				case "updatedAt":
					date = iss.UpdatedAt
				case "startedAt":
					if iss.StartedAt != nil {
						date = *iss.StartedAt
					}
				case "completedAt":
					if iss.CompletedAt != nil {
						date = *iss.CompletedAt
					}
				case "timeInCurrentStatus":
					date = iss.StatusChangedAt
				}
				if f.DateField == "timeInCurrentStatus" {
					changedAt, err := time.Parse(time.RFC3339, date)
					if err != nil || changedAt.After(statusAgeAnchor.Add(-time.Duration(statusAgeDays[f.DateRange])*24*time.Hour)) {
						continue
					}
				} else {
					if len(date) > 10 {
						date = date[:10]
					}
					matches := false
					if strings.HasPrefix(f.DateRange, "on:") {
						matches = date == strings.TrimPrefix(f.DateRange, "on:")
					} else if dateRangeStart != "" {
						matches = date != "" && date >= dateRangeStart && date <= dateAsOf
					}
					if !matches {
						continue
					}
				}
			}
			if f.Content != "" {
				needle := strings.ToLower(strings.TrimSpace(f.Content))
				if !strings.Contains(strings.ToLower(iss.Title), needle) &&
					!strings.Contains(strings.ToLower(iss.Identifier), needle) &&
					!strings.Contains(strings.ToLower(iss.Body), needle) {
					continue
				}
			}
			if f.MilestoneName != "" && (iss.MilestoneName == nil || !strings.Contains(strings.ToLower(*iss.MilestoneName), strings.ToLower(strings.TrimSpace(f.MilestoneName)))) {
				continue
			}
			if f.Relation != "" && !matchesIssueRelationFilter(m, iss, f.Relation) {
				continue
			}
			if f.DueDate != "" {
				date := ""
				if iss.DueDate != nil {
					date = *iss.DueDate
					if len(date) > 10 {
						date = date[:10]
					}
				}
				matches := f.DueDate == "none" && date == "" ||
					f.DueDate == "overdue" && date != "" && date < asOf && iss.Status != "done" && iss.Status != "canceled" ||
					f.DueDate == "today" && date == asOf ||
					strings.HasPrefix(f.DueDate, "on:") && date == customDueDate ||
					rangeEnd != "" && date > asOf && date <= rangeEnd
				if !matches {
					continue
				}
			}
			if f.Status != "" && iss.Status != f.Status && iss.WorkflowStatus != f.Status {
				continue
			}
			if f.ProjectSlug != "" && (iss.ProjectSlug == nil || *iss.ProjectSlug != f.ProjectSlug) {
				if iss.ProjectID != nil {
					if p, ok := projectByID(m, *iss.ProjectID); !ok || p.Slug != f.ProjectSlug {
						continue
					}
				} else {
					continue
				}
			}
			if f.ProjectStatus != "" || f.ProjectPriority != nil {
				project, found := Project{}, false
				if iss.ProjectID != nil {
					project, found = projectByID(m, *iss.ProjectID)
				}
				if !found && iss.ProjectSlug != nil {
					for _, candidate := range m.Projects {
						if candidate.Slug == *iss.ProjectSlug {
							project, found = candidate, true
							break
						}
					}
				}
				if !found || (f.ProjectStatus != "" && normalizeProjectWorkflowStatus(project, m.Workspace).WorkflowStatus != f.ProjectStatus && project.Status != f.ProjectStatus) ||
					(f.ProjectPriority != nil && project.Priority != *f.ProjectPriority) {
					continue
				}
			}
			if len(f.ProjectLabels) > 0 {
				project, found := Project{}, false
				if iss.ProjectID != nil {
					project, found = projectByID(m, *iss.ProjectID)
				}
				if !found && iss.ProjectSlug != nil {
					project, found = projectBySlug(m, *iss.ProjectSlug)
				}
				if !found {
					continue
				}
				have := make(map[string]struct{}, len(project.Labels))
				for _, name := range project.Labels {
					have[strings.ToLower(name)] = struct{}{}
				}
				matches := true
				for _, name := range f.ProjectLabels {
					if name == "__none__" {
						if len(have) != 0 {
							matches = false
						}
						continue
					}
					if _, ok := have[strings.ToLower(name)]; !ok {
						matches = false
						break
					}
				}
				if !matches {
					continue
				}
			}
			if f.CycleNumber != 0 {
				ok := iss.CycleNumber != nil && *iss.CycleNumber == f.CycleNumber
				if !ok && iss.CycleID != nil {
					if c, found := cycleByID(m, *iss.CycleID); found && c.Number == f.CycleNumber {
						ok = true
					}
				}
				if !ok {
					continue
				}
			}
			if len(f.AddedToCycle) > 0 {
				phase := addedToCyclePhase(m, iss)
				matches := false
				for _, wanted := range f.AddedToCycle {
					if phase == wanted {
						matches = true
						break
					}
				}
				if !matches {
					continue
				}
			}
			if f.Priority != nil && iss.Priority != *f.Priority {
				continue
			}
			if f.Type != "" && iss.Type != f.Type {
				continue
			}
			if f.Estimate != nil && (iss.Estimate == nil || *iss.Estimate != *f.Estimate) {
				continue
			}
			if f.IsFavorite != nil && iss.IsFavorite != *f.IsFavorite {
				continue
			}
			if len(f.Labels) > 0 {
				have := map[string]struct{}{}
				for _, l := range iss.Labels {
					have[l.Name] = struct{}{}
				}
				ok := true
				for _, name := range f.Labels {
					if _, found := have[name]; !found {
						ok = false
						break
					}
				}
				if !ok {
					continue
				}
			}
			out = append(out, iss)
		}
		if out == nil {
			out = []Issue{}
		}
		out = sortIssueTree(out)
		return nil
	})
	return out, err
}

func validateAddedToCycle(values []string) error {
	if len(values) > 3 {
		return validationf("too many added-to-cycle filters")
	}
	for _, value := range values {
		if value != "planned" && value != "during" && value != "after" {
			return validationf("invalid added-to-cycle filter")
		}
	}
	return nil
}

func addedToCyclePhase(m *mem, issue Issue) string {
	cycle, found := Cycle{}, false
	if issue.CycleID != nil {
		cycle, found = cycleByID(m, *issue.CycleID)
	}
	if !found && issue.CycleNumber != nil {
		cycle, found = cycleByNumber(m, *issue.CycleNumber)
	}
	if !found {
		return ""
	}
	addedAt := issue.CreatedAt
	if issue.CycleAddedAt != nil {
		addedAt = *issue.CycleAddedAt
	}
	added, addedErr := time.Parse(time.RFC3339, addedAt)
	start, startErr := time.Parse(time.RFC3339, cycle.StartsAt)
	end, endErr := time.Parse(time.RFC3339, cycle.EndsAt)
	if addedErr != nil || startErr != nil || endErr != nil {
		return ""
	}
	if added.Before(start) {
		return "planned"
	}
	if added.After(end) {
		return "after"
	}
	return "during"
}

func matchesIssueRelationFilter(m *mem, issue Issue, filter string) bool {
	switch filter {
	case "parent":
		for _, child := range m.Issues {
			if child.ParentID != nil && *child.ParentID == issue.ID {
				return true
			}
		}
		return false
	case "subissue":
		return issue.ParentID != nil
	case "recurring":
		return issue.RecurringSlug != nil
	case "related":
		return len(issue.Relations) > 0
	case "blocked", "blocking", "duplicate":
		for _, relation := range issue.Relations {
			switch filter {
			case "blocked":
				if relation.Kind == "blockedBy" {
					return true
				}
			case "blocking":
				if relation.Kind == "blocks" {
					return true
				}
			case "duplicate":
				if relation.Kind == "duplicateOf" || relation.Kind == "duplicateBy" {
					return true
				}
			}
		}
		return false
	default:
		return false
	}
}

func (s *Store) GetIssue(identifier string) (Issue, error) {
	var iss Issue
	err := s.snapshot(func(m *mem) error {
		got, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		iss = got
		return nil
	})
	return iss, err
}

func (s *Store) CreateIssue(in CreateIssueInput) (Issue, error) {
	in.Title = strings.TrimSpace(in.Title)
	if in.Title == "" {
		return Issue{}, validationf("title required")
	}
	if in.Status == "" {
		in.Status = "backlog"
	}
	if !domain.ValidIssueStatus(in.Status) {
		return Issue{}, validationf("invalid status")
	}
	if !domain.ValidPriority(in.Priority) {
		return Issue{}, validationf("invalid priority")
	}
	if !domain.ValidIssueType(in.Type) {
		return Issue{}, validationf("invalid issue type")
	}
	if !domain.ValidEstimate(in.Estimate) {
		return Issue{}, validationf("invalid estimate")
	}
	if in.Assignee != "" && in.Assignee != "self" {
		return Issue{}, validationf("invalid issue assignee")
	}
	now := domain.Now()
	normalizedLinks, err := normalizeIssueLinks(in.ExternalLinks)
	if err != nil {
		return Issue{}, err
	}
	externalLinks := make([]IssueLink, 0, len(normalizedLinks))
	for index, link := range normalizedLinks {
		externalLinks = append(externalLinks, IssueLink{
			ID: int64(index + 1), URL: link.URL, Title: link.Title, Kind: link.Kind, CreatedAt: now,
		})
	}
	if strings.TrimSpace(in.Body) == "" {
		in.Body = templateBody(s.root, "ISSUE.md", "")
	}
	var out Issue
	err = s.mutate(func(m *mem) error {
		workflowState, ok := resolveIssueWorkflowStatus(m.Workspace, in.Status, in.WorkflowStatus)
		if !ok {
			return validationf("invalid workflow status")
		}
		m.Workspace.IssueCounter++
		n := m.Workspace.IssueCounter
		ident := domain.Ident(m.issuePrefix(), n)
		sort := 1.0
		for _, iss := range m.Issues {
			if iss.SortOrder >= sort {
				sort = iss.SortOrder + 1
			}
		}
		var startedAt *string
		if workflowState.Category == "in_progress" {
			startedAt = &now
		}
		var cycleAddedAt *string
		if in.CycleID != nil {
			if _, ok := cycleByID(m, *in.CycleID); !ok {
				return validationf("cycle not found")
			}
			cycleAddedAt = &now
		}
		out = Issue{
			ID: int64(n), Number: n, Identifier: ident, Title: in.Title, Body: in.Body,
			Status: workflowState.Category, WorkflowStatus: workflowState.ID, Assignee: in.Assignee, Type: in.Type, Priority: in.Priority, Estimate: in.Estimate, ProjectID: in.ProjectID, CycleID: in.CycleID, CycleAddedAt: cycleAddedAt,
			DueDate: in.DueDate, RecurringSlug: in.RecurringSlug, SortOrder: sort, CreatedAt: now, UpdatedAt: now, StatusChangedAt: now,
			StartedAt: startedAt, CompletedAt: completedAt(workflowState.Category, now, nil), Labels: []Label{}, ADRNumbers: []int{}, ExternalLinks: externalLinks, Relations: []IssueRelation{}, Reactions: []string{}, Attachments: []CommentAttachment{},
		}
		if in.MilestoneID != nil {
			p, milestone, ok := milestoneByID(m, *in.MilestoneID)
			if !ok || (in.ProjectID != nil && *in.ProjectID != p.ID) {
				return validationf("milestone must belong to the issue project")
			}
			projectID := p.ID
			projectSlug := p.Slug
			milestoneName := milestone.Name
			out.ProjectID = &projectID
			out.ProjectSlug = &projectSlug
			out.MilestoneID = in.MilestoneID
			out.MilestoneName = &milestoneName
		}
		if in.ProjectID != nil {
			if p, ok := projectByID(m, *in.ProjectID); ok {
				slug := p.Slug
				out.ProjectSlug = &slug
			}
		}
		if in.CycleID != nil {
			if c, ok := cycleByID(m, *in.CycleID); ok {
				num := c.Number
				out.CycleNumber = &num
			}
		}
		if in.ParentID != nil {
			if err := checkIssueParent(m, 0, in.ParentID); err != nil {
				return err
			}
			p, ok := issueByID(m, *in.ParentID)
			if !ok {
				return validationf("parent not found")
			}
			out.ParentID = in.ParentID
			ident := p.Identifier
			out.ParentIdentifier = &ident
		}
		for _, id := range in.LabelIDs {
			if l, ok := labelByID(m, id); ok {
				out.Labels = append(out.Labels, l)
			}
		}
		m.Issues = append(m.Issues, out)
		m.Comments[ident] = []Comment{}
		addActivity(m, "issue", out.ID, "created", map[string]any{"identifier": ident}, now)
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) UpdateIssue(identifier string, in PatchIssueInput) (Issue, error) {
	var out Issue
	err := s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		iss := m.Issues[i]
		if iss.ArchivedAt != nil && !isRestoreOnlyIssuePatch(in) {
			return errf(ErrConflict, "issue is archived")
		}
		oldStatus := iss.Status
		oldWorkflowStatus := iss.WorkflowStatus
		oldAssignee := iss.Assignee
		oldType := iss.Type
		oldEstimate := iss.Estimate
		oldFavorite := iss.IsFavorite
		oldArchived := iss.ArchivedAt != nil
		oldReminderAt := iss.ReminderAt
		oldMilestoneID := iss.MilestoneID
		oldMilestoneName := iss.MilestoneName
		oldCycleID := iss.CycleID
		if in.Title != nil {
			if strings.TrimSpace(*in.Title) == "" {
				return validationf("title required")
			}
			iss.Title = strings.TrimSpace(*in.Title)
		}
		if in.Body != nil {
			iss.Body = *in.Body
		}
		if in.Status != nil {
			if !domain.ValidIssueStatus(*in.Status) {
				return validationf("invalid status")
			}
			workflowState, ok := resolveIssueWorkflowStatus(m.Workspace, *in.Status, "")
			if !ok {
				return validationf("invalid workflow status")
			}
			iss.Status = workflowState.Category
			iss.WorkflowStatus = workflowState.ID
		}
		if in.WorkflowStatus != nil {
			workflowState, ok := workflowStatusByID(m.Workspace, *in.WorkflowStatus)
			if !ok {
				return validationf("invalid workflow status")
			}
			iss.Status = workflowState.Category
			iss.WorkflowStatus = workflowState.ID
		}
		if in.Type != nil {
			if !domain.ValidIssueType(*in.Type) {
				return validationf("invalid issue type")
			}
			iss.Type = *in.Type
		}
		if in.Assignee != nil {
			if *in.Assignee != "" && *in.Assignee != "self" {
				return validationf("invalid issue assignee")
			}
			iss.Assignee = *in.Assignee
		}
		if in.Priority != nil {
			if !domain.ValidPriority(*in.Priority) {
				return validationf("invalid priority")
			}
			iss.Priority = *in.Priority
		}
		if in.Estimate != nil {
			if !domain.ValidEstimate(*in.Estimate) {
				return validationf("invalid estimate")
			}
			iss.Estimate = *in.Estimate
		}
		if in.ProjectID != nil {
			oldProjectID := iss.ProjectID
			iss.ProjectID = *in.ProjectID
			iss.ProjectSlug = nil
			if iss.ProjectID != nil {
				if p, ok := projectByID(m, *iss.ProjectID); ok {
					slug := p.Slug
					iss.ProjectSlug = &slug
				}
			}
			if !sameInt64(oldProjectID, iss.ProjectID) {
				iss.MilestoneID = nil
				iss.MilestoneName = nil
			}
		}
		if in.MilestoneID != nil {
			iss.MilestoneID = *in.MilestoneID
			iss.MilestoneName = nil
			if iss.MilestoneID != nil {
				p, milestone, ok := milestoneByID(m, *iss.MilestoneID)
				if !ok || (iss.ProjectID != nil && *iss.ProjectID != p.ID) {
					return validationf("milestone must belong to the issue project")
				}
				projectID := p.ID
				projectSlug := p.Slug
				milestoneName := milestone.Name
				iss.ProjectID = &projectID
				iss.ProjectSlug = &projectSlug
				iss.MilestoneName = &milestoneName
			}
		}
		if in.CycleID != nil {
			iss.CycleID = *in.CycleID
			iss.CycleNumber = nil
			if iss.CycleID != nil {
				c, ok := cycleByID(m, *iss.CycleID)
				if !ok {
					return validationf("cycle not found")
				}
				n := c.Number
				iss.CycleNumber = &n
			}
		}
		if in.ParentID != nil {
			if err := checkIssueParent(m, iss.ID, *in.ParentID); err != nil {
				return err
			}
			iss.ParentID = *in.ParentID
			iss.ParentIdentifier = nil
			if iss.ParentID != nil {
				if p, ok := issueByID(m, *iss.ParentID); ok {
					ident := p.Identifier
					iss.ParentIdentifier = &ident
				}
			}
		}
		if in.DueDate != nil {
			iss.DueDate = *in.DueDate
		}
		if in.ReminderAt != nil {
			iss.ReminderAt = *in.ReminderAt
			if iss.ReminderAt != nil {
				parsed, err := time.Parse(time.RFC3339, *iss.ReminderAt)
				if err != nil {
					return validationf("invalid reminder date")
				}
				value := parsed.UTC().Format(time.RFC3339)
				iss.ReminderAt = &value
			}
		}
		if in.SortOrder != nil {
			iss.SortOrder = *in.SortOrder
		}
		if in.IsFavorite != nil {
			iss.IsFavorite = *in.IsFavorite
		}
		now := domain.Now()
		if in.Archived != nil && *in.Archived != oldArchived {
			if *in.Archived {
				iss.ArchivedAt = &now
			} else {
				iss.ArchivedAt = nil
			}
		}
		if !sameInt64(oldCycleID, iss.CycleID) {
			if iss.CycleID == nil {
				iss.CycleAddedAt = nil
			} else {
				iss.CycleAddedAt = &now
			}
		}
		if iss.Status != oldStatus || iss.WorkflowStatus != oldWorkflowStatus {
			iss.StatusChangedAt = now
			if iss.Status == "in_progress" && iss.StartedAt == nil {
				iss.StartedAt = &now
			}
		}
		iss.CompletedAt = completedAt(iss.Status, now, iss.CompletedAt)
		iss.UpdatedAt = now
		if in.LabelIDs != nil {
			iss.Labels = []Label{}
			for _, id := range *in.LabelIDs {
				if l, ok := labelByID(m, id); ok {
					iss.Labels = append(iss.Labels, l)
				}
			}
		}
		m.Issues[i] = iss
		if iss.WorkflowStatus != oldWorkflowStatus {
			addActivity(m, "issue", iss.ID, "status_changed", map[string]any{"from": oldWorkflowStatus, "to": iss.WorkflowStatus}, now)
		}
		if in.Type != nil && *in.Type != oldType {
			addActivity(m, "issue", iss.ID, "type_changed", map[string]any{"from": oldType, "to": iss.Type}, now)
		}
		if in.Estimate != nil && !sameEstimate(oldEstimate, iss.Estimate) {
			addActivity(m, "issue", iss.ID, "estimate_changed", map[string]any{"from": oldEstimate, "to": iss.Estimate}, now)
		}
		if oldAssignee != iss.Assignee {
			addActivity(m, "issue", iss.ID, "assignee_changed", map[string]any{"from": oldAssignee, "to": iss.Assignee}, now)
		}
		if in.IsFavorite != nil && oldFavorite != iss.IsFavorite {
			addActivity(m, "issue", iss.ID, "favorite_changed", map[string]any{"favorite": iss.IsFavorite}, now)
		}
		if in.Archived != nil && oldArchived != *in.Archived {
			action := "archived"
			if !*in.Archived {
				action = "unarchived"
			}
			addActivity(m, "issue", iss.ID, action, map[string]any{}, now)
		}
		if !sameString(oldReminderAt, iss.ReminderAt) {
			from, to := "", ""
			if oldReminderAt != nil {
				from = *oldReminderAt
			}
			if iss.ReminderAt != nil {
				to = *iss.ReminderAt
			}
			addActivity(m, "issue", iss.ID, "reminder_changed", map[string]any{"from": from, "to": to}, now)
		}
		if !sameInt64(oldMilestoneID, iss.MilestoneID) {
			from, to := "", ""
			if oldMilestoneName != nil {
				from = *oldMilestoneName
			}
			if iss.MilestoneName != nil {
				to = *iss.MilestoneName
			}
			addActivity(m, "issue", iss.ID, "milestone_changed", map[string]any{"from": from, "to": to}, now)
		}
		m.bump(now)
		out = iss
		return nil
	})
	return out, err
}

func (s *Store) DeleteIssue(identifier string) error {
	var attachmentIDs []string
	err := s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		deletedID := m.Issues[i].ID
		deletedNum := m.Issues[i].Number
		deletedIdentifier := m.Issues[i].Identifier
		for _, comment := range m.Comments[deletedIdentifier] {
			for _, attachment := range comment.Attachments {
				attachmentIDs = append(attachmentIDs, attachment.ID)
			}
		}
		for _, attachment := range m.Issues[i].Attachments {
			attachmentIDs = append(attachmentIDs, attachment.ID)
		}
		m.Issues = append(m.Issues[:i], m.Issues[i+1:]...)
		delete(m.Comments, identifier)
		for j := range m.Issues {
			relations := m.Issues[j].Relations[:0]
			for _, relation := range m.Issues[j].Relations {
				if relation.TargetIdentifier != deletedIdentifier {
					relations = append(relations, relation)
				}
			}
			m.Issues[j].Relations = relations
			if m.Issues[j].ParentID != nil && *m.Issues[j].ParentID == deletedID {
				m.Issues[j].ParentID = nil
				m.Issues[j].ParentIdentifier = nil
			}
		}
		for j := range m.ADRs {
			m.ADRs[j].IssueNumbers = removeInt(m.ADRs[j].IssueNumbers, deletedNum)
		}
		m.bump(domain.Now())
		return nil
	})
	if err != nil {
		return err
	}
	for _, attachmentID := range attachmentIDs {
		_ = s.DeleteCommentAttachment(attachmentID)
	}
	return nil
}

func (s *Store) AddIssueLink(identifier string, in CreateIssueLinkInput) (IssueLink, error) {
	var err error
	in, err = normalizeIssueLink(in)
	if err != nil {
		return IssueLink{}, err
	}
	var out IssueLink
	err = s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		iss := m.Issues[i]
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		for _, existing := range iss.ExternalLinks {
			if existing.URL == in.URL {
				return errf(ErrConflict, "link already exists")
			}
		}
		var id int64 = 1
		for _, existing := range iss.ExternalLinks {
			if existing.ID >= id {
				id = existing.ID + 1
			}
		}
		now := domain.Now()
		out = IssueLink{ID: id, URL: in.URL, Title: in.Title, Kind: in.Kind, CreatedAt: now}
		iss.ExternalLinks = append(iss.ExternalLinks, out)
		iss.UpdatedAt = now
		m.Issues[i] = iss
		addActivity(m, "issue", iss.ID, "link_added", map[string]any{"url": out.URL, "title": out.Title, "kind": out.Kind}, now)
		m.bump(now)
		return nil
	})
	return out, err
}

func normalizeIssueLink(in CreateIssueLinkInput) (CreateIssueLinkInput, error) {
	in.URL = strings.TrimSpace(in.URL)
	in.Title = strings.TrimSpace(in.Title)
	in.Kind = strings.TrimSpace(in.Kind)
	parsed, err := url.Parse(in.URL)
	if err != nil || !parsed.IsAbs() || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return CreateIssueLinkInput{}, validationf("link URL must be an absolute http or https URL")
	}
	if in.Kind == "" {
		in.Kind = "link"
	}
	if in.Kind != "link" && in.Kind != "pullRequest" && in.Kind != "document" {
		return CreateIssueLinkInput{}, validationf("invalid link kind")
	}
	return in, nil
}

func normalizeIssueLinks(inputs []CreateIssueLinkInput) ([]CreateIssueLinkInput, error) {
	links := make([]CreateIssueLinkInput, 0, len(inputs))
	seen := make(map[string]struct{}, len(inputs))
	for _, input := range inputs {
		link, err := normalizeIssueLink(input)
		if err != nil {
			return nil, err
		}
		if _, exists := seen[link.URL]; exists {
			return nil, errf(ErrConflict, "link already exists")
		}
		seen[link.URL] = struct{}{}
		links = append(links, link)
	}
	return links, nil
}

func (s *Store) RemoveIssueLink(identifier string, linkID int64) error {
	if linkID < 1 {
		return validationf("invalid link id")
	}
	return s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		iss := m.Issues[i]
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		for index, link := range iss.ExternalLinks {
			if link.ID != linkID {
				continue
			}
			iss.ExternalLinks = append(iss.ExternalLinks[:index], iss.ExternalLinks[index+1:]...)
			now := domain.Now()
			iss.UpdatedAt = now
			m.Issues[i] = iss
			addActivity(m, "issue", iss.ID, "link_removed", map[string]any{"url": link.URL, "title": link.Title, "kind": link.Kind}, now)
			m.bump(now)
			return nil
		}
		return ErrNotFound
	})
}

func (s *Store) ListComments(identifier string) ([]Comment, error) {
	var out []Comment
	err := s.snapshot(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		out = append([]Comment{}, m.Comments[iss.Identifier]...)
		if out == nil {
			out = []Comment{}
		}
		return nil
	})
	return out, err
}

func (s *Store) AddComment(identifier, body string) (Comment, error) {
	return s.AddCommentWithAttachments(identifier, body, nil)
}

func (s *Store) AddCommentWithAttachments(identifier, body string, attachments []CommentAttachment) (Comment, error) {
	body = strings.TrimSpace(body)
	if body == "" && len(attachments) == 0 {
		return Comment{}, validationf("body required")
	}
	if len(attachments) > 10 {
		return Comment{}, validationf("too many comment attachments")
	}
	seen := make(map[string]struct{}, len(attachments))
	for _, attachment := range attachments {
		mediaType, _, err := mime.ParseMediaType(attachment.MediaType)
		if !validCommentAttachmentID(attachment.ID) || attachment.Name == "" || len([]rune(attachment.Name)) > 255 ||
			strings.ContainsAny(attachment.Name, "/\\") || err != nil || mediaType == "" || attachment.Size <= 0 || attachment.Size > 20<<20 {
			return Comment{}, validationf("invalid comment attachment")
		}
		if _, ok := seen[attachment.ID]; ok {
			return Comment{}, validationf("duplicate comment attachment")
		}
		seen[attachment.ID] = struct{}{}
	}
	var out Comment
	err := s.mutate(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		now := domain.Now()
		identifier = iss.Identifier
		m.commentSeq[identifier]++
		out = Comment{
			ID: m.commentSeq[identifier], IssueID: iss.ID, Body: body, CreatedAt: now,
			Attachments: append([]CommentAttachment{}, attachments...), Reactions: []string{},
		}
		m.Comments[identifier] = append(m.Comments[identifier], out)
		addActivity(m, "issue", iss.ID, "commented", map[string]any{"commentId": out.ID}, now)
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) UpdateComment(identifier string, commentID int64, body string) (Comment, error) {
	body = strings.TrimSpace(body)
	if commentID < 1 {
		return Comment{}, validationf("invalid comment id")
	}
	var out Comment
	err := s.mutate(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		comments := m.Comments[iss.Identifier]
		for i := range comments {
			if comments[i].ID != commentID {
				continue
			}
			if body == "" && len(comments[i].Attachments) == 0 {
				return validationf("body required")
			}
			comments[i].Body = body
			comments[i].UpdatedAt = domain.Now()
			m.Comments[iss.Identifier] = comments
			addActivity(m, "issue", iss.ID, "comment_edited", map[string]any{"commentId": commentID}, comments[i].UpdatedAt)
			m.bump(comments[i].UpdatedAt)
			out = comments[i]
			return nil
		}
		return ErrNotFound
	})
	return out, err
}

func toggleReaction(current []string, emoji string) ([]string, bool) {
	for i, existing := range current {
		if existing == emoji {
			return append(append([]string{}, current[:i]...), current[i+1:]...), false
		}
	}
	return append(append([]string{}, current...), emoji), true
}

func (s *Store) ToggleIssueReaction(identifier, emoji string) (Issue, error) {
	if !validReactionEmoji(emoji) {
		return Issue{}, validationf("invalid reaction")
	}
	var out Issue
	err := s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		iss := m.Issues[i]
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		reactions, added := toggleReaction(iss.Reactions, emoji)
		iss.Reactions = reactions
		now := domain.Now()
		iss.UpdatedAt = now
		m.Issues[i] = iss
		action := "reaction_removed"
		if added {
			action = "reaction_added"
		}
		addActivity(m, "issue", iss.ID, action, map[string]any{"emoji": emoji}, now)
		m.bump(now)
		out = iss
		return nil
	})
	return out, err
}

func (s *Store) AddIssueAttachments(identifier string, attachments []CommentAttachment) ([]CommentAttachment, error) {
	if len(attachments) == 0 || len(attachments) > 10 {
		return nil, validationf("invalid issue attachment count")
	}
	seen := make(map[string]struct{}, len(attachments))
	for _, attachment := range attachments {
		if !validCommentAttachmentID(attachment.ID) || attachment.Name == "" || len([]rune(attachment.Name)) > 255 ||
			attachment.MediaType == "" || attachment.Size < 1 || attachment.Size > 20<<20 {
			return nil, validationf("invalid issue attachment")
		}
		if _, ok := seen[attachment.ID]; ok {
			return nil, validationf("duplicate issue attachment")
		}
		seen[attachment.ID] = struct{}{}
	}
	var out []CommentAttachment
	err := s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		iss := m.Issues[i]
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		for _, comment := range m.Comments[iss.Identifier] {
			for _, attachment := range comment.Attachments {
				if _, ok := seen[attachment.ID]; ok {
					return validationf("duplicate issue attachment")
				}
			}
		}
		for _, attachment := range iss.Attachments {
			if _, ok := seen[attachment.ID]; ok {
				return validationf("duplicate issue attachment")
			}
		}
		iss.Attachments = append(append([]CommentAttachment{}, iss.Attachments...), attachments...)
		now := domain.Now()
		iss.UpdatedAt = now
		m.Issues[i] = iss
		addActivity(m, "issue", iss.ID, "attachment_added", map[string]any{"count": len(attachments)}, now)
		m.bump(now)
		out = append([]CommentAttachment{}, iss.Attachments...)
		return nil
	})
	return out, err
}

func (s *Store) DeleteIssueAttachment(identifier, attachmentID string) error {
	err := s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		iss := m.Issues[i]
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		for index, attachment := range iss.Attachments {
			if attachment.ID != attachmentID {
				continue
			}
			iss.Attachments = append(iss.Attachments[:index], iss.Attachments[index+1:]...)
			now := domain.Now()
			iss.UpdatedAt = now
			m.Issues[i] = iss
			addActivity(m, "issue", iss.ID, "attachment_removed", map[string]any{"name": attachment.Name}, now)
			m.bump(now)
			return nil
		}
		return ErrNotFound
	})
	if err != nil {
		return err
	}
	return s.DeleteCommentAttachment(attachmentID)
}

func (s *Store) ToggleCommentReaction(identifier string, commentID int64, emoji string) (Comment, error) {
	if commentID < 1 {
		return Comment{}, validationf("invalid comment id")
	}
	if !validReactionEmoji(emoji) {
		return Comment{}, validationf("invalid reaction")
	}
	var out Comment
	err := s.mutate(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		comments := m.Comments[iss.Identifier]
		for i := range comments {
			if comments[i].ID != commentID {
				continue
			}
			reactions, added := toggleReaction(comments[i].Reactions, emoji)
			comments[i].Reactions = reactions
			m.Comments[iss.Identifier] = comments
			action := "comment_reaction_removed"
			if added {
				action = "comment_reaction_added"
			}
			now := domain.Now()
			addActivity(m, "issue", iss.ID, action, map[string]any{"commentId": commentID, "emoji": emoji}, now)
			m.bump(now)
			out = comments[i]
			return nil
		}
		return ErrNotFound
	})
	return out, err
}

func (s *Store) DeleteComment(identifier string, commentID int64) error {
	if commentID < 1 {
		return validationf("invalid comment id")
	}
	var attachmentIDs []string
	err := s.mutate(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		comments := m.Comments[iss.Identifier]
		for i, comment := range comments {
			if comment.ID != commentID {
				continue
			}
			for _, attachment := range comment.Attachments {
				attachmentIDs = append(attachmentIDs, attachment.ID)
			}
			m.Comments[iss.Identifier] = append(comments[:i], comments[i+1:]...)
			now := domain.Now()
			addActivity(m, "issue", iss.ID, "comment_deleted", map[string]any{"commentId": commentID}, now)
			m.bump(now)
			return nil
		}
		return ErrNotFound
	})
	if err != nil {
		return err
	}
	for _, attachmentID := range attachmentIDs {
		_ = s.DeleteCommentAttachment(attachmentID)
	}
	return nil
}

func (s *Store) GetCommentAttachment(identifier, attachmentID string) (CommentAttachment, error) {
	var out CommentAttachment
	err := s.snapshot(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		for _, attachment := range iss.Attachments {
			if attachment.ID == attachmentID {
				out = attachment
				return nil
			}
		}
		for _, comment := range m.Comments[iss.Identifier] {
			for _, attachment := range comment.Attachments {
				if attachment.ID == attachmentID {
					out = attachment
					return nil
				}
			}
		}
		return ErrNotFound
	})
	return out, err
}

func (s *Store) ListActivities(identifier string) ([]Activity, error) {
	var out []Activity
	err := s.snapshot(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		out = []Activity{}
		for i := len(m.Activities) - 1; i >= 0; i-- {
			a := m.Activities[i]
			if a.EntityType == "issue" && a.EntityID == iss.ID {
				out = append(out, a)
			}
		}
		return nil
	})
	return out, err
}

// ListCycleActivities returns status history for the issues currently assigned
// to a cycle, newest first. The cycle progress view uses this to reconstruct
// how work moved through the cycle without loading one activity feed per issue.
func (s *Store) ListCycleActivities(number int) ([]Activity, error) {
	var out []Activity
	err := s.snapshot(func(m *mem) error {
		cycle, ok := cycleByNumber(m, number)
		if !ok {
			return ErrNotFound
		}
		issueIDs := make(map[int64]struct{})
		for _, issue := range m.Issues {
			if (issue.CycleID != nil && *issue.CycleID == cycle.ID) ||
				(issue.CycleNumber != nil && *issue.CycleNumber == cycle.Number) {
				issueIDs[issue.ID] = struct{}{}
			}
		}
		out = []Activity{}
		for i := len(m.Activities) - 1; i >= 0; i-- {
			activity := m.Activities[i]
			if activity.EntityType != "issue" || activity.Action != "status_changed" {
				continue
			}
			if _, inCycle := issueIDs[activity.EntityID]; inCycle {
				out = append(out, activity)
			}
		}
		return nil
	})
	return out, err
}

func (s *Store) ListProjectActivities(slug string) ([]Activity, error) {
	var out []Activity
	err := s.snapshot(func(m *mem) error {
		i := indexProject(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		projectID := m.Projects[i].ID
		out = []Activity{}
		for i := len(m.Activities) - 1; i >= 0; i-- {
			activity := m.Activities[i]
			if activity.EntityType == "project" && activity.EntityID == projectID {
				out = append(out, activity)
			}
		}
		return nil
	})
	return out, err
}

func (s *Store) ListPages() ([]Page, error) {
	var out []Page
	err := s.snapshot(func(m *mem) error {
		out = append([]Page{}, m.Pages...)
		if out == nil {
			out = []Page{}
		}
		return nil
	})
	return out, err
}

func (s *Store) GetPage(slug string) (Page, error) {
	var p Page
	err := s.snapshot(func(m *mem) error {
		got, ok := pageBySlug(m, slug)
		if !ok {
			return ErrNotFound
		}
		p = got
		return nil
	})
	return p, err
}

func (s *Store) CreatePage(title, slug, body, status string, parentID, projectID *int64, date *string, tags []string) (Page, error) {
	title = strings.TrimSpace(title)
	slug = strings.TrimSpace(slug)
	if title == "" {
		return Page{}, validationf("title required")
	}
	if !domain.ValidSlug(slug) {
		return Page{}, validationf("invalid slug")
	}
	if status == "" {
		status = "proposed"
	}
	if !domain.ValidPageStatus(status) {
		return Page{}, validationf("invalid status")
	}
	if tags == nil {
		tags = []string{}
	}
	now := domain.Now()
	var out Page
	err := s.mutate(func(m *mem) error {
		if _, ok := pageBySlug(m, slug); ok {
			return errf(ErrConflict, "slug")
		}
		if err := checkPageParent(m, 0, parentID); err != nil {
			return err
		}
		out = Page{
			ID: m.nextID(), Title: title, Slug: slug, Body: body, ParentID: parentID, ProjectID: projectID,
			Status: status, Date: date, Tags: tags, CreatedAt: now, UpdatedAt: now,
		}
		if parentID != nil {
			if parent, ok := pageByID(m, *parentID); ok {
				ps := parent.Slug
				out.ParentSlug = &ps
			}
		}
		if projectID != nil {
			if proj, ok := projectByID(m, *projectID); ok {
				ps := proj.Slug
				out.ProjectSlug = &ps
			}
		}
		m.Pages = append(m.Pages, out)
		addActivity(m, "page", out.ID, "created", map[string]any{"slug": slug}, now)
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) UpdatePage(slug string, title, body, status *string, parentID, projectID **int64, date **string, tags *[]string) (Page, error) {
	var out Page
	err := s.mutate(func(m *mem) error {
		i := indexPage(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		p := m.Pages[i]
		if title != nil {
			if strings.TrimSpace(*title) == "" {
				return validationf("title required")
			}
			p.Title = strings.TrimSpace(*title)
		}
		if body != nil {
			p.Body = *body
		}
		if status != nil {
			if !domain.ValidPageStatus(*status) {
				return validationf("invalid status")
			}
			p.Status = *status
		}
		if parentID != nil {
			if err := checkPageParent(m, p.ID, *parentID); err != nil {
				return err
			}
			p.ParentID = *parentID
			p.ParentSlug = nil
			if p.ParentID != nil {
				if parent, ok := pageByID(m, *p.ParentID); ok {
					ps := parent.Slug
					p.ParentSlug = &ps
				}
			}
		}
		if projectID != nil {
			p.ProjectID = *projectID
			p.ProjectSlug = nil
			if p.ProjectID != nil {
				if proj, ok := projectByID(m, *p.ProjectID); ok {
					ps := proj.Slug
					p.ProjectSlug = &ps
				}
			}
		}
		if date != nil {
			p.Date = *date
		}
		if tags != nil {
			p.Tags = *tags
		}
		now := domain.Now()
		p.UpdatedAt = now
		m.Pages[i] = p
		m.bump(now)
		out = p
		return nil
	})
	return out, err
}

func (s *Store) DeletePage(slug string) error {
	return s.mutate(func(m *mem) error {
		i := indexPage(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		m.Pages = append(m.Pages[:i], m.Pages[i+1:]...)
		m.bump(domain.Now())
		return nil
	})
}

func checkPageParent(m *mem, pageID int64, parentID *int64) error {
	if parentID == nil {
		return nil
	}
	if *parentID == pageID && pageID != 0 {
		return validationf("page cannot be its own parent")
	}
	cur := *parentID
	seen := map[int64]struct{}{pageID: {}}
	for cur != 0 {
		if _, ok := seen[cur]; ok {
			return validationf("page parent cycle")
		}
		seen[cur] = struct{}{}
		p, ok := pageByID(m, cur)
		if !ok {
			return validationf("parent not found")
		}
		if p.ParentID == nil {
			return nil
		}
		cur = *p.ParentID
	}
	return nil
}

func checkIssueParent(m *mem, issueID int64, parentID *int64) error {
	if parentID == nil {
		return nil
	}
	if *parentID == issueID && issueID != 0 {
		return validationf("issue cannot be its own parent")
	}
	if _, ok := issueByID(m, *parentID); !ok && issueID != 0 {
		return validationf("parent not found")
	}
	cur := *parentID
	seen := map[int64]struct{}{issueID: {}}
	for cur != 0 {
		if _, ok := seen[cur]; ok {
			return validationf("issue parent cycle")
		}
		seen[cur] = struct{}{}
		iss, ok := issueByID(m, cur)
		if !ok {
			return validationf("parent not found")
		}
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		if iss.ParentID == nil {
			return nil
		}
		cur = *iss.ParentID
	}
	return nil
}

func sortIssueTree(issues []Issue) []Issue {
	ids := map[int64]struct{}{}
	children := map[int64][]Issue{}
	var roots []Issue
	for _, iss := range issues {
		ids[iss.ID] = struct{}{}
	}
	for _, iss := range issues {
		if iss.ParentID != nil {
			if _, ok := ids[*iss.ParentID]; ok {
				children[*iss.ParentID] = append(children[*iss.ParentID], iss)
				continue
			}
		}
		roots = append(roots, iss)
	}
	bySort := func(a, b Issue) bool { return a.SortOrder < b.SortOrder }
	sort.SliceStable(roots, func(i, j int) bool { return bySort(roots[i], roots[j]) })
	for id, kids := range children {
		sort.SliceStable(kids, func(i, j int) bool { return bySort(kids[i], kids[j]) })
		children[id] = kids
	}
	out := make([]Issue, 0, len(issues))
	var walk func(Issue, int)
	walk = func(iss Issue, depth int) {
		iss.Depth = depth
		out = append(out, iss)
		for _, c := range children[iss.ID] {
			walk(c, depth+1)
		}
	}
	for _, r := range roots {
		walk(r, 0)
	}
	return out
}

func (s *Store) ListViews() ([]View, error) {
	var out []View
	err := s.snapshot(func(m *mem) error {
		out = append([]View{}, m.Views...)
		if out == nil {
			out = []View{}
		}
		return nil
	})
	return out, err
}

func (s *Store) GetView(slug string) (View, error) {
	var v View
	err := s.snapshot(func(m *mem) error {
		got, ok := viewBySlug(m, slug)
		if !ok {
			return ErrNotFound
		}
		v = got
		return nil
	})
	return v, err
}

func validViewIcon(icon string) bool {
	switch icon {
	case "list", "circle", "bolt", "target", "bug", "rocket", "bookmark", "flag", "star", "sparkles", "chart", "calendar":
		return true
	default:
		return false
	}
}

func (s *Store) CreateView(in CreateViewInput) (View, error) {
	in.Name = strings.TrimSpace(in.Name)
	in.Slug = strings.TrimSpace(in.Slug)
	description := ""
	if in.Description != nil {
		description = strings.TrimSpace(*in.Description)
		if utf8.RuneCountInString(description) > 1000 {
			return View{}, validationf("view description is too long")
		}
	}
	icon := "list"
	if in.Icon != nil && *in.Icon != "" {
		icon = *in.Icon
	}
	if !validViewIcon(icon) {
		return View{}, validationf("invalid view icon")
	}
	if in.Name == "" {
		return View{}, validationf("name required")
	}
	if !domain.ValidSlug(in.Slug) {
		return View{}, validationf("invalid slug")
	}
	if in.Display == "" {
		in.Display = "list"
	}
	if !domain.ValidViewDisplay(in.Display) {
		return View{}, validationf("invalid display")
	}
	if in.GroupBy == "" {
		in.GroupBy = "priority"
	}
	if !domain.ValidViewGroupBy(in.GroupBy) {
		return View{}, validationf("invalid group by")
	}
	if in.OrderBy == "" {
		in.OrderBy = "manual"
	}
	if !domain.ValidViewOrderBy(in.OrderBy) {
		return View{}, validationf("invalid order by")
	}
	if in.SubGroupBy == "" {
		in.SubGroupBy = "none"
	}
	if !domain.ValidViewGroupBy(in.SubGroupBy) {
		return View{}, validationf("invalid sub-group by")
	}
	if in.Direction == "" {
		in.Direction = "asc"
	}
	if !domain.ValidViewDirection(in.Direction) {
		return View{}, validationf("invalid order direction")
	}
	if in.CompletedIssues == "" {
		in.CompletedIssues = "all"
	}
	if !domain.ValidCompletedIssues(in.CompletedIssues) {
		return View{}, validationf("invalid completed issues filter")
	}
	if in.NestedSubIssues == "" {
		in.NestedSubIssues = "showMatching"
	}
	if !domain.ValidNestedSubIssues(in.NestedSubIssues) {
		return View{}, validationf("invalid nested sub-issues mode")
	}
	if in.Status != nil && *in.Status != "" && !domain.ValidIssueStatus(*in.Status) {
		return View{}, validationf("invalid status")
	}
	if in.Priority != nil && !domain.ValidPriority(*in.Priority) {
		return View{}, validationf("invalid priority")
	}
	if in.Type != nil && !domain.ValidIssueType(*in.Type) {
		return View{}, validationf("invalid issue type")
	}
	if !domain.ValidEstimate(in.Estimate) {
		return View{}, validationf("invalid estimate")
	}
	if in.DueDate != nil && !domain.ValidDueDateFilter(*in.DueDate) {
		return View{}, validationf("invalid due date filter")
	}
	if in.Relation != nil && !domain.ValidIssueRelationFilter(*in.Relation) {
		return View{}, validationf("invalid issue relation filter")
	}
	if in.ProjectStatus != nil && *in.ProjectStatus != "" {
		statuses, err := s.ProjectWorkflowStatuses()
		if err != nil {
			return View{}, err
		}
		if !containsProjectWorkflowStatus(statuses, *in.ProjectStatus) {
			return View{}, validationf("invalid project status")
		}
	}
	if in.ProjectPriority != nil && !domain.ValidPriority(*in.ProjectPriority) {
		return View{}, validationf("invalid project priority")
	}
	if in.Content != nil {
		content := *in.Content
		if utf8.RuneCountInString(content) > 512 {
			return View{}, validationf("content filter is too long")
		}
		if strings.TrimSpace(content) == "" {
			in.Content = nil
		}
	}
	if in.MilestoneName != nil {
		milestoneName := *in.MilestoneName
		if utf8.RuneCountInString(milestoneName) > 512 {
			return View{}, validationf("milestone name filter is too long")
		}
		if strings.TrimSpace(milestoneName) == "" {
			in.MilestoneName = nil
		}
	}
	if len(in.ProjectLabels) > 32 {
		return View{}, validationf("too many project labels in filter")
	}
	if err := validateAddedToCycle(in.AddedToCycle); err != nil {
		return View{}, err
	}
	for _, name := range in.ProjectLabels {
		if utf8.RuneCountInString(name) > 100 {
			return View{}, validationf("project label filter is too long")
		}
	}
	dateField, dateRange := "", ""
	if in.DateField != nil {
		dateField = *in.DateField
	}
	if in.DateRange != nil {
		dateRange = *in.DateRange
	}
	if !domain.ValidIssueDateFilter(dateField, dateRange) {
		return View{}, validationf("invalid issue date filter")
	}
	for _, property := range in.DisplayProperties {
		if !domain.ValidDisplayProperty(property) {
			return View{}, validationf("invalid display property")
		}
	}
	if in.ShowSubIssues == nil {
		showSubIssues := true
		in.ShowSubIssues = &showSubIssues
	}
	if in.DisplayProperties == nil {
		in.DisplayProperties = []string{"id", "status", "priority", "project", "dueDate", "milestone", "cycle", "estimate", "labels", "links", "pullRequests"}
	}
	now := domain.Now()
	var out View
	err := s.mutate(func(m *mem) error {
		if _, ok := viewBySlug(m, in.Slug); ok {
			return errf(ErrConflict, "slug %q exists", in.Slug)
		}
		out = View{
			ID: m.nextID(), Name: in.Name, Slug: in.Slug, Description: description, Icon: icon, Display: in.Display,
			GroupBy: in.GroupBy, SubGroupBy: in.SubGroupBy, OrderBy: in.OrderBy, Direction: in.Direction,
			CompletedIssues: in.CompletedIssues, ShowSubIssues: in.ShowSubIssues, NestedSubIssues: in.NestedSubIssues,
			ShowEmptyGroups: in.ShowEmptyGroups != nil && *in.ShowEmptyGroups, DisplayProperties: in.DisplayProperties,
			Status: in.Status, Project: in.Project, Cycle: in.Cycle, Labels: in.Labels,
			Priority: in.Priority, Type: in.Type, Estimate: in.Estimate, Relation: in.Relation, Content: in.Content, DateField: dateField, DateRange: dateRange,
			ProjectStatus: in.ProjectStatus, ProjectPriority: in.ProjectPriority, ProjectLabels: in.ProjectLabels, AddedToCycle: in.AddedToCycle, MilestoneName: in.MilestoneName, CreatedAt: now, UpdatedAt: now,
		}
		if in.DueDate != nil {
			out.DueDate = *in.DueDate
		}
		if out.Labels == nil {
			out.Labels = []string{}
		}
		if out.ProjectLabels == nil {
			out.ProjectLabels = []string{}
		}
		if out.AddedToCycle == nil {
			out.AddedToCycle = []string{}
		}
		m.Views = append(m.Views, out)
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) UpdateView(slug string, in CreateViewInput) (View, error) {
	var out View
	err := s.mutate(func(m *mem) error {
		i := indexView(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		v := m.Views[i]
		if name := strings.TrimSpace(in.Name); name != "" {
			v.Name = name
		}
		if in.Description != nil {
			description := strings.TrimSpace(*in.Description)
			if utf8.RuneCountInString(description) > 1000 {
				return validationf("view description is too long")
			}
			v.Description = description
		}
		if in.Icon != nil {
			icon := *in.Icon
			if icon == "" {
				icon = "list"
			}
			if !validViewIcon(icon) {
				return validationf("invalid view icon")
			}
			v.Icon = icon
		}
		if in.Display != "" {
			if !domain.ValidViewDisplay(in.Display) {
				return validationf("invalid display")
			}
			v.Display = in.Display
		}
		if in.GroupBy != "" {
			if !domain.ValidViewGroupBy(in.GroupBy) {
				return validationf("invalid group by")
			}
			v.GroupBy = in.GroupBy
		}
		if in.OrderBy != "" {
			if !domain.ValidViewOrderBy(in.OrderBy) {
				return validationf("invalid order by")
			}
			v.OrderBy = in.OrderBy
		}
		if in.SubGroupBy != "" {
			if !domain.ValidViewGroupBy(in.SubGroupBy) {
				return validationf("invalid sub-group by")
			}
			v.SubGroupBy = in.SubGroupBy
		}
		if in.Direction != "" {
			if !domain.ValidViewDirection(in.Direction) {
				return validationf("invalid order direction")
			}
			v.Direction = in.Direction
		}
		if in.CompletedIssues != "" {
			if !domain.ValidCompletedIssues(in.CompletedIssues) {
				return validationf("invalid completed issues filter")
			}
			v.CompletedIssues = in.CompletedIssues
		}
		if in.ShowSubIssues != nil {
			v.ShowSubIssues = in.ShowSubIssues
		}
		if in.NestedSubIssues != "" {
			if !domain.ValidNestedSubIssues(in.NestedSubIssues) {
				return validationf("invalid nested sub-issues mode")
			}
			v.NestedSubIssues = in.NestedSubIssues
		}
		if in.ShowEmptyGroups != nil {
			v.ShowEmptyGroups = *in.ShowEmptyGroups
		}
		if in.DisplayProperties != nil {
			for _, property := range in.DisplayProperties {
				if !domain.ValidDisplayProperty(property) {
					return validationf("invalid display property")
				}
			}
			v.DisplayProperties = in.DisplayProperties
		}
		if in.Status != nil {
			if *in.Status == "" {
				v.Status = nil
			} else {
				if !domain.ValidIssueStatus(*in.Status) {
					return validationf("invalid status")
				}
				v.Status = in.Status
			}
		}
		if in.Project != nil {
			if *in.Project == "" {
				v.Project = nil
			} else {
				v.Project = in.Project
			}
		}
		if in.Cycle != nil {
			if *in.Cycle == 0 {
				v.Cycle = nil
			} else {
				v.Cycle = in.Cycle
			}
		}
		if in.Labels != nil {
			v.Labels = in.Labels
		}
		if in.ProjectLabels != nil {
			if len(in.ProjectLabels) > 32 {
				return validationf("too many project labels in filter")
			}
			for _, name := range in.ProjectLabels {
				if utf8.RuneCountInString(name) > 100 {
					return validationf("project label filter is too long")
				}
			}
			v.ProjectLabels = in.ProjectLabels
		}
		if in.AddedToCycle != nil {
			if err := validateAddedToCycle(in.AddedToCycle); err != nil {
				return err
			}
			v.AddedToCycle = in.AddedToCycle
		}
		if in.Priority != nil {
			if *in.Priority < 0 {
				v.Priority = nil
			} else {
				if !domain.ValidPriority(*in.Priority) {
					return validationf("invalid priority")
				}
				v.Priority = in.Priority
			}
		}
		if in.Type != nil {
			if *in.Type == "" {
				v.Type = nil
			} else {
				if !domain.ValidIssueType(*in.Type) {
					return validationf("invalid issue type")
				}
				v.Type = in.Type
			}
		}
		if in.Estimate != nil {
			if *in.Estimate < 0 {
				v.Estimate = nil
			} else {
				if !domain.ValidEstimate(in.Estimate) {
					return validationf("invalid estimate")
				}
				v.Estimate = in.Estimate
			}
		}
		if in.DueDate != nil {
			if !domain.ValidDueDateFilter(*in.DueDate) {
				return validationf("invalid due date filter")
			}
			v.DueDate = *in.DueDate
		}
		if in.Relation != nil {
			if !domain.ValidIssueRelationFilter(*in.Relation) {
				return validationf("invalid issue relation filter")
			}
			if *in.Relation == "" {
				v.Relation = nil
			} else {
				v.Relation = in.Relation
			}
		}
		if in.Content != nil {
			content := *in.Content
			if utf8.RuneCountInString(content) > 512 {
				return validationf("content filter is too long")
			}
			if strings.TrimSpace(content) == "" {
				v.Content = nil
			} else {
				v.Content = &content
			}
		}
		if in.MilestoneName != nil {
			milestoneName := *in.MilestoneName
			if utf8.RuneCountInString(milestoneName) > 512 {
				return validationf("milestone name filter is too long")
			}
			if strings.TrimSpace(milestoneName) == "" {
				v.MilestoneName = nil
			} else {
				v.MilestoneName = &milestoneName
			}
		}
		if in.DateField != nil || in.DateRange != nil {
			dateField, dateRange := v.DateField, v.DateRange
			if in.DateField != nil {
				dateField = *in.DateField
			}
			if in.DateRange != nil {
				dateRange = *in.DateRange
			}
			if !domain.ValidIssueDateFilter(dateField, dateRange) {
				return validationf("invalid issue date filter")
			}
			v.DateField, v.DateRange = dateField, dateRange
		}
		if in.ProjectStatus != nil {
			if *in.ProjectStatus == "" {
				v.ProjectStatus = nil
			} else {
				if _, exists := projectWorkflowStatusByID(m.Workspace, *in.ProjectStatus); !exists {
					return validationf("invalid project status")
				}
				v.ProjectStatus = in.ProjectStatus
			}
		}
		if in.ProjectPriority != nil {
			if *in.ProjectPriority < 0 {
				v.ProjectPriority = nil
			} else {
				if !domain.ValidPriority(*in.ProjectPriority) {
					return validationf("invalid project priority")
				}
				v.ProjectPriority = in.ProjectPriority
			}
		}
		now := domain.Now()
		v.UpdatedAt = now
		m.Views[i] = v
		m.bump(now)
		out = v
		return nil
	})
	return out, err
}

func (s *Store) DeleteView(slug string) error {
	return s.mutate(func(m *mem) error {
		i := indexView(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		m.Views = append(m.Views[:i], m.Views[i+1:]...)
		m.bump(domain.Now())
		return nil
	})
}

func viewBySlug(m *mem, slug string) (View, bool) {
	for _, v := range m.Views {
		if v.Slug == slug {
			return v, true
		}
	}
	return View{}, false
}

func indexView(m *mem, slug string) int {
	for i, v := range m.Views {
		if v.Slug == slug {
			return i
		}
	}
	return -1
}

func (s *Store) Search(q string) ([]SearchHit, error) {
	q = strings.ToLower(strings.TrimSpace(q))
	var hits []SearchHit
	err := s.snapshot(func(m *mem) error {
		if q == "" {
			hits = []SearchHit{}
			return nil
		}
		for _, iss := range m.Issues {
			commentSnippet := ""
			for _, comment := range m.Comments[iss.Identifier] {
				if strings.Contains(strings.ToLower(comment.Body), q) {
					commentSnippet = searchSnippet(comment.Body, q)
					break
				}
			}
			if strings.Contains(strings.ToLower(iss.Title), q) || strings.Contains(strings.ToLower(iss.Identifier), q) || strings.Contains(strings.ToLower(iss.Body), q) || commentSnippet != "" {
				snippet := searchSnippet(iss.Body, q)
				if snippet == "" {
					snippet = commentSnippet
				}
				hits = append(hits, SearchHit{
					Kind: "issue", ID: iss.Identifier, Title: iss.Title, Status: iss.Status,
					Archived:  iss.ArchivedAt != nil,
					CreatedAt: iss.CreatedAt, UpdatedAt: iss.UpdatedAt,
					Snippet: snippet,
				})
			}
		}
		for _, p := range m.Projects {
			if strings.Contains(strings.ToLower(p.Name), q) || strings.Contains(strings.ToLower(p.Slug), q) {
				hits = append(hits, SearchHit{
					Kind: "project", ID: p.Slug, Title: p.Name,
					CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt,
				})
			}
		}
		for _, v := range m.Views {
			if strings.Contains(strings.ToLower(v.Name), q) || strings.Contains(strings.ToLower(v.Slug), q) {
				hits = append(hits, SearchHit{
					Kind: "view", ID: v.Slug, Title: v.Name,
					CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt,
				})
			}
		}
		for _, a := range m.ADRs {
			if strings.Contains(strings.ToLower(a.Title), q) || strings.Contains(strings.ToLower(a.Identifier), q) || strings.Contains(strings.ToLower(a.Body+"\n"+a.PublishBody), q) {
				hits = append(hits, SearchHit{
					Kind: "adr", ID: a.Identifier, Title: a.Title,
					CreatedAt: a.CreatedAt, UpdatedAt: a.UpdatedAt,
					Snippet: searchSnippet(a.Body+"\n"+a.PublishBody, q),
				})
			}
		}
		for _, p := range m.Pages {
			if strings.Contains(strings.ToLower(p.Title), q) || strings.Contains(strings.ToLower(p.Slug), q) || strings.Contains(strings.ToLower(p.Body), q) {
				hits = append(hits, SearchHit{
					Kind: "page", ID: p.Slug, Title: p.Title,
					CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt,
					Snippet: searchSnippet(p.Body, q),
				})
			}
		}
		if hits == nil {
			hits = []SearchHit{}
		}
		return nil
	})
	return hits, err
}

func (s *Store) Counts() (issues, pages, adrs int, err error) {
	err = s.snapshot(func(m *mem) error {
		issues = len(m.Issues)
		pages = len(m.Pages)
		adrs = len(m.ADRs)
		return nil
	})
	return
}

func addActivity(m *mem, entityType string, entityID int64, action string, payload map[string]any, now string) {
	raw, _ := json.Marshal(payload)
	id := int64(len(m.Activities) + 1)
	m.Activities = append(m.Activities, Activity{
		ID: id, EntityType: entityType, EntityID: entityID, Action: action,
		Payload: json.RawMessage(raw), CreatedAt: now,
	})
}

func sameEstimate(a, b *int) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

func sameInt64(a, b *int64) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

func sameString(a, b *string) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

func projectProgress(m *mem, id int64) float64 {
	total, done := 0, 0
	for _, iss := range m.Issues {
		if iss.ProjectID != nil && *iss.ProjectID == id {
			total++
			if iss.Status == "done" || iss.Status == "canceled" {
				done++
			}
		}
	}
	if total == 0 {
		return 0
	}
	return float64(done) / float64(total)
}

func issueByIdent(m *mem, ident string) (Issue, bool) {
	i := indexIssue(m, ident)
	if i < 0 {
		return Issue{}, false
	}
	return m.Issues[i], true
}

func issueByID(m *mem, id int64) (Issue, bool) {
	for _, iss := range m.Issues {
		if iss.ID == id {
			return iss, true
		}
	}
	return Issue{}, false
}

func indexIssue(m *mem, ident string) int {
	if n, ok := m.parseIssueIdent(ident); ok {
		for i, iss := range m.Issues {
			if iss.Number == n {
				return i
			}
		}
		return -1
	}
	for i, iss := range m.Issues {
		if iss.Identifier == ident {
			return i
		}
	}
	return -1
}

func (m *mem) parseIssueIdent(id string) (int, bool) {
	if n, ok := domain.ParseIdent(m.issuePrefix(), id); ok {
		return n, true
	}
	if n, ok := domain.ParseIdent(domain.DefaultIssuePrefix, id); ok {
		return n, true
	}
	if n, ok := domain.ParseIdent("SEN", id); ok {
		return n, true
	}
	return parsePlainNumber(id)
}

func indexProject(m *mem, slug string) int {
	for i, p := range m.Projects {
		if p.Slug == slug {
			return i
		}
	}
	return -1
}

func indexCycle(m *mem, number int) int {
	for i, c := range m.Cycles {
		if c.Number == number {
			return i
		}
	}
	return -1
}

func indexPage(m *mem, slug string) int {
	for i, p := range m.Pages {
		if p.Slug == slug {
			return i
		}
	}
	return -1
}

func completedAt(status, now string, current *string) *string {
	if status == "done" || status == "canceled" {
		if current != nil {
			return current
		}
		return &now
	}
	return nil
}

func parseTime(s string) error {
	if s == "" {
		return validationf("timestamp required")
	}
	if _, err := time.Parse(time.RFC3339, s); err != nil {
		return validationf("invalid RFC3339 time %q", s)
	}
	return nil
}

func validColor(c string) bool {
	if len(c) != 7 || c[0] != '#' {
		return false
	}
	for _, r := range c[1:] {
		switch {
		case r >= '0' && r <= '9', r >= 'a' && r <= 'f', r >= 'A' && r <= 'F':
		default:
			return false
		}
	}
	return true
}

func searchSnippet(body, q string) string {
	for _, line := range strings.Split(body, "\n") {
		if strings.Contains(strings.ToLower(line), q) {
			r := []rune(line)
			if len(r) > 180 {
				return string(r[:180]) + "…"
			}
			return line
		}
	}
	return ""
}
