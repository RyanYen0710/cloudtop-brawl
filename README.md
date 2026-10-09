# Cloudtop Brawl

A Smash-style fighting game that runs in the browser. Play at **https://cloudtop-brawl.com**

Founder: **Ryan Yen**

## Working on the game together
1. Make a branch for your change (one feature per branch).
2. Commit your work there and open a **pull request**.
3. Cloudflare posts a **preview link** on the pull request so you can play your version.
4. Ryan reviews it and clicks **Merge**. Only Ryan can approve changes to `main`.
5. After the merge, the website and the game server update by themselves.

Pick different features so you aren't editing the same files at the same time.
If GitHub says there's a **conflict**, nothing was lost: it shows both versions so you can choose.

## Using an AI helper (Codex or Claude)
Point it at this repo. It reads **AGENTS.md** automatically, which explains how the project is laid out and the
rules every change must follow.

## Folders
- `site/` – the game website (no build step; Cloudflare Pages serves it as-is)
- `server/` – the online game server (Cloudflare Worker)
- `.github/` – automatic checks, the server auto-deploy, and code ownership

## Run it on your computer
```
npx serve site
```
Then open the address it prints. Solo, Training Lab and Online with friends work there and on preview links.
Sign-in, Boss Fight and account settings only work on the real website (cloudtop-brawl.com).
