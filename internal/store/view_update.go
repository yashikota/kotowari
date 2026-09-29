package store

import (
	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) UpdateView(slug string, in CreateViewInput) (View, error) {
	if in.LabelOperator != "" && !validIssueLabelOperator(in.LabelOperator) {
		return View{}, validationf("invalid label operator")
	}
	var out View
	err := s.mutate(func(m *mem) error {
		i := indexView(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		v := m.Views[i]
		if err := applyViewAdvancedFilterPatch(&v, in); err != nil {
			return err
		}
		if err := applyViewPresentationPatch(&v, in); err != nil {
			return err
		}
		if err := applyViewFilterPatch(&v, m, in); err != nil {
			return err
		}
		now := domain.Now()
		v.UpdatedAt = now
		m.Views[i] = v
		m.bump(now)
		out = v
		return nil
	})
	return out, err
}
