import { Link } from '@tanstack/react-router';
import {
  Alert,
  Button,
  Grid,
  Group,
  NativeSelect,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import { formatActivity } from '../activity.ts';
import { LabelChip, MetaBadge } from '../mantine-ui.tsx';
import { formatStamp } from '../time.ts';
import { ISSUE_STATUSES } from '../types.ts';
import { issueStatusLabel, priorityLabel } from '../i18n/labels.ts';
import { AIPanel } from './AIPanel.tsx';
import { DocumentEditor } from './DocumentEditor.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

export function IssueDetailView({ model }: { model: ReturnType<typeof useIssueDetailPresenter> }) {
  useTranslation();

  switch (model._view) {
    case 0: {
      const { error } = model;
      return <Alert color="red">{error}</Alert>;
    }
    case 1: {
      return (
        <Text c="dimmed" ta="center" py="xl">
          Loading…
        </Text>
      );
    }
    case 2: {
      const {
        identifier,
        issue,
        comments,
        activities,
        projects,
        cycles,
        labels,
        draft,
        subTitle,
        labelName,
        focusSub,
        focusLabel,
        focusNote,
        adrPick,
        timeZone,
        copied,
        due,
        selectedLabelIds,
        children,
        parentOptions,
        linkedAdrs,
        unlinkedAdrs,
        handlers,
      } = model;
      const autofocusTitle = useAutofocusTarget('title');
      const titleRef = useFocusWhen<HTMLInputElement>(autofocusTitle, [identifier]);
      const subRef = useFocusWhen<HTMLTextAreaElement>(focusSub > 0, [focusSub]);
      const labelRef = useFocusWhen<HTMLTextAreaElement>(focusLabel > 0, [focusLabel]);
      const noteRef = useFocusWhen<HTMLTextAreaElement>(focusNote > 0, [focusNote]);
      return (
        <Stack gap="lg">
          <Group justify="space-between" wrap="wrap">
            <Group gap="sm">
              <Button
                type="button"
                variant="subtle"
                aria-label="Copy identifier"
                onClick={handlers.Copy_identifier_onClick0}
              >
                {copied ? 'Copied' : issue.identifier}
              </Button>
              {issue.parentIdentifier ? (
                <Button type="button" variant="subtle" onClick={handlers.onClick1}>
                  {issue.parentIdentifier}
                </Button>
              ) : null}
              <Text c="dimmed" size="sm">
                {formatStamp(issue.updatedAt, timeZone)}
              </Text>
            </Group>
            <Button type="button" variant="subtle" color="red" onClick={handlers.onClick2}>
              Delete
            </Button>
          </Group>

          <TextInput
            ref={titleRef}
            aria-label="Issue title"
            value={issue.title}
            onChange={handlers.Issue_title_onChange3}
            onBlur={handlers.Issue_title_onBlur4}
            size="xl"
            variant="unstyled"
          />

          <Grid>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <NativeSelect
                label="Status"
                aria-label="Status"
                value={issue.status}
                onChange={handlers.Status_onChange5}
                data={ISSUE_STATUSES.map((s) => ({ value: s, label: issueStatusLabel(s) }))}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <NativeSelect
                label="Priority"
                aria-label="Priority"
                value={String(issue.priority)}
                onChange={handlers.Priority_onChange6}
                data={[0, 1, 2, 3, 4].map((i) => ({ value: String(i), label: priorityLabel(i) }))}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <NativeSelect
                label="Project"
                aria-label="Project"
                value={issue.projectId != null ? String(issue.projectId) : ''}
                onChange={handlers.Project_onChange7}
                data={[
                  { value: '', label: 'No project' },
                  ...projects.map((p) => ({ value: String(p.id), label: p.name })),
                ]}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <NativeSelect
                label="Cycle"
                aria-label="Cycle"
                value={issue.cycleId != null ? String(issue.cycleId) : ''}
                onChange={handlers.Cycle_onChange8}
                data={[
                  { value: '', label: 'No cycle' },
                  ...cycles.map((c) => ({ value: String(c.id), label: `Cycle ${c.number}` })),
                ]}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <NativeSelect
                label="Parent"
                aria-label="Parent"
                value={issue.parentId != null ? String(issue.parentId) : ''}
                onChange={handlers.Parent_onChange9}
                data={[
                  { value: '', label: 'No parent' },
                  ...parentOptions.map((p) => ({
                    value: String(p.id),
                    label: `${p.identifier} ${p.title}`,
                  })),
                ]}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <TextInput
                type="date"
                label="Due"
                aria-label="Due date"
                value={due}
                onChange={handlers.Due_date_onChange10}
              />
            </Grid.Col>
          </Grid>

          <Stack gap="xs">
            <Text c="dimmed" size="sm">
              Labels
            </Text>
            <Group gap="xs" role="group" aria-label="Labels">
              {labels.map((l) => {
                const on = selectedLabelIds.has(l.id);
                return (
                  <LabelChip
                    key={l.id}
                    name={l.name}
                    color={l.color}
                    selected={on}
                    onClick={() => handlers.onClick11(on, l)}
                  />
                );
              })}
            </Group>
            <Textarea
              ref={labelRef}
              rows={2}
              aria-label="New label"
              placeholder="New label"
              value={labelName}
              onChange={handlers.New_label_onChange12}
              onKeyDown={handlers.New_label_onKeyDown13}
            />
          </Stack>

          <Stack gap="xs">
            <Text c="dimmed" size="sm">
              ADRs
            </Text>
            {linkedAdrs.length === 0 ? (
              <Text c="dimmed" size="sm">
                No linked decisions.
              </Text>
            ) : (
              <Stack gap="xs" role="list">
                {linkedAdrs.map((a) => (
                  <Group key={a.identifier} justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                      <Link to="/adrs/$identifier" params={{ identifier: a.identifier }}>
                        {a.identifier}
                      </Link>
                      <Text>{a.title}</Text>
                      <MetaBadge>{a.status}</MetaBadge>
                    </Group>
                    <Button
                      type="button"
                      variant="subtle"
                      aria-label={`Unlink ${a.identifier}`}
                      onClick={() => handlers.onClick14(a)}
                    >
                      Unlink
                    </Button>
                  </Group>
                ))}
              </Stack>
            )}
            <Group align="flex-end" wrap="wrap">
              <NativeSelect
                aria-label="Link ADR"
                value={adrPick}
                onChange={handlers.Link_ADR_onChange15}
                data={[
                  { value: '', label: 'Link an ADR' },
                  ...unlinkedAdrs.map((a) => ({
                    value: String(a.number),
                    label: `${a.identifier} ${a.title}`,
                  })),
                ]}
                style={{ flex: 1, minWidth: 200 }}
              />
              <Button
                type="button"
                variant="subtle"
                disabled={!adrPick}
                onClick={handlers.onClick16}
              >
                Link
              </Button>
              <Button type="button" variant="subtle" onClick={handlers.onClick17}>
                New ADR
              </Button>
            </Group>
          </Stack>

          <AIPanel kind="issues" id={identifier} />
          <DocumentEditor documentKey={`issues/${identifier}/body`} />

          <Stack gap="xs">
            <Text c="dimmed" size="sm">
              Sub-issues
            </Text>
            {children.length === 0 ? (
              <Text c="dimmed" size="sm">
                Break this into smaller work.
              </Text>
            ) : (
              <Stack gap="xs">
                {children.map((c) => (
                  <Button
                    type="button"
                    variant="subtle"
                    key={c.identifier}
                    onClick={() => handlers.onClick18(c)}
                    fullWidth
                    styles={{ inner: { justifyContent: 'flex-start' } }}
                  >
                    <Group justify="space-between" wrap="nowrap" w="100%">
                      <Group gap="sm" wrap="nowrap">
                        <Text fw={500}>{c.identifier}</Text>
                        <Text>{c.title}</Text>
                      </Group>
                      <MetaBadge>{issueStatusLabel(c.status)}</MetaBadge>
                    </Group>
                  </Button>
                ))}
              </Stack>
            )}
            <Textarea
              ref={subRef}
              rows={2}
              aria-label="New sub-issue"
              placeholder="Add sub-issue"
              value={subTitle}
              onChange={handlers.New_sub_issue_onChange19}
              onKeyDown={handlers.New_sub_issue_onKeyDown20}
            />
          </Stack>

          <Stack gap="xs">
            <Text c="dimmed" size="sm">
              Notes
            </Text>
            <Stack gap="sm">
              {comments.map((c) => (
                <Stack key={c.id} gap={4}>
                  <Text c="dimmed" size="sm">
                    {formatStamp(c.createdAt, timeZone)}
                  </Text>
                  <Text>{c.body}</Text>
                </Stack>
              ))}
              <Textarea
                ref={noteRef}
                rows={3}
                aria-label="New note"
                placeholder="Note"
                value={draft}
                onChange={handlers.New_note_onChange21}
                onKeyDown={handlers.New_note_onKeyDown22}
              />
              <Text c="dimmed" size="sm">
                Mod+Enter to save
              </Text>
            </Stack>
          </Stack>

          <Stack gap="xs">
            <Text c="dimmed" size="sm">
              Activity
            </Text>
            <Stack gap="sm">
              {activities.map((a) => (
                <Text key={a.id}>
                  {formatActivity(a.action, a.payload)}{' '}
                  <Text span c="dimmed" size="sm">
                    {formatStamp(a.createdAt, timeZone)}
                  </Text>
                </Text>
              ))}
            </Stack>
          </Stack>
        </Stack>
      );
    }
  }
}

export function IssueDetail(props: Parameters<typeof useIssueDetailPresenter>[0]) {
  return (
    <PresenterScope name="IssueDetail">
      <IssueDetailBinding {...props} />
    </PresenterScope>
  );
}

function IssueDetailBinding(props: Parameters<typeof useIssueDetailPresenter>[0]) {
  const model = useIssueDetailPresenter(props);
  const handlers = useActions(model.handlers);
  return <IssueDetailView model={{ ...model, handlers } as typeof model} />;
}
