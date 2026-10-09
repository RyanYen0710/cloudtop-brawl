# Admin panel setup

The main menu has separate **Testing** and **Admin panel** buttons. Testing
opens practice tools whose results never save; Admin panel opens real account
unlocks, progress management, and the bug-report inbox. Every privileged route
uses the existing server `isTester` permission and the browser's `isTesterAcct()`
check. The hidden `TESTER_EMAILS` setting grants tester access; the existing
owner always has access. No new role or email list is introduced.

## Before merging

An authorized Cloudflare maintainer must configure the existing `TESTER_EMAILS`
secret on `cloudtop-brawl-server` to contain only the two verified accounts
confirmed by the requester: their account and Ryan’s account. Ryan also keeps
his existing owner access through `OWNER_EMAILS`. Remove any other tester entries
and confirm owner membership belongs only to Ryan to limit access to these two
people. Do not paste real addresses into tracked files or the PR.

```sh
cd server
npx --yes wrangler@4 secret put TESTER_EMAILS
```

Both confirmed accounts are configured locally in the Git-ignored `server/.dev.vars`.
This does not configure the live Worker. No Durable Object migration or extra
storage binding is required. After Ryan approves and merges, the existing
workflows deploy the site and server. Sign out and back in on the real site
and check that **Testing** and **Admin panel** appear. A normal player's menu hides the panel
and direct requests to `/api/admin/*` return 403. Admin access requires a verified
email in a signed Firebase token; client-supplied roles cannot grant access.

## Tools

- **Testing section:** jump to any level, select any visible fighter, move to the
  previous/next level, and practice against CPUs or in Training Lab. Test results never save to
  account progress. Normal Boss Fight still requires sequential progression.
- **Admin panel / Player accounts:** open your own account with **Manage my account**, or find an exact username or Firebase UID; grant locked
  fighters; change levels cleared and boss wins; or stage a progress reset.
  Each save requires confirmation and a reason. The server writes the account
  and its before/after activity record in one transaction. Stale edits return
  409 rather than overwriting newer boss progress or another admin's changes.
  Earned chapter fighters are kept according to the selected progress. Creator
  accounts cannot be reset or have their automatic unlocks removed.
- **Admin panel / Bug reports:** verified players submit a title, description, optional
  reproduction steps, category and impact. The server adds their authenticated
  identity and stores reports privately. Only admins can read the inbox, add
  investigation notes, or set open/investigating/resolved/closed status. The
  inbox loads 50 reports at a time, newest first, with older-report pagination.
  A player can send at most two reports per minute and ten per day, with a
  separate shared-IP limit. Report text is displayed with `textContent`.

Account progress and unlock edits apply on the player's next sign-in/profile
refresh or match connection. A fight already in progress keeps its starting
configuration. Admin tools do not change passwords, sign-in credentials, or
admin membership, and do not delete accounts or reports.

## Validation

```sh
for f in site/*.js; do node --check "$f" || exit 1; done
cd server
sh build.sh ../site
node --check src/worker.js
node --test test/admin-panel.cjs test/tester-mode.cjs test/boss-pause.cjs test/titan-avalanche.cjs
```

The admin route checks use locally signed test tokens and isolated storage;
they never edit live accounts. Browser QA uses fake accounts and a local
sample server. Real sign-in and the deployed Worker still require the live
verification described above.
