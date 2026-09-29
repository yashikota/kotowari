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

func (s *Store) UpdateWorkspace(
	name, timezone, locale, url, description, githubURL *string,
	cycleSettings *CycleSettings,
	issueAutomationSettings *IssueAutomationSettings,
) (Workspace, error) {
	var ws Workspace
	err := s.mutate(func(m *mem) error {
		if cycleSettings != nil {
			if !validCycleSettings(*cycleSettings) {
				return validationf("invalid cycle settings")
			}
			settings := *cycleSettings
			m.Workspace.CycleSettings = &settings
		}
		if issueAutomationSettings != nil {
			settings := normalizedIssueAutomationSettings(issueAutomationSettings)
			if !validStatusProgressionOrder(settings.StatusProgressionOrder) ||
				settings.AutoCloseStaleIssuesAfterMonths < 0 || settings.AutoCloseStaleIssuesAfterMonths > 60 ||
				settings.AutoArchiveClosedIssuesAfterMonths < 0 || settings.AutoArchiveClosedIssuesAfterMonths > 60 ||
				settings.AutoArchiveCompletedProjectsAfterMonths < 0 || settings.AutoArchiveCompletedProjectsAfterMonths > 60 ||
				settings.AutoArchiveCompletedCyclesAfterMonths < 0 || settings.AutoArchiveCompletedCyclesAfterMonths > 60 {
				return validationf("invalid issue automation settings")
			}
			m.Workspace.IssueAutomationSettings = &settings
		}
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
	if err == nil && issueAutomationSettings != nil {
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
