# Client privacy policy

This repository is public. Customer and tenant information must not be committed.

## Prohibited public data

Do not place any of the following in source, tests, Markdown, screenshots, workflow
artifacts, PR descriptions, logs, or analytics:

- a real Confluence tenant hostname or subdomain prefix;
- a customer page title, page ID, cloud ID, space identifier, or macro local ID;
- credentials, tokens, OTP seeds, cookies, or authenticated browser state;
- a customer Whiteboard body, shape text or properties, raw JSON, compressed payload,
  or a reversible derivative;
- complete Forge context or raw exception text that may embed tenant data;
- screenshots, traces, videos, or URLs that identify a customer.

Use placeholders such as `example.atlassian.net`, `EXAMPLE`, and synthetic UUIDs.
Synthetic board fixtures must be authored for tests; do not “sanitize” customer board
bodies into the public repository unless a separately reviewed process proves that
the result cannot identify or reconstruct customer data.

## Artifact routing

- Public repository: synthetic fixtures, placeholder configuration, code, and
  non-identifying aggregate evidence.
- Approved private storage: authorized customer investigations and UI evidence that
  may identify a tenant.
- Local ignored files: credentials, `.env`, auth state, and temporary browser output.

Public references to private UI evidence use an approved opaque digest, never a
tenant/page URL or screenshot path containing customer details.

## Logging and analytics

New or modified runtime code may record stable event names, outcome/error codes,
format/version labels, duration buckets, and size buckets. It must not record the
document, compressed bytes, local ID, tenant identity, shape data, complete context,
or raw error message.

Before committing, inspect every changed and untracked public file. A clean secret
scan does not replace review for page titles, diagram text, or screenshots.

If a legacy artifact exposes tenant data through image metadata or another hidden
payload, remove it from the current tree without repeating the identifier in a public
issue or PR. Purging an already-published Git object requires a separately authorized
history rewrite and coordinated force-push; route that follow-up privately.
