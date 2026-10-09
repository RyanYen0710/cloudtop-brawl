# Admin panel setup

The main menu's **Admin panel** replaces **Tester**. Access is checked by the
game server against a private `ADMIN_EMAILS` secret, using the verified email in
a signed Firebase ID token. Start with the one requested admin account. Add the
second account only when its identity has been confirmed.

## Before merging

An authorized Cloudflare maintainer must set `ADMIN_EMAILS` on the existing
`cloudtop-brawl-server` Worker. Use **Secret**, not a public variable, and enter
only the requested verified account address. Do not paste real addresses into
this document, the pull request, `wrangler.toml`, or any tracked file.

From an authenticated maintainer terminal, the equivalent interactive command is:

```sh
cd server
npx --yes wrangler@4 secret put ADMIN_EMAILS
```

The local `server/.dev.vars` file is Git-ignored and can hold the same setting
for local development. Local settings do not configure the live Worker.
No Durable Object migration or extra storage binding is required.

After Ryan approves and merges the pull request, the existing workflows deploy
the site and server. Sign out and back in on the real site, using the configured
account, and check that **Admin panel** appears. Verify a normal player's menu
hides the panel and their direct requests to `/api/admin/*` return 403.

The list accepts one or two distinct addresses, separated by commas. An empty
list, or a list containing more than two addresses, disables admin access.
The old `TESTER_EMAILS` list and `OWNER_EMAILS` do not grant admin access.
`OWNER_EMAILS` still preserves the creator's automatic fighters and boss levels.
Changing an admin's email removes access until the private setting is updated.

## Tools

- **Boss testing:** jump to any level, select any visible fighter, move to the
  previous/next level, and practice against CPUs. Test results never save to
  account progress. Normal Boss Fight still requires sequential progression.
- **Player accounts:** find an exact username or Firebase UID; grant locked
  fighters; change levels cleared and boss wins; or stage a progress reset.
  Each save requires confirmation and a reason. The server writes the account
  and its before/after activity record in one transaction. Stale edits return
  409 rather than overwriting newer boss progress or another admin's changes.
  Earned chapter fighters are kept according to the selected progress. Creator
  accounts cannot be reset or have their automatic unlocks removed.
- **Bug reports:** verified players submit a title, description, optional
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
