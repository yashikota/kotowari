package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/store"
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
	var in struct {
		Name         string `json:"name"`
		FirstDueDate string `json:"firstDueDate"`
		Interval     int    `json:"interval"`
		Unit         string `json:"unit"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	item, err := s.store.CreateRecurringIssue(r.PathValue("id"), store.CreateRecurringIssueInput{
		Name: in.Name, FirstDueDate: in.FirstDueDate, Interval: in.Interval, Unit: in.Unit,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (s *Server) patchRecurringIssue(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Enabled *bool `json:"enabled"`
	}
	if err := decodeJSON(r, &in); err != nil || in.Enabled == nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "enabled is required"})
		return
	}
	item, err := s.store.SetRecurringIssueEnabled(r.PathValue("slug"), *in.Enabled)
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
