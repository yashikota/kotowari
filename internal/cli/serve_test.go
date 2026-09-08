package cli

import (
	"net"
	"testing"
)

func TestListenTCPUsesNextPortWhenBusy(t *testing.T) {
	occupied, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := occupied.Close(); err != nil {
			t.Error(err)
		}
	})
	_, portStr, err := net.SplitHostPort(occupied.Addr().String())
	if err != nil {
		t.Fatal(err)
	}

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
	for _, addr := range []string{"0.0.0.0:7730", "[::]:7730", "192.0.2.1:7730"} {
		ln, _, err := listenTCP(addr, true, nil)
		if ln != nil {
			_ = ln.Close()
		}
		if err == nil {
			t.Fatalf("accepted %s", addr)
		}
	}
}
