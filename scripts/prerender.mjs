// Post-build: write dist/<route>/index.html for each sitemap route with that
// route's meta tags and the server-rendered page (headings, copy, links).
// Vercel serves those files directly. Unknown paths fall through to dist/404.html,
// which is a real 404 (no catch-all rewrite to index.html).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTES, NOT_FOUND, canonicalFor } from '../src/seo.js';
import { render } from '../ssr-dist/entry-server.js';

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

const stripTag = (html, tagRe) => {
  const out = html.replace(tagRe, '');
  if (out === html) throw new Error(`prerender: expected to remove ${tagRe}`);
  return out;
};

const applyHead = (html, { title, description, url, robots }) => {
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  out = setAttr(out, /<meta name="description"[^>]*>/g, 'content', description);
  out = setAttr(out, /<meta property="og:title"[^>]*>/g, 'content', title);
  out = setAttr(out, /<meta property="og:description"[^>]*>/g, 'content', description);
  out = setAttr(out, /<meta name="twitter:title"[^>]*>/g, 'content', title);
  out = setAttr(out, /<meta name="twitter:description"[^>]*>/g, 'content', description);
  if (url) {
    out = setAttr(out, /<link rel="canonical"[^>]*>/g, 'href', url);
    out = setAttr(out, /<meta property="og:url"[^>]*>/g, 'content', url);
    out = setAttr(out, /<meta name="twitter:url"[^>]*>/g, 'content', url);
  }
  if (robots) out = setAttr(out, /<meta name="robots"[^>]*>/g, 'content', robots);
  return out;
};

const applyJsonLd = (html, mutate) => html.replace(
  /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
  (_, open, json, close) => {
    const data = JSON.parse(json);
    mutate(data);
    return `${open}\n${JSON.stringify(data, null, 2).replace(/</g, '\\u003c')}\n  ${close}`;
  },
);

const injectBody = (html, body) => {
  const token = '<div id="root"></div>';
  if (!html.includes(token)) throw new Error('prerender: root placeholder missing from template');
  if (!body || !body.includes('<')) throw new Error('prerender: render() returned empty markup');
  return html.replace(token, `<div id="root">${body}</div>`);
};

const h1Markup = html => html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/g) || [];

const assertRoute = (html, { path, h1, snippets }) => {
  if (html.includes('<div id="root"></div>')) throw new Error(`prerender: empty root for ${path}`);
  const h1s = h1Markup(html);
  if (h1s.length !== 1) throw new Error(`prerender: expected 1 h1 on ${path}, got ${h1s.length}`);
  const h1Text = h1s[0]
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  const labelled = h1s[0].includes(`aria-label="${h1}"`) || h1Text.includes(h1);
  if (!labelled) throw new Error(`prerender: h1 on ${path} missing "${h1}". Got: ${h1Text.slice(0, 180)}`);
  for (const snippet of snippets) {
    if (!html.includes(snippet)) throw new Error(`prerender: ${path} missing ${JSON.stringify(snippet)}`);
  }
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  const data = JSON.parse(ld[1]);
  const org = data['@graph'].find(n => n['@type'] === 'ProfessionalService');
  if (!org) throw new Error(`prerender: ${path} JSON-LD is not a ProfessionalService`);
  for (const key of ['name', 'legalName', 'url', 'logo', 'email']) {
    if (!org[key]) throw new Error(`prerender: ${path} JSON-LD missing ${key}`);
  }
  if (org.areaServed !== 'United Kingdom') throw new Error(`prerender: ${path} areaServed is ${JSON.stringify(org.areaServed)}`);
  if (org.address || org.telephone || org.sameAs) throw new Error(`prerender: ${path} JSON-LD still has address, telephone, or sameAs`);
  if (/addressLocality|addressRegion|"address"/.test(ld[1])) throw new Error(`prerender: ${path} JSON-LD still contains an address`);
};

const EXPECTED = {
  '/': {
    h1: 'Automate the Impossible.',
    snippets: ['We design and build AI automation systems', 'href="/services"', 'href="/contact"', 'class="sr-only"'],
  },
  '/about': {
    h1: 'We find the critical',
    snippets: ['boutique AI automation practice', 'href="/contact"'],
  },
  '/services': {
    h1: 'Systems that work',
    snippets: ['Workflow Automation', 'href="/contact"'],
  },
  '/work': {
    h1: 'Case studies.',
    snippets: ['Swift Clear', 'https://swift-clear.vercel.app', 'not a paying client engagement', 'Book a Demo', 'Detailed case studies are in preparation'],
  },
  '/contact': {
    h1: "Let's talk.",
    snippets: ['hello@nodusai.io', 'href="/about"', 'What size companies do you work with?'],
  },
};

for (const r of Object.values(ROUTES)) {
  const url = canonicalFor(r.path);
  let html = applyHead(template, { title: r.title, description: r.description, url });
  html = applyJsonLd(html, data => {
    const page = data['@graph'].find(n => n['@type'] === 'WebPage');
    if (!page) throw new Error('prerender: WebPage node missing');
    Object.assign(page, { '@id': `${url}#webpage`, url, name: r.title, description: r.description });
  });
  html = injectBody(html, render(r.path));
  if (!html.includes(`<title>${esc(r.title)}</title>`)) throw new Error(`prerender: title not set for ${r.path}`);
  if (!html.includes(`href="${url}"`) || !html.includes('content="index, follow"')) {
    throw new Error(`prerender: meta not intact for ${r.path}`);
  }
  assertRoute(html, { path: r.path, ...EXPECTED[r.path] });
  const file = r.path === '/' ? join(dist, 'index.html') : join(dist, r.path.slice(1), 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
  console.log(`prerender: ${r.path} -> ${file.slice(dist.length + 1)}  "${r.title}"`);
}

let notFound = applyHead(template, {
  title: NOT_FOUND.title,
  description: NOT_FOUND.description,
  robots: 'noindex, follow',
});
notFound = stripTag(notFound, /\s*<link rel="canonical"[^>]*>/);
notFound = stripTag(notFound, /\s*<meta property="og:url"[^>]*>/);
notFound = stripTag(notFound, /\s*<meta name="twitter:url"[^>]*>/);
notFound = applyJsonLd(notFound, data => {
  data['@graph'] = data['@graph'].filter(n => n['@type'] !== 'WebPage');
});
notFound = injectBody(notFound, render('/this-page-does-not-exist'));
assertRoute(notFound, {
  path: '/404',
  h1: 'Page not found.',
  snippets: ['Back to home', 'content="noindex, follow"'],
});
if (/<link rel="canonical"/i.test(notFound) || notFound.includes('content="index, follow"') || notFound.includes('https://nodusai.io/#webpage')) {
  throw new Error('prerender: 404 still exposes index/follow, a canonical, or the homepage WebPage node');
}
await writeFile(join(dist, '404.html'), notFound);
console.log('prerender: 404 -> 404.html  "Page Not Found | NODUS AI"');
