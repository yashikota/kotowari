package httpapi

import "github.com/yashikota/kotowari/internal/model"

type adrPatchRequest struct {
	ProjectSlug  patchField[string] `json:"projectSlug"`
	Title        patchField[string] `json:"title"`
	Body         patchField[string] `json:"body"`
	PublishBody  patchField[string] `json:"publishBody"`
	Status       patchField[string] `json:"status"`
	Evaluation   patchField[string] `json:"evaluation"`
	Replay       patchField[string] `json:"replay"`
	Workload     patchField[string] `json:"workload"`
	Supersedes   patchField[int]    `json:"supersedes"`
	IssueNumbers patchField[[]int]  `json:"issueNumbers"`
}

func (p adrPatchRequest) input() model.PatchADRInput {
	var input model.PatchADRInput
	assignNullablePatchField(p.ProjectSlug, &input.ProjectSlug)
	assignPatchField(p.Title, &input.Title)
	assignPatchField(p.Body, &input.Body)
	assignPatchField(p.PublishBody, &input.PublishBody)
	assignPatchField(p.Status, &input.Status)
	assignPatchField(p.Evaluation, &input.Evaluation)
	assignPatchField(p.Replay, &input.Replay)
	assignPatchField(p.Workload, &input.Workload)
	assignNullablePatchField(p.Supersedes, &input.Supersedes)
	assignPatchField(p.IssueNumbers, &input.IssueNumbers)
	return input
}
