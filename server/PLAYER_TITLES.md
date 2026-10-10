# Player titles and monthly seasons

Players choose one cosmetic ribbon in **Settings → Account → Player titles**, or choose No title.
The game shows it in the account button, account preview, match HUD (when there is enough room),
and results. Refresh titles updates current role/rank eligibility. Ribbons use the game's fonts,
colors, buttons and keyboard controls; there are no native picker popups.

| Title | Eligibility |
| --- | --- |
| Owner | Current `isOwner` check, using the existing hidden `OWNER_EMAILS` setting |
| Admin | Current owner or `profile.roles.op` |
| Collaborator | `profile.roles.collab`; grants no permissions |
| First Victory | A confirmed normal Boss Fight win |
| Legend Slayer | A confirmed normal win at Boss Fight level 10 |
| Boss Master | A confirmed normal win at Boss Fight level 30 |
| Arena Regular | 25 completed server-verified online matches/Boss Fights after this feature launches |
| Top Ten | Currently in the monthly season's top 10 |
| Season Leader | Currently first in the monthly season |
| Season Champion | Winner of any completed monthly season; permanent |

Tester membership alone does **not** grant Admin. Titles never grant privileges or change stats.
No new email list, secret or Firebase configuration is needed. Ryan's existing owner access and
automatic fighter/Boss level unlocks remain intact.

## Seasons

Each UTC calendar month is a season. A match belongs to the month in which its result is recorded
by the game server. Points are **10 per win + 2 per KO**; ties use most wins, then a stable account
ID order. Usernames do not decide ties, and private IDs never appear on the public seasonal board.
The new **This season** leaderboard tab explains this and displays recent completed champions.

Season records are separate from the existing all-time leaderboard. Owner stat edits/reordering,
time-online pings, local CPU games and Tester Boss runs cannot change seasonal scores or award titles.
Past seasons are finalized transactionally on the first leaderboard/title/account read after the
month ends; no scheduler or deployment configuration is needed. Empty months have no champion.
Existing all-time records, editable board order, and game balance are unchanged.

Seasons and Arena Regular start with new verified results after deployment. Boss achievement titles
also require a new normal win; old `beaten`/`wins` fields cannot prove an earned title because owner
auto-unlocks and account repairs can alter those fields. Existing players can replay the relevant
Boss Fight level to earn its ribbon. There is no migration or automatic backfill.

## Storage and authority

Accounts store `earnedTitles` for confirmed Boss wins and one `equippedTitle` ID. `/api/me` returns
server-computed `ownedTitles`, the currently eligible equipped title and champion months.
`POST /api/title` requires verified sign-in and rejects unknown/unowned IDs; role eligibility is
checked against the current profile inside its transaction. Removing a role or losing rank hides
that ribbon on the next account refresh/match. The old selection may become available again if
the player regains eligibility. Owner protection and account edit revisions are preserved.

The board stores `season:YYYY-MM:uid`, `season-month:YYYY-MM`, `champion:YYYY-MM` and
`verified-games:uid`. Seasonal writes occur only inside the server's trusted match-result operation.
Completed winners are immutable, and champion reads are safe to repeat.

For online matches/Boss Fights, separate metadata comes from the authenticated game-server socket,
with each player's profile rechecked at match start. Client lobby/picker claims and public MQTT
presence cannot supply ribbons. The reserved `srv` peer ID prevents a player from impersonating
server metadata. No physics/state encoding fields changed. Public-relay-only matches do not show
verified titles for remote players.

## Validation

Build the Worker, then run `node --test server/test/player-titles.cjs` and the existing regression
suite. Tests cover roles/revocation, forged requests, persistence, owner auto-unlocks/repairs,
season rollover, immutable scoring, concurrent results, thresholds, ties, public privacy, and
online metadata impersonation. Browser QA uses isolated local accounts; it does not modify live
Firebase accounts or verify production deployment.
