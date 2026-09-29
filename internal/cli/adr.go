package cli

import (
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
	"github.com/yashikota/kotowari/internal/model"
	"github.com/yashikota/kotowari/internal/store"
)

func cmdADRExport(stdout io.Writer, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("usage: kotowari adr export <id>")
	}
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	adr, err := st.GetADR(id)
	if err != nil {
		return err
	}
	if strings.TrimSpace(adr.PublishBody) == "" {
		return fmt.Errorf("%s has no PUBLISH.md yet", adr.Identifier)
	}
	if _, err := fmt.Fprint(stdout, adr.PublishBody); err != nil {
		return err
	}
	if !strings.HasSuffix(adr.PublishBody, "\n") {
		_, err = fmt.Fprintln(stdout)
	}
	return err
}

func cmdADRNew(stdout io.Writer, title string, supersedes int, status string, issue int) error {
	title = strings.TrimSpace(title)
	if title == "" {
		return fmt.Errorf("usage: kotowari adr new <title>")
	}
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	in := model.CreateADRInput{Title: title, Status: status}
	if supersedes > 0 {
		in.Supersedes = &supersedes
	}
	if issue > 0 {
		in.IssueNumbers = []int{issue}
	}
	adr, err := st.CreateADR(in)
	if err != nil {
		return err
	}
	fmt.Fprintf(stdout, "%s\nadr/%s/README.md\n", adr.Identifier, domain.DirName(adr.Number))
	return nil
}

func cmdADRSetStatus(stdout io.Writer, id, status string, by int) error {
	id = strings.TrimSpace(id)
	status = strings.TrimSpace(status)
	if id == "" || status == "" {
		return fmt.Errorf("usage: kotowari adr status <id> <status>")
	}
	if !domain.ValidADRStatus(status) {
		return fmt.Errorf("invalid ADR status %q", status)
	}
	if by < 0 || (by > 0 && status != "superseded") {
		return fmt.Errorf("--by requires status superseded and a positive ADR number")
	}
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	if by > 0 {
		old, err := st.GetADR(id)
		if err != nil {
			return err
		}
		n := old.Number
		sp := &n
		if _, err := st.UpdateADR(strconv.Itoa(by), model.PatchADRInput{Supersedes: &sp}); err != nil {
			return err
		}
	}
	in := model.PatchADRInput{Status: &status}
	out, err := st.UpdateADR(id, in)
	if err != nil {
		return err
	}
	fmt.Fprintf(stdout, "%s\t%s\n", out.Identifier, out.Status)
	return nil
}

func cmdADRGenerate(stdout io.Writer, kind string) error {
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	list, err := st.ListADRs()
	if err != nil {
		return err
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Number < list[j].Number })
	switch kind {
	case "toc":
		fmt.Fprint(stdout, store.RenderADRTOC(list))
	case "graph":
		fmt.Fprint(stdout, store.RenderADRGraph(list))
	default:
		return fmt.Errorf("unknown generate %s", kind)
	}
	return nil
}
