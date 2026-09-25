import { Box, Button, Group, Modal, Table, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Shortcut } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useShortcutHelpPresenter } from '../presenters/ShortcutHelp.tsx';

export function ShortcutHelpView({
  model,
}: {
  model: ReturnType<typeof useShortcutHelpPresenter>;
}) {
  const { t } = useTranslation();
  const rows: { keys: string; action: string }[] = [
    { keys: 'Mod+K', action: t('ui.commandPalette') },
    { keys: 'Ctrl/⌘+Enter', action: t('ui.shortcutSendOrCreate') },
    { keys: 'Enter (text)', action: t('ui.shortcutInsertLine') },
    { keys: 'c', action: t('modal.createIssue') },
    { keys: 'p', action: t('modal.createAdr') },
    { keys: t('ui.shortcutProjectSequence'), action: t('ui.shortcutCreateProject') },
    { keys: '/', action: t('ui.shortcutFindInList') },
    { keys: 'j / k', action: t('ui.shortcutMoveSelection') },
    { keys: 'Enter', action: t('ui.shortcutOpenIssue') },
    { keys: 's', action: t('ui.shortcutSetStatus') },
    { keys: '1–7', action: t('ui.shortcutSwitchNavigation') },
    { keys: '0', action: t('config.title') },
    { keys: 'Shift+1–4', action: t('ui.shortcutSetPriority') },
    { keys: 'Esc', action: t('ui.shortcutCloseDialogs') },
    { keys: '?', action: t('ui.shortcutShowHelp') },
  ];
  switch (model._view) {
    case 0: {
      const { handlers } = model;
      return (
        <Modal
          opened
          onClose={handlers.onClick0}
          title={t('ui.keyboardShortcuts')}
          aria-label={t('ui.keyboardShortcuts')}
          centered
          size="md"
          withCloseButton={false}
        >
          <Box onClick={handlers.Keyboard_shortcuts_onClick1}>
            <Group justify="flex-end" mb="sm">
              <Button variant="subtle" size="compact-sm" onClick={handlers.onClick2}>
                {t('ui.close')}
              </Button>
            </Group>
            <Table>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.keys}>
                    <Table.Td style={{ width: '40%', verticalAlign: 'top' }}>
                      <Shortcut>{row.keys}</Shortcut>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{row.action}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </Modal>
      );
    }
  }
}

export function ShortcutHelp(props: Parameters<typeof useShortcutHelpPresenter>[0]) {
  return (
    <PresenterScope name="ShortcutHelp">
      <ShortcutHelpBinding {...props} />
    </PresenterScope>
  );
}

function ShortcutHelpBinding(props: Parameters<typeof useShortcutHelpPresenter>[0]) {
  const model = useShortcutHelpPresenter(props);
  const handlers = useActions(model.handlers);
  return <ShortcutHelpView model={{ ...model, handlers } as typeof model} />;
}
