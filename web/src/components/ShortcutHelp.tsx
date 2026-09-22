const ROWS: { keys: string; action: string }[] = [
  { keys: 'Mod+K', action: 'Command palette' },
  { keys: 'Ctrl/⌘+Enter', action: 'Send or create from a text field' },
  { keys: 'Enter (text)', action: 'Insert a line' },
  { keys: 'c', action: 'Create issue' },
  { keys: 'p', action: 'Create ADR' },
  { keys: '/', action: 'Find in the current list' },
  { keys: 'j / k', action: 'Move selection' },
  { keys: 'Enter', action: 'Open selected issue' },
  { keys: 's', action: 'Set status' },
  { keys: '1–7', action: 'Switch sidebar section' },
  { keys: '0', action: 'Config' },
  { keys: 'Shift+1–4', action: 'Set priority' },
  { keys: 'Esc', action: 'Close dialogs' },
  { keys: '?', action: 'This help' },
];

import type * as React from 'react';
import { Box, Button, Group, Modal, Table, Text } from '@mantine/core';
import { Shortcut } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useShortcutHelpPresenter } from '../presenters/ShortcutHelp.tsx';

export function ShortcutHelpView({
  model,
}: {
  model: ReturnType<typeof useShortcutHelpPresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { handlers } = model;
      return (
        <Modal
          opened
          onClose={() => handlers.onClick0({} as React.MouseEvent<HTMLDivElement>)}
          title="Keyboard shortcuts"
          aria-label="Keyboard shortcuts"
          centered
          size="md"
          withCloseButton={false}
        >
          <Box onClick={handlers.Keyboard_shortcuts_onClick1}>
            <Group justify="flex-end" mb="sm">
              <Button variant="subtle" size="compact-sm" onClick={handlers.onClick2}>
                Close
              </Button>
            </Group>
            <Table>
              <Table.Tbody>
                {ROWS.map((row) => (
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
