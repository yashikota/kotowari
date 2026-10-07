import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.ts';
import { cachedIssue, useIssueProjection } from '../application/issues.ts';
import { signals } from '../application/mediator.ts';
import type { ADR, Cycle, Issue, Label, Page, Project } from '../types.ts';

type LoadErrorHandler = (error: unknown) => void;

export function useIssueDetailData(identifier: string, onLoadError: LoadErrorHandler) {
  const [storedIssue, setIssue] = useState<Issue | null>(() => cachedIssue(identifier));
  const issueRevision = useRef(0);
  const setLocalIssue = useCallback<typeof setIssue>((nextIssue) => {
    issueRevision.current++;
    setIssue(nextIssue);
  }, []);
  // A reused detail presenter must never expose the previous issue as the new route.
  const scopedIssue =
    storedIssue?.identifier === identifier ? storedIssue : cachedIssue(identifier);
  const issue = useIssueProjection(scopedIssue ? [scopedIssue] : [])[0] ?? null;
  const generation = useRef(0);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [adrs, setAdrs] = useState<ADR[]>([]);
  const [timeZone, setTimeZone] = useState('UTC');

  async function reload() {
    const token = ++generation.current;
    const issueRevisionAtStart = issueRevision.current;
    const result = await Promise.all([
      api.issue(identifier),
      api.issues(),
      api.projects(),
      api.cycles(),
      api.labels(),
      api.adrs(),
      api.pages(),
      api.workspace(),
    ]).catch((cause: unknown) => {
      if (token !== generation.current) return null;
      throw cause;
    });
    if (token !== generation.current || !result) return;
    const [nextIssue, allIssues, allProjects, allCycles, allLabels, allAdrs, allPages, workspace] =
      result;
    if (issueRevisionAtStart === issueRevision.current) setIssue(nextIssue);
    setIssues(allIssues);
    setProjects(allProjects);
    setCycles(allCycles);
    setLabels(allLabels);
    setAdrs(allAdrs);
    setPages(allPages);
    setTimeZone(workspace.timezone || 'UTC');
  }

  useEffect(() => {
    void reload().catch(onLoadError);
    function onRefresh() {
      void reload().catch(() => undefined);
    }
    signals.addEventListener('kotowari:refresh', onRefresh);
    return () => {
      generation.current++;
      signals.removeEventListener('kotowari:refresh', onRefresh);
    };
  }, [identifier]);

  return {
    issue,
    setIssue: setLocalIssue,
    issues,
    projects,
    cycles,
    pages,
    labels,
    setLabels,
    adrs,
    timeZone,
    reload,
  };
}
