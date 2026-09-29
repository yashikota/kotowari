package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

func (s *Server) createIssue(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Title          string                           `json:"title"`
		Body           string                           `json:"body"`
		Status         string                           `json:"status"`
		WorkflowStatus string                           `json:"workflowStatus"`
		Assignee       string                           `json:"assignee"`
		Type           string                           `json:"type"`
		Priority       int                              `json:"priority"`
		Estimate       *int                             `json:"estimate"`
		ProjectID      *int64                           `json:"projectId"`
		MilestoneID    *int64                           `json:"milestoneId"`
		CycleID        *int64                           `json:"cycleId"`
		ParentID       *int64                           `json:"parentId"`
		DueDate        *string                          `json:"dueDate"`
		LabelIDs       []int64                          `json:"labelIds"`
		Links          []model.CreateIssueLinkInput     `json:"links"`
		TemplateSlug   string                           `json:"templateSlug"`
		Recurring      *model.CreateRecurringIssueInput `json:"recurring"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	issueInput := model.CreateIssueInput{
		Title: in.Title, Body: in.Body, Status: in.Status, WorkflowStatus: in.WorkflowStatus, Assignee: in.Assignee, Type: in.Type, Priority: in.Priority, Estimate: in.Estimate,
		ProjectID: in.ProjectID, MilestoneID: in.MilestoneID, CycleID: in.CycleID, ParentID: in.ParentID, DueDate: in.DueDate, LabelIDs: in.LabelIDs, ExternalLinks: in.Links, TemplateSlug: in.TemplateSlug,
	}
	if in.Recurring != nil {
		schedule, err := s.store.CreateRecurringIssueFromInput(issueInput, *in.Recurring)
		if err != nil {
			writeError(w, err)
			return
		}
		out, err := s.store.GetIssue(schedule.LastIssueIdentifier)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
		return
	}
	out, err := s.store.CreateIssue(issueInput)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) getIssue(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.GetIssue(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) deleteIssue(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteIssue(r.PathValue("id")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
