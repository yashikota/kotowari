package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

func (s *Server) listInitiatives(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.ListInitiatives()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) getInitiative(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.GetInitiative(r.PathValue("slug"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) listInitiativeActivities(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.ListInitiativeActivities(r.PathValue("slug"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) postInitiativeUpdate(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Health string `json:"health"`
		Body   string `json:"body"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.PostInitiativeUpdate(r.PathValue("slug"), in.Health, in.Body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) createInitiative(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name         string   `json:"name"`
		Slug         string   `json:"slug"`
		Description  string   `json:"description"`
		Status       string   `json:"status"`
		Color        string   `json:"color"`
		Health       string   `json:"health"`
		Priority     int      `json:"priority"`
		Labels       []string `json:"labels"`
		StartDate    *string  `json:"startDate"`
		TargetDate   *string  `json:"targetDate"`
		ProjectSlugs []string `json:"projectSlugs"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreateInitiativeFromInput(model.CreateInitiativeInput{
		Name: in.Name, Slug: in.Slug, Description: in.Description, Status: in.Status, Color: in.Color,
		StartDate: in.StartDate, TargetDate: in.TargetDate, ProjectSlugs: in.ProjectSlugs,
		Health: in.Health, Priority: in.Priority, Labels: in.Labels,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) patchInitiative(w http.ResponseWriter, r *http.Request) {
	var in initiativePatchRequest
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.UpdateInitiative(r.PathValue("slug"), in.updateInput())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) deleteInitiative(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteInitiative(r.PathValue("slug")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
