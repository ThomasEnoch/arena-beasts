/* Arena Beasts - input in a battle. Each key, mouse button and wheel direction goes through the key bindings (js/keys.js).
   An action of the player becomes: a change of the control record of the side (solo and host), or a message to the host (guest). */
(function () {
  'use strict';
  var G = window.G, A = G.APP, R = G.R, Net = G.Net, UI = G.UI, SET = G.SET, KEYS = G.KEYS, $ = A.$;
  var cv = $('cv'), ui = A.ui;
  var MOVEI = { move1: 0, move2: 1, move3: 2, move4: 3 }, SWI = { sw1: 0, sw2: 1, sw3: 2, sw4: 3, sw5: 4, sw6: 5 };
  var wheelT = 0, wheelTimer = 0, inT = 0, pingT = 0;

  function live() { return A.state === 'battle' && A.battle && !A.battle.over; }
  // Put one action into the control record of a side. si = 0 or 1.
  function applyAct(si, name, i) {
    var s = A.battle.sides[si], c = s.ctrl;
    if (name === 'move') { if (i >= 0 && i < 4) { c.move = i; c.moveT = 0.35; } }
    else if (name === 'dodge') { c.dodge = true; c.dodgeT = 0.2; }
    else if (name === 'sig') { c.sig = true; c.sigT = 0.35; }
    else if (name === 'sw') { if (i >= 0 && i < 6 && s.team[i] && !s.team[i].fainted && i !== s.active) { c.sw = i; c.swT = 0.6; } }
  }
  // One action of this player.
  function act(name, i) {
    if (!live()) return;
    if (name === 'menu') { openPause(); return; }
    if (name === 'auto') { if (A.mode === 'solo' && !A.daily) toggleAuto(); return; }   // the Daily Proving has no auto play
    if (ui.paused || ui.auto) return;
    if (A.mode === 'host' && A.away && A.waitLeft > 0) return;   // the battle is on hold
    if (A.mode === 'guest') { Net.send({ t: 'a', k: name, i: i, ax: A.r1(ui.mx), ay: A.r1(ui.my) }); return; }
    applyAct(0, name, i);
  }
  function toggleAuto() {
    var s = A.battle.sides[0], c = s.ctrl;
    ui.auto = !ui.auto; s.isAI = ui.auto;
    if (ui.auto) A.autoUsed = true;                   // the ledger gives fewer marks for this battle
    if (ui.auto) s.ai = G.makeAI('normal');
    c.mx = c.my = 0; c.guard = false; c.move = -1; c.sw = -1;
    G.sfx('ui');
  }
  // Open the pause menu (js/ui.js). A solo battle stops. An online battle continues.
  function openPause() {
    if (!live() || UI.overlay) return;
    if (A.mode === 'solo') ui.paused = true;
    A.keys = {}; A.guardBtn = false; clearTimeout(wheelTimer); ui.pick = -1;
    if (A.mode !== 'solo') UI.pause({ title: 'Battle menu', note: 'The online battle continues while this menu is open.', restart: false, quit: 'Leave battle', ask: 'Click again to leave' });
    else if (A.daily) UI.pause({ title: 'Paused', note: 'The battle is stopped. You have one try. If you leave, it is a defeat.', restart: false, quit: 'Give up', ask: 'Click again to give up' });
    else UI.pause({ title: 'Paused', note: 'The battle is stopped.', restart: true, quit: 'Quit to main menu', ask: '' });
  }
  function wheelCommit() {
    var p = ui.pick;
    ui.pick = -1;
    if (live() && p >= 0 && p !== A.battle.sides[ui.me].active) act('sw', p);
  }
  // Next or previous Beast. Each step moves the selection one Beast (the HUD shows it: ui.pick).
  // The switch occurs after a short wait, so that 2 or 3 steps go 2 or 3 Beasts along the team. Fainted Beasts are skipped.
  function stepPick(dir) {
    if (!A.battle || A.battle.over || ui.paused || ui.auto) return;
    var sd = A.battle.sides[ui.me], n = sd.team.length, from = ui.pick >= 0 ? ui.pick : sd.active, i, k;
    for (k = 1; k <= n; k++) { i = ((from + dir * k) % n + n) % n; if (!sd.team[i].fainted) { ui.pick = i; break; } }
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(wheelCommit, 190);
    G.sfx('ui');
  }
  // One press of an input code. Returns true if an action has this code.
  // The actions up, down, left, right and guard are not here: readMove reads them from the held inputs.
  function press(code) {
    var a = KEYS.actionOf(code);
    if (!a || !A.battle) return false;
    if (a === 'pause') openPause();
    else if (a === 'mute') SET.set('mute', !SET.get('mute'));
    else if (a === 'auto') act('auto', 0);
    else if (a in MOVEI) act('move', MOVEI[a]);
    else if (a in SWI) act('sw', SWI[a]);
    else if (a === 'sig') act('sig', 0);
    else if (a === 'dodge') act('dodge', 0);
    else if (a === 'swNext') stepPick(1);
    else if (a === 'swPrev') stepPick(-1);
    return true;
  }
  function held(a) { var m = KEYS.get(a), k = A.keys; return !!((m[0] && k[m[0]]) || (m[1] && k[m[1]])); }

  window.addEventListener('keydown', function (e) {
    if (A.state !== 'battle' || UI.overlay) return;
    var k = KEYS.norm(e.code);
    if (k === 'Escape') { e.preventDefault(); if (!e.repeat) openPause(); return; }   // Esc always opens the pause menu
    if (KEYS.actionOf(k) || k === 'Tab' || k === 'Space' || k.indexOf('Arrow') === 0) e.preventDefault();
    if (e.repeat) return;
    A.keys[k] = true;
    press(k);
  });
  window.addEventListener('keyup', function (e) { A.keys[KEYS.norm(e.code)] = false; });
  window.addEventListener('blur', function () { A.keys = {}; A.guardBtn = false; });
  window.addEventListener('mousemove', function (e) { if (A.state !== 'battle') return; var p = R.toArena(e.clientX, e.clientY); ui.mx = p.x; ui.my = p.y; });
  cv.addEventListener('mousedown', function (e) {
    if (A.state !== 'battle') return;
    var p = R.toLogical(e.clientX, e.clientY), b = R.hitButton(p.x, p.y), ap, code = 'Mouse' + e.button;
    if (b) { if (b.act === 'guard') A.guardBtn = true; else act(b.act, b.i); return; }
    if (p.y >= 452) return;                               // the bar of the HUD
    ap = R.toArena(e.clientX, e.clientY); ui.mx = ap.x; ui.my = ap.y;
    A.keys[code] = true;
    if (KEYS.actionOf(code)) { e.preventDefault(); press(code); }
  });
  window.addEventListener('mouseup', function (e) { A.guardBtn = false; A.keys['Mouse' + e.button] = false; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('auxclick', function (e) { if (A.state === 'battle') e.preventDefault(); });
  window.addEventListener('wheel', function (e) {
    if (!live() || UI.overlay) return;
    e.preventDefault();
    var now = performance.now();
    if (Math.abs(e.deltaY) < 1 || now - wheelT < 70) return;   // one step for each notch of the wheel
    wheelT = now;
    press(e.deltaY > 0 ? 'WheelDown' : 'WheelUp');
  }, { passive: false });

  function readMove(o) {
    o.mx = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
    o.my = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
    o.guard = held('guard') || A.guardBtn;
  }
  // Solo and host: put the held inputs and the aim into the control record of side 0. Each display frame.
  function applyInput() {
    if (ui.auto) return;
    var c = A.battle.sides[0].ctrl;
    readMove(c);
    c.ax = ui.mx; c.ay = ui.my;
  }
  // Guest: send the held inputs to the host 30 times each second, and a ping each 2 seconds.
  var GIN = { mx: 0, my: 0, guard: false };
  function guestInput(dt) {
    inT += dt; pingT += dt;
    if (inT >= 0.033) {
      inT = 0; readMove(GIN);
      Net.send({ t: 'i', mx: GIN.mx, my: GIN.my, ax: A.r1(ui.mx), ay: A.r1(ui.my), g: GIN.guard ? 1 : 0 });
    }
    if (pingT > 2) { pingT = 0; Net.send({ t: 'pi', ts: performance.now() }); }
  }
  // At the start of each battle.
  function resetInput() { A.keys = {}; A.guardBtn = false; inT = 0; pingT = 1.5; clearTimeout(wheelTimer); ui.pick = -1; }

  A.applyAct = applyAct; A.act = act; A.openPause = openPause;
  A.applyInput = applyInput; A.guestInput = guestInput; A.resetInput = resetInput;
})();
