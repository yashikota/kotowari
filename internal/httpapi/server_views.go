package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

func viewInput(r *http.Request) (model.CreateViewInput, error) {
	var in struct {
		Name                string                 `json:"name"`
		Slug                string                 `json:"slug"`
		IsFavorite          *bool                  `json:"isFavorite"`
		Description         *string                `json:"description"`
		Icon                *string                `json:"icon"`
		Display             string                 `json:"display"`
		GroupBy             string                 `json:"groupBy"`
		SubGroupBy          string                 `json:"subGroupBy"`
		OrderBy             string                 `json:"orderBy"`
		Direction           string                 `json:"direction"`
		CompletedIssues     string                 `json:"completedIssues"`
		ShowSubIssues       *bool                  `json:"showSubIssues"`
		NestedSubIssues     string                 `json:"nestedSubIssues"`
		ShowEmptyGroups     *bool                  `json:"showEmptyGroups"`
		DisplayProperties   []string               `json:"displayProperties"`
		Status              *string                `json:"status"`
		Statuses            []string               `json:"statuses"`
		Assignee            *string                `json:"assignee"`
		Subscriber          *string                `json:"subscriber"`
		Project             *string                `json:"project"`
		Cycle               *int                   `json:"cycle"`
		Labels              []string               `json:"labels"`
		LabelOperator       string                 `json:"labelOperator"`
		Priority            *int                   `json:"priority"`
		Priorities          []int                  `json:"priorities"`
		Type                *string                `json:"type"`
		Estimate            *int                   `json:"estimate"`
		Estimates           []int                  `json:"estimates"`
		NoEstimate          *bool                  `json:"noEstimate"`
		DueDate             *string                `json:"dueDate"`
		Relation            *string                `json:"relation"`
		LinkSources         []string               `json:"linkSources"`
		TemplateSlugs       []string               `json:"templateSlugs"`
		Content             *string                `json:"content"`
		MilestoneName       *string                `json:"milestoneName"`
		ProjectLabels       []string               `json:"projectLabels"`
		DateField           *string                `json:"dateField"`
		DateRange           *string                `json:"dateRange"`
		ProjectStatus       *string                `json:"projectStatus"`
		ProjectPriority     *int                   `json:"projectPriority"`
		AddedToCycle        []string               `json:"addedToCycle"`
		AdvancedFilter      *bool                  `json:"advancedFilter"`
		AdvancedFilterGroup *model.IssueFilterNode `json:"advancedFilterGroup"`
	}
	if err := decodeJSON(r, &in); err != nil {
		return model.CreateViewInput{}, err
	}
	return model.CreateViewInput{
		Name: in.Name, Slug: in.Slug, IsFavorite: in.IsFavorite, Description: in.Description, Icon: in.Icon, Display: in.Display, GroupBy: in.GroupBy, SubGroupBy: in.SubGroupBy, OrderBy: in.OrderBy,
		Direction: in.Direction, CompletedIssues: in.CompletedIssues, ShowSubIssues: in.ShowSubIssues,
		NestedSubIssues: in.NestedSubIssues, ShowEmptyGroups: in.ShowEmptyGroups, DisplayProperties: in.DisplayProperties,
		Status: in.Status, Statuses: in.Statuses, Assignee: in.Assignee, Subscriber: in.Subscriber,
		Project: in.Project, Cycle: in.Cycle, Labels: in.Labels, LabelOperator: in.LabelOperator, Priority: in.Priority, Priorities: in.Priorities, Type: in.Type, Estimate: in.Estimate, Estimates: in.Estimates, NoEstimate: in.NoEstimate, DueDate: in.DueDate, Relation: in.Relation, LinkSources: in.LinkSources, TemplateSlugs: in.TemplateSlugs, Content: in.Content, MilestoneName: in.MilestoneName, DateField: in.DateField, DateRange: in.DateRange, ProjectStatus: in.ProjectStatus, ProjectPriority: in.ProjectPriority, ProjectLabels: in.ProjectLabels, AddedToCycle: in.AddedToCycle,
		AdvancedFilter: in.AdvancedFilter, AdvancedFilterGroup: in.AdvancedFilterGroup,
	}, nil
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
	out, err := s.store.UpdateView(r.PathValue("slug"), in)
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
