import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workflowDirectory = path.join(repositoryRoot, '.github/workflows');

function readWorkflow(name) {
  const source = fs.readFileSync(path.join(workflowDirectory, name), 'utf8');
  return { source, workflow: YAML.parse(source) };
}

function stepByName(job, name) {
  return job.steps.find((step) => step.name === name);
}

function occurrenceCount(source, value) {
  return source.split(value).length - 1;
}

describe('GitHub workflow contracts', () => {
  it('validates every branch and stages only a tested main commit', () => {
    const { source, workflow } = readWorkflow('build-test-deploy.yml');

    expect(workflow.name).toBe('Build, Test and Stage');
    expect(workflow.on.pull_request.types).toEqual([
      'opened',
      'synchronize',
      'reopened',
      'ready_for_review',
    ]);
    expect(workflow.on.push).toEqual({ branches: ['**'], 'tags-ignore': ['**'] });
    expect(workflow.permissions).toEqual({ contents: 'read' });
    expect(workflow.jobs.build.name).toBe('Build and Unit Test');
    expect(workflow.jobs.build.environment).toBeUndefined();
    expect(stepByName(workflow.jobs.build, 'Set up Node').with['node-version']).toBe('22.22.3');
    expect(stepByName(workflow.jobs.build, 'Install dependencies').run).toBe(
      'pnpm install --frozen-lockfile',
    );
    expect(stepByName(workflow.jobs.build, 'Validate').env).toEqual({
      VITE_APP_COMMIT: '${{ github.sha }}',
      VITE_APP_VERSION: 'unreleased',
      VITE_ENVIRONMENT_TYPE: 'ci',
    });
    expect(workflow.jobs.staging).toMatchObject({
      name: 'Stage tested main commit',
      needs: 'build',
      uses: './.github/workflows/staging-deploy.yml',
      secrets: 'inherit',
    });
    expect(workflow.jobs.staging.if).toContain("github.event_name == 'push'");
    expect(workflow.concurrency.group).toContain('github.event_name');
    expect(workflow.concurrency['cancel-in-progress']).toContain(
      'github.event.repository.default_branch',
    );
    expect(source).not.toMatch(/FORGE_(?:EMAIL|API_TOKEN)|ATLASSIAN_SITE|storageState/u);
    expect(occurrenceCount(source, 'secrets: inherit')).toBe(1);
  });

  it('creates the Whiteboard draft automatically after main staging, like conf-app', () => {
    const { source, workflow } = readWorkflow('build-test-deploy.yml');
    const draft = workflow.jobs['draft-release'];

    expect(draft.name).toBe('Draft: Whiteboard');
    expect(draft.needs).toBe('staging');
    expect(draft.environment).toBeUndefined();
    expect(draft.permissions).toEqual({ contents: 'write' });
    expect(draft.if).toContain("github.event_name != 'pull_request'");
    const create = stepByName(draft, 'Create release draft');
    expect(create.uses).toBe('ncipollo/release-action@v1');
    expect(create.with.commit).toBe('${{ github.sha }}');
    expect(create.with.tag).toBe('v${{ env.version }}-tldraw');
    expect(create.with.draft).toBe(true);
    expect(source).not.toMatch(/attest|staging-tldraw-release|ui_evidence/iu);
  });

  it('deploys only the validated commit to Forge staging', () => {
    const { source, workflow } = readWorkflow('staging-deploy.yml');
    const deploy = workflow.jobs.deploy;

    expect(workflow.name).toBe('Staging Deploy');
    expect(Object.hasOwn(workflow.on, 'workflow_call')).toBe(true);
    expect(Object.hasOwn(workflow.on, 'workflow_dispatch')).toBe(false);
    expect(deploy.environment).toEqual({ name: 'staging-tldraw' });
    expect(deploy.concurrency).toEqual({
      group: 'forge-staging-tldraw',
      'cancel-in-progress': false,
    });
    expect(stepByName(deploy, 'Validate exact commit').env).toEqual({
      VITE_APP_COMMIT: '${{ github.sha }}',
      VITE_APP_VERSION: 'unreleased',
      VITE_ENVIRONMENT_TYPE: 'staging',
      VITE_MIXPANEL_TOKEN: '${{ vars.VITE_MIXPANEL_TOKEN }}',
    });
    const forgeNode = stepByName(
      deploy,
      'Use Node 20 for Forge CLI (node-fetch "Premature close" workaround)',
    );
    const forgeDeploy = stepByName(deploy, 'Deploy existing app to Forge staging');
    expect(forgeNode.with['node-version']).toBe('20.x');
    expect(forgeDeploy.run.trim().split('\n')).toEqual([
      'pnpm forge:deploy:disable-analytics',
      'pnpm forge:lint:tldraw:staging',
      'pnpm forge:deploy:tldraw:staging',
    ]);
    expect(forgeDeploy.env).toEqual({
      FORGE_EMAIL: '${{ vars.FORGE_EMAIL }}',
      FORGE_API_TOKEN: '${{ secrets.FORGE_API_TOKEN }}',
    });
    expect(source).not.toMatch(/forge install|cloudflare|wrangler|sed.+manifest/iu);
  });

  it('uses publication as the production authorization, like conf-app', () => {
    const { source, workflow } = readWorkflow('release.yml');
    const release = workflow.jobs.release;

    expect(workflow.name).toBe('Release');
    expect(workflow.on.release.types).toEqual(['released']);
    expect(workflow.permissions).toEqual({ contents: 'read' });
    expect(Object.keys(workflow.jobs)).toEqual(['release']);
    expect(release.concurrency).toEqual({
      group: 'forge-production-tldraw',
      'cancel-in-progress': false,
    });
    expect(release.environment).toEqual({ name: 'production-tldraw' });
    expect(stepByName(release, 'Checkout release tag').with.ref).toBe(
      '${{ github.event.release.tag_name }}',
    );
    expect(stepByName(release, 'Validate release tag').env).toEqual({
      VITE_APP_COMMIT: '${{ github.sha }}',
      VITE_APP_VERSION: '${{ github.event.release.tag_name }}',
      VITE_ENVIRONMENT_TYPE: 'production',
      VITE_MIXPANEL_TOKEN: '${{ vars.VITE_MIXPANEL_TOKEN }}',
    });
    const forgeDeploy = stepByName(release, 'Deploy existing app to Forge production');
    expect(forgeDeploy.run.trim().split('\n')).toEqual([
      'pnpm forge:deploy:disable-analytics',
      'pnpm forge:lint:tldraw:prod',
      'pnpm forge:deploy:tldraw:prod',
    ]);
    expect(forgeDeploy.env).toEqual({
      FORGE_EMAIL: '${{ vars.FORGE_EMAIL }}',
      FORGE_API_TOKEN: '${{ secrets.FORGE_API_TOKEN }}',
    });
    expect(source).not.toMatch(
      /TLDRAW_PRODUCTION_RELEASE_ENABLED|attest|ledger|immutable-releases|approval/iu,
    );
  });

  it('references root package scripts that exist', () => {
    const rootPackage = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));
    expect(rootPackage.scripts.validate).toContain('pnpm validate:manifest');
    expect(rootPackage.scripts['forge:deploy:tldraw:staging']).toContain('forge deploy -e staging');
    expect(rootPackage.scripts['forge:deploy:tldraw:prod']).toContain('forge deploy -e production');
  });
});

describe('workflow structural guards', () => {
  const workflowNames = fs
    .readdirSync(workflowDirectory)
    .filter((name) => name.endsWith('.yml'))
    .sort();

  function everyJob() {
    return workflowNames.flatMap((name) => {
      const { workflow } = readWorkflow(name);
      return Object.entries(workflow.jobs ?? {}).map(([id, job]) => ({ name, id, job, workflow }));
    });
  }

  it('covers every workflow file in the repository', () => {
    expect(workflowNames).toEqual([
      'build-test-deploy.yml',
      'release.yml',
      'staging-deploy.yml',
    ]);
  });

  it('bounds every job that runs steps', () => {
    for (const { name, id, job } of everyJob()) {
      if (job.uses) continue;
      expect(job['timeout-minutes'], `${name}:${id}`).toBeTypeOf('number');
    }
  });

  it('pins every action to a major version or a full commit SHA', () => {
    for (const { name, id, job } of everyJob()) {
      for (const step of job.steps ?? []) {
        if (!step.uses) continue;
        expect(step.uses, `${name}:${id}`).toMatch(/@(?:v\d+|[0-9a-f]{40})$/u);
      }
    }
  });

  it('never interpolates an expression into a run body', () => {
    for (const { name, id, job } of everyJob()) {
      for (const step of job.steps ?? []) {
        expect(step.run ?? '', `${name}:${id} — ${step.name ?? '?'}`).not.toMatch(/\$\{\{/u);
      }
    }
  });

  it('gives every credential-carrying step an explicit bash shell', () => {
    for (const { name, id, job } of everyJob()) {
      for (const step of job.steps ?? []) {
        if (!/FORGE_(?:EMAIL|API_TOKEN)/u.test(JSON.stringify(step.env ?? {}))) continue;
        expect(step.shell, `${name}:${id} — ${step.name ?? '?'}`).toBe('bash');
      }
    }
  });

  it('keeps every Forge credential out of job-level and workflow-level env', () => {
    for (const { name, id, job, workflow } of everyJob()) {
      expect(JSON.stringify(job.env ?? {}), `${name}:${id}`).not.toMatch(/FORGE_API_TOKEN/u);
      expect(JSON.stringify(workflow.env ?? {}), name).not.toMatch(/FORGE_API_TOKEN/u);
    }
  });
});
