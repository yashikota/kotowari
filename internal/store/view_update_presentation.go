package store

import (
	"strings"
	"unicode/utf8"

	"github.com/yashikota/kotowari/internal/domain"
)

func applyViewPresentationPatch(v *View, in CreateViewInput) error {
	if name := strings.TrimSpace(in.Name); name != "" {
		v.Name = name
	}
	if in.Description != nil {
		description := strings.TrimSpace(*in.Description)
		if utf8.RuneCountInString(description) > 1000 {
			return validationf("view description is too long")
		}
		v.Description = description
	}
	if in.Icon != nil {
		icon := *in.Icon
		if icon == "" {
			icon = "list"
		}
		if !validViewIcon(icon) {
			return validationf("invalid view icon")
		}
		v.Icon = icon
	}
	if in.Display != "" {
		if !domain.ValidViewDisplay(in.Display) {
			return validationf("invalid display")
		}
		v.Display = in.Display
	}
	if in.GroupBy != "" {
		if !domain.ValidViewGroupBy(in.GroupBy) {
			return validationf("invalid group by")
		}
		v.GroupBy = in.GroupBy
	}
	if in.OrderBy != "" {
		if !domain.ValidViewOrderBy(in.OrderBy) {
			return validationf("invalid order by")
		}
		v.OrderBy = in.OrderBy
	}
	if in.SubGroupBy != "" {
		if !domain.ValidViewGroupBy(in.SubGroupBy) {
			return validationf("invalid sub-group by")
		}
		v.SubGroupBy = in.SubGroupBy
	}
	if in.Direction != "" {
		if !domain.ValidViewDirection(in.Direction) {
			return validationf("invalid order direction")
		}
		v.Direction = in.Direction
	}
	if in.CompletedIssues != "" {
		if !domain.ValidCompletedIssues(in.CompletedIssues) {
			return validationf("invalid completed issues filter")
		}
		v.CompletedIssues = in.CompletedIssues
	}
	if in.ShowSubIssues != nil {
		v.ShowSubIssues = in.ShowSubIssues
	}
	if in.NestedSubIssues != "" {
		if !domain.ValidNestedSubIssues(in.NestedSubIssues) {
			return validationf("invalid nested sub-issues mode")
		}
		v.NestedSubIssues = in.NestedSubIssues
	}
	if in.ShowEmptyGroups != nil {
		v.ShowEmptyGroups = *in.ShowEmptyGroups
	}
	if in.DisplayProperties != nil {
		for _, property := range in.DisplayProperties {
			if !domain.ValidDisplayProperty(property) {
				return validationf("invalid display property")
			}
		}
		v.DisplayProperties = in.DisplayProperties
	}
	return nil
}
