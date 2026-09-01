import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8'),
);

describe('operational contracts', () => {
  it('preserves the existing Forge identity, resource, scope, and runtime', () => {
    const manifest = YAML.parse(fs.readFileSync(path.join(repositoryRoot, 'manifest.yml'), 'utf8'));
    const macro = manifest.modules.macro.find(({ key }) => key === 'whiteboard');
    const resource = manifest.resources.find(({ key }) => key === 'main');

    expect(manifest.app.id).toBe(
      'ari:cloud:ecosystem::app/368b610d-bac1-4e2a-9311-6ec0adca5e49',
    );
    expect(manifest.app.runtime.name).toBe('nodejs22.x');
    expect(manifest.modules.macro.map(({ key }) => key)).toEqual(['whiteboard']);
    expect(macro).toMatchObject({ key: 'whiteboard', resource: 'main' });
    expect(resource).toEqual({
      key: 'main',
      path: 'static/spa/build',
      tunnel: { port: 3000 },
    });
    expect(manifest.permissions.scopes).toEqual(['storage:app']);
  });

  it('keeps the root validation sequence and separate Forge lint command', () => {
    const rootPackage = readJson('package.json');

    expect(rootPackage.packageManager).toBe('pnpm@10.34.5');
    expect(rootPackage.volta.node).toBe('22.22.3');
    expect(rootPackage.scripts.validate).toBe(
      'pnpm lint && pnpm test:unit && pnpm build:whiteboard && pnpm validate:resource-output && pnpm validate:manifest && pnpm test:e2e:list',
    );
    expect(rootPackage.scripts.validate).not.toContain('forge:lint');
    expect(rootPackage.scripts['forge:lint']).toBe('forge lint');
  });

  it('pins the Whiteboard runtime and Vite build boundary', () => {
    const spaPackage = readJson('static/spa/package.json');

    expect(spaPackage.homepage).toBe('.');
    expect(spaPackage.dependencies['@tldraw/tldraw']).toBe('1.26.2');
    expect(spaPackage.dependencies.react).toBe('18.2.0');
    expect(spaPackage.dependencies['react-dom']).toBe('18.2.0');
    expect(spaPackage.devDependencies.vite).toBe('7.2.2');
    expect(spaPackage.devDependencies['@vitejs/plugin-react']).toBe('5.2.0');
    expect(spaPackage.devDependencies['react-scripts']).toBeUndefined();
  });

  it('keeps the Forge entrypoint free of JSX that its packager cannot parse', () => {
    const source = fs.readFileSync(path.join(repositoryRoot, 'src/index.js'), 'utf8');

    expect(source).not.toMatch(/<\/?[A-Z][A-Za-z0-9.]*/u);
    expect(source).toContain('ForgeUI.createElement');
  });
});
