package store

type mem struct {
	Workspace   workspaceFile
	Labels      []Label
	Projects    []Project
	Initiatives []Initiative
	Cycles      []Cycle
	Views       []View
	Issues      []Issue
	Comments    map[string][]Comment
	Pages       []Page
	ADRs        []ADR
	Activities  []Activity
	commentSeq  map[string]int64
	dirtyMeta   bool
	Diagnostics []Diagnostic
}
