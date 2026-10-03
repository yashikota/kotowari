import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useRef, type ReactNode } from 'react';
import { useActionFocusReturn, useFocusWhen } from '../focus.ts';
import { SaveFeedback } from '../design-system/SaveFeedback.tsx';
import type { useWorkflowEditor } from '../presenters/useWorkflowEditor.ts';
import styles from './WorkflowSettingsEditor.module.css';

type CategoryGroup<Category extends string> = {
  id: string;
  category: Category;
  label: string;
  icon?: ReactNode;
  statusId?: string;
  excludedStatusId?: string;
};

type Labels = {
  name: (name: string) => string;
  description: (name: string) => string;
  remove: (name: string) => string;
  newName: string;
  newDescription: string;
  category: string;
  add: string;
  save: string;
  create: string;
  cancel: string;
  saving: string;
  saved: string;
  failed: string;
  retry: string;
  loading: string;
  loadFailed: string;
  retryLoad: string;
};

export function WorkflowSettingsEditor<Category extends string>({
  id,
  title,
  description,
  data,
  handlers,
  groups,
  protectedIds,
  creationPlacement,
  labels,
}: {
  id: string;
  title: string;
  description: string;
  data: ReturnType<typeof useWorkflowEditor<Category>>['data'] & {
    loadState: { ready: boolean; loading: boolean; error: string };
  };
  handlers: ReturnType<typeof useWorkflowEditor<Category>>['handlers'] & {
    retryLoad: () => Promise<void>;
  };
  groups: CategoryGroup<Category>[];
  protectedIds: readonly string[];
  creationPlacement: 'footer' | 'category';
  labels: Labels;
}) {
  const section = useRef<HTMLDivElement>(null);
  const createName = useFocusWhen<HTMLInputElement>(
    Boolean(data.nameError) || (creationPlacement === 'category' && data.formOpen),
    [data.category, data.nameError],
  );
  const focusCreationTrigger = useRef(false);
  const focusAnchor = useRef<HTMLElement | null>(null);
  const preferredStatus = useRef<string | null>(null);
  const addingFrom = useRef<Set<string> | null>(null);
  const runWithFocus = useActionFocusReturn(
    data.saving || (!data.loadState.ready && data.loadState.loading),
    () => {
      const root = section.current;
      if (!root) return null;
      const retry = root.querySelector<HTMLButtonElement>('[role="alert"] button:not(:disabled)');
      if (retry) return retry;
      const added =
        addingFrom.current && data.statuses.find((status) => !addingFrom.current?.has(status.id));
      const statusId = added?.id ?? preferredStatus.current;
      if (statusId) {
        const input = root.querySelector<HTMLInputElement>(
          `[data-workflow-status-id="${CSS.escape(statusId)}"] input`,
        );
        if (input && !input.matches(':disabled')) return input;
      }
      if (focusAnchor.current?.isConnected && !focusAnchor.current.matches(':disabled'))
        return focusAnchor.current;
      const create = root.querySelector<HTMLButtonElement>(
        `[data-workflow-create-category="${CSS.escape(data.category)}"]`,
      );
      return (
        (focusCreationTrigger.current ? create : null) ??
        root.querySelector<HTMLInputElement>('input:not(:disabled)')
      );
    },
  );
  const run = (action: () => unknown) => {
    focusAnchor.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return runWithFocus(action);
  };
  const createForm = (showCategory: boolean) => (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        addingFrom.current = new Set(data.statuses.map((status) => status.id));
        const result = run(() => handlers.add(event));
        if (!data.name.trim()) createName.current?.focus();
        return result;
      }}
    >
      <Stack gap="sm">
        <Box className={styles.fields}>
          <TextInput
            classNames={{ label: styles.label }}
            label={labels.newName}
            value={data.name}
            maxLength={48}
            error={data.nameError || undefined}
            ref={createName}
            data-workflow-create-name
            onChange={(event) => handlers.changeName(event.target.value)}
          />
          <Textarea
            classNames={{ label: styles.label }}
            label={labels.newDescription}
            value={data.description}
            maxLength={200}
            autosize
            minRows={1}
            maxRows={3}
            onChange={(event) => handlers.changeDescription(event.target.value)}
          />
          {showCategory ? (
            <Select
              classNames={{ label: styles.label }}
              label={labels.category}
              value={data.category}
              onChange={(value) => {
                const group = groups.find((entry) => entry.category === value && !entry.statusId);
                if (group) handlers.changeCategory(group.category);
              }}
              data={groups
                .filter((group) => !group.statusId)
                .map((group) => ({ value: group.category, label: group.label }))}
              allowDeselect={false}
            />
          ) : null}
        </Box>
        <Group gap="sm" wrap="wrap">
          <Button type="submit" variant="default">
            {labels.add}
          </Button>
          {!showCategory ? (
            <Button
              type="button"
              variant="subtle"
              onClick={() => {
                addingFrom.current = null;
                preferredStatus.current = null;
                focusCreationTrigger.current = true;
                return run(handlers.close);
              }}
            >
              {labels.cancel}
            </Button>
          ) : null}
        </Group>
      </Stack>
    </Box>
  );
  return (
    <Stack ref={section} id={id} tabIndex={-1} gap="md" component="section" aria-label={title}>
      <Title order={4}>{title}</Title>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
      {!data.loadState.ready && data.loadState.loading ? (
        <Text role="status" size="sm" c="dimmed">
          {labels.loading}
        </Text>
      ) : null}
      {data.loadState.error ? (
        <Alert role="alert" color="red" title={labels.loadFailed}>
          <Stack gap="xs">
            <Text size="sm">{data.loadState.error}</Text>
            <Button
              variant="default"
              size="xs"
              disabled={data.loadState.loading}
              onClick={() => runWithFocus(handlers.retryLoad)}
            >
              {labels.retryLoad}
            </Button>
          </Stack>
        </Alert>
      ) : null}
      <SaveFeedback
        saving={data.saving}
        saved={data.saved}
        error={data.error}
        savingLabel={labels.saving}
        savedLabel={labels.saved}
        failureLabel={labels.failed}
        retryLabel={labels.retry}
        onRetry={() => runWithFocus(handlers.retry)}
      />
      {data.loadState.ready ? (
        <Box
          component="fieldset"
          disabled={data.saving}
          aria-busy={data.saving}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          <Stack gap="lg">
            {groups.map((group) => {
              const statuses = data.statuses.filter(
                (status) =>
                  status.category === group.category &&
                  (group.statusId
                    ? status.id === group.statusId
                    : status.id !== group.excludedStatusId),
              );
              const formOpen =
                creationPlacement === 'category' &&
                data.formOpen &&
                data.category === group.category;
              return (
                <Stack key={group.id} component="section" aria-label={group.label} gap="sm">
                  <Group gap="xs">
                    {group.icon}
                    <Text size="sm" fw={600}>
                      {group.label}
                    </Text>
                  </Group>
                  {statuses.map((status, index) => (
                    <Box key={status.id} className={styles.row} data-workflow-status-id={status.id}>
                      <Box className={styles.fields}>
                        <TextInput
                          classNames={{ label: styles.label }}
                          label={labels.name(status.name)}
                          value={status.name}
                          maxLength={48}
                          onChange={(event) => {
                            preferredStatus.current = status.id;
                            handlers.editStatus(status.id, { name: event.target.value });
                          }}
                        />
                        <Textarea
                          classNames={{ label: styles.label }}
                          label={labels.description(status.name)}
                          value={status.description ?? ''}
                          maxLength={200}
                          autosize
                          minRows={1}
                          maxRows={3}
                          onChange={(event) => {
                            preferredStatus.current = status.id;
                            handlers.editStatus(status.id, { description: event.target.value });
                          }}
                        />
                      </Box>
                      {!protectedIds.includes(status.id) ? (
                        <ActionIcon
                          type="button"
                          variant="subtle"
                          color="red"
                          size="lg"
                          className={styles.remove}
                          aria-label={labels.remove(status.name)}
                          onClick={() => {
                            addingFrom.current = null;
                            preferredStatus.current =
                              statuses[index + 1]?.id ?? statuses[index - 1]?.id ?? null;
                            return run(() => handlers.remove(status.id));
                          }}
                        >
                          <IconTrash size={16} aria-hidden />
                        </ActionIcon>
                      ) : null}
                    </Box>
                  ))}
                  {creationPlacement === 'category' ? (
                    formOpen ? (
                      createForm(false)
                    ) : (
                      <Group>
                        <Button
                          type="button"
                          variant="subtle"
                          data-workflow-create-category={group.category}
                          onClick={() => {
                            addingFrom.current = null;
                            preferredStatus.current = null;
                            focusCreationTrigger.current = false;
                            handlers.open(group.category);
                          }}
                        >
                          {labels.create}
                        </Button>
                      </Group>
                    )
                  ) : null}
                </Stack>
              );
            })}
            {creationPlacement === 'footer' ? createForm(true) : null}
            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                addingFrom.current = null;
                return run(() => handlers.save(event));
              }}
            >
              <Button type="submit" disabled={!data.dirty}>
                {labels.save}
              </Button>
            </Box>
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );
}
