package store

import "github.com/yashikota/kotowari/internal/domain"

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
