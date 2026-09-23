import { Link } from '@tanstack/react-router';
import {
  Alert,
  Box,
  Button,
  Grid,
  Group,
  NativeSelect,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import { formatActivity } from '../activity.ts';
import { MetaBadge, Section } from '../mantine-ui.tsx';
import { formatStamp } from '../time.ts';
import { issueStatusLabel } from '../i18n/labels.ts';
import { AIPanel } from './AIPanel.tsx';
import { DocumentEditor } from './DocumentEditor.tsx';
import { IssuePropertiesPanel } from './IssuePropertiesPanel.tsx';

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

export function IssueDetailView({
  model,
  titleRef,
  subRef,
  noteRef,
}: {
  model: ReturnType<typeof useIssueDetailPresenter>;
  titleRef: ReturnType<typeof useFocusWhen<HTMLInputElement>>;
  subRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
  noteRef: ReturnType<typeof useFocusWhen<HTMLTextAreaElement>>;
}) {
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
        draft,
        subTitle,
        adrPick,
        timeZone,
        copied,
        children,
        linkedAdrs,
        unlinkedAdrs,
        handlers,
      } = model;
      return (
        <Box maw={1120} mx="auto" px={{ base: 'sm', md: 'xl' }} pb="xl">
          <Group
            justify="space-between"
            wrap="wrap"
            mih={42}
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <Group gap="sm">
              <Link
                to="/issues"
                aria-label="Back to issues"
                style={{
                  color: 'var(--mantine-color-dimmed)',
                  fontSize: 'var(--mantine-font-size-xs)',
                }}
              >
                Issues
              </Link>
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

          <Grid gap="xl" mt="md">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Stack gap="lg">
                <TextInput
                  ref={titleRef}
                  aria-label="Issue title"
                  value={issue.title}
                  onChange={handlers.Issue_title_onChange3}
                  onBlur={handlers.Issue_title_onBlur4}
                  variant="unstyled"
                  styles={{
                    input: {
                      height: 'auto',
                      minHeight: 0,
                      padding: 0,
                      color: 'var(--mantine-color-text)',
                      fontSize: 'var(--mantine-h1-font-size)',
                      fontWeight: 600,
                      lineHeight: 1.3,
                    },
                  }}
                />

                <DocumentEditor documentKey={`issues/${identifier}/body`} inline />

                <Section title="ADRs">
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
                </Section>

                <Box pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                  <AIPanel kind="issues" id={identifier} />
                </Box>

                <Section title="Sub-issues">
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
                </Section>

                <Section title="Notes">
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
                </Section>

                <Section title="Activity">
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
                </Section>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <IssuePropertiesPanel model={model} />
            </Grid.Col>
          </Grid>
        </Box>
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
  const autofocusTitle = useAutofocusTarget('title');
  const identifier = model._view === 2 ? model.identifier : '';
  const focusSub = model._view === 2 ? model.focusSub : 0;
  const focusNote = model._view === 2 ? model.focusNote : 0;
  const titleRef = useFocusWhen<HTMLInputElement>(autofocusTitle && model._view === 2, [
    identifier,
  ]);
  const subRef = useFocusWhen<HTMLTextAreaElement>(focusSub > 0, [focusSub]);
  const noteRef = useFocusWhen<HTMLTextAreaElement>(focusNote > 0, [focusNote]);
  return (
    <IssueDetailView
      model={{ ...model, handlers } as typeof model}
      titleRef={titleRef}
      subRef={subRef}
      noteRef={noteRef}
    />
  );
}
