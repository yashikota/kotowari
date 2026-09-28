package store

import (
	"testing"
	"time"
)

func TestEnsureCycleScheduleCreatesConfiguredUpcomingCycles(t *testing.T) {
	location, err := time.LoadLocation("Asia/Tokyo")
	if err != nil {
		t.Fatal(err)
	}
	m := &mem{
		Workspace: workspaceFile{
			Timezone: "Asia/Tokyo",
			CycleSettings: &CycleSettings{
				DurationDays:    14,
				CooldownDays:    0,
				StartDay:        "monday",
				AutoCreateAhead: 2,
			},
			NextID: 2,
		},
		Cycles: []Cycle{{
			ID:       1,
			Number:   1,
			Name:     "Cycle 1",
			StartsAt: "2026-09-21T00:00:00+09:00",
			EndsAt:   "2026-10-05T00:00:00+09:00",
			Status:   "active",
		}},
	}

	ensureCycleSchedule(m, time.Date(2026, time.September, 29, 10, 0, 0, 0, location))
	if len(m.Cycles) != 3 {
		t.Fatalf("cycle count = %d, want 3", len(m.Cycles))
	}
	if got := m.Cycles[1]; got.Number != 2 || got.StartsAt != "2026-10-05T00:00:00+09:00" || got.EndsAt != "2026-10-19T00:00:00+09:00" || got.Status != "upcoming" {
		t.Fatalf("first generated cycle = %#v", got)
	}
	if got := m.Cycles[2]; got.Number != 3 || got.StartsAt != "2026-10-19T00:00:00+09:00" || got.EndsAt != "2026-11-02T00:00:00+09:00" || got.Status != "upcoming" {
		t.Fatalf("second generated cycle = %#v", got)
	}

	ensureCycleSchedule(m, time.Date(2026, time.September, 29, 10, 0, 0, 0, location))
	if len(m.Cycles) != 3 {
		t.Fatalf("repeated ensure added cycles: count = %d, want 3", len(m.Cycles))
	}
}

func TestEnsureCycleScheduleHonorsCooldownAndDisabledSettings(t *testing.T) {
	location, err := time.LoadLocation("UTC")
	if err != nil {
		t.Fatal(err)
	}
	base := mem{
		Workspace: workspaceFile{
			Timezone: "UTC",
			CycleSettings: &CycleSettings{
				DurationDays:    7,
				CooldownDays:    2,
				StartDay:        "monday",
				AutoCreateAhead: 1,
			},
			NextID: 2,
		},
		Cycles: []Cycle{{
			ID:       1,
			Number:   1,
			StartsAt: "2026-09-21T00:00:00Z",
			EndsAt:   "2026-09-28T00:00:00Z",
			Status:   "active",
		}},
	}
	now := time.Date(2026, time.September, 29, 10, 0, 0, 0, location)
	ensureCycleSchedule(&base, now)
	if got := base.Cycles[1].StartsAt; got != "2026-10-05T00:00:00Z" {
		t.Fatalf("cycle after cooldown starts at %q, want 2026-10-05T00:00:00Z", got)
	}

	base.Workspace.CycleSettings.AutoCreateAhead = 0
	ensureCycleSchedule(&base, now)
	if len(base.Cycles) != 2 {
		t.Fatalf("disabled auto-create added a cycle: count = %d, want 2", len(base.Cycles))
	}
}

func TestEnsureCycleScheduleDoesNothingWithoutAnExistingCycle(t *testing.T) {
	m := &mem{Workspace: workspaceFile{CycleSettings: nil}}
	ensureCycleSchedule(m, time.Date(2026, time.September, 29, 0, 0, 0, 0, time.UTC))
	if len(m.Cycles) != 0 {
		t.Fatalf("created cycles without an existing schedule: %#v", m.Cycles)
	}
}
