'use strict';
/* ===== CLOUDTOP BRAWL — the seasonal event look (menu theme, floating bits, event chip) =====
   The calendar and the event maps are in stages3.js. Preview any event on any day with ?event=halloween
   (thanksgiving, halloween, christmas, cny, spring, summer), or turn events off with ?event=none. */

const EV_PREVIEW = (() => { try { return new URLSearchParams(location.search).get('event'); } catch (e) { return null; } })();
function curEvent() {
  if (EV_PREVIEW === 'none') return null;
  if (EV_PREVIEW && EVENTS[EV_PREVIEW]) { const e = EVENTS[EV_PREVIEW]; return { id: EV_PREVIEW, name: e.name, icon: e.icon, daysLeft: 0, preview: true }; }
  return eventInfo();
}
function curEventId() { const e = curEvent(); return e ? e.id : null; }
// what floats across the main menu during each event
const EV_MENU_FX = { thanksgiving: ['leaf', ['#e8742a', '#c2401a', '#ffc23a']], halloween: ['bat', ['rgba(20,8,30,.85)']], christmas: ['snow', ['#ffffff']],
  cny: ['lantern', ['#ff3a2a', '#ffb02e']], spring: ['petal', ['#ffc6d9', '#ffffff']], summer: ['bubble', ['rgba(255,255,255,.75)']] };

const EVUI = { id: undefined, cv: null, raf: 0, t: 0 };
function evApply() {
  const e = curEvent(), id = e ? e.id : null;
  // the chip next to the Season chip
  let chip = document.getElementById('ev-chip');
  if (e) {
    if (!chip) {
      const top = document.querySelector('#scr-main .hub-top'), season = document.getElementById('season-chip');
      chip = el('div', { class: 'ev-chip', id: 'ev-chip', role: 'status' });
      if (top) top.insertBefore(chip, season ? season.nextSibling : top.children[1] || null);
    }
    const left = e.preview ? 'preview' : e.daysLeft <= 1 ? 'last day!' : 'ends in ' + e.daysLeft + ' days';
    chip.textContent = ''; chip.append(el('span', { class: 'ev-ico', 'aria-hidden': 'true', text: e.icon }), el('b', { text: e.name + ' event' }), el('span', { text: left }));
    chip.title = 'Seasonal event: special menu look and ' + e.name + ' maps in the stage list.';
  } else if (chip) chip.remove();
  if (EVUI.id === id) return;
  if (EVUI.id) document.body.classList.remove('ev-' + EVUI.id);
  EVUI.id = id;
  document.body.classList.toggle('ev-on', !!id);
  if (id) document.body.classList.add('ev-' + id);
  evMenuFx();
}
/* floating leaves / bats / snow / lanterns / petals / bubbles over the main menu */
function evMenuFx() {
  const scr = document.getElementById('scr-main'); if (!scr) return;
  if (!EVUI.id) { if (EVUI.cv) { EVUI.cv.remove(); EVUI.cv = null; } return; }
  if (!EVUI.cv) { EVUI.cv = el('canvas', { class: 'ev-fx', 'aria-hidden': 'true' }); scr.appendChild(EVUI.cv); }
  if (EVUI.raf) return;
  let last = 0;
  const reduce = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  const frame = now => {
    EVUI.raf = requestAnimationFrame(frame);
    const cv = EVUI.cv; if (!cv || !EVUI.id) { cancelAnimationFrame(EVUI.raf); EVUI.raf = 0; return; }
    if (scr.hidden || now - last < 33) return;   // ~30 fps, only while the menu shows
    last = now; EVUI.t += reduce ? 0 : 2;
    const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const g = cv.getContext('2d'); g.clearRect(0, 0, w, h);
    const fx = EV_MENU_FX[EVUI.id]; if (!fx) return;
    g.save(); g.globalAlpha = 0.8;
    try { evParticles(g, w, h, EVUI.t, fx[0], fx[1]); } catch (e) { }
    g.restore();
  };
  EVUI.raf = requestAnimationFrame(frame);
}
// event maps borrow a stage theme song
const EV_MUSIC = { harvest: 'temple', maple: 'ruins', manor: 'roof', pumpkin: 'ruins', grave: 'orbit', workshop: 'fiesta', village: 'peak', candy: 'peak',
  lanterns: 'dojo', dragon: 'dojo', firecracker: 'neon', blossom: 'dojo', boardwalk: 'cove', island: 'cove', waterpark: 'groove', campfire: 'temple' };
if (typeof TRACKS !== 'undefined') Object.keys(EV_MUSIC).forEach(id => { if (!TRACKS[id] && TRACKS[EV_MUSIC[id]]) TRACKS[id] = TRACKS[EV_MUSIC[id]]; });
evApply();
setInterval(evApply, 60000);   // the event changes at midnight (Vancouver time)
