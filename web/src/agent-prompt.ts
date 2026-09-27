const PENDING_PROMPT_KEY = 'kotowari.agent.pending-prompt.v1';
let pendingPrompt = '';

export function setPendingAgentPrompt(prompt: string): void {
  pendingPrompt = prompt;
  try {
    sessionStorage.setItem(PENDING_PROMPT_KEY, prompt);
  } catch {
    // The in-memory value still carries the prompt through client-side navigation.
  }
}

export function readPendingAgentPrompt(): string {
  let stored = '';
  try {
    stored = sessionStorage.getItem(PENDING_PROMPT_KEY) ?? '';
  } catch {
    // Use the in-memory value when session storage is unavailable.
  }
  return stored || pendingPrompt;
}

export function clearPendingAgentPrompt(): void {
  try {
    sessionStorage.removeItem(PENDING_PROMPT_KEY);
  } catch {
    // The in-memory value is still cleared below.
  }
  pendingPrompt = '';
}
