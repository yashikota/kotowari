package httpapi

import (
	"net/http"
	"strconv"

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
	var in model.UpdateWorkspaceInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	ws, err := s.store.UpdateWorkspace(in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ws)
}

func (s *Server) createWorkspaceResource(w http.ResponseWriter, r *http.Request) {
	var in model.CreateWorkspaceResourceInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	resource, err := s.store.AddWorkspaceResource(in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, resource)
}

func (s *Server) deleteWorkspaceResource(w http.ResponseWriter, r *http.Request) {
	resourceID, err := strconv.ParseInt(r.PathValue("resourceId"), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid resource id"})
		return
	}
	if err := s.store.RemoveWorkspaceResource(resourceID); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
	var in model.CreateLabelInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreateLabel(in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}
