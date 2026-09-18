import { isSubmitShortcut } from '../keymap.ts';
import { useNavigate, useRouter } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.ts';
import { cachedIssue, useIssueProjection } from '../application/issues.ts';
import { signals } from '../application/mediator.ts';
import { useIntent } from '../application/Root.tsx';
import type { ADR, Activity, Comment, Cycle, Issue, Label, Project } from '../types.ts';

const LABEL_COLORS = ['#d4725a', '#6b9bd1', '#c4a574', '#7a9e7e', '#d4a05a'];

type Props = {
  identifier: string;
};

export function useIssueDetailPresenter({ identifier }: Props) {
  const sendIntent = useIntent();
  const navigate = useNavigate();
  const router = useRouter();
  const [storedIssue, setIssue] = useState<Issue | null>(() => cachedIssue(identifier));
  const issue = useIssueProjection(storedIssue ? [storedIssue] : [])[0] ?? null;
  const generation = useRef(0);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [adrs, setAdrs] = useState<ADR[]>([]);
  const [draft, setDraft] = useState('');
  const [subTitle, setSubTitle] = useState('');
  const [labelName, setLabelName] = useState('');
  const [adrPick, setAdrPick] = useState('');
  const [timeZone, setTimeZone] = useState('UTC');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function reload() {
    const token = ++generation.current;
    const [iss, all, com, act, proj, cyc, labs, allAdrs, ws] = await Promise.all([
      api.issue(identifier),
      api.issues(),
      api.comments(identifier),
      api.activities(identifier),
      api.projects(),
      api.cycles(),
      api.labels(),
      api.adrs(),
      api.workspace(),
    ]);
    if (token !== generation.current) return;
    setIssue(iss);
    setIssues(all);
    setComments(com);
    setActivities(act);
    setProjects(proj);
    setCycles(cyc);
    setLabels(labs);
    setAdrs(allAdrs);
    setTimeZone(ws.timezone || 'UTC');
  }

  useEffect(() => {
    void reload().catch((e: unknown) => setError(e instanceof Error ? e.message : 'load failed'));
    function onRefresh() {
      void reload().catch(() => undefined);
    }
    signals.addEventListener('kotowari:refresh', onRefresh);
    return () => {
      generation.current++;
      signals.removeEventListener('kotowari:refresh', onRefresh);
    };
  }, [identifier]);

  async function patch(body: Record<string, unknown>) {
    const next = await api.patchIssue(identifier, body);
    setIssue(next);
    setActivities(await api.activities(identifier));
  }

  if (error) {
    return { _view: 0 as const, error, handlers: {} };
  }
  if (!issue) {
    return { _view: 1 as const, handlers: {} };
  }

  const due = issue.dueDate?.slice(0, 10) ?? '';
  const selectedLabelIds = new Set(issue.labels.map((l) => l.id));
  const children = issues.filter((i) => i.parentId === issue.id);
  const parentOptions = issues.filter((i) => i.id !== issue.id);
  const parentId = issue.id;
  const linkedAdrs = adrs.filter((a) => (issue.adrNumbers ?? []).includes(a.number));
  const unlinkedAdrs = adrs.filter((a) => !(issue.adrNumbers ?? []).includes(a.number));

  async function addSubIssue() {
    const title = subTitle.trim();
    if (!title) {
      return;
    }
    await api.createIssue({ title, parentId });
    setSubTitle('');
    await router.invalidate();
    signals.dispatchEvent(new Event('kotowari:refresh'));
    await reload();
  }

  async function addLabel() {
    const name = labelName.trim();
    if (!name) {
      return;
    }
    const created = await api.createLabel({
      name,
      color: LABEL_COLORS[labels.length % LABEL_COLORS.length] ?? '#c4a574',
    });
    setLabelName('');
    setLabels(await api.labels());
    await patch({ labelIds: [...(issue?.labels ?? []).map((l) => l.id), created.id] });
  }

  async function remove() {
    if (!window.confirm(`Delete ${identifier}?`)) {
      return;
    }
    await api.deleteIssue(identifier);
    await router.invalidate();
    await navigate({ to: '/issues', search: {} });
  }

  return {
    _view: 2 as const,
    identifier,
    issue,
    issues,
    comments,
    activities,
    projects,
    cycles,
    labels,
    adrs,
    draft,
    subTitle,
    labelName,
    adrPick,
    timeZone,
    copied,
    due,
    selectedLabelIds,
    children,
    parentOptions,
    parentId,
    linkedAdrs,
    unlinkedAdrs,
    handlers: {
      Copy_identifier_onClick0: () => {
        return navigator.clipboard.writeText(issue.identifier).then(
          () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          },
          () => undefined,
        );
      },
      onClick1: () =>
        navigate({
          to: '/issues/$identifier',
          params: { identifier: issue.parentIdentifier ?? '' },
        }),
      onClick2: () => remove(),
      Issue_title_onChange3: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => setIssue({ ...issue, title: e.target.value }),
      Issue_title_onBlur4: () => patch({ title: issue.title }),
      Status_onChange5: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => patch({ status: e.target.value }),
      Priority_onChange6: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => patch({ priority: Number(e.target.value) }),
      Project_onChange7: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) =>
        patch({
          projectId: e.target.value ? Number(e.target.value) : null,
        }),
      Cycle_onChange8: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) =>
        patch({
          cycleId: e.target.value ? Number(e.target.value) : null,
        }),
      Parent_onChange9: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) =>
        patch({
          parentId: e.target.value ? Number(e.target.value) : null,
        }),
      Due_date_onChange10: (
        e: Parameters<NonNullable<React.ComponentProps<'input'>['onChange']>>[0],
      ) => patch({ dueDate: e.target.value ? e.target.value : null }),
      onClick11: (on: boolean, l: Label) => {
        const next = on
          ? issue.labels.filter((x) => x.id !== l.id).map((x) => x.id)
          : [...issue.labels.map((x) => x.id), l.id];
        return patch({ labelIds: next });
      },
      New_label_onChange12: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setLabelName(e.target.value),
      New_label_onKeyDown13: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;

        if (isSubmitShortcut(e)) {
          e.preventDefault();
          return addLabel();
        }
      },
      onClick14: (a: ADR) => {
        return api.unlinkIssueADR(identifier, a.number).then(() => reload());
      },
      Link_ADR_onChange15: (
        e: Parameters<NonNullable<React.ComponentProps<'select'>['onChange']>>[0],
      ) => setAdrPick(e.target.value),
      onClick16: () => {
        const n = Number(adrPick);
        if (!n) {
          return;
        }
        return api.linkIssueADR(identifier, n).then(async () => {
          setAdrPick('');
          await reload();
          await router.invalidate();
        });
      },
      onClick17: () => sendIntent('adr.create', { issueNumber: issue.number }),
      onClick18: (c: Issue) =>
        navigate({
          to: '/issues/$identifier',
          params: { identifier: c.identifier },
        }),
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
      New_note_onChange21: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onChange']>>[0],
      ) => setDraft(e.target.value),
      New_note_onKeyDown22: (
        e: Parameters<NonNullable<React.ComponentProps<'textarea'>['onKeyDown']>>[0],
      ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;

        if (isSubmitShortcut(e)) {
          e.preventDefault();
          const body = draft.trim();
          if (!body) {
            return;
          }
          return api.addComment(identifier, body).then(async () => {
            setDraft('');
            setComments(await api.comments(identifier));
            setActivities(await api.activities(identifier));
          });
        }
      },
    },
  };
}
