import { Box, Button, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { Panel } from '../components/AIPanel.tsx';
import { PageHeader, Pane, SplitLayout } from '../mantine-ui.tsx';
import { useAgentPagePresenter } from '../presenters/AgentPage.tsx';
import type { AgentChat } from '../types.ts';

export function AgentPageView({ model }: { model: ReturnType<typeof useAgentPagePresenter> }) {
  const { t, i18n } = useTranslation();
  switch (model._view) {
    case 0: {
      const { chats, activeChat, historyOpened, handlers } = model;
      return (
        <SplitLayout single>
          <Pane single>
            <PageHeader
              title={activeChat.title}
              actions={
                <Group gap="xs" wrap="nowrap">
                  <Button
                    type="button"
                    variant="subtle"
                    aria-expanded={historyOpened}
                    onClick={handlers.onToggleHistory}
                  >
                    {t('ui.chatHistory')}
                  </Button>
                  <Button type="button" variant="default" onClick={handlers.onNewChat}>
                    {t('ui.newChat')}
                  </Button>
                </Group>
              }
            />
            <Group align="stretch" gap={0} wrap="nowrap" style={{ flex: 1, minHeight: 0 }}>
              {historyOpened ? (
                <ScrollArea
                  component="nav"
                  aria-label={t('ui.chatHistory')}
                  w={260}
                  p="xs"
                  style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}
                >
                  <Stack gap={4}>
                    {chats.map((chat: AgentChat) => (
                      <Button
                        key={chat.id}
                        type="button"
                        variant={chat.id === activeChat.id ? 'light' : 'subtle'}
                        color="gray"
                        justify="flex-start"
                        aria-current={chat.id === activeChat.id ? 'page' : undefined}
                        onClick={() => handlers.onSelectChat(chat.id)}
                      >
                        <Stack gap={2} align="flex-start" style={{ minWidth: 0 }}>
                          <Text size="sm" truncate maw={220}>
                            {chat.title}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {new Intl.DateTimeFormat(i18n.language, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).format(chat.updatedAt)}
                          </Text>
                        </Stack>
                      </Button>
                    ))}
                  </Stack>
                </ScrollArea>
              ) : null}
              <Box style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto' }}>
                <Panel
                  key={activeChat.id}
                  kind="agent"
                  id={activeChat.id}
                  standalone
                  onPromptSubmitted={handlers.onPromptSubmitted}
                />
              </Box>
            </Group>
          </Pane>
        </SplitLayout>
      );
    }
  }
}

export function AgentPage() {
  return (
    <PresenterScope name="AgentPage">
      <AgentPageBinding />
    </PresenterScope>
  );
}

function AgentPageBinding() {
  const model = useAgentPagePresenter();
  const handlers = useActions(model.handlers);
  return <AgentPageView model={{ ...model, handlers } as typeof model} />;
}
