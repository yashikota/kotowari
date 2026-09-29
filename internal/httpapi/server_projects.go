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
	out, err := s.store.CreateProject(model.ProjectCreateInput{
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
	var in projectPatchRequest
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if in.archiveOnly() {
		out, err := s.store.SetProjectArchived(r.PathValue("slug"), *in.Archived)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, out)
		return
	}
	if in.IsFavorite != nil && !in.hasContentPatch() {
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
	out, err := s.store.UpdateProject(in.updateInput(r.PathValue("slug")))
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
	var in model.CreateProjectDependencyInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.AddProjectDependency(r.PathValue("slug"), in)
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
