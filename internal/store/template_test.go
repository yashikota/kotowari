package store

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestSeedWritesIssueAndADRTemplates(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	for _, name := range []string{"ISSUE.md", "ADR.md"} {
		p := filepath.Join(dir, "TEMPLATE", name)
		b, err := os.ReadFile(p)
		if err != nil {
			t.Fatalf("%s: %v", p, err)
		}
		if !strings.Contains(string(b), "title") || !strings.Contains(string(b), "created") {
			t.Fatalf("%s missing required frontmatter keys: %s", name, b)
		}
		if name == "ADR.md" && (!strings.Contains(string(b), "選んだ候補:") || !strings.Contains(string(b), "### 確認") || !strings.Contains(string(b), "rejected")) {
			t.Fatalf("ADR template missing MADR skeleton: %s", b)
		}
	}
}

func TestCreateIssueUsesTemplateBody(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	iss, err := s.CreateIssue(CreateIssueInput{Title: "from template"})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(iss.Body, "## 目的") {
		t.Fatalf("issue body %q", iss.Body)
	}
	raw, err := os.ReadFile(filepath.Join(dir, "issues", "00001", "README.md"))
	if err != nil {
		t.Fatal(err)
	}
	md := string(raw)
	if !strings.Contains(md, "from template") || !strings.Contains(md, "created") || !strings.Contains(md, "updated") {
		t.Fatalf("issue file %s", md)
	}
}

func TestCreateIssueUsesWorkspaceTemplate(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	custom := "+++\ntitle = \"\"\nstatus = \"todo\"\ncreated = \"\"\nupdated = \"\"\n+++\n\n## カスタム骨格\n"
	if err := os.WriteFile(filepath.Join(dir, "TEMPLATE", "ISSUE.md"), []byte(custom), 0o644); err != nil {
		t.Fatal(err)
	}
	iss, err := s.CreateIssue(CreateIssueInput{Title: "custom"})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(iss.Body, "## カスタム骨格") {
		t.Fatalf("body %q", iss.Body)
	}
	if strings.Contains(iss.Body, "## 目的") {
		t.Fatalf("still used bundled template: %q", iss.Body)
	}
}

func TestIssueTemplateRoundTripAndNameConflicts(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	issue, err := s.CreateIssue(CreateIssueInput{
		Title: "Prepare release", Body: "## Checklist\n\n- [ ] Verify build\n",
		Status: "in_progress", Type: "task", Priority: 2, LabelIDs: []int64{1},
	})
	if err != nil {
		t.Fatal(err)
	}
	template, err := s.CreateIssueTemplate(issue.Identifier, "Release checklist")
	if err != nil {
		t.Fatal(err)
	}
	if template.Slug != "release-checklist" || template.Title != issue.Title || template.Body != issue.Body ||
		template.Status != issue.Status || template.Type != issue.Type || template.Priority != issue.Priority ||
		len(template.Labels) != 1 || template.Labels[0] != "Bug" {
		t.Fatalf("template did not preserve issue data: %#v", template)
	}
	if _, err := s.CreateIssueTemplate(issue.Identifier, "Release checklist"); !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate template name error %v", err)
	}
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}

	reopened, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = reopened.Close() })
	templates, err := reopened.ListIssueTemplates()
	if err != nil {
		t.Fatal(err)
	}
	if len(templates) != 1 || templates[0].Slug != template.Slug || templates[0].Body != template.Body {
		t.Fatalf("reopened templates %#v", templates)
	}
	if err := reopened.DeleteIssueTemplate(template.Slug); err != nil {
		t.Fatal(err)
	}
	if err := reopened.DeleteIssueTemplate(template.Slug); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing template deletion error %v", err)
	}
	if err := reopened.DeleteIssueTemplate("../workspace"); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid template deletion error %v", err)
	}
}

func TestRecurringIssueCreatesAndRecoversScheduledInstances(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	source, err := s.CreateIssue(CreateIssueInput{
		Title: "Weekly report", Body: "Summarize the week.", Type: "task", Priority: 1,
	})
	if err != nil {
		t.Fatal(err)
	}
	today, err := s.workspaceToday()
	if err != nil {
		t.Fatal(err)
	}
	todayDate, err := time.Parse("2006-01-02", today)
	if err != nil {
		t.Fatal(err)
	}
	firstDue := todayDate.AddDate(0, 0, -1).Format("2006-01-02")
	schedule, err := s.CreateRecurringIssue(source.Identifier, CreateRecurringIssueInput{
		Name: "Weekly report", FirstDueDate: firstDue, Interval: 1, Unit: "week",
	})
	if err != nil {
		t.Fatal(err)
	}
	if schedule.LastIssueIdentifier == "" || schedule.NextDueDate != todayDate.AddDate(0, 0, 6).Format("2006-01-02") {
		t.Fatalf("schedule did not advance overdue instance: %#v", schedule)
	}
	issues, err := s.ListIssues(IssueFilter{})
	if err != nil {
		t.Fatal(err)
	}
	var generated []Issue
	for _, issue := range issues {
		if issue.RecurringSlug != nil && *issue.RecurringSlug == schedule.Slug {
			generated = append(generated, issue)
		}
	}
	if len(generated) != 2 {
		t.Fatalf("expected first and next recurring instances, got %#v", generated)
	}
	if generated[0].DueDate == nil || *generated[0].DueDate != firstDue || generated[0].Status != "backlog" {
		t.Fatalf("initial recurring issue %#v", generated[0])
	}
	if generated[1].DueDate == nil || *generated[1].DueDate != schedule.NextDueDate || generated[1].Title != source.Title {
		t.Fatalf("next recurring issue %#v", generated[1])
	}
	if err := s.ProcessDueRecurringIssues(); err != nil {
		t.Fatal(err)
	}
	issues, err = s.ListIssues(IssueFilter{})
	if err != nil {
		t.Fatal(err)
	}
	count := 0
	for _, issue := range issues {
		if issue.RecurringSlug != nil && *issue.RecurringSlug == schedule.Slug {
			count++
		}
	}
	if count != 2 {
		t.Fatalf("reprocessing duplicated instances: %d", count)
	}

	paused, err := s.SetRecurringIssueEnabled(schedule.Slug, false)
	if err != nil || paused.Enabled {
		t.Fatalf("pause recurring issue %#v, %v", paused, err)
	}
	if err := s.DeleteRecurringIssue(schedule.Slug); err != nil {
		t.Fatal(err)
	}
	issues, err = s.ListIssues(IssueFilter{})
	if err != nil || len(issues) != 3 {
		t.Fatalf("deleting a schedule should preserve its issue history (%d, %v)", len(issues), err)
	}
}

func TestRecurringMonthDateClampsToLastDay(t *testing.T) {
	next, err := nextRecurringDate("2026-01-31", 1, "month")
	if err != nil || next != "2026-02-28" {
		t.Fatalf("next month date %q, %v", next, err)
	}
	leapYear, err := nextRecurringDate("2028-01-31", 1, "month")
	if err != nil || leapYear != "2028-02-29" {
		t.Fatalf("leap year month date %q, %v", leapYear, err)
	}
}

func TestCreateADRUsesTemplateBody(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	adr, err := s.CreateADR(CreateADRInput{Title: "from template"})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(adr.Body, "## 評価関数") {
		t.Fatalf("adr body %q", adr.Body)
	}
	if !strings.Contains(adr.Body, "選んだ候補:") || !strings.Contains(adr.Body, "### 確認") {
		t.Fatalf("madr sections %q", adr.Body)
	}
}

func TestMissingTitleAndCreatedAreDiagnosed(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	if err := os.MkdirAll(filepath.Join(dir, "issues", "00001"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "issues", "00001", "README.md"), []byte("+++\nstatus = \"todo\"\n+++\n\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir, "adr", "00001"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "adr", "00001", "README.md"), []byte("+++\nstatus = \"proposed\"\n+++\n\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	diags, err := s.Diagnostics()
	if err != nil {
		t.Fatal(err)
	}
	codes := map[string]bool{}
	for _, d := range diags {
		codes[d.Code] = true
	}
	if !codes["missing_title"] || !codes["missing_created"] || !codes["missing_updated"] {
		t.Fatalf("codes %#v", diags)
	}
}
