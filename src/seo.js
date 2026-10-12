// Per-route SEO metadata. Shared by the app (client-side head updates)
// and scripts/prerender.mjs (static HTML per route for social crawlers).
export const SITE_URL = 'https://nodusai.io';
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
export const OG_IMAGE_ALT = 'NODUS AI logo on a dark background: AI automation for Kent businesses';

export const ROUTES = {
  home: {
    path: '/',
    title: 'NODUS AI | AI Automation for Kent Businesses',
    description: 'AI receptionists, missed-call text-back and booking bots for Kent trade and waste removal businesses, so missed calls stop costing you jobs.',
  },
  about: {
    path: '/about',
    title: 'About NODUS AI | AI Automation Agency in Kent',
    description: 'NODUS AI is an AI automation agency based in Chatham, Kent, building practical systems for UK trade and service businesses.',
  },
  services: {
    path: '/services',
    title: 'AI Receptionists & Automation Services | NODUS AI',
    description: 'AI receptionists, missed-call text-back, quote and booking bots, and workflow automation for Kent trades and waste removal firms.',
  },
  work: {
    path: '/work',
    title: 'Our Work & Live Demos | NODUS AI',
    description: 'See NODUS AI systems in action. Case studies are in preparation, so book a live demo built for a business like yours in Kent or the UK.',
  },
  contact: {
    path: '/contact',
    title: 'Contact NODUS AI | Book a Demo in Kent & the UK',
    description: 'Talk to NODUS AI about an AI receptionist, booking bot or workflow automation for your business. Based in Kent. Email hello@nodusai.io.',
  },
};

export const NOT_FOUND = {
  title: 'Page Not Found | NODUS AI',
  description: ROUTES.home.description,
};

export const canonicalFor = path => `${SITE_URL}${path === '/' ? '/' : path}`;
