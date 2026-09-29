package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

type issuePatchRequest struct {
	Title          json.RawMessage `json:"title"`
	Body           json.RawMessage `json:"body"`
	Status         json.RawMessage `json:"status"`
	WorkflowStatus json.RawMessage `json:"workflowStatus"`
	Assignee       json.RawMessage `json:"assignee"`
	Type           json.RawMessage `json:"type"`
	Priority       json.RawMessage `json:"priority"`
	Estimate       json.RawMessage `json:"estimate"`
	ProjectID      json.RawMessage `json:"projectId"`
	MilestoneID    json.RawMessage `json:"milestoneId"`
	CycleID        json.RawMessage `json:"cycleId"`
	ParentID       json.RawMessage `json:"parentId"`
	DueDate        json.RawMessage `json:"dueDate"`
	ReminderAt     json.RawMessage `json:"reminderAt"`
	LabelIDs       json.RawMessage `json:"labelIds"`
	SortOrder      json.RawMessage `json:"sortOrder"`
	IsFavorite     json.RawMessage `json:"isFavorite"`
	Archived       json.RawMessage `json:"archived"`
}

func decodeIssuePatch(r *http.Request) (model.PatchIssueInput, error) {
	var request issuePatchRequest
	if err := decodeJSON(r, &request); err != nil {
		return model.PatchIssueInput{}, err
	}
	var input model.PatchIssueInput
	fields := []struct {
		raw   json.RawMessage
		apply func() error
	}{
		{request.Title, func() error { return assignPatchField(request.Title, "title", &input.Title) }},
		{request.Body, func() error { return assignPatchField(request.Body, "body", &input.Body) }},
		{request.Status, func() error { return assignPatchField(request.Status, "status", &input.Status) }},
		{request.WorkflowStatus, func() error {
			return assignPatchField(request.WorkflowStatus, "workflow status", &input.WorkflowStatus)
		}},
		{request.Assignee, func() error { return assignPatchField(request.Assignee, "assignee", &input.Assignee) }},
		{request.Type, func() error { return assignPatchField(request.Type, "type", &input.Type) }},
		{request.Priority, func() error { return assignPatchField(request.Priority, "priority", &input.Priority) }},
		{request.Estimate, func() error { return assignNullablePatchField(request.Estimate, "estimate", &input.Estimate) }},
		{request.ProjectID, func() error { return assignNullablePatchField(request.ProjectID, "projectId", &input.ProjectID) }},
		{request.MilestoneID, func() error {
			return assignNullablePatchField(request.MilestoneID, "milestoneId", &input.MilestoneID)
		}},
		{request.CycleID, func() error { return assignNullablePatchField(request.CycleID, "cycleId", &input.CycleID) }},
		{request.ParentID, func() error { return assignNullablePatchField(request.ParentID, "parentId", &input.ParentID) }},
		{request.DueDate, func() error { return assignNullablePatchField(request.DueDate, "dueDate", &input.DueDate) }},
		{request.ReminderAt, func() error {
			return assignNullablePatchField(request.ReminderAt, "reminderAt", &input.ReminderAt)
		}},
		{request.LabelIDs, func() error { return assignPatchField(request.LabelIDs, "labelIds", &input.LabelIDs) }},
		{request.SortOrder, func() error { return assignPatchField(request.SortOrder, "sortOrder", &input.SortOrder) }},
		{request.IsFavorite, func() error { return assignPatchField(request.IsFavorite, "favorite", &input.IsFavorite) }},
		{request.Archived, func() error { return assignPatchField(request.Archived, "archived", &input.Archived) }},
	}
	for _, field := range fields {
		if field.raw == nil {
			continue
		}
		if err := field.apply(); err != nil {
			return model.PatchIssueInput{}, err
		}
	}
	return input, nil
}
