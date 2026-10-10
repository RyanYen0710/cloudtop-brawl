# Owner panel, Admin panel and roles

The main menu shows up to three private buttons. Each one is only a shortcut: the
server checks the signed-in account again for every request.

| Button | Who sees it | What it does |
|---|---|---|
| **Owner panel** | The owner only (verified email in `OWNER_EMAILS`) | Every player (username, email, online/offline), each player's Info / Boss Fight / Characters, giving the OP and Collab roles, and the bug-report inbox (with delete). |
| **Admin panel** | OPs and the owner | Your **own** account only: Boss Fight progress and fighters. Testers also get Test presets here. |
| **Tester** | `TESTER_EMAILS` (owner included) | Tester mode: every fighter and level, nothing saved. |

Roles:
- **OP** - given by the owner. Can change only their own account. The server ignores any other uid an OP sends.
- **Collab** - given by the owner. A label only; it gives no powers.
- Roles live in the player's account storage (server-only) and never give access to Cloudflare, Firebase or GitHub.
- Only the owner may use a 1-2 letter username; everyone else needs 3-16.

Online status: the game sends a small "still playing" ping every 2 minutes while it is open.
A player counts as **online** if the game was open in the last 5 minutes. Emails are saved
only from the signed (verified) Firebase sign-in, so a player's email appears after their
next sign-in. Players who have not signed in since this update still appear (from the
username list) without an email.

## Older notes

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
- **Admin panel / Test presets:** open a Titan Ape vs level 5 or level 10 CPU
  setup on a random stage, Training Lab, or the first/final Boss Fight level.
  Choose fighters using the game's portrait tiles before starting. These use
  the existing tester permission and Boss test results never save to progress.
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
