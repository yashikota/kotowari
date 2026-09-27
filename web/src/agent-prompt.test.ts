import { describe, expect, it } from 'vite-plus/test';
import {
  clearPendingAgentPrompt,
  readPendingAgentPrompt,
  setPendingAgentPrompt,
} from './agent-prompt.ts';

describe('pending Agent prompt', () => {
  it('can be read repeatedly during React initialization and cleared after mount', () => {
    setPendingAgentPrompt('Review KOT-4');

    expect(readPendingAgentPrompt()).toBe('Review KOT-4');
    expect(readPendingAgentPrompt()).toBe('Review KOT-4');
    clearPendingAgentPrompt();
    expect(readPendingAgentPrompt()).toBe('');
  });

  it('replaces stale context when another issue selection is sent', () => {
    setPendingAgentPrompt('First selection');
    setPendingAgentPrompt('Second selection');

    expect(readPendingAgentPrompt()).toBe('Second selection');
    clearPendingAgentPrompt();
  });
});
