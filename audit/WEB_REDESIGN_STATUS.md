# Redesign and publishing handoff

The user requested the remaining release work, GitHub/Vercel publishing, and a less generic visual design. Antigravity implemented a paper/ink/forest style and rewrote all four views. Independent review is still pending; do not publish this working tree yet.

Read `audit/WEB_DESIGN_REVIEW.md` and resolve every item through Antigravity. Critical: ValidationView again hardcodes Pass and missing-data success defaults. `web/tests/independent_validation.test.tsx` independently reproduces 3 failures (empty evidence, failed evidence, spectral descriptive status). The original 63 tests pass, and 2 of 5 additional validation tests pass. Preserve all independent assertions.

Other review items: square physical 2D geometry with shared draw/click bounds; mobile transport toolbar before inspector; small text contrast. Core/worker/config-validation and original seven mounted control-test file hashes remain unchanged from accepted prior version.

Release preparation completed: local git initialized on main; Node24 pinned in package engines/lockfile/.nvmrc and GitHub CI; .vercelignore excludes professor papers, allocation image, research-only directories and environments from app upload. Root README excluded-log link corrected. No commit/push/repository creation/deployment has occurred.

GitHub browser is signed in as ChandranilDas; new-repository form prepared for public IDC_P20 (name available), README initialization off, license unset. The GitHub connector cannot create a repository. Vercel CLI authenticated by user, default team scope `neels-projects-ba0f47d9`. Do not expose credential files. Use authenticated Vercel CLI/API without extracting tokens.

The Mac locked during work; desktop-control tool requires manual unlock. User was asked asynchronously to unlock and reply unlocked. Do not bypass lock or switch away from the requested Antigravity implementation workflow.

After fixes: run full tests/build, browser review desktop/mobile, execute real live and saved flows/exports, verify exact dataset assets/protected research hashes, save new screenshots. Only then publish GitHub, run CI, deploy a Vercel preview, configure project root web/Node24, connect repository, finish public CV link and portfolio docs. Scientific papers stay local.

## Resume verification (2026-11-11)

Desktop briefly recovered and Antigravity visibly received the independent review request and started reading package.json/audit_evidence.json. Duplicate queued request was removed. Additional item7 records the About PRNG mismatch. Desktop locked again before implementation could be verified. Current independent run: 65/68 web tests pass, the same 3 evidence-integrity failures remain; 13/13 Python tests pass; production build passes; three binary datasets remain bitwise equal to NPZ and 18 research hashes unchanged. Vercel CLI whoami still authenticated. No commit, remote, repository creation or deployment yet. Browser handoff tabs: local redesign 8, old production 4, GitHub creation form5, Vercel auth6 (old device-code page expired but CLI authentication works). Resume via Antigravity, avoid publishing until corrected evidence and visual acceptance.
