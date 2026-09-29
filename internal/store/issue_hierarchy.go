package store

import "sort"

func checkIssueParent(m *mem, issueID int64, parentID *int64) error {
	if parentID == nil {
		return nil
	}
	if *parentID == issueID && issueID != 0 {
		return validationf("issue cannot be its own parent")
	}
	if _, ok := issueByID(m, *parentID); !ok && issueID != 0 {
		return validationf("parent not found")
	}
	cur := *parentID
	seen := map[int64]struct{}{issueID: {}}
	for cur != 0 {
		if _, ok := seen[cur]; ok {
			return validationf("issue parent cycle")
		}
		seen[cur] = struct{}{}
		iss, ok := issueByID(m, cur)
		if !ok {
			return validationf("parent not found")
		}
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		if iss.ParentID == nil {
			return nil
		}
		cur = *iss.ParentID
	}
	return nil
}

func sortIssueTree(issues []Issue) []Issue {
	ids := map[int64]struct{}{}
	children := map[int64][]Issue{}
	var roots []Issue
	for _, iss := range issues {
		ids[iss.ID] = struct{}{}
	}
	for _, iss := range issues {
		if iss.ParentID != nil {
			if _, ok := ids[*iss.ParentID]; ok {
				children[*iss.ParentID] = append(children[*iss.ParentID], iss)
				continue
			}
		}
		roots = append(roots, iss)
	}
	bySort := func(a, b Issue) bool { return a.SortOrder < b.SortOrder }
	sort.SliceStable(roots, func(i, j int) bool { return bySort(roots[i], roots[j]) })
	for id, kids := range children {
		sort.SliceStable(kids, func(i, j int) bool { return bySort(kids[i], kids[j]) })
		children[id] = kids
	}
	out := make([]Issue, 0, len(issues))
	var walk func(Issue, int)
	walk = func(iss Issue, depth int) {
		iss.Depth = depth
		out = append(out, iss)
		for _, c := range children[iss.ID] {
			walk(c, depth+1)
		}
	}
	for _, r := range roots {
		walk(r, 0)
	}
	return out
}
