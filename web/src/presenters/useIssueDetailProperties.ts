import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type {
  IssueOptionalProperty,
  IssuePropertyMenu,
  OptionalIssuePropertyVisibility,
} from '../issue-property-model.ts';
import type { Issue } from '../types.ts';

const ISSUE_PROPERTY_VISIBILITY_KEY = 'kotowari.issue-property-visibility.v1';

type OptionalPropertyOverrides = Record<string, Partial<Record<IssueOptionalProperty, boolean>>>;

type Props = {
  identifier: string;
  issue: Issue | null;
  setIssue: (issue: Issue) => void;
  patch: (body: Record<string, unknown>) => Promise<void>;
  onTitleDraftChange: (title: string) => void;
};

function readOptionalPropertyOverrides(): OptionalPropertyOverrides {
  if (typeof window === 'undefined') return {};
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(ISSUE_PROPERTY_VISIBILITY_KEY) ?? '{}',
    );
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return {};
    return stored as OptionalPropertyOverrides;
  } catch {
    return {};
  }
}

export function useIssueDetailProperties({
  identifier,
  issue,
  setIssue,
  patch: commit,
  onTitleDraftChange,
}: Props) {
  const [propertySaveState, setPropertySaveState] = useState<
    'idle' | 'saving' | 'saved' | 'failed'
  >('idle');
  const [propertySaveError, setPropertySaveError] = useState('');
  const failedPatch = useRef<Record<string, unknown> | null>(null);
  const pending = useRef(false);
  const titleDirty = useRef(false);
  const savedTitle = useRef<string | null>(null);
  const queuedTitle = useRef<string | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    pending.current = false;
    failedPatch.current = null;
    titleDirty.current = false;
    savedTitle.current = null;
    queuedTitle.current = null;
    setPropertySaveState('idle');
    setPropertySaveError('');
    return () => {
      generation.current++;
    };
  }, [identifier]);
  async function patch(body: Record<string, unknown>) {
    if (pending.current) return;
    const token = generation.current;
    pending.current = true;
    failedPatch.current = body;
    setIssuePropertyMenu(null);
    setPropertySaveState('saving');
    setPropertySaveError('');
    let completed = false;
    try {
      await commit(body);
      if (token !== generation.current) return;
      completed = true;
      failedPatch.current = null;
      if (typeof body.title === 'string') {
        savedTitle.current = body.title;
        titleDirty.current = false;
      }
      setPropertySaveState('saved');
    } catch (error) {
      if (token !== generation.current) return;
      setPropertySaveError(error instanceof Error ? error.message : String(error));
      setPropertySaveState('failed');
    } finally {
      if (token === generation.current) {
        pending.current = false;
        if (completed && queuedTitle.current !== null) {
          const title = queuedTitle.current;
          queuedTitle.current = null;
          if (titleDirty.current) void patch({ title });
        }
      }
    }
  }
  const [optionalPropertyOverrides, setOptionalPropertyOverrides] =
    useState<OptionalPropertyOverrides>(readOptionalPropertyOverrides);
  const [issuePropertyMenu, setIssuePropertyMenu] = useState<IssuePropertyMenu>(null);
  const due = issue?.dueDate?.slice(0, 10) ?? '';
  const propertyOverrides = optionalPropertyOverrides[identifier] ?? {};
  const optionalIssuePropertyVisibility: OptionalIssuePropertyVisibility = {
    dueDate: propertyOverrides.dueDate ?? Boolean(due),
    milestone: propertyOverrides.milestone ?? issue?.milestoneId != null,
    parent: propertyOverrides.parent ?? issue?.parentId != null,
    type: propertyOverrides.type ?? Boolean(issue?.type),
  };

  return {
    data: {
      due,
      issuePropertyMenu,
      optionalIssuePropertyVisibility,
      propertySaveState,
      propertySaveError,
      hasUnsavedTitle: titleDirty.current,
    },
    handlers: {
      onRetryPropertySave: () => (failedPatch.current ? patch(failedPatch.current) : undefined),
      onTitleChange: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => {
        if (issue) {
          if (!titleDirty.current) savedTitle.current = issue.title;
          titleDirty.current = e.target.value !== savedTitle.current;
          queuedTitle.current = null;
          onTitleDraftChange(e.target.value);
          failedPatch.current = null;
          setPropertySaveState('idle');
          setPropertySaveError('');
          setIssue({ ...issue, title: e.target.value });
        }
      },
      onTitleBlur: () => {
        if (!issue || !titleDirty.current) return;
        if (pending.current) {
          // An explicit save of an existing draft waits for the current property write.
          // Repeated Enter during the same title write does not duplicate that write.
          if (failedPatch.current?.title !== issue.title) queuedTitle.current = issue.title;
          return;
        }
        return patch({ title: issue.title });
      },
      onStatusChange: (value: string | null) =>
        value ? patch({ workflowStatus: value }) : undefined,
      onOpenIssuePropertyMenu: (property: IssuePropertyMenu) => {
        if (!pending.current) setIssuePropertyMenu(property);
      },
      onCloseIssuePropertyMenu: () => setIssuePropertyMenu(null),
      onToggleIssuePropertyMenu: (property: Exclude<IssuePropertyMenu, null>) => {
        if (!pending.current)
          setIssuePropertyMenu((current) => (current === property ? null : property));
      },
      onAssigneeChange: (value: string | null) =>
        patch({ assignee: value === 'self' || value === 'agent' ? value : null }),
      onTypeChange: (value: string | null) =>
        patch({ type: value && value !== 'none' ? value : '' }),
      onPriorityChange: (value: string | null) =>
        value ? patch({ priority: Number(value) }) : undefined,
      onEstimateChange: (value: string | null) =>
        patch({ estimate: value && value !== 'none' ? Number(value) : null }),
      onProjectChange: (value: string | null) =>
        patch({ projectId: value && value !== 'none' ? Number(value) : null }),
      onMilestoneChange: (value: string | null) =>
        patch({ milestoneId: value && value !== 'none' ? Number(value) : null }),
      onCycleChange: (value: string | null) =>
        patch({ cycleId: value && value !== 'none' ? Number(value) : null }),
      onParentChange: (value: string | null) =>
        patch({ parentId: value && value !== 'none' ? Number(value) : null }),
      onPropertyDueDateChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => patch({ dueDate: e.target.value ? e.target.value : null }),
      onToggleIssueOptionalProperty: (property: IssueOptionalProperty) => {
        const nextOverrides = {
          ...optionalPropertyOverrides,
          [identifier]: {
            ...propertyOverrides,
            [property]: !optionalIssuePropertyVisibility[property],
          },
        };
        setOptionalPropertyOverrides(nextOverrides);
        window.localStorage.setItem(ISSUE_PROPERTY_VISIBILITY_KEY, JSON.stringify(nextOverrides));
      },
    },
  };
}
