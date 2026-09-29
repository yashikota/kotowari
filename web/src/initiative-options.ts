import type { InitiativeStatus, ProjectHealth } from './types.ts';

export const INITIATIVE_STATUSES: InitiativeStatus[] = [
  'proposed',
  'planned',
  'active',
  'completed',
  'canceled',
];

export const INITIATIVE_HEALTH: ProjectHealth[] = ['on_track', 'at_risk', 'off_track'];
export const INITIATIVE_COLORS = [
  'grey',
  'blue',
  'purple',
  'pink',
  'red',
  'orange',
  'yellow',
  'green',
];
