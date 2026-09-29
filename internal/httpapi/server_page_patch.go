package httpapi

import "encoding/json"

type pagePatchRequest struct {
	Title     json.RawMessage `json:"title"`
	Body      json.RawMessage `json:"body"`
	Status    json.RawMessage `json:"status"`
	ParentID  json.RawMessage `json:"parentId"`
	ProjectID json.RawMessage `json:"projectId"`
	Date      json.RawMessage `json:"date"`
	Tags      json.RawMessage `json:"tags"`
}

func (p pagePatchRequest) values() (
	title, body, status *string,
	parentID, projectID **int64,
	date **string,
	tags *[]string,
	err error,
) {
	if p.Title != nil {
		if err = assignPatchField(p.Title, "title", &title); err != nil {
			return nil, nil, nil, nil, nil, nil, nil, err
		}
	}
	if p.Body != nil {
		if err = assignPatchField(p.Body, "body", &body); err != nil {
			return nil, nil, nil, nil, nil, nil, nil, err
		}
	}
	if p.Status != nil {
		if err = assignPatchField(p.Status, "status", &status); err != nil {
			return nil, nil, nil, nil, nil, nil, nil, err
		}
	}
	if p.ParentID != nil {
		if err = assignNullablePatchField(p.ParentID, "parentId", &parentID); err != nil {
			return nil, nil, nil, nil, nil, nil, nil, err
		}
	}
	if p.ProjectID != nil {
		if err = assignNullablePatchField(p.ProjectID, "projectId", &projectID); err != nil {
			return nil, nil, nil, nil, nil, nil, nil, err
		}
	}
	if p.Date != nil {
		if err = assignNullablePatchField(p.Date, "date", &date); err != nil {
			return nil, nil, nil, nil, nil, nil, nil, err
		}
	}
	if p.Tags != nil {
		if err = assignPatchField(p.Tags, "tags", &tags); err != nil {
			return nil, nil, nil, nil, nil, nil, nil, err
		}
	}
	return title, body, status, parentID, projectID, date, tags, nil
}
