package httpapi

import (
	"bytes"
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
		{request.Title, func() error { return assignIssuePatchField(request.Title, "title", &input.Title) }},
		{request.Body, func() error { return assignIssuePatchField(request.Body, "body", &input.Body) }},
		{request.Status, func() error { return assignIssuePatchField(request.Status, "status", &input.Status) }},
		{request.WorkflowStatus, func() error {
			return assignIssuePatchField(request.WorkflowStatus, "workflow status", &input.WorkflowStatus)
		}},
		{request.Assignee, func() error { return assignIssuePatchField(request.Assignee, "assignee", &input.Assignee) }},
		{request.Type, func() error { return assignIssuePatchField(request.Type, "type", &input.Type) }},
		{request.Priority, func() error { return assignIssuePatchField(request.Priority, "priority", &input.Priority) }},
		{request.Estimate, func() error { return assignIssuePatchNullableField(request.Estimate, "estimate", &input.Estimate) }},
		{request.ProjectID, func() error { return assignIssuePatchNullableField(request.ProjectID, "projectId", &input.ProjectID) }},
		{request.MilestoneID, func() error {
			return assignIssuePatchNullableField(request.MilestoneID, "milestoneId", &input.MilestoneID)
		}},
		{request.CycleID, func() error { return assignIssuePatchNullableField(request.CycleID, "cycleId", &input.CycleID) }},
		{request.ParentID, func() error { return assignIssuePatchNullableField(request.ParentID, "parentId", &input.ParentID) }},
		{request.DueDate, func() error { return assignIssuePatchNullableField(request.DueDate, "dueDate", &input.DueDate) }},
		{request.ReminderAt, func() error {
			return assignIssuePatchNullableField(request.ReminderAt, "reminderAt", &input.ReminderAt)
		}},
		{request.LabelIDs, func() error { return assignIssuePatchField(request.LabelIDs, "labelIds", &input.LabelIDs) }},
		{request.SortOrder, func() error { return assignIssuePatchField(request.SortOrder, "sortOrder", &input.SortOrder) }},
		{request.IsFavorite, func() error { return assignIssuePatchField(request.IsFavorite, "favorite", &input.IsFavorite) }},
		{request.Archived, func() error { return assignIssuePatchField(request.Archived, "archived", &input.Archived) }},
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

func assignIssuePatchField[T any](raw json.RawMessage, name string, target **T) error {
	value := new(T)
	if err := json.Unmarshal(raw, value); err != nil {
		return &issuePatchFieldError{field: name}
	}
	*target = value
	return nil
}

func assignIssuePatchNullableField[T any](raw json.RawMessage, name string, target ***T) error {
	var value *T
	if !bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		decoded := new(T)
		if err := json.Unmarshal(raw, decoded); err != nil {
			return &issuePatchFieldError{field: name}
		}
		value = decoded
	}
	*target = &value
	return nil
}
