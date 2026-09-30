package domain

import (
	"fmt"
	"strings"
)

func ValidADRStatus(s string) bool {
	switch s {
	case "proposed", "rejected", "accepted", "deprecated", "superseded":
		return true
	default:
		return false
	}
}

func ValidIssueRelationFilter(value string) bool {
	switch value {
	case "", "parent", "subissue", "blocked", "blocking", "recurring", "related", "duplicate":
		return true
	default:
		return false
	}
}

func ValidIssueLinkSource(value string) bool {
	if value == "" || len(value) > 253 || value != strings.ToLower(value) {
		return false
	}
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '.' || r == '-' {
			continue
		}
		return false
	}
	return true
}

func ValidIssueStatus(s string) bool {
	switch s {
	case "backlog", "todo", "in_progress", "done", "canceled":
		return true
	default:
		return false
	}
}

func ValidIssueType(s string) bool {
	switch s {
	case "", "bug", "feature", "improvement", "task":
		return true
	default:
		return false
	}
}

func ValidIssueAssignee(s string) bool {
	switch s {
	case "", "self", "agent":
		return true
	default:
		return false
	}
}

func ValidIssueCreator(s string) bool {
	switch s {
	case "", "self", "agent":
		return true
	default:
		return false
	}
}

func ValidEstimate(p *int) bool {
	return p == nil || (*p >= 0 && *p <= 999)
}

func ValidPriority(p int) bool {
	return p >= 0 && p <= 4
}

func ValidProjectStatus(s string) bool {
	switch s {
	case "backlog", "planned", "started", "completed", "canceled":
		return true
	default:
		return false
	}
}

func ValidProjectHealth(s string) bool {
	switch s {
	case "", "on_track", "at_risk", "off_track":
		return true
	default:
		return false
	}
}

func ValidCycleStatus(s string) bool {
	switch s {
	case "upcoming", "active", "completed":
		return true
	default:
		return false
	}
}

func ValidPageStatus(s string) bool {
	switch s {
	case "proposed", "accepted", "deprecated", "superseded":
		return true
	default:
		return false
	}
}

func ValidSlug(s string) bool {
	if s == "" {
		return false
	}
	for i, r := range s {
		switch {
		case r >= 'a' && r <= 'z':
		case r >= '0' && r <= '9':
		case r == '-' && i > 0 && i < len(s)-1:
		default:
			return false
		}
	}
	return true
}

func UniqueSlug(used map[string]struct{}, slug string) string {
	if _, ok := used[slug]; !ok {
		used[slug] = struct{}{}
		return slug
	}
	for i := 2; ; i++ {
		cand := fmt.Sprintf("%s-%d", slug, i)
		if _, ok := used[cand]; !ok {
			used[cand] = struct{}{}
			return cand
		}
	}
}
