'use strict';
/* ===== CLOUDTOP BRAWL — coins and shop prices =====
   Coins are only for signed-in players, and only the game server gives them out or spends them:
   - Sky Road coin stops: every 2 levels up to level 30 (500 coins, then 25 fewer each stop, down to 150),
     then every 3 levels (140, then 5 fewer each stop, never under 50)
   - every match: 20 coins for a win, 5 for a loss or draw
   The shop sells locked fighters and shop-only skins (skins.js has the skins and their prices).
   The game server uses this same file, so the prices can't be changed from the browser. */

const COINS_WIN = 20, COINS_LOSS = 5;
/* the coins waiting at a level on the Sky Road (0 = no coin stop) */
function coinStop(lv) {
  lv = lv | 0;
  if (lv >= 2 && lv <= 30 && lv % 2 === 0) return 500 - 25 * (lv / 2 - 1);
  if (lv > 30 && lv % 3 === 0) return Math.max(50, 140 - 5 * ((lv - 33) / 3));
  return 0;
}
/* all the coin stops after level `from`, up to and including level `to` */
function coinsForLevels(from, to) { let n = 0; for (let lv = (from | 0) + 1; lv <= (to | 0); lv++) n += coinStop(lv); return n; }
/* locked fighters you can buy (Boss Fight and the Sky Road still unlock them for free) */
const SHOP_CHARS = { sprocket: 8000, chuang: 15000, hsi: 15000, yen: 40000 };
/* 'char:yen' or 'skin:lava' -> { kind, id, price, name }, or null if it isn't for sale */
function shopItem(item) {
  const m = /^(char|skin):([a-z]{1,24})$/.exec(String(item || ''));
  if (!m) return null;
  const id = m[2];
  if (m[1] === 'char') return SHOP_CHARS[id] && typeof CHAR !== 'undefined' && CHAR[id] ? { kind: 'char', id, price: SHOP_CHARS[id], name: CHAR[id].name } : null;
  const s = typeof SKINS !== 'undefined' && SKINS[id];
  return s && s.shop ? { kind: 'skin', id, price: s.shop, name: s.name + ' skin' } : null;
}
