package store

import (
	"fmt"
	"strings"

	"github.com/pelletier/go-toml/v2"
)

func splitFrontmatter(raw string) (block, body string, err error) {
	s := strings.ReplaceAll(raw, "\r\n", "\n")
	if strings.HasPrefix(s, "---\n") {
		return "", "", fmt.Errorf("yaml frontmatter is not supported; use +++ TOML")
	}
	if !strings.HasPrefix(s, "+++\n") {
		return "", strings.TrimPrefix(s, "+++\n"), nil
	}
	rest := s[4:]
	idx := strings.Index(rest, "\n+++")
	if idx < 0 {
		return "", "", fmt.Errorf("unterminated frontmatter")
	}
	block = rest[:idx]
	body = strings.TrimPrefix(rest[idx+4:], "\n")
	body = strings.TrimPrefix(body, "\n")
	return block, body, nil
}

func marshalDoc(fm any, body string) string {
	b, err := toml.Marshal(fm)
	if err != nil {
		b = []byte{}
	}
	var out strings.Builder
	out.WriteString("+++\n")
	out.Write(b)
	if len(b) > 0 && !strings.HasSuffix(string(b), "\n") {
		out.WriteByte('\n')
	}
	out.WriteString("+++\n\n")
	out.WriteString(body)
	if body != "" && !strings.HasSuffix(body, "\n") {
		out.WriteByte('\n')
	}
	return out.String()
}
