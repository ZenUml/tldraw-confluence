---
name: check-version
description: Verify the visible Whiteboard build version, exact commit, SDK, and environment in an authorized Forge iframe or synthetic development fixture.
---

# Check Whiteboard Version

Use the rendered build-identity surface as evidence that a specific Whiteboard artifact is under test. Do not infer identity from an asset filename, Git branch, page URL, Forge deployment timestamp, or the currently checked-out source.

## Inputs and authorization

Require the expected full 40-character commit, app version, environment type, and an approved browser/fixture. For production, also require the exact release tag supplied by `release-app`. Do not invent a tenant, page, browser profile, or authentication path.

If the authorized browser or fixture is unavailable, report `BLOCKED` with the missing prerequisite. Do not convert a build, unit test, or Playwright collection result into a UI PASS.

## Verification

Enter the actual Whiteboard iframe and read `[data-testid="whiteboard-build-identity"]`. It must display:

- the expected app version;
- the first seven characters of the expected commit;
- SDK `1.26.2`;
- exactly one of `local`, `ci`, `development`, `staging`, or `production`, matching the expected environment.

For exact-artifact verification, corroborate the seven-character UI abbreviation against the expected full SHA from the trusted release or staging workflow input. The UI abbreviation alone is not collision-resistant evidence of an arbitrary commit.

Capture an iframe screenshot or accessibility snapshot showing the identity. Keep tenant, page, and customer identifiers out of public artifacts; store evidence only in the approved private location and report a privacy-safe digest.

## Result

Report the expected and observed version, full expected SHA, observed short SHA, SDK, environment, evidence digest, and `PASS`, `FAIL`, or `BLOCKED`. A mismatch is `FAIL`; never navigate to another artifact merely to obtain a match.
