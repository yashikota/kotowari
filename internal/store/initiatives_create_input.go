package store

import (
	"strings"
	"unicode/utf8"

	"github.com/yashikota/kotowari/internal/domain"
)

func normalizeInitiativeCreateInput(in CreateInitiativeInput) (CreateInitiativeInput, error) {
	in.Name = strings.TrimSpace(in.Name)
	in.Slug = strings.TrimSpace(in.Slug)
	in.Description = strings.TrimSpace(in.Description)
	if in.Name == "" || utf8.RuneCountInString(in.Name) > 120 {
		return CreateInitiativeInput{}, validationf("initiative name must contain 1 to 120 characters")
	}
	if !domain.ValidSlug(in.Slug) {
		return CreateInitiativeInput{}, validationf("invalid slug")
	}
	if in.Status == "" {
		in.Status = "planned"
	}
	if !validInitiativeStatus(in.Status) {
		return CreateInitiativeInput{}, validationf("invalid initiative status")
	}
	if !validInitiativeOwner(in.Owner) {
		return CreateInitiativeInput{}, validationf("invalid initiative owner")
	}
	if !validProjectIconColor(in.Color) {
		return CreateInitiativeInput{}, validationf("invalid initiative color")
	}
	if !domain.ValidProjectHealth(in.Health) {
		return CreateInitiativeInput{}, validationf("invalid initiative health")
	}
	if !domain.ValidPriority(in.Priority) {
		return CreateInitiativeInput{}, validationf("invalid initiative priority")
	}
	if !validInitiativeDates(in.StartDate, in.TargetDate) {
		return CreateInitiativeInput{}, validationf("initiative dates must use YYYY-MM-DD and start before target")
	}
	if utf8.RuneCountInString(in.Description) > 20000 {
		return CreateInitiativeInput{}, validationf("initiative description is too long")
	}
	return in, nil
}
