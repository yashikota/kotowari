import { Box, Button, Group, Popover, SimpleGrid, Text, Textarea, TextInput } from '@mantine/core';
import { IconChevronLeft } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { IssueBoard, IssueList } from '../components/IssueList.tsx';
import { IssueFilters } from '../components/IssueFilters.tsx';
import { ViewIcon } from '../components/ViewIcon.tsx';
import { EmptyState } from '../mantine-ui.tsx';
import { useFocusWhen } from '../focus.ts';
import { useViewBuilderPresenter } from '../presenters/ViewBuilderPages.tsx';

export function ViewBuilderPageView({
  model,
  nameRef,
}: {
  model: ReturnType<typeof useViewBuilderPresenter>;
  nameRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
}) {
  const { t } = useTranslation();
  switch (model._view) {
    case 0:
      return (
        <Box
          h="100%"
          style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
        >
          <Group
            component="header"
            px="md"
            py="xs"
            gap="sm"
            wrap="nowrap"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <Popover
              opened={model.iconPickerOpen}
              onChange={model.handlers.onIconPickerChange}
              position="bottom-start"
              shadow="md"
            >
              <Popover.Target>
                <Button
                  type="button"
                  variant="default"
                  px="xs"
                  aria-label={t('viewBuilder.chooseIcon')}
                  onClick={() => model.handlers.onIconPickerChange(!model.iconPickerOpen)}
                >
                  <ViewIcon name={model.icon} />
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <SimpleGrid cols={6} spacing={4} aria-label={t('viewBuilder.iconChoices')}>
                  {model.iconOptions.map((name) => (
                    <Button
                      key={name}
                      type="button"
                      variant={model.icon === name ? 'light' : 'subtle'}
                      color="gray"
                      aria-label={t(`viewBuilder.icons.${name}`)}
                      aria-pressed={model.icon === name}
                      onClick={() => {
                        model.handlers.onIconChange(name);
                        model.handlers.onIconPickerChange(false);
                      }}
                    >
                      <ViewIcon name={name} />
                    </Button>
                  ))}
                </SimpleGrid>
              </Popover.Dropdown>
            </Popover>
            <TextInput
              ref={nameRef}
              data-autofocus
              aria-label={t('viewBuilder.name')}
              value={model.name}
              maxLength={100}
              onChange={model.handlers.onNameChange}
              onKeyDown={model.handlers.onNameKeyDown}
              styles={{
                input: {
                  height: 36,
                  minHeight: 36,
                  borderColor: 'transparent',
                  background: 'transparent',
                  fontSize: 20,
                  fontWeight: 600,
                },
              }}
              style={{ flex: 1, minWidth: 140 }}
            />
            <Button type="button" variant="default" onClick={model.handlers.onCancel}>
              <IconChevronLeft size={14} aria-hidden="true" />
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={model.handlers.onCreate}
              loading={model.saving}
              disabled={!model.name.trim()}
            >
              {t('viewBuilder.createView')}
            </Button>
          </Group>
          <Textarea
            aria-label={t('viewBuilder.description')}
            placeholder={t('viewBuilder.descriptionPlaceholder')}
            value={model.description}
            maxLength={1000}
            autosize
            minRows={1}
            maxRows={3}
            onChange={model.handlers.onDescriptionChange}
            px="md"
            py={6}
            styles={{
              input: { borderColor: 'transparent', background: 'transparent', resize: 'none' },
            }}
          />
          <IssueFilters
            search={model.search}
            projects={model.data.projects}
            cycles={model.data.cycles}
            labels={model.data.labels}
            onChange={model.handlers.onSearchChange}
            groupBy={model.groupBy}
            onGroupBy={model.handlers.onGroupByChange}
            layout={model.display}
            onLayout={model.handlers.onDisplayChange}
            orderBy={model.orderBy}
            onOrderBy={model.handlers.onOrderByChange}
            subGroupBy={model.subGroupBy}
            onSubGroupBy={model.handlers.onSubGroupByChange}
            direction={model.direction}
            onDirection={model.handlers.onDirectionChange}
            completedIssues={model.completedIssues}
            onCompletedIssues={model.handlers.onCompletedIssuesChange}
            showSubIssues={model.showSubIssues}
            onShowSubIssues={model.handlers.onShowSubIssuesChange}
            nestedSubIssues={model.nestedSubIssues}
            onNestedSubIssues={model.handlers.onNestedSubIssuesChange}
            showEmptyGroups={model.showEmptyGroups}
            onShowEmptyGroups={model.handlers.onShowEmptyGroupsChange}
            displayProperties={model.displayProperties}
            onDisplayPropertyToggle={model.handlers.onDisplayPropertyToggle}
          />
          {model.error ? (
            <Text role="alert" c="red" size="sm" px="md" py={6}>
              {model.error}
            </Text>
          ) : null}
          <Box
            aria-label={t('viewBuilder.preview')}
            aria-hidden="true"
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'none',
            }}
          >
            {model.issues.length === 0 ? (
              <EmptyState>{t('ui.noIssuesMatchView')}</EmptyState>
            ) : model.display === 'board' ? (
              <Box p="md" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <IssueBoard
                  issues={model.issues}
                  onOpen={() => undefined}
                  onMove={() => undefined}
                  orderBy={model.orderBy}
                  direction={model.direction}
                  showSubIssues={model.showSubIssues}
                />
              </Box>
            ) : (
              <IssueList
                issues={model.issues}
                selectedId={null}
                onSelect={() => undefined}
                groupBy={model.groupBy}
                subGroupBy={model.subGroupBy}
                orderBy={model.orderBy}
                direction={model.direction}
                showSubIssues={model.showSubIssues}
                showEmptyGroups={model.showEmptyGroups}
                displayProperties={model.displayProperties}
              />
            )}
          </Box>
        </Box>
      );
  }
}

export function ViewBuilderPage() {
  return (
    <PresenterScope name="ViewBuilderPage">
      <ViewBuilderPageBinding />
    </PresenterScope>
  );
}

function ViewBuilderPageBinding() {
  const model = useViewBuilderPresenter();
  const handlers = useActions(model.handlers);
  const nameRef = useFocusWhen<HTMLInputElement>(true, []);
  return <ViewBuilderPageView model={{ ...model, handlers } as typeof model} nameRef={nameRef} />;
}
