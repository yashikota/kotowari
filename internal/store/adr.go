package store

import (
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
			if a.Supersedes != nil && (*in.Supersedes == nil || **in.Supersedes != *a.Supersedes) {
				return validationf("an established supersedes relationship cannot be changed")
			}
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
