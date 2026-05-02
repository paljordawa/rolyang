import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [react()],
  session: {
    driver: 'memory'
  },

  image: {
    // Use sharp for image optimization (already installed via Astro)
    service: { entrypoint: 'astro/assets/services/sharp' },
    // Cache optimized images for 1 year
    cacheDir: './.cache/image'
  },

  vite: {
    plugins: [tailwindcss()]
  }
});