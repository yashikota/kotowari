package store

import "github.com/yashikota/kotowari/internal/domain"

func (s *Store) AddWorkspaceResource(in CreateWorkspaceResourceInput) (WorkspaceResource, error) {
	link, err := normalizeIssueLink(CreateIssueLinkInput{URL: in.URL, Title: in.Title, Kind: "link"})
	if err != nil {
		return WorkspaceResource{}, err
	}
	var out WorkspaceResource
	err = s.mutate(func(m *mem) error {
		for _, existing := range m.Workspace.Resources {
			if existing.URL == link.URL {
				return errf(ErrConflict, "resource already exists")
			}
		}
		var id int64 = 1
		for _, existing := range m.Workspace.Resources {
			if existing.ID >= id {
				id = existing.ID + 1
			}
		}
		now := domain.Now()
		out = WorkspaceResource{ID: id, URL: link.URL, Title: link.Title, CreatedAt: now}
		m.Workspace.Resources = append(m.Workspace.Resources, out)
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) RemoveWorkspaceResource(resourceID int64) error {
	if resourceID < 1 {
		return validationf("invalid resource id")
	}
	return s.mutate(func(m *mem) error {
		for index, resource := range m.Workspace.Resources {
			if resource.ID != resourceID {
				continue
			}
			m.Workspace.Resources = append(m.Workspace.Resources[:index], m.Workspace.Resources[index+1:]...)
			m.bump(domain.Now())
			return nil
		}
		return ErrNotFound
	})
}
