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
  IssueFilterChoices,
  IssueFilterCondition,
  IssueFilterField,
  IssueFilterGroup,
  IssueFilterNode,
} from '../issue-advanced-filter.ts';

function updateNodeAtPath(
  group: IssueFilterGroup,
  path: number[],
  update: (node: IssueFilterNode) => IssueFilterNode,
): IssueFilterGroup {
  if (path.length === 0) return update(group) as IssueFilterGroup;
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

function appendNode(group: IssueFilterGroup, path: number[], node: IssueFilterNode) {
  return updateNodeAtPath(group, path, (current) =>
    current.kind === 'group' ? { ...current, children: [...current.children, node] } : current,
  );
}

function removeNode(group: IssueFilterGroup, parentPath: number[], index: number) {
  return updateNodeAtPath(group, parentPath, (current) =>
    current.kind === 'group'
      ? { ...current, children: current.children.filter((_, childIndex) => childIndex !== index) }
      : current,
  );
}

export function AdvancedIssueFilterBuilder({
  group,
  choices,
  onChange,
}: {
  group: IssueFilterGroup;
  choices: IssueFilterChoices;
  onChange: (group: IssueFilterGroup) => void;
}) {
  const { t } = useTranslation();
  const fields: IssueFilterField[] = [
    'status',
    'assignee',
    'priority',
    'type',
    'estimate',
    'project',
    'cycle',
    'label',
    'title',
    'identifier',
  ];
  const fieldChoices = fields.map((field) => ({
    value: field,
    label:
      field === 'title' || field === 'identifier'
        ? t(`issueFilters.${field}`)
        : t(`field.${field}`),
  }));

  function renderGroup(current: IssueFilterGroup, path: number[], depth: number) {
    const groupNumber = path.length === 0 ? '1' : `1.${path.map((index) => index + 1).join('.')}`;
    return (
      <Stack
        key={path.join('-') || 'root'}
        gap="xs"
        p="xs"
        style={{
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 'var(--mantine-radius-sm)',
          marginInlineStart: depth > 0 ? 14 : 0,
        }}
        aria-label={t('issueFilters.group', { number: groupNumber })}
      >
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <SegmentedControl
            size="xs"
            aria-label={t('issueFilters.groupOperator', { number: groupNumber })}
            value={current.operator}
            data={[
              { label: t('issueFilters.matchAll'), value: 'and' },
              { label: t('issueFilters.matchAny'), value: 'or' },
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
              aria-label={t('issueFilters.deleteGroup')}
              title={t('issueFilters.deleteGroup')}
              onClick={() => onChange(removeNode(group, path.slice(0, -1), path[path.length - 1]!))}
            >
              <IconX size={14} aria-hidden="true" />
            </ActionIcon>
          ) : null}
        </Group>
        {current.children.map((child, index) => {
          const childPath = [...path, index];
          if (child.kind === 'group') return renderGroup(child, childPath, depth + 1);
          const labels = {
            field: t('issueFilters.conditionField', { group: groupNumber, number: index + 1 }),
            operator: t('issueFilters.conditionOperator', {
              group: groupNumber,
              number: index + 1,
            }),
            value: t('issueFilters.conditionValue', { group: groupNumber, number: index + 1 }),
          };
          const rule = child as IssueFilterCondition;
          const textField = child.field === 'title' || child.field === 'identifier';
          const operators = textField
            ? [
                { value: 'contains', label: t('issueFilters.contains') },
                { value: 'doesNotContain', label: t('issueFilters.doesNotContain') },
              ]
            : [
                { value: 'is', label: t('issueFilters.is') },
                { value: 'isNot', label: t('issueFilters.isNot') },
              ];
          return (
            <Group key={childPath.join('-')} gap={4} wrap="nowrap" align="center">
              <Select
                aria-label={labels.field}
                placeholder={t('issueFilters.chooseField')}
                value={child.field ?? null}
                onChange={(value) =>
                  onChange(
                    updateNodeAtPath(group, childPath, (node) =>
                      node.kind === 'condition'
                        ? {
                            ...node,
                            field: (value as IssueFilterField | null) ?? undefined,
                            operator:
                              value === 'title' || value === 'identifier' ? 'contains' : 'is',
                            value: undefined,
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
                    aria-label={labels.operator}
                    value={rule.operator ?? operators[0]!.value}
                    onChange={(value) =>
                      onChange(
                        updateNodeAtPath(group, childPath, (node) =>
                          node.kind === 'condition'
                            ? {
                                ...node,
                                operator: (value as IssueFilterCondition['operator']) ?? 'is',
                              }
                            : node,
                        ),
                      )
                    }
                    data={operators}
                    size="xs"
                    w={132}
                    allowDeselect={false}
                    comboboxProps={{ withinPortal: false }}
                  />
                  {textField ? (
                    <TextInput
                      aria-label={labels.value}
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
                      style={{ flex: 1, minWidth: 100 }}
                    />
                  ) : (
                    <Select
                      aria-label={labels.value}
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
                      data={choices[child.field] ?? []}
                      searchable
                      size="xs"
                      style={{ flex: 1, minWidth: 100 }}
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
                aria-label={t('issueFilters.removeCondition')}
                title={t('issueFilters.removeCondition')}
                onClick={() => onChange(removeNode(group, path, index))}
              >
                <IconX size={14} aria-hidden="true" />
              </ActionIcon>
            </Group>
          );
        })}
        <Group gap="xs" wrap="wrap">
          <Button
            type="button"
            variant="subtle"
            size="compact-xs"
            leftSection={<IconPlus size={13} aria-hidden="true" />}
            onClick={() => onChange(appendNode(group, path, { kind: 'condition' }))}
          >
            {t('issueFilters.addCondition')}
          </Button>
          <Button
            type="button"
            variant="subtle"
            size="compact-xs"
            leftSection={<IconPlus size={13} aria-hidden="true" />}
            onClick={() =>
              onChange(appendNode(group, path, { kind: 'group', operator: 'and', children: [] }))
            }
          >
            {t('issueFilters.addGroup')}
          </Button>
        </Group>
      </Stack>
    );
  }

  return renderGroup(group, [], 0);
}
