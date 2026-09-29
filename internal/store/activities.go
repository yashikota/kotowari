package store

import "encoding/json"

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

// ListRecentIssueActivities returns issue changes and subscribed cycle
// notifications with enough context for the single-user inbox to render them
// without an N+1 API request for each issue.
func (s *Store) ListRecentIssueActivities(limit int) ([]InboxActivity, error) {
	if limit <= 0 {
		limit = 100
	}
	if limit > 500 {
		limit = 500
	}
	var out []InboxActivity
	err := s.snapshot(func(m *mem) error {
		issuesByID := make(map[int64]Issue, len(m.Issues))
		for _, issue := range m.Issues {
			issuesByID[issue.ID] = issue
		}
		out = make([]InboxActivity, 0, limit)
		for i := len(m.Activities) - 1; i >= 0 && len(out) < limit; i-- {
			activity := m.Activities[i]
			identifier, title := "", ""
			if activity.EntityType == "issue" {
				issue, ok := issuesByID[activity.EntityID]
				if !ok {
					continue
				}
				identifier, title = issue.Identifier, issue.Title
			} else if activity.EntityType == "cycle" && (activity.Action == "cycle_issue_added" || activity.Action == "cycle_issue_completed") {
				var payload map[string]any
				if err := json.Unmarshal(activity.Payload, &payload); err != nil {
					continue
				}
				identifier, _ = payload["issueIdentifier"].(string)
				title, _ = payload["issueTitle"].(string)
				if identifier == "" || title == "" {
					continue
				}
			} else {
				continue
			}
			out = append(out, InboxActivity{
				ID: activity.ID, EntityType: activity.EntityType, EntityID: activity.EntityID,
				Action: activity.Action, Payload: activity.Payload, CreatedAt: activity.CreatedAt,
				Identifier: identifier, Title: title,
			})
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
