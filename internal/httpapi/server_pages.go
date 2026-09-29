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
	var in struct {
		Title     string   `json:"title"`
		Slug      string   `json:"slug"`
		Body      string   `json:"body"`
		Status    string   `json:"status"`
		ParentID  *int64   `json:"parentId"`
		ProjectID *int64   `json:"projectId"`
		Date      *string  `json:"date"`
		Tags      []string `json:"tags"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreatePageFromInput(model.CreatePageInput{
		Title: in.Title, Slug: in.Slug, Body: in.Body, Status: in.Status,
		ParentID: in.ParentID, ProjectID: in.ProjectID, Date: in.Date, Tags: in.Tags,
	})
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
	title, body, status, parentID, projectID, date, tags, err := request.values()
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	out, err := s.store.UpdatePageFromInput(model.UpdatePageInput{
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
