package store

import (
	"sort"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) LinkIssueADR(issueIdent string, adrNumber int) error {
	return s.mutate(func(m *mem) error {
		ii := indexIssue(m, issueIdent)
		if ii < 0 {
			return ErrNotFound
		}
		if err := ensureIssueActive(m.Issues[ii]); err != nil {
			return err
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
		if err := ensureIssueActive(m.Issues[ii]); err != nil {
			return err
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
