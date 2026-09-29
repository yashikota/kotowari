package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

func (s *Server) listRecurringIssues(w http.ResponseWriter, _ *http.Request) {
	if err := s.store.ProcessDueRecurringIssues(); err != nil {
		writeError(w, err)
		return
	}
	items, err := s.store.ListRecurringIssues()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) createRecurringIssue(w http.ResponseWriter, r *http.Request) {
	var in model.CreateRecurringIssueInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	item, err := s.store.CreateRecurringIssue(r.PathValue("id"), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (s *Server) patchRecurringIssue(w http.ResponseWriter, r *http.Request) {
	var in model.SetRecurringIssueEnabledInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "enabled is required"})
		return
	}
	item, err := s.store.SetRecurringIssueEnabled(r.PathValue("slug"), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (s *Server) deleteRecurringIssue(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteRecurringIssue(r.PathValue("slug")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
