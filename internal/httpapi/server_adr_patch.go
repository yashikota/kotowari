package httpapi

import (
	"encoding/json"

	"github.com/yashikota/kotowari/internal/model"
)

type adrPatchRequest struct {
	ProjectSlug  json.RawMessage `json:"projectSlug"`
	Title        json.RawMessage `json:"title"`
	Body         json.RawMessage `json:"body"`
	PublishBody  json.RawMessage `json:"publishBody"`
	Status       json.RawMessage `json:"status"`
	Evaluation   json.RawMessage `json:"evaluation"`
	Replay       json.RawMessage `json:"replay"`
	Workload     json.RawMessage `json:"workload"`
	Supersedes   json.RawMessage `json:"supersedes"`
	IssueNumbers json.RawMessage `json:"issueNumbers"`
}

func (p adrPatchRequest) input() (model.PatchADRInput, error) {
	var input model.PatchADRInput
	fields := []struct {
		raw   json.RawMessage
		apply func() error
	}{
		{p.ProjectSlug, func() error { return assignNullablePatchField(p.ProjectSlug, "projectSlug", &input.ProjectSlug) }},
		{p.Title, func() error { return assignPatchField(p.Title, "title", &input.Title) }},
		{p.Body, func() error { return assignPatchField(p.Body, "body", &input.Body) }},
		{p.PublishBody, func() error { return assignPatchField(p.PublishBody, "publishBody", &input.PublishBody) }},
		{p.Status, func() error { return assignPatchField(p.Status, "status", &input.Status) }},
		{p.Evaluation, func() error { return assignPatchField(p.Evaluation, "evaluation", &input.Evaluation) }},
		{p.Replay, func() error { return assignPatchField(p.Replay, "replay", &input.Replay) }},
		{p.Workload, func() error { return assignPatchField(p.Workload, "workload", &input.Workload) }},
		{p.Supersedes, func() error { return assignNullablePatchField(p.Supersedes, "supersedes", &input.Supersedes) }},
		{p.IssueNumbers, func() error { return assignPatchField(p.IssueNumbers, "issueNumbers", &input.IssueNumbers) }},
	}
	for _, field := range fields {
		if field.raw == nil {
			continue
		}
		if err := field.apply(); err != nil {
			return model.PatchADRInput{}, err
		}
	}
	return input, nil
}
