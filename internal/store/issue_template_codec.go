package store

import (
	"os"
	"strings"
	"unicode"

	"github.com/pelletier/go-toml/v2"
	"github.com/yashikota/kotowari/internal/domain"
)

type issueTemplateFM struct {
	Name     string   `toml:"name"`
	Title    string   `toml:"title"`
	Status   string   `toml:"status"`
	Assignee string   `toml:"assignee,omitempty"`
	Type     string   `toml:"type,omitempty"`
	Priority int      `toml:"priority"`
	Estimate *int     `toml:"estimate,omitempty"`
	Labels   []string `toml:"labels,omitempty"`
}

func issueTemplateSlug(name string) string {
	var out strings.Builder
	dash := false
	for _, r := range strings.ToLower(strings.TrimSpace(name)) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			if dash && out.Len() > 0 {
				out.WriteByte('-')
			}
			out.WriteRune(r)
			dash = false
			continue
		}
		if out.Len() > 0 {
			dash = true
		}
	}
	return strings.Trim(out.String(), "-")
}

func readIssueTemplate(path string) (IssueTemplate, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return IssueTemplate{}, err
	}
	block, body, err := splitFrontmatter(string(raw))
	if err != nil {
		return IssueTemplate{}, err
	}
	var fm issueTemplateFM
	if err := toml.Unmarshal([]byte(block), &fm); err != nil {
		return IssueTemplate{}, err
	}
	if strings.TrimSpace(fm.Name) == "" || strings.TrimSpace(fm.Title) == "" {
		return IssueTemplate{}, validationf("template name and title are required")
	}
	if fm.Status == "" {
		fm.Status = "todo"
	}
	if !validTemplateProperties(fm.Status, fm.Type, fm.Priority, fm.Estimate) ||
		!domain.ValidIssueAssignee(fm.Assignee) {
		return IssueTemplate{}, validationf("template contains invalid issue properties")
	}
	return IssueTemplate{
		Name: fm.Name, Title: fm.Title, Body: body, Status: fm.Status, Assignee: fm.Assignee,
		Type: fm.Type, Priority: fm.Priority, Estimate: fm.Estimate,
		Labels: append([]string{}, fm.Labels...),
	}, nil
}

func writeIssueTemplate(path string, template IssueTemplate) error {
	fm := issueTemplateFM{
		Name: template.Name, Title: template.Title, Status: template.Status, Assignee: template.Assignee,
		Type: template.Type, Priority: template.Priority,
		Estimate: template.Estimate, Labels: template.Labels,
	}
	if err := validateTemplateProperties(template); err != nil {
		return err
	}
	metadata, err := toml.Marshal(fm)
	if err != nil {
		return err
	}
	content := append([]byte("+++\n"), metadata...)
	content = append(content, []byte("+++\n\n")...)
	content = append(content, []byte(template.Body)...)
	if len(template.Body) > 0 && !strings.HasSuffix(template.Body, "\n") {
		content = append(content, '\n')
	}
	return atomicWrite(path, content)
}

func validTemplateProperties(status, issueType string, priority int, estimate *int) bool {
	return domain.ValidIssueStatus(status) && domain.ValidIssueType(issueType) &&
		domain.ValidPriority(priority) && domain.ValidEstimate(estimate)
}

func validateTemplateProperties(template IssueTemplate) error {
	if strings.TrimSpace(template.Name) == "" || strings.TrimSpace(template.Title) == "" ||
		!validTemplateProperties(template.Status, template.Type, template.Priority, template.Estimate) ||
		!domain.ValidIssueAssignee(template.Assignee) {
		return validationf("invalid issue template")
	}
	return nil
}
