package store

func labelByName(m *mem, name string) (Label, bool) {
	for _, l := range m.Labels {
		if l.Name == name {
			return l, true
		}
	}
	return Label{}, false
}
