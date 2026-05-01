import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [react()],
  image: {
    // Use sharp for image optimization (already installed via Astro)
    service: { entrypoint: 'astro/assets/services/sharp' },
    // Cache optimized images for 1 year
    cacheDir: './.cache/image'
  }
});
