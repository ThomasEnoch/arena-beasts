/* Arena Beasts - the battle flow, the result screen, the fixed-step game loop and the start of the game.
   This is the last of the 5 game files (the list is in js/state.js). The shared state is G.APP.
   The title screen, the Settings screen and the pause menu are in js/ui.js. */
(function () {
  'use strict';
  var G = window.G, A = G.APP, R = G.R, Net = G.Net, Sync = G.NetSync, UI = G.UI, $ = A.$;
  var result = $('result'), ui = A.ui;
  var acc = 0, last = 0, STEP = 1 / 60, endT = 0, outEv = [], stepN = 0, hiddenLast = 0;

  R.init($('cv'));

  // ---- battle flow --------------------------------------------------------
  // a, b = the 2 teams (6 Beast ids each). m = 'solo', 'host' or 'guest'.
  function startBattle(a, b, m, names) {
    var battle = A.battle = new G.Battle(a, b, { names: names });
    A.mode = m;
    A.lastTeams = [a.slice(), b.slice()];
    ui.me = m === 'guest' ? 1 : 0;
    if (m === 'solo') { battle.sides[1].isAI = true; battle.sides[1].ai = G.makeAI(A.diff); }
    if (m === 'guest') { battle.ev.length = 0; Sync.reset(); }
    ui.auto = false; ui.paused = false; ui.note = '';
    A.resetInput();
    outEv = []; stepN = 0; A.snapN = 0; hiddenLast = 0;
    A.away = false; A.waitLeft = A.WAIT; A.notice = '';
    Net.reserved = m === 'host' ? Net.peerId : '';
    // online: the 2 players get the same arena, calculated from the 2 teams
    var seed = -1, key, k;
    if (m !== 'solo') { key = a.join() + b.join(); seed = 0; for (k = 0; k < key.length; k++) seed = (seed * 31 + key.charCodeAt(k)) % 9973; }
    R.reset(seed);
    acc = 0; endT = 0; A.state = 'battle';
    UI.closeAll(); UI.go(''); result.classList.add('hidden');
    if (m === 'host') startWorker();
    G.game = { battle: battle, ui: ui, mode: m };
  }
  // Go from a battle or a result back to the Beast screen.
  function toMenu() {
    var v = A.mode === 'solo' && Net.state === 'off' ? 'solo' : 'online';   // a room that is open stays on the screen
    A.mode = 'solo'; A.state = 'menu'; A.battle = null; ui.me = 0; ui.paused = false;
    result.classList.add('hidden');
    UI.closeAll(); UI.go('team', v);
  }
  // Go from a battle or a result to the title screen.
  function quitBattle() {
    if (Net.state !== 'off') { Net.leave(); A.peerGone(true); }   // the title screen has no room
    A.mode = 'solo'; A.state = 'menu'; A.battle = null; ui.me = 0; ui.paused = false;
    result.classList.add('hidden');
    UI.closeAll(); UI.go('title');
  }
  function soloRematch(newOpponent) {
    if (newOpponent) A.rival = G.TRAINER_NAMES[Math.floor(Math.random() * G.TRAINER_NAMES.length)];
    startBattle(A.lastTeams[0], newOpponent ? A.shuffled().slice(0, 6) : A.lastTeams[1], 'solo', ['You', A.rival]);
  }
  function teamTable(side) {
    return '<div class="rt"><h3>' + A.cleanName(side.name, 'Player') + '</h3>' + side.team.map(function (m) {
      return '<div class="rr' + (m.fainted ? ' out' : '') + '"><span>' + m.d.name + '</span><span>' + (m.fainted ? 'Fainted' : Math.ceil(m.hp / m.maxHp * 100) + '% HP') + '</span><span>' + m.dealt + ' dmg</span><span>' + m.kos + ' KO</span></div>';
    }).join('') + '</div>';
  }
  function showResult() {
    var battle = A.battle;
    A.state = 'result'; A.away = false; Net.reserved = ''; ui.paused = false;
    UI.closeAll();
    var w = battle.winner, t = Math.max(0, Math.round(battle.t - 2.4)), title = w === 2 ? 'Draw' : w === ui.me ? 'Victory' : 'Defeat', net = A.mode !== 'solo';
    result.innerHTML = '<div class="rbox"><h1 class="' + (w === 2 ? '' : w === ui.me ? 'win' : 'lose') + '">' + title + '</h1>' +
      '<p>Battle time: ' + (t / 60 | 0) + ':' + (t % 60 < 10 ? '0' : '') + t % 60 + (net ? ' · Online' : ' · Difficulty: ' + A.diff) + ' · Arena: ' + R.theme + '</p>' +
      '<div class="rcols">' + teamTable(battle.sides[0]) + teamTable(battle.sides[1]) + '</div>' +
      '<p id="rstatus"></p>' +
      '<div class="rbtn"><button id="again" class="primary">Rematch</button>' + (net ? '' : '<button id="newopp">New opponent</button>') + '<button id="back">Change team</button>' + (net ? '' : '<button id="rmenu">Main menu</button>') + '</div></div>';
    result.classList.remove('hidden');
    $('again').onclick = function () {
      if (A.mode === 'solo') soloRematch(false);
      else A.setReady(!A.myReady);
    };
    if (!net) $('newopp').onclick = function () { soloRematch(true); };
    $('back').onclick = function () {
      if (A.myReady) A.setReady(false);
      toMenu();
    };
    if (!net) $('rmenu').onclick = quitBattle;
    A.refreshLobby();
  }

  // ---- loop ---------------------------------------------------------------
  // Advance the battle (solo and host). The host sends a snapshot after each second step.
  function simulate(dt, visible) {
    var battle = A.battle, host = A.mode === 'host', n = 0, i, E;
    acc += dt;
    A.applyInput();
    while (acc >= STEP && n < 5) {
      battle.step(STEP);
      if (host) {
        E = battle.ev;
        for (i = 0; i < E.length; i++) outEv.push(Sync.event(E[i]));
        stepN++;
        if ((stepN & 1) === 0) { Net.send(Sync.snap(battle, outEv, A.snapN++)); outEv = []; }
      }
      if (visible) R.consume(battle, ui); else battle.ev.length = 0;
      acc -= STEP; n++;
    }
    if (n === 5) acc = 0;
  }
  function checkEnd(dt) {
    if (A.battle.over && A.state === 'battle') { endT += dt; if (endT > 2.4) showResult(); }
  }
  // A browser stops animation frames in a hidden tab. The host must continue, so a worker timer drives it then.
  var worker = null;
  function startWorker() {
    if (worker) return;
    try {
      worker = new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},16)'], { type: 'text/javascript' })));
      worker.onmessage = function () {
        if (!document.hidden || A.mode !== 'host' || !A.battle || A.state === 'menu') return;
        var now = performance.now(), dt = hiddenLast ? Math.min(0.1, (now - hiddenLast) / 1000) : 0;
        hiddenLast = now;
        if (A.hostHold(dt)) return;
        simulate(dt, false);
        checkEnd(dt);
      };
    } catch (e) { worker = null; }
  }
  document.addEventListener('visibilitychange', function () {
    hiddenLast = 0;
    if (document.hidden && A.mode === 'solo') A.openPause();
  });

  function frame(ts) {
    requestAnimationFrame(frame);
    var dt = (ts - last) / 1000; last = ts;
    if (dt > 0.1) dt = 0.1; if (dt < 0) dt = 0;
    tick(dt);
  }
  // One display frame. Also callable from tests through G.tick(dt). dt is in seconds.
  function tick(dt) {
    var battle = A.battle, mode = A.mode, pid, hold;
    A.netOverlay();
    UI.tick(dt);
    if (A.state === 'menu') {
      pid = UI.screen === 'title' ? UI.feature : A.detailId;
      if (pid) R.preview(pid, dt);   // live 3D model on the title screen or on the stage: idle, walk, wind-up, strike
      return;
    }
    if (!battle) return;
    if (mode === 'guest') {
      if (!battle.over) A.guestInput(dt);
      try { R.consume(battle, ui); } catch (e) { battle.ev.length = 0; }
      R.hitstop = 0;
      ui.note = 'Online' + (A.ping >= 0 ? ' · ping ' + A.ping + ' ms' : '');
      R.draw(battle, Sync.alpha(performance.now()), dt, ui);
    } else {
      if (mode === 'host') { R.hitstop = 0; ui.note = A.away ? 'Online · host · the other player is away' : 'Online · host'; } else ui.note = '';
      hold = ui.paused || A.hostHold(dt);
      if (!hold) {
        if (R.hitstop > 0) R.hitstop -= dt;
        else simulate(dt, true);
      }
      R.draw(battle, hold || R.hitstop > 0 ? 1 : acc / STEP, hold ? 0 : dt, ui);
    }
    if (A.battle) checkEnd(dt);
  }

  A.startBattle = startBattle; A.toMenu = toMenu;
  G.tick = tick; G.startBattle = startBattle;
  G.dbg = function () { return { state: A.state, mode: A.mode, screen: UI.screen, view: UI.view, overlay: UI.overlay, away: A.away, waitLeft: A.waitLeft, net: Net.state, role: Net.role, room: Net.room, battle: A.battle }; };

  // ---- start of the game --------------------------------------------------
  A.initTeam();
  A.initLobby();
  UI.init({
    view: A.setView, back: A.backFromTeam, show: A.showDetail, gfx: function () { /* the preview builds its models again by itself */ },
    resume: function () { ui.paused = false; A.keys = {}; },
    restart: function () { if (A.mode === 'solo' && A.lastTeams) soloRematch(false); },
    quit: quitBattle
  });
  A.refresh();
  // First screen: the title. With a room link, or after the host loaded the page again: the online view.
  if (A.hasSavedRoom()) { UI.go('team', 'online'); A.openSavedRoom(); }
  else UI.go('title');
  requestAnimationFrame(function (ts) { last = ts; requestAnimationFrame(frame); });
})();
