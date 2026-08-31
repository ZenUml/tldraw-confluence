---
name: forge-tunnel
description: Preflight and run the single ZenUml/tldraw-confluence Forge app through a development tunnel on port 3000. Use for local Confluence UI testing or Forge tunnel diagnostics in this repository.
---

# Forge Tunnel

Test local Whiteboard code through the existing Forge app identity. This repository has one app, one macro resource, and one Custom UI development server on port 3000.

## Safety boundaries

- Use a Forge development environment only.
- Never hard-code a Confluence site, Forge environment, app ID, or account.
- Read ATLASSIAN_SITE from the caller's gitignored local environment. The target package scripts select the standard Forge development environment.
- Never print FORGE_EMAIL, FORGE_API_TOKEN, or their values.
- A routine tunnel session must not deploy to staging or production.
- Tunnel/development-deploy authorization does not authorize an install or upgrade.
- Both install and upgrade require a separately approved test site and explicit authorization. A fresh install is a distinct bootstrap action; do not silently substitute it for upgrade.
- Inspect existing processes before stopping anything. Stop only a process confirmed to belong to this checkout and this session.
- UI success still requires the spot-check skill and actual UI evidence.

## Non-deploying preflight

This section is the validation boundary that can be exercised without changing remote Forge, GitHub, or Confluence state. It intentionally changes one local Forge CLI preference to avoid the non-interactive analytics prompt.

### 1. Verify local inputs without exposing values

Run a check that prints only variable names and set/missing status:

    node -e 'const names=["FORGE_EMAIL","FORGE_API_TOKEN","ATLASSIAN_SITE"]; const missing=names.filter((name)=>!process.env[name]); for (const name of names) console.log(name + ": " + (process.env[name] ? "set" : "missing")); if (missing.length) process.exitCode=1'

Do not use env, set, export -p, or shell tracing while credentials are present.

### 2. Verify the repository command contract

Confirm package.json defines:

- validate
- validate:manifest
- forge:lint
- build:whiteboard
- start:whiteboard
- forge:deploy:tldraw:development
- forge:install:tldraw:development
- forge:upgrade:tldraw:development
- forge:tunnel:tldraw

Missing commands block the tunnel workflow; do not invent replacements.

### 3. Prepare the local Forge CLI

Run:

    pnpm forge:analytics:disable

This writes only the local Forge CLI analytics setting. Report that local mutation;
it does not deploy, install, upgrade, or alter any remote application state.

### 4. Inspect Forge state

Run:

    pnpm exec forge whoami
    pnpm exec forge environments list
    pnpm exec forge install list

These commands establish the authenticated identity and available environment/install state. Do not copy real site identifiers into committed files or public evidence.

### 5. Inspect local listeners and tunnel processes

Run:

    lsof -nP -iTCP:3000 -sTCP:LISTEN || true
    pgrep -lf 'forge.*tunnel|forge:tunnel:tldraw' || true

If port 3000 or a tunnel is already owned by another checkout or session, stop and coordinate. Do not kill it.

### 6. Validate, run authenticated Forge lint, and inspect tunnel help

Run:

    pnpm validate
    pnpm forge:lint
    pnpm exec forge tunnel --help

`pnpm validate` is secretless/offline and includes the pinned internal
`@forge/manifest` structural validator and the Whiteboard build. It is not the
official Forge lint.
`pnpm forge:lint` is the separate authenticated Forge CLI check and is appropriate
here only because this local tunnel preflight already requires Forge credentials.
Do not add those credentials to pull-request CI. Protected staging and production
jobs run the same official lint immediately before deploy.

The preflight stops here. Do not deploy, install, upgrade, start a server, start a tunnel, or kill a process.

Report each preflight item and label every state-changing action:

    STRUCTURAL ONLY / UNVALIDATED — not executed by the preflight

## Stateful tunnel flow — STRUCTURAL ONLY / UNVALIDATED

Use this section only when the user authorized a live development tunnel. The marker remains until this target-specific flow is exercised successfully.

1. Re-run the non-deploying preflight.
2. Build the frontend:

    pnpm build:whiteboard

3. Deploy only to the configured development environment:

    pnpm forge:deploy:tldraw:development

4. If the app is already installed on the approved development site and the user separately authorized an upgrade, use:

    pnpm forge:upgrade:tldraw:development

   Otherwise leave the installation unchanged and report whether that blocks the requested test.

5. If and only if the install listing proves no installation exists and the user separately authorized first-time bootstrap on that approved test site, use:

    pnpm forge:install:tldraw:development

6. Start the CRA development server in an owned long-lived terminal:

    pnpm start:whiteboard

   Wait until port 3000 is listening and confirm the listener belongs to this checkout.

7. Re-check for another Forge tunnel. If none exists, start an owned long-lived tunnel:

    pnpm forge:tunnel:tldraw

8. Confirm the tunnel reports requests, then use spot-check against an approved fixture. Do not claim the local UI is active merely because both processes started.
9. On teardown, interrupt only the server and tunnel started by this session. Re-inspect port 3000 and tunnel processes afterward.

## Output

Report:

- Local Forge CLI analytics setting: DISABLED or BLOCKED
- Forge identity/environment/install discovery: PASS or BLOCKED
- Port 3000 ownership: FREE, OWNED BY THIS CHECKOUT, or BLOCKED
- Secretless/offline validation: PASS or FAIL
- Official Forge lint: PASS, FAIL, or BLOCKED — authentication unavailable
- Whiteboard build (from `pnpm validate`): PASS or FAIL
- Tunnel help: PASS or FAIL
- Stateful flow: STRUCTURAL ONLY / UNVALIDATED, STARTED, BLOCKED, or STOPPED
- UI verification: PASS with evidence, SKIPPED, or BLOCKED
