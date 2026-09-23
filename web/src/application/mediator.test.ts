import { describe, expect, it, vi } from 'vite-plus/test';
import { EventScope, Mediator } from './mediator.ts';

describe('Root mediator', () => {
  it('bubbles unhandled intents to the nearest responsible parent', () => {
    const mediator = new Mediator();
    const page = new EventScope('page', mediator.root);
    const field = new EventScope('field', page);
    const parent = vi.fn(),
      root = vi.fn();
    page.handlers.set('save', parent);
    mediator.root.handlers.set('save', root);
    mediator.dispatch(field, 'save', 'draft');
    expect(parent).toHaveBeenCalledWith('draft');
    expect(root).not.toHaveBeenCalled();
    page.handlers.delete('save');
    mediator.dispatch(field, 'save', 'next');
    expect(root).toHaveBeenCalledWith('next');
  });
  it('has exactly one overlay state', () => {
    const mediator = new Mediator();
    const changed = vi.fn();
    mediator.subscribe(changed);
    mediator.open('palette');
    mediator.open('issue');
    expect(mediator.getOverlay()).toBe('issue');
    expect(changed).toHaveBeenCalledTimes(2);
    mediator.open('issue');
    expect(changed).toHaveBeenCalledTimes(2);
    mediator.open('none');
    expect(mediator.getOverlay()).toBe('none');
  });
  it('arbitrates local view flags by scope and clears them on teardown', () => {
    const mediator = new Mediator();
    const first = new EventScope('first', mediator.root);
    const second = new EventScope('second', mediator.root);
    first.handlers.set('toggle', () => mediator.setFlag(`${first.id}:menu`, (open) => !open));
    second.handlers.set('toggle', () => mediator.setFlag(`${second.id}:menu`, (open) => !open));
    const changed = vi.fn();
    mediator.subscribe(changed);
    mediator.dispatch(first, 'toggle', undefined);
    expect(mediator.getFlag('first:menu')).toBe(true);
    expect(mediator.getFlag('second:menu')).toBe(false);
    mediator.dispatch(second, 'toggle', undefined);
    mediator.dispatch(first, 'toggle', undefined);
    expect(mediator.getFlag('first:menu')).toBe(false);
    expect(mediator.getFlag('second:menu')).toBe(true);
    mediator.clearFlag('second:menu');
    expect(mediator.getFlag('second:menu')).toBe(false);
    expect(changed).toHaveBeenCalledTimes(4);
    expect(mediator.getFlag('editor:history', true)).toBe(true);
    mediator.setFlag('editor:history', false, true);
    expect(mediator.getFlag('editor:history', true)).toBe(false);
  });
  it('rejects duplicate submissions until completion and surfaces failures', async () => {
    const mediator = new Mediator();
    let reject!: (error: Error) => void;
    const save = vi.fn(
      () =>
        new Promise<void>((_, fail) => {
          reject = fail;
        }),
    );
    mediator.root.handlers.set('onSubmit', save);
    const first = mediator.dispatch(mediator.root, 'onSubmit', {});
    mediator.dispatch(mediator.root, 'onSubmit', {});
    expect(save).toHaveBeenCalledTimes(1);
    reject(new Error('conflict'));
    await first;
    expect(mediator.getError()).toBe('conflict');
    expect(mediator.operations.get('Root:onSubmit')).toBe('failed');
  });
  it('does not execute events from detached views', () => {
    const mediator = new Mediator();
    const child = new EventScope('child', mediator.root);
    const save = vi.fn();
    mediator.root.handlers.set('save', save);
    child.active = false;
    mediator.dispatch(child, 'save', {});
    expect(save).not.toHaveBeenCalled();
  });
  it('transitions successful asynchronous actions back to idle', async () => {
    const mediator = new Mediator();
    mediator.root.handlers.set('onSubmit', async () => 'saved');
    expect(await mediator.dispatch(mediator.root, 'onSubmit', undefined)).toBe('saved');
    expect(mediator.operations.get('Root:onSubmit')).toBeUndefined();
    expect(mediator.getError()).toBe('');
  });
  it('stops keyboard propagation after a child consumes it', () => {
    const mediator = new Mediator();
    const child = new EventScope('child', mediator.root);
    const root = vi.fn();
    mediator.root.handlers.set('keyboard', root);
    child.handlers.set('keyboard', () => true);
    expect(mediator.keyboard(child, {} as KeyboardEvent)).toBe(true);
    expect(root).not.toHaveBeenCalled();
  });
});
