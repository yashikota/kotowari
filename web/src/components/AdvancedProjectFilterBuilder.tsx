import {
  ActionIcon,
  Button,
  Group,
  SegmentedControl,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type {
  ProjectFilterCondition,
  ProjectFilterField,
  ProjectFilterGroup,
  ProjectFilterNode,
} from '../project-views.ts';

type FilterChoice = { value: string; label: string };
type FilterChoices = Partial<Record<ProjectFilterField, FilterChoice[]>>;

function updateNodeAtPath(
  group: ProjectFilterGroup,
  path: number[],
  update: (node: ProjectFilterNode) => ProjectFilterNode,
): ProjectFilterGroup {
  if (path.length === 0) return update(group) as ProjectFilterGroup;
  const [index, ...rest] = path;
  const child = group.children[index];
  if (!child) return group;
  const next =
    child.kind === 'group'
      ? updateNodeAtPath(child, rest, update)
      : rest.length === 0
        ? update(child)
        : child;
  const children = [...group.children];
  children[index] = next;
  return { ...group, children };
}

function appendNode(
  group: ProjectFilterGroup,
  path: number[],
  node: ProjectFilterNode,
): ProjectFilterGroup {
  return updateNodeAtPath(group, path, (current) =>
    current.kind === 'group' ? { ...current, children: [...current.children, node] } : current,
  );
}

function removeNode(
  group: ProjectFilterGroup,
  parentPath: number[],
  index: number,
): ProjectFilterGroup {
  return updateNodeAtPath(group, parentPath, (current) =>
    current.kind === 'group'
      ? { ...current, children: current.children.filter((_, childIndex) => childIndex !== index) }
      : current,
  );
}

export function AdvancedProjectFilterBuilder({
  group,
  choices,
  onChange,
}: {
  group: ProjectFilterGroup;
  choices: FilterChoices;
  onChange: (group: ProjectFilterGroup) => void;
}) {
  const { t } = useTranslation();

  function renderGroup(current: ProjectFilterGroup, path: number[], depth: number) {
    const groupName = path.length === 0 ? 'root' : path.join('-');
    const groupNumber = path.length === 0 ? '1' : `1.${path.map((index) => index + 1).join('.')}`;
    return (
      <Stack
        key={groupName}
        gap="xs"
        p="xs"
        style={{
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 'var(--mantine-radius-sm)',
          marginInlineStart: depth > 0 ? 14 : 0,
        }}
        aria-label={t('projectList.filterGroup', { number: groupNumber })}
      >
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <SegmentedControl
            size="xs"
            aria-label={t('projectList.filterGroupOperator', { number: groupNumber })}
            value={current.operator}
            data={[
              { label: t('projectList.matchAll'), value: 'and' },
              { label: t('projectList.matchAny'), value: 'or' },
            ]}
            onChange={(value) =>
              onChange(
                updateNodeAtPath(group, path, (node) =>
                  node.kind === 'group'
                    ? { ...node, operator: value === 'or' ? 'or' : 'and' }
                    : node,
                ),
              )
            }
          />
          {depth > 0 ? (
            <ActionIcon
              type="button"
              size="sm"
              variant="subtle"
              color="gray"
              aria-label={t('projectList.deleteFilterGroup')}
              title={t('projectList.deleteFilterGroup')}
              onClick={() => onChange(removeNode(group, path.slice(0, -1), path[path.length - 1]!))}
            >
              <IconX size={14} aria-hidden="true" />
            </ActionIcon>
          ) : null}
        </Group>
        {current.children.map((child, index) => {
          const childPath = [...path, index];
          if (child.kind === 'group') return renderGroup(child, childPath, depth + 1);
          const fieldLabel = t('projectList.advancedFilterField', {
            group: groupNumber,
            number: index + 1,
          });
          const operatorLabel = t('projectList.advancedFilterOperator', {
            group: groupNumber,
            number: index + 1,
          });
          const valueLabel = t('projectList.advancedFilterValue', {
            group: groupNumber,
            number: index + 1,
          });
          const fieldChoices: FilterChoice[] = [
            { value: 'status', label: t('projectList.filterStatus') },
            { value: 'priority', label: t('projectList.filterPriority') },
            { value: 'health', label: t('projectList.filterCategoryHealth') },
            { value: 'label', label: t('projectList.filterLabels') },
            { value: 'milestone', label: t('projectList.filterCategoryMilestones') },
            { value: 'relation', label: t('projectList.filterCategoryRelations') },
            { value: 'initiative', label: t('projectList.filterInitiative') },
            { value: 'template', label: t('projectList.filterTemplate') },
            { value: 'project', label: t('projectList.filterSpecificProject') },
            { value: 'title', label: t('projectList.filterTitleSummary') },
            { value: 'createdDate', label: t('projectList.filterCreatedDate') },
            { value: 'updatedDate', label: t('projectList.filterUpdatedDate') },
            { value: 'startDate', label: t('projectList.orderStartDate') },
            { value: 'targetDate', label: t('projectList.orderTargetDate') },
            { value: 'completedDate', label: t('projectList.filterCompletedDate') },
          ];
          const valueChoices = child.field ? (choices[child.field] ?? []) : [];
          const rule = child as ProjectFilterCondition;
          const isDateField = Boolean(child.field?.endsWith('Date'));
          const operators =
            child.field === 'title'
              ? [
                  { value: 'contains', label: t('projectList.searchContains') },
                  { value: 'doesNotContain', label: t('projectList.searchDoesNotContain') },
                ]
              : [
                  { value: 'is', label: t('projectList.filterIs') },
                  { value: 'isNot', label: t('projectList.filterIsNot') },
                ];
          return (
            <Stack key={childPath.join('-')} gap={4}>
              <Group gap={4} wrap="nowrap" align="center">
                <Select
                  aria-label={fieldLabel}
                  placeholder={t('projectList.advancedChooseField')}
                  value={child.field ?? null}
                  onChange={(value) =>
                    onChange(
                      updateNodeAtPath(group, childPath, (node) =>
                        node.kind === 'condition'
                          ? {
                              ...node,
                              field: (value as ProjectFilterField | null) ?? undefined,
                              operator: 'is',
                              value: undefined,
                              dateFrom: undefined,
                              dateTo: undefined,
                            }
                          : node,
                      ),
                    )
                  }
                  data={fieldChoices}
                  searchable
                  size="xs"
                  w={142}
                  comboboxProps={{ withinPortal: false }}
                />
                {child.field ? (
                  <>
                    <Select
                      aria-label={operatorLabel}
                      value={rule.operator ?? operators[0]?.value ?? 'is'}
                      onChange={(value) =>
                        onChange(
                          updateNodeAtPath(group, childPath, (node) =>
                            node.kind === 'condition'
                              ? {
                                  ...node,
                                  operator: (value as ProjectFilterCondition['operator']) ?? 'is',
                                }
                              : node,
                          ),
                        )
                      }
                      data={operators}
                      size="xs"
                      w={92}
                      allowDeselect={false}
                      comboboxProps={{ withinPortal: false }}
                    />
                    {child.field === 'title' ? (
                      <TextInput
                        aria-label={valueLabel}
                        value={rule.value ?? ''}
                        onChange={(event) =>
                          onChange(
                            updateNodeAtPath(group, childPath, (node) =>
                              node.kind === 'condition'
                                ? { ...node, value: event.currentTarget.value }
                                : node,
                            ),
                          )
                        }
                        size="xs"
                        style={{ flex: 1 }}
                      />
                    ) : (
                      <Select
                        aria-label={valueLabel}
                        value={rule.value ?? null}
                        onChange={(value) =>
                          onChange(
                            updateNodeAtPath(group, childPath, (node) =>
                              node.kind === 'condition'
                                ? { ...node, value: value ?? undefined }
                                : node,
                            ),
                          )
                        }
                        data={valueChoices}
                        searchable
                        size="xs"
                        style={{ flex: 1 }}
                        comboboxProps={{ withinPortal: false }}
                      />
                    )}
                  </>
                ) : null}
                <ActionIcon
                  type="button"
                  size="sm"
                  variant="subtle"
                  color="gray"
                  aria-label={t('projectList.removeAdvancedFilterRule')}
                  title={t('projectList.removeAdvancedFilterRule')}
                  onClick={() => onChange(removeNode(group, path, index))}
                >
                  <IconX size={14} aria-hidden="true" />
                </ActionIcon>
              </Group>
              {isDateField && rule.value === 'custom' ? (
                <Group gap={4} wrap="nowrap" pl={4}>
                  <TextInput
                    aria-label={t('projectList.dateFrom')}
                    type="date"
                    value={rule.dateFrom ?? ''}
                    onChange={(event) =>
                      onChange(
                        updateNodeAtPath(group, childPath, (node) =>
                          node.kind === 'condition'
                            ? { ...node, dateFrom: event.currentTarget.value || undefined }
                            : node,
                        ),
                      )
                    }
                    size="xs"
                    style={{ flex: 1 }}
                  />
                  <TextInput
                    aria-label={t('projectList.dateTo')}
                    type="date"
                    value={rule.dateTo ?? ''}
                    onChange={(event) =>
                      onChange(
                        updateNodeAtPath(group, childPath, (node) =>
                          node.kind === 'condition'
                            ? { ...node, dateTo: event.currentTarget.value || undefined }
                            : node,
                        ),
                      )
                    }
                    size="xs"
                    style={{ flex: 1 }}
                  />
                </Group>
              ) : null}
            </Stack>
          );
        })}
        <Group gap="xs" wrap="wrap">
          <Button
            type="button"
            variant="subtle"
            size="compact-xs"
            leftSection={<IconPlus size={13} aria-hidden="true" />}
            onClick={() =>
              onChange(
                appendNode(group, path, {
                  kind: 'condition',
                }),
              )
            }
          >
            {t('projectList.addFilter')}
          </Button>
          <Button
            type="button"
            variant="subtle"
            size="compact-xs"
            leftSection={<IconPlus size={13} aria-hidden="true" />}
            onClick={() =>
              onChange(
                appendNode(group, path, {
                  kind: 'group',
                  operator: 'and',
                  children: [],
                }),
              )
            }
          >
            {t('projectList.addFilterGroup')}
          </Button>
        </Group>
      </Stack>
    );
  }

  return renderGroup(group, [], 0);
}
