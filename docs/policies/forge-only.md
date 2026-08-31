# Forge-only policy

The Confluence Whiteboard app is Forge-only. It is not a Forge-from-Connect app.

## Runtime boundary

- Use Forge functions and `@forge/api` for server-side platform access.
- Use `@forge/bridge` for Custom UI communication.
- Do not add `AP.*`, `xdm_e`, Connect iframe hosts, Connect descriptors, or Connect
  environment detection.
- Do not introduce a Cloudflare, D1, or external service dependency for Whiteboard
  document load, render, edit, or recovery.

## Identity boundary

The existing app ID, `whiteboard` macro key, `storage:app` scope, function keys, and
resource wiring are compatibility contracts. WP1 must not change `manifest.yml`.

Do not copy `conf-app` guidance that relies on retained Connect consent. Permission,
scope, provider, remote, or egress changes for this app require their own Forge
documentation review and deployment evidence.

## Deploy and install boundary

- Normal staging or production deployment uses the existing registered app.
- Never run `forge register` during renovation or release.
- Normal deployment does not install or upgrade tenant installations.
- Bootstrap or upgrade requires an explicitly approved test tenant and separate
  authorization.
- Never hard-code a tenant in a production deploy command or infer one from legacy
  scripts.

Forge authentication values are supplied through protected environment variables and
secrets. Commands may prove access without printing secret values.
