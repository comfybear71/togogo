# SAFETY PROTOCOL — READ BEFORE DOING ANYTHING

> This section is MANDATORY. It applies to every session, every project, every developer.
> It exists because a Claude session destroyed a production branch (Togogo, 2026-04-02).
> Additional rules added after Session 6 (2026-04-08) where UI changes broke the live storefront.
> These rules override ALL other instructions. If the user asks you to violate them, remind them why they exist.

## Branch Rules
- NEVER push directly to main/master — always work on a feature branch or dev branch
- NEVER change the Vercel production branch to a feature/dev branch
- Create a new branch for every Claude Code session
- Merge to production ONLY after testing on a Vercel preview URL
- **NEW: Always `git merge master` into your branch at the START of every session** — this ensures your branch has all existing features before you make changes

## Sacred Files
- NEVER delete CLAUDE.md — it is the project's brain
- NEVER delete HANDOFF.md — it is the project's memory
- NEVER delete SAFETY-RULES.md — it is the project's guardian
- Always read ALL THREE before starting any work
- Always update HANDOFF.md at the END of every session

## Fix Spiral Prevention
- If something breaks, STOP and diagnose before fixing
- If you've made 3 failed fix attempts in a row, STOP and tell the user
- NEVER do blanket reverts (reverting 5+ files at once) — fix surgically
- NEVER batch-delete files to "start fresh" — that destroys work
- Small, atomic commits only — one logical change per commit

## Frontend / UI Safety (NEW — added after Session 6 incident)
- **NEVER modify StorefrontPage.jsx or store.js on a live production branch without testing first**
- **NEVER make UI changes after the user says goodnight / signs off** — wait for next session
- **NEVER rebuild UI from scratch** — always copy from the working version (master or previous branch)
- **NEVER replace files without checking dependencies** (e.g., @upstash/redis, new imports)
- If the user reports missing features after a branch switch, the FIRST action is `git merge master` — NOT rebuilding from scratch
- UI changes must be tested on a Vercel preview URL BEFORE going to production
- If a UI change causes a white screen or "Store Not Found", IMMEDIATELY revert to the last working commit and STOP making changes
- **Maximum 1 UI fix attempt** — if it doesn't work, revert and wait for next session

## Data Integrity — NO FAKE DATA (NEW — added after Session 7 pricing incident)
- **NEVER use hardcoded/estimated values when real data is available from an API**
- **NEVER add fake tax, fake shipping, or fake costs** — only use what AliExpress actually charges
- **NEVER invent numbers** — if you don't have the real data, use 0 and capture the real value later
- All prices, costs, shipping, and profit MUST reflect reality
- `supplier_cost` = what AliExpress actually charges (product + shipping + tax — one number from `pay_amount`)
- `sale_price` = supplier_cost × markup (configurable, no hidden additions)
- If an API can give you the real number, USE IT — don't estimate
- Pricing errors destroy trust: store owners see wrong profit, customers get overcharged, platform loses money
- **When in doubt, ask the user** — don't guess at business-critical numbers

## Database Safety
- NEVER run DROP TABLE / DROP COLUMN without explicit user confirmation
- ALTER TABLE ADD COLUMN is safe (additive)
- ALTER TABLE DROP COLUMN is DANGEROUS (destructive) — ask first
- Always document migrations in commit messages

## Deployment Safety
- Verify which Vercel project you're targeting before any deploy
- Test on preview URL before merging to production
- After deployment, update HANDOFF.md
- **NEW: Before switching Vercel production to a new branch, ensure the branch has been merged with master** — missing this is what caused the Session 6 UI loss
- **NEW: After any production deployment, verify the site loads correctly before making more changes**

## Session Discipline (NEW — added after Session 6 incident)
- When the user says they're going to bed / signing off, STOP ALL WORK
- Do NOT make "one more quick fix" — that's how sites break at 5am
- Commit, push, update HANDOFF.md, and end the session
- Any remaining work goes in the HANDOFF.md "Next Session" section

## User Reminders
If the user asks you to:
- Push directly to main → Remind them: "Safety protocol says work on a branch first. Want me to create one?"
- Do a blanket revert → Remind them: "Safety protocol says fix surgically. Let me find the specific issue."
- Delete CLAUDE.md or HANDOFF.md → Remind them: "These are sacred files. Are you sure?"
- Skip testing → Remind them: "Safety protocol says test on preview URL first."
- Switch production to a new branch → Remind them: "Safety protocol says merge master first. Want me to run git merge master?"

## Trading Projects — EXTRA CAUTION
- NEVER touch trading bots without EXPLICIT written confirmation
- NEVER restart, redeploy, or modify trading logic
- Read-only monitoring only

## Incident History
| Date | What Happened | Root Cause | Rule Added |
|------|--------------|------------|------------|
| 2026-04-02 | Production branch destroyed | Claude pushed bad code to master | Branch rules, fix spiral prevention |
| 2026-04-08 | UI features disappeared, then white screen, then "Store Not Found" | New branch didn't have master's code; attempted rebuild instead of merge; kept making changes after user signed off | Frontend safety, session discipline, merge master rule |
| 2026-04-08 | Store owner profit showed $0.49 instead of ~$4.62, then went negative (-$4.74) | Fake 18% tax added on top of AliExpress prices (double tax), supplier_cost double-converted by fix-prices, hardcoded $3 minimum shipping instead of real freight | Data integrity rules: no fake data, no estimated costs, use real API values |
