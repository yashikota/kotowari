#!/bin/sh
set -eu
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
export KOTOWARI_HOME="${E2E_KOTOWARI_HOME:-$(mktemp -d)}"
cd "$ROOT"
bin="${E2E_KOTOWARI_BIN:-}"
if [ ! -f "$KOTOWARI_HOME/workspace.toml" ]; then
  if [ -n "$bin" ]; then
    "$bin" init
  else
    go run . init
  fi
fi
if [ -n "$bin" ]; then
  exec "$bin" serve --fg --strict-port --addr 127.0.0.1:7730
fi
exec go run . serve --fg --strict-port --addr 127.0.0.1:7730
