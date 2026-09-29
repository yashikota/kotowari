package store

import "github.com/yashikota/kotowari/internal/domain"

func applyViewAdvancedFilterPatch(v *View, in CreateViewInput) error {
	if in.AdvancedFilter != nil {
		v.AdvancedFilter = *in.AdvancedFilter
	}
	if in.AdvancedFilterGroup != nil {
		if err := validateIssueFilterGroup(in.AdvancedFilterGroup); err != nil {
			return err
		}
		v.AdvancedFilterGroup = in.AdvancedFilterGroup
	}
	return nil
}

func applyViewFilterPatch(v *View, m *mem, in CreateViewInput) error {
	if in.Status != nil {
		if *in.Status == "" {
			v.Status = nil
		} else {
			if !domain.ValidIssueStatus(*in.Status) {
				return validationf("invalid status")
			}
			v.Status = in.Status
		}
		v.Statuses = nil
	}
	if in.Statuses != nil && (len(in.Statuses) > 0 || in.Status == nil) {
		statuses, err := normalizeIssueWorkflowStatuses(m.Workspace, in.Statuses)
		if err != nil {
			return err
		}
		v.Statuses = statuses
		v.Status = nil
	}
	if in.Assignee != nil {
		if *in.Assignee == "" {
			v.Assignee = nil
		} else {
			if *in.Assignee != "none" && !domain.ValidIssueAssignee(*in.Assignee) {
				return validationf("invalid assignee")
			}
			v.Assignee = in.Assignee
		}
	}
	if in.Subscriber != nil {
		if *in.Subscriber != "" && *in.Subscriber != "self" && *in.Subscriber != "none" {
			return validationf("invalid subscriber filter")
		}
		v.Subscriber = *in.Subscriber
	}
	if in.Project != nil {
		if *in.Project == "" {
			v.Project = nil
		} else {
			v.Project = in.Project
		}
	}
	if in.Cycle != nil {
		if *in.Cycle == 0 {
			v.Cycle = nil
		} else {
			v.Cycle = in.Cycle
		}
	}
	if in.Labels != nil {
		v.Labels = in.Labels
		if in.LabelOperator == "" {
			v.LabelOperator = defaultIssueLabelOperator(in.Labels)
		}
	}
	if in.LabelOperator != "" {
		v.LabelOperator = in.LabelOperator
	}
	if in.ProjectLabels != nil {
		if err := validateViewProjectLabels(in.ProjectLabels); err != nil {
			return err
		}
		v.ProjectLabels = in.ProjectLabels
	}
	if in.AddedToCycle != nil {
		if err := validateAddedToCycle(in.AddedToCycle); err != nil {
			return err
		}
		v.AddedToCycle = in.AddedToCycle
	}
	if in.Priority != nil {
		if *in.Priority < 0 {
			v.Priority = nil
		} else {
			if !domain.ValidPriority(*in.Priority) {
				return validationf("invalid priority")
			}
			v.Priority = in.Priority
		}
		v.Priorities = nil
	}
	if in.Priorities != nil && (len(in.Priorities) > 0 || in.Priority == nil) {
		priorities, err := normalizeIssuePriorities(in.Priorities)
		if err != nil {
			return err
		}
		v.Priorities = priorities
		v.Priority = nil
	}
	if in.Type != nil {
		if *in.Type == "" {
			v.Type = nil
		} else {
			if !domain.ValidIssueType(*in.Type) {
				return validationf("invalid issue type")
			}
			v.Type = in.Type
		}
	}
	if in.Estimate != nil {
		if *in.Estimate < 0 {
			v.Estimate = nil
		} else {
			if !domain.ValidEstimate(in.Estimate) {
				return validationf("invalid estimate")
			}
			v.Estimate = in.Estimate
		}
		v.Estimates = nil
		v.NoEstimate = false
	}
	if in.Estimates != nil || in.NoEstimate != nil {
		noEstimate := in.NoEstimate != nil && *in.NoEstimate
		selectedEstimates := in.Estimates
		if noEstimate && in.Estimate != nil && *in.Estimate >= 0 && len(selectedEstimates) == 0 {
			selectedEstimates = []int{*in.Estimate}
		}
		if len(selectedEstimates) > 0 || noEstimate || in.Estimate == nil {
			estimates, err := normalizeIssueEstimates(selectedEstimates)
			if err != nil {
				return err
			}
			v.Estimates = estimates
			v.NoEstimate = noEstimate
			v.Estimate = nil
		}
	}
	if in.DueDate != nil {
		if !domain.ValidDueDateFilter(*in.DueDate) {
			return validationf("invalid due date filter")
		}
		v.DueDate = *in.DueDate
	}
	if in.Relation != nil {
		if !domain.ValidIssueRelationFilter(*in.Relation) {
			return validationf("invalid issue relation filter")
		}
		if *in.Relation == "" {
			v.Relation = nil
		} else {
			v.Relation = in.Relation
		}
	}
	if in.LinkSources != nil {
		if err := validateViewLinkSources(in.LinkSources); err != nil {
			return err
		}
		v.LinkSources = normalizeIssueLinkSources(in.LinkSources)
	}
	if in.TemplateSlugs != nil {
		if err := validateIssueTemplateSlugs(in.TemplateSlugs); err != nil {
			return err
		}
		v.TemplateSlugs = normalizeIssueTemplateSlugs(in.TemplateSlugs)
	}
	if in.Content != nil {
		content, err := normalizeViewTextFilter(in.Content, "content")
		if err != nil {
			return err
		}
		v.Content = content
	}
	if in.MilestoneName != nil {
		milestoneName, err := normalizeViewTextFilter(in.MilestoneName, "milestone name")
		if err != nil {
			return err
		}
		v.MilestoneName = milestoneName
	}
	if in.DateField != nil || in.DateRange != nil {
		dateField, dateRange := v.DateField, v.DateRange
		if in.DateField != nil {
			dateField = *in.DateField
		}
		if in.DateRange != nil {
			dateRange = *in.DateRange
		}
		if !domain.ValidIssueDateFilter(dateField, dateRange) {
			return validationf("invalid issue date filter")
		}
		v.DateField, v.DateRange = dateField, dateRange
	}
	if in.ProjectStatus != nil {
		if *in.ProjectStatus == "" {
			v.ProjectStatus = nil
		} else {
			if _, exists := projectWorkflowStatusByID(m.Workspace, *in.ProjectStatus); !exists {
				return validationf("invalid project status")
			}
			v.ProjectStatus = in.ProjectStatus
		}
	}
	if in.ProjectPriority != nil {
		if *in.ProjectPriority < 0 {
			v.ProjectPriority = nil
		} else {
			if !domain.ValidPriority(*in.ProjectPriority) {
				return validationf("invalid project priority")
			}
			v.ProjectPriority = in.ProjectPriority
		}
	}
	return nil
}
