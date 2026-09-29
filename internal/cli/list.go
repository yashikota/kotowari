package cli

import (
	"fmt"
	"io"
	"sort"

	"github.com/yashikota/kotowari/internal/store"
)

func cmdList(stdout io.Writer, issues, adrs, long bool, status string) error {
	if !issues && !adrs {
		issues, adrs = true, true
	}
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	if issues {
		list, err := st.ListIssues(store.IssueFilter{Status: status})
		if err != nil {
			return err
		}
		sort.Slice(list, func(i, j int) bool { return list[i].Number < list[j].Number })
		for _, iss := range list {
			printListLine(stdout, iss.Identifier, iss.Status, iss.CreatedAt, iss.Title, long)
		}
	}
	if adrs {
		list, err := st.ListADRs()
		if err != nil {
			return err
		}
		sort.Slice(list, func(i, j int) bool { return list[i].Number < list[j].Number })
		for _, a := range list {
			if status != "" && a.Status != status {
				continue
			}
			printListLine(stdout, a.Identifier, a.Status, a.CreatedAt, a.Title, long)
		}
	}
	return nil
}

func printListLine(stdout io.Writer, ident, status, created, title string, long bool) {
	if !long {
		fmt.Fprintf(stdout, "%s - %s\n", ident, title)
		return
	}
	day := created
	if len(day) >= 10 {
		day = day[:10]
	}
	fmt.Fprintf(stdout, "%s\t%s\t%s\t%s\n", ident, status, day, title)
}
