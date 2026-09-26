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
    { keys: 'p', action: t('ui.shortcutPriorityOrAdr') },
    { keys: t('ui.shortcutProjectSequence'), action: t('ui.shortcutCreateProject') },
    { keys: t('ui.shortcutGoInboxKeys'), action: t('nav.inbox') },
    { keys: t('ui.shortcutGoAgentKeys'), action: t('nav.agent') },
    { keys: t('ui.shortcutGoMyIssuesKeys'), action: t('nav.myIssues') },
    { keys: t('ui.shortcutGoBacklogKeys'), action: t('issueStatus.backlog') },
    { keys: t('ui.shortcutGoIssuesKeys'), action: t('nav.issues') },
    { keys: t('ui.shortcutGoCyclesKeys'), action: t('nav.cycles') },
    { keys: t('ui.shortcutGoCurrentCycleKeys'), action: t('nav.cycleCurrent') },
    { keys: t('ui.shortcutGoUpcomingCycleKeys'), action: t('nav.cycleUpcoming') },
    { keys: t('ui.shortcutGoProjectsKeys'), action: t('nav.projects') },
    { keys: t('ui.shortcutGoInitiativesKeys'), action: t('nav.initiatives') },
    { keys: t('ui.shortcutGoSettingsKeys'), action: t('nav.config') },
    { keys: t('ui.shortcutOpenLinkedCodeKeys'), action: t('ui.shortcutOpenLinkedCode') },
    { keys: '/', action: t('ui.shortcutFindInList') },
    { keys: 'j / k', action: t('ui.shortcutMoveSelection') },
    { keys: 'x', action: t('ui.shortcutSelectIssue') },
    { keys: 'Mod+A', action: t('ui.shortcutSelectAllIssues') },
    { keys: 'Shift+R', action: t('ui.shortcutRenameIssue') },
    { keys: 's', action: t('ui.shortcutSetStatus') },
    { keys: 'l', action: t('ui.shortcutOpenLabelsMenu') },
    { keys: 'Shift+E', action: t('ui.shortcutOpenEstimateMenu') },
    { keys: 'Enter', action: t('ui.shortcutOpenIssue') },
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
