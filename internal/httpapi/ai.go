package httpapi

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/yashikota/kotowari/internal/acp"
)

func (s *Server) aiSession(r *http.Request) (*acp.Session, string, error) {
	kind, id := r.PathValue("kind"), r.PathValue("id")
	doc, err := s.store.Document(kind, id, "body")
	if err != nil {
		return nil, "", err
	}
	key := fmt.Sprintf("%x", sha256.Sum256([]byte(kind+"/"+id)))
	s.aiMu.Lock()
	defer s.aiMu.Unlock()
	session := s.sessions[key]
	if session == nil {
		command := []string{"codex-acp"}
		if raw := os.Getenv("KOTOWARI_ACP_COMMAND"); raw != "" {
			if err := json.Unmarshal([]byte(raw), &command); err != nil {
				return nil, "", fmt.Errorf("KOTOWARI_ACP_COMMAND must be a JSON argv array: %w", err)
			}
		}
		cwd, err := filepath.Abs(s.store.Path())
		if err != nil {
			return nil, "", err
		}
		session = acp.NewSession(cwd, filepath.Join(cwd, ".local", "ai", key+".json"), command)
		s.sessions[key] = session
	}
	contextText := fmt.Sprintf("You are helping with a local kotowari document workspace. Current document: %s/%s. Workspace: %s. Read the corresponding README.md (pages use <slug>.md) and related Issue/ADR links as needed. Keep document assets under adr/NNNNN/assets/ and experiments under adr/NNNNN/experiments/. Preserve TOML frontmatter and reciprocal links. Do not accept an ADR or change its decision status unless requested. Current document body:\n%s", kind, id, s.store.Path(), doc.Body)
	return session, contextText, nil
}
func (s *Server) getAI(w http.ResponseWriter, r *http.Request) {
	session, _, err := s.aiSession(r)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, 200, session.State())
}
func (s *Server) postAI(w http.ResponseWriter, r *http.Request) {
	session, contextText, err := s.aiSession(r)
	if err != nil {
		writeError(w, err)
		return
	}
	var in struct {
		Action string          `json:"action"`
		Prompt string          `json:"prompt"`
		ID     json.RawMessage `json:"id"`
		Option string          `json:"option"`
		Auth   string          `json:"auth"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid request"})
		return
	}
	switch in.Action {
	case "prompt":
		if in.Prompt == "" {
			err = fmt.Errorf("prompt required")
		} else {
			err = session.Run(in.Prompt, contextText, "")
		}
	case "authenticate":
		err = session.Run("", "", in.Auth)
	case "cancel":
		session.Cancel()
	case "permission":
		err = session.Approve(in.ID, in.Option)
	case "reset":
		err = session.Reset()
	default:
		err = fmt.Errorf("unknown AI action")
	}
	if err != nil {
		writeJSON(w, 409, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, session.State())
}
func (s *Server) Close() {
	s.aiMu.Lock()
	defer s.aiMu.Unlock()
	for _, session := range s.sessions {
		session.Close()
	}
}
