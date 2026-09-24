package store

import "github.com/yashikota/kotowari/internal/domain"

func reverseIssueRelation(kind string) string {
	switch kind {
	case "related":
		return "related"
	case "blocks":
		return "blockedBy"
	case "blockedBy":
		return "blocks"
	case "duplicateOf":
		return "duplicateBy"
	case "duplicateBy":
		return "duplicateOf"
	default:
		return ""
	}
}

func nextIssueRelationID(relations []IssueRelation) int64 {
	var id int64 = 1
	for _, relation := range relations {
		if relation.ID >= id {
			id = relation.ID + 1
		}
	}
	return id
}

func appendIssueRelation(issue *Issue, kind, target string) IssueRelation {
	relation := IssueRelation{
		ID:               nextIssueRelationID(issue.Relations),
		Kind:             kind,
		TargetIdentifier: target,
	}
	issue.Relations = append(issue.Relations, relation)
	return relation
}

func removeIssueRelation(issue *Issue, id int64) (IssueRelation, bool) {
	for index, relation := range issue.Relations {
		if relation.ID != id {
			continue
		}
		issue.Relations = append(issue.Relations[:index], issue.Relations[index+1:]...)
		return relation, true
	}
	return IssueRelation{}, false
}

func (s *Store) AddIssueRelation(identifier string, in CreateIssueRelationInput) (IssueRelation, error) {
	if reverseIssueRelation(in.Kind) == "" {
		return IssueRelation{}, validationf("invalid issue relation kind")
	}
	var out IssueRelation
	err := s.mutate(func(m *mem) error {
		fromIndex := indexIssue(m, identifier)
		if fromIndex < 0 {
			return ErrNotFound
		}
		toIndex := indexIssue(m, in.TargetIdentifier)
		if toIndex < 0 {
			return validationf("related issue not found")
		}
		if fromIndex == toIndex {
			return validationf("an issue cannot be related to itself")
		}
		from := m.Issues[fromIndex]
		to := m.Issues[toIndex]
		if err := ensureIssueActive(from); err != nil {
			return err
		}
		if err := ensureIssueActive(to); err != nil {
			return err
		}
		for _, relation := range from.Relations {
			if relation.TargetIdentifier == to.Identifier &&
				(relation.Kind == in.Kind || reverseIssueRelation(relation.Kind) == in.Kind) {
				return errf(ErrConflict, "issue relation already exists")
			}
		}
		now := domain.Now()
		out = appendIssueRelation(&from, in.Kind, to.Identifier)
		inverse := appendIssueRelation(&to, reverseIssueRelation(in.Kind), from.Identifier)
		from.UpdatedAt = now
		to.UpdatedAt = now
		m.Issues[fromIndex] = from
		m.Issues[toIndex] = to
		addActivity(m, "issue", from.ID, "relation_added", map[string]any{
			"kind": in.Kind, "target": to.Identifier,
		}, now)
		addActivity(m, "issue", to.ID, "relation_added", map[string]any{
			"kind": inverse.Kind, "target": from.Identifier,
		}, now)
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) RemoveIssueRelation(identifier string, relationID int64) error {
	if relationID < 1 {
		return validationf("invalid relation id")
	}
	return s.mutate(func(m *mem) error {
		fromIndex := indexIssue(m, identifier)
		if fromIndex < 0 {
			return ErrNotFound
		}
		from := m.Issues[fromIndex]
		if err := ensureIssueActive(from); err != nil {
			return err
		}
		relation, ok := removeIssueRelation(&from, relationID)
		if !ok {
			return ErrNotFound
		}
		now := domain.Now()
		from.UpdatedAt = now
		m.Issues[fromIndex] = from
		if toIndex := indexIssue(m, relation.TargetIdentifier); toIndex >= 0 {
			to := m.Issues[toIndex]
			for _, reciprocal := range to.Relations {
				if reciprocal.TargetIdentifier == from.Identifier &&
					reciprocal.Kind == reverseIssueRelation(relation.Kind) {
					removeIssueRelation(&to, reciprocal.ID)
					break
				}
			}
			to.UpdatedAt = now
			m.Issues[toIndex] = to
		}
		addActivity(m, "issue", from.ID, "relation_removed", map[string]any{
			"kind": relation.Kind, "target": relation.TargetIdentifier,
		}, now)
		m.bump(now)
		return nil
	})
}
