## Summary

- What changed and why?

## Validation

- [ ] `pnpm validate`
- [ ] Guarded runtime paths are unchanged, or this is not a WP1 change
- [ ] Ported skills/workflows are labelled with their actual validation status

## UI evidence

- Classification: `SKIPPED — no runtime change`, `PASS`, or `BLOCKED`
- Evidence or reason:

Do not mark a UI assertion PASS without a screenshot, snapshot, or network/resolver intercept.

## Identity and persistence

- [ ] Forge app ID unchanged
- [ ] Macro key `whiteboard` unchanged
- [ ] `storage:app`, legacy key derivation, and stored value formats unchanged

## Release impact

- Staging impact:
- Production impact:
- Rollback notes:

## Merge prerequisites

- [ ] `staging-tldraw` and `production-tldraw` are configured as documented
- [ ] `main` requires the authoritative `Build and Unit Test` check
