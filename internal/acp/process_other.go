//go:build !unix

package acp

import "os/exec"

func prepareProcess(_ *exec.Cmd) {}
func killProcess(cmd *exec.Cmd) {
	if cmd.Process != nil {
		_ = cmd.Process.Kill()
	}
}
