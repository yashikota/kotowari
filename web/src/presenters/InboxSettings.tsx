import { useState } from 'react';
import { useActions } from '../application/Root.tsx';
import {
  DEFAULT_INBOX_STATE,
  INBOX_PRIORITY_TYPES,
  INBOX_STATE_KEY,
  parseInboxState,
  serializeInboxState,
  type InboxPriorityType,
  type InboxState,
} from '../inbox-state.ts';

function readInboxState(): InboxState {
  if (typeof window === 'undefined') return { ...DEFAULT_INBOX_STATE };
  return parseInboxState(window.localStorage.getItem(INBOX_STATE_KEY));
}

export function useInboxSettingsPresenter() {
  const [inboxState, setInboxState] = useState(readInboxState);

  function updateInboxState(update: (current: InboxState) => InboxState) {
    setInboxState((current) => {
      const next = update(current);
      window.localStorage.setItem(INBOX_STATE_KEY, serializeInboxState(next));
      return next;
    });
  }

  const handlers = useActions({
    onTogglePriorityInbox: () =>
      updateInboxState((current) => ({
        ...current,
        priorityInboxEnabled: !current.priorityInboxEnabled,
      })),
    onTogglePriorityType: (priorityType: InboxPriorityType) =>
      updateInboxState((current) => ({
        ...current,
        priorityTypes: current.priorityTypes.includes(priorityType)
          ? current.priorityTypes.filter((type) => type !== priorityType)
          : [...current.priorityTypes, priorityType],
      })),
    onSetAllPriorityTypes: (included: boolean) =>
      updateInboxState((current) => ({
        ...current,
        priorityTypes: included ? [...DEFAULT_INBOX_STATE.priorityTypes] : [],
      })),
  });

  return {
    priorityInboxEnabled: inboxState.priorityInboxEnabled,
    priorityTypes: inboxState.priorityTypes,
    handlers,
    allPriorityTypes: INBOX_PRIORITY_TYPES,
  };
}
