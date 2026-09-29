import { req } from './request.ts';
import type {
  Activity,
  Initiative,
  Project,
  ProjectHealth,
  ProjectMilestone,
  ProjectTemplate,
} from '../types.ts';
export const projectApi = {
  projects: (archived = false) =>
    req<Project[]>(`/api/projects${archived ? '?archived=true' : ''}`),
  initiatives: () => req<Initiative[]>('/api/initiatives'),
  initiative: (slug: string) => req<Initiative>(`/api/initiatives/${encodeURIComponent(slug)}`),
  initiativeActivities: (slug: string) =>
    req<Activity[]>(`/api/initiatives/${encodeURIComponent(slug)}/activities`),
  postInitiativeUpdate: (slug: string, health: ProjectHealth, body: string) =>
    req<Activity>(`/api/initiatives/${encodeURIComponent(slug)}/updates`, {
      method: 'POST',
      body: JSON.stringify({ health, body }),
    }),
  createInitiative: (body: {
    name: string;
    slug: string;
    description?: string;
    status?: Initiative['status'];
    color?: string;
    health?: Project['health'];
    priority?: number;
    labels?: string[];
    startDate?: string;
    targetDate?: string;
  }) => req<Initiative>('/api/initiatives', { method: 'POST', body: JSON.stringify(body) }),
  patchInitiative: (slug: string, body: Record<string, unknown>) =>
    req<Initiative>(`/api/initiatives/${encodeURIComponent(slug)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteInitiative: (slug: string) =>
    req<void>(`/api/initiatives/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  projectTemplates: () => req<ProjectTemplate[]>('/api/project-templates'),
  createProjectTemplate: (slug: string, name: string) =>
    req<ProjectTemplate>(`/api/projects/${encodeURIComponent(slug)}/templates`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  deleteProjectTemplate: (slug: string) =>
    req<void>(`/api/project-templates/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  project: (slug: string) => req<Project>(`/api/projects/${slug}`),
  projectActivities: (slug: string) => req<Activity[]>(`/api/projects/${slug}/activities`),
  postProjectUpdate: (slug: string, health: ProjectHealth, body: string) =>
    req<Activity>(`/api/projects/${slug}/updates`, {
      method: 'POST',
      body: JSON.stringify({ health, body }),
    }),
  createProject: (body: {
    name: string;
    slug: string;
    summary?: string;
    icon?: string;
    iconColor?: string;
    description?: string;
    status?: string;
    workflowStatus?: string;
    lead?: 'self' | '';
    templateSlug?: string;
    priority?: number;
    startDate?: string;
    targetDate?: string;
    labels?: string[];
    milestones?: { name: string; description?: string; targetDate?: string }[];
    dependencies?: { projectSlug: string; kind: 'blocks' | 'blocked_by' | 'related' }[];
  }) => req<Project>('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  patchProject: (slug: string, body: Record<string, unknown>) =>
    req<Project>(`/api/projects/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  createProjectDependency: (slug: string, body: { projectSlug: string; kind: string }) =>
    req<Project>(`/api/projects/${slug}/dependencies`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteProjectDependency: (slug: string, dependencySlug: string) =>
    req<Project>(`/api/projects/${slug}/dependencies/${dependencySlug}`, { method: 'DELETE' }),
  createMilestone: (
    slug: string,
    body: { name: string; description?: string; targetDate?: string },
  ) =>
    req<ProjectMilestone>(`/api/projects/${slug}/milestones`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  patchMilestone: (slug: string, id: number, body: Record<string, unknown>) =>
    req<ProjectMilestone>(`/api/projects/${slug}/milestones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteMilestone: (slug: string, id: number) =>
    req<void>(`/api/projects/${slug}/milestones/${id}`, { method: 'DELETE' }),
  deleteProject: (slug: string) => req<void>(`/api/projects/${slug}`, { method: 'DELETE' }),
};
