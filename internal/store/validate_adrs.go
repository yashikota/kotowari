package store

import (
	"fmt"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func diagnoseADRs(m *mem) {
	seenADR := map[int]struct{}{}
	for _, a := range m.ADRs {
		path := "adr/" + domain.DirName(a.Number) + "/README.md"
		if _, ok := seenADR[a.Number]; ok {
			m.diag(path, "duplicate_number", fmt.Sprintf("duplicate ADR %d", a.Number))
		} else {
			seenADR[a.Number] = struct{}{}
		}
		if a.Title == "" {
			m.diag(path, "missing_title", "title is empty")
		}
		if strings.TrimSpace(a.CreatedAt) == "" {
			m.diag(path, "missing_created", "created is required")
		}
		if strings.TrimSpace(a.UpdatedAt) == "" {
			m.diag(path, "missing_updated", "updated is required")
		}
		if !domain.ValidADRStatus(a.Status) {
			m.diag(path, "invalid_status", fmt.Sprintf("invalid status %q", a.Status))
		}
		for _, n := range a.IssueNumbers {
			if indexIssue(m, domain.Ident(m.issuePrefix(), n)) < 0 {
				m.diag(path, "dangling_issue", fmt.Sprintf("unknown issue %d", n))
			}
		}
		if a.Supersedes != nil {
			if _, ok := adrByNumber(m, *a.Supersedes); !ok {
				m.diag(path, "dangling_supersedes", fmt.Sprintf("unknown ADR %d", *a.Supersedes))
			}
		}
	}
	for _, a := range m.ADRs {
		path := "adr/" + domain.DirName(a.Number) + "/README.md"
		if a.Status != "superseded" {
			continue
		}
		found := false
		for _, o := range m.ADRs {
			if o.Supersedes != nil && *o.Supersedes == a.Number {
				found = true
				break
			}
		}
		if !found {
			m.diag(path, "missing_successor", "superseded ADR has no successor")
		}
	}
}

func diagnoseADRIssueLinks(m *mem) {
	for _, iss := range m.Issues {
		path := "issues/" + domain.DirName(iss.Number) + "/README.md"
		for _, n := range iss.ADRNumbers {
			if indexADR(m, domain.Ident(m.adrPrefix(), n)) < 0 {
				m.diag(path, "dangling_adr", fmt.Sprintf("unknown ADR %d", n))
				continue
			}
			a, _ := adrByNumber(m, n)
			if !containsInt(a.IssueNumbers, iss.Number) {
				m.diag(path, "one_sided_link", fmt.Sprintf("%s links %s but ADR does not link back", iss.Identifier, domain.Ident(m.adrPrefix(), n)))
			}
		}
	}
	for _, a := range m.ADRs {
		path := "adr/" + domain.DirName(a.Number) + "/README.md"
		for _, n := range a.IssueNumbers {
			iss, ok := issueByNumber(m, n)
			if !ok {
				continue
			}
			if !containsInt(iss.ADRNumbers, a.Number) {
				m.diag(path, "one_sided_link", fmt.Sprintf("ADR-%d links issue %d but issue does not link back", a.Number, n))
			}
		}
	}
}
