// Per-route SEO metadata. Shared by the app (client-side head updates)
// and scripts/prerender.mjs (static HTML per route for social crawlers).
export const SITE_URL = 'https://nodusai.io';
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
export const OG_IMAGE_ALT = 'NODUS AI: AI receptionists for UK trade and service businesses';

export const ROUTES = {
  home: {
    path: '/',
    title: 'NODUS AI | AI Receptionists for UK Trade Businesses',
    description: 'NODUS AI builds AI receptionists for UK trade and service businesses. They answer every call, quote and book jobs, and text you the details.',
  },
  about: {
    path: '/about',
    title: 'About NODUS AI | AI Receptionists for UK Trades',
    description: 'NODUS AI is a UK practice building AI receptionists, missed-call text-back and booking bots for trade and service businesses.',
  },
  services: {
    path: '/services',
    title: 'AI Receptionist, Text-back & Booking Bots | NODUS AI',
    description: 'AI receptionists, missed-call text-back, and quote and booking bots for UK trades, plus workflow automation for the work around the call.',
  },
  work: {
    path: '/work',
    title: 'Live AI Receptionist Demos | NODUS AI',
    description: 'See a demo AI receptionist and quote system built for a UK waste-removal firm. Case studies are in preparation. Book a walkthrough.',
  },
  contact: {
    path: '/contact',
    title: 'Contact NODUS AI | Book an AI Receptionist Demo',
    description: 'Talk to NODUS AI about an AI receptionist, missed-call text-back or booking bot for your UK trade or service business. Email hello@nodusai.io.',
  },
};

export const NOT_FOUND = {
  title: 'Page Not Found | NODUS AI',
  description: 'This page does not exist. NODUS AI builds AI receptionists for UK trade and service businesses.',
};

export const canonicalFor = path => `${SITE_URL}${path === '/' ? '/' : path}`;
