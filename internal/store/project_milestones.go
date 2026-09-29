package store

import (
	"strings"
	"time"

	"github.com/yashikota/kotowari/internal/domain"
)

func validMilestoneDate(value *string) bool {
	if value == nil || strings.TrimSpace(*value) == "" {
		return true
	}
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*value))
	return err == nil && parsed.Format("2006-01-02") == strings.TrimSpace(*value)
}

func (s *Store) CreateMilestone(in CreateMilestoneInput) (Milestone, error) {
	projectSlug, name, description, targetDate := in.ProjectSlug, in.Name, in.Description, in.TargetDate
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

func (s *Store) UpdateMilestone(in UpdateMilestoneInput) (Milestone, error) {
	projectSlug, milestoneID, name, description, targetDate := in.ProjectSlug, in.ID, in.Name, in.Description, in.TargetDate
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
