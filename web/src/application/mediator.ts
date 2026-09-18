export type Overlay = 'none' | 'palette' | 'help' | 'issue' | 'adr' | 'page' | 'view';
export type Operation = 'idle' | 'running' | 'failed';
export type Intent = { type: string; payload: unknown; source: EventScope };
export type Handler = (payload: unknown) => unknown;

/** A scope can consume an intent or leave it to its parent. */
export class EventScope {
  readonly handlers = new Map<string, Handler>();
  active = true;
  readonly id: string;
  readonly parent: EventScope | null;
  constructor(id: string, parent: EventScope | null) {
    this.id = id;
    this.parent = parent;
  }

  resolve(type: string): { owner: EventScope; handler: Handler } | undefined {
    if (!this.active) return undefined;
    const handler = this.handlers.get(type);
    return handler ? { owner: this, handler } : this.parent?.resolve(type);
  }
}

/** Root arbitrates state transitions before any Presenter handles an intent. */
export class Mediator {
  readonly root = new EventScope('Root', null);
  readonly scopes = new Map<string, EventScope>();
  readonly operations = new Map<string, Operation>();
  readonly signals = new EventTarget();
  private overlay: Overlay = 'none';
  private listeners = new Set<() => void>();
  private error = '';

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getOverlay = () => this.overlay;
  getError = () => this.error;
  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  open(overlay: Overlay) {
    if (this.overlay === overlay) return;
    this.overlay = overlay;
    this.notify();
  }
  report(error: unknown) {
    this.error = error instanceof Error ? error.message : String(error);
    this.notify();
  }
  clearError() {
    this.error = '';
    this.notify();
  }

  dispatch(source: EventScope, type: string, payload: unknown): unknown {
    const resolved = source.resolve(type);
    if (!resolved) return;
    const key = `${resolved.owner.id}:${type}`;
    if (this.operations.get(key) === 'running' && /onSubmit|onKeyDown|onClick|^submit:/.test(type))
      return;
    try {
      const result = resolved.handler(payload);
      if (result instanceof Promise) {
        this.operations.set(key, 'running');
        return result.then(
          (value: unknown) => {
            this.operations.delete(key);
            return value;
          },
          (error: unknown) => {
            this.operations.set(key, 'failed');
            this.report(error);
          },
        );
      }
      return result;
    } catch (error) {
      this.operations.set(key, 'failed');
      this.report(error);
    }
  }

  keyboard(source: EventScope, event: KeyboardEvent) {
    for (let scope: EventScope | null = source; scope; scope = scope.parent) {
      if (scope.active && scope.handlers.get('keyboard')?.(event) === true) return true;
    }
    return false;
  }
}

export const mediator = new Mediator();
export const signals = mediator.signals;
