export type Overlay = 'none' | 'palette' | 'help' | 'issue' | 'adr' | 'page';
export type Operation = 'idle' | 'running' | 'failed';
export type Intent = { type: string; payload: unknown; source: EventScope };
export type Handler = (payload: unknown) => unknown;
type MachineEvent =
  | { type: 'overlay.open'; overlay: Overlay }
  | { type: 'error.report'; error: unknown }
  | { type: 'error.clear' }
  | { type: 'operation.start' | 'operation.finish' | 'operation.fail'; key: string }
  | { type: 'flag.set'; key: string; value: boolean; defaultValue?: boolean }
  | { type: 'flag.clear'; key: string };

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
  private flags = new Map<string, boolean>();
  private listeners = new Set<() => void>();
  private error = '';

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getOverlay = () => this.overlay;
  getError = () => this.error;
  getFlag = (key: string, defaultValue = false) => this.flags.get(key) ?? defaultValue;
  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  /** All shared UI and operation state changes pass through this transition table. */
  transition(event: MachineEvent) {
    switch (event.type) {
      case 'overlay.open':
        if (this.overlay === event.overlay) return;
        this.overlay = event.overlay;
        break;
      case 'error.report':
        this.error = event.error instanceof Error ? event.error.message : String(event.error);
        break;
      case 'error.clear':
        if (!this.error) return;
        this.error = '';
        break;
      case 'operation.start':
        this.operations.set(event.key, 'running');
        break;
      case 'operation.finish':
        this.operations.delete(event.key);
        break;
      case 'operation.fail':
        this.operations.set(event.key, 'failed');
        break;
      case 'flag.set':
        if (this.getFlag(event.key, event.defaultValue) === event.value) return;
        this.flags.set(event.key, event.value);
        break;
      case 'flag.clear':
        if (!this.flags.has(event.key)) return;
        this.flags.delete(event.key);
        break;
    }
    this.notify();
  }

  open(overlay: Overlay) {
    this.transition({ type: 'overlay.open', overlay });
  }
  report(error: unknown) {
    this.transition({ type: 'error.report', error });
  }
  clearError() {
    this.transition({ type: 'error.clear' });
  }
  setFlag(key: string, value: boolean | ((previous: boolean) => boolean), defaultValue = false) {
    this.transition({
      type: 'flag.set',
      key,
      value: typeof value === 'function' ? value(this.getFlag(key, defaultValue)) : value,
      defaultValue,
    });
  }
  clearFlag(key: string) {
    this.transition({ type: 'flag.clear', key });
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
        this.transition({ type: 'operation.start', key });
        return result.then(
          (value: unknown) => {
            this.transition({ type: 'operation.finish', key });
            return value;
          },
          (error: unknown) => {
            this.transition({ type: 'operation.fail', key });
            this.report(error);
          },
        );
      }
      return result;
    } catch (error) {
      this.transition({ type: 'operation.fail', key });
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
