package httpapi

import (
	"net/http"
	"strconv"

	"github.com/yashikota/kotowari/internal/store"
)

func (s *Server) addCycleLink(w http.ResponseWriter, r *http.Request) {
	number, err := strconv.Atoi(r.PathValue("number"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid cycle number"})
		return
	}
	var in struct {
		URL   string `json:"url"`
		Title string `json:"title"`
		Kind  string `json:"kind"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	resource, err := s.store.AddCycleLink(number, store.CreateIssueLinkInput{URL: in.URL, Title: in.Title, Kind: in.Kind})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, resource)
}

func (s *Server) removeCycleLink(w http.ResponseWriter, r *http.Request) {
	number, err := strconv.Atoi(r.PathValue("number"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid cycle number"})
		return
	}
	resourceID, err := strconv.ParseInt(r.PathValue("resourceId"), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid resource id"})
		return
	}
	if err := s.store.RemoveCycleLink(number, resourceID); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
