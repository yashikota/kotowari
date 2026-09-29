package store

import "time"

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
