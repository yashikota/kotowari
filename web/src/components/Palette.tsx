import { PresenterScope, useActions } from '../application/Root.tsx';
import { usePalettePresenter } from '../presenters/Palette.tsx';
export function PaletteView({ model }: { model: ReturnType<typeof usePalettePresenter> }) {
  switch (model._view) {
    case 0: {
      const { query, commands, active, handlers } = model;
      return (
        <div className="overlay" onClick={handlers.onClick0}>
          <div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={handlers.Command_palette_onClick1}
          >
            <input
              autoFocus
              aria-label="Command search"
              placeholder="Type a command or search…"
              value={query}
              onChange={handlers.Command_search_onChange2}
              onKeyDown={handlers.Command_search_onKeyDown3}
            />
            <div className="palette-list" role="listbox">
              {commands.map((c, i) => (
                <button
                  type="button"
                  key={c.id + i}
                  role="option"
                  aria-selected={i === active}
                  className={`palette-item ${i === active ? 'active' : ''}`}
                  onMouseEnter={() => handlers.onMouseEnter4(i)}
                  onClick={() => handlers.onClick5(c)}
                >
                  <span>{c.title}</span>
                  {c.hint ? <span className="kbd">{c.hint}</span> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }
}
export function Palette(props: Parameters<typeof usePalettePresenter>[0]) {
  return (
    <PresenterScope name="Palette">
      <PaletteBinding {...props} />
    </PresenterScope>
  );
}
function PaletteBinding(props: Parameters<typeof usePalettePresenter>[0]) {
  const model = usePalettePresenter(props);
  const handlers = useActions(model.handlers);
  return <PaletteView model={{ ...model, handlers } as typeof model} />;
}
