import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Web deployments (Vercel/Cloudflare Pages) need an ABSOLUTE root base path.
  // Capacitor (Android) needs a RELATIVE one since it's served from a custom
  // scheme, not a domain root. Using './' for the normal web build was a real
  // bug: any non-root navigation (refreshing /deposit, or landing on
  // /auth/callback after Google sign-in) resolves './assets/...' relative to
  // THAT path instead of the site root, 404s on every JS/CSS file, and the
  // page goes blank — nothing but the <body> background color shows, because
  // the bundle never loaded. Run `npm run build:capacitor` for the Android
  // target; plain `npm run build` (what Vercel/Cloudflare Pages run) stays
  // absolute.
  base: mode === 'capacitor' ? './' : '/',
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: false }
}));
