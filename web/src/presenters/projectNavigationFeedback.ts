type Removal = { pending: boolean; confirmed: boolean };
type Model = {
  deletion: Removal;
  milestoneRemoval: Removal;
  dependencyChanges: Removal & { action: 'add' | 'remove'; error: string };
  milestoneCreation: { pending: boolean; created: boolean; error: string; nameError: string };
  milestoneEdits: { pending: boolean; error: string };
  projectSaving: boolean;
  projectSaveError: string;
};

/** Keep the operation label and failure description aligned across navigation states. */
export function projectNavigationFeedback(model: Model) {
  const operations = [
    {
      pending: model.deletion.pending,
      key: model.deletion.confirmed ? 'projectDeletion.opening' : 'projectDeletion.deleting',
    },
    {
      pending: model.milestoneRemoval.pending,
      key: model.milestoneRemoval.confirmed
        ? 'milestoneDeletion.refreshing'
        : 'milestoneDeletion.deleting',
    },
    {
      pending: model.dependencyChanges.pending,
      key: model.dependencyChanges.confirmed
        ? 'dependencySave.refreshing'
        : model.dependencyChanges.action === 'add'
          ? 'dependencySave.adding'
          : 'dependencySave.removing',
    },
    {
      pending: model.milestoneCreation.pending,
      key: model.milestoneCreation.created
        ? 'milestoneCreation.refreshing'
        : 'milestoneCreation.creating',
    },
    { pending: model.milestoneEdits.pending, key: 'milestoneSave.saving' },
    { pending: model.projectSaving, key: 'projectSave.saving' },
  ];
  const failures = [
    { error: model.projectSaveError, key: 'projectSave.failed' },
    { error: model.milestoneEdits.error, key: 'milestoneSave.failed' },
    {
      error: model.milestoneCreation.error || model.milestoneCreation.nameError,
      key: model.milestoneCreation.created
        ? 'milestoneCreation.refreshFailed'
        : 'milestoneCreation.failed',
    },
    {
      error: model.dependencyChanges.error,
      key: model.dependencyChanges.confirmed
        ? 'dependencySave.refreshFailed'
        : 'dependencySave.failed',
    },
  ];
  const failure = failures.find((item) => item.error);
  return {
    savingLabel: operations.find((item) => item.pending)?.key ?? 'projectSave.saving',
    failureLabel: failure?.key ?? 'projectSave.failed',
    error: failure?.error ?? '',
  };
}
