package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/store"
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
	out, err := s.store.CreateInitiativeWithOptions(in.Name, in.Slug, in.Description, in.Status, in.Color, in.StartDate, in.TargetDate, in.ProjectSlugs, in.Health, in.Priority, in.Labels)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) patchInitiative(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name            *string   `json:"name"`
		Description     *string   `json:"description"`
		Status          *string   `json:"status"`
		Color           *string   `json:"color"`
		Health          *string   `json:"health"`
		Priority        *int      `json:"priority"`
		Labels          *[]string `json:"labels"`
		StartDate       *string   `json:"startDate"`
		TargetDate      *string   `json:"targetDate"`
		ClearStartDate  bool      `json:"clearStartDate"`
		ClearTargetDate bool      `json:"clearTargetDate"`
		ProjectSlugs    *[]string `json:"projectSlugs"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	var start, target **string
	if in.ClearStartDate {
		var nilValue *string
		start = &nilValue
	} else if in.StartDate != nil {
		start = &in.StartDate
	}
	if in.ClearTargetDate {
		var nilValue *string
		target = &nilValue
	} else if in.TargetDate != nil {
		target = &in.TargetDate
	}
	out, err := s.store.UpdateInitiative(r.PathValue("slug"), store.UpdateInitiativeInput{
		Name: in.Name, Description: in.Description, Status: in.Status, Color: in.Color,
		Health: in.Health, Priority: in.Priority, Labels: in.Labels,
		StartDate: start, TargetDate: target, ProjectSlugs: in.ProjectSlugs,
	})
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
