package store

import (
	"strings"

	"github.com/pelletier/go-toml/v2"
)

type adrFM struct {
	Project    *string `toml:"project,omitempty"`
	Title      string  `toml:"title"`
	Status     string  `toml:"status"`
	Evaluation string  `toml:"evaluation,omitempty"`
	Replay     string  `toml:"replay,omitempty"`
	Workload   string  `toml:"workload,omitempty"`
	Supersedes *int    `toml:"supersedes,omitempty"`
	Issues     []int   `toml:"issues,omitempty"`
	Created    string  `toml:"created"`
	Updated    string  `toml:"updated"`
}

func parseADRMarkdown(n int, ident, raw string, m *mem) (ADR, error) {
	block, body, err := splitFrontmatter(raw)
	if err != nil {
		return ADR{}, err
	}
	var fm adrFM
	if strings.TrimSpace(block) != "" {
		if err := toml.Unmarshal([]byte(block), &fm); err != nil {
			return ADR{}, err
		}
	}
	if fm.Status == "" {
		fm.Status = "proposed"
	}
	return ADR{
		ProjectSlug:  fm.Project,
		ID:           int64(n),
		Number:       n,
		Identifier:   ident,
		Title:        fm.Title,
		Body:         body,
		Status:       fm.Status,
		Evaluation:   fm.Evaluation,
		Replay:       fm.Replay,
		Workload:     fm.Workload,
		Supersedes:   fm.Supersedes,
		IssueNumbers: fm.Issues,
		CreatedAt:    fm.Created,
		UpdatedAt:    fm.Updated,
	}, nil
}

func renderADRMarkdown(a ADR) string {
	fm := adrFM{
		Project:    a.ProjectSlug,
		Title:      a.Title,
		Status:     a.Status,
		Evaluation: a.Evaluation,
		Replay:     a.Replay,
		Workload:   a.Workload,
		Supersedes: a.Supersedes,
		Issues:     a.IssueNumbers,
		Created:    a.CreatedAt,
		Updated:    a.UpdatedAt,
	}
	return marshalDoc(fm, a.Body)
}
