package store

import (
	"strings"
	"time"

	"github.com/yashikota/kotowari/internal/domain"
)

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
		Name:                    m.Workspace.Name,
		Timezone:                m.Workspace.Timezone,
		Locale:                  locale,
		URL:                     strings.TrimSpace(m.Workspace.URL),
		Description:             m.Workspace.Description,
		GitHubURL:               strings.TrimSpace(m.Workspace.GitHubURL),
		CycleSettings:           normalizedCycleSettings(m.Workspace.CycleSettings),
		IssueAutomationSettings: normalizedIssueAutomationSettings(m.Workspace.IssueAutomationSettings),
		IssueStatuses:           issueWorkflowStatuses(m.Workspace),
		ProjectStatuses:         projectWorkflowStatuses(m.Workspace),
		UpdatedAt:               m.Workspace.UpdatedAt,
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

func (s *Store) UpdateWorkspace(in UpdateWorkspaceInput) (Workspace, error) {
	var ws Workspace
	err := s.mutate(func(m *mem) error {
		if in.CycleSettings != nil {
			if !validCycleSettings(*in.CycleSettings) {
				return validationf("invalid cycle settings")
			}
			settings := *in.CycleSettings
			m.Workspace.CycleSettings = &settings
		}
		if in.IssueAutomationSettings != nil {
			settings := normalizedIssueAutomationSettings(in.IssueAutomationSettings)
			if !validStatusProgressionOrder(settings.StatusProgressionOrder) ||
				settings.AutoCloseStaleIssuesAfterMonths < 0 || settings.AutoCloseStaleIssuesAfterMonths > 60 ||
				settings.AutoArchiveClosedIssuesAfterMonths < 0 || settings.AutoArchiveClosedIssuesAfterMonths > 60 ||
				settings.AutoArchiveCompletedProjectsAfterMonths < 0 || settings.AutoArchiveCompletedProjectsAfterMonths > 60 ||
				settings.AutoArchiveCompletedCyclesAfterMonths < 0 || settings.AutoArchiveCompletedCyclesAfterMonths > 60 {
				return validationf("invalid issue automation settings")
			}
			m.Workspace.IssueAutomationSettings = &settings
		}
		if in.Name != nil {
			if strings.TrimSpace(*in.Name) == "" {
				return validationf("name required")
			}
			m.Workspace.Name = strings.TrimSpace(*in.Name)
		}
		if in.Timezone != nil {
			if strings.TrimSpace(*in.Timezone) == "" {
				return validationf("timezone required")
			}
			m.Workspace.Timezone = strings.TrimSpace(*in.Timezone)
		}
		if in.Locale != nil {
			next := strings.TrimSpace(*in.Locale)
			if next == "" {
				return validationf("locale required")
			}
			if !validLocale(next) {
				return validationf("unsupported locale")
			}
			m.Workspace.Locale = next
		}
		if in.URL != nil {
			m.Workspace.URL = strings.TrimSpace(*in.URL)
		}
		if in.Description != nil {
			m.Workspace.Description = *in.Description
		}
		if in.GitHubURL != nil {
			m.Workspace.GitHubURL = strings.TrimSpace(*in.GitHubURL)
		}
		m.bump(domain.Now())
		ws = workspaceFrom(m)
		return nil
	})
	if err == nil && in.IssueAutomationSettings != nil {
		s.issueAutomationMu.Lock()
		s.lastIssueAutomation = time.Time{}
		s.issueAutomationMu.Unlock()
	}
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

func (s *Store) CreateLabel(in CreateLabelInput) (Label, error) {
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		return Label{}, validationf("name required")
	}
	if !validColor(in.Color) {
		return Label{}, validationf("color must be #RRGGBB")
	}
	var out Label
	err := s.mutate(func(m *mem) error {
		if _, ok := labelByName(m, in.Name); ok {
			return errf(ErrConflict, "label name")
		}
		out = Label{ID: m.nextID(), Name: in.Name, Color: in.Color}
		m.Labels = append(m.Labels, out)
		m.bump(domain.Now())
		return nil
	})
	return out, err
}
