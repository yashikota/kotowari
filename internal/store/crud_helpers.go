package store

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/yashikota/kotowari/internal/domain"
)

func addActivity(m *mem, entityType string, entityID int64, action string, payload map[string]any, now string) {
	raw, _ := json.Marshal(payload)
	id := int64(len(m.Activities) + 1)
	m.Activities = append(m.Activities, Activity{
		ID: id, EntityType: entityType, EntityID: entityID, Action: action,
		Payload: json.RawMessage(raw), CreatedAt: now,
	})
}

func sameEstimate(a, b *int) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

func sameInt64(a, b *int64) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

func sameString(a, b *string) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

func projectProgress(m *mem, id int64) float64 {
	total, done := 0, 0
	for _, iss := range m.Issues {
		if iss.ProjectID != nil && *iss.ProjectID == id {
			total++
			if iss.Status == "done" || iss.Status == "canceled" {
				done++
			}
		}
	}
	if total == 0 {
		return 0
	}
	return float64(done) / float64(total)
}

func issueByIdent(m *mem, ident string) (Issue, bool) {
	i := indexIssue(m, ident)
	if i < 0 {
		return Issue{}, false
	}
	return m.Issues[i], true
}

func issueByID(m *mem, id int64) (Issue, bool) {
	for _, iss := range m.Issues {
		if iss.ID == id {
			return iss, true
		}
	}
	return Issue{}, false
}

func indexIssue(m *mem, ident string) int {
	if n, ok := m.parseIssueIdent(ident); ok {
		for i, iss := range m.Issues {
			if iss.Number == n {
				return i
			}
		}
		return -1
	}
	for i, iss := range m.Issues {
		if iss.Identifier == ident {
			return i
		}
	}
	return -1
}

func (m *mem) parseIssueIdent(id string) (int, bool) {
	if n, ok := domain.ParseIdent(m.issuePrefix(), id); ok {
		return n, true
	}
	if n, ok := domain.ParseIdent(domain.DefaultIssuePrefix, id); ok {
		return n, true
	}
	if n, ok := domain.ParseIdent("SEN", id); ok {
		return n, true
	}
	return parsePlainNumber(id)
}

func indexProject(m *mem, slug string) int {
	for i, p := range m.Projects {
		if p.Slug == slug {
			return i
		}
	}
	return -1
}

func indexCycle(m *mem, number int) int {
	for i, c := range m.Cycles {
		if c.Number == number {
			return i
		}
	}
	return -1
}

func indexPage(m *mem, slug string) int {
	for i, p := range m.Pages {
		if p.Slug == slug {
			return i
		}
	}
	return -1
}

func completedAt(status, now string, current *string) *string {
	if status == "done" || status == "canceled" {
		if current != nil {
			return current
		}
		return &now
	}
	return nil
}

func parseTime(s string) error {
	if s == "" {
		return validationf("timestamp required")
	}
	if _, err := time.Parse(time.RFC3339, s); err != nil {
		return validationf("invalid RFC3339 time %q", s)
	}
	return nil
}

func validColor(c string) bool {
	if len(c) != 7 || c[0] != '#' {
		return false
	}
	for _, r := range c[1:] {
		switch {
		case r >= '0' && r <= '9', r >= 'a' && r <= 'f', r >= 'A' && r <= 'F':
		default:
			return false
		}
	}
	return true
}

func searchSnippet(body, q string) string {
	for _, line := range strings.Split(body, "\n") {
		if strings.Contains(strings.ToLower(line), q) {
			r := []rune(line)
			if len(r) > 180 {
				return string(r[:180]) + "…"
			}
			return line
		}
	}
	return ""
}
