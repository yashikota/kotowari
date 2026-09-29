package store

import "unicode/utf8"

func validViewIcon(icon string) bool {
	switch icon {
	case "list", "circle", "bolt", "target", "bug", "rocket", "bookmark", "flag", "star", "sparkles", "chart", "calendar":
		return true
	default:
		return false
	}
}

func validateIssueFilterGroup(root *IssueFilterNode) error {
	if root == nil {
		return nil
	}
	fields := map[string]bool{
		"status": true, "assignee": true, "priority": true, "type": true, "estimate": true,
		"project": true, "cycle": true, "label": true, "title": true, "identifier": true,
		"dueDate": true, "createdAt": true, "updatedAt": true, "startedAt": true,
		"completedAt": true, "cycleAddedAt": true, "milestone": true, "relation": true,
		"content": true, "links": true, "recurring": true,
	}
	operators := map[string]bool{
		"is": true, "isNot": true, "contains": true, "doesNotContain": true,
		"before": true, "after": true, "onOrBefore": true, "onOrAfter": true,
		"isEmpty": true, "isNotEmpty": true,
	}
	textFields := map[string]bool{"title": true, "identifier": true, "content": true, "milestone": true}
	dateFields := map[string]bool{
		"dueDate": true, "createdAt": true, "updatedAt": true, "startedAt": true,
		"completedAt": true, "cycleAddedAt": true,
	}
	visited := 0
	var validate func(node *IssueFilterNode, depth int, isRoot bool) error
	validate = func(node *IssueFilterNode, depth int, isRoot bool) error {
		visited++
		if visited > 80 || depth > 6 {
			return validationf("issue filter group is too large")
		}
		switch node.Kind {
		case "group":
			if node.Operator != "and" && node.Operator != "or" {
				return validationf("invalid issue filter group operator")
			}
			if node.Field != "" || node.Value != "" || len(node.Children) > 40 {
				return validationf("invalid issue filter group")
			}
			for i := range node.Children {
				if err := validate(&node.Children[i], depth+1, false); err != nil {
					return err
				}
			}
		case "condition":
			if isRoot || len(node.Children) > 0 || (node.Field != "" && !fields[node.Field]) {
				return validationf("invalid issue filter condition")
			}
			if node.Operator != "" && !operators[node.Operator] {
				return validationf("invalid issue filter operator")
			}
			if node.Field != "" && node.Operator == "" {
				return validationf("issue filter operator is required")
			}
			if textFields[node.Field] && node.Operator != "" && node.Operator != "contains" && node.Operator != "doesNotContain" && node.Operator != "isEmpty" && node.Operator != "isNotEmpty" {
				return validationf("invalid issue text filter operator")
			}
			if dateFields[node.Field] && node.Operator != "" && node.Operator != "is" && node.Operator != "isNot" && node.Operator != "before" && node.Operator != "after" && node.Operator != "onOrBefore" && node.Operator != "onOrAfter" && node.Operator != "isEmpty" && node.Operator != "isNotEmpty" {
				return validationf("invalid issue date filter operator")
			}
			if node.Field != "" && !textFields[node.Field] && !dateFields[node.Field] && node.Operator != "" && node.Operator != "is" && node.Operator != "isNot" && node.Operator != "isEmpty" && node.Operator != "isNotEmpty" {
				return validationf("invalid issue property filter operator")
			}
			if utf8.RuneCountInString(node.Value) > 240 {
				return validationf("issue filter value is too long")
			}
		default:
			return validationf("invalid issue filter node")
		}
		return nil
	}
	if root.Kind != "group" {
		return validationf("issue filter root must be a group")
	}
	return validate(root, 0, true)
}
