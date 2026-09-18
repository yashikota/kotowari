const ROWS: { keys: string; action: string }[] = [
  { keys: 'Mod+K', action: 'Command palette' },
  { keys: 'Ctrl/⌘+Enter', action: 'Send or create from a text field' },
  { keys: 'Enter (text)', action: 'Insert a line' },
  { keys: 'c', action: 'Create issue' },
  { keys: 'p', action: 'Create ADR' },
  { keys: '/', action: 'Find in the current list' },
  { keys: 'j / k', action: 'Move selection' },
  { keys: 'Enter', action: 'Open selected issue' },
  { keys: 's', action: 'Set status' },
  { keys: '1–4', action: 'Set priority' },
  { keys: 'Esc', action: 'Close dialogs' },
  { keys: '?', action: 'This help' },
];

import { PresenterScope, useActions } from '../application/Root.tsx';
import { useShortcutHelpPresenter } from '../presenters/ShortcutHelp.tsx';
export function ShortcutHelpView({
  model,
}: {
  model: ReturnType<typeof useShortcutHelpPresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { handlers } = model;
      return (
        <div className="overlay" onClick={handlers.onClick0}>
          <div
            className="dialog help-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            onClick={handlers.Keyboard_shortcuts_onClick1}
          >
            <div className="help-head">
              <h2>Keyboard</h2>
              <button type="button" className="ghost" onClick={handlers.onClick2}>
                Close
              </button>
            </div>
            <dl className="help-list">
              {ROWS.map((row) => (
                <div key={row.keys} className="help-row">
                  <dt>
                    <span className="kbd">{row.keys}</span>
                  </dt>
                  <dd>{row.action}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      );
    }
  }
}
export function ShortcutHelp(props: Parameters<typeof useShortcutHelpPresenter>[0]) {
  return (
    <PresenterScope name="ShortcutHelp">
      <ShortcutHelpBinding {...props} />
    </PresenterScope>
  );
}
function ShortcutHelpBinding(props: Parameters<typeof useShortcutHelpPresenter>[0]) {
  const model = useShortcutHelpPresenter(props);
  const handlers = useActions(model.handlers);
  return <ShortcutHelpView model={{ ...model, handlers } as typeof model} />;
}
