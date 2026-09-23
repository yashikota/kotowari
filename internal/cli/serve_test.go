package cli

import (
	"net"
	"strconv"
	"testing"
)

func TestListenTCPUsesNextPortWhenBusy(t *testing.T) {
	var occupied net.Listener
	var portStr string
	for range 100 {
		candidate, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			t.Fatal(err)
		}
		_, port, err := net.SplitHostPort(candidate.Addr().String())
		if err != nil {
			_ = candidate.Close()
			t.Fatal(err)
		}
		portNum, err := strconv.Atoi(port)
		if err != nil {
			_ = candidate.Close()
			t.Fatal(err)
		}
		if portNum < 65535 {
			probe, probeErr := net.Listen("tcp", net.JoinHostPort("127.0.0.1", strconv.Itoa(portNum+1)))
			if probeErr == nil {
				_ = probe.Close()
				occupied = candidate
				portStr = port
				break
			}
		}
		_ = candidate.Close()
	}
	if occupied == nil {
		t.Fatal("could not find an available adjacent loopback port pair")
	}
	t.Cleanup(func() {
		if err := occupied.Close(); err != nil {
			t.Error(err)
		}
	})

	ln, addr, err := listenTCP("127.0.0.1:"+portStr, false, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := ln.Close(); err != nil {
			t.Error(err)
		}
	})

	_, gotPort, err := net.SplitHostPort(addr)
	if err != nil {
		t.Fatal(err)
	}
	if gotPort == portStr {
		t.Fatalf("addr = %s, want a different port than %s", addr, portStr)
	}
}

func TestListenTCPStrictPortFailsWhenBusy(t *testing.T) {
	occupied, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := occupied.Close(); err != nil {
			t.Error(err)
		}
	})

	_, _, err = listenTCP(occupied.Addr().String(), true, nil)
	if err == nil {
		t.Fatal("expected error for strict port")
	}
}

func TestParseServeAddr(t *testing.T) {
	host, port, err := parseServeAddr("7731")
	if err != nil {
		t.Fatal(err)
	}
	if host != "127.0.0.1" || port != 7731 {
		t.Fatalf("host=%q port=%d", host, port)
	}
}

func TestListenRejectsNonLoopback(t *testing.T) {
	for _, addr := range []string{"0.0.0.0:5108", "[::]:5108", "192.0.2.1:5108"} {
		ln, _, err := listenTCP(addr, true, nil)
		if ln != nil {
			_ = ln.Close()
		}
		if err == nil {
			t.Fatalf("accepted %s", addr)
		}
	}
}
