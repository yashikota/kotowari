package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

func (s *Server) listProjects(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.ListProjectsByArchived(r.URL.Query().Get("archived") == "true")
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) createProject(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name           string                    `json:"name"`
		Slug           string                    `json:"slug"`
		Summary        string                    `json:"summary"`
		Icon           string                    `json:"icon"`
		IconColor      string                    `json:"iconColor"`
		Description    string                    `json:"description"`
		Status         string                    `json:"status"`
		WorkflowStatus string                    `json:"workflowStatus"`
		TemplateSlug   string                    `json:"templateSlug"`
		Lead           string                    `json:"lead"`
		Priority       int                       `json:"priority"`
		StartDate      *string                   `json:"startDate"`
		TargetDate     *string                   `json:"targetDate"`
		Labels         []string                  `json:"labels"`
		Milestones     []model.MilestoneInput    `json:"milestones"`
		Dependencies   []model.ProjectDependency `json:"dependencies"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreateProjectFromInput(model.ProjectCreateInput{
		Name: in.Name, Slug: in.Slug, Summary: in.Summary, Icon: in.Icon,
		IconColor: in.IconColor, Description: in.Description, Status: in.Status,
		WorkflowStatus: in.WorkflowStatus, Priority: in.Priority,
		StartDate: in.StartDate, TargetDate: in.TargetDate, Labels: in.Labels,
		Options: model.ProjectCreationOptions{
			TemplateSlug: in.TemplateSlug, Lead: in.Lead,
			Milestones: in.Milestones, Dependencies: in.Dependencies,
		},
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) getProject(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.GetProject(r.PathValue("slug"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) patchProject(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name            *string   `json:"name"`
		Summary         *string   `json:"summary"`
		Icon            *string   `json:"icon"`
		IconColor       *string   `json:"iconColor"`
		Description     *string   `json:"description"`
		Status          *string   `json:"status"`
		WorkflowStatus  *string   `json:"workflowStatus"`
		IsFavorite      *bool     `json:"isFavorite"`
		Lead            *string   `json:"lead"`
		Health          *string   `json:"health"`
		Priority        *int      `json:"priority"`
		StartDate       *string   `json:"startDate"`
		TargetDate      *string   `json:"targetDate"`
		Labels          *[]string `json:"labels"`
		InitiativeSlugs *[]string `json:"initiativeSlugs"`
		Archived        *bool     `json:"archived"`
		ClearStart      bool      `json:"clearStartDate"`
		ClearTarget     bool      `json:"clearTargetDate"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	archiveOnly := in.Archived != nil && in.Name == nil && in.Summary == nil && in.Icon == nil &&
		in.IconColor == nil && in.Description == nil && in.Status == nil && in.WorkflowStatus == nil &&
		in.IsFavorite == nil && in.Lead == nil && in.Health == nil && in.Priority == nil &&
		in.StartDate == nil && in.TargetDate == nil && in.Labels == nil && in.InitiativeSlugs == nil &&
		!in.ClearStart && !in.ClearTarget
	if archiveOnly {
		out, err := s.store.SetProjectArchived(r.PathValue("slug"), *in.Archived)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, out)
		return
	}
	hasContentPatch := in.Name != nil || in.Summary != nil || in.Icon != nil || in.IconColor != nil ||
		in.Description != nil || in.Status != nil || in.WorkflowStatus != nil || in.Lead != nil ||
		in.Health != nil || in.Priority != nil || in.StartDate != nil || in.TargetDate != nil ||
		in.Labels != nil || in.InitiativeSlugs != nil || in.Archived != nil || in.ClearStart || in.ClearTarget
	if in.IsFavorite != nil && !hasContentPatch {
		out, err := s.store.UpdateProjectFavorite(r.PathValue("slug"), *in.IsFavorite)
		if err == nil {
			out, err = s.store.GetProject(r.PathValue("slug"))
		}
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, out)
		return
	}
	var start, target **string
	if in.ClearStart {
		var nils *string
		start = &nils
	} else if in.StartDate != nil {
		start = &in.StartDate
	}
	if in.ClearTarget {
		var nils *string
		target = &nils
	} else if in.TargetDate != nil {
		target = &in.TargetDate
	}
	out, err := s.store.UpdateProjectFromInput(model.ProjectUpdateInput{
		Slug: r.PathValue("slug"), Name: in.Name, Summary: in.Summary,
		Icon: in.Icon, IconColor: in.IconColor, Description: in.Description,
		Status: in.Status, WorkflowStatus: in.WorkflowStatus, Health: in.Health,
		Lead: in.Lead, Priority: in.Priority, StartDate: start, TargetDate: target,
		Labels: in.Labels, InitiativeSlugs: in.InitiativeSlugs,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	if in.Archived != nil {
		out, err = s.store.SetProjectArchived(r.PathValue("slug"), *in.Archived)
		if err != nil {
			writeError(w, err)
			return
		}
	}
	if in.IsFavorite != nil {
		_, err = s.store.UpdateProjectFavorite(r.PathValue("slug"), *in.IsFavorite)
		if err != nil {
			writeError(w, err)
			return
		}
		out, err = s.store.GetProject(r.PathValue("slug"))
		if err != nil {
			writeError(w, err)
			return
		}
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) deleteProject(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteProject(r.PathValue("slug")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) createProjectDependency(w http.ResponseWriter, r *http.Request) {
	var in struct {
		ProjectSlug string `json:"projectSlug"`
		Kind        string `json:"kind"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.AddProjectDependency(r.PathValue("slug"), in.ProjectSlug, in.Kind)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) deleteProjectDependency(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.DeleteProjectDependency(r.PathValue("slug"), r.PathValue("dependencySlug"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}
