package store

import (
	"strconv"
	"strings"
	"unicode"

	"github.com/yashikota/kotowari/internal/domain"
)

type CreateProjectFromIssueInput struct {
	Name        string
	Description string
	Status      string
	Priority    int
	StartDate   *string
	TargetDate  *string
}

// CreateProjectFromIssue atomically creates a project and carries the source
// issue into it. The issue itself is preserved as the project's first piece of
// work, rather than being discarded during conversion.
func (s *Store) CreateProjectFromIssue(identifier string, in CreateProjectFromIssueInput) (Project, Issue, error) {
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		return Project{}, Issue{}, validationf("project name required")
	}
	if in.Status == "" {
		in.Status = "planned"
	}
	if !domain.ValidProjectStatus(in.Status) {
		return Project{}, Issue{}, validationf("invalid project status")
	}
	if !domain.ValidPriority(in.Priority) {
		return Project{}, Issue{}, validationf("invalid project priority")
	}
	if !validMilestoneDate(in.StartDate) || !validMilestoneDate(in.TargetDate) {
		return Project{}, Issue{}, validationf("project dates must use YYYY-MM-DD")
	}
	var project Project
	var issue Issue
	err := s.mutate(func(m *mem) error {
		issueIndex := indexIssue(m, identifier)
		if issueIndex < 0 {
			return ErrNotFound
		}
		issue = m.Issues[issueIndex]
		if err := ensureIssueActive(issue); err != nil {
			return err
		}
		base := projectSlug(in.Name)
		if base == "" {
			base = "project-" + strconv.Itoa(issue.Number)
		}
		slug := base
		for suffix := 2; ; suffix++ {
			if _, exists := projectBySlug(m, slug); !exists {
				break
			}
			slug = base + "-" + strconv.Itoa(suffix)
		}
		now := domain.Now()
		project = Project{
			ID: m.nextID(), Name: in.Name, Slug: slug, Description: in.Description,
			Status: in.Status, Priority: in.Priority, StartDate: in.StartDate,
			TargetDate: in.TargetDate, Milestones: []Milestone{}, CreatedAt: now, UpdatedAt: now,
		}
		projectID := project.ID
		projectSlug := project.Slug
		issue.ProjectID = &projectID
		issue.ProjectSlug = &projectSlug
		issue.MilestoneID = nil
		issue.MilestoneName = nil
		issue.UpdatedAt = now
		m.Projects = append(m.Projects, project)
		m.Issues[issueIndex] = issue
		addActivity(m, "project", project.ID, "created_from_issue", map[string]any{"issue": identifier}, now)
		addActivity(m, "issue", issue.ID, "project_changed", map[string]any{"project": project.Slug}, now)
		m.bump(now)
		project.Progress = projectProgress(m, project.ID)
		return nil
	})
	return project, issue, err
}

func projectSlug(name string) string {
	var result strings.Builder
	dash := false
	for _, r := range strings.ToLower(strings.TrimSpace(name)) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			if dash && result.Len() > 0 {
				result.WriteByte('-')
			}
			result.WriteRune(r)
			dash = false
			continue
		}
		if unicode.IsLetter(r) || unicode.IsNumber(r) || result.Len() > 0 {
			dash = true
		}
	}
	return strings.Trim(result.String(), "-")
}
