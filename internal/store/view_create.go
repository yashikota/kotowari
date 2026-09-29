package store

import (
	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) CreateView(in CreateViewInput) (View, error) {
	prepared, err := s.prepareCreateViewInput(in)
	if err != nil {
		return View{}, err
	}
	in = prepared.input
	description := prepared.description
	icon := prepared.icon
	subscriber := prepared.subscriber
	dateField := prepared.dateField
	dateRange := prepared.dateRange
	now := domain.Now()
	var out View
	err = s.mutate(func(m *mem) error {
		if _, ok := viewBySlug(m, in.Slug); ok {
			return errf(ErrConflict, "slug %q exists", in.Slug)
		}
		out = View{
			ID: m.nextID(), Name: in.Name, Slug: in.Slug, IsFavorite: in.IsFavorite != nil && *in.IsFavorite, Description: description, Icon: icon, Display: in.Display,
			GroupBy: in.GroupBy, SubGroupBy: in.SubGroupBy, OrderBy: in.OrderBy, Direction: in.Direction,
			CompletedIssues: in.CompletedIssues, ShowSubIssues: in.ShowSubIssues, NestedSubIssues: in.NestedSubIssues,
			ShowEmptyGroups: in.ShowEmptyGroups != nil && *in.ShowEmptyGroups, DisplayProperties: in.DisplayProperties,
			Status: in.Status, Statuses: in.Statuses, Assignee: in.Assignee, Subscriber: subscriber, Project: in.Project, Cycle: in.Cycle, Labels: in.Labels, LabelOperator: in.LabelOperator,
			Priority: in.Priority, Priorities: in.Priorities, Type: in.Type, Estimate: in.Estimate, Estimates: in.Estimates, NoEstimate: in.NoEstimate != nil && *in.NoEstimate, Relation: in.Relation, LinkSources: in.LinkSources, TemplateSlugs: in.TemplateSlugs, Content: in.Content, DateField: dateField, DateRange: dateRange,
			ProjectStatus: in.ProjectStatus, ProjectPriority: in.ProjectPriority, ProjectLabels: in.ProjectLabels, AddedToCycle: in.AddedToCycle, MilestoneName: in.MilestoneName, CreatedAt: now, UpdatedAt: now,
			AdvancedFilter: in.AdvancedFilter != nil && *in.AdvancedFilter, AdvancedFilterGroup: in.AdvancedFilterGroup,
		}
		if in.DueDate != nil {
			out.DueDate = *in.DueDate
		}
		if out.Labels == nil {
			out.Labels = []string{}
		}
		if out.ProjectLabels == nil {
			out.ProjectLabels = []string{}
		}
		if out.AddedToCycle == nil {
			out.AddedToCycle = []string{}
		}
		m.Views = append(m.Views, out)
		m.bump(now)
		return nil
	})
	return out, err
}
