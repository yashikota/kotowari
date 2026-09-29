package store

func projectBySlug(m *mem, slug string) (Project, bool) {
	for _, p := range m.Projects {
		if p.Slug == slug {
			return p, true
		}
	}
	return Project{}, false
}

func projectByID(m *mem, id int64) (Project, bool) {
	for _, p := range m.Projects {
		if p.ID == id {
			return p, true
		}
	}
	return Project{}, false
}

func milestoneByID(m *mem, id int64) (Project, Milestone, bool) {
	for _, p := range m.Projects {
		for _, milestone := range p.Milestones {
			if milestone.ID == id {
				return p, milestone, true
			}
		}
	}
	return Project{}, Milestone{}, false
}

func cycleByNumber(m *mem, n int) (Cycle, bool) {
	for _, c := range m.Cycles {
		if c.Number == n {
			return c, true
		}
	}
	return Cycle{}, false
}

func cycleByID(m *mem, id int64) (Cycle, bool) {
	for _, c := range m.Cycles {
		if c.ID == id {
			return c, true
		}
	}
	return Cycle{}, false
}

func pageBySlug(m *mem, slug string) (Page, bool) {
	for _, p := range m.Pages {
		if p.Slug == slug {
			return p, true
		}
	}
	return Page{}, false
}

func pageByID(m *mem, id int64) (Page, bool) {
	for _, p := range m.Pages {
		if p.ID == id {
			return p, true
		}
	}
	return Page{}, false
}

func labelByID(m *mem, id int64) (Label, bool) {
	for _, l := range m.Labels {
		if l.ID == id {
			return l, true
		}
	}
	return Label{}, false
}

func (m *mem) nextID() int64 {
	id := m.Workspace.NextID
	if id < 1 {
		id = 1
	}
	m.Workspace.NextID = id + 1
	m.dirtyMeta = true
	return id
}

func (m *mem) observeID(id int64) {
	if id >= m.Workspace.NextID {
		m.Workspace.NextID = id + 1
		m.dirtyMeta = true
	}
}

func (m *mem) bump(now string) {
	m.Workspace.UpdatedAt = now
}
