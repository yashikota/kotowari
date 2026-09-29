package httpapi

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/yashikota/kotowari/internal/model"
)

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
	var in model.CreateCommentInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.AddComment(r.PathValue("id"), in)
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
	var in model.UpdateCommentInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.UpdateComment(r.PathValue("id"), commentID, in)
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
	var in model.ToggleReactionInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.ToggleIssueReaction(r.PathValue("id"), in)
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
	var in model.ToggleReactionInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.ToggleCommentReaction(r.PathValue("id"), commentID, in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}
