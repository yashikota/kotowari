import { Link } from '@tanstack/react-router';
import { PresenterScope, useActions } from '../application/Root.tsx';
import { AIPanel } from '../components/AIPanel.tsx';
import { DocumentEditor } from '../components/DocumentEditor.tsx';
import { usePageDetailPagePresenter, usePagesPagePresenter } from '../presenters/PagesPages.tsx';
import type { Page } from '../types.ts';
import { PAGE_STATUSES } from '../types.ts';
function pageDepth(pages: Page[], page: Page): number {
  let depth = 0;
  let parentId = page.parentId;
  const byId = new Map(pages.map((p) => [p.id, p]));
  const seen = new Set<number>();
  while (parentId) {
    if (seen.has(parentId)) {
      break;
    }
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) {
      break;
    }
    depth += 1;
    parentId = parent.parentId;
  }
  return depth;
}
export function PagesPageView({ model }: { model: ReturnType<typeof usePagesPagePresenter> }) {
  switch (model._view) {
    case 0: {
      const { pages } = model;
      return (
        <div className="main single">
          <section className="pane">
            <div className="pane-head">
              <h1>Pages</h1>
              <span className="muted">Memos</span>
            </div>
            {pages.length === 0 ? (
              <div className="empty">No pages. Use the command palette to create one.</div>
            ) : (
              <div className="list">
                {pages.map((p) => (
                  <Link
                    className="row"
                    key={p.slug}
                    to="/pages/$slug"
                    params={{ slug: p.slug }}
                    style={{ paddingLeft: 12 + pageDepth(pages, p) * 16 }}
                  >
                    <span className="rail" />
                    <span className="ident">{p.status}</span>
                    <span>{p.title}</span>
                    <span className="badge">{p.slug}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      );
    }
  }
}
export function PagesPage() {
  return (
    <PresenterScope name="PagesPage">
      <PagesPageBinding />
    </PresenterScope>
  );
}
function PagesPageBinding() {
  const model = usePagesPagePresenter();
  const handlers = useActions(model.handlers);
  return <PagesPageView model={{ ...model, handlers } as typeof model} />;
}

export function PageDetailPageView({
  model,
}: {
  model: ReturnType<typeof usePageDetailPagePresenter>;
}) {
  switch (model._view) {
    case 0: {
      const { slug, page, pages, projects, tagDraft, handlers } = model;
      return (
        <div className="main single">
          <section className="pane">
            <div className="pane-head">
              <h1>{page.slug}</h1>
              <select
                className="field"
                aria-label="Page status"
                value={page.status}
                onChange={handlers.Page_status_onChange0}
              >
                {PAGE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button type="button" className="ghost danger" onClick={handlers.onClick1}>
                Delete
              </button>
            </div>
            <div className="detail">
              <input
                className="title-input"
                aria-label="Page title"
                value={page.title}
                onChange={handlers.Page_title_onChange2}
                onBlur={handlers.Page_title_onBlur3}
              />
              <div className="props">
                <label>
                  <span className="sr-only">Parent page</span>
                  <select
                    aria-label="Parent page"
                    value={page.parentId ?? ''}
                    onChange={handlers.Parent_page_onChange4}
                  >
                    <option value="">No parent</option>
                    {pages
                      .filter((p) => p.slug !== slug)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Project</span>
                  <select
                    aria-label="Page project"
                    value={page.projectId ?? ''}
                    onChange={handlers.Page_project_onChange5}
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Document date</span>
                  <input
                    type="date"
                    aria-label="Document date"
                    value={page.date?.slice(0, 10) ?? ''}
                    onChange={handlers.Document_date_onChange6}
                  />
                </label>
              </div>
              <input
                className="field"
                aria-label="Tags"
                placeholder="tags, comma separated"
                value={tagDraft}
                onChange={handlers.Tags_onChange7}
                onBlur={handlers.Tags_onBlur8}
              />
              <AIPanel kind="pages" id={slug} />
              <DocumentEditor documentKey={`pages/${slug}/body`} />
            </div>
          </section>
        </div>
      );
    }
  }
}
export function PageDetailPage() {
  return (
    <PresenterScope name="PageDetailPage">
      <PageDetailPageBinding />
    </PresenterScope>
  );
}
function PageDetailPageBinding() {
  const model = usePageDetailPagePresenter();
  const handlers = useActions(model.handlers);
  return <PageDetailPageView model={{ ...model, handlers } as typeof model} />;
}
