package httpapi

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"

	"github.com/yashikota/kotowari/internal/acp"

	"github.com/yashikota/kotowari/internal/domain"
	"github.com/yashikota/kotowari/internal/store"
)

type Server struct {
	aiMu     sync.Mutex
	sessions map[string]*acp.Session
	store    *store.Store
	dist     fs.FS
	mux      *http.ServeMux
}

func New(st *store.Store, dist fs.FS) *Server {
	s := &Server{store: st, dist: dist, mux: http.NewServeMux(), sessions: map[string]*acp.Session{}}
	s.routes()
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if origin := r.Header.Get("Origin"); origin != "" {
		if !originAllowed(r, origin) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "origin denied"})
			return
		}
	}
	if r.Header.Get("Sec-Fetch-Site") == "cross-site" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "cross-site request denied"})
		return
	}
	s.mux.ServeHTTP(w, r)
}

func originAllowed(r *http.Request, origin string) bool {
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	if u.Host == r.Host {
		return true
	}
	if fwd := r.Header.Get("X-Forwarded-Host"); fwd != "" && u.Host == fwd {
		return true
	}
	return false
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /api/revision", func(w http.ResponseWriter, r *http.Request) {
		if err := s.store.ProcessDueRecurringIssues(); err != nil {
			writeError(w, err)
			return
		}
		hash, err := s.store.ContentHash()
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, 200, map[string]string{"revision": hash})
	})
	s.mux.HandleFunc("GET /api/ai/{kind}/{id}", s.getAI)
	s.mux.HandleFunc("POST /api/ai/{kind}/{id}", s.postAI)
	s.mux.HandleFunc("GET /api/documents/{kind}/{id}/{field}", s.getDocument)
	s.mux.HandleFunc("PUT /api/documents/{kind}/{id}/{field}", s.saveDocument)
	s.mux.HandleFunc("GET /api/documents/{kind}/{id}/{field}/history", s.documentHistory)
	s.mux.HandleFunc("GET /api/adrs/{id}/assets/{path...}", s.adrAsset)
	s.mux.HandleFunc("GET /api/adrs/{id}/export", s.exportADR)
	s.mux.HandleFunc("GET /api/workspace", s.getWorkspace)
	s.mux.HandleFunc("PATCH /api/workspace", s.patchWorkspace)
	s.mux.HandleFunc("GET /api/issue-workflow-statuses", s.listIssueWorkflowStatuses)
	s.mux.HandleFunc("PUT /api/issue-workflow-statuses", s.updateIssueWorkflowStatuses)
	s.mux.HandleFunc("GET /api/project-workflow-statuses", s.listProjectWorkflowStatuses)
	s.mux.HandleFunc("PUT /api/project-workflow-statuses", s.updateProjectWorkflowStatuses)
	s.mux.HandleFunc("GET /api/labels", s.listLabels)
	s.mux.HandleFunc("POST /api/labels", s.createLabel)
	s.mux.HandleFunc("GET /api/projects", s.listProjects)
	s.mux.HandleFunc("POST /api/projects", s.createProject)
	s.mux.HandleFunc("GET /api/project-templates", s.listProjectTemplates)
	s.mux.HandleFunc("POST /api/projects/{slug}/templates", s.createProjectTemplate)
	s.mux.HandleFunc("DELETE /api/project-templates/{slug}", s.deleteProjectTemplate)
	s.mux.HandleFunc("GET /api/projects/{slug}/activities", s.listProjectActivities)
	s.mux.HandleFunc("POST /api/projects/{slug}/updates", s.postProjectUpdate)
	s.mux.HandleFunc("GET /api/projects/{slug}", s.getProject)
	s.mux.HandleFunc("PATCH /api/projects/{slug}", s.patchProject)
	s.mux.HandleFunc("DELETE /api/projects/{slug}", s.deleteProject)
	s.mux.HandleFunc("POST /api/projects/{slug}/dependencies", s.createProjectDependency)
	s.mux.HandleFunc("DELETE /api/projects/{slug}/dependencies/{dependencySlug}", s.deleteProjectDependency)
	s.mux.HandleFunc("POST /api/projects/{slug}/milestones", s.createMilestone)
	s.mux.HandleFunc("PATCH /api/projects/{slug}/milestones/{milestoneId}", s.patchMilestone)
	s.mux.HandleFunc("DELETE /api/projects/{slug}/milestones/{milestoneId}", s.deleteMilestone)
	s.mux.HandleFunc("GET /api/cycles", s.listCycles)
	s.mux.HandleFunc("POST /api/cycles", s.createCycle)
	s.mux.HandleFunc("GET /api/cycles/{number}/activities", s.listCycleActivities)
	s.mux.HandleFunc("GET /api/cycles/{number}", s.getCycle)
	s.mux.HandleFunc("PATCH /api/cycles/{number}", s.patchCycle)
	s.mux.HandleFunc("POST /api/cycles/{number}/links", s.addCycleLink)
	s.mux.HandleFunc("DELETE /api/cycles/{number}/links/{resourceId}", s.removeCycleLink)
	s.mux.HandleFunc("GET /api/views", s.listViews)
	s.mux.HandleFunc("POST /api/views", s.createView)
	s.mux.HandleFunc("GET /api/views/{slug}", s.getView)
	s.mux.HandleFunc("PATCH /api/views/{slug}", s.patchView)
	s.mux.HandleFunc("DELETE /api/views/{slug}", s.deleteView)
	s.mux.HandleFunc("GET /api/issues", s.listIssues)
	s.mux.HandleFunc("POST /api/issues", s.createIssue)
	s.mux.HandleFunc("GET /api/issue-templates", s.listIssueTemplates)
	s.mux.HandleFunc("POST /api/issues/{id}/templates", s.createIssueTemplate)
	s.mux.HandleFunc("POST /api/issues/{id}/projects", s.createProjectFromIssue)
	s.mux.HandleFunc("DELETE /api/issue-templates/{slug}", s.deleteIssueTemplate)
	s.mux.HandleFunc("GET /api/recurring-issues", s.listRecurringIssues)
	s.mux.HandleFunc("POST /api/issues/{id}/recurrences", s.createRecurringIssue)
	s.mux.HandleFunc("PATCH /api/recurring-issues/{slug}", s.patchRecurringIssue)
	s.mux.HandleFunc("DELETE /api/recurring-issues/{slug}", s.deleteRecurringIssue)
	s.mux.HandleFunc("GET /api/issues/{id}", s.getIssue)
	s.mux.HandleFunc("PATCH /api/issues/{id}", s.patchIssue)
	s.mux.HandleFunc("DELETE /api/issues/{id}", s.deleteIssue)
	s.mux.HandleFunc("POST /api/issues/{id}/links", s.addIssueLink)
	s.mux.HandleFunc("DELETE /api/issues/{id}/links/{linkId}", s.removeIssueLink)
	s.mux.HandleFunc("POST /api/issues/{id}/relations", s.addIssueRelation)
	s.mux.HandleFunc("DELETE /api/issues/{id}/relations/{relationId}", s.removeIssueRelation)
	s.mux.HandleFunc("GET /api/issues/{id}/comments", s.listComments)
	s.mux.HandleFunc("POST /api/issues/{id}/comments", s.addComment)
	s.mux.HandleFunc("PATCH /api/issues/{id}/comments/{commentId}", s.patchComment)
	s.mux.HandleFunc("DELETE /api/issues/{id}/comments/{commentId}", s.deleteComment)
	s.mux.HandleFunc("POST /api/issues/{id}/comments/{commentId}/reactions", s.toggleCommentReaction)
	s.mux.HandleFunc("POST /api/issues/{id}/reactions", s.toggleIssueReaction)
	s.mux.HandleFunc("POST /api/issues/{id}/attachments", s.addIssueAttachments)
	s.mux.HandleFunc("GET /api/issues/{id}/attachments/{attachmentId}", s.getIssueCommentAttachment)
	s.mux.HandleFunc("DELETE /api/issues/{id}/attachments/{attachmentId}", s.deleteIssueAttachment)
	s.mux.HandleFunc("GET /api/issues/{id}/activities", s.listActivities)
	s.mux.HandleFunc("GET /api/pages", s.listPages)
	s.mux.HandleFunc("POST /api/pages", s.createPage)
	s.mux.HandleFunc("GET /api/pages/{slug}", s.getPage)
	s.mux.HandleFunc("PATCH /api/pages/{slug}", s.patchPage)
	s.mux.HandleFunc("DELETE /api/pages/{slug}", s.deletePage)
	s.mux.HandleFunc("GET /api/adrs", s.listADRs)
	s.mux.HandleFunc("POST /api/adrs", s.createADR)
	s.mux.HandleFunc("GET /api/adrs/{id}", s.getADR)
	s.mux.HandleFunc("PATCH /api/adrs/{id}", s.patchADR)
	s.mux.HandleFunc("DELETE /api/adrs/{id}", s.deleteADR)
	s.mux.HandleFunc("POST /api/adrs/{id}/publish", s.publishADR)
	s.mux.HandleFunc("POST /api/adrs/{id}/links/issues", s.linkADRIssue)
	s.mux.HandleFunc("DELETE /api/adrs/{id}/links/issues/{number}", s.unlinkADRIssue)
	s.mux.HandleFunc("POST /api/issues/{id}/links/adrs", s.linkIssueADR)
	s.mux.HandleFunc("DELETE /api/issues/{id}/links/adrs/{number}", s.unlinkIssueADR)
	s.mux.HandleFunc("GET /api/search", s.search)
	s.mux.HandleFunc("GET /api/commands", s.commands)
	s.mux.HandleFunc("GET /api/diagnostics", s.listDiagnostics)
	s.mux.Handle("/", http.HandlerFunc(s.spa))
}

func (s *Server) spa(w http.ResponseWriter, r *http.Request) {
	if s.dist == nil || strings.HasPrefix(r.URL.Path, "/api/") {
		http.NotFound(w, r)
		return
	}
	p := strings.TrimPrefix(r.URL.Path, "/")
	if p == "" {
		p = "index.html"
	}
	info, err := fs.Stat(s.dist, p)
	if err != nil || info.IsDir() {
		p = "index.html"
	}
	http.ServeFileFS(w, r, s.dist, p)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("write json", "err", err)
	}
}

func writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
	case errors.Is(err, store.ErrValidation):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	case errors.Is(err, store.ErrConflict):
		writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
	default:
		slog.Error("api error", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
	}
}

func decodeJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

func (s *Server) getWorkspace(w http.ResponseWriter, _ *http.Request) {
	ws, err := s.store.Workspace()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ws)
}

func (s *Server) listIssueWorkflowStatuses(w http.ResponseWriter, _ *http.Request) {
	statuses, err := s.store.IssueWorkflowStatuses()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, statuses)
}

func (s *Server) updateIssueWorkflowStatuses(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Statuses []store.IssueWorkflowStatus `json:"statuses"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	statuses, err := s.store.UpdateIssueWorkflowStatuses(in.Statuses)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, statuses)
}

func (s *Server) listProjectWorkflowStatuses(w http.ResponseWriter, _ *http.Request) {
	statuses, err := s.store.ProjectWorkflowStatuses()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, statuses)
}

func (s *Server) updateProjectWorkflowStatuses(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Statuses []store.ProjectWorkflowStatus `json:"statuses"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	statuses, err := s.store.UpdateProjectWorkflowStatuses(in.Statuses)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, statuses)
}

func (s *Server) listDiagnostics(w http.ResponseWriter, _ *http.Request) {
	diags, err := s.store.Diagnostics()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, diags)
}

func (s *Server) patchWorkspace(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name        *string `json:"name"`
		Timezone    *string `json:"timezone"`
		Locale      *string `json:"locale"`
		URL         *string `json:"url"`
		Description *string `json:"description"`
		GitHubURL   *string `json:"githubUrl"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	ws, err := s.store.UpdateWorkspace(in.Name, in.Timezone, in.Locale, in.URL, in.Description, in.GitHubURL)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ws)
}

func (s *Server) listLabels(w http.ResponseWriter, _ *http.Request) {
	out, err := s.store.ListLabels()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) createLabel(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreateLabel(in.Name, in.Color)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) listProjects(w http.ResponseWriter, _ *http.Request) {
	out, err := s.store.ListProjects()
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
		Priority       int                       `json:"priority"`
		StartDate      *string                   `json:"startDate"`
		TargetDate     *string                   `json:"targetDate"`
		Labels         []string                  `json:"labels"`
		Milestones     []store.MilestoneInput    `json:"milestones"`
		Dependencies   []store.ProjectDependency `json:"dependencies"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreateProjectWithWorkflowAndOptions(in.Name, in.Slug, in.Summary, in.Icon, in.IconColor, in.Description, in.Status, in.WorkflowStatus, in.Priority, in.StartDate, in.TargetDate, in.Labels, store.ProjectCreationOptions{TemplateSlug: in.TemplateSlug, Milestones: in.Milestones, Dependencies: in.Dependencies})
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
		Name           *string   `json:"name"`
		Summary        *string   `json:"summary"`
		Icon           *string   `json:"icon"`
		IconColor      *string   `json:"iconColor"`
		Description    *string   `json:"description"`
		Status         *string   `json:"status"`
		WorkflowStatus *string   `json:"workflowStatus"`
		Health         *string   `json:"health"`
		Priority       *int      `json:"priority"`
		StartDate      *string   `json:"startDate"`
		TargetDate     *string   `json:"targetDate"`
		Labels         *[]string `json:"labels"`
		ClearStart     bool      `json:"clearStartDate"`
		ClearTarget    bool      `json:"clearTargetDate"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
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
	out, err := s.store.UpdateProjectWithWorkflow(r.PathValue("slug"), in.Name, in.Summary, in.Icon, in.IconColor, in.Description, in.Status, in.WorkflowStatus, in.Health, in.Priority, start, target, in.Labels)
	if err != nil {
		writeError(w, err)
		return
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

func (s *Server) listCycles(w http.ResponseWriter, _ *http.Request) {
	out, err := s.store.ListCycles()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) createCycle(w http.ResponseWriter, r *http.Request) {
	var in struct {
		StartsAt string `json:"startsAt"`
		EndsAt   string `json:"endsAt"`
		Status   string `json:"status"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreateCycle(in.StartsAt, in.EndsAt, in.Status)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) getCycle(w http.ResponseWriter, r *http.Request) {
	n, err := strconv.Atoi(r.PathValue("number"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid cycle number"})
		return
	}
	out, err := s.store.GetCycle(n)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) listCycleActivities(w http.ResponseWriter, r *http.Request) {
	n, err := strconv.Atoi(r.PathValue("number"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid cycle number"})
		return
	}
	out, err := s.store.ListCycleActivities(n)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) patchCycle(w http.ResponseWriter, r *http.Request) {
	n, err := strconv.Atoi(r.PathValue("number"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid cycle number"})
		return
	}
	var in struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		StartsAt    *string `json:"startsAt"`
		EndsAt      *string `json:"endsAt"`
		Status      *string `json:"status"`
		IsFavorite  *bool   `json:"isFavorite"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.UpdateCycle(n, store.UpdateCycleInput{
		Name: in.Name, Description: in.Description, StartsAt: in.StartsAt, EndsAt: in.EndsAt,
		Status: in.Status, IsFavorite: in.IsFavorite,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func viewInput(r *http.Request) (store.CreateViewInput, error) {
	var in struct {
		Name              string   `json:"name"`
		Slug              string   `json:"slug"`
		Description       *string  `json:"description"`
		Icon              *string  `json:"icon"`
		Display           string   `json:"display"`
		GroupBy           string   `json:"groupBy"`
		SubGroupBy        string   `json:"subGroupBy"`
		OrderBy           string   `json:"orderBy"`
		Direction         string   `json:"direction"`
		CompletedIssues   string   `json:"completedIssues"`
		ShowSubIssues     *bool    `json:"showSubIssues"`
		NestedSubIssues   string   `json:"nestedSubIssues"`
		ShowEmptyGroups   *bool    `json:"showEmptyGroups"`
		DisplayProperties []string `json:"displayProperties"`
		Status            *string  `json:"status"`
		Project           *string  `json:"project"`
		Cycle             *int     `json:"cycle"`
		Labels            []string `json:"labels"`
		Priority          *int     `json:"priority"`
		Type              *string  `json:"type"`
		Estimate          *int     `json:"estimate"`
		DueDate           *string  `json:"dueDate"`
		Relation          *string  `json:"relation"`
		Content           *string  `json:"content"`
		MilestoneName     *string  `json:"milestoneName"`
		ProjectLabels     []string `json:"projectLabels"`
		DateField         *string  `json:"dateField"`
		DateRange         *string  `json:"dateRange"`
		ProjectStatus     *string  `json:"projectStatus"`
		ProjectPriority   *int     `json:"projectPriority"`
		AddedToCycle      []string `json:"addedToCycle"`
	}
	if err := decodeJSON(r, &in); err != nil {
		return store.CreateViewInput{}, err
	}
	return store.CreateViewInput{
		Name: in.Name, Slug: in.Slug, Description: in.Description, Icon: in.Icon, Display: in.Display, GroupBy: in.GroupBy, SubGroupBy: in.SubGroupBy, OrderBy: in.OrderBy,
		Direction: in.Direction, CompletedIssues: in.CompletedIssues, ShowSubIssues: in.ShowSubIssues,
		NestedSubIssues: in.NestedSubIssues, ShowEmptyGroups: in.ShowEmptyGroups, DisplayProperties: in.DisplayProperties,
		Status:  in.Status,
		Project: in.Project, Cycle: in.Cycle, Labels: in.Labels, Priority: in.Priority, Type: in.Type, Estimate: in.Estimate, DueDate: in.DueDate, Relation: in.Relation, Content: in.Content, MilestoneName: in.MilestoneName, DateField: in.DateField, DateRange: in.DateRange, ProjectStatus: in.ProjectStatus, ProjectPriority: in.ProjectPriority, ProjectLabels: in.ProjectLabels, AddedToCycle: in.AddedToCycle,
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
	out, err := s.store.UpdateView(r.PathValue("slug"), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) deleteView(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteView(r.PathValue("slug")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) listIssues(w http.ResponseWriter, r *http.Request) {
	if err := s.store.ProcessDueRecurringIssues(); err != nil {
		writeError(w, err)
		return
	}
	q := r.URL.Query()
	f := store.IssueFilter{Status: q.Get("status"), ProjectSlug: q.Get("project"), Type: q.Get("type"), DueDate: q.Get("dueDate"), DueDateAsOf: q.Get("asOf"), Relation: q.Get("relation"), Content: q.Get("content"), MilestoneName: q.Get("milestoneName"), DateField: q.Get("dateField"), DateRange: q.Get("dateRange"), DateAsOf: q.Get("dateAsOf"), ProjectStatus: q.Get("projectStatus")}
	if archived := q.Get("archived"); archived != "" {
		value, err := strconv.ParseBool(archived)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid archived filter"})
			return
		}
		f.Archived = &value
	}
	if raw := q.Get("projectLabels"); raw != "" {
		for _, label := range strings.Split(raw, ",") {
			if label = strings.TrimSpace(label); label != "" {
				f.ProjectLabels = append(f.ProjectLabels, label)
			}
		}
	}
	if raw := q.Get("addedToCycle"); raw != "" {
		for _, phase := range strings.Split(raw, ",") {
			if phase = strings.TrimSpace(phase); phase != "" {
				f.AddedToCycle = append(f.AddedToCycle, phase)
			}
		}
	}
	if !domain.ValidDueDateFilter(f.DueDate) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid due date filter"})
		return
	}
	if !domain.ValidIssueRelationFilter(f.Relation) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid issue relation filter"})
		return
	}
	if f.DueDateAsOf != "" && !domain.ValidDate(f.DueDateAsOf) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid date filter anchor"})
		return
	}
	if f.Type != "" && !domain.ValidIssueType(f.Type) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid type"})
		return
	}
	if c := q.Get("cycle"); c != "" {
		n, err := strconv.Atoi(c)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid cycle"})
			return
		}
		f.CycleNumber = n
	}
	if priority := q.Get("projectPriority"); priority != "" {
		n, err := strconv.Atoi(priority)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid project priority"})
			return
		}
		f.ProjectPriority = &n
	}
	if p := q.Get("priority"); p != "" {
		n, err := strconv.Atoi(p)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid priority"})
			return
		}
		f.Priority = &n
	}
	if estimate := q.Get("estimate"); estimate != "" {
		n, err := strconv.Atoi(estimate)
		if err != nil || !domain.ValidEstimate(&n) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid estimate"})
			return
		}
		f.Estimate = &n
	}
	if favorite := q.Get("favorite"); favorite != "" {
		value, err := strconv.ParseBool(favorite)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid favorite"})
			return
		}
		f.IsFavorite = &value
	}
	if labels := q.Get("labels"); labels != "" {
		for _, name := range strings.Split(labels, ",") {
			name = strings.TrimSpace(name)
			if name != "" {
				f.Labels = append(f.Labels, name)
			}
		}
	}
	out, err := s.store.ListIssues(f)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) createIssue(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Title          string                           `json:"title"`
		Body           string                           `json:"body"`
		Status         string                           `json:"status"`
		WorkflowStatus string                           `json:"workflowStatus"`
		Type           string                           `json:"type"`
		Priority       int                              `json:"priority"`
		Estimate       *int                             `json:"estimate"`
		ProjectID      *int64                           `json:"projectId"`
		MilestoneID    *int64                           `json:"milestoneId"`
		CycleID        *int64                           `json:"cycleId"`
		ParentID       *int64                           `json:"parentId"`
		DueDate        *string                          `json:"dueDate"`
		LabelIDs       []int64                          `json:"labelIds"`
		Links          []store.CreateIssueLinkInput     `json:"links"`
		Recurring      *store.CreateRecurringIssueInput `json:"recurring"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	issueInput := store.CreateIssueInput{
		Title: in.Title, Body: in.Body, Status: in.Status, WorkflowStatus: in.WorkflowStatus, Type: in.Type, Priority: in.Priority, Estimate: in.Estimate,
		ProjectID: in.ProjectID, MilestoneID: in.MilestoneID, CycleID: in.CycleID, ParentID: in.ParentID, DueDate: in.DueDate, LabelIDs: in.LabelIDs, ExternalLinks: in.Links,
	}
	if in.Recurring != nil {
		schedule, err := s.store.CreateRecurringIssueFromInput(issueInput, *in.Recurring)
		if err != nil {
			writeError(w, err)
			return
		}
		out, err := s.store.GetIssue(schedule.LastIssueIdentifier)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
		return
	}
	out, err := s.store.CreateIssue(issueInput)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) getIssue(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.GetIssue(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) patchIssue(w http.ResponseWriter, r *http.Request) {
	raw := map[string]json.RawMessage{}
	if err := decodeJSON(r, &raw); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	in := store.PatchIssueInput{}
	if v, ok := raw["title"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid title"})
			return
		}
		in.Title = &s
	}
	if v, ok := raw["body"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
			return
		}
		in.Body = &s
	}
	if v, ok := raw["status"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid status"})
			return
		}
		in.Status = &s
	}
	if v, ok := raw["workflowStatus"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workflow status"})
			return
		}
		in.WorkflowStatus = &s
	}
	if v, ok := raw["type"]; ok {
		var issueType string
		if string(v) != "null" {
			if err := json.Unmarshal(v, &issueType); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid type"})
				return
			}
		}
		in.Type = &issueType
	}
	if v, ok := raw["priority"]; ok {
		var n int
		if err := json.Unmarshal(v, &n); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid priority"})
			return
		}
		in.Priority = &n
	}
	if v, ok := raw["estimate"]; ok {
		estimate, err := unmarshalOptInt(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid estimate"})
			return
		}
		in.Estimate = &estimate
	}
	if v, ok := raw["projectId"]; ok {
		id, err := unmarshalOptInt64(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid projectId"})
			return
		}
		in.ProjectID = &id
	}
	if v, ok := raw["milestoneId"]; ok {
		id, err := unmarshalOptInt64(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid milestoneId"})
			return
		}
		in.MilestoneID = &id
	}
	if v, ok := raw["cycleId"]; ok {
		id, err := unmarshalOptInt64(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid cycleId"})
			return
		}
		in.CycleID = &id
	}
	if v, ok := raw["parentId"]; ok {
		id, err := unmarshalOptInt64(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid parentId"})
			return
		}
		in.ParentID = &id
	}
	if v, ok := raw["dueDate"]; ok {
		d, err := unmarshalOptString(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid dueDate"})
			return
		}
		in.DueDate = &d
	}
	if v, ok := raw["reminderAt"]; ok {
		reminder, err := unmarshalOptString(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid reminderAt"})
			return
		}
		in.ReminderAt = &reminder
	}
	if v, ok := raw["labelIds"]; ok {
		var ids []int64
		if err := json.Unmarshal(v, &ids); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid labelIds"})
			return
		}
		in.LabelIDs = &ids
	}
	if v, ok := raw["sortOrder"]; ok {
		var n float64
		if err := json.Unmarshal(v, &n); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid sortOrder"})
			return
		}
		in.SortOrder = &n
	}
	if v, ok := raw["isFavorite"]; ok {
		var favorite bool
		if err := json.Unmarshal(v, &favorite); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid favorite"})
			return
		}
		in.IsFavorite = &favorite
	}
	if v, ok := raw["archived"]; ok {
		var archived bool
		if err := json.Unmarshal(v, &archived); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid archived"})
			return
		}
		in.Archived = &archived
	}
	out, err := s.store.UpdateIssue(r.PathValue("id"), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) deleteIssue(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteIssue(r.PathValue("id")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) listComments(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.ListComments(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) addComment(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(strings.ToLower(r.Header.Get("Content-Type")), "multipart/form-data") {
		s.addCommentWithFiles(w, r)
		return
	}
	var in struct {
		Body string `json:"body"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.AddComment(r.PathValue("id"), in.Body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) patchComment(w http.ResponseWriter, r *http.Request) {
	commentID, err := strconv.ParseInt(r.PathValue("commentId"), 10, 64)
	if err != nil || commentID < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid comment id"})
		return
	}
	var in struct {
		Body string `json:"body"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.UpdateComment(r.PathValue("id"), commentID, in.Body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) deleteComment(w http.ResponseWriter, r *http.Request) {
	commentID, err := strconv.ParseInt(r.PathValue("commentId"), 10, 64)
	if err != nil || commentID < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid comment id"})
		return
	}
	if err := s.store.DeleteComment(r.PathValue("id"), commentID); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) toggleIssueReaction(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Emoji string `json:"emoji"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.ToggleIssueReaction(r.PathValue("id"), in.Emoji)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) toggleCommentReaction(w http.ResponseWriter, r *http.Request) {
	commentID, err := strconv.ParseInt(r.PathValue("commentId"), 10, 64)
	if err != nil || commentID < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid comment id"})
		return
	}
	var in struct {
		Emoji string `json:"emoji"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.ToggleCommentReaction(r.PathValue("id"), commentID, in.Emoji)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) listActivities(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.ListActivities(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) listProjectActivities(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.ListProjectActivities(r.PathValue("slug"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) postProjectUpdate(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Health string `json:"health"`
		Body   string `json:"body"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.PostProjectUpdate(r.PathValue("slug"), in.Health, in.Body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

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
	out, err := s.store.CreatePage(in.Title, in.Slug, in.Body, in.Status, in.ParentID, in.ProjectID, in.Date, in.Tags)
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
	raw := map[string]json.RawMessage{}
	if err := decodeJSON(r, &raw); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	var title, body, status *string
	var parentID, projectID **int64
	var date **string
	var tags *[]string
	if v, ok := raw["title"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid title"})
			return
		}
		title = &s
	}
	if v, ok := raw["body"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
			return
		}
		body = &s
	}
	if v, ok := raw["status"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid status"})
			return
		}
		status = &s
	}
	if v, ok := raw["parentId"]; ok {
		id, err := unmarshalOptInt64(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid parentId"})
			return
		}
		parentID = &id
	}
	if v, ok := raw["projectId"]; ok {
		id, err := unmarshalOptInt64(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid projectId"})
			return
		}
		projectID = &id
	}
	if v, ok := raw["date"]; ok {
		d, err := unmarshalOptString(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid date"})
			return
		}
		date = &d
	}
	if v, ok := raw["tags"]; ok {
		var t []string
		if err := json.Unmarshal(v, &t); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid tags"})
			return
		}
		tags = &t
	}
	out, err := s.store.UpdatePage(r.PathValue("slug"), title, body, status, parentID, projectID, date, tags)
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

func (s *Server) search(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.Search(r.URL.Query().Get("q"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) commands(w http.ResponseWriter, _ *http.Request) {
	cmds := []map[string]string{
		{"id": "new-issue", "title": "Create issue", "hint": "c"},
		{"id": "new-page", "title": "Create page", "hint": "p"},
		{"id": "new-view", "title": "Create view", "hint": ""},
		{"id": "goto-issues", "title": "Go to Issues", "hint": ""},
		{"id": "goto-board", "title": "Go to Board", "hint": ""},
		{"id": "goto-projects", "title": "Go to Projects", "hint": ""},
		{"id": "goto-cycles", "title": "Go to Cycles", "hint": ""},
		{"id": "goto-pages", "title": "Go to Pages", "hint": ""},
		{"id": "new-adr", "title": "Create ADR", "hint": "p"},
		{"id": "goto-adrs", "title": "Go to ADRs", "hint": ""},
		{"id": "set-status-backlog", "title": "Set status: Backlog", "hint": "s"},
		{"id": "set-status-todo", "title": "Set status: Todo", "hint": "s"},
		{"id": "set-status-in_progress", "title": "Set status: In Progress", "hint": "s"},
		{"id": "set-status-done", "title": "Set status: Done", "hint": "s"},
		{"id": "set-status-canceled", "title": "Set status: Canceled", "hint": "s"},
	}
	cycles, err := s.store.ListCycles()
	if err == nil {
		for _, c := range cycles {
			cmds = append(cmds, map[string]string{
				"id":    "assign-cycle:" + strconv.FormatInt(c.ID, 10),
				"title": "Assign to Cycle " + strconv.Itoa(c.Number),
				"hint":  "",
			})
		}
		cmds = append(cmds, map[string]string{
			"id":    "assign-cycle:none",
			"title": "Remove from cycle",
			"hint":  "",
		})
	}
	writeJSON(w, http.StatusOK, cmds)
}

func unmarshalOptInt64(raw json.RawMessage) (*int64, error) {
	if string(raw) == "null" {
		return nil, nil
	}
	var n int64
	if err := json.Unmarshal(raw, &n); err != nil {
		return nil, err
	}
	return &n, nil
}

func unmarshalOptString(raw json.RawMessage) (*string, error) {
	if string(raw) == "null" {
		return nil, nil
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return nil, err
	}
	return &s, nil
}
