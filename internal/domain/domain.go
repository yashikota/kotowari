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

func ValidPriority(p int) bool {
	return p >= 0 && p <= 4
}

func ValidProjectStatus(s string) bool {
	switch s {
	case "planned", "started", "completed", "canceled":
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

func IsDirty(updatedAt string, lastPushedAt *string, hasUserContent bool) bool {
	if lastPushedAt == nil || *lastPushedAt == "" {
		return hasUserContent
	}
	return updatedAt > *lastPushedAt
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
