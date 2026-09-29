package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

func (s *Server) listIssueTemplates(w http.ResponseWriter, _ *http.Request) {
	templates, err := s.store.ListIssueTemplates()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, templates)
}

func (s *Server) createIssueTemplate(w http.ResponseWriter, r *http.Request) {
	var in model.CreateTemplateInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	template, err := s.store.CreateIssueTemplate(r.PathValue("id"), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, template)
}

func (s *Server) deleteIssueTemplate(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteIssueTemplate(r.PathValue("slug")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
