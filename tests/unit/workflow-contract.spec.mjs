import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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

function selectReleaseLineage(releases, currentId, currentPublishedAt) {
  return spawnSync(
    'jq',
    [
      '-cer',
      '--arg',
      'current_id',
      String(currentId),
      '--arg',
      'current_published_at',
      currentPublishedAt,
      '-f',
      path.join(repositoryRoot, 'scripts/select-whiteboard-release-lineage.jq'),
    ],
    {
      encoding: 'utf8',
      input: JSON.stringify([releases]),
    },
  );
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
    expect(workflow.on.push).toEqual({ branches: ['**'], 'tags-ignore': ['**'] });
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
    expect(workflow.jobs.staging.secrets).toBe('inherit');
    expect(workflow.jobs.staging.if).toContain("github.event_name == 'push'");
    expect(workflow.concurrency.group).toBe(
      '${{ github.workflow }}-${{ github.head_ref || github.ref_name }}',
    );
    expect(workflow.concurrency['cancel-in-progress']).toContain(
      'github.event.repository.default_branch',
    );
    // `secrets: inherit` is permitted on the staging caller only. The credential
    // still never reaches the PR check: the build job carries no credential env and
    // the staging job runs only on a default-branch push. The source assertion below
    // stays strict, so keep the credential names out of comments in this file too.
    expect(source).not.toMatch(/FORGE_(?:EMAIL|API_TOKEN)|ATLASSIAN_SITE|storageState/u);
    expect(occurrenceCount(source, 'secrets: inherit')).toBe(1);
    expect(JSON.stringify(workflow.jobs.build)).not.toMatch(/secrets/u);
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
    const forgeNode = stepByName(
      deploy,
      'Use Node 20 for Forge CLI (node-fetch "Premature close" workaround)',
    );
    const forgeDeploy = stepByName(deploy, 'Deploy existing app to Forge staging');
    expect(validate.run).toBe('pnpm validate');
    expect(validate.env).toBeUndefined();
    expect(stepByName(deploy, 'Verify current default-branch tip').run).toContain(
      'refs/remotes/origin/${DEFAULT_BRANCH}',
    );
    expect(forgeNode.uses).toBe('actions/setup-node@v5');
    expect(forgeNode.with['node-version']).toBe('20.x');
    expect(deploy.steps.indexOf(forgeNode)).toBe(deploy.steps.indexOf(forgeDeploy) - 1);
    expect(forgeDeploy.run.trim().split('\n')).toEqual([
      'pnpm forge:deploy:disable-analytics',
      'pnpm forge:lint',
      'pnpm forge:deploy:tldraw:staging',
    ]);
    expect(forgeDeploy.env).toEqual({
      FORGE_EMAIL: '${{ vars.FORGE_EMAIL }}',
      FORGE_API_TOKEN: '${{ secrets.FORGE_API_TOKEN }}',
    });
    const credentialGuard = stepByName(deploy, 'Verify Forge credentials are present');
    expect(credentialGuard.env).toEqual({
      FORGE_EMAIL: '${{ vars.FORGE_EMAIL }}',
      FORGE_API_TOKEN: '${{ secrets.FORGE_API_TOKEN }}',
    });
    // The guard reports presence only. A public job log must never carry the value,
    // its length, or a prefix of it.
    expect(credentialGuard.run).not.toMatch(/\$\{#FORGE_(?:EMAIL|API_TOKEN)/u);
    expect(credentialGuard.run).not.toMatch(
      /(?:echo|printf)[^\n]*\$\{?FORGE_(?:EMAIL|API_TOKEN)/u,
    );
    expect(credentialGuard.run).toContain('FORGE_API_TOKEN present:');
    expect(deploy.steps.indexOf(credentialGuard)).toBeLessThan(deploy.steps.indexOf(forgeNode));
    expect(occurrenceCount(source, 'vars.FORGE_EMAIL')).toBe(2);
    expect(occurrenceCount(source, 'secrets.FORGE_API_TOKEN')).toBe(2);
    expect(source).not.toMatch(/secrets:\s*inherit/u);
    expect(
      deploy.steps.filter((step) =>
        JSON.stringify(step.env ?? {}).match(/FORGE_(?:EMAIL|API_TOKEN)/u),
      ),
    ).toEqual([credentialGuard, forgeDeploy]);
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
    expect(workflow.on.release.types).toEqual(['released']);
    expect(workflow.on.release.types).not.toContain('prereleased');
    expect(workflow.permissions).toEqual({ actions: 'read', contents: 'read' });
    expect(preflight.environment).toBeUndefined();
    expect(JSON.stringify(preflight)).not.toMatch(/FORGE_(?:EMAIL|API_TOKEN)/u);
    expect(preflight.outputs.release_sha).toBe('${{ steps.provenance.outputs.release_sha }}');
    expect(preflight.outputs.fresh_until_epoch).toBe(
      '${{ steps.provenance.outputs.fresh_until_epoch }}',
    );
    expect(preflight.env.RELEASE_ENABLED).toBe(
      '${{ vars.TLDRAW_PRODUCTION_RELEASE_ENABLED }}',
    );
    expect(preflight.env.BRAND_APPROVED).toBe('${{ vars.TLDRAW_BRAND_APPROVED }}');
    expect(preflight.env.EVENT_RELEASE_SHA).toBe('${{ github.sha }}');
    expect(stepByName(preflight, 'Checkout release tag for verification').with['fetch-depth']).toBe(0);
    expect(stepByName(preflight, 'Checkout release tag for verification').with.ref).toBe(
      '${{ github.sha }}',
    );
    expect(stepByName(preflight, 'Verify staged release provenance').id).toBe('provenance');
    expect(source).toContain('RELEASE_IS_DRAFT');
    expect(source).toContain('RELEASE_IS_PRERELEASE');
    expect(source).toContain('refs/tags/${RELEASE_TAG}^{commit}');
    expect(source).toContain('"$RELEASE_SHA" != "$EVENT_RELEASE_SHA"');
    expect(source).toContain('Release tag moved after the release event was created');
    expect(source).not.toContain('"origin/${DEFAULT_BRANCH}"');
    expect(source).toContain('"refs/remotes/origin/${DEFAULT_BRANCH}"');
    expect(source).toContain('git merge-base --is-ancestor');
    expect(source).toContain('Staging run ID: (?<run>[0-9]+)');
    expect(source).toContain('UI evidence SHA-256: (?<hash>[0-9a-f]{64})');
    expect(source).toContain('(?<notes>\\\\n\\\\n## Changes\\\\n[\\\\s\\\\S]+)');
    expect(source).not.toContain('(?<notes>\\\\n\\\\n## Changes\\\\n[\\\\s\\\\S]+)?');
    expect(source).toContain('CURRENT_RELEASE_ID');
    expect(source).toContain('CURRENT_PUBLISHED_AT');
    expect(source).not.toContain('CURRENT_CREATED_AT');
    expect(source).toContain('PUBLISHED_EPOCH - TAG_EPOCH > 86400');
    expect(source).toContain('NOW_EPOCH - PUBLISHED_EPOCH > 86400');
    expect(source).toContain('MAIN_RUN_UPDATED_AT');
    expect(source).toContain('fresh_until_epoch=$FRESH_UNTIL_EPOCH');
    expect(source).toContain('Referenced staging run is not a fresh predecessor');
    expect(source).toContain('Whiteboard publication expired while awaiting production approval');
    expect(source).toContain(
      'Whiteboard staging or draft freshness expired during production approval',
    );
    expect(source).toContain('gh api --paginate "repos/${GITHUB_REPOSITORY}/releases"');
    expect(source).toContain(
      'git merge-base --is-ancestor "$PREVIOUS_RELEASE_SHA" "$RELEASE_SHA"',
    );
    expect(source).toContain('Previous published Whiteboard release is not an ancestor');
    expect(occurrenceCount(source, 'scripts/select-whiteboard-release-lineage.jq')).toBe(2);
    expect(source).toContain('Whiteboard release lineage changed or became ambiguous during approval');
    expect(source).toContain(
      'Previous published Whiteboard release is not an ancestor after approval',
    );
    expect(source).toContain('gh run view "$MAIN_RUN_ID"');
    expect(source).toContain('.headSha == $sha');
    expect(source).toContain('.workflowName == "Build, Test and Stage"');
    expect(source).toContain('echo "release_sha=$RELEASE_SHA"');
    expect(source).toContain('} >> "$GITHUB_OUTPUT"');
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
    expect(authorizationRecheck.env.FRESH_UNTIL_EPOCH).toBe(
      '${{ needs.preflight.outputs.fresh_until_epoch }}',
    );
    expect(stepByName(deploy, 'Rebuild and validate release commit').env).toBeUndefined();
    const forgeDeploy = stepByName(deploy, 'Deploy existing app to Forge production');
    const forgeNode = stepByName(
      deploy,
      'Use Node 20 for Forge CLI (node-fetch "Premature close" workaround)',
    );
    const deployStepNames = deploy.steps.map((step) => step.name);
    expect(deployStepNames.indexOf('Recheck production authorization after approval')).toBe(
      deployStepNames.indexOf('Deploy existing app to Forge production') - 1,
    );
    expect(deployStepNames.indexOf('Rebuild and validate release commit')).toBeLessThan(
      deployStepNames.indexOf('Recheck production authorization after approval'),
    );
    expect(forgeNode.uses).toBe('actions/setup-node@v5');
    expect(forgeNode.with['node-version']).toBe('20.x');
    expect(deploy.steps.indexOf(forgeNode)).toBe(
      deploy.steps.indexOf(authorizationRecheck) - 1,
    );
    expect(forgeDeploy.run.trim().split('\n')).toEqual([
      'pnpm forge:deploy:disable-analytics',
      'pnpm forge:lint',
      'pnpm forge:deploy:tldraw:prod',
    ]);
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

    const current = {
      id: 5,
      draft: false,
      prerelease: false,
      tag_name: 'v2026.08.311200-tldraw',
      published_at: '2026-08-31T12:00:00Z',
    };
    const previous = {
      id: 2,
      draft: false,
      prerelease: false,
      tag_name: 'v2026.08.311100-tldraw',
      published_at: '2026-08-31T11:00:00Z',
    };
    const firstRelease = selectReleaseLineage([current], 5, current.published_at);
    expect(firstRelease.status).toBe(0);
    expect(JSON.parse(firstRelease.stdout)).toEqual({
      currentTag: current.tag_name,
      previousTag: '',
    });

    const normal = selectReleaseLineage(
      [
        current,
        previous,
        {
          id: 3,
          draft: true,
          prerelease: false,
          tag_name: 'v2026.08.311130-tldraw',
          published_at: '2026-08-31T11:30:00Z',
        },
        {
          id: 4,
          draft: false,
          prerelease: true,
          tag_name: 'v2026.08.311145-tldraw',
          published_at: '2026-08-31T11:45:00Z',
        },
        {
          id: 8,
          draft: false,
          prerelease: false,
          tag_name: 'v2026.08.311300-other',
          published_at: '2026-08-31T13:00:00Z',
        },
      ],
      5,
      current.published_at,
    );
    expect(normal.status).toBe(0);
    expect(JSON.parse(normal.stdout)).toEqual({
      currentTag: current.tag_name,
      previousTag: previous.tag_name,
    });

    const newer = selectReleaseLineage(
      [
        current,
        {
          ...previous,
          id: 6,
          tag_name: 'v2026.08.311300-tldraw',
          published_at: '2026-08-31T13:00:00Z',
        },
      ],
      5,
      current.published_at,
    );
    expect(newer.status).not.toBe(0);
    expect(newer.stderr).toContain('not the latest stable publication');

    const tiedCurrent = selectReleaseLineage(
      [current, { ...previous, id: 6, published_at: current.published_at }],
      5,
      current.published_at,
    );
    expect(tiedCurrent.status).not.toBe(0);
    expect(tiedCurrent.stderr).toContain('publication order is ambiguous');

    const tiedPrevious = selectReleaseLineage(
      [current, previous, { ...previous, id: 7, tag_name: 'v2026.08.311059-tldraw' }],
      5,
      current.published_at,
    );
    expect(tiedPrevious.status).not.toBe(0);
    expect(tiedPrevious.stderr).toContain('Previous Whiteboard release publication is ambiguous');
  });

  it('references root package scripts that exist', () => {
    const rootPackage = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));

    expect(rootPackage.scripts.validate).toContain('pnpm validate:manifest');
    expect(rootPackage.scripts.validate).not.toContain('forge:lint');
    expect(rootPackage.scripts['validate:manifest']).toBe(
      'node scripts/validate-forge-manifest.mjs',
    );
    expect(rootPackage.scripts['forge:deploy:disable-analytics']).toBe(
      'forge settings set usage-analytics false',
    );
    expect(rootPackage.scripts['forge:lint']).toBe('forge lint');
    expect(rootPackage.scripts['forge:deploy:tldraw:staging']).toBe(
      'forge deploy -e staging --non-interactive --verbose',
    );
    expect(rootPackage.scripts['forge:deploy:tldraw:prod']).toBe(
      'forge deploy -e production --non-interactive --verbose',
    );
    expect(rootPackage.scripts['forge:deploy:tldraw:production']).toBe(
      'pnpm forge:deploy:tldraw:prod',
    );
  });
});
