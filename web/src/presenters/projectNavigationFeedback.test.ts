import { describe, expect, it } from 'vite-plus/test';
import { projectNavigationFeedback } from './projectNavigationFeedback.ts';

const idle = {
  deletion: { pending: false, confirmed: false },
  milestoneRemoval: { pending: false, confirmed: false },
  dependencyChanges: { pending: false, confirmed: false, action: 'add' as const, error: '' },
  milestoneCreation: { pending: false, created: false, error: '', nameError: '' },
  milestoneEdits: { pending: false, error: '' },
  projectSaving: false,
  projectSaveError: '',
};

describe('project navigation feedback', () => {
  it('describes the actual write and confirmed refresh stage', () => {
    expect(
      projectNavigationFeedback({
        ...idle,
        dependencyChanges: { ...idle.dependencyChanges, pending: true },
      }).savingLabel,
    ).toBe('dependencySave.adding');
    expect(
      projectNavigationFeedback({
        ...idle,
        dependencyChanges: { ...idle.dependencyChanges, pending: true, action: 'remove' },
      }).savingLabel,
    ).toBe('dependencySave.removing');
    expect(
      projectNavigationFeedback({
        ...idle,
        dependencyChanges: { ...idle.dependencyChanges, pending: true, confirmed: true },
      }).savingLabel,
    ).toBe('dependencySave.refreshing');
    expect(
      projectNavigationFeedback({
        ...idle,
        milestoneCreation: { ...idle.milestoneCreation, pending: true, created: true },
      }).savingLabel,
    ).toBe('milestoneCreation.refreshing');
    expect(
      projectNavigationFeedback({ ...idle, deletion: { pending: true, confirmed: true } })
        .savingLabel,
    ).toBe('projectDeletion.opening');
    expect(
      projectNavigationFeedback({ ...idle, milestoneRemoval: { pending: true, confirmed: true } })
        .savingLabel,
    ).toBe('milestoneDeletion.refreshing');
  });
  it('keeps the first failed stage and its description together', () => {
    const result = projectNavigationFeedback({
      ...idle,
      projectSaveError: 'Project failed',
      dependencyChanges: { ...idle.dependencyChanges, error: 'Dependency failed' },
    });
    expect(result.error).toBe('Project failed');
    expect(result.failureLabel).toBe('projectSave.failed');
    const refresh = projectNavigationFeedback({
      ...idle,
      dependencyChanges: { ...idle.dependencyChanges, confirmed: true, error: 'Refresh failed' },
    });
    expect(refresh.error).toBe('Refresh failed');
    expect(refresh.failureLabel).toBe('dependencySave.refreshFailed');
  });
  it('reports creation validation and returns a quiet idle state', () => {
    expect(
      projectNavigationFeedback({
        ...idle,
        milestoneCreation: { ...idle.milestoneCreation, nameError: 'Name required' },
      }),
    ).toMatchObject({ error: 'Name required', failureLabel: 'milestoneCreation.failed' });
    expect(projectNavigationFeedback(idle)).toEqual({
      error: '',
      savingLabel: 'projectSave.saving',
      failureLabel: 'projectSave.failed',
    });
  });
});
