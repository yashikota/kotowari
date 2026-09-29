package store

import "path/filepath"

func load(root string) (*mem, error) {
	m := &mem{Comments: map[string][]Comment{}, commentSeq: map[string]int64{}}
	if err := loadWorkspace(root, m); err != nil {
		return nil, err
	}
	if err := loadLabels(root, m); err != nil {
		return nil, err
	}
	if err := loadProjects(root, m); err != nil {
		return nil, err
	}
	if err := loadInitiatives(root, m); err != nil {
		return nil, err
	}
	if err := loadCycles(root, m); err != nil {
		return nil, err
	}
	if err := loadViews(root, m); err != nil {
		return nil, err
	}
	if err := loadIssues(root, filepath.Join(root, "issues"), m); err != nil {
		return nil, err
	}
	if err := loadADRs(root, filepath.Join(root, "adr"), m); err != nil {
		return nil, err
	}
	if err := loadPages(root, m); err != nil {
		return nil, err
	}
	if err := loadActivities(root, m); err != nil {
		return nil, err
	}
	fillIssueRefs(m)
	fillPageRefs(m)
	fillADRRefs(m)
	diagnose(m)
	return m, nil
}
