import { req } from './request.ts';
import type { InboxActivity, Issue, Project } from '../types.ts';
export const inboxApi = {
  inboxActivities: async () => {
    const [activities, issues, projects] = await Promise.all([
      req<Omit<InboxActivity, 'status' | 'priority' | 'projectId' | 'projectName'>[]>(
        '/api/inbox/activities',
      ),
      req<Issue[]>('/api/issues'),
      req<Project[]>('/api/projects'),
    ]);
    const issueByIdentifier = new Map(issues.map((issue) => [issue.identifier, issue]));
    const projectById = new Map(projects.map((project) => [project.id, project]));
    return activities.map((activity): InboxActivity => {
      const issue = issueByIdentifier.get(activity.identifier);
      const project =
        issue?.projectId === null || issue?.projectId === undefined
          ? undefined
          : projectById.get(issue.projectId);
      return {
        ...activity,
        status: issue?.status ?? null,
        priority: issue?.priority ?? null,
        projectId: issue?.projectId ?? null,
        projectName: project?.name ?? null,
      };
    });
  },
};
