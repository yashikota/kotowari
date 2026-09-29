package domain

import (
	"fmt"
	"strconv"
	"strings"
)

const (
	IdentifierPrefix   = "ISS-"
	DefaultIssuePrefix = "ISS"
	DefaultADRPrefix   = "ADR"
)

func Ident(prefix string, number int) string {
	return fmt.Sprintf("%s-%d", prefix, number)
}

func ParseIdent(prefix, id string) (int, bool) {
	pre := prefix + "-"
	if !strings.HasPrefix(id, pre) {
		return 0, false
	}
	rest := strings.TrimPrefix(id, pre)
	n, err := strconv.Atoi(rest)
	if err != nil || n < 1 {
		return 0, false
	}
	return n, true
}

func Identifier(number int) string {
	return Ident(DefaultIssuePrefix, number)
}

func ParseIdentifier(id string) (int, bool) {
	return ParseIdent(DefaultIssuePrefix, id)
}

func ADRIdentifier(number int) string {
	return Ident(DefaultADRPrefix, number)
}

func ParseADRIdentifier(id string) (int, bool) {
	return ParseIdent(DefaultADRPrefix, id)
}

func DirName(n int) string {
	return fmt.Sprintf("%05d", n)
}

func ParseDirName(s string) (int, bool) {
	if s == "" {
		return 0, false
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 || s != DirName(n) {
		return 0, false
	}
	return n, true
}

func ParseLegacyIssueStem(stem string) (int, bool) {
	if n, ok := ParseIdent(DefaultIssuePrefix, stem); ok {
		return n, true
	}
	return ParseIdent("SEN", stem)
}

// ValidPrefix keeps identifiers safe as single URL path segments.
func ValidPrefix(p string) bool {
	if p == "" {
		return false
	}
	for _, c := range p {
		if (c < 'A' || c > 'Z') && (c < 'a' || c > 'z') && (c < '0' || c > '9') && c != '_' && c != '-' {
			return false
		}
	}
	return true
}

func NormalizePrefix(p, fallback string) string {
	p = strings.TrimSpace(p)
	p = strings.TrimSuffix(p, "-")
	if p == "" {
		return fallback
	}
	return p
}
