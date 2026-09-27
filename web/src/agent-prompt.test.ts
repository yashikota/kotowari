import { describe, expect, it } from 'vite-plus/test';
import { setPendingAgentPrompt, takePendingAgentPrompt } from './agent-prompt.ts';

describe('pending Agent prompt', () => {
  it('is consumed once when navigating to the Agent page', () => {
    setPendingAgentPrompt('Review KOT-4');

    expect(takePendingAgentPrompt()).toBe('Review KOT-4');
    expect(takePendingAgentPrompt()).toBe('');
  });

  it('replaces stale context when another issue selection is sent', () => {
    setPendingAgentPrompt('First selection');
    setPendingAgentPrompt('Second selection');

    expect(takePendingAgentPrompt()).toBe('Second selection');
  });
});
