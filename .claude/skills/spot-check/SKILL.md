---
name: spot-check
description: Perform an ad hoc evidence-backed check of ZenUml/tldraw-confluence behavior in its Forge iframe. Use to verify a Whiteboard fix, staging behavior, or a tunneled UI without adding a checked-in E2E test.
---

# Spot Check

A spot check is an ephemeral verification of one explicitly planned behavior. It is not a unit test, build check, or checked-in browser spec.

## Hard evidence rule

Never mark a UI assertion PASS without observing the UI. Each UI PASS needs evidence from the actual run: a screenshot, accessibility snapshot, or relevant network intercept. A console message, unit test, build, or pnpm test:e2e:list result is not UI evidence.

Do not use real site names, page IDs, cloud IDs, board text, document bodies, raw payloads, or credentials in committed/public evidence. Keep approved evidence in authorized private or local storage and report a privacy-safe path or digest.

## 1. Write the plan before opening a browser

Record:

- Target behavior and exact commit or deployed SHA when known
- Approved environment and fixture, described without public identifiers
- Whether the flow is view, create, edit, or failure handling
- Required setup and permitted mutations
- One row per assertion:

    [ ] Behavior | observable signal | method | expected result | evidence location

Keep creation and editing assertions separate. Do not treat a successful page load as proof that saving, reloading, or error handling works.

## 2. Check authorization and reachability

- Confirm the fixture is approved for this test and the browser is already authenticated through an authorized local mechanism.
- Do not assume a saved browser profile, account, or fixed site.
- Do not create pages, insert macros, edit a board, or publish content unless the requested check authorizes that mutation.
- Use a browser mechanism that can enter a sandboxed cross-origin Forge iframe.

If no approved fixture or suitable authenticated browser is available, stop and report:

    SKIPPED or BLOCKED — no approved UI fixture/browser access

Never convert that result to PASS.

## 3. Execute assertion by assertion

For each planned assertion:

1. Navigate to the approved fixture.
2. Enter the Whiteboard Forge iframe and confirm the intended surface is under test.
3. Perform only the planned interaction.
4. Observe the expected signal.
5. Capture evidence immediately.
6. Record PASS, FAIL, SKIPPED, or BLOCKED before moving on.

For a negative assertion, define the observation window and the signal that must remain absent. Capture the stable final UI or the relevant request history; absence without an observation window is not evidence.

If behavior differs, capture the failure state and stop destructive follow-up actions. Do not alter assertions after seeing the result merely to make the run pass.

## Post-release handoff

When `release-app` invokes this skill, require the exact release tag/SHA, the Step 2
release delta classification, and a PASS result from the PVT baseline. Stop if PVT is
FAIL or BLOCKED.

For every delta commit, preserve its `behavioral`, `instrumentation`, or
`infra/test/docs` classification. Add at least one observable assertion for each
reachable behavioral change. Instrumentation needs an event/request assertion or an
explicit skip reason. Pure infra/test/docs work may be skipped with a concrete reason.
Do not select coverage only by keyword or silently omit a commit that is unreachable
in the released build.

Write the delta assertions before browser use, deduplicate them against the PVT
baseline, then execute the smallest release-specific plan with the same evidence rule.

## 4. Report

Report each assertion with:

- Status: PASS, FAIL, SKIPPED, or BLOCKED
- Expected versus observed result
- Evidence type and privacy-safe location/digest
- Commit/SHA and environment when verified
- Any mutation performed and cleanup status

The overall result is PASS only when every required assertion passed with evidence. Otherwise report FAIL, SKIPPED, or BLOCKED honestly.
