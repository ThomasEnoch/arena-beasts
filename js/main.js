/* Arena Beasts - menus, input, online lobby, and the fixed-step game loop.
   Battle modes: 'solo' (AI opponent), 'host' (runs the battle for 2 players), 'guest' (shows the host's battle). */
(function () {
  'use strict';
  var G = window.G, R = G.R, Net = G.Net, Sync = G.NetSync;
  function $(id) { return document.getElementById(id); }
  var cv = $('cv'), menu = $('menu'), result = $('result');
  var battle = null, state = 'menu', mode = 'solo', picks = [], diff = 'normal', lastTeams = null, rival = 'Rival';
  var ui = { me: 0, auto: false, paused: false, mx: 480, my: 270, note: '' };
  var keys = {}, guardBtn = false, acc = 0, last = 0, STEP = 1 / 60, endT = 0, detailId = null, menuT = 0;
  var myName = 'Player', peerName = 'Player', myReady = false, peerReady = false, peerTeam = null;
  var outEv = [], stepN = 0, snapN = 0, inT = 0, pingT = 0, ping = -1, hiddenLast = 0;
  var CAT = { phys: 'Physical', spec: 'Special', status: 'Status' };

  G.buildSprites();
  R.init(cv);
  R.buildArena();

  // ---- checks for data from the other player ------------------------------
  function cleanName(v, def) {
    if (typeof v !== 'string') return def;
    v = v.replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 12);
    return v || def;
  }
  function cleanTeam(t) {
    if (!Array.isArray(t) || t.length !== 6) return null;
    var seen = {}, i;
    for (i = 0; i < 6; i++) { if (typeof t[i] !== 'string' || !G.DEX.hasOwnProperty(t[i]) || seen[t[i]]) return null; seen[t[i]] = 1; }
    return t.slice();
  }
  function num(v, lo, hi) { return typeof v === 'number' && isFinite(v) ? (v < lo ? lo : v > hi ? hi : v) : 0; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function online() { return Net.state === 'connected'; }

  // ---- menu ---------------------------------------------------------------
  function chips(types) { return types.map(function (t) { return '<span class="chip" style="background:' + G.TCOL[t] + '">' + t + '</span>'; }).join(''); }
  function spriteCanvas(id, px) {
    var c = document.createElement('canvas'); c.width = c.height = 144; c.style.width = c.style.height = px + 'px';
    c.getContext('2d').drawImage(G.SPR[id].idle[0], 0, 0);
    return c;
  }
  function fxText(mv) {
    var out = [], z = mv.zone;
    mv.fx.forEach(function (f) {
      var pc = f.ch !== undefined && f.ch < 1 ? Math.round(f.ch * 100) + '% ' : '';
      if (f.k === 'status') out.push(pc + G.STATUS_NAME[f.s]);
      else if (f.k === 'conf') out.push(pc + 'Confusion');
      else if (f.k === 'stage') out.push(pc + (f.who === 'self' ? 'Own ' : 'Foe ') + G.STAT_SHORT[f.stat] + (f.n > 0 ? ' +' : ' ') + f.n);
      else if (f.k === 'heal') out.push('Heals ' + Math.round(f.pct * 100) + '%. Each use heals less');
      else if (f.k === 'drain') out.push('Drains ' + Math.round(f.pct * 100) + '% of damage');
      else if (f.k === 'recoil') out.push('Recoil ' + Math.round(f.pct * 100) + '%');
      else if (f.k === 'cure') out.push('Removes status');
    });
    if (z) {
      out.push('Stays ' + z.dur + ' s');
      if (z.slow) out.push('Slows');
      if (z.status) out.push(G.STATUS_NAME[z.status]);
    }
    if (mv.kb > 0) out.push('Knockback'); else if (mv.kb < 0) out.push('Pulls');
    if (mv.homing) out.push('Homing');
    if (mv.count) out.push(mv.count + ' shots');
    return out.join(' · ');
  }
  function showDetail(id) {
    if (detailId === id) return;
    detailId = id;
    var d = G.DEX[id], s = d.st, tot = s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
    var rows = [['HP', s.hp], ['ATK', s.atk], ['DEF', s.def], ['SPA', s.spa], ['SPD', s.spd], ['SPE', s.spe]].map(function (r) {
      return '<div class="stat"><span>' + r[0] + '</span><div class="bar"><i style="width:' + Math.round(r[1] / 130 * 100) + '%"></i></div><b>' + r[1] + '</b></div>';
    }).join('');
    var moves = d.moves.map(function (mv, i) {
      return '<div class="move" style="border-left-color:' + G.TCOL[mv.type] + '"><div class="mh"><b>' + (i + 1) + '. ' + mv.name + '</b><span class="chip" style="background:' + G.TCOL[mv.type] + '">' + mv.type + '</span></div>' +
        '<div class="ms">' + CAT[mv.cat] + ' · ' + G.SHAPE_LABEL[mv.shape] + ' · ' + (mv.power ? 'Power ' + mv.power * (mv.count || 1) + ' · ' : '') + 'Cooldown ' + mv.cd + ' s</div>' +
        (fxText(mv) ? '<div class="mf">' + fxText(mv) + '</div>' : '') + '</div>';
    }).join('');
    $('detail').innerHTML =
      '<div class="dhead"><canvas id="dspr" width="144" height="144"></canvas><div><h2>' + d.name + '</h2><div>' + chips(d.types) + '</div>' +
      '<p class="role">' + d.role + ' · ' + d.pref + ' range · ' + d.ai + '</p></div></div>' +
      '<p class="blurb">' + d.blurb + '</p>' +
      '<div class="stats">' + rows + '<div class="tot">Total ' + tot + '</div></div>' +
      '<h3>Moves</h3>' + moves +
      '<h3>Signature power</h3><div class="sig"><b>' + d.sig.name + '</b><span class="chip" style="background:' + G.TCOL[d.sig.type] + '">' + d.sig.type + '</span>' +
      '<p>' + d.sig.desc + '</p><p class="cost">Cost: ' + d.sig.cost + '</p></div>';
  }
  function refresh() {
    var cards = document.querySelectorAll('.card'), i, id, n;
    for (i = 0; i < cards.length; i++) {
      id = cards[i].dataset.id; n = picks.indexOf(id);
      cards[i].classList.toggle('on', n >= 0);
      cards[i].querySelector('.num').textContent = n >= 0 ? n + 1 : '';
    }
    var team = $('team'); team.innerHTML = '';
    for (i = 0; i < 6; i++) {
      var slot = document.createElement('button'); slot.className = 'slot' + (picks[i] ? ' full' : '');
      if (picks[i]) {
        slot.appendChild(spriteCanvas(picks[i], 44));
        slot.insertAdjacentHTML('beforeend', '<span>' + G.DEX[picks[i]].name + '</span>');
        slot.title = 'Remove ' + G.DEX[picks[i]].name;
        slot.onclick = (function (p) { return function () { toggle(p); }; })(picks[i]);
      } else slot.innerHTML = '<span class="empty">' + (i + 1) + '</span>';
      team.appendChild(slot);
    }
    refreshLobby();
  }
  function teamChanged() {
    if (myReady) { myReady = false; Net.send({ t: 'ready', on: false }); }
    refresh();
  }
  function toggle(id) {
    var n = picks.indexOf(id);
    if (n >= 0) picks.splice(n, 1); else if (picks.length < 6) picks.push(id);
    G.sfx('ui'); showDetail(id); teamChanged();
  }
  function shuffled() {
    var a = G.ROSTER.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // ---- online lobby -------------------------------------------------------
  function roomLink() { return location.origin + location.pathname + '?room=' + Net.room; }
  function refreshLobby() {
    var st = Net.state, on = st === 'connected', txt, start = $('start'), local = location.protocol === 'file:' || /^(localhost|127\.|\[::1\])/.test(location.hostname);
    if (st === 'off') txt = Net.error || 'Play with a friend: create a room and send the link.';
    else if (st === 'opening') txt = 'Opening the room…';
    else if (st === 'joining') txt = 'Connecting to the room…';
    else if (st === 'waiting') txt = 'Room is open. Send the link to the other player.' + (local ? ' This address is local: the link works on this computer only.' : '');
    else txt = 'Connected to ' + peerName + '. ' + (peerReady ? peerName + ' is ready.' : peerName + ' is selecting a team.');
    $('nstatus').textContent = txt;
    $('nstatus').className = st === 'off' && Net.error ? 'err' : on ? 'ok' : '';
    $('create').classList.toggle('hidden', st !== 'off');
    $('leave').classList.toggle('hidden', st === 'off');
    $('linkbox').classList.toggle('hidden', !(Net.role === 'host' && st === 'waiting'));
    if (Net.role === 'host' && Net.room) $('link').value = roomLink();
    $('diff').classList.toggle('hidden', st !== 'off');
    if (st === 'off') {
      start.disabled = picks.length !== 6;
      start.textContent = picks.length === 6 ? 'Start battle' : 'Select ' + (6 - picks.length) + ' more';
    } else if (!on) { start.disabled = true; start.textContent = 'Waiting for player'; }
    else {
      start.disabled = picks.length !== 6;
      start.textContent = picks.length !== 6 ? 'Select ' + (6 - picks.length) + ' more' : myReady ? 'Ready. Waiting…' : 'Ready';
    }
    var rs = $('rstatus');
    if (rs) rs.textContent = on ? (myReady ? 'Waiting for ' + peerName + '…' : peerReady ? peerName + ' wants a rematch.' : '') : (mode !== 'solo' ? 'The other player left.' : '');
    var ag = $('again');
    if (ag && mode !== 'solo') { ag.disabled = !on; ag.textContent = myReady ? 'Cancel rematch' : 'Rematch'; }
  }
  function setReady(v) {
    if (!online() || picks.length !== 6) return;
    myReady = v;
    Net.send({ t: 'ready', on: v, team: v ? picks : null });
    refreshLobby();
    maybeStart();
  }
  function maybeStart() {
    if (Net.role !== 'host' || !online() || !myReady || !peerReady || !peerTeam || picks.length !== 6) return;
    if (state === 'battle' && !battle.over) return;
    var teams = [picks.slice(), peerTeam.slice()], names = [myName, peerName === myName ? peerName + ' 2' : peerName];
    Net.send({ t: 'start', teams: teams, names: names });
    myReady = peerReady = false;
    startBattle(teams[0], teams[1], 'host', names);
  }
  function peerGone() {
    myReady = peerReady = false; peerTeam = null; ping = -1;
    if (state === 'battle' && battle && !battle.over) {
      if (mode === 'host') {
        battle.sides[1].isAI = true; battle.sides[1].ai = G.makeAI('normal');
        battle.msg('The other player left. The AI plays now.', '#ffe27a');
        mode = 'solo';
      } else if (mode === 'guest') {
        mode = 'solo'; state = 'menu'; battle = null; ui.me = 0;
        result.classList.add('hidden'); menu.classList.remove('hidden');
      }
    }
    refreshLobby();
  }
  Net.onChange = refreshLobby;
  Net.onOpen = function () { myReady = peerReady = false; peerTeam = null; Net.send({ t: 'hello', name: myName }); refreshLobby(); };
  Net.onClose = peerGone;
  Net.onMessage = function (m) {
    switch (m.t) {
      case 'hello': peerName = cleanName(m.name, Net.role === 'host' ? 'Guest' : 'Host'); refreshLobby(); break;
      case 'ready':
        peerReady = !!m.on; peerTeam = peerReady ? cleanTeam(m.team) : null;
        if (!peerTeam) peerReady = false;
        refreshLobby(); maybeStart();
        break;
      case 'start':
        if (Net.role !== 'guest') break;
        var a = cleanTeam(m.teams && m.teams[0]), c = cleanTeam(m.teams && m.teams[1]);
        if (!a || !c) break;
        myReady = peerReady = false;
        startBattle(a, c, 'guest', [cleanName(m.names && m.names[0], 'Host'), cleanName(m.names && m.names[1], 'Guest')]);
        break;
      case 'i':
        if (mode === 'host' && battle && Net.role === 'host') {
          var ct = battle.sides[1].ctrl;
          ct.mx = num(m.mx, -1, 1); ct.my = num(m.my, -1, 1); ct.ax = num(m.ax, -200, 1200); ct.ay = num(m.ay, -200, 800); ct.guard = !!m.g;
        }
        break;
      case 'a':
        if (mode === 'host' && battle && Net.role === 'host' && typeof m.k === 'string') {
          var c2 = battle.sides[1].ctrl;
          c2.ax = num(m.ax, -200, 1200); c2.ay = num(m.ay, -200, 800);
          applyAct(1, m.k, m.i | 0);
        }
        break;
      case 's':
        if (mode === 'guest' && battle && Net.role === 'guest') { try { Sync.apply(battle, m, performance.now()); } catch (e) { /* skip a bad snapshot */ } }
        break;
      case 'pi': Net.send({ t: 'po', ts: num(m.ts, 0, 1e15) }); break;
      case 'po': if (typeof m.ts === 'number') ping = Math.max(0, Math.round(performance.now() - m.ts)); break;
      case 'full': Net.leave('This room is full.'); break;
    }
  };

  function buildMenu() {
    var grid = $('grid');
    G.ROSTER.forEach(function (id) {
      var d = G.DEX[id], el = document.createElement('button');
      el.className = 'card'; el.dataset.id = id;
      el.appendChild(spriteCanvas(id, 84));
      el.insertAdjacentHTML('beforeend', '<b>' + d.name + '</b><div>' + chips(d.types) + '</div><small>' + d.role + '</small><i class="num"></i>');
      el.onclick = function () { toggle(id); };
      el.onmouseenter = el.onfocus = function () { showDetail(id); };
      grid.appendChild(el);
    });
    var ds = document.querySelectorAll('#diff button');
    for (var i = 0; i < ds.length; i++) ds[i].onclick = function () {
      diff = this.dataset.d;
      for (var k = 0; k < ds.length; k++) ds[k].classList.toggle('on', ds[k] === this);
      G.sfx('ui');
    };
    $('random').onclick = function () { picks = shuffled().slice(0, 6); G.sfx('ui'); teamChanged(); };
    $('clear').onclick = function () { picks = []; G.sfx('ui'); teamChanged(); };
    $('start').onclick = function () {
      if (picks.length !== 6) return;
      G.sfx('ui');
      if (Net.state !== 'off') { setReady(!myReady); return; }
      rival = G.TRAINER_NAMES[Math.floor(Math.random() * G.TRAINER_NAMES.length)];
      startBattle(picks.slice(), shuffled().slice(0, 6), 'solo', ['You', rival]);
    };
    // online controls
    var pn = $('pname');
    try { myName = cleanName(localStorage.getItem('ab_name'), 'Player'); } catch (e) { /* storage is optional */ }
    pn.value = myName === 'Player' ? '' : myName;
    pn.oninput = function () {
      myName = cleanName(pn.value, 'Player');
      try { localStorage.setItem('ab_name', myName); } catch (e) { /* storage is optional */ }
      if (online()) Net.send({ t: 'hello', name: myName });
    };
    $('create').onclick = function () { G.sfx('ui'); Net.host(); };
    $('leave').onclick = function () { G.sfx('ui'); Net.leave(); peerGone(); };
    $('copy').onclick = function () {
      var link = $('link'), done = function () { $('copy').textContent = 'Copied'; setTimeout(function () { $('copy').textContent = 'Copy link'; }, 1500); };
      link.select();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link.value).then(done, function () { try { document.execCommand('copy'); done(); } catch (e) { /* user can copy by hand */ } });
      else { try { document.execCommand('copy'); done(); } catch (e) { /* user can copy by hand */ } }
    };
    showDetail(G.ROSTER[0]);
    refresh();
    var room = new URLSearchParams(location.search).get('room');
    if (room) Net.join(room.toLowerCase());
  }

  // ---- battle flow --------------------------------------------------------
  function startBattle(a, b, m, names) {
    mode = m;
    lastTeams = [a.slice(), b.slice()];
    battle = new G.Battle(a, b, { names: names });
    ui.me = mode === 'guest' ? 1 : 0;
    if (mode === 'solo') { battle.sides[1].isAI = true; battle.sides[1].ai = G.makeAI(diff); }
    if (mode === 'guest') { battle.ev.length = 0; Sync.reset(); }
    ui.auto = false; ui.paused = false; ui.note = ''; guardBtn = false; keys = {};
    outEv = []; stepN = 0; snapN = 0; inT = 0; pingT = 1.5; hiddenLast = 0;
    R.reset();
    acc = 0; endT = 0; state = 'battle';
    menu.classList.add('hidden'); result.classList.add('hidden');
    if (mode === 'host') startWorker();
    G.game = { battle: battle, ui: ui, mode: mode };
  }
  function teamTable(side) {
    return '<div class="rt"><h3>' + cleanName(side.name, 'Player') + '</h3>' + side.team.map(function (m) {
      return '<div class="rr' + (m.fainted ? ' out' : '') + '"><span>' + m.d.name + '</span><span>' + (m.fainted ? 'Fainted' : Math.ceil(m.hp / m.maxHp * 100) + '% HP') + '</span><span>' + m.dealt + ' dmg</span><span>' + m.kos + ' KO</span></div>';
    }).join('') + '</div>';
  }
  function showResult() {
    state = 'result';
    var w = battle.winner, t = Math.max(0, Math.round(battle.t - 2.4)), title = w === 2 ? 'Draw' : w === ui.me ? 'Victory' : 'Defeat', net = mode !== 'solo';
    result.innerHTML = '<div class="rbox"><h1 class="' + (w === 2 ? '' : w === ui.me ? 'win' : 'lose') + '">' + title + '</h1>' +
      '<p>Battle time: ' + (t / 60 | 0) + ':' + (t % 60 < 10 ? '0' : '') + t % 60 + (net ? ' · Online' : ' · Difficulty: ' + diff) + ' · Arena: ' + R.theme + '</p>' +
      '<div class="rcols">' + teamTable(battle.sides[0]) + teamTable(battle.sides[1]) + '</div>' +
      '<p id="rstatus"></p>' +
      '<div class="rbtn"><button id="again" class="primary">Rematch</button>' + (net ? '' : '<button id="newopp">New opponent</button>') + '<button id="back">Change team</button></div></div>';
    result.classList.remove('hidden');
    $('again').onclick = function () {
      if (mode === 'solo') startBattle(lastTeams[0], lastTeams[1], 'solo', ['You', rival]);
      else setReady(!myReady);
    };
    if (!net) $('newopp').onclick = function () { rival = G.TRAINER_NAMES[Math.floor(Math.random() * G.TRAINER_NAMES.length)]; startBattle(lastTeams[0], shuffled().slice(0, 6), 'solo', ['You', rival]); };
    $('back').onclick = function () {
      if (myReady) setReady(false);
      state = 'menu'; result.classList.add('hidden'); menu.classList.remove('hidden'); refreshLobby();
    };
    refreshLobby();
  }

  // ---- input --------------------------------------------------------------
  function applyAct(si, name, i) {
    var s = battle.sides[si], c = s.ctrl;
    if (name === 'move') { if (i >= 0 && i < 4) { c.move = i; c.moveT = 0.35; } }
    else if (name === 'dodge') { c.dodge = true; c.dodgeT = 0.2; }
    else if (name === 'sig') { c.sig = true; c.sigT = 0.35; }
    else if (name === 'sw') { if (i >= 0 && i < 6 && s.team[i] && !s.team[i].fainted && i !== s.active) { c.sw = i; c.swT = 0.6; } }
  }
  function act(name, i) {
    if (!battle || battle.over || state !== 'battle') return;
    if (name === 'auto') { if (mode === 'solo') toggleAuto(); return; }
    if (ui.paused || ui.auto) return;
    if (mode === 'guest') { Net.send({ t: 'a', k: name, i: i, ax: r1(ui.mx), ay: r1(ui.my) }); return; }
    applyAct(0, name, i);
  }
  function toggleAuto() {
    var s = battle.sides[0], c = s.ctrl;
    ui.auto = !ui.auto; s.isAI = ui.auto;
    if (ui.auto) s.ai = G.makeAI('normal');
    c.mx = c.my = 0; c.guard = false; c.move = -1; c.sw = -1;
    G.sfx('ui');
  }
  var KEYACT = { Digit1: ['move', 0], Digit2: ['move', 1], Digit3: ['move', 2], Digit4: ['move', 3], Space: ['dodge', 0], KeyR: ['sig', 0], KeyZ: ['sw', 0], KeyX: ['sw', 1], KeyC: ['sw', 2], KeyV: ['sw', 3], KeyB: ['sw', 4], KeyN: ['sw', 5] };
  window.addEventListener('keydown', function (e) {
    if (state !== 'battle') return;
    var k = e.code;
    if (k === 'Tab' || k === 'Space' || k.indexOf('Arrow') === 0) e.preventDefault();
    if (e.repeat) return;
    keys[k] = true;
    if (k === 'KeyP' || k === 'Escape') { if (!battle.over && mode === 'solo') ui.paused = !ui.paused; return; }
    if (k === 'KeyM') { G.muted = !G.muted; return; }
    if (k === 'Tab') { act('auto', 0); return; }
    if (KEYACT[k]) act(KEYACT[k][0], KEYACT[k][1]);
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('blur', function () { keys = {}; guardBtn = false; });
  document.addEventListener('visibilitychange', function () {
    hiddenLast = 0;
    if (document.hidden && state === 'battle' && battle && !battle.over && mode === 'solo') ui.paused = true;
  });
  window.addEventListener('mousemove', function (e) { var p = R.toLogical(e.clientX, e.clientY); ui.mx = p.x; ui.my = p.y; });
  cv.addEventListener('mousedown', function (e) {
    if (state !== 'battle') return;
    var p = R.toLogical(e.clientX, e.clientY), b = R.hitButton(p.x, p.y);
    ui.mx = p.x; ui.my = p.y;
    if (b) { if (b.act === 'guard') guardBtn = true; else act(b.act, b.i); return; }
    if (p.y < 452) act('move', e.button === 2 ? 1 : 0);
  });
  window.addEventListener('mouseup', function () { guardBtn = false; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  function readMove(o) {
    o.mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    o.my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    o.guard = !!(keys.ShiftLeft || keys.ShiftRight || keys.KeyQ || guardBtn);
  }
  function applyInput() {
    if (ui.auto) return;
    var c = battle.sides[0].ctrl;
    readMove(c);
    c.ax = ui.mx; c.ay = ui.my;
  }
  var GIN = { mx: 0, my: 0, guard: false };
  function guestInput(dt) {
    inT += dt; pingT += dt;
    if (inT >= 0.033) {
      inT = 0; readMove(GIN);
      Net.send({ t: 'i', mx: GIN.mx, my: GIN.my, ax: r1(ui.mx), ay: r1(ui.my), g: GIN.guard ? 1 : 0 });
    }
    if (pingT > 2) { pingT = 0; Net.send({ t: 'pi', ts: performance.now() }); }
  }

  // ---- loop ---------------------------------------------------------------
  // Advance the battle (solo and host). The host sends a snapshot after each second step.
  function simulate(dt, visible) {
    var n = 0, i, E;
    acc += dt;
    applyInput();
    while (acc >= STEP && n < 5) {
      battle.step(STEP);
      if (mode === 'host') {
        E = battle.ev;
        for (i = 0; i < E.length; i++) outEv.push(Sync.event(E[i]));
        stepN++;
        if ((stepN & 1) === 0) { Net.send(Sync.snap(battle, outEv, snapN++)); outEv = []; }
      }
      if (visible) R.consume(battle, ui); else battle.ev.length = 0;
      acc -= STEP; n++;
    }
    if (n === 5) acc = 0;
  }
  function checkEnd(dt) {
    if (battle.over && state === 'battle') { endT += dt; if (endT > 2.4) showResult(); }
  }
  // A browser stops animation frames in a hidden tab. The host must continue, so a worker timer drives it then.
  var worker = null;
  function startWorker() {
    if (worker) return;
    try {
      worker = new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},16)'], { type: 'text/javascript' })));
      worker.onmessage = function () {
        if (!document.hidden || mode !== 'host' || !battle || state === 'menu') return;
        var now = performance.now(), dt = hiddenLast ? Math.min(0.1, (now - hiddenLast) / 1000) : 0;
        hiddenLast = now;
        simulate(dt, false);
        checkEnd(dt);
      };
    } catch (e) { worker = null; }
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    var dt = (ts - last) / 1000; last = ts;
    if (dt > 0.1) dt = 0.1; if (dt < 0) dt = 0;
    tick(dt);
  }
  // One display frame. Also callable from tests through G.tick(dt).
  function tick(dt) {
    if (state === 'menu') {
      menuT += dt;
      var dc = $('dspr');
      if (dc && detailId) { var g = dc.getContext('2d'); g.clearRect(0, 0, 144, 144); g.drawImage(G.SPR[detailId].idle[(menuT * 5 | 0) % 4], 0, 0); }
      return;
    }
    if (!battle) return;
    if (mode === 'guest') {
      if (!battle.over) guestInput(dt);
      try { R.consume(battle, ui); } catch (e) { battle.ev.length = 0; }
      R.hitstop = 0;
      ui.note = 'Online' + (ping >= 0 ? ' · ping ' + ping + ' ms' : '');
      R.draw(battle, Sync.alpha(performance.now()), dt, ui);
    } else {
      if (mode === 'host') { R.hitstop = 0; ui.note = 'Online · host'; } else ui.note = '';
      if (!ui.paused) {
        if (R.hitstop > 0) R.hitstop -= dt;
        else simulate(dt, true);
      }
      R.draw(battle, ui.paused || R.hitstop > 0 ? 1 : acc / STEP, ui.paused ? 0 : dt, ui);
    }
    checkEnd(dt);
  }

  G.tick = tick; G.startBattle = startBattle;
  buildMenu();
  requestAnimationFrame(function (ts) { last = ts; requestAnimationFrame(frame); });
})();
