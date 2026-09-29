package httpapi

import (
	"net/http"
	"strconv"
)

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
