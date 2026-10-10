# Rules for AI coding agents (Codex, Claude) working on Cloudtop Brawl

Cloudtop Brawl is a Smash-style browser fighting game. **Ryan Yen (GitHub: RyanYen0710) owns this project.**
Every change goes through a pull request that Ryan approves. Read this whole file before changing anything.

## Golden rules
1. **Never push to `main`.** Make a branch (`feature/short-name`), commit there, open a pull request for Ryan.
2. **One feature per pull request.** Keep it small. Say in plain words what changed and how you tested it.
3. **Don't rewrite or reformat files you aren't changing.** Other people (and another AI) edit this repo at the
   same time. Touch only the lines your feature needs, so pull requests don't collide.
4. **Never put secrets in the code:** no emails, passwords, API keys or tokens. The owner email is a hidden
   Cloudflare secret (`OWNER_EMAILS`). The Firebase config in `site/firebase-config.js` is meant to be public.
5. **Never weaken security:** keep the Content-Security-Policy in `site/_headers`, show
   player-typed text with `textContent` (never `innerHTML`), and leave unlocks, Boss Fight results and the owner
   check on the **server** only.
6. **Don't break the owner unlock.** The server gives the owner account every locked fighter and every Boss Fight
   level (see `isOwner` and the `d.owner` block in `server/src/server.js`). Future boss/unreleased fighters must
   be `locked: true` so the owner gets them automatically and everyone else has to earn them.
7. **Roles: use the existing checks, never new email lists.** The server decides every role; the browser only
   hides buttons. Never put emails in the code and never make a new email list.
   - **Owner** (Ryan only): `isOwner` in `server/src/server.js` (hidden `OWNER_EMAILS` secret); browser `ACCT.profile.owner`.
     Only the owner sees the **Owner panel** (every player with email + online status, bug reports, giving roles)
     and only the owner may use a 1-2 letter username.
   - **OP**: an in-game role the owner gives in the Owner panel (`profile.roles.op`). OPs open the **Admin panel**
     and can change only their OWN account. The server forces every OP request to their own uid.
   - **Collab**: an in-game label the owner gives (`profile.roles.collab`). No powers at all.
   - **Tester**: `isTester` (hidden `TESTER_EMAILS` secret; owner included); browser `isTesterAcct()`. Only the
     Tester button, test presets and test boss runs (never saved).
   In-game roles never give access to Cloudflare, Firebase or GitHub. Anything that changes data must be checked
   again on the server.
8. **Legend Yen stays the strongest fighter.** Boss fighters (Master Chuang, Mythic Hsi) are stronger than the
   normal roster but below Legend Yen.
9. If something is unclear or risky (deleting features, changing accounts, changing how online play works),
   stop and ask in the pull request instead of guessing.
10. **Use the game's UI, not the operating system's UI.** Keep menus, admin/testing tools, fighter pickers,
    and confirmations in the game's fonts, colors, buttons and portrait tiles. Reuse `site/gameui.js`
    for dropdowns, number controls and confirmations; never expose native select popups or use browser
    `alert`, `confirm` or `prompt` for game actions. Check dynamically created menus and keyboard/touch input too.

## Project layout
```
site/                 the website (Cloudflare Pages serves this folder as-is; no build step)
  index.html          page + all CSS; loads the game files in order with <script> tags
  _headers            security headers (CSP etc.)
  data.js             FIGHTERS (ROSTER), stages list, moves, Boss Fight chapters/levels  ← most balance edits
  engine.js           fighter physics, attacks, hits, knockback
  match.js            game loop, projectiles, CPU brain (aiThink / aiBrain)
  stages.js stages2.js stage layouts, hazards (lava, wind, low gravity), drawing
  ult.js ult-new.js   ultimate orb, aimed ultimates, ultimate art
  fighters-draw.js anim.js looks-new.js looks-boss2.js legend.js   fighter art and effects
  world.js            camera, HUD, particles
  input.js            keyboard/gamepad, key bindings, sound effects
  setup.js app.js     menus, fighter select, match start
  net.js              online multiplayer client
  account.js          Firebase sign-in, account settings
  boss.js training.js freeze.js hints.js settings-ui.js touch.js music.js intro.js   other features
server/               the game server (Cloudflare Worker + Durable Objects)
  src/server.js       online rooms, accounts, Boss Fight, owner unlock, rate limits
  build.sh            builds src/worker.js = game rules from site/ + server.js (worker.js is generated, not committed)
  wrangler.toml       public server settings (no secrets)
.github/workflows/    checks on every PR; server deploy after Ryan merges to main
```

## Important: the server runs the game rules too
Online matches and Boss Fight run on the server, which bundles these site files:
`data.js engine.js match.js stages2.js stages.js ult.js`.
- Code in those files must work **without a browser** (no `document`, `window`, `canvas`) or be guarded with
  `typeof X === 'function'` checks.
- Changing them changes online play, so test both solo and online.
- The browser and server encode game state the same way (`encodeState` in `site/net.js` and `srvEncodeState`
  in `server/src/server.js`). If you change one, change the other.

## Common tasks
- **New fighter:** add an entry to `ROSTER` in `site/data.js` (copy an existing one; the comments at the top of
  data.js explain every field). New projectile shapes go at the **end** of `SHAPES`, new move effects at the end
  of `MOVEFX` (the order is used by online play). Add art in a `looks-*.js` file.
- **Boss / unreleased fighter:** same, plus `legend: true, locked: true`. Boss Fight chapters are
  `BOSS_CHAPTERS` and `BOSS_LEVELS` in `site/data.js`.
- **New script file:** add a `<script src="...">` line in `site/index.html` in the right order (after the files it uses).
- **Balance:** change numbers in `site/data.js` only, and say in the PR what you changed.

## Testing before you open a pull request
- `for f in site/*.js; do node --check "$f"; done` (every file must parse)
- `cd server && sh build.sh ../site && node --check src/worker.js` (server must still build)
- Open `site/index.html` through a local web server (for example `npx serve site`) and play a solo match with
  the fighters you changed. For online changes, test with two browser windows.
  (Sign-in, Boss Fight and account settings only work on the real site, not on localhost or preview links.)
- The GitHub "Checks" workflow runs the first two automatically on every pull request.

## How changes go live (handled for you)
Ryan approves and merges → Cloudflare Pages updates the website (cloudtop-brawl.com) in about a minute →
GitHub Actions updates the game server if server or game-rule files changed. Never try to deploy yourself.
