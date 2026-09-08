package store

import (
	"sort"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

const defaultADRBody = `## 問い

## 評価関数

## 候補

### 候補 1

- 良い点:
- 中立:
- 悪い点:

## 実験

## 結果

## 決定

選んだ候補: ""

### 良い点と悪い点

- 良い点:
- 悪い点:

### 確認

## 前提
`

const defaultPublishBody = `## Context and Problem Statement

## Decision Drivers

## Considered Options

### Option 1

- Good, because
- Neutral, because
- Bad, because

## Experiments

## Results

## Decision Outcome

Chosen option: "", because

### Consequences

- Good, because
- Bad, because

### Confirmation

## More Information
`

func (s *Store) ListADRs() ([]ADR, error) {
	var out []ADR
	err := s.snapshot(func(m *mem) error {
		out = append([]ADR{}, m.ADRs...)
		if out == nil {
			out = []ADR{}
		}
		return nil
	})
	return out, err
}

func (s *Store) GetADR(ident string) (ADR, error) {
	var out ADR
	err := s.snapshot(func(m *mem) error {
		i := indexADR(m, ident)
		if i < 0 {
			return ErrNotFound
		}
		out = m.ADRs[i]
		return nil
	})
	return out, err
}

func (s *Store) CreateADR(in CreateADRInput) (ADR, error) {
	in.Title = strings.TrimSpace(in.Title)
	if in.Title == "" {
		return ADR{}, validationf("title required")
	}
	if in.Status == "" {
		in.Status = "proposed"
	}
	if !domain.ValidADRStatus(in.Status) {
		return ADR{}, validationf("invalid status")
	}
	body := in.Body
	if strings.TrimSpace(body) == "" {
		body = templateBody(s.root, "ADR.md", defaultADRBody)
	}
	now := domain.Now()
	var out ADR
	err := s.mutate(func(m *mem) error {
		if err := validateADRProject(m, in.ProjectSlug); err != nil {
			return err
		}
		m.Workspace.ADRCounter++
		n := m.Workspace.ADRCounter
		ident := domain.Ident(m.adrPrefix(), n)
		issues := uniqueInts(in.IssueNumbers)
		for _, inum := range issues {
			if indexIssue(m, domain.Ident(m.issuePrefix(), inum)) < 0 {
				return validationf("issue %d not found", inum)
			}
		}
		if err := applySupersedes(m, in.Supersedes, n, now); err != nil {
			return err
		}
		out = ADR{
			ProjectSlug: in.ProjectSlug,
			ID:          int64(n), Number: n, Identifier: ident, Title: in.Title, Body: body,
			Status: in.Status, Evaluation: in.Evaluation, Replay: in.Replay, Workload: in.Workload,
			IssueNumbers: issues, Supersedes: in.Supersedes, CreatedAt: now, UpdatedAt: now,
		}
		m.ADRs = append(m.ADRs, out)
		for _, inum := range issues {
			linkIssueToADR(m, inum, n)
		}
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) UpdateADR(ident string, in PatchADRInput) (ADR, error) {
	var out ADR
	err := s.mutate(func(m *mem) error {
		i := indexADR(m, ident)
		if i < 0 {
			return ErrNotFound
		}
		a := m.ADRs[i]
		if in.ProjectSlug != nil {
			if err := validateADRProject(m, *in.ProjectSlug); err != nil {
				return err
			}
			a.ProjectSlug = *in.ProjectSlug
		}
		if in.Title != nil {
			if strings.TrimSpace(*in.Title) == "" {
				return validationf("title required")
			}
			a.Title = strings.TrimSpace(*in.Title)
		}
		if in.Body != nil {
			a.Body = *in.Body
		}
		if in.PublishBody != nil {
			a.PublishBody = *in.PublishBody
		}
		if in.Status != nil {
			if !domain.ValidADRStatus(*in.Status) {
				return validationf("invalid status")
			}
			a.Status = *in.Status
		}
		if in.Evaluation != nil {
			a.Evaluation = *in.Evaluation
		}
		if in.Replay != nil {
			a.Replay = *in.Replay
		}
		if in.Workload != nil {
			a.Workload = *in.Workload
		}
		if in.Supersedes != nil {
			if err := applySupersedes(m, *in.Supersedes, a.Number, domain.Now()); err != nil {
				return err
			}
			a.Supersedes = *in.Supersedes
		}
		if in.IssueNumbers != nil {
			next := uniqueInts(*in.IssueNumbers)
			for _, inum := range next {
				if indexIssue(m, domain.Ident(m.issuePrefix(), inum)) < 0 {
					return validationf("issue %d not found", inum)
				}
			}
			syncIssueADRLinks(m, a.Number, a.IssueNumbers, next)
			a.IssueNumbers = next
		}
		a.UpdatedAt = domain.Now()
		m.ADRs[i] = a
		m.bump(a.UpdatedAt)
		out = a
		return nil
	})
	return out, err
}

func (s *Store) DeleteADR(ident string) error {
	return s.snapshot(func(m *mem) error {
		if indexADR(m, ident) < 0 {
			return ErrNotFound
		}
		return validationf("ADRs are append-only; mark superseded instead of deleting")
	})
}

func (s *Store) LinkIssueADR(issueIdent string, adrNumber int) error {
	return s.mutate(func(m *mem) error {
		ii := indexIssue(m, issueIdent)
		if ii < 0 {
			return ErrNotFound
		}
		ai := indexADR(m, domain.Ident(m.adrPrefix(), adrNumber))
		if ai < 0 {
			return ErrNotFound
		}
		issN := m.Issues[ii].Number
		m.Issues[ii].ADRNumbers = uniqueInts(append(m.Issues[ii].ADRNumbers, adrNumber))
		m.ADRs[ai].IssueNumbers = uniqueInts(append(m.ADRs[ai].IssueNumbers, issN))
		now := domain.Now()
		m.Issues[ii].UpdatedAt = now
		m.ADRs[ai].UpdatedAt = now
		m.bump(now)
		return nil
	})
}

func (s *Store) UnlinkIssueADR(issueIdent string, adrNumber int) error {
	return s.mutate(func(m *mem) error {
		ii := indexIssue(m, issueIdent)
		if ii < 0 {
			return ErrNotFound
		}
		ai := indexADR(m, domain.Ident(m.adrPrefix(), adrNumber))
		if ai < 0 {
			return ErrNotFound
		}
		issN := m.Issues[ii].Number
		m.Issues[ii].ADRNumbers = removeInt(m.Issues[ii].ADRNumbers, adrNumber)
		m.ADRs[ai].IssueNumbers = removeInt(m.ADRs[ai].IssueNumbers, issN)
		now := domain.Now()
		m.Issues[ii].UpdatedAt = now
		m.ADRs[ai].UpdatedAt = now
		m.bump(now)
		return nil
	})
}

func (s *Store) PublishADR(ident string) (ADR, error) {
	var out ADR
	err := s.mutate(func(m *mem) error {
		i := indexADR(m, ident)
		if i < 0 {
			return ErrNotFound
		}
		a := m.ADRs[i]
		if strings.TrimSpace(a.PublishBody) == "" {
			a.PublishBody = defaultPublishBody
		}
		if a.Status == "proposed" {
			a.Status = "accepted"
		}
		a.UpdatedAt = domain.Now()
		m.ADRs[i] = a
		m.bump(a.UpdatedAt)
		out = a
		return nil
	})
	return out, err
}

func indexADR(m *mem, ident string) int {
	if n, ok := m.parseADRIdent(ident); ok {
		for i, a := range m.ADRs {
			if a.Number == n {
				return i
			}
		}
		return -1
	}
	for i, a := range m.ADRs {
		if a.Identifier == ident {
			return i
		}
	}
	return -1
}

func (m *mem) parseADRIdent(id string) (int, bool) {
	if n, ok := domain.ParseIdent(m.adrPrefix(), id); ok {
		return n, true
	}
	if n, ok := domain.ParseIdent(domain.DefaultADRPrefix, id); ok {
		return n, true
	}
	return parsePlainNumber(id)
}

func parsePlainNumber(id string) (int, bool) {
	n := 0
	if id == "" {
		return 0, false
	}
	for _, r := range id {
		if r < '0' || r > '9' {
			return 0, false
		}
		n = n*10 + int(r-'0')
	}
	if n < 1 {
		return 0, false
	}
	return n, true
}

func containsInt(in []int, n int) bool {
	for _, v := range in {
		if v == n {
			return true
		}
	}
	return false
}

func adrByNumber(m *mem, n int) (ADR, bool) {
	for _, a := range m.ADRs {
		if a.Number == n {
			return a, true
		}
	}
	return ADR{}, false
}

func issueByNumber(m *mem, n int) (Issue, bool) {
	for _, iss := range m.Issues {
		if iss.Number == n {
			return iss, true
		}
	}
	return Issue{}, false
}

func applySupersedes(m *mem, old *int, successor int, now string) error {
	if old == nil {
		return nil
	}
	n := *old
	if n < 1 {
		return validationf("invalid supersedes")
	}
	if successor > 0 && n == successor {
		return validationf("ADR cannot supersede itself")
	}
	i := indexADR(m, domain.Ident(m.adrPrefix(), n))
	if i < 0 {
		return validationf("superseded ADR %d not found", n)
	}
	m.ADRs[i].Status = "superseded"
	m.ADRs[i].UpdatedAt = now
	return nil
}

func uniqueInts(in []int) []int {
	seen := map[int]struct{}{}
	var out []int
	for _, n := range in {
		if n < 1 {
			continue
		}
		if _, ok := seen[n]; ok {
			continue
		}
		seen[n] = struct{}{}
		out = append(out, n)
	}
	sort.Ints(out)
	if out == nil {
		out = []int{}
	}
	return out
}

func removeInt(in []int, n int) []int {
	var out []int
	for _, v := range in {
		if v != n {
			out = append(out, v)
		}
	}
	if out == nil {
		out = []int{}
	}
	return out
}

func linkIssueToADR(m *mem, issueNumber, adrNumber int) {
	for i := range m.Issues {
		if m.Issues[i].Number == issueNumber {
			m.Issues[i].ADRNumbers = uniqueInts(append(m.Issues[i].ADRNumbers, adrNumber))
			return
		}
	}
}

func syncIssueADRLinks(m *mem, adrNumber int, prev, next []int) {
	want := map[int]struct{}{}
	for _, n := range next {
		want[n] = struct{}{}
	}
	had := map[int]struct{}{}
	for _, n := range prev {
		had[n] = struct{}{}
		if _, ok := want[n]; !ok {
			for i := range m.Issues {
				if m.Issues[i].Number == n {
					m.Issues[i].ADRNumbers = removeInt(m.Issues[i].ADRNumbers, adrNumber)
				}
			}
		}
	}
	for _, n := range next {
		if _, ok := had[n]; !ok {
			linkIssueToADR(m, n, adrNumber)
		}
	}
}

func validateADRProject(m *mem, slug *string) error {
	if slug == nil {
		return nil
	}
	for _, p := range m.Projects {
		if p.Slug == *slug {
			return nil
		}
	}
	return validationf("project not found")
}
