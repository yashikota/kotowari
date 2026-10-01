import { useEffect, useRef, useState } from 'react';
import { api } from '../api.ts';
import { queryCache } from '../query-cache.ts';
import type { IssueTemplate, Label, Project } from '../types.ts';

export function useIssueComposerMetadata(
  open: boolean,
  setProjects: (projects: Project[]) => void,
) {
  const [templates, setTemplates] = useState<IssueTemplate[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [request, setRequest] = useState(0);
  const ready = useRef(false);
  const generation = useRef(0);

  function prepare() {
    for (const path of ['/api/projects', '/api/issue-templates', '/api/labels'])
      queryCache.invalidate(path);
    generation.current += 1;
    ready.current = false;
    setPhase('loading');
    setRequest((value) => value + 1);
  }

  useEffect(() => {
    if (!open) return;
    let active = true;
    const version = generation.current;
    ready.current = false;
    setPhase('loading');
    void Promise.all([api.projects(), api.issueTemplates(), api.labels()])
      .then(([projects, nextTemplates, nextLabels]) => {
        if (!active || version !== generation.current) return;
        setProjects(projects);
        setTemplates(nextTemplates);
        setLabels(nextLabels);
        ready.current = true;
        setPhase('ready');
      })
      .catch(() => {
        if (!active || version !== generation.current) return;
        ready.current = false;
        setPhase('error');
      });
    return () => {
      active = false;
    };
  }, [open, request, setProjects]);

  return { templates, labels, phase, ready, prepare };
}
