package store

import (
	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) ListViews() ([]View, error) {
	var out []View
	err := s.snapshot(func(m *mem) error {
		out = append([]View{}, m.Views...)
		if out == nil {
			out = []View{}
		}
		return nil
	})
	return out, err
}

func (s *Store) GetView(slug string) (View, error) {
	var v View
	err := s.snapshot(func(m *mem) error {
		got, ok := viewBySlug(m, slug)
		if !ok {
			return ErrNotFound
		}
		v = got
		return nil
	})
	return v, err
}

// UpdateViewFavorite changes the personal favorite state without changing the
// saved view's content update timestamp.
func (s *Store) UpdateViewFavorite(slug string, favorite bool) (View, error) {
	var out View
	err := s.mutate(func(m *mem) error {
		i := indexView(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		m.Views[i].IsFavorite = favorite
		out = m.Views[i]
		return nil
	})
	return out, err
}

func (s *Store) DeleteView(slug string) error {
	return s.mutate(func(m *mem) error {
		i := indexView(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		m.Views = append(m.Views[:i], m.Views[i+1:]...)
		m.bump(domain.Now())
		return nil
	})
}

func viewBySlug(m *mem, slug string) (View, bool) {
	for _, v := range m.Views {
		if v.Slug == slug {
			return v, true
		}
	}
	return View{}, false
}

func indexView(m *mem, slug string) int {
	for i, v := range m.Views {
		if v.Slug == slug {
			return i
		}
	}
	return -1
}
