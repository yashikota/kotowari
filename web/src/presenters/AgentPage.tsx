import { useEffect, useState } from 'react';
import i18n from '../i18n/index.ts';
import type { AgentChat } from '../types.ts';

const STORAGE_KEY = 'kotowari.agent.chats.v1';

function newChat(): AgentChat {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, title: i18n.t('ui.newChat'), updatedAt: Date.now() };
}

function readHistory(): AgentChat[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((value): value is AgentChat => {
        if (typeof value !== 'object' || value === null) return false;
        const chat = value as Record<string, unknown>;
        return (
          typeof chat.id === 'string' &&
          typeof chat.title === 'string' &&
          typeof chat.updatedAt === 'number'
        );
      })
      .sort((left, right) => right.updatedAt - left.updatedAt);
  } catch {
    return [];
  }
}

function initialState() {
  const chats = readHistory();
  const entries = chats.length > 0 ? chats : [newChat()];
  return { chats: entries, activeChatId: entries[0]!.id };
}

export function useAgentPagePresenter() {
  const [state, setState] = useState(initialState);
  const [historyOpened, setHistoryOpened] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.chats));
    } catch {
      // Chat history remains available for the lifetime of this page if storage is unavailable.
    }
  }, [state.chats]);

  const activeChat = state.chats.find((chat) => chat.id === state.activeChatId) ?? state.chats[0]!;

  return {
    _view: 0 as const,
    chats: state.chats,
    activeChat,
    historyOpened,
    handlers: {
      onNewChat: () => {
        const chat = newChat();
        setState((current) => ({
          chats: [chat, ...current.chats],
          activeChatId: chat.id,
        }));
        setHistoryOpened(false);
      },
      onToggleHistory: () => setHistoryOpened((current) => !current),
      onSelectChat: (id: string) => {
        setState((current) =>
          current.chats.some((chat) => chat.id === id) ? { ...current, activeChatId: id } : current,
        );
        setHistoryOpened(false);
      },
      onPromptSubmitted: (prompt: string) => {
        const title = prompt.trim().replace(/\s+/g, ' ').slice(0, 72) || i18n.t('ui.newChat');
        setState((current) => ({
          activeChatId: current.activeChatId,
          chats: current.chats
            .map((chat) =>
              chat.id === current.activeChatId ? { ...chat, title, updatedAt: Date.now() } : chat,
            )
            .sort((left, right) => right.updatedAt - left.updatedAt),
        }));
      },
    },
  };
}
