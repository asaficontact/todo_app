import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl()],
  base: './',
  build: {
    target: 'esnext',
    // T122: Split heavy vendor libs into separate chunks for parallel download
    // and to keep individual chunk sizes under the 500KB warning threshold
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
          postprocessing: ['postprocessing'],
        },
      },
    },
  },
});
