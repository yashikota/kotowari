package domain

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

const (
	IdentifierPrefix   = "ISS-"
	DefaultIssuePrefix = "ISS"
	DefaultADRPrefix   = "ADR"
)

func Ident(prefix string, number int) string {
	return fmt.Sprintf("%s-%d", prefix, number)
}

func ParseIdent(prefix, id string) (int, bool) {
	pre := prefix + "-"
	if !strings.HasPrefix(id, pre) {
		return 0, false
	}
	rest := strings.TrimPrefix(id, pre)
	n, err := strconv.Atoi(rest)
	if err != nil || n < 1 {
		return 0, false
	}
	return n, true
}

func Identifier(number int) string {
	return Ident(DefaultIssuePrefix, number)
}

func ParseIdentifier(id string) (int, bool) {
	return ParseIdent(DefaultIssuePrefix, id)
}

func ADRIdentifier(number int) string {
	return Ident(DefaultADRPrefix, number)
}

func ParseADRIdentifier(id string) (int, bool) {
	return ParseIdent(DefaultADRPrefix, id)
}

func DirName(n int) string {
	return fmt.Sprintf("%05d", n)
}

func ParseDirName(s string) (int, bool) {
	if s == "" {
		return 0, false
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 || s != DirName(n) {
		return 0, false
	}
	return n, true
}

func ParseLegacyIssueStem(stem string) (int, bool) {
	if n, ok := ParseIdent(DefaultIssuePrefix, stem); ok {
		return n, true
	}
	return ParseIdent("SEN", stem)
}

func ValidADRStatus(s string) bool {
	switch s {
	case "proposed", "rejected", "accepted", "deprecated", "superseded":
		return true
	default:
		return false
	}
}

func ValidDate(value string) bool {
	_, err := time.Parse("2006-01-02", value)
	return err == nil
}

func ValidDueDateFilter(value string) bool {
	switch value {
	case "", "overdue", "today", "tomorrow", "threeDays", "week", "month", "quarter", "custom", "none":
		return true
	default:
		return strings.HasPrefix(value, "on:") && ValidDate(strings.TrimPrefix(value, "on:"))
	}
}

func ValidIssueDateFilter(field, dateRange string) bool {
	if field == "" && dateRange == "" {
		return true
	}
	if !ValidIssueDateField(field) || !ValidIssueDateRange(dateRange) || dateRange == "" {
		return false
	}
	if field == "timeInCurrentStatus" && strings.HasPrefix(dateRange, "on:") {
		return false
	}
	if field == "timeInCurrentStatus" {
		switch dateRange {
		case "dayAgo", "weekAgo", "twoWeeksAgo", "monthAgo", "quarterAgo", "halfYearAgo":
		default:
			return false
		}
	}
	return true
}

func ValidIssueDateField(value string) bool {
	switch value {
	case "createdAt", "updatedAt", "startedAt", "completedAt", "timeInCurrentStatus":
		return true
	default:
		return false
	}
}

func ValidIssueDateRange(value string) bool {
	switch value {
	case "", "dayAgo", "threeDaysAgo", "weekAgo", "twoWeeksAgo", "monthAgo", "quarterAgo", "halfYearAgo", "yearAgo":
		return true
	default:
		return strings.HasPrefix(value, "on:") && ValidDate(strings.TrimPrefix(value, "on:"))
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

// ValidPrefix keeps identifiers safe as single URL path segments.
func ValidPrefix(p string) bool {
	if p == "" {
		return false
	}
	for _, c := range p {
		if (c < 'A' || c > 'Z') && (c < 'a' || c > 'z') && (c < '0' || c > '9') && c != '_' && c != '-' {
			return false
		}
	}
	return true
}

func NormalizePrefix(p, fallback string) string {
	p = strings.TrimSpace(p)
	p = strings.TrimSuffix(p, "-")
	if p == "" {
		return fallback
	}
	return p
}

type Page struct {
	Title       string
	Slug        string
	Body        string
	Status      string
	Date        *string
	Tags        []string
	ProjectSlug *string
	ParentSlug  *string
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

func ValidViewDisplay(s string) bool {
	return s == "list" || s == "board"
}

func ValidViewGroupBy(s string) bool {
	switch s {
	case "none", "priority", "status", "project", "cycle", "label", "parent", "type", "estimate":
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
	case "id", "status", "priority", "project", "dueDate", "milestone", "cycle", "estimate", "labels", "links", "pullRequests", "timeInStatus", "created", "updated":
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

func RenderPageMarkdown(p Page) string {
	var b strings.Builder
	b.WriteString("---\n")
	fmt.Fprintf(&b, "title: %s\n", yamlScalar(p.Title))
	fmt.Fprintf(&b, "slug: %s\n", yamlScalar(p.Slug))
	fmt.Fprintf(&b, "status: %s\n", yamlScalar(p.Status))
	if p.Date != nil && *p.Date != "" {
		fmt.Fprintf(&b, "date: %s\n", yamlScalar(*p.Date))
	}
	b.WriteString("tags: [")
	for i, tag := range p.Tags {
		if i > 0 {
			b.WriteString(", ")
		}
		b.WriteString(yamlScalar(tag))
	}
	b.WriteString("]\n")
	if p.ProjectSlug != nil && *p.ProjectSlug != "" {
		fmt.Fprintf(&b, "project: %s\n", yamlScalar(*p.ProjectSlug))
	}
	if p.ParentSlug != nil && *p.ParentSlug != "" {
		fmt.Fprintf(&b, "parent: %s\n", yamlScalar(*p.ParentSlug))
	}
	b.WriteString("---\n\n")
	b.WriteString(p.Body)
	if p.Body != "" && !strings.HasSuffix(p.Body, "\n") {
		b.WriteByte('\n')
	}
	return b.String()
}

func yamlScalar(s string) string {
	if s == "" {
		return `""`
	}
	if strings.ContainsAny(s, ":#{}[]&*!|>'\"%@`,\n") || strings.HasPrefix(s, " ") || strings.HasSuffix(s, " ") {
		return strconv.Quote(s)
	}
	return s
}

func Now() string {
	return time.Now().UTC().Format(time.RFC3339)
}
