import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const validatorPath = path.join(repositoryRoot, 'scripts/validate-forge-manifest.mjs');

const runValidator = (manifestPath) => spawnSync(
  process.execPath,
  [validatorPath, manifestPath],
  {
    cwd: path.dirname(manifestPath),
    encoding: 'utf8',
    env: {
      ...process.env,
      FORGE_EMAIL: '',
      FORGE_API_TOKEN: '',
    },
  },
);

describe('Forge manifest validation command', () => {
  it('passes the repository manifest when validation has warnings but no errors', () => {
    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'tldraw-forge-manifest-valid-'),
    );
    const manifestFixturePath = path.join(temporaryDirectory, 'manifest.yml');
    fs.copyFileSync(path.join(repositoryRoot, 'manifest.yml'), manifestFixturePath);
    fs.mkdirSync(path.join(temporaryDirectory, 'static/spa/build'), { recursive: true });
    fs.writeFileSync(
      path.join(temporaryDirectory, 'static/spa/build/index.html'),
      '<!doctype html><html><body></body></html>\n',
      'utf8',
    );
    fs.mkdirSync(path.join(temporaryDirectory, 'src'), { recursive: true });
    fs.copyFileSync(
      path.join(repositoryRoot, 'src/index.js'),
      path.join(temporaryDirectory, 'src/index.js'),
    );

    try {
      const result = runValidator(manifestFixturePath);
      const output = `${result.stdout}${result.stderr}`;

      expect(result.status, output).toBe(0);
      expect(output).toMatch(/Forge manifest validation: 0 error\(s\), \d+ warning\(s\)/);
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('fails an invalid manifest and reports validation errors', () => {
    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'tldraw-forge-manifest-'),
    );
    const invalidManifestPath = path.join(temporaryDirectory, 'manifest.yml');
    fs.writeFileSync(invalidManifestPath, 'app:\n  id: not-an-app-ari\n', 'utf8');

    try {
      const result = runValidator(invalidManifestPath);
      const output = `${result.stdout}${result.stderr}`;

      expect(result.status, output).not.toBe(0);
      expect(output).toContain('[error]');
      expect(output).toMatch(/Forge manifest validation: [1-9]\d* error\(s\), \d+ warning\(s\)/);
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
