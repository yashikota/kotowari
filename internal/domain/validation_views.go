package domain

func ValidViewDisplay(s string) bool {
	return s == "list" || s == "board"
}

func ValidViewGroupBy(s string) bool {
	switch s {
	case "none", "priority", "status", "assignee", "agent", "project", "cycle", "label", "parent", "type", "estimate":
		return true
	default:
		return false
	}
}

func ValidViewOrderBy(s string) bool {
	switch s {
	case "manual", "title", "status", "priority", "updated", "created", "dueDate", "estimate", "linkCount", "timeInStatus":
		return true
	default:
		return false
	}
}

func ValidViewDirection(s string) bool {
	return s == "asc" || s == "desc"
}

func ValidCompletedIssues(s string) bool {
	switch s {
	case "all", "pastDay", "pastWeek", "pastMonth", "currentCycle", "none":
		return true
	default:
		return false
	}
}

func ValidNestedSubIssues(s string) bool {
	switch s {
	case "showMatching", "showAll":
		return true
	default:
		return false
	}
}

func ValidDisplayProperty(s string) bool {
	switch s {
	case "id", "status", "assignee", "priority", "project", "dueDate", "milestone", "cycle", "estimate", "labels", "links", "pullRequests", "timeInStatus", "created", "updated":
		return true
	default:
		return false
	}
}
