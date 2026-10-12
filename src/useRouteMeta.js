import { useEffect } from 'react';
import { ROUTES, NOT_FOUND, OG_IMAGE, OG_IMAGE_ALT, canonicalFor } from './seo.js';

// Find or create a <meta>/<link> in <head> and set one attribute on it.
const upsert = (tag, keyAttr, keyVal, attr, val) => {
  let el = document.head.querySelector(`${tag}[${keyAttr}="${keyVal}"]`);
  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(keyAttr, keyVal);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, val);
};

// Keep title, description, canonical, Open Graph and X tags in sync with the current route.
export default function useRouteMeta(page, pathname) {
  useEffect(() => {
    const r = ROUTES[page];
    const { title, description } = r || NOT_FOUND;
    const url = canonicalFor(r ? r.path : pathname);
    document.title = title;
    upsert('meta', 'name', 'description', 'content', description);
    upsert('meta', 'name', 'robots', 'content', r ? 'index, follow' : 'noindex, follow');
    upsert('link', 'rel', 'canonical', 'href', url);
    upsert('meta', 'property', 'og:title', 'content', title);
    upsert('meta', 'property', 'og:description', 'content', description);
    upsert('meta', 'property', 'og:url', 'content', url);
    upsert('meta', 'property', 'og:image', 'content', OG_IMAGE);
    upsert('meta', 'property', 'og:image:alt', 'content', OG_IMAGE_ALT);
    upsert('meta', 'name', 'twitter:title', 'content', title);
    upsert('meta', 'name', 'twitter:description', 'content', description);
    upsert('meta', 'name', 'twitter:image', 'content', OG_IMAGE);
    upsert('meta', 'name', 'twitter:image:alt', 'content', OG_IMAGE_ALT);
  }, [page, pathname]);
}
