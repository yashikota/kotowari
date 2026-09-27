package httpapi

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/yashikota/kotowari/internal/store"
)

func (s *Server) cycleCalendarFeed(w http.ResponseWriter, r *http.Request) {
	number, err := strconv.Atoi(r.PathValue("number"))
	if err != nil || number < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid cycle number"})
		return
	}
	cycle, err := s.store.GetCycle(number)
	if err != nil {
		writeError(w, err)
		return
	}

	scheme := "http"
	if r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https") {
		scheme = "https"
	}
	calendarURL := url.URL{
		Scheme: scheme,
		Host:   r.Host,
		Path:   fmt.Sprintf("/cycles/%d", number),
	}
	updatedAt, err := time.Parse(time.RFC3339Nano, cycle.UpdatedAt)
	if err != nil {
		http.Error(w, "cycle has an invalid update timestamp", http.StatusInternalServerError)
		return
	}
	content, err := cycleCalendarICS(cycle, calendarURL.String(), updatedAt)
	if err != nil {
		http.Error(w, "unable to build cycle calendar", http.StatusInternalServerError)
		return
	}

	digest := sha256.Sum256([]byte(content))
	etag := `"` + hex.EncodeToString(digest[:]) + `"`
	w.Header().Set("Content-Type", "text/calendar; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="cycle-%d.ics"`, number))
	w.Header().Set("Cache-Control", "no-cache, must-revalidate")
	w.Header().Set("ETag", etag)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if r.Header.Get("If-None-Match") == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(content))
}

func cycleCalendarICS(cycle store.Cycle, eventURL string, generatedAt time.Time) (string, error) {
	start, err := parseCycleCalendarDate(cycle.StartsAt)
	if err != nil {
		return "", err
	}
	end, err := parseCycleCalendarDate(cycle.EndsAt)
	if err != nil {
		return "", err
	}
	end = end.AddDate(0, 0, 1)
	name := cycle.Name
	if strings.TrimSpace(name) == "" {
		name = fmt.Sprintf("Cycle %d", cycle.Number)
	}
	description := fmt.Sprintf("Cycle %d", cycle.Number)
	if strings.TrimSpace(cycle.Description) != "" {
		description += "\n" + cycle.Description
	}
	lines := []string{
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Kotowari//Cycle calendar//EN",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"BEGIN:VEVENT",
		fmt.Sprintf("UID:cycle-%d@kotowari.local", cycle.Number),
		"DTSTAMP:" + generatedAt.UTC().Format("20060102T150405Z"),
		"LAST-MODIFIED:" + generatedAt.UTC().Format("20060102T150405Z"),
		"DTSTART;VALUE=DATE:" + start.Format("20060102"),
		"DTEND;VALUE=DATE:" + end.Format("20060102"),
		"SUMMARY:" + escapeICalText(name),
		"DESCRIPTION:" + escapeICalText(description),
		"URL:" + escapeICalText(eventURL),
		"END:VEVENT",
		"END:VCALENDAR",
	}
	folded := make([]string, 0, len(lines))
	for _, line := range lines {
		folded = append(folded, foldICalLine(line)...)
	}
	return strings.Join(folded, "\r\n") + "\r\n", nil
}

func parseCycleCalendarDate(value string) (time.Time, error) {
	if len(value) < len("2006-01-02") {
		return time.Time{}, fmt.Errorf("invalid cycle date %q", value)
	}
	return time.Parse("2006-01-02", value[:len("2006-01-02")])
}

func escapeICalText(value string) string {
	value = strings.ReplaceAll(value, `\`, `\\`)
	value = strings.ReplaceAll(value, "\r\n", "\n")
	value = strings.ReplaceAll(value, "\r", "\n")
	value = strings.ReplaceAll(value, "\n", `\n`)
	value = strings.ReplaceAll(value, ";", `\;`)
	return strings.ReplaceAll(value, ",", `\,`)
}

func foldICalLine(value string) []string {
	lines := make([]string, 0, 1)
	var line strings.Builder
	lineBytes := 0
	for _, character := range value {
		characterBytes := len(string(character))
		if lineBytes+characterBytes > 75 {
			lines = append(lines, line.String())
			line.Reset()
			line.WriteByte(' ')
			lineBytes = 1
		}
		line.WriteRune(character)
		lineBytes += characterBytes
	}
	return append(lines, line.String())
}
