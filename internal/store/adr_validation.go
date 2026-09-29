package store

func validateADRProject(m *mem, slug *string) error {
	if slug == nil {
		return nil
	}
	for _, p := range m.Projects {
		if p.Slug == *slug {
			return nil
		}
	}
	return validationf("project not found")
}
