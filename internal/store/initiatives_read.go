package store

func (s *Store) ListInitiatives() ([]Initiative, error) {
	var out []Initiative
	err := s.snapshot(func(m *mem) error {
		out = make([]Initiative, 0, len(m.Initiatives))
		for _, initiative := range m.Initiatives {
			out = append(out, normalizeInitiative(m, initiative))
		}
		return nil
	})
	return out, err
}

func (s *Store) GetInitiative(slug string) (Initiative, error) {
	var out Initiative
	err := s.snapshot(func(m *mem) error {
		for _, initiative := range m.Initiatives {
			if initiative.Slug == slug {
				out = normalizeInitiative(m, initiative)
				return nil
			}
		}
		return ErrNotFound
	})
	return out, err
}

func (s *Store) ListInitiativeActivities(slug string) ([]Activity, error) {
	var out []Activity
	err := s.snapshot(func(m *mem) error {
		index := initiativeIndex(m, slug)
		if index < 0 {
			return ErrNotFound
		}
		initiativeID := m.Initiatives[index].ID
		out = []Activity{}
		for index := len(m.Activities) - 1; index >= 0; index-- {
			activity := m.Activities[index]
			if activity.EntityType == "initiative" && activity.EntityID == initiativeID {
				out = append(out, activity)
			}
		}
		return nil
	})
	return out, err
}
