package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

func viewInput(r *http.Request) (model.CreateViewInput, error) {
	var in model.CreateViewInput
	if err := decodeJSON(r, &in); err != nil {
		return model.CreateViewInput{}, err
	}
	return in, nil
}

func (s *Server) listViews(w http.ResponseWriter, _ *http.Request) {
	out, err := s.store.ListViews()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) listIssueLinkSources(w http.ResponseWriter, _ *http.Request) {
	out, err := s.store.IssueLinkSources()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) listIssueTemplateFilterOptions(w http.ResponseWriter, _ *http.Request) {
	out, err := s.store.IssueTemplateFilterOptions()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) createView(w http.ResponseWriter, r *http.Request) {
	in, err := viewInput(r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreateView(in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) getView(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.GetView(r.PathValue("slug"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) patchView(w http.ResponseWriter, r *http.Request) {
	in, err := viewInput(r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if in.IsFavorite != nil && !hasViewContentPatch(in) {
		out, err := s.store.UpdateViewFavorite(r.PathValue("slug"), *in.IsFavorite)
		if err == nil {
			out, err = s.store.GetView(r.PathValue("slug"))
		}
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, out)
		return
	}
	favorite := in.IsFavorite
	in.IsFavorite = nil
	out, err := s.store.UpdateView(r.PathValue("slug"), model.UpdateViewInput(in))
	if err != nil {
		writeError(w, err)
		return
	}
	if favorite != nil {
		_, err = s.store.UpdateViewFavorite(r.PathValue("slug"), *favorite)
		if err == nil {
			out, err = s.store.GetView(r.PathValue("slug"))
		}
		if err != nil {
			writeError(w, err)
			return
		}
	}
	writeJSON(w, http.StatusOK, out)
}

func hasViewContentPatch(in model.CreateViewInput) bool {
	return in.Name != "" || in.Description != nil || in.Icon != nil || in.Display != "" || in.GroupBy != "" ||
		in.OrderBy != "" || in.SubGroupBy != "" || in.Direction != "" || in.CompletedIssues != "" ||
		in.ShowSubIssues != nil || in.NestedSubIssues != "" || in.ShowEmptyGroups != nil || in.DisplayProperties != nil ||
		in.Status != nil || in.Statuses != nil || in.Assignee != nil || in.Subscriber != nil || in.Project != nil || in.Cycle != nil ||
		in.Labels != nil || in.LabelOperator != "" || in.Priority != nil || in.Priorities != nil || in.Type != nil ||
		in.Estimate != nil || in.Estimates != nil || in.NoEstimate != nil || in.DueDate != nil || in.Relation != nil ||
		in.LinkSources != nil || in.TemplateSlugs != nil || in.Content != nil || in.MilestoneName != nil ||
		in.DateField != nil || in.DateRange != nil || in.ProjectStatus != nil || in.ProjectPriority != nil ||
		in.ProjectLabels != nil || in.AddedToCycle != nil || in.AdvancedFilter != nil || in.AdvancedFilterGroup != nil
}

func (s *Server) deleteView(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteView(r.PathValue("slug")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
