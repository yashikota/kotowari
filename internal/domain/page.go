package domain

import (
	"fmt"
	"strconv"
	"strings"
)

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
