import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Forge serves this directory as the `main` resource. Keep the existing output
// contract so the bundler change is isolated from the app manifest and runtime.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'build',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});
