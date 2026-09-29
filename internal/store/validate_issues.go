package store

import (
	"fmt"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func diagnoseIssues(m *mem) {
	for _, iss := range m.Issues {
		path := "issues/" + domain.DirName(iss.Number) + "/README.md"
		if !domain.ValidIssueStatus(iss.Status) {
			m.diag(path, "invalid_status", fmt.Sprintf("invalid status %q", iss.Status))
		}
		if _, ok := workflowStatusByID(m.Workspace, iss.WorkflowStatus); !ok {
			m.diag(path, "invalid_workflow_status", fmt.Sprintf("unknown workflow status %q", iss.WorkflowStatus))
		}
		if strings.TrimSpace(iss.Title) == "" {
			m.diag(path, "missing_title", "title is required")
		}
		if strings.TrimSpace(iss.CreatedAt) == "" {
			m.diag(path, "missing_created", "created is required")
		}
		if strings.TrimSpace(iss.UpdatedAt) == "" {
			m.diag(path, "missing_updated", "updated is required")
		}
		if !domain.ValidPriority(iss.Priority) {
			m.diag(path, "invalid_priority", fmt.Sprintf("invalid priority %d", iss.Priority))
		}
		if iss.ProjectSlug != nil && iss.ProjectID == nil {
			m.diag(path, "dangling_project", fmt.Sprintf("unknown project %q", *iss.ProjectSlug))
		}
		if iss.CycleNumber != nil && iss.CycleID == nil {
			m.diag(path, "dangling_cycle", fmt.Sprintf("unknown cycle %d", *iss.CycleNumber))
		}
		if iss.ParentIdentifier != nil && iss.ParentID == nil {
			m.diag(path, "dangling_parent", fmt.Sprintf("unknown parent %q", *iss.ParentIdentifier))
		}
		if err := checkIssueParent(m, iss.ID, iss.ParentID); err != nil {
			m.diag(path, "parent_cycle", err.Error())
		}
		for _, l := range iss.Labels {
			if _, ok := labelByName(m, l.Name); !ok {
				m.diag(path, "unknown_label", fmt.Sprintf("unknown label %q", l.Name))
			}
		}
	}
}
