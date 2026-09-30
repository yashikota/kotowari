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
    { keys: 'Alt+C', action: t('ui.shortcutNewIssueFromTemplate') },
    { keys: 'v', action: t('ui.shortcutNewIssueFullscreen') },
    { keys: 'p', action: t('ui.shortcutPriorityOrAdr') },
    { keys: t('ui.shortcutProjectSequence'), action: t('ui.shortcutCreateProject') },
    { keys: t('ui.shortcutGoInboxKeys'), action: t('nav.inbox') },
    { keys: t('ui.shortcutGoReviewsKeys'), action: t('nav.reviews') },
    { keys: t('ui.shortcutGoAgentKeys'), action: t('nav.agent') },
    { keys: t('ui.shortcutGoDraftsKeys'), action: t('nav.drafts') },
    { keys: t('ui.shortcutGoMyIssuesKeys'), action: t('nav.myIssues') },
    { keys: t('ui.shortcutGoActiveIssuesKeys'), action: t('ui.shortcutGoActiveIssues') },
    { keys: t('ui.shortcutGoBacklogKeys'), action: t('issueStatus.backlog') },
    { keys: t('ui.shortcutGoIssuesKeys'), action: t('nav.issues') },
    { keys: t('ui.shortcutGoCyclesKeys'), action: t('nav.cycles') },
    { keys: t('ui.shortcutGoCurrentCycleKeys'), action: t('nav.cycleCurrent') },
    { keys: t('ui.shortcutGoUpcomingCycleKeys'), action: t('nav.cycleUpcoming') },
    { keys: t('ui.shortcutGoProjectsKeys'), action: t('nav.projects') },
    { keys: t('ui.shortcutGoInitiativesKeys'), action: t('nav.initiatives') },
    { keys: t('ui.shortcutGoSettingsKeys'), action: t('nav.config') },
    { keys: t('ui.shortcutToggleSidebarKeys'), action: t('ui.shortcutToggleSidebar') },
    {
      keys: t('ui.shortcutToggleRightSidebarKeys'),
      action: t('ui.shortcutToggleRightSidebar'),
    },
    { keys: t('ui.shortcutQuickOpenIssueKeys'), action: t('ui.shortcutQuickOpenIssue') },
    { keys: t('ui.shortcutQuickOpenFavoriteKeys'), action: t('ui.shortcutQuickOpenFavorite') },
    { keys: t('ui.shortcutQuickOpenProjectKeys'), action: t('ui.shortcutQuickOpenProject') },
    { keys: t('ui.shortcutQuickOpenCycleKeys'), action: t('ui.shortcutQuickOpenCycle') },
    { keys: t('ui.shortcutQuickOpenViewKeys'), action: t('ui.shortcutQuickOpenView') },
    { keys: t('ui.shortcutQuickOpenDocumentKeys'), action: t('ui.shortcutQuickOpenDocument') },
    {
      keys: t('ui.shortcutQuickOpenInitiativeKeys'),
      action: t('ui.shortcutQuickOpenInitiative'),
    },
    { keys: t('ui.shortcutOpenLinkedCodeKeys'), action: t('ui.shortcutOpenLinkedCode') },
    { keys: '/', action: t('ui.shortcutFindInList') },
    { keys: 'f', action: t('filters.button') },
    { keys: 'Shift+F', action: t('ui.shortcutClearLastIssueFilter') },
    { keys: 'Alt+Shift+F', action: t('filters.clear') },
    { keys: 'j / k', action: t('ui.shortcutMoveSelection') },
    { keys: 'Ctrl/⌘+B', action: t('ui.shortcutToggleIssueLayout') },
    { keys: 'Ctrl/⌘+Shift+C', action: t('ui.shortcutCopyPageURL') },
    { keys: 'Shift+V', action: t('ui.shortcutShowDisplayOptions') },
    { keys: 'Ctrl/⌘+← / →', action: t('ui.shortcutMoveIssueBetweenColumns') },
    { keys: '↑ / ↓ / ← / →', action: t('ui.shortcutNavigateBoardIssues') },
    { keys: 'Alt+↑ / ↓', action: t('ui.shortcutReorderIssueInGroup') },
    { keys: 'Alt+Shift+↑ / ↓', action: t('ui.shortcutMoveIssueToGroupEdge') },
    { keys: 't', action: t('ui.shortcutToggleIssueGroup') },
    { keys: 'Alt+t', action: t('ui.shortcutToggleIssueGroups') },
    { keys: 'Ctrl/⌘+Alt+A', action: t('ui.shortcutSelectIssueGroup') },
    { keys: 'x', action: t('ui.shortcutSelectIssue') },
    { keys: 'Mod+A', action: t('ui.shortcutSelectAllIssues') },
    { keys: 'Shift+R', action: t('ui.shortcutRenameIssue') },
    { keys: 'Shift+P', action: t('ui.shortcutAddIssueToProject') },
    { keys: 'M, then B', action: t('ui.shortcutMarkIssueBlocked') },
    { keys: 'M, then X', action: t('ui.shortcutMarkIssueBlocking') },
    { keys: 'M, then R', action: t('ui.shortcutMarkIssueRelated') },
    { keys: 'M, then M', action: t('ui.shortcutMarkIssueDuplicate') },
    { keys: 'a', action: t('ui.shortcutAssignIssue') },
    { keys: 'i', action: t('ui.shortcutAssignIssueToSelf') },
    { keys: 'Alt+F', action: t('ui.shortcutToggleIssueFavorite') },
    { keys: 'Shift+S', action: t('ui.shortcutToggleIssueSubscription') },
    { keys: 'Shift+C', action: t('ui.shortcutAddIssueToCycle') },
    { keys: 'Shift+D', action: t('ui.shortcutSetIssueDueDate') },
    { keys: 'Ctrl/⌘+Shift+D', action: t('ui.shortcutClearIssueDueDate') },
    { keys: 'Shift+H', action: t('ui.shortcutSetIssueReminder') },
    { keys: 'Ctrl/⌘+Shift+I', action: t('ui.shortcutFocusIssueDescription') },
    { keys: 'Ctrl/⌘+M', action: t('ui.shortcutCommentOnIssue') },
    { keys: 'P, then S', action: t('ui.shortcutChangeProjectStatus') },
    { keys: 'P, then N', action: t('ui.shortcutChangeProjectInitiatives') },
    { keys: 'P, then A', action: t('ui.shortcutChangeProjectLead') },
    { keys: 'P, then L', action: t('ui.shortcutChangeProjectLabels') },
    { keys: 'Shift+H', action: t('ui.shortcutSetProjectReminder') },
    { keys: 'Ctrl/⌘+.', action: t('ui.shortcutCopyProjectID') },
    { keys: 'Ctrl/⌘+Shift+,', action: t('ui.shortcutCopyProjectURL') },
    { keys: "Ctrl/⌘+Shift+'", action: t('ui.shortcutCopyProjectTitle') },
    { keys: 'Ctrl/⌘+Alt+S', action: t('ui.shortcutSetProjectStartDate') },
    { keys: 'Ctrl/⌘+U', action: t('ui.shortcutOpenProjectUpdates') },
    { keys: 'Ctrl/⌘+U', action: t('ui.shortcutOpenInitiativeUpdates') },
    { keys: 'Ctrl/⌘+Alt+D', action: t('ui.shortcutSetInitiativeTargetDate') },
    { keys: 'N, then O', action: t('ui.shortcutChangeInitiativeOwner') },
    { keys: 'Alt+F', action: t('ui.shortcutToggleInitiativeFavorite') },
    { keys: 'Shift+H', action: t('ui.shortcutSetInitiativeReminder') },
    { keys: 'Ctrl/⌘+.', action: t('ui.shortcutCopyInitiativeID') },
    { keys: 'Ctrl/⌘+Shift+,', action: t('ui.shortcutCopyInitiativeURL') },
    { keys: "Ctrl/⌘+Shift+'", action: t('ui.shortcutCopyInitiativeTitle') },
    { keys: 'Ctrl/⌘+Shift+U', action: t('ui.shortcutWriteInitiativeUpdate') },
    { keys: 'Ctrl/⌘+Shift+O', action: t('ui.shortcutCreateSubIssue') },
    { keys: 'Ctrl/⌘+Shift+P', action: t('ui.shortcutSetParentIssue') },
    { keys: 'Ctrl/⌘+Shift+↑', action: t('ui.shortcutOpenParentIssue') },
    { keys: 'Ctrl/⌘+Shift+↓', action: t('ui.shortcutOpenSubIssue') },
    { keys: 'Ctrl/⌘+Shift+L', action: t('ui.shortcutToggleIssueResources') },
    { keys: 'Ctrl/⌘+Alt+L', action: t('ui.shortcutAddIssueLink') },
    { keys: 's', action: t('ui.shortcutSetStatus') },
    { keys: 'l', action: t('ui.shortcutOpenLabelsMenu') },
    { keys: 'Shift+E', action: t('ui.shortcutOpenEstimateMenu') },
    { keys: 'h', action: t('ui.shortcutSnoozeNotification') },
    { keys: 'u', action: t('ui.shortcutToggleInboxRead') },
    { keys: 'e / Backspace', action: t('ui.shortcutDeleteInboxNotification') },
    { keys: 'Shift+Backspace', action: t('ui.shortcutDeleteReadInbox') },
    { keys: 'Alt+U', action: t('inbox.markAllAsRead') },
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
