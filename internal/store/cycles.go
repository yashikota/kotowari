package store

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) ListCycles() ([]Cycle, error) {
	return s.listCycles(nil)
}

func (s *Store) ListCyclesByArchived(archived bool) ([]Cycle, error) {
	return s.listCycles(&archived)
}

func (s *Store) listCycles(archived *bool) ([]Cycle, error) {
	out := []Cycle{}
	err := s.snapshot(func(m *mem) error {
		for _, cycle := range m.Cycles {
			if archived != nil && (*archived != (cycle.ArchivedAt != nil)) {
				continue
			}
			out = append(out, cycle)
		}
		for i := range out {
			if out[i].Resources == nil {
				out[i].Resources = []IssueLink{}
			}
		}
		return nil
	})
	return out, err
}

func (s *Store) GetCycle(number int) (Cycle, error) {
	var c Cycle
	err := s.snapshot(func(m *mem) error {
		got, ok := cycleByNumber(m, number)
		if !ok {
			return ErrNotFound
		}
		c = got
		if c.Resources == nil {
			c.Resources = []IssueLink{}
		}
		return nil
	})
	return c, err
}

func (s *Store) CreateCycle(startsAt, endsAt, status string) (Cycle, error) {
	if err := parseTime(startsAt); err != nil {
		return Cycle{}, err
	}
	if err := parseTime(endsAt); err != nil {
		return Cycle{}, err
	}
	if status == "" {
		status = "upcoming"
	}
	if !domain.ValidCycleStatus(status) {
		return Cycle{}, validationf("invalid status")
	}
	now := domain.Now()
	var out Cycle
	err := s.mutate(func(m *mem) error {
		next := 1
		for _, c := range m.Cycles {
			if c.Number >= next {
				next = c.Number + 1
			}
		}
		if next == 1 && status == "upcoming" {
			status = "active"
		}
		ensureSingleActive(m, 0, status)
		start, _ := time.Parse(time.RFC3339, startsAt)
		end, _ := time.Parse(time.RFC3339, endsAt)
		if !end.After(start) {
			return validationf("cycle end must be after start")
		}
		var completedAt *string
		if status == "completed" {
			completedAt = &now
		}
		out = Cycle{ID: m.nextID(), Number: next, Name: fmt.Sprintf("Cycle %d", next), StartsAt: startsAt, EndsAt: endsAt, Status: status, CompletedAt: completedAt, Resources: []IssueLink{}, CreatedAt: now, UpdatedAt: now}
		m.Cycles = append(m.Cycles, out)
		addActivity(m, "cycle", out.ID, "created", map[string]any{"number": next}, now)
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) AddCycleLink(number int, in CreateIssueLinkInput) (IssueLink, error) {
	in.URL = strings.TrimSpace(in.URL)
	in.Title = strings.TrimSpace(in.Title)
	in.Kind = strings.TrimSpace(in.Kind)
	parsed, err := url.Parse(in.URL)
	if err != nil || !parsed.IsAbs() || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return IssueLink{}, validationf("link URL must be an absolute http or https URL")
	}
	if in.Kind == "" {
		in.Kind = "link"
	}
	if in.Kind != "link" && in.Kind != "document" {
		return IssueLink{}, validationf("invalid cycle resource kind")
	}
	var out IssueLink
	err = s.mutate(func(m *mem) error {
		i := indexCycle(m, number)
		if i < 0 {
			return ErrNotFound
		}
		cycle := m.Cycles[i]
		for _, existing := range cycle.Resources {
			if existing.URL == in.URL {
				return errf(ErrConflict, "resource already exists")
			}
		}
		var id int64 = 1
		for _, existing := range cycle.Resources {
			if existing.ID >= id {
				id = existing.ID + 1
			}
		}
		now := domain.Now()
		out = IssueLink{ID: id, URL: in.URL, Title: in.Title, Kind: in.Kind, CreatedAt: now}
		cycle.Resources = append(cycle.Resources, out)
		cycle.UpdatedAt = now
		m.Cycles[i] = cycle
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) RemoveCycleLink(number int, linkID int64) error {
	if linkID < 1 {
		return validationf("invalid resource id")
	}
	return s.mutate(func(m *mem) error {
		i := indexCycle(m, number)
		if i < 0 {
			return ErrNotFound
		}
		cycle := m.Cycles[i]
		for index, resource := range cycle.Resources {
			if resource.ID != linkID {
				continue
			}
			cycle.Resources = append(cycle.Resources[:index], cycle.Resources[index+1:]...)
			cycle.UpdatedAt = domain.Now()
			m.Cycles[i] = cycle
			m.bump(cycle.UpdatedAt)
			return nil
		}
		return ErrNotFound
	})
}

func (s *Store) UpdateCycle(number int, in UpdateCycleInput) (Cycle, error) {
	var out Cycle
	err := s.mutate(func(m *mem) error {
		i := indexCycle(m, number)
		if i < 0 {
			return ErrNotFound
		}
		c := m.Cycles[i]
		previousStatus := c.Status
		if c.Name == "" {
			c.Name = fmt.Sprintf("Cycle %d", c.Number)
		}
		if in.Name != nil {
			name := strings.TrimSpace(*in.Name)
			if name == "" || len(name) > 512 {
				return validationf("invalid cycle name")
			}
			c.Name = name
		}
		if in.Description != nil {
			if len(*in.Description) > 20000 {
				return validationf("cycle description is too long")
			}
			c.Description = *in.Description
		}
		if in.StartsAt != nil {
			if err := parseTime(*in.StartsAt); err != nil {
				return err
			}
			c.StartsAt = *in.StartsAt
		}
		if in.EndsAt != nil {
			if err := parseTime(*in.EndsAt); err != nil {
				return err
			}
			c.EndsAt = *in.EndsAt
		}
		start, _ := time.Parse(time.RFC3339, c.StartsAt)
		end, _ := time.Parse(time.RFC3339, c.EndsAt)
		if !end.After(start) {
			return validationf("cycle end must be after start")
		}
		if in.Status != nil {
			if !domain.ValidCycleStatus(*in.Status) {
				return validationf("invalid status")
			}
			c.Status = *in.Status
		}
		if in.IsFavorite != nil {
			c.IsFavorite = *in.IsFavorite
		}
		if in.NotifyOnIssueAdded != nil {
			c.NotifyOnIssueAdded = *in.NotifyOnIssueAdded
		}
		if in.NotifyOnIssueCompleted != nil {
			c.NotifyOnIssueCompleted = *in.NotifyOnIssueCompleted
		}
		now := domain.Now()
		if c.Status == "completed" && previousStatus != "completed" {
			c.CompletedAt = &now
		} else if c.Status != "completed" && previousStatus == "completed" {
			c.CompletedAt = nil
		}
		if in.Archived != nil && *in.Archived != (c.ArchivedAt != nil) {
			if *in.Archived {
				c.ArchivedAt = &now
			} else {
				c.ArchivedAt = nil
			}
			action := "archived"
			if !*in.Archived {
				action = "unarchived"
			}
			addActivity(m, "cycle", c.ID, action, map[string]any{}, now)
		}
		ensureSingleActive(m, c.ID, c.Status)
		c.UpdatedAt = now
		m.Cycles[i] = c
		m.bump(now)
		out = c
		return nil
	})
	return out, err
}

func addCycleNotification(m *mem, cycleID *int64, issue Issue, action, now string) {
	if cycleID == nil {
		return
	}
	cycle, ok := cycleByID(m, *cycleID)
	if !ok {
		return
	}
	if (action == "cycle_issue_added" && !cycle.NotifyOnIssueAdded) ||
		(action == "cycle_issue_completed" && !cycle.NotifyOnIssueCompleted) {
		return
	}
	cycleName := cycle.Name
	if cycleName == "" {
		cycleName = fmt.Sprintf("Cycle %d", cycle.Number)
	}
	addActivity(m, "cycle", cycle.ID, action, map[string]any{
		"issueIdentifier": issue.Identifier,
		"issueTitle":      issue.Title,
		"cycle":           cycleName,
	}, now)
}

func ensureSingleActive(m *mem, id int64, status string) {
	if status != "active" {
		return
	}
	now := domain.Now()
	for i := range m.Cycles {
		if m.Cycles[i].Status == "active" && m.Cycles[i].ID != id {
			m.Cycles[i].Status = "completed"
			m.Cycles[i].UpdatedAt = now
			m.Cycles[i].CompletedAt = &now
		}
	}
}
