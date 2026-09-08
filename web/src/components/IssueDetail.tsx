import { AIPanel } from './AIPanel.tsx';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { formatActivity } from '../activity.ts';
import { api } from '../api.ts';
import { formatStamp } from '../time.ts';
import { ISSUE_STATUSES, PRIORITY_LABEL, STATUS_LABEL } from '../types.ts';
import type { ADR, Activity, Comment, Cycle, Issue, Label, Project } from '../types.ts';
import { DocumentEditor } from './DocumentEditor.tsx';

const LABEL_COLORS = ['#d4725a', '#6b9bd1', '#c4a574', '#7a9e7e', '#d4a05a'];

type Props = {
  identifier: string;
};

export function IssueDetail({ identifier }: Props) {
  const navigate = useNavigate();
  const router = useRouter();
  const [issue, setIssue] = useState<Issue | null>(null);
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
    window.addEventListener('kotowari:refresh', onRefresh);
    return () => window.removeEventListener('kotowari:refresh', onRefresh);
  }, [identifier]);

  async function patch(body: Record<string, unknown>) {
    const next = await api.patchIssue(identifier, body);
    setIssue(next);
    setActivities(await api.activities(identifier));
  }

  if (error) {
    return <div className="error">{error}</div>;
  }
  if (!issue) {
    return <div className="empty">Loading…</div>;
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
    window.dispatchEvent(new Event('kotowari:refresh'));
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

  return (
    <div className="detail">
      <div className="ident-row">
        <button
          type="button"
          className="ident ident-copy"
          aria-label="Copy identifier"
          onClick={() => {
            void navigator.clipboard.writeText(issue.identifier).then(
              () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              },
              () => undefined,
            );
          }}
        >
          {copied ? 'Copied' : issue.identifier}
        </button>
        {issue.parentIdentifier ? (
          <button
            type="button"
            className="crumb"
            onClick={() =>
              void navigate({
                to: '/issues/$identifier',
                params: { identifier: issue.parentIdentifier ?? '' },
              })
            }
          >
            {issue.parentIdentifier}
          </button>
        ) : null}
        <span className="muted">{formatStamp(issue.updatedAt, timeZone)}</span>
        <button type="button" className="ghost danger" onClick={() => void remove()}>
          Delete
        </button>
      </div>
      <input
        className="title-input"
        aria-label="Issue title"
        value={issue.title}
        onChange={(e) => setIssue({ ...issue, title: e.target.value })}
        onBlur={() => void patch({ title: issue.title })}
      />
      <div className="prop-grid">
        <label>
          <span>Status</span>
          <select
            aria-label="Status"
            value={issue.status}
            onChange={(e) => void patch({ status: e.target.value })}
          >
            {ISSUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Priority</span>
          <select
            aria-label="Priority"
            value={issue.priority}
            onChange={(e) => void patch({ priority: Number(e.target.value) })}
          >
            {PRIORITY_LABEL.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Project</span>
          <select
            aria-label="Project"
            value={issue.projectId ?? ''}
            onChange={(e) =>
              void patch({
                projectId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Cycle</span>
          <select
            aria-label="Cycle"
            value={issue.cycleId ?? ''}
            onChange={(e) =>
              void patch({
                cycleId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">No cycle</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                Cycle {c.number}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Parent</span>
          <select
            aria-label="Parent"
            value={issue.parentId ?? ''}
            onChange={(e) =>
              void patch({
                parentId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">No parent</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.identifier} {p.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Due</span>
          <input
            type="date"
            aria-label="Due date"
            value={due}
            onChange={(e) => void patch({ dueDate: e.target.value ? e.target.value : null })}
          />
        </label>
      </div>
      <div>
        <div className="muted">Labels</div>
        <div className="chips" role="group" aria-label="Labels">
          {labels.map((l) => {
            const on = selectedLabelIds.has(l.id);
            return (
              <button
                type="button"
                key={l.id}
                className={`chip ${on ? 'on' : ''}`}
                aria-pressed={on}
                style={{ '--chip': l.color } as React.CSSProperties}
                onClick={() => {
                  const next = on
                    ? issue.labels.filter((x) => x.id !== l.id).map((x) => x.id)
                    : [...issue.labels.map((x) => x.id), l.id];
                  void patch({ labelIds: next });
                }}
              >
                {l.name}
              </button>
            );
          })}
        </div>
        <input
          className="field"
          aria-label="New label"
          placeholder="New label"
          value={labelName}
          onChange={(e) => setLabelName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void addLabel();
            }
          }}
        />
      </div>
      <div>
        <div className="muted">ADRs</div>
        {linkedAdrs.length === 0 ? (
          <div className="empty-inline">No linked decisions.</div>
        ) : (
          <div className="list" role="list">
            {linkedAdrs.map((a) => (
              <div className="row" key={a.identifier}>
                <Link
                  to="/adrs/$identifier"
                  params={{ identifier: a.identifier }}
                  className="ident"
                >
                  {a.identifier}
                </Link>
                <span>{a.title}</span>
                <span className="badge">{a.status}</span>
                <button
                  type="button"
                  className="ghost"
                  aria-label={`Unlink ${a.identifier}`}
                  onClick={() => {
                    void api.unlinkIssueADR(identifier, a.number).then(() => reload());
                  }}
                >
                  Unlink
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="props">
          <label>
            <span className="sr-only">Link ADR</span>
            <select
              aria-label="Link ADR"
              value={adrPick}
              onChange={(e) => setAdrPick(e.target.value)}
            >
              <option value="">Link an ADR</option>
              {unlinkedAdrs.map((a) => (
                <option key={a.identifier} value={String(a.number)}>
                  {a.identifier} {a.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="ghost"
            disabled={!adrPick}
            onClick={() => {
              const n = Number(adrPick);
              if (!n) {
                return;
              }
              void api.linkIssueADR(identifier, n).then(async () => {
                setAdrPick('');
                await reload();
                await router.invalidate();
              });
            }}
          >
            Link
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('kotowari:create-adr', { detail: { issueNumber: issue.number } }),
              )
            }
          >
            New ADR
          </button>
        </div>
      </div>
      <AIPanel kind="issues" id={identifier} />
      <DocumentEditor documentKey={`issues/${identifier}/body`} />
      <div>
        <div className="muted">Sub-issues</div>
        {children.length === 0 ? (
          <div className="empty-inline">Break this into smaller work.</div>
        ) : (
          <div className="list">
            {children.map((c) => (
              <button
                type="button"
                className="row"
                key={c.identifier}
                onClick={() =>
                  void navigate({
                    to: '/issues/$identifier',
                    params: { identifier: c.identifier },
                  })
                }
              >
                <span className="rail" />
                <span className="ident">{c.identifier}</span>
                <span>{c.title}</span>
                <span className="badge">{STATUS_LABEL[c.status]}</span>
              </button>
            ))}
          </div>
        )}
        <input
          className="field"
          aria-label="New sub-issue"
          placeholder="Add sub-issue"
          value={subTitle}
          onChange={(e) => setSubTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void addSubIssue();
            }
          }}
        />
      </div>
      <div>
        <div className="muted">Notes</div>
        <div className="comments">
          {comments.map((c) => (
            <div className="comment" key={c.id}>
              <div className="muted">{formatStamp(c.createdAt, timeZone)}</div>
              <div>{c.body}</div>
            </div>
          ))}
          <textarea
            className="field"
            rows={3}
            aria-label="New note"
            placeholder="Note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                const body = draft.trim();
                if (!body) {
                  return;
                }
                void api.addComment(identifier, body).then(async () => {
                  setDraft('');
                  setComments(await api.comments(identifier));
                  setActivities(await api.activities(identifier));
                });
              }
            }}
          />
          <span className="muted">Mod+Enter to save</span>
        </div>
      </div>
      <div>
        <div className="muted">Activity</div>
        <div className="comments">
          {activities.map((a) => (
            <div className="comment" key={a.id}>
              <span>{formatActivity(a.action, a.payload)}</span>{' '}
              <span className="muted">{formatStamp(a.createdAt, timeZone)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
