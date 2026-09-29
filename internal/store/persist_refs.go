package store

import (
	"github.com/yashikota/kotowari/internal/domain"
)

func fillADRRefs(m *mem) {
	for i := range m.ADRs {
		a := &m.ADRs[i]
		a.ID = int64(a.Number)
		a.Identifier = domain.Ident(m.adrPrefix(), a.Number)
		if a.IssueNumbers == nil {
			a.IssueNumbers = []int{}
		}
	}
}

func fillIssueRefs(m *mem) {
	for i := range m.Issues {
		iss := &m.Issues[i]
		iss.ID = int64(iss.Number)
		iss.Identifier = domain.Ident(m.issuePrefix(), iss.Number)
		if iss.ADRNumbers == nil {
			iss.ADRNumbers = []int{}
		}
		if iss.ExternalLinks == nil {
			iss.ExternalLinks = []IssueLink{}
		}
		if iss.Relations == nil {
			iss.Relations = []IssueRelation{}
		}
		if iss.Labels == nil {
			iss.Labels = []Label{}
		}
		if iss.ProjectSlug != nil {
			if p, ok := projectBySlug(m, *iss.ProjectSlug); ok {
				id := p.ID
				iss.ProjectID = &id
			}
		}
		if iss.MilestoneID != nil {
			if p, milestone, ok := milestoneByID(m, *iss.MilestoneID); ok {
				projectID := p.ID
				iss.ProjectID = &projectID
				slug := p.Slug
				iss.ProjectSlug = &slug
				name := milestone.Name
				iss.MilestoneName = &name
			} else {
				iss.MilestoneID = nil
			}
		}
		if iss.CycleNumber != nil {
			if c, ok := cycleByNumber(m, *iss.CycleNumber); ok {
				id := c.ID
				iss.CycleID = &id
			}
		}
		if iss.ParentIdentifier != nil && *iss.ParentIdentifier != "" {
			if p, ok := issueByIdent(m, *iss.ParentIdentifier); ok {
				id := p.ID
				iss.ParentID = &id
			}
		}
	}
}

func fillPageRefs(m *mem) {
	for i := range m.Pages {
		p := &m.Pages[i]
		if p.ProjectSlug != nil {
			if proj, ok := projectBySlug(m, *p.ProjectSlug); ok {
				id := proj.ID
				p.ProjectID = &id
			}
		}
		if p.ParentSlug != nil && *p.ParentSlug != "" {
			if parent, ok := pageBySlug(m, *p.ParentSlug); ok {
				id := parent.ID
				p.ParentID = &id
			}
		}
	}
}
