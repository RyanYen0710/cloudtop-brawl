'use strict';
/* ===== CLOUDTOP BRAWL — the Shop and your Inventory =====
   Two buttons under "Founder Ryan Yen" on the main menu:
   - Shop: spend coins (shop-data.js) on locked fighters and shop-only skins. The game server checks the price
     and your coins, so nothing can be bought from the browser alone.
   - Inventory: every fighter and every skin. The ones you own are in colour; the rest are gray and locked,
     with how to get them. Pick one of your fighters, then tap a skin to equip it. */

const SHOPUI = { busy: false };
const shopSigned = () => typeof acctSignedIn === 'function' && acctSignedIn() && typeof ACCT !== 'undefined' && !!ACCT.profile;
const shopCoins = () => (shopSigned() ? ACCT.profile.coins | 0 : 0);
const shopFmt = n => Math.round(n).toLocaleString();
const shopOwnsChar = id => isPickable(id, typeof myPicks === 'function' ? myPicks() : MY_UNLOCKED);
const shopOwnsSkin = id => skinAllowed(myProf(), id, mySkinEvent());
const SHOP_ICON = {
  shop: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 10h8l7 30h30l6-22H19l-2-8H6zm18 36a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm24 0a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/></svg>',
  inv: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M24 8h16a4 4 0 0 1 4 4v4h4c6 0 10 4 10 10v26c0 4-3 6-6 6H14c-3 0-6-2-6-6V26c0-6 4-10 10-10h4v-4a4 4 0 0 1 4-4zm2 8h12v-2H26zM16 32v6h32v-6zm10 12v6h12v-6z"/></svg>'
};

/* ---------- the two buttons on the main menu ---------- */
function shopRenderIcons() {
  const scr = document.getElementById('scr-main'); if (!scr) return;
  let box = document.getElementById('hub-icons');
  if (!box) {
    box = el('div', { class: 'hub-icons', id: 'hub-icons' });
    const shop = el('button', { type: 'button', class: 'hub-ico', id: 'go-shop', 'data-tip': 'Shop: spend coins on fighters and skins.', on: { click: showShop } });
    shop.innerHTML = SHOP_ICON.shop + '<span class="hi-txt"><b>Shop</b><span class="hi-coins">🪙 <i id="shop-coins">0</i></span></span>';
    const inv = el('button', { type: 'button', class: 'hub-ico', id: 'go-inventory', 'data-tip': 'Inventory: your fighters and skins. Equip skins here.', on: { click: showInventory } });
    inv.innerHTML = SHOP_ICON.inv + '<span class="hi-txt"><b>Inventory</b></span>';
    box.append(shop, inv);
    const credit = scr.querySelector('.credit');
    if (credit) credit.after(box); else scr.prepend(box);
  }
  const c = document.getElementById('shop-coins'); if (c) c.textContent = shopSigned() ? shopFmt(shopCoins()) : '—';
  const go = document.getElementById('go-shop'); if (go) go.setAttribute('aria-label', 'Shop' + (shopSigned() ? ', ' + shopFmt(shopCoins()) + ' coins' : ''));
  shopPlaceIcons();
}
/* line the buttons up just under the Founder badge */
function shopPlaceIcons() {
  const box = document.getElementById('hub-icons'), credit = document.querySelector('#scr-main .credit'), scr = document.getElementById('scr-main');
  if (!box || !credit || !scr || scr.hidden) return;
  const c = credit.getBoundingClientRect(), s = scr.getBoundingClientRect();
  if (!c.width) return;
  box.style.top = Math.round(c.bottom - s.top + 6) + 'px';
  box.style.right = Math.max(8, Math.round(s.right - c.right)) + 'px';
}
window.addEventListener('resize', shopPlaceIcons);

/* ---------- a dialog like the Sky Road ---------- */
function shopDialog(label, cls) {
  const back = el('div', { class: 'gc-back' }), box = el('div', { class: 'gc-box card shop-box ' + (cls || ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': label, tabindex: '-1' });
  back.appendChild(box); document.body.appendChild(back);
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  const close = () => { document.removeEventListener('keydown', onKey, true); back.remove(); shopRenderIcons(); };
  document.addEventListener('keydown', onKey, true);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  setTimeout(() => box.focus({ preventScroll: true }), 0);
  return { box, close };
}
function shopHead(title, sub) {
  return el('div', { class: 'shop-head' }, [el('div', {}, [el('h3', { text: title }), sub ? el('p', { class: 'muted', text: sub }) : null]),
    shopSigned() ? el('div', { class: 'shop-bal', 'aria-label': shopFmt(shopCoins()) + ' coins' }, [el('span', { text: '🪙' }), el('b', { text: shopFmt(shopCoins()) })]) : null]);
}
function shopTabs(list, cur, pick) {
  const tabs = el('div', { class: 'lb-views', role: 'tablist' });
  list.forEach(([id, name]) => tabs.appendChild(el('button', { type: 'button', role: 'tab', class: 'lb-view' + (cur === id ? ' on' : ''), 'aria-selected': String(cur === id), text: name, on: { click: () => pick(id) } })));
  return tabs;
}
/* a card with a picture of a fighter (wearing a skin) */
function shopCard(charId, skin, name, locked, extra) {
  const cv = el('canvas', { class: 'shop-cv', 'aria-hidden': 'true' });
  const card = el('div', { class: 'shop-card' + (locked ? ' locked' : '') }, [el('div', { class: 'shop-pic' }, [cv, locked ? el('span', { class: 'shop-lock', 'aria-hidden': 'true', text: '🔒' }) : null]), el('b', { class: 'shop-name', text: name })]);
  (extra || []).forEach(x => x && card.appendChild(x));
  requestAnimationFrame(() => drawPortrait(cv, charId, { skin }));
  return card;
}
/* the fighter that shows off skins in the shop: the one you last picked, if you own it */
function shopModel() { const id = typeof loadLocal === 'function' ? loadLocal('cb.char') : ''; return id && CHAR[id] && !CHAR[id].hidden && shopOwnsChar(id) ? id : 'titan'; }
/* how to get a locked fighter */
function charHowTo(c) {
  const ways = [];
  if (SHOP_CHARS[c.id]) ways.push('Shop: ' + shopFmt(SHOP_CHARS[c.id]) + ' coins');
  if (c.unlockLevel) ways.push('Reach level ' + c.unlockLevel);
  const ch = typeof BOSS_CHAPTERS !== 'undefined' && BOSS_CHAPTERS.find(x => x.boss === c.id);
  if (ch) ways.push('Beat Boss Fight level ' + ch.to);
  return ways.join(' · ') || 'Locked';
}

/* ---------- the Shop ---------- */
function showShop() {
  if (typeof SFX !== 'undefined') SFX.play('ui');
  const { box, close } = shopDialog('Shop', 'shop');
  let tab = 'skins', confirm = '';
  const buy = async it => {
    if (SHOPUI.busy) return;
    SHOPUI.busy = true; draw();
    try {
      const r = await acctApi('/api/shop/buy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ item: it.kind + ':' + it.id }) });
      ACCT.profile.coins = r.coins; ACCT.profile.shopSkins = r.shopSkins || []; ACCT.profile.unlocked = r.unlocked || ACCT.profile.unlocked;
      if (it.kind === 'char') setUnlocked(r.unlocked);
      try { [523, 659, 784, 1047].forEach((f, k) => setTimeout(() => SFX.tone(f, 0.16, 'triangle', 0.08), k * 70)); } catch (e) { }
      toast(it.kind === 'char' ? 'You unlocked ' + it.name + '!' : 'You got the ' + it.name + '! Equip it in your Inventory or on the fighter card.');
    } catch (e) {
      const m = e && e.message;
      toast(m === 'coins' ? 'Not enough coins yet.' : m === 'owned' ? 'You already own that.' : m === 'signin' ? 'Sign in to use the shop.' : 'Couldn’t buy that. Try again.');
      if (typeof xpFetch === 'function') xpFetch();
    }
    SHOPUI.busy = false; confirm = ''; draw();
  };
  const priceRow = it => {
    const owned = it.kind === 'char' ? shopOwnsChar(it.id) : shopOwnsSkin(it.id);
    if (owned) return el('div', { class: 'shop-owned', text: '✓ Owned' });
    const key = it.kind + ':' + it.id, short = it.price - shopCoins();
    if (confirm === key) return el('div', { class: 'shop-confirm' }, [el('span', { text: 'Buy for ' + shopFmt(it.price) + '?' }),
      el('div', { class: 'shop-yn' }, [el('button', { type: 'button', class: 'btn primary', text: SHOPUI.busy ? '…' : 'Buy', on: { click: () => buy(it) } }),
        el('button', { type: 'button', class: 'btn ghost', text: 'Cancel', on: { click: () => { confirm = ''; draw(); } } })])]);
    return el('button', { type: 'button', class: 'shop-price' + (short > 0 ? ' short' : ''), 'aria-label': 'Buy ' + it.name + ' for ' + shopFmt(it.price) + ' coins',
      on: { click: () => { if (!shopSigned()) { toast('Sign in to earn coins and shop.'); return; } if (short > 0) { toast('You need ' + shopFmt(short) + ' more coins.'); return; } confirm = key; draw(); } } },
      [el('span', { text: '🪙' }), el('b', { text: shopFmt(it.price) })]);
  };
  const draw = () => {
    box.textContent = '';
    box.appendChild(shopHead('Shop', shopSigned() ? 'Earn coins on the Sky Road and in every match (20 for a win, 5 otherwise).' : 'Sign in to earn coins: Sky Road coin stops and every match you play.'));
    box.appendChild(shopTabs([['skins', 'Skins'], ['chars', 'Fighters']], tab, id => { tab = id; confirm = ''; draw(); }));
    const grid = el('div', { class: 'shop-grid' }); box.appendChild(grid);
    if (tab === 'skins') {
      const model = shopModel();
      SKIN_IDS.filter(id => SKINS[id].shop).forEach(id => {
        const it = shopItem('skin:' + id);
        grid.appendChild(shopCard(model, id, SKINS[id].name, false, [el('small', { class: 'muted', text: 'Shop-only skin' }), priceRow(it)]));
      });
    } else {
      Object.keys(SHOP_CHARS).filter(id => CHAR[id]).forEach(id => {
        const it = shopItem('char:' + id), c = CHAR[id];
        grid.appendChild(shopCard(id, '', c.name, false, [el('small', { class: 'muted', text: c.title || '' }), priceRow(it)]));
      });
    }
    const row = el('div', { class: 'gc-row' });
    if (!shopSigned() && typeof showLogin === 'function') row.appendChild(el('button', { type: 'button', class: 'btn primary', text: 'Sign in', on: { click: () => { close(); showLogin(); } } }));
    row.appendChild(el('button', { type: 'button', class: 'btn', text: 'Inventory', on: { click: () => { close(); showInventory(); } } }));
    row.appendChild(el('button', { type: 'button', class: 'btn', text: 'Close', on: { click: close } }));
    box.appendChild(row);
  };
  draw();
  if (shopSigned() && typeof xpFetch === 'function') xpFetch().then(() => { if (box.isConnected && !SHOPUI.busy) draw(); });   // fresh coins
}

/* ---------- the Inventory ---------- */
function showInventory() {
  if (typeof SFX !== 'undefined') SFX.play('ui');
  const { box, close } = shopDialog('Inventory', 'inv');
  let sel = shopModel();
  const draw = () => {
    box.textContent = '';
    const chars = ROSTER.filter(c => !c.hidden), ownedN = chars.filter(c => shopOwnsChar(c.id)).length;
    const skinIds = SKIN_IDS, skinN = skinIds.filter(shopOwnsSkin).length;
    box.appendChild(shopHead('Inventory', ownedN + ' of ' + chars.length + ' fighters · ' + skinN + ' of ' + skinIds.length + ' skins'));
    // your fighters (pick one to dress up)
    box.appendChild(el('h4', { class: 'inv-h', text: 'Fighters' }));
    const fg = el('div', { class: 'shop-grid inv-chars', role: 'radiogroup', 'aria-label': 'Fighters' }); box.appendChild(fg);
    chars.forEach(c => {
      const own = shopOwnsChar(c.id), on = sel === c.id;
      const card = shopCard(c.id, own ? mySkin(c.id) : '', c.name, !own, [own ? null : el('small', { class: 'muted', text: charHowTo(c) })]);
      card.classList.toggle('on', on);
      card.setAttribute('role', 'radio'); card.setAttribute('aria-checked', String(on)); card.tabIndex = 0;
      card.setAttribute('aria-label', c.name + (own ? '' : ' (locked: ' + charHowTo(c) + ')'));
      const act = () => { if (!own) { toast(c.name + ': ' + charHowTo(c)); return; } if (typeof SFX !== 'undefined') SFX.play('ui'); sel = c.id; draw(); };
      card.addEventListener('click', act); card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
      fg.appendChild(card);
    });
    // skins, shown on the picked fighter
    const cur = mySkin(sel), ev = mySkinEvent();
    box.appendChild(el('h4', { class: 'inv-h', text: 'Skins for ' + CHAR[sel].name }));
    const sg = el('div', { class: 'shop-grid inv-skins', role: 'radiogroup', 'aria-label': 'Skins for ' + CHAR[sel].name }); box.appendChild(sg);
    ['', ...skinIds].forEach(id => {
      const own = !id || shopOwnsSkin(id), on = (id || '') === cur, s = SKINS[id];
      const why = !id ? 'The normal look' : own ? (s.event ? EVENTS[s.event].name + ' skin' : s.shop ? 'Shop skin' : 'Sky Road skin') : skinLockText(s);
      const card = shopCard(sel, id, id ? s.name : 'Classic', !own, [el('small', { class: 'muted', text: why }), own ? el('div', { class: on ? 'shop-owned' : 'shop-equip', text: on ? '✓ Equipped' : 'Equip' }) : null]);
      card.classList.toggle('on', on);
      card.setAttribute('role', 'radio'); card.setAttribute('aria-checked', String(on)); card.tabIndex = 0;
      card.setAttribute('aria-label', (id ? s.name : 'Classic') + (own ? '' : ' (locked: ' + why + ')'));
      const act = () => {
        if (!own) { toast((id ? s.name : 'Classic') + ': ' + why); return; }
        if (typeof SFX !== 'undefined') SFX.play('ui');
        setMySkin(sel, id);
        const sc = document.getElementById('statcard'); if (sc) sc.dataset.id = '';
        draw();
      };
      card.addEventListener('click', act); card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
      sg.appendChild(card);
    });
    if (ev && !shopSigned()) box.appendChild(el('p', { class: 'muted', text: 'Sign in to keep event skins and buy shop skins.' }));
    const row = el('div', { class: 'gc-row' }, [el('button', { type: 'button', class: 'btn', text: 'Shop', on: { click: () => { close(); showShop(); } } }), el('button', { type: 'button', class: 'btn', text: 'Close', on: { click: close } })]);
    box.appendChild(row);
  };
  draw();
}

/* keep the coin count fresh */
let shopLastKey = '';
setInterval(() => {
  const key = (shopSigned() ? ACCT.user.uid + ':' + shopCoins() : '-') + ':' + (typeof G !== 'undefined' ? G.screen : '');
  if (key !== shopLastKey) { shopLastKey = key; shopRenderIcons(); }
}, 1000);
shopRenderIcons();
