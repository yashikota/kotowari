package httpapi

import "github.com/yashikota/kotowari/internal/model"

type initiativePatchRequest struct {
	Name            *string   `json:"name"`
	Description     *string   `json:"description"`
	Status          *string   `json:"status"`
	Color           *string   `json:"color"`
	Health          *string   `json:"health"`
	Priority        *int      `json:"priority"`
	Labels          *[]string `json:"labels"`
	StartDate       *string   `json:"startDate"`
	TargetDate      *string   `json:"targetDate"`
	ClearStartDate  bool      `json:"clearStartDate"`
	ClearTargetDate bool      `json:"clearTargetDate"`
	ProjectSlugs    *[]string `json:"projectSlugs"`
}

func (p initiativePatchRequest) updateInput() model.UpdateInitiativeInput {
	return model.UpdateInitiativeInput{
		Name: p.Name, Description: p.Description, Status: p.Status, Color: p.Color,
		Health: p.Health, Priority: p.Priority, Labels: p.Labels,
		StartDate:    patchOptionalString(p.ClearStartDate, p.StartDate),
		TargetDate:   patchOptionalString(p.ClearTargetDate, p.TargetDate),
		ProjectSlugs: p.ProjectSlugs,
	}
}
