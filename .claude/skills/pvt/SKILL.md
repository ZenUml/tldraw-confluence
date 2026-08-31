---
name: pvt
description: Run evidence-backed production validation for the single Whiteboard Forge app in ZenUml/tldraw-confluence after release deployment succeeds.
---

# Whiteboard Production Validation Testing

PVT is the mandatory immediate check after `release-app` observes a green production
deploy job. It verifies the deployed Whiteboard in a controlled production fixture;
it is not a build, unit test, or Playwright collection check.

## Fail-closed prerequisites

Before opening a browser, require all of:

- an explicitly approved production fixture containing only synthetic board content;
- an authorized authenticated browser that can enter the Forge iframe;
- the expected release tag and exact deployed SHA from `release-app`;
- a product-visible or network-observable build identity tied to that tag and SHA;
- authorization for any edit/save/reload mutation in the fixture.

Report every missing prerequisite by name before stopping. If the approved fixture
is missing, include the canonical status:

    BLOCKED — no approved production fixture

If the fixture exists but another prerequisite is missing, report that actual item
instead—for example `BLOCKED — no visible build identity` or
`BLOCKED — no authorized production browser`. WP1 currently lacks both an approved
production fixture and visible build identity, so report both missing items.

Do not open an arbitrary tenant, infer a page from legacy scripts, mutate customer
content, or claim PASS from staging, CI, unit tests, a build, or test collection.

## Plan before browser use

Once prerequisites exist, invoke the project `spot-check` skill and record these
assertions before navigation:

1. The expected release tag/build identity is observable in the Whiteboard iframe or
   a trusted request.
2. The existing synthetic board renders without an error state.
3. If mutation is authorized, one controlled edit saves and remains present after a
   reload.
4. No unexpected resolver, storage, or browser error is observed during a defined
   observation window.

State the expected result, method, and private evidence location for each assertion.
If the released delta changes a safety-critical path, add its minimal release-specific
assertion; do not replace the baseline assertions.

## Execute and report

Use a browser mechanism that can reach the cross-origin Forge iframe. For every UI
PASS, capture a screenshot, accessibility snapshot, or network intercept from the
actual run. Record the expected release tag, environment, observed build identity,
mutation and cleanup status, and PASS/FAIL/BLOCKED per assertion.

The overall PVT result is PASS only when every required assertion passes with evidence.
On FAIL or BLOCKED, stop the release session and report the evidence. Never publish,
unpublish, redeploy, roll back, or change production gates from this skill.
