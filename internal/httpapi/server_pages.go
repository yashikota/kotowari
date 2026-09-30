package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

func (s *Server) listPages(w http.ResponseWriter, _ *http.Request) {
	out, err := s.store.ListPages()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) createPage(w http.ResponseWriter, r *http.Request) {
	var in model.CreatePageInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreatePage(in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) getPage(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.GetPage(r.PathValue("slug"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) patchPage(w http.ResponseWriter, r *http.Request) {
	var request pagePatchRequest
	if err := decodeJSON(r, &request); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	title, body, status, parentID, projectID, date, tags := request.values()
	out, err := s.store.UpdatePage(model.UpdatePageInput{
		Slug: r.PathValue("slug"), Title: title, Body: body, Status: status,
		ParentID: parentID, ProjectID: projectID, Date: date, Tags: tags,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) deletePage(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeletePage(r.PathValue("slug")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
