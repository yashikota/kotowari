package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

type issuePatchRequest struct {
	Title          patchField[string]  `json:"title"`
	Body           patchField[string]  `json:"body"`
	Status         patchField[string]  `json:"status"`
	WorkflowStatus patchField[string]  `json:"workflowStatus"`
	Assignee       patchField[string]  `json:"assignee"`
	Type           patchField[string]  `json:"type"`
	Priority       patchField[int]     `json:"priority"`
	Estimate       patchField[int]     `json:"estimate"`
	ProjectID      patchField[int64]   `json:"projectId"`
	MilestoneID    patchField[int64]   `json:"milestoneId"`
	CycleID        patchField[int64]   `json:"cycleId"`
	ParentID       patchField[int64]   `json:"parentId"`
	DueDate        patchField[string]  `json:"dueDate"`
	ReminderAt     patchField[string]  `json:"reminderAt"`
	LabelIDs       patchField[[]int64] `json:"labelIds"`
	SortOrder      patchField[float64] `json:"sortOrder"`
	IsFavorite     patchField[bool]    `json:"isFavorite"`
	Archived       patchField[bool]    `json:"archived"`
}

func decodeIssuePatch(r *http.Request) (model.PatchIssueInput, error) {
	var request issuePatchRequest
	if err := decodeJSON(r, &request); err != nil {
		return model.PatchIssueInput{}, err
	}
	var input model.PatchIssueInput
	assignPatchField(request.Title, &input.Title)
	assignPatchField(request.Body, &input.Body)
	assignPatchField(request.Status, &input.Status)
	assignPatchField(request.WorkflowStatus, &input.WorkflowStatus)
	assignPatchField(request.Assignee, &input.Assignee)
	assignPatchField(request.Type, &input.Type)
	assignPatchField(request.Priority, &input.Priority)
	assignNullablePatchField(request.Estimate, &input.Estimate)
	assignNullablePatchField(request.ProjectID, &input.ProjectID)
	assignNullablePatchField(request.MilestoneID, &input.MilestoneID)
	assignNullablePatchField(request.CycleID, &input.CycleID)
	assignNullablePatchField(request.ParentID, &input.ParentID)
	assignNullablePatchField(request.DueDate, &input.DueDate)
	assignNullablePatchField(request.ReminderAt, &input.ReminderAt)
	assignPatchField(request.LabelIDs, &input.LabelIDs)
	assignPatchField(request.SortOrder, &input.SortOrder)
	assignPatchField(request.IsFavorite, &input.IsFavorite)
	assignPatchField(request.Archived, &input.Archived)
	return input, nil
}
