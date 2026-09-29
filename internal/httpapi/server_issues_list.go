package httpapi

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
	"github.com/yashikota/kotowari/internal/model"
)

func (s *Server) listIssues(w http.ResponseWriter, r *http.Request) {
	if err := s.store.ProcessDueRecurringIssues(); err != nil {
		writeError(w, err)
		return
	}
	q := r.URL.Query()
	linkSources := []string(nil)
	if value := q.Get("linkSources"); value != "" {
		linkSources = strings.Split(value, ",")
	}
	templateSlugs := []string(nil)
	if value := q.Get("templateSlugs"); value != "" {
		templateSlugs = strings.Split(value, ",")
	}
	statuses := []string(nil)
	if value := q.Get("statuses"); value != "" {
		statuses = strings.Split(value, ",")
	}
	priorities := []int(nil)
	if value := q.Get("priorities"); value != "" {
		for _, raw := range strings.Split(value, ",") {
			priority, err := strconv.Atoi(raw)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid priorities filter"})
				return
			}
			priorities = append(priorities, priority)
		}
	}
	estimates := []int(nil)
	if value := q.Get("estimates"); value != "" {
		for _, raw := range strings.Split(value, ",") {
			estimate, err := strconv.Atoi(raw)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid estimates filter"})
				return
			}
			estimates = append(estimates, estimate)
		}
	}
	f := model.IssueFilter{Status: q.Get("status"), Statuses: statuses, Assignee: q.Get("assignee"), ProjectSlug: q.Get("project"), Type: q.Get("type"), DueDate: q.Get("dueDate"), DueDateAsOf: q.Get("asOf"), Relation: q.Get("relation"), LinkSources: linkSources, TemplateSlugs: templateSlugs, Content: q.Get("content"), MilestoneName: q.Get("milestoneName"), DateField: q.Get("dateField"), DateRange: q.Get("dateRange"), DateAsOf: q.Get("dateAsOf"), ProjectStatus: q.Get("projectStatus"), Priorities: priorities, Estimates: estimates, LabelOperator: q.Get("labelOperator")}
	if f.Assignee != "" && f.Assignee != "none" && !domain.ValidIssueAssignee(f.Assignee) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid assignee filter"})
		return
	}
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
	if raw := q.Get("noEstimate"); raw != "" {
		value, err := strconv.ParseBool(raw)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid no-estimate filter"})
			return
		}
		f.NoEstimate = value
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
