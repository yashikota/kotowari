package httpapi

import (
	"encoding/json"
	"errors"
	"io"
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
	s.registerSystemRoutes()
	s.registerDocumentRoutes()
	s.registerWorkspaceRoutes()
	s.registerProjectRoutes()
	s.registerCycleRoutes()
	s.registerViewRoutes()
	s.registerIssueRoutes()
	s.registerPageAndADRRoutes()
	s.registerUtilityRoutes()
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
	if err := dec.Decode(v); err != nil {
		return err
	}
	var trailing any
	if err := dec.Decode(&trailing); err != io.EOF {
		if err == nil {
			return errors.New("unexpected trailing JSON value")
		}
		return err
	}
	return nil
}
