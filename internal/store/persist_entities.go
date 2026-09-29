package store

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func (m *mem) issuePrefix() string {
	return domain.NormalizePrefix(m.Workspace.IssuePrefix, domain.DefaultIssuePrefix)
}

func (m *mem) adrPrefix() string {
	return domain.NormalizePrefix(m.Workspace.ADRPrefix, domain.DefaultADRPrefix)
}

func loadIssues(root, issueDir string, m *mem) error {
	ents, err := os.ReadDir(issueDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	seen := map[int]string{}
	for _, ent := range ents {
		if ent.IsDir() {
			n, ok := domain.ParseDirName(ent.Name())
			if !ok {
				continue
			}
			b, err := os.ReadFile(filepath.Join(issueDir, ent.Name(), "README.md"))
			if err != nil {
				if os.IsNotExist(err) {
					m.diag("issues/"+ent.Name(), "missing_readme", "README.md is missing")
					continue
				}
				return err
			}
			ident := domain.Ident(m.issuePrefix(), n)
			if err := absorbIssue(m, n, ident, string(b), "issues/"+ent.Name()+"/README.md", seen); err != nil {
				return err
			}
			continue
		}
		if !strings.HasSuffix(ent.Name(), ".md") {
			continue
		}
		stem := strings.TrimSuffix(ent.Name(), ".md")
		n, ok := domain.ParseLegacyIssueStem(stem)
		if !ok {
			continue
		}
		b, err := os.ReadFile(filepath.Join(issueDir, ent.Name()))
		if err != nil {
			return err
		}
		ident := domain.Ident(m.issuePrefix(), n)
		if err := absorbIssue(m, n, ident, string(b), "issues/"+ent.Name(), seen); err != nil {
			return err
		}
		m.dirtyMeta = true
	}
	_ = root
	return nil
}

func absorbIssue(m *mem, n int, ident, raw, path string, seen map[int]string) error {
	if prev, ok := seen[n]; ok {
		m.diag(path, "duplicate_number", fmt.Sprintf("issue %d already loaded from %s", n, prev))
		return nil
	}
	iss, comments, err := parseIssueMarkdown(n, ident, raw, m)
	if err != nil {
		return fmt.Errorf("%s: %w", path, err)
	}
	seen[n] = path
	m.Issues = append(m.Issues, iss)
	m.Comments[iss.Identifier] = comments
	var maxID int64
	for _, c := range comments {
		if c.ID > maxID {
			maxID = c.ID
		}
	}
	m.commentSeq[iss.Identifier] = maxID
	if iss.Number > m.Workspace.IssueCounter {
		m.Workspace.IssueCounter = iss.Number
		m.dirtyMeta = true
	}
	return nil
}

func loadADRs(_ string, adrDir string, m *mem) error {
	ents, err := os.ReadDir(adrDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	for _, ent := range ents {
		if !ent.IsDir() {
			continue
		}
		n, ok := domain.ParseDirName(ent.Name())
		if !ok {
			continue
		}
		// Reserve historical numbers even when their document is missing.
		if n > m.Workspace.ADRCounter {
			m.Workspace.ADRCounter = n
			m.dirtyMeta = true
		}
		b, err := os.ReadFile(filepath.Join(adrDir, ent.Name(), "README.md"))
		if err != nil {
			if os.IsNotExist(err) {
				m.diag("adr/"+ent.Name(), "missing_readme", "README.md is missing")
				continue
			}
			return err
		}
		ident := domain.Ident(m.adrPrefix(), n)
		a, err := parseADRMarkdown(n, ident, string(b), m)
		if err != nil {
			return fmt.Errorf("adr/%s/README.md: %w", ent.Name(), err)
		}
		if pub, err := os.ReadFile(filepath.Join(adrDir, ent.Name(), "PUBLISH.md")); err == nil {
			a.PublishBody = string(pub)
		}
		m.ADRs = append(m.ADRs, a)
		if a.Number > m.Workspace.ADRCounter {
			m.Workspace.ADRCounter = a.Number
			m.dirtyMeta = true
		}
	}
	return nil
}

func pruneEntityDirs(dir string, keep map[string]struct{}) error {
	ents, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	for _, ent := range ents {
		path := filepath.Join(dir, ent.Name())
		if ent.IsDir() {
			if _, ok := keep[ent.Name()]; ok {
				continue
			}
			if err := os.RemoveAll(path); err != nil {
				return err
			}
			continue
		}
		if strings.HasSuffix(ent.Name(), ".md") {
			if err := os.Remove(path); err != nil {
				return err
			}
		}
	}
	return nil
}
