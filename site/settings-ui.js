'use strict';
/* ===== CLOUDTOP BRAWL — Settings tabs and the key-binding editor ===== */

const SETUI = { tab: 'sound', wait: null };

function setTab(id) {
  SETUI.tab = id; stopKeyWait();
  document.querySelectorAll('#settings .set-tab').forEach(b => { const on = b.dataset.tab === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  document.querySelectorAll('#settings .set-pane').forEach(p => { p.hidden = p.dataset.pane !== id; });
  if (id === 'controls') renderKeybinds();
  if (id === 'account' && typeof renderAcctPane === 'function') renderAcctPane();
}
document.querySelectorAll('#settings .set-tab').forEach(b => b.addEventListener('click', () => { SFX.play('ui'); setTab(b.dataset.tab); }));
document.querySelectorAll('[data-open-settings]').forEach(b => b.addEventListener('click', () => setTab(SETUI.tab)));

/* ---------- key bindings ---------- */
function kbMsg(t, cls) { const m = document.getElementById('kb-msg'); if (m) { m.textContent = t || ''; m.className = 'set-note' + (cls ? ' ' + cls : ''); } }
function renderKeybinds() {
  const box = document.getElementById('keybinds'); if (!box) return;
  box.textContent = '';
  BIND_ACTIONS.forEach(([id, name]) => {
    const lab = document.createElement('span'); lab.textContent = name; box.appendChild(lab);
    [0, 1].forEach(slot => {
      const code = (BINDS[id] || [])[slot] || '';
      const waiting = SETUI.wait && SETUI.wait.id === id && SETUI.wait.slot === slot;
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'kb-key' + (waiting ? ' wait' : code ? '' : ' empty');
      b.textContent = waiting ? 'Press a key…' : code ? keyName(code) : '—';
      b.setAttribute('aria-label', `${name}, key ${slot + 1}: ${code ? keyName(code) : 'none'}. Click to change.`);
      b.addEventListener('click', e => { e.stopPropagation(); SFX.play('ui'); SETUI.wait = { id, slot }; kbMsg(`Press a key for “${name}”. Esc removes it.`); renderKeybinds(); });
      box.appendChild(b);
    });
  });
}
function stopKeyWait() { if (SETUI.wait) { SETUI.wait = null; renderKeybinds(); } }
/* while waiting for a key, catch it before the game or the settings window sees it */
window.addEventListener('keydown', e => {
  if (!SETUI.wait) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const { id, slot } = SETUI.wait, name = (BIND_ACTIONS.find(a => a[0] === id) || [])[1] || id;
  if (e.code === 'Escape') { setBind(id, slot, ''); SETUI.wait = null; kbMsg(`Removed that key from “${name}”.`, 'ok'); renderKeybinds(); return; }
  if (RESERVED_KEYS[e.code]) { kbMsg(`${keyName(e.code)} is already used for ${RESERVED_KEYS[e.code]}. Pick another key.`, 'err'); return; }
  const was = BIND_ACTIONS.find(([k]) => k !== id && (BINDS[k] || []).includes(e.code));
  setBind(id, slot, e.code); SETUI.wait = null;
  kbMsg(was ? `${keyName(e.code)} now does “${name}” (it was taken off “${was[1]}”).` : `${keyName(e.code)} now does “${name}”.`, 'ok');
  SFX.play('ui'); renderKeybinds();
}, true);
document.addEventListener('click', e => { if (SETUI.wait && !e.target.closest('.kb-key')) { SETUI.wait = null; kbMsg(''); renderKeybinds(); } });
const kbReset = document.getElementById('kb-reset');
if (kbReset) kbReset.addEventListener('click', () => { SFX.play('ui'); resetBinds(); SETUI.wait = null; kbMsg('All keys are back to the defaults.', 'ok'); renderKeybinds(); });
