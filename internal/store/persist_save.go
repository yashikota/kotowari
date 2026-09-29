package store

import (
	"os"
	"path/filepath"
)

func save(root string, m *mem) error {
	for _, dir := range []string{"issues", "adr", "pages", "projects", "initiatives", "cycles", "views"} {
		if err := os.MkdirAll(filepath.Join(root, dir), 0o755); err != nil {
			return err
		}
	}
	if err := saveWorkspaceSettings(root, m); err != nil {
		return err
	}
	if err := saveProjects(root, m); err != nil {
		return err
	}
	if err := saveInitiatives(root, m); err != nil {
		return err
	}
	if err := saveCycles(root, m); err != nil {
		return err
	}
	if err := saveViews(root, m); err != nil {
		return err
	}
	if err := saveIssues(root, m); err != nil {
		return err
	}
	if err := saveADRs(root, m); err != nil {
		return err
	}
	if err := savePages(root, m); err != nil {
		return err
	}
	if err := saveActivities(root, m); err != nil {
		return err
	}
	return nil
}
