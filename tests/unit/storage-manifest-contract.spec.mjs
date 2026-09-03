import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readManifest() {
  return YAML.parse(fs.readFileSync(path.join(repositoryRoot, 'manifest.yml'), 'utf8'));
}

describe('WP2 Forge storage manifest contract', () => {
  it('declares the permanent whiteboard journal schema without custom indexes', () => {
    const manifest = readManifest();
    const entities = manifest.app?.storage?.entities;

    expect(entities).toEqual([
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
    expect(entities[0]).not.toHaveProperty('indexes');
  });

  it('keeps the existing Forge app identity and storage scope', () => {
    const manifest = readManifest();

    expect(manifest.app.id).toBe(
      'ari:cloud:ecosystem::app/368b610d-bac1-4e2a-9311-6ec0adca5e49',
    );
    expect(manifest.app.runtime).toEqual({ name: 'nodejs22.x' });
    expect(manifest.modules.macro.map(({ key }) => key)).toEqual(['whiteboard']);
    expect(manifest.permissions.scopes).toEqual(['storage:app']);
  });
});
