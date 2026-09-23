package httpapi

import (
	"net/http"
	"strconv"

	"github.com/yashikota/kotowari/internal/store"
)

func (s *Server) addIssueLink(w http.ResponseWriter, r *http.Request) {
	var in struct {
		URL   string `json:"url"`
		Title string `json:"title"`
		Kind  string `json:"kind"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	link, err := s.store.AddIssueLink(r.PathValue("id"), store.CreateIssueLinkInput{
		URL: in.URL, Title: in.Title, Kind: in.Kind,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, link)
}

func (s *Server) removeIssueLink(w http.ResponseWriter, r *http.Request) {
	linkID, err := strconv.ParseInt(r.PathValue("linkId"), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid link id"})
		return
	}
	if err := s.store.RemoveIssueLink(r.PathValue("id"), linkID); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
