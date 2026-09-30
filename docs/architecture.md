# Architecture boundaries

Kotowari keeps workspace rules and file access in Go, with the browser acting as an API client.
The main dependency direction is:

```text
Browser UI → HTTP API → Store → Domain rules
                    ↘ Shared models
CLI commands → Store and Domain rules
CLI serve   → HTTP API (server composition)
```

## Go packages

- `internal/domain` contains pure value parsing and validation. It does not read files, start
  processes, or depend on another Kotowari package.
- `internal/model` defines shared data structures used by the API and store. It does not depend on
  either adapter.
- `internal/store` owns workspace file reads and writes, persistence validation, and lifecycle
  rules. It does not import the HTTP or CLI adapters.
- `internal/httpapi` maps HTTP requests and responses to store operations. It does not import the
  CLI.
- `internal/cli` parses commands and composes runtime services. Its `serve` command starts the HTTP
  API and embedded web application.
- `internal/acp`, `internal/appdir`, `internal/term`, and `internal/webembed` contain process,
  filesystem-location, terminal-output, and embedded-asset adapters.

`internal/architecture` checks the dependency boundaries above during `go test ./...`. Changes to
package ownership should update both the code and this document.

## Browser packages

- `web/src/api` contains HTTP clients and response parsing.
- `web/src/application` owns client-side projections, cache, windowing, and event mediation.
- `web/src/presenters` coordinates route and interaction state and calls API clients.
- `web/src/pages` and `web/src/components` render presenter models and forward user actions.
- `web/src/demo-api.ts` provides the API fixture used by demo and browser-test builds.

Keep shared interaction state in presenter hooks and pure transformations in small modules next to
their domain. Pages should pass route-specific options into shared issue presenters instead of
copying issue-list or board behavior.
