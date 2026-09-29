package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

func (s *Server) getWorkspace(w http.ResponseWriter, _ *http.Request) {
	ws, err := s.store.Workspace()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ws)
}

func (s *Server) listIssueWorkflowStatuses(w http.ResponseWriter, _ *http.Request) {
	statuses, err := s.store.IssueWorkflowStatuses()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, statuses)
}

func (s *Server) updateIssueWorkflowStatuses(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Statuses []model.IssueWorkflowStatus `json:"statuses"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	statuses, err := s.store.UpdateIssueWorkflowStatuses(in.Statuses)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, statuses)
}

func (s *Server) listProjectWorkflowStatuses(w http.ResponseWriter, _ *http.Request) {
	statuses, err := s.store.ProjectWorkflowStatuses()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, statuses)
}

func (s *Server) updateProjectWorkflowStatuses(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Statuses []model.ProjectWorkflowStatus `json:"statuses"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	statuses, err := s.store.UpdateProjectWorkflowStatuses(in.Statuses)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, statuses)
}

func (s *Server) listDiagnostics(w http.ResponseWriter, _ *http.Request) {
	diags, err := s.store.Diagnostics()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, diags)
}

func (s *Server) patchWorkspace(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name                    *string                        `json:"name"`
		Timezone                *string                        `json:"timezone"`
		Locale                  *string                        `json:"locale"`
		URL                     *string                        `json:"url"`
		Description             *string                        `json:"description"`
		GitHubURL               *string                        `json:"githubUrl"`
		CycleSettings           *model.CycleSettings           `json:"cycleSettings"`
		IssueAutomationSettings *model.IssueAutomationSettings `json:"issueAutomationSettings"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	ws, err := s.store.UpdateWorkspace(
		in.Name, in.Timezone, in.Locale, in.URL, in.Description, in.GitHubURL, in.CycleSettings, in.IssueAutomationSettings,
	)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ws)
}

func (s *Server) listLabels(w http.ResponseWriter, _ *http.Request) {
	out, err := s.store.ListLabels()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) createLabel(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreateLabel(in.Name, in.Color)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}
