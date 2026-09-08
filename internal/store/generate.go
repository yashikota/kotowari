package store

import (
	"fmt"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func RenderADRTOC(adrs []ADR) string {
	var b strings.Builder
	for _, a := range adrs {
		fmt.Fprintf(&b, "* [%s. %s](adr/%s/README.md) (%s)\n", a.Identifier, a.Title, domain.DirName(a.Number), a.Status)
	}
	return b.String()
}

func RenderADRGraph(adrs []ADR) string {
	var b strings.Builder
	b.WriteString("flowchart LR\n")
	for _, a := range adrs {
		label := strings.ReplaceAll(a.Identifier+" "+a.Title, `"`, "'")
		fmt.Fprintf(&b, "  ADR%d[\"%s\"]\n", a.Number, label)
	}
	for _, a := range adrs {
		if a.Supersedes != nil && *a.Supersedes > 0 {
			fmt.Fprintf(&b, "  ADR%d -->|supersedes| ADR%d\n", a.Number, *a.Supersedes)
		}
	}
	return b.String()
}
