import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function expectInOrder(source, markers) {
  let prior = -1;
  for (const marker of markers) {
    const current = source.indexOf(marker);
    expect(current, `missing or out-of-order marker: ${marker}`).toBeGreaterThan(prior);
    prior = current;
  }
}

describe('Whiteboard release skill contracts', () => {
  it('ports the conf-app release lifecycle without multi-product assumptions', () => {
    const release = read('.claude/skills/release-app/SKILL.md');

    expect(release).toContain('ZenUml/tldraw-confluence');
    expect(release).toContain('TLDRAW_PRODUCTION_RELEASE_ENABLED');
    expect(release).toContain('TLDRAW_BRAND_APPROVED');
    expect(release).toContain('BLOCKED — production release disabled in WP1');
    expect(release).toContain('last-successful production SHA');
    expect(release).toContain('release/tag deletion');
    expect(release).toContain('explicit confirmation');
    expect(release).toContain('second independent authorization');
    expect(release).toContain('Publication never authorizes');
    expect(release).toContain('vYYYY.MM.DDHHMM-tldraw');
    expect(release).toContain('exact commit SHA');
    expect(release).toContain('within the last 24 hours');
    expect(release).toContain('previous published `-tldraw` release SHA');
    expect(release).toContain('separately designed and authorized rollback path');
    expect(release).toContain('--json tagName,isDraft');
    expect(release).toContain('--json tagName,isDraft,isPrerelease,targetCommitish,body,url');
    expect(release).toContain('not GitHub release `createdAt`');
    expect(release).toContain('workflowName == `Release`');
    expect(release).toContain('event == `release`');
    expect(release).toContain('publishedAt');
    expect(release).toContain('createdAt');
    expectInOrder(release, [
      '## 1. Select the exact staged draft',
      '## 2. Establish the release delta and notes',
      '## 3. Confirm and publish',
      '## 4. Watch the exact production deploy',
      '## 5. Run PVT',
      '## 6. Run the delta-driven spot check',
    ]);
    expect(release).not.toMatch(/\b(?:lite|full|diagramly|asyncapi)\b/iu);
    expect(release).not.toMatch(/cloudflare|wrangler|canary order|soak/iu);
    expect(release).not.toContain('forge deploy -e production');
  });

  it('defines a fail-closed Whiteboard PVT with real UI evidence', () => {
    const pvt = read('.claude/skills/pvt/SKILL.md');

    expect(pvt).toContain('ZenUml/tldraw-confluence');
    expect(pvt).toContain('BLOCKED — no approved production fixture');
    expect(pvt).toContain('Report every missing prerequisite');
    expect(pvt).toContain('expected release tag');
    expect(pvt).toContain('screenshot, accessibility snapshot, or network intercept');
    expect(pvt).toContain('spot-check');
    expect(pvt).not.toMatch(/\b(?:lite|full|diagramly|asyncapi)\b/iu);
    expect(pvt).not.toMatch(/cloudflare|wrangler/iu);
  });

  it('records release and PVT as adapted while keeping unsupported signals deferred', () => {
    const status = read('docs/ops/pipeline-port-status.md');

    expect(status).toMatch(/\| `release-app` \| Adapt \| STRUCTURAL ONLY \|/u);
    expect(status).toMatch(/\| Whiteboard smoke\/PVT \| Adapt \| BLOCKED \|/u);
    expect(status).toMatch(/\| `check-version` \| Defer \| DEFERRED \|/u);
    expect(status).toMatch(/\| `health-check` \| Defer \| DEFERRED \|/u);
  });

  it('keeps the shared PR lifecycle retry and merge semantics', () => {
    const submit = read('.claude/skills/submit-branch/SKILL.md');
    const babysit = read('.claude/skills/babysit-pr/SKILL.md');
    const ship = read('.claude/skills/ship-branch/SKILL.md');
    const land = read('.claude/skills/land-pr/SKILL.md');

    expect(submit).toContain('Clean worktree');
    expect(submit).toContain('Scoped changes');
    expect(submit).toContain('Mixed or unrelated changes');
    expect(babysit).toContain('Do not push or rerun while a prior run is active');
    expect(babysit).toContain('re-diagnose from the new logs');
    expect(babysit).toContain('cancelled push run is duplicate noise');
    expect(babysit).toContain('newest exact-SHA `pull_request` run');
    expect(babysit).toContain('using `databaseId` as the tie-breaker');
    expect(babysit).toContain('newest PR run itself is cancelled');
    expect(babysit).toContain('older PR run from the same SHA');
    expect(ship).toContain('The shipping request authorizes these minimal fixes');
    expect(ship).toContain('at most three fix-and-revalidate attempts');
    expect(land).toContain('squashMergeAllowed');
    expect(land).toContain('rebaseMergeAllowed');
    expect(land).toContain('Timeout after 5 minutes');
  });

  it('hands the release delta from PVT into evidence-backed spot checks', () => {
    const spotCheck = read('.claude/skills/spot-check/SKILL.md');

    expect(spotCheck).toContain('## Post-release handoff');
    expect(spotCheck).toContain('release-app');
    expect(spotCheck).toContain('PVT baseline');
    expect(spotCheck).toContain('behavioral');
    expect(spotCheck).toContain('instrumentation');
    expect(spotCheck).toContain('infra/test/docs');
  });
});
