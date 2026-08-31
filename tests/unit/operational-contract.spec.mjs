import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8'),
);

function runResolutionGuardWithFixtureMutation({
  mutateAllowlist = () => {},
  mutateBaseline = () => {},
  mutateLock = () => {},
} = {}) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tldraw-resolution-guard-'));
  try {
    for (const directory of ['scripts', 'tests/fixtures/wp1', 'docs/ops']) {
      fs.mkdirSync(path.join(fixtureRoot, directory), { recursive: true });
    }
    fs.symlinkSync(path.join(repositoryRoot, 'node_modules'), path.join(fixtureRoot, 'node_modules'));

    for (const relativePath of [
      'scripts/check-package-manager-resolutions.mjs',
      'tests/fixtures/wp1/npm-resolution-baseline.json',
      'docs/ops/wp1-package-resolution-allowlist.json',
      'pnpm-lock.yaml',
    ]) {
      fs.copyFileSync(path.join(repositoryRoot, relativePath), path.join(fixtureRoot, relativePath));
    }

    const fixtureBaselinePath = path.join(
      fixtureRoot,
      'tests/fixtures/wp1/npm-resolution-baseline.json',
    );
    const baseline = JSON.parse(fs.readFileSync(fixtureBaselinePath, 'utf8'));
    mutateBaseline(baseline);
    fs.writeFileSync(fixtureBaselinePath, `${JSON.stringify(baseline, null, 2)}\n`);

    const fixtureAllowlistPath = path.join(
      fixtureRoot,
      'docs/ops/wp1-package-resolution-allowlist.json',
    );
    const allowlist = JSON.parse(fs.readFileSync(fixtureAllowlistPath, 'utf8'));
    mutateAllowlist(allowlist);
    fs.writeFileSync(fixtureAllowlistPath, `${JSON.stringify(allowlist, null, 2)}\n`);

    const fixtureLockPath = path.join(fixtureRoot, 'pnpm-lock.yaml');
    const lock = YAML.parse(fs.readFileSync(fixtureLockPath, 'utf8'));
    mutateLock(lock);
    fs.writeFileSync(fixtureLockPath, YAML.stringify(lock));

    return spawnSync(process.execPath, ['scripts/check-package-manager-resolutions.mjs'], {
      cwd: fixtureRoot,
      encoding: 'utf8',
    });
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

const runResolutionGuard = () => runResolutionGuardWithFixtureMutation();
const runResolutionGuardWithLockMutation = (mutateLock) =>
  runResolutionGuardWithFixtureMutation({ mutateLock });

describe('WP1 operational contracts', () => {
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

  it('exposes the frozen root validation commands in their required order', () => {
    const rootPackage = readJson('package.json');
    const requiredCommands = [
      'check:resolutions',
      'lint',
      'test:unit',
      'build:whiteboard',
      'validate:resource-output',
      'validate:manifest',
      'forge:lint',
      'test:e2e:list',
      'validate',
      'start:whiteboard',
    ];

    expect(rootPackage.packageManager).toBe('pnpm@10.34.5');
    expect(rootPackage.volta.node).toBe('22.22.3');
    for (const command of requiredCommands) {
      expect(rootPackage.scripts[command], `${command} must exist`).toBeTypeOf('string');
    }
    expect(rootPackage.scripts.validate).toBe(
      'pnpm check:resolutions && pnpm lint && pnpm test:unit && pnpm build:whiteboard && pnpm validate:resource-output && pnpm validate:manifest && pnpm test:e2e:list',
    );
    expect(rootPackage.scripts.validate).not.toContain('forge:lint');
    expect(rootPackage.scripts['forge:lint']).toBe(
      'pnpm forge:analytics:disable && forge lint',
    );
  });

  it('keeps the Whiteboard frontend on its frozen product and build stack', () => {
    const spaPackage = readJson('static/spa/package.json');

    expect(spaPackage.homepage).toBe('.');
    expect(spaPackage.dependencies['@tldraw/tldraw']).toBe('1.26.2');
    expect(spaPackage.dependencies.react).toBe('18.2.0');
    expect(spaPackage.dependencies['react-dom']).toBe('18.2.0');
    expect(spaPackage.devDependencies['react-scripts']).toBe('5.0.1');
  });

  it('freezes peer optionality and both sides of every topology allowlist contract', () => {
    const baseline = readJson('tests/fixtures/wp1/npm-resolution-baseline.json');
    const allowlist = readJson('docs/ops/wp1-package-resolution-allowlist.json');
    const peerEdges = Object.values(baseline.importers)
      .flatMap(({ edges }) => edges)
      .filter(({ kind }) => kind === 'peerDependency');

    expect(baseline.schemaVersion).toBe(2);
    expect(peerEdges).toHaveLength(427);
    expect(peerEdges.filter(({ peerOptional }) => peerOptional)).toHaveLength(47);
    expect(peerEdges.every(({ peerOptional }) => typeof peerOptional === 'boolean')).toBe(true);
    expect(allowlist.schemaVersion).toBe(3);
    expect(allowlist.pnpmPeerDeclarationContract).toMatchObject({
      normalizationVersion: 'json-array-v1',
      count: 526,
      sha256: 'dfc7124b69127730d16e3eb8ad05e2508f3525f7223940ddf3157871f026b980',
    });
    expect(allowlist.allowedTopologyResolutionChanges).toHaveLength(23);
    for (const entry of allowlist.allowedTopologyResolutionChanges) {
      expect(entry.baselineKinds).toEqual([...entry.baselineKinds].sort());
      expect(entry.pnpmKinds).toEqual([...entry.pnpmKinds].sort());
      expect(entry.pnpmKinds.length).toBeGreaterThan(0);
    }
  });

  it('rejects a required dependency edge reclassified as optional', () => {
    const result = runResolutionGuardWithLockMutation((lock) => {
      const resolver = lock.snapshots['@forge/resolver@1.4.6'];
      resolver.optionalDependencies = {
        ...resolver.optionalDependencies,
        '@forge/api': resolver.dependencies['@forge/api'],
      };
      delete resolver.dependencies['@forge/api'];
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'dependency kind changed dependency -> optionalDependency',
    );
  });

  it('accepts pnpm optional-peer encoding when npm declared the same edge as required and peer', () => {
    const result = runResolutionGuard();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Package-manager resolution guard passed.');
  });

  it('rejects direct specifier drift even when the resolved version is unchanged', () => {
    const result = runResolutionGuardWithLockMutation((lock) => {
      lock.importers['.'].dependencies['@forge/api'].specifier = '^2.22.1';
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      '.: direct runtime dependency @forge/api must be pinned exactly to 2.22.1; got ^2.22.1',
    );
  });

  it('rejects a direct required dependency reclassified as optional', () => {
    const result = runResolutionGuardWithLockMutation((lock) => {
      const root = lock.importers['.'];
      root.optionalDependencies = {
        ...root.optionalDependencies,
        '@forge/api': root.dependencies['@forge/api'],
      };
      delete root.dependencies['@forge/api'];
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      '.: direct runtime dependency @forge/api kind changed dependency -> optionalDependency',
    );
  });

  it('fails when a reviewed allowlist entry is not consumed by the canonical graph', () => {
    const result = runResolutionGuardWithFixtureMutation({
      mutateAllowlist: (allowlist) => {
        allowlist.allowedNewDevelopmentDependencies.push({
          importer: '.',
          category: 'dev',
          name: 'unused-review-exception',
          version: '1.0.0',
          reason: 'Mutation fixture only.',
        });
      },
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'reviewed allowlist consumption changed expected 32 -> applied 31',
    );
  });

  it('rejects a required peer edge reclassified as optional', () => {
    const result = runResolutionGuardWithLockMutation((lock) => {
      const reactDom = lock.snapshots['react-dom@18.2.0(react@18.2.0)'];
      reactDom.optionalDependencies = {
        ...reactDom.optionalDependencies,
        react: reactDom.dependencies.react,
      };
      delete reactDom.dependencies.react;
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'react-dom@18.2.0>react dependency kind changed dependency -> optionalDependency',
    );
  });

  it('rejects peer optionality metadata drift when snapshot materialization is unchanged', () => {
    const result = runResolutionGuardWithLockMutation((lock) => {
      lock.packages['react-dom@18.2.0'].peerDependenciesMeta = {
        react: { optional: true },
      };
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'react-dom@18.2.0>react peer optionality changed required -> optional',
    );
  });

  it('rejects peer drift when snapshot and pnpm package metadata are changed together', () => {
    const result = runResolutionGuardWithLockMutation((lock) => {
      const reactDom = lock.snapshots['react-dom@18.2.0(react@18.2.0)'];
      reactDom.optionalDependencies = {
        ...reactDom.optionalDependencies,
        react: reactDom.dependencies.react,
      };
      delete reactDom.dependencies.react;
      lock.packages['react-dom@18.2.0'].peerDependenciesMeta = {
        react: { optional: true },
      };
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'react-dom@18.2.0>react peer optionality changed required -> optional',
    );
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'react-dom@18.2.0>react dependency kind changed dependency -> optionalDependency',
    );
  });

  it('rejects peer request drift when optionality and snapshot materialization are unchanged', () => {
    const result = runResolutionGuardWithLockMutation((lock) => {
      lock.packages['react-dom@18.2.0'].peerDependencies.react = '>=18';
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'react-dom@18.2.0>react peer request changed [^18.2.0] -> [>=18]',
    );
  });

  it('rejects a newly added peer declaration', () => {
    const result = runResolutionGuardWithLockMutation((lock) => {
      lock.packages['lzutf8@0.6.3'].peerDependencies = {
        react: '^18.2.0',
      };
      lock.packages['lzutf8@0.6.3'].peerDependenciesMeta = {
        react: { optional: true },
      };
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'pnpm peer declaration contract changed',
    );
  });

  it.each([
    ['removed', (lock) => {
      delete lock.packages['@forge/csp@5.8.0'].peerDependencies.cheerio;
      delete lock.packages['@forge/csp@5.8.0'].peerDependenciesMeta.cheerio;
    }],
    ['range changed', (lock) => {
      lock.packages['@forge/csp@5.8.0'].peerDependencies.cheerio = '^2.0.0';
    }],
    ['optionality changed', (lock) => {
      lock.packages['@forge/csp@5.8.0'].peerDependenciesMeta.cheerio.optional = false;
    }],
    ['extended with orphan metadata', (lock) => {
      lock.packages['lzutf8@0.6.3'].peerDependenciesMeta = {
        react: { optional: true },
      };
    }],
  ])('rejects a pnpm peer declaration contract that is %s', (_, mutateLock) => {
    const result = runResolutionGuardWithLockMutation(mutateLock);

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'pnpm peer declaration contract changed',
    );
  });

  it('rejects kind drift on an otherwise allowlisted topology edge', () => {
    const result = runResolutionGuardWithLockMutation((lock) => {
      const layoutEffect = lock.snapshots[
        'use-isomorphic-layout-effect@1.1.2(@types/react@18.0.25)(react@18.2.0)'
      ];
      layoutEffect.dependencies['@types/react'] =
        layoutEffect.optionalDependencies['@types/react'];
      delete layoutEffect.optionalDependencies['@types/react'];
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'use-isomorphic-layout-effect@1.1.2>@types/react changed versions [] -> [18.0.25], kinds [] -> [dependency]',
    );
  });

  it('fails closed on an old baseline schema or missing peer optionality', () => {
    const oldSchema = runResolutionGuardWithFixtureMutation({
      mutateBaseline: (baseline) => {
        baseline.schemaVersion = 1;
      },
    });
    const missingPeerOptionality = runResolutionGuardWithFixtureMutation({
      mutateBaseline: (baseline) => {
        const reactPeer = baseline.importers['static/spa'].edges.find((edge) =>
          edge.fromName === 'react-dom'
            && edge.fromVersion === '18.2.0'
            && edge.dependencyName === 'react'
            && edge.kind === 'peerDependency');
        delete reactPeer.peerOptional;
      },
    });

    expect(oldSchema.status).toBe(1);
    expect(`${oldSchema.stdout}\n${oldSchema.stderr}`).toContain(
      'Unsupported WP1 resolution-guard schema version',
    );
    expect(missingPeerOptionality.status).toBe(1);
    expect(`${missingPeerOptionality.stdout}\n${missingPeerOptionality.stderr}`).toContain(
      'baseline peer edge react-dom@18.2.0>react is missing peerOptional',
    );
  });
});
