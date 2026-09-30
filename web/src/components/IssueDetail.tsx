import { ActionIcon, Alert, Box, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconPaperclip } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useRef } from 'react';
import { useAutofocusTarget, useFocusWhen } from '../focus.ts';
import { Section } from '../mantine-ui.tsx';
import { AIPanel } from './AIPanel.tsx';
import { DocumentEditor } from './DocumentEditor.tsx';
import { IssueDetailDialogs } from './IssueDetailDialogs.tsx';
import { IssueActivitySection } from './IssueActivitySection.tsx';
import { IssueADRsSection } from './IssueADRsSection.tsx';
import { IssueDetailHeader } from './IssueDetailHeader.tsx';
import { IssuePropertiesPanel } from './IssuePropertiesPanel.tsx';
import { IssueRelationsSection } from './IssueRelationsSection.tsx';
import { IssueResourcesSection } from './IssueResourcesSection.tsx';
import { IssueSubIssuesSection } from './IssueSubIssuesSection.tsx';
import layoutStyles from './IssueDetail.module.css';
import { IssueAttachmentList } from './IssueAttachmentList.tsx';
import { ReactionPicker, ReactionSummary } from './ReactionPicker.tsx';

import {
  PresenterScope,
  useActions,
  useIntent,
  useIntentHandler,
  useKeyboard,
} from '../application/Root.tsx';
import {
  issueCopyShortcutFromKeyboard,
  issueDetailShortcutFromKeyboard,
  issueLinkedCodeSequenceFromKeyboard,
  issueRelationSequenceFromKeyboard,
} from '../keymap.ts';
import type { IssueCopyShortcut } from '../keymap.ts';
import { useIssueDetailPresenter } from '../presenters/IssueDetail.tsx';

const ISSUE_COPY_SHORTCUT_INTENTS: Record<IssueCopyShortcut, string> = {
  'copy-id': 'Copy_id_onClick34',
  'copy-url': 'Copy_url_onClick35',
  'copy-title': 'Copy_title_onClick36',
  'copy-title-link': 'Copy_title_link_onClick37',
  'copy-everything': 'Copy_everything_onClick39',
  'copy-branch': 'Copy_branch_onClick40',
  'copy-prompt': 'Copy_prompt_onClick41',
};

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
  const { t } = useTranslation();
  switch (model._view) {
    case 0: {
      const { error } = model;
      return <Alert color="red">{error}</Alert>;
    }
    case 1: {
      return (
        <Text c="dimmed" ta="center" py="xl">
          {t('ui.loading')}
        </Text>
      );
    }
    case 2: {
      const {
        identifier,
        issue,
        reactionPickerTarget,
        reactionError,
        issueAttachmentError,
        issueAttachmentBusy,
        issueFilesInputRef,
        historyRequest,
        handlers,
      } = model;
      return (
        <Box maw={1180} mx="auto" px={{ base: 'sm', md: 'xs' }} pb="xl">
          <IssueDetailHeader model={model} />
          <Box
            className={layoutStyles.issueLayout}
            mt="md"
            inert={issue.archivedAt ? true : undefined}
            aria-disabled={issue.archivedAt ? true : undefined}
            style={issue.archivedAt ? { opacity: 0.72 } : undefined}
          >
            <Box className={layoutStyles.title}>
              <TextInput
                ref={titleRef}
                aria-label={t('ui.issueTitle')}
                value={issue.title}
                onChange={handlers.onTitleChange}
                onBlur={handlers.onTitleBlur}
                variant="unstyled"
                styles={{
                  input: {
                    height: 'auto',
                    minHeight: 0,
                    padding: 0,
                    color: 'var(--mantine-color-text)',
                    fontSize: '24px',
                    fontWeight: 600,
                    lineHeight: 1.3,
                  },
                }}
              />
            </Box>

            <Stack className={layoutStyles.content} gap="lg">
              <DocumentEditor
                documentKey={`issues/${identifier}/body`}
                inline
                historyRequest={historyRequest}
                focusRequest={model.descriptionFocusRequest}
                showHistoryButton={false}
              />
              <input
                ref={issueFilesInputRef}
                type="file"
                multiple
                aria-label={t('issueAttachments.chooseIssueFiles')}
                onChange={handlers.onIssueFilesChange}
                style={{ display: 'none' }}
              />
              <Stack gap="md">
                <Group gap={0} ml={-5} mt={12}>
                  <ReactionPicker
                    target="issue"
                    openedTarget={reactionPickerTarget}
                    buttonSize="md"
                    onOpenChange={handlers.onReactionPickerChange}
                    onSelect={handlers.onSelectReaction}
                  />
                  <ReactionSummary
                    reactions={issue.reactions ?? []}
                    onToggle={(emoji) => handlers.onToggleReaction('issue', emoji)}
                  />
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    color="gray"
                    size="md"
                    aria-label={t(
                      issueAttachmentBusy
                        ? 'issueAttachments.uploading'
                        : 'issueAttachments.addToIssue',
                    )}
                    disabled={issueAttachmentBusy}
                    onClick={handlers.onChooseIssueFiles}
                  >
                    <IconPaperclip size={15} aria-hidden="true" />
                  </ActionIcon>
                </Group>
                {issueAttachmentError ? (
                  <Alert color="red" role="alert">
                    {issueAttachmentError}
                  </Alert>
                ) : null}
                {reactionError ? (
                  <Alert color="red" role="alert">
                    {reactionError}
                  </Alert>
                ) : null}
                {issue.attachments?.length ? (
                  <Section title={t('issueAttachments.issueHeading')}>
                    <IssueAttachmentList
                      identifier={identifier}
                      attachments={issue.attachments}
                      onRemove={handlers.onRemoveIssueAttachment}
                    />
                  </Section>
                ) : null}

                <IssueSubIssuesSection model={model} subRef={subRef} />
              </Stack>

              <IssueRelationsSection model={model} />
              <IssueResourcesSection model={model} />
              <IssueActivitySection model={model} noteRef={noteRef} />
              <IssueADRsSection model={model} />
              <Box pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                <AIPanel
                  kind="issues"
                  id={identifier}
                  floating
                  contextLabel={issue.title}
                  promptPlaceholder={t('issueAssistant.placeholder')}
                  starterPrompts={[
                    {
                      label: t('issueAssistant.prompts.summary'),
                      prompt: t('issueAssistant.prompts.summaryPrompt'),
                    },
                    {
                      label: t('issueAssistant.prompts.plan'),
                      prompt: t('issueAssistant.prompts.planPrompt'),
                    },
                    {
                      label: t('issueAssistant.prompts.risks'),
                      prompt: t('issueAssistant.prompts.risksPrompt'),
                    },
                  ]}
                  onOpenFullPage={handlers.onOpenIssueAgentPage}
                />
              </Box>
            </Stack>
            <Box component="aside" className={layoutStyles.properties}>
              <IssuePropertiesPanel model={model} />
            </Box>
          </Box>
          <IssueDetailDialogs model={model} />
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
  const sendIntent = useIntent();
  const autofocusTitle = useAutofocusTarget('title');
  const identifier = model._view === 2 ? model.identifier : '';
  const focusSub = model._view === 2 ? model.focusSub : 0;
  const focusNote = model._view === 2 ? model.focusNote : 0;
  const titleRef = useFocusWhen<HTMLInputElement>(autofocusTitle && model._view === 2, [
    identifier,
  ]);
  const subRef = useFocusWhen<HTMLTextAreaElement>(focusSub > 0, [focusSub]);
  const noteRef = useFocusWhen<HTMLTextAreaElement>(focusNote > 0, [focusNote]);
  const linkedCodeSequenceSince = useRef<number | null>(null);
  const issueRelationSequenceSince = useRef<number | null>(null);
  useIntentHandler('keyboard.sequence.cancel', () => {
    linkedCodeSequenceSince.current = null;
    issueRelationSequenceSince.current = null;
  });
  useKeyboard((event) => {
    if (model._view !== 2) {
      linkedCodeSequenceSince.current = null;
      issueRelationSequenceSince.current = null;
      return false;
    }
    if (
      event.target instanceof Element &&
      event.target.closest('[role="menu"], [role="listbox"], [role="dialog"]')
    ) {
      linkedCodeSequenceSince.current = null;
      issueRelationSequenceSince.current = null;
      return false;
    }
    const issueShortcut = issueDetailShortcutFromKeyboard(event);
    if (issueShortcut) {
      event.preventDefault();
      switch (issueShortcut) {
        case 'assign-self':
          void sendIntent('onAssigneeChange', ['self']);
          break;
        case 'open-status':
          void sendIntent('onOpenIssuePropertyMenu', ['status']);
          break;
        case 'open-priority':
          void sendIntent('onOpenIssuePropertyMenu', ['priority']);
          break;
        case 'open-assignee':
          void sendIntent('onOpenIssuePropertyMenu', ['assignee']);
          break;
        case 'open-labels':
          void sendIntent('onOpenIssuePropertyMenu', ['labels']);
          break;
        case 'open-estimate':
          void sendIntent('onOpenIssuePropertyMenu', ['estimate']);
          break;
        case 'open-project':
          void sendIntent('onOpenIssuePropertyMenu', ['project']);
          break;
        case 'set-parent-issue':
          void sendIntent('onOpenMarkAs', ['subIssueOf']);
          break;
        case 'open-first-sub-issue':
          if (model.children[0]) void sendIntent('onClick18', [model.children[0]]);
          break;
        case 'focus-description':
          void sendIntent('onFocusDescription', []);
          break;
        case 'toggle-favorite':
          void sendIntent('onToggleFavorite', []);
          break;
        case 'toggle-subscription':
          void sendIntent('Subscription_onClick', []);
          break;
        case 'open-cycle':
          void sendIntent('onOpenIssuePropertyMenu', ['cycle']);
          break;
        case 'rename':
          titleRef.current?.focus();
          titleRef.current?.select();
          break;
        case 'open-due-date':
          void sendIntent('onOpenDueDate', []);
          break;
        case 'open-reminder':
          void sendIntent('onOpenIssueReminderMenu', []);
          break;
        case 'open-sub-issue':
          void sendIntent('onOpenSubIssueEditor', []);
          break;
        case 'open-parent':
          if (model.issue.parentIdentifier) void sendIntent('onClick1', []);
          break;
        case 'toggle-resources':
          void sendIntent('onToggleResources', []);
          break;
        case 'add-link':
          void sendIntent('onOpenExternalLink', ['link']);
          break;
      }
      linkedCodeSequenceSince.current = null;
      issueRelationSequenceSince.current = null;
      return true;
    }
    const relationSequence = issueRelationSequenceFromKeyboard(
      event,
      issueRelationSequenceSince.current,
      Date.now(),
    );
    issueRelationSequenceSince.current = relationSequence.pendingSince;
    if (relationSequence.action) {
      event.preventDefault();
      const kind = {
        'mark-blocked': 'blockedBy',
        'mark-blocking': 'blocking',
        'mark-related': 'relatedTo',
        'mark-duplicate': 'duplicateOf',
      }[relationSequence.action];
      void sendIntent('onOpenMarkAs', [kind]);
      linkedCodeSequenceSince.current = null;
      return true;
    }
    if (relationSequence.pendingSince !== null) {
      event.preventDefault();
      linkedCodeSequenceSince.current = null;
      return true;
    }
    const linkedCodeSequence = issueLinkedCodeSequenceFromKeyboard(
      event,
      linkedCodeSequenceSince.current,
      Date.now(),
    );
    linkedCodeSequenceSince.current = linkedCodeSequence.pendingSince;
    if (linkedCodeSequence.action === 'open-linked-code') {
      event.preventDefault();
      void sendIntent('Open_linked_code_onClick', []);
      return true;
    }
    const shortcut = issueCopyShortcutFromKeyboard(event);
    if (!shortcut) return false;
    event.preventDefault();
    void sendIntent(ISSUE_COPY_SHORTCUT_INTENTS[shortcut], []);
    return true;
  });
  return (
    <IssueDetailView
      model={{ ...model, handlers } as typeof model}
      titleRef={titleRef}
      subRef={subRef}
      noteRef={noteRef}
    />
  );
}
