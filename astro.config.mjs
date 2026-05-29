// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import { devAuthoring, stripDevIslands } from './dev/authoring-plugin.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://viniths.github.io',
  integrations: [svelte()],
  // Dev-only authoring endpoints (/__dev/tweet, /__dev/album). The plugin
  // uses apply: "serve", so it's active only under `astro dev` and never
  // bundled into the static build. The UI that calls it is import.meta.env.DEV
  // gated, so it's dead-code-stripped from production too.
  vite: {
    plugins: [devAuthoring(), stripDevIslands()],
  },
  // The writing section moved from /blog to /ledger. Preserve inbound links
  // to the known old paths — in a static build these become small
  // meta-refresh redirect pages, so shared /blog links don't 404.
  redirects: {
    '/blog': '/ledger',
    '/blog/hello-world': '/ledger/hello-world',
    '/blog/acr-tui': '/ledger/acr-tui',
    '/blog/crest-prototypes': '/ledger/crest-prototypes',
    '/blog/stamp-prototypes': '/ledger/stamp-prototypes',
    '/blog/display-prototypes': '/ledger/display-prototypes',
  },
});