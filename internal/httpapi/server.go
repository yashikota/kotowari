package httpapi

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/yashikota/kotowari/internal/acp"
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
		if err := s.store.ProcessIssueAutomations(); err != nil {
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
	s.mux.HandleFunc("GET /api/issue-link-sources", s.listIssueLinkSources)
	s.mux.HandleFunc("GET /api/issue-template-options", s.listIssueTemplateFilterOptions)
	s.mux.HandleFunc("GET /api/projects", s.listProjects)
	s.mux.HandleFunc("POST /api/projects", s.createProject)
	s.mux.HandleFunc("GET /api/initiatives", s.listInitiatives)
	s.mux.HandleFunc("POST /api/initiatives", s.createInitiative)
	s.mux.HandleFunc("GET /api/initiatives/{slug}", s.getInitiative)
	s.mux.HandleFunc("GET /api/initiatives/{slug}/activities", s.listInitiativeActivities)
	s.mux.HandleFunc("POST /api/initiatives/{slug}/updates", s.postInitiativeUpdate)
	s.mux.HandleFunc("PATCH /api/initiatives/{slug}", s.patchInitiative)
	s.mux.HandleFunc("DELETE /api/initiatives/{slug}", s.deleteInitiative)
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
	s.mux.HandleFunc("POST /api/cycles/ensure", s.ensureCycleSchedule)
	s.mux.HandleFunc("POST /api/cycles", s.createCycle)
	s.mux.HandleFunc("GET /api/cycles/{number}/activities", s.listCycleActivities)
	s.mux.HandleFunc("GET /api/cycles/{number}/calendar.ics", s.cycleCalendarFeed)
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
	s.mux.HandleFunc("GET /api/inbox/activities", s.listInboxActivities)
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
