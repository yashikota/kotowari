import MarkdownIt from 'markdown-it';

export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function render(src: string, assetBase = '', headingPrefix = ''): string {
  const md = new MarkdownIt({ html: false, breaks: true, linkify: true });
  md.enable('table');
  const image = md.renderer.rules.image!;
  const link = md.renderer.rules.link_open;
  const fence = md.renderer.rules.fence!;
  const used = new Map<string, number>();
  md.renderer.rules.heading_open = (tokens, idx, options, _env, renderer) => {
    const slug =
      (tokens[idx + 1]?.content ?? '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-|-$/g, '') || 'section';
    const count = used.get(slug) ?? 0;
    used.set(slug, count + 1);
    tokens[idx]!.attrSet('id', `${headingPrefix}${slug}${count ? `-${count}` : ''}`);
    return renderer.renderToken(tokens, idx, options);
  };
  const assetURL = (url: string) =>
    assetBase && /^(?:\.\/)?assets\//.test(url) ? `${assetBase}${url.replace(/^\.\//, '')}` : url;
  md.renderer.rules.image = (tokens, idx, options, env, renderer) => {
    const token = tokens[idx]!;
    const src = assetURL(String(token.attrGet('src') ?? ''));
    token.attrSet('src', src);
    if (assetBase && src.startsWith(`${assetBase}assets/`) && /\.html?(?:[?#]|$)/i.test(src)) {
      return `<figure class="html-figure"><iframe sandbox="" title="${escapeHtml(token.content || 'Document diagram')}" src="${escapeHtml(src)}" loading="lazy"></iframe><figcaption>${escapeHtml(token.content)}</figcaption></figure>`;
    }
    return image(tokens, idx, options, env, renderer);
  };
  md.renderer.rules.link_open = (tokens, idx, options, env, renderer) => {
    const token = tokens[idx]!;
    let href = assetURL(String(token.attrGet('href') ?? ''));
    if (href.startsWith('#')) href = `#${headingPrefix}${href.slice(1)}`;
    token.attrSet('href', href);
    token.attrSet('rel', 'noreferrer');
    return link
      ? link(tokens, idx, options, env, renderer)
      : renderer.renderToken(tokens, idx, options);
  };
  md.renderer.rules.fence = (tokens, idx, options, env, renderer) => {
    const token = tokens[idx]!;
    if (token.info.trim() === 'html-diagram') {
      const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">`;
      return `<figure class="html-figure"><iframe sandbox="" title="Document diagram" srcdoc="${escapeHtml(csp + token.content)}"></iframe></figure>`;
    }
    return fence(tokens, idx, options, env, renderer);
  };
  return md.render(src);
}

const rendered = new Map<string, string>();
let retained = 0;
export function renderMarkdown(src: string, assetBase = '', headingPrefix = ''): string {
  const key = JSON.stringify([src, assetBase, headingPrefix]);
  const hit = rendered.get(key);
  if (hit !== undefined) return hit;
  const html = render(src, assetBase, headingPrefix);
  if (key.length + html.length <= 500_000) {
    while (rendered.size >= 64 || retained + key.length + html.length > 2_000_000) {
      const oldest = rendered.entries().next().value;
      if (!oldest) break;
      retained -= oldest[0].length + oldest[1].length;
      rendered.delete(oldest[0]);
    }
    rendered.set(key, html);
    retained += key.length + html.length;
  }
  return html;
}
