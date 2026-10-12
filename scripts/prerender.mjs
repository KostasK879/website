// Post-build: write dist/<route>/index.html for each route with that route's
// meta tags baked in, so social crawlers (which don't run JS) see the right
// title, description and preview. Vercel serves these before the SPA rewrite.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTES, canonicalFor } from '../src/seo.js';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const template = await readFile(join(dist, 'index.html'), 'utf8');

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Replace the content/href attribute of exactly one matching tag; fail loudly if it's missing.
const setAttr = (html, tagRe, attr, value) => {
  let hits = 0;
  const out = html.replace(tagRe, tag => {
    hits++;
    return tag.replace(new RegExp(`${attr}="[^"]*"`), `${attr}="${esc(value)}"`);
  });
  if (hits !== 1) throw new Error(`prerender: expected 1 match for ${tagRe}, got ${hits}`);
  return out;
};

const render = r => {
  const url = canonicalFor(r.path);
  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(r.title)}</title>`);
  html = setAttr(html, /<meta name="description"[^>]*>/g, 'content', r.description);
  html = setAttr(html, /<link rel="canonical"[^>]*>/g, 'href', url);
  html = setAttr(html, /<meta property="og:url"[^>]*>/g, 'content', url);
  html = setAttr(html, /<meta property="og:title"[^>]*>/g, 'content', r.title);
  html = setAttr(html, /<meta property="og:description"[^>]*>/g, 'content', r.description);
  html = setAttr(html, /<meta name="twitter:url"[^>]*>/g, 'content', url);
  html = setAttr(html, /<meta name="twitter:title"[^>]*>/g, 'content', r.title);
  html = setAttr(html, /<meta name="twitter:description"[^>]*>/g, 'content', r.description);
  // Structured data: point the WebPage node at this route.
  html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (_, open, json, close) => {
    const data = JSON.parse(json);
    const page = data['@graph'].find(n => n['@type'] === 'WebPage');
    Object.assign(page, { '@id': `${url}#webpage`, url, name: r.title, description: r.description });
    return `${open}\n${JSON.stringify(data, null, 2).replace(/</g, '\\u003c')}\n  ${close}`;
  });
  return html;
};

for (const r of Object.values(ROUTES)) {
  const file = r.path === '/' ? join(dist, 'index.html') : join(dist, r.path.slice(1), 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, render(r));
  console.log(`prerender: ${r.path} -> ${file.slice(dist.length + 1)}  "${r.title}"`);
}
