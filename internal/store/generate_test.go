package store

import (
	"strings"
	"testing"
)

func TestRenderADRTOCEmpty(t *testing.T) {
	if got := RenderADRTOC(nil); got != "" {
		t.Fatalf("empty toc %q", got)
	}
}

func TestRenderADRGraphEmptyAndQuotes(t *testing.T) {
	if got := RenderADRGraph(nil); got != "flowchart LR\n" {
		t.Fatalf("empty graph %q", got)
	}
	g := RenderADRGraph([]ADR{
		{Number: 1, Identifier: "ADR-1", Title: `say "hi"`, Status: "accepted"},
		{Number: 2, Identifier: "ADR-2", Title: "later", Status: "proposed", Supersedes: intPtr(1)},
	})
	if strings.Contains(g, `say "hi"`) {
		t.Fatalf("unescaped quote in mermaid: %s", g)
	}
	if !strings.Contains(g, "say 'hi'") {
		t.Fatalf("expected quote rewrite: %s", g)
	}
	if !strings.Contains(g, "ADR2 -->|supersedes| ADR1") {
		t.Fatalf("missing edge: %s", g)
	}
}
