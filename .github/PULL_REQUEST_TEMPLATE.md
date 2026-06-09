## Summary
<!-- One or two plain-English lines: what this PR does and why it matters. -->

## Changes
<!-- One bullet per change. Name the file/area. -->
-

## Testing
<!-- What was verified: npm run build, lint, manual checks. Be explicit about
     anything that COULD NOT be tested in the build env (live AliExpress,
     live DB, Stripe) so it gets eyeballed after deploy. -->
- `npm run build` —
- Manual —

## Deploy
- **Tag:** `vX.Y.Z-YYYY-MM-DD`
- **Create the release/tag (one tap):** https://github.com/comfybear71/togogo/releases/new?tag=vX.Y.Z-YYYY-MM-DD&title=vX.Y.Z
- After deploy: close/reopen the tab (the PWA service worker caches the old bundle).

## Notes / not touched
<!-- Anything deliberately left alone, pending decisions, or follow-ups. -->
-

<!-- Footer: paste the session link, e.g. https://claude.ai/code/session_xxx -->
