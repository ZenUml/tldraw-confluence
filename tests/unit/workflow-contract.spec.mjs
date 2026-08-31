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

describe('WP1 GitHub workflow contracts', () => {
  it('publishes the stable Build and Unit Test check on every PR', () => {
    const { source, workflow } = readWorkflow('build-test-deploy.yml');

    expect(workflow.name).toBe('Build, Test and Stage');
    expect(workflow.on.pull_request.types).toEqual([
      'opened',
      'synchronize',
      'reopened',
      'ready_for_review',
    ]);
    expect(workflow.on.push).toEqual({ branches: ['main'], 'tags-ignore': ['**'] });
    expect(source).not.toMatch(/paths-ignore/u);
    expect(workflow.permissions).toEqual({ contents: 'read' });
    expect(workflow.jobs.build.name).toBe('Build and Unit Test');
    expect(workflow.jobs.build['timeout-minutes']).toBe(15);
    expect(workflow.jobs.build.environment).toBeUndefined();
    expect(stepByName(workflow.jobs.build, 'Set up Node').with['node-version']).toBe('22.22.3');
    expect(stepByName(workflow.jobs.build, 'Install dependencies').run).toBe(
      'pnpm install --frozen-lockfile',
    );
    const validate = stepByName(workflow.jobs.build, 'Validate');
    expect(validate.run).toBe('pnpm validate');
    expect(validate.env).toBeUndefined();
    expect(workflow.jobs.staging).toMatchObject({
      name: 'Stage tested main commit',
      needs: 'build',
      uses: './.github/workflows/staging-deploy.yml',
    });
    expect(workflow.jobs.staging.secrets).toBeUndefined();
    expect(workflow.jobs.staging.if).toContain("github.event_name == 'push'");
    expect(workflow.concurrency.group).toBe(
      '${{ github.workflow }}-${{ github.event_name }}-${{ github.event.pull_request.number || github.ref }}',
    );
    expect(workflow.concurrency['cancel-in-progress']).toContain(
      'github.event.repository.default_branch',
    );
    expect(source).not.toMatch(
      /FORGE_(?:EMAIL|API_TOKEN)|ATLASSIAN_SITE|storageState|secrets:\s*inherit/u,
    );
  });

  it('deploys only the validated commit to the protected staging environment', () => {
    const { source, workflow } = readWorkflow('staging-deploy.yml');
    const deploy = workflow.jobs.deploy;

    expect(workflow.name).toBe('Staging Deploy');
    expect(Object.hasOwn(workflow.on, 'workflow_call')).toBe(true);
    expect(Object.hasOwn(workflow.on, 'workflow_dispatch')).toBe(false);
    expect(workflow.permissions).toEqual({ contents: 'read' });
    expect(deploy.name).toBe('Deploy to Forge Staging');
    expect(deploy.concurrency).toEqual({
      group: 'forge-staging-tldraw',
      'cancel-in-progress': false,
    });
    expect(deploy.environment).toEqual({ name: 'staging-tldraw' });
    expect(deploy.env).toBeUndefined();
    const validate = stepByName(deploy, 'Validate exact commit');
    const forgeDeploy = stepByName(deploy, 'Deploy existing app to Forge staging');
    expect(validate.run).toBe('pnpm validate');
    expect(validate.env).toBeUndefined();
    expect(stepByName(deploy, 'Verify current default-branch tip').run).toContain(
      'refs/remotes/origin/${DEFAULT_BRANCH}',
    );
    expect(forgeDeploy.run).toBe(
      'pnpm forge:lint && pnpm forge:deploy:tldraw:staging',
    );
    expect(forgeDeploy.env).toEqual({
      FORGE_EMAIL: '${{ vars.FORGE_EMAIL }}',
      FORGE_API_TOKEN: '${{ secrets.FORGE_API_TOKEN }}',
    });
    expect(occurrenceCount(source, 'vars.FORGE_EMAIL')).toBe(1);
    expect(occurrenceCount(source, 'secrets.FORGE_API_TOKEN')).toBe(1);
    expect(source).not.toMatch(/secrets:\s*inherit/u);
    expect(
      deploy.steps.filter((step) =>
        JSON.stringify(step.env ?? {}).match(/FORGE_(?:EMAIL|API_TOKEN)/u),
      ),
    ).toEqual([forgeDeploy]);
    expect(stepByName(deploy, 'Upload staging inputs').uses).toBe('actions/upload-artifact@v6');
    expect(source).not.toMatch(/forge install|cloudflare|wrangler|sed.+manifest|APP_ID=/iu);
  });

  it('requires successful main staging and reviewed private evidence before a draft', () => {
    const { source, workflow } = readWorkflow('prepare-draft-release.yml');
    const inputs = workflow.on.workflow_dispatch.inputs;
    const preflight = workflow.jobs.preflight;
    const draft = workflow.jobs.draft;

    expect(workflow.name).toBe('Prepare Draft Release');
    expect(Object.keys(inputs)).toEqual(['commit_sha', 'main_run_id', 'ui_evidence_sha256']);
    for (const input of Object.values(inputs)) {
      expect(input).toMatchObject({ required: true, type: 'string' });
    }
    expect(workflow.permissions).toEqual({ actions: 'read', contents: 'write' });
    expect(preflight.permissions).toEqual({ actions: 'read', contents: 'read' });
    expect(draft.needs).toBe('preflight');
    expect(draft.environment).toEqual({ name: 'staging-tldraw-release' });
    expect(source).toContain('^[0-9a-f]{64}$');
    expect(source).toContain('gh run view "$MAIN_RUN_ID"');
    expect(source).toContain('.workflowName == "Build, Test and Stage"');
    expect(source).toContain('endswith("Deploy to Forge Staging")');
    expect(source).toContain('--target "$COMMIT_SHA"');
    expect(source).toContain('--draft');
  });

  it('keeps production disabled, provenance-gated, stable-only, and exact-SHA pinned', () => {
    const { source, workflow } = readWorkflow('release.yml');
    const preflight = workflow.jobs.preflight;
    const deploy = workflow.jobs.deploy;

    expect(workflow.name).toBe('Release');
    expect(workflow.on.release.types).toEqual(['published']);
    expect(workflow.on.release.types).not.toContain('released');
    expect(workflow.permissions).toEqual({ actions: 'read', contents: 'read' });
    expect(preflight.environment).toBeUndefined();
    expect(JSON.stringify(preflight)).not.toMatch(/FORGE_(?:EMAIL|API_TOKEN)/u);
    expect(preflight.outputs.release_sha).toBe('${{ steps.provenance.outputs.release_sha }}');
    expect(preflight.env.RELEASE_ENABLED).toBe(
      '${{ vars.TLDRAW_PRODUCTION_RELEASE_ENABLED }}',
    );
    expect(preflight.env.BRAND_APPROVED).toBe('${{ vars.TLDRAW_BRAND_APPROVED }}');
    expect(stepByName(preflight, 'Checkout release tag for verification').with['fetch-depth']).toBe(0);
    expect(stepByName(preflight, 'Verify staged release provenance').id).toBe('provenance');
    expect(source).toContain('RELEASE_IS_DRAFT');
    expect(source).toContain('RELEASE_IS_PRERELEASE');
    expect(source).toContain('git merge-base --is-ancestor');
    expect(source).toContain('Staging run ID: (?<run>[0-9]+)');
    expect(source).toContain('UI evidence SHA-256: (?<hash>[0-9a-f]{64})');
    expect(source).toContain('gh run view "$MAIN_RUN_ID"');
    expect(source).toContain('.headSha == $sha');
    expect(source).toContain('.workflowName == "Build, Test and Stage"');
    expect(source).toContain('echo "release_sha=$RELEASE_SHA" >> "$GITHUB_OUTPUT"');
    expect(deploy.needs).toBe('preflight');
    expect(deploy.concurrency).toEqual({
      group: 'forge-production-tldraw',
      'cancel-in-progress': false,
    });
    expect(deploy.environment).toEqual({ name: 'production-tldraw' });
    expect(deploy.env).toBeUndefined();
    expect(stepByName(deploy, 'Checkout verified release commit').with.ref).toBe(
      '${{ needs.preflight.outputs.release_sha }}',
    );
    const authorizationRecheck = stepByName(
      deploy,
      'Recheck production authorization after approval',
    );
    expect(authorizationRecheck.run).toContain('gh api');
    expect(authorizationRecheck.run).toContain('git merge-base --is-ancestor');
    expect(authorizationRecheck.env.RELEASE_ENABLED).toBe(
      '${{ vars.TLDRAW_PRODUCTION_RELEASE_ENABLED }}',
    );
    expect(stepByName(deploy, 'Rebuild and validate release commit').env).toBeUndefined();
    const forgeDeploy = stepByName(deploy, 'Deploy existing app to Forge production');
    const deployStepNames = deploy.steps.map((step) => step.name);
    expect(deployStepNames.indexOf('Recheck production authorization after approval')).toBe(
      deployStepNames.indexOf('Deploy existing app to Forge production') - 1,
    );
    expect(deployStepNames.indexOf('Rebuild and validate release commit')).toBeLessThan(
      deployStepNames.indexOf('Recheck production authorization after approval'),
    );
    expect(forgeDeploy.run).toBe(
      'pnpm forge:lint && pnpm forge:deploy:tldraw:production',
    );
    expect(forgeDeploy.env).toEqual({
      FORGE_EMAIL: '${{ vars.FORGE_EMAIL }}',
      FORGE_API_TOKEN: '${{ secrets.FORGE_API_TOKEN }}',
    });
    expect(occurrenceCount(source, 'vars.FORGE_EMAIL')).toBe(1);
    expect(occurrenceCount(source, 'secrets.FORGE_API_TOKEN')).toBe(1);
    expect(
      deploy.steps.filter((step) =>
        JSON.stringify(step.env ?? {}).match(/FORGE_(?:EMAIL|API_TOKEN)/u),
      ),
    ).toEqual([forgeDeploy]);
  });

  it('references root package scripts that exist', () => {
    const rootPackage = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));

    expect(rootPackage.scripts.validate).toContain('pnpm validate:manifest');
    expect(rootPackage.scripts.validate).not.toContain('forge:lint');
    expect(rootPackage.scripts['validate:manifest']).toBe(
      'node scripts/validate-forge-manifest.mjs',
    );
    expect(rootPackage.scripts['forge:lint']).toBe(
      'pnpm forge:analytics:disable && forge lint',
    );
    expect(rootPackage.scripts['forge:deploy:tldraw:staging']).toBe(
      'pnpm forge:analytics:disable && forge deploy -e staging --non-interactive --verbose',
    );
    expect(rootPackage.scripts['forge:deploy:tldraw:production']).toBe(
      'pnpm forge:analytics:disable && forge deploy -e production --non-interactive --verbose',
    );
  });
});
