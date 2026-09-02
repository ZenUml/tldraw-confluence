import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8'),
);

describe('WP2 operational contracts', () => {
  it('preserves the existing Forge identity, resource, scope, and runtime', () => {
    const manifest = YAML.parse(fs.readFileSync(path.join(repositoryRoot, 'manifest.yml'), 'utf8'));
    const macro = manifest.modules.macro.find(({ key }) => key === 'whiteboard');
    const resource = manifest.resources.find(({ key }) => key === 'main');

    expect(manifest.app.id).toBe(
      'ari:cloud:ecosystem::app/368b610d-bac1-4e2a-9311-6ec0adca5e49',
    );
    expect(manifest.app.runtime.name).toBe('nodejs22.x');
    expect(manifest.modules.macro.map(({ key }) => key)).toEqual(['whiteboard']);
    expect(macro).toMatchObject({
      key: 'whiteboard',
      resource: 'main',
      title: 'Whiteboard for Confluence',
    });
    expect(resource).toEqual({
      key: 'main',
      path: 'static/spa/build',
      tunnel: { port: 3000 },
    });
    expect(manifest.permissions.scopes).toEqual(['storage:app']);
    expect(manifest.app.storage.entities).toEqual([
      {
        name: 'whiteboard-state',
        attributes: {
          schemaVersion: { type: 'integer' },
          revision: { type: 'integer' },
          state: { type: 'string' },
          currentToken: { type: 'string' },
          expectedToken: { type: 'string' },
          candidateToken: { type: 'string' },
          writeId: { type: 'string' },
          compressedJson: { type: 'string' },
        },
      },
    ]);
  });

  it('keeps the root validation sequence and separate Forge lint command', () => {
    const rootPackage = readJson('package.json');

    expect(rootPackage.packageManager).toBe('pnpm@10.34.5');
    expect(rootPackage.volta.node).toBe('22.22.3');
    expect(rootPackage.scripts.validate).toBe(
      'pnpm lint && pnpm test:unit && pnpm build:whiteboard && pnpm validate:resource-output && pnpm validate:manifest && pnpm test:e2e:list',
    );
    expect(rootPackage.scripts.validate).not.toContain('forge:lint');
    expect(rootPackage.scripts['build:codec']).toBe(
      'pnpm --filter @zenuml/whiteboard-codec build',
    );
    expect(rootPackage.scripts['forge:lint']).toBe('pnpm build:codec && forge lint');
    for (const command of [
      'test:unit',
      'build:whiteboard',
      'forge:lint',
      'start:whiteboard',
      'forge:deploy:tldraw:development',
      'forge:deploy:tldraw:staging',
      'forge:deploy:tldraw:prod',
      'forge:tunnel:tldraw',
    ]) {
      expect(rootPackage.scripts[command], `${command} must build codec first`).toMatch(
        /^pnpm build:codec &&/,
      );
    }
  });

  it('pins the Whiteboard runtime and Vite build boundary', () => {
    const rootPackage = readJson('package.json');
    const spaPackage = readJson('static/spa/package.json');
    const workspace = YAML.parse(
      fs.readFileSync(path.join(repositoryRoot, 'pnpm-workspace.yaml'), 'utf8'),
    );
    const codecPackage = readJson('packages/whiteboard-codec/package.json');

    expect(rootPackage.dependencies['@forge/api']).toBe('6.4.3');
    expect(rootPackage.dependencies['@forge/kvs']).toBe('1.2.5');
    expect(rootPackage.dependencies['@zenuml/whiteboard-codec']).toBe('workspace:*');
    expect(workspace.packages).toContain('packages/*');
    expect(codecPackage).toMatchObject({
      name: '@zenuml/whiteboard-codec',
      private: true,
      main: './dist/index.js',
      types: './dist/index.d.ts',
      dependencies: { lzutf8: '0.6.3' },
    });
    expect(spaPackage.homepage).toBe('.');
    expect(spaPackage.dependencies['@zenuml/whiteboard-codec']).toBe('workspace:*');
    expect(spaPackage.dependencies['@tldraw/tldraw']).toBe('1.26.2');
    expect(spaPackage.dependencies.react).toBe('18.2.0');
    expect(spaPackage.dependencies['react-dom']).toBe('18.2.0');
    expect(spaPackage.devDependencies.vite).toBe('7.2.2');
    expect(spaPackage.devDependencies['@vitejs/plugin-react']).toBe('5.2.0');
    expect(spaPackage.devDependencies['react-scripts']).toBeUndefined();
  });

  it('does not expose the unused legacy macro title configuration', () => {
    const manifest = YAML.parse(fs.readFileSync(path.join(repositoryRoot, 'manifest.yml'), 'utf8'));
    const macro = manifest.modules.macro.find(({ key }) => key === 'whiteboard');
    const source = fs.readFileSync(path.join(repositoryRoot, 'src/index.js'), 'utf8');

    expect(macro).not.toHaveProperty('config');
    expect(manifest.modules.function.map(({ key }) => key)).toEqual(['resolver']);
    expect(source).not.toMatch(/<\/?[A-Z][A-Za-z0-9.]*/u);
    expect(source).not.toMatch(/MacroConfig|TextField|export const config|@forge\/ui/u);
  });

  it('removes production-selectable mocks and exposes privacy-safe build identity', () => {
    const index = fs.readFileSync(path.join(repositoryRoot, 'static/spa/src/index.jsx'), 'utf8');
    const debug = fs.readFileSync(
      path.join(repositoryRoot, 'static/spa/src/Debug/Debug.jsx'),
      'utf8',
    );
    const viteConfig = fs.readFileSync(
      path.join(repositoryRoot, 'static/spa/vite.config.js'),
      'utf8',
    );

    expect(fs.existsSync(path.join(repositoryRoot, 'static/spa/src/MockApp.js'))).toBe(false);
    expect(fs.existsSync(path.join(repositoryRoot, 'static/spa/src/defaultDocument.js'))).toBe(false);
    expect(index).not.toMatch(/localStorage|no-bridge|MockApp/u);
    expect(index).toContain('import.meta.env.DEV && import.meta.env.VITE_WHITEBOARD_FIXTURE');
    expect(debug).toContain('whiteboard-build-identity');
    expect(debug).not.toMatch(/location|host|contentId|branch/u);
    expect(viteConfig).toContain('VITE_APP_COMMIT');
    expect(viteConfig).toContain('VITE_APP_VERSION');
    expect(viteConfig).toContain('VITE_ENVIRONMENT_TYPE');
    expect(viteConfig).toContain('Production builds require VITE_APP_VERSION');
  });
});
