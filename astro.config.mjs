// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  site: 'https://viniths.github.io',
  integrations: [svelte()],
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