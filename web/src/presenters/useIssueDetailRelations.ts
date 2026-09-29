import { useNavigate, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { isSubmitShortcut } from '../keymap.ts';
import { api } from '../api.ts';
import { patchIssueOptimistically } from '../application/issues.ts';
import { signals } from '../application/mediator.ts';
import type { Issue, IssueRelation } from '../types.ts';

type RelatedIssueKind = 'issue' | 'subIssue' | 'parent' | 'blocked' | 'blocking';
type MarkAsKind =
  | 'parentOf'
  | 'subIssueOf'
  | 'relatedTo'
  | 'blockedBy'
  | 'blocking'
  | 'duplicateOf';

type Props = {
  identifier: string;
  issue: Issue | null;
  issues: Issue[];
  reload: () => Promise<void>;
  onCloseIssueOptions: () => void;
};

export function useIssueDetailRelations({
  identifier,
  issue,
  issues,
  reload,
  onCloseIssueOptions,
}: Props) {
  const navigate = useNavigate();
  const router = useRouter();
  const [subTitle, setSubTitle] = useState('');
  const [subIssueEditorOpen, setSubIssueEditorOpen] = useState(false);
  const [focusSub, setFocusSub] = useState(0);
  const [relationTarget, setRelationTarget] = useState('');
  const [relationKind, setRelationKind] = useState<IssueRelation['kind']>('related');
  const [relationsEditorOpen, setRelationsEditorOpen] = useState(false);
  const [relatedIssueKind, setRelatedIssueKind] = useState<RelatedIssueKind | null>(null);
  const [relatedIssueTitle, setRelatedIssueTitle] = useState('');
  const [markAsKind, setMarkAsKind] = useState<MarkAsKind | null>(null);

  useEffect(() => {
    setSubTitle('');
    setSubIssueEditorOpen(false);
    setFocusSub(0);
    setRelationTarget('');
    setRelationsEditorOpen(false);
    setRelatedIssueKind(null);
    setRelatedIssueTitle('');
    setMarkAsKind(null);
  }, [identifier]);

  const children = issue ? issues.filter((candidate) => candidate.parentId === issue.id) : [];
  const relationIssues = issue
    ? issue.relations.flatMap((relation) => {
        const target = issues.find(
          (candidate) => candidate.identifier === relation.targetIdentifier,
        );
        return target ? [{ relation, target }] : [];
      })
    : [];
  const relationTargetOptions = issue
    ? issues.filter(
        (candidate) =>
          candidate.id !== issue.id &&
          !issue.relations.some((relation) => relation.targetIdentifier === candidate.identifier),
      )
    : [];
  const parentOptions = issue ? issues.filter((candidate) => candidate.id !== issue.id) : [];
  const markAsForbiddenIds = new Set<number>();
  if (issue && markAsKind === 'parentOf') {
    let ancestorId = issue.parentId;
    while (ancestorId != null && !markAsForbiddenIds.has(ancestorId)) {
      markAsForbiddenIds.add(ancestorId);
      ancestorId = issues.find((candidate) => candidate.id === ancestorId)?.parentId ?? null;
    }
  } else if (issue && markAsKind === 'subIssueOf') {
    const pending = [issue.id];
    while (pending.length > 0) {
      const parentId = pending.pop()!;
      for (const child of issues.filter((candidate) => candidate.parentId === parentId)) {
        if (!markAsForbiddenIds.has(child.id)) {
          markAsForbiddenIds.add(child.id);
          pending.push(child.id);
        }
      }
    }
  }
  const markAsIssueOptions = issue
    ? issues.filter(
        (candidate) => candidate.id !== issue.id && !markAsForbiddenIds.has(candidate.id),
      )
    : [];

  async function addSubIssue() {
    const title = subTitle.trim();
    if (!title || !issue) return;
    await api.createIssue({ title, parentId: issue.id });
    setSubTitle('');
    setSubIssueEditorOpen(false);
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
    await reload();
  }

  async function addRelation() {
    if (!relationTarget) return;
    await api.addIssueRelation(identifier, {
      targetIdentifier: relationTarget,
      kind: relationKind,
    });
    setRelationTarget('');
    setRelationsEditorOpen(false);
    await reload();
    signals.dispatchEvent(new Event('kotowari:refresh'));
  }

  async function removeRelation(relation: IssueRelation) {
    await api.removeIssueRelation(identifier, relation.id);
    await reload();
    signals.dispatchEvent(new Event('kotowari:refresh'));
  }

  async function createRelatedIssue() {
    const title = relatedIssueTitle.trim();
    if (!title || !relatedIssueKind || !issue) return;

    const related = await api.createIssue({
      title,
      status: 'todo',
      projectId: issue.projectId ?? undefined,
      cycleId: issue.cycleId ?? undefined,
      parentId: relatedIssueKind === 'subIssue' ? issue.id : undefined,
    });

    if (relatedIssueKind === 'parent') {
      await patchIssueOptimistically(identifier, { parentId: related.id });
    } else if (relatedIssueKind !== 'subIssue') {
      const kind: IssueRelation['kind'] =
        relatedIssueKind === 'blocked'
          ? 'blocks'
          : relatedIssueKind === 'blocking'
            ? 'blockedBy'
            : 'related';
      await api.addIssueRelation(identifier, {
        targetIdentifier: related.identifier,
        kind,
      });
    }

    setRelatedIssueKind(null);
    setRelatedIssueTitle('');
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
    await reload();
  }

  async function markAs(targetIdentifier: string | null) {
    if (!targetIdentifier || !markAsKind || !issue) return;
    const target = issues.find((candidate) => candidate.identifier === targetIdentifier);
    if (!target) return;

    if (markAsKind === 'parentOf') {
      await patchIssueOptimistically(target.identifier, { parentId: issue.id });
    } else if (markAsKind === 'subIssueOf') {
      await patchIssueOptimistically(identifier, { parentId: target.id });
    } else {
      const kind: IssueRelation['kind'] =
        markAsKind === 'relatedTo'
          ? 'related'
          : markAsKind === 'blockedBy'
            ? 'blockedBy'
            : markAsKind === 'blocking'
              ? 'blocks'
              : 'duplicateOf';
      await api.addIssueRelation(identifier, { targetIdentifier, kind });
    }

    setMarkAsKind(null);
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
    await reload();
  }

  return {
    data: {
      children,
      markAsIssueOptions,
      markAsKind,
      focusSub,
      parentId: issue?.id,
      parentOptions,
      relatedIssueKind,
      relatedIssueTitle,
      relationIssues,
      relationKind,
      relationTarget,
      relationTargetOptions,
      relationsEditorOpen,
      subIssueEditorOpen,
      subTitle,
    },
    handlers: {
      onClick18: (child: Issue) =>
        navigate({
          to: '/issues/$identifier',
          params: { identifier: child.identifier },
        }),
      onOpenSubIssueEditor: () => {
        setSubIssueEditorOpen(true);
        setFocusSub((current) => current + 1);
      },
      onCloseSubIssueEditor: () => {
        setSubIssueEditorOpen(false);
        setSubTitle('');
      },
      onCreateSubIssue: () => addSubIssue(),
      New_sub_issue_onChange19: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setSubTitle(e.target.value),
      New_sub_issue_onKeyDown20: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (isSubmitShortcut(e)) {
          e.preventDefault();
          return addSubIssue();
        }
      },
      Relation_target_onChange30: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setRelationTarget(e.target.value),
      Relation_kind_onChange31: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setRelationKind(e.target.value as IssueRelation['kind']),
      onOpenRelationsEditor: () => setRelationsEditorOpen(true),
      onCloseRelationsEditor: () => setRelationsEditorOpen(false),
      Relation_onSubmit32: (
        e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        e.preventDefault();
        return addRelation();
      },
      onRemoveRelation33: (relation: IssueRelation) => removeRelation(relation),
      onOpenCreateRelated: (kind: RelatedIssueKind) => {
        onCloseIssueOptions();
        setRelatedIssueTitle('');
        setRelatedIssueKind(kind);
      },
      onCloseCreateRelated: () => setRelatedIssueKind(null),
      onRelatedIssueTitleChange: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setRelatedIssueTitle(e.target.value),
      onCreateRelatedSubmit: (
        e: Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0],
      ) => {
        e.preventDefault();
        return createRelatedIssue();
      },
      onOpenMarkAs: (kind: MarkAsKind) => {
        onCloseIssueOptions();
        setMarkAsKind(kind);
      },
      onCloseMarkAs: () => setMarkAsKind(null),
      onSelectMarkAs: (value: string | null) => markAs(value),
    },
  };
}
