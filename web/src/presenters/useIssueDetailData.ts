import { useEffect, useRef, useState } from 'react';
import { api } from '../api.ts';
import { cachedIssue, useIssueProjection } from '../application/issues.ts';
import { signals } from '../application/mediator.ts';
import type { ADR, Activity, Comment, Cycle, Issue, Label, Page, Project } from '../types.ts';

type LoadErrorHandler = (error: unknown) => void;

export function useIssueDetailData(identifier: string, onLoadError: LoadErrorHandler) {
  const [storedIssue, setIssue] = useState<Issue | null>(() => cachedIssue(identifier));
  const issue = useIssueProjection(storedIssue ? [storedIssue] : [])[0] ?? null;
  const generation = useRef(0);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [adrs, setAdrs] = useState<ADR[]>([]);
  const [timeZone, setTimeZone] = useState('UTC');

  async function reload() {
    const token = ++generation.current;
    const [
      nextIssue,
      allIssues,
      nextComments,
      nextActivities,
      allProjects,
      allCycles,
      allLabels,
      allAdrs,
      allPages,
      workspace,
    ] = await Promise.all([
      api.issue(identifier),
      api.issues(),
      api.comments(identifier),
      api.activities(identifier),
      api.projects(),
      api.cycles(),
      api.labels(),
      api.adrs(),
      api.pages(),
      api.workspace(),
    ]);
    if (token !== generation.current) return;
    setIssue(nextIssue);
    setIssues(allIssues);
    setComments(nextComments);
    setActivities(nextActivities);
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
    setIssue,
    issues,
    comments,
    setComments,
    activities,
    setActivities,
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
