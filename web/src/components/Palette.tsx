import { Box, Group, Modal, ScrollArea, Text, TextInput, UnstyledButton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Shortcut } from '../mantine-ui.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useFocusWhen } from '../focus.ts';
import { usePalettePresenter } from '../presenters/Palette.tsx';

export function PaletteView({
  model,
  searchRef,
}: {
  model: ReturnType<typeof usePalettePresenter>;
  searchRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const { query, commands, active, handlers } = model;
      return (
        <Modal
          opened
          onClose={handlers.onClick0}
          title={t('ui.commandPalette')}
          aria-label={t('ui.commandPalette')}
          centered
          size="lg"
          withCloseButton={false}
          autoFocus={false}
        >
          <Box onClick={handlers.Command_palette_onClick1}>
            <TextInput
              ref={searchRef}
              aria-label={t('ui.commandSearch')}
              placeholder={t('ui.typeCommandOrSearch')}
              value={query}
              onChange={handlers.Command_search_onChange2}
              onKeyDown={handlers.Command_search_onKeyDown3}
              mb="sm"
            />
            <ScrollArea h={320} scrollbars="y">
              <Box role="listbox">
                {commands.map((c, i) => (
                  <UnstyledButton
                    key={c.id + i}
                    role="option"
                    aria-selected={i === active}
                    w="100%"
                    px="sm"
                    py="xs"
                    bg={i === active ? 'var(--mantine-color-gray-light)' : undefined}
                    onMouseEnter={() => handlers.onMouseEnter4(i)}
                    onClick={() => handlers.onClick5(c)}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm">{c.title}</Text>
                      {c.hint ? <Shortcut>{c.hint}</Shortcut> : null}
                    </Group>
                  </UnstyledButton>
                ))}
              </Box>
            </ScrollArea>
          </Box>
        </Modal>
      );
    }
  }
}

export function Palette(props: Parameters<typeof usePalettePresenter>[0]) {
  return (
    <PresenterScope name="Palette">
      <PaletteBinding {...props} />
    </PresenterScope>
  );
}

function PaletteBinding(props: Parameters<typeof usePalettePresenter>[0]) {
  const model = usePalettePresenter(props);
  const handlers = useActions(model.handlers);
  const searchRef = useFocusWhen<HTMLInputElement>(true);
  return <PaletteView model={{ ...model, handlers } as typeof model} searchRef={searchRef} />;
}
