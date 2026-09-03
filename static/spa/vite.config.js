import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';

const allowedEnvironments = new Set(['local', 'ci', 'development', 'staging', 'production']);

function gitOutput(args) {
  return execFileSync('git', args, {
    cwd: new URL('../..', import.meta.url),
    encoding: 'utf8',
  }).trim();
}

function buildIdentity() {
  const environment = process.env.VITE_ENVIRONMENT_TYPE || (process.env.CI ? 'ci' : 'local');
  const commit = process.env.VITE_APP_COMMIT || gitOutput(['rev-parse', 'HEAD']);
  const dirty = gitOutput(['status', '--porcelain']).length > 0;
  const requestedVersion = process.env.VITE_APP_VERSION || 'unreleased';
  const version = dirty && environment === 'local' ? `${requestedVersion}-dirty` : requestedVersion;

  if (!allowedEnvironments.has(environment)) throw new Error('Invalid VITE_ENVIRONMENT_TYPE');
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('VITE_APP_COMMIT must be an exact commit SHA');
  if ((environment === 'staging' || environment === 'production') && dirty) {
    throw new Error(`${environment} builds require a clean checkout`);
  }
  if (environment === 'production' && requestedVersion === 'unreleased') {
    throw new Error('Production builds require VITE_APP_VERSION');
  }
  return { environment, commit, version };
}

// Forge serves this directory as the `main` resource. Keep the existing output
// contract so the bundler change is isolated from the app manifest and runtime.
export default defineConfig(() => {
  const identity = buildIdentity();
  return {
    base: './',
    plugins: [react()],
    define: {
      'import.meta.env.VITE_APP_COMMIT': JSON.stringify(identity.commit),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(identity.version),
      'import.meta.env.VITE_ENVIRONMENT_TYPE': JSON.stringify(identity.environment),
    },
    build: {
      outDir: 'build',
      emptyOutDir: true,
    },
    server: {
      port: 3000,
      strictPort: true,
    },
  };
});
