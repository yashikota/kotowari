package store

func (s *Store) Diagnostics() ([]Diagnostic, error) {
	var out []Diagnostic
	err := s.snapshot(func(m *mem) error {
		out = append([]Diagnostic{}, m.Diagnostics...)
		if out == nil {
			out = []Diagnostic{}
		}
		return nil
	})
	return out, err
}

func (m *mem) diag(path, code, message string) {
	m.Diagnostics = append(m.Diagnostics, Diagnostic{Path: path, Code: code, Message: message})
}

func diagnose(m *mem) {
	diagnoseWorkspace(m)
	diagnoseIssues(m)
	diagnosePages(m)
	diagnoseADRs(m)
	diagnoseADRIssueLinks(m)
}
