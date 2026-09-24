package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/store"
)

func (s *Server) createProjectFromIssue(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name           string  `json:"name"`
		Description    string  `json:"description"`
		Status         string  `json:"status"`
		WorkflowStatus string  `json:"workflowStatus"`
		Priority       int     `json:"priority"`
		StartDate      *string `json:"startDate"`
		TargetDate     *string `json:"targetDate"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	project, issue, err := s.store.CreateProjectFromIssue(r.PathValue("id"), store.CreateProjectFromIssueInput{
		Name: in.Name, Description: in.Description, Status: in.Status, WorkflowStatus: in.WorkflowStatus, Priority: in.Priority,
		StartDate: in.StartDate, TargetDate: in.TargetDate,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"project": project, "issue": issue})
}
