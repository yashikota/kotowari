package httpapi

import (
	"net/http"
	"strings"
)

func (s *Server) listProjectTemplates(w http.ResponseWriter, _ *http.Request) {
	templates, err := s.store.ListProjectTemplates()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, templates)
}

func (s *Server) createProjectTemplate(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name string `json:"name"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	template, err := s.store.CreateProjectTemplate(r.PathValue("slug"), strings.TrimSpace(in.Name))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, template)
}

func (s *Server) deleteProjectTemplate(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteProjectTemplate(r.PathValue("slug")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
