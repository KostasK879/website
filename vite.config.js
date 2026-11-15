import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  // The SSR bundle is only an input to scripts/prerender.mjs. Keep it out of dist
  // so Vercel does not publish it, and bundle deps so Node can import the result.
  publicDir: isSsrBuild ? false : 'public',
  ssr: isSsrBuild ? { noExternal: true } : undefined,
  build: isSsrBuild ? { outDir: 'ssr-dist', emptyOutDir: true } : undefined,
}));
