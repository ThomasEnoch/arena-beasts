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
  // Reconnect: 'away' = the guest of this battle has no connection. The host holds the battle for WAIT seconds in total.
  var WAIT = 30, away = false, waitLeft = 0, notice = '', ovText = null;
  var CAT = { phys: 'Physical', spec: 'Special', status: 'Status' };

  R.init(cv);

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
  function chips(types) { return types.map(function (t) { return G.typeBadge(t, true); }).join(''); }
  function tcols(el, d) { el.style.setProperty('--c1', G.TCOL[d.types[0]]); el.style.setProperty('--c2', G.TCOL[d.types[1] || d.types[0]]); }
  function spriteCanvas(id, px) {
    var c = document.createElement('canvas'), im = G.SPR[id].idle[0]; c.width = c.height = im.width; c.style.width = c.style.height = px + 'px';
    c.getContext('2d').drawImage(im, 0, 0);
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
  var STATN = [['HP', 'hp'], ['Attack', 'atk'], ['Defence', 'def'], ['Sp. Atk', 'spa'], ['Sp. Def', 'spd'], ['Speed', 'spe']];
  function showDetail(id) {
    if (detailId === id) return;
    detailId = id;
    var d = G.DEX[id], s = d.st, cards = document.querySelectorAll('.card'), i;
    for (i = 0; i < cards.length; i++) cards[i].classList.toggle('cur', cards[i].dataset.id === id);
    tcols($('stage'), d);
    $('smark').innerHTML = G.typeSvg(d.types[0]);
    $('sname').textContent = d.name;
    $('sepi').textContent = d.epithet || '';
    $('stypes').innerHTML = chips(d.types);
    $('srole').textContent = d.role + ' · ' + d.pref + ' range';
    $('sblurb').textContent = d.blurb;
    var rows = STATN.map(function (r) {
      var v = s[r[1]];
      return '<div class="stat"><span>' + r[0] + '</span><div class="bar"><i class="' + (v >= 105 ? 'hi' : v < 70 ? 'lo' : '') + '" style="width:' + Math.round(v / 130 * 100) + '%"></i></div><b>' + v + '</b></div>';
    }).join('');
    var moves = d.moves.map(function (mv) {
      var fxs = fxText(mv);
      return '<div class="move">' + G.typeBadge(mv.type) + '<b>' + mv.name + '</b><span class="pw">' + (mv.power ? '<strong>' + mv.power * (mv.count || 1) + '</strong> power' : CAT[mv.cat]) + '</span>' +
        '<div class="ms">' + G.SHAPE_LABEL[mv.shape] + ' · ' + mv.cd + ' s cooldown' + (fxs ? ' · <span class="mf">' + fxs + '</span>' : '') + '</div></div>';
    }).join('');
    $('sstats').innerHTML = rows;
    if (storyOpen) renderStory(id);
    $('detail').innerHTML = '<section class="dstats"><h3>Stats</h3>' + rows + '</section><section class="dmoves"><h3>Moves</h3>' + moves +
      '</section><section class="dsig"><h3>Signature power</h3><div class="sig"><div class="sh">' + G.typeBadge(d.sig.type) + '<b>' + d.sig.name + '</b></div><p>' + d.sig.desc + '</p><p class="cost">Cost: ' + d.sig.cost + '</p></div></section>';
  }
  // ---- stories: read from LORE.md, the one source of the canon -------------
  var LORE = {}, storyOpen = false;
  function loadLore() {
    if (!window.fetch) return;
    fetch('LORE.md').then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      t.split(/^### /m).slice(1).forEach(function (sec) {
        var idm = /\x60([a-z]+)\x60\s*·\s*[^·\n]+·\s*([^\n]+)/.exec(sec), f = [], re = /^- \*\*(.+?):\*\*\s*(.+)$/gm, m;
        if (!idm || !G.DEX[idm[1]]) return;
        while ((m = re.exec(sec))) if (m[1] !== 'Look') f.push([m[1], m[2].replace(/[*\x60]/g, '')]);
        LORE[idm[1]] = { guilds: idm[2].trim(), f: f };
      });
      if (Object.keys(LORE).length) $('sbtn').classList.remove('hidden');
    }).catch(function () { /* the stories are optional */ });
  }
  function renderStory(id) {
    var L = LORE[id], el = $('story'), d = G.DEX[id], p, b, i;
    el.textContent = '';
    if (!L) return;
    p = document.createElement('h3'); p.textContent = d.name + ' - ' + d.epithet; el.appendChild(p);
    p = document.createElement('p'); p.className = 'guilds'; p.textContent = 'Guilds: ' + L.guilds; el.appendChild(p);
    for (i = 0; i < L.f.length; i++) {
      p = document.createElement('p'); b = document.createElement('b'); b.textContent = L.f[i][0];
      p.appendChild(b); p.appendChild(document.createTextNode(L.f[i][1])); el.appendChild(p);
    }
    el.scrollTop = 0;
  }
  function toggleStory(on) {
    storyOpen = on === undefined ? !storyOpen : on;
    $('story').classList.toggle('hidden', !storyOpen);
    $('sbtn').textContent = storyOpen ? 'Close story' : 'Story';
    $('sbtn').classList.toggle('on', storyOpen);
    if (storyOpen) renderStory(detailId);
  }
  function refresh() {
    var cards = document.querySelectorAll('.card'), i, id, n;
    for (i = 0; i < cards.length; i++) {
      id = cards[i].dataset.id; n = picks.indexOf(id);
      cards[i].classList.toggle('on', n >= 0);
      cards[i].querySelector('.num').textContent = n >= 0 ? n + 1 : '';
    }
    $('tcount').textContent = 'Your team ' + picks.length + ' / 6';
    var team = $('team'); team.innerHTML = '';
    for (i = 0; i < 6; i++) {
      var slot = document.createElement('button'); slot.className = 'slot' + (picks[i] ? ' full' : '');
      if (picks[i]) {
        tcols(slot, G.DEX[picks[i]]);
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
    else if (st === 'waiting') txt = 'Room is open. Send the link to the other player.' + (local ? ' The link works on this computer only.' : '');
    else if (st === 'rejoining') txt = 'Connection lost. Reconnecting…';
    else txt = notice + 'Connected to ' + peerName + '. ' + (peerReady ? peerName + ' is ready.' : peerName + ' is selecting a team.');
    $('nstatus').textContent = txt;
    $('nstatus').className = (st === 'off' && Net.error) || st === 'rejoining' ? 'err' : on ? 'ok' : '';
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
    if (rs) rs.textContent = on ? (myReady ? 'Waiting for ' + peerName + '…' : peerReady ? peerName + ' wants a rematch.' : '') : st === 'rejoining' ? 'Connection lost. Reconnecting…' : (mode !== 'solo' ? 'The other player left.' : '');
    var ag = $('again');
    if (ag && mode !== 'solo') { ag.disabled = !on; ag.textContent = myReady ? 'Cancel rematch' : 'Rematch'; }
  }
  function setReady(v) {
    if (!online() || picks.length !== 6) return;
    myReady = v; notice = '';
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
  function toMenu() {
    mode = 'solo'; state = 'menu'; battle = null; ui.me = 0;
    result.classList.add('hidden'); menu.classList.remove('hidden');
  }
  function giveAI(txt) {
    var s = battle.sides[1];
    s.isAI = true; s.ai = G.makeAI('normal');
    battle.msg(txt, '#ffe27a');
  }
  // The connection to the other player closed. final = the player left the room, or the retry time ended.
  function peerGone(final) {
    var live = state === 'battle' && battle && !battle.over;
    myReady = peerReady = false; peerTeam = null; ping = -1;
    if (live && mode === 'host') {
      if (final || !Net.reserved) {
        Net.reserved = ''; away = false; mode = 'solo';
        giveAI('The other player left. The AI plays now.');
      } else {
        away = true;                                   // hold the battle: see hostHold
        if (waitLeft <= 0) giveAI(battle.sides[1].name + ' lost the connection. The AI plays now.');
      }
    } else if (live && mode === 'guest' && final) toMenu();
    // guest, not final: the battle stays on the screen while G.Net tries to connect again
    refreshLobby();
  }
  // Host: hold the battle while the guest is away. Returns true while the battle is on hold.
  function hostHold(dt) {
    if (mode !== 'host' || !away || waitLeft <= 0 || !battle || battle.over) return false;
    waitLeft -= dt;
    if (waitLeft > 0) return true;
    giveAI(battle.sides[1].name + ' did not come back. The AI plays now.');
    return false;
  }
  // Host: the guest of this battle connected again. Give back the control and send the battle.
  function resumeGuest() {
    var s = battle.sides[1], c = s.ctrl;
    away = false; s.isAI = false;
    c.mx = c.my = 0; c.guard = false; c.dodge = false; c.sig = false; c.move = -1; c.sw = -1;
    Net.send({ t: 'resume', teams: lastTeams, names: [battle.sides[0].name, s.name] });
    Net.send(Sync.snap(battle, [], snapN++));
    battle.msg(s.name + ' is back.', '#8dff9a');
  }
  // Message on top of the battle while a player is away.
  function overlay() {
    var t = '', btn = '';
    if (state === 'battle' && battle && !battle.over) {
      if (mode === 'guest' && Net.state === 'rejoining') { t = 'Connection lost. Reconnecting…'; btn = 'Leave battle'; }
      else if (mode === 'host' && away && waitLeft > 0) { t = battle.sides[1].name + ' lost the connection. Waiting ' + Math.ceil(waitLeft) + ' s…'; btn = 'Play against AI now'; }
    }
    if (t === ovText) return;
    ovText = t;
    $('nmtext').textContent = t; $('nmbtn').textContent = btn;
    $('netmsg').classList.toggle('hidden', !t);
  }
  function saveRoom() {
    try {
      if (Net.role === 'host' && Net.room) sessionStorage.setItem('ab_host', Net.room);
      else sessionStorage.removeItem('ab_host');
    } catch (e) { /* storage is optional */ }
  }
  Net.onChange = function () { saveRoom(); refreshLobby(); };
  Net.onOpen = function () {
    myReady = peerReady = false; peerTeam = null;
    Net.send({ t: 'hello', name: myName });
    if (Net.role === 'host') {
      if (mode === 'host' && state === 'battle' && battle && !battle.over && Net.reserved && Net.peerId === Net.reserved) resumeGuest();
      else Net.send({ t: 'lobby' });
    }
    refreshLobby();
  };
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
      case 'resume':   // the host has a battle in progress for this player
        if (Net.role !== 'guest') break;
        var ra = cleanTeam(m.teams && m.teams[0]), rc = cleanTeam(m.teams && m.teams[1]);
        if (!ra || !rc) break;
        myReady = peerReady = false;
        // After a short connection loss the battle is still on the screen. After a page reload, build it again.
        if (!(mode === 'guest' && state === 'battle' && battle && lastTeams && lastTeams[0].join() === ra.join() && lastTeams[1].join() === rc.join()))
          startBattle(ra, rc, 'guest', [cleanName(m.names && m.names[0], 'Host'), cleanName(m.names && m.names[1], 'Guest')]);
        if (picks.length !== 6) { picks = rc.slice(); refresh(); }
        break;
      case 'lobby':    // the host has no battle for this player (for example, the host loaded the page again)
        if (Net.role === 'guest' && mode === 'guest' && state === 'battle' && battle && !battle.over) {
          toMenu(); notice = 'The battle stopped because the host restarted. '; refreshLobby();
        }
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
      el.appendChild(spriteCanvas(id, 92));
      tcols(el, d);
      el.insertAdjacentHTML('beforeend', '<b>' + d.name + '</b><span class="tics">' + d.types.map(function (t) { return G.typeBadge(t); }).join('') + '</span><i class="num"></i>');
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
    $('sbtn').onclick = function () { G.sfx('ui'); toggleStory(); };
    window.addEventListener('keydown', function (e) { if (e.code === 'Escape' && storyOpen && state === 'menu') toggleStory(false); });
    loadLore();
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
    $('leave').onclick = function () { G.sfx('ui'); Net.leave(); peerGone(true); };
    $('nmbtn').onclick = function () {
      if (state !== 'battle' || !battle) return;
      G.sfx('ui');
      if (mode === 'guest') { Net.leave(); peerGone(true); }
      else if (mode === 'host' && away && waitLeft > 0) { waitLeft = 0; giveAI('The AI plays for ' + battle.sides[1].name + ' now.'); }
    };
    $('copy').onclick = function () {
      var link = $('link'), done = function () { $('copy').textContent = 'Copied'; setTimeout(function () { $('copy').textContent = 'Copy link'; }, 1500); };
      link.select();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link.value).then(done, function () { try { document.execCommand('copy'); done(); } catch (e) { /* user can copy by hand */ } });
      else { try { document.execCommand('copy'); done(); } catch (e) { /* user can copy by hand */ } }
    };
    showDetail(G.ROSTER[0]);
    refresh();
    var room = new URLSearchParams(location.search).get('room'), mine = null;
    try { mine = sessionStorage.getItem('ab_host'); } catch (e) { /* storage is optional */ }
    if (room) Net.join(room.toLowerCase());
    else if (Net.validRoom(mine)) Net.host(mine);   // the host loaded the page again: open the same room, the link stays valid
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
    away = false; waitLeft = WAIT; notice = '';
    Net.reserved = mode === 'host' ? Net.peerId : '';
    // online: the 2 players get the same arena, calculated from the 2 teams
    var seed = -1, key, k;
    if (mode !== 'solo') { key = a.join() + b.join(); seed = 0; for (k = 0; k < key.length; k++) seed = (seed * 31 + key.charCodeAt(k)) % 9973; }
    R.reset(seed);
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
    state = 'result'; away = false; Net.reserved = '';
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
    if (mode === 'host' && away && waitLeft > 0) return;   // the battle is on hold
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
  window.addEventListener('mousemove', function (e) { if (state !== 'battle') return; var p = R.toArena(e.clientX, e.clientY); ui.mx = p.x; ui.my = p.y; });
  cv.addEventListener('mousedown', function (e) {
    if (state !== 'battle') return;
    var p = R.toLogical(e.clientX, e.clientY), b = R.hitButton(p.x, p.y), ap;
    if (!b && p.y < 452) { ap = R.toArena(e.clientX, e.clientY); ui.mx = ap.x; ui.my = ap.y; }
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
        if (hostHold(dt)) return;
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
    overlay();
    if (state === 'menu') {
      menuT += dt;
      if (detailId) R.preview(detailId, dt);   // live 3D model on the stage: idle, walk, wind-up, strike
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
      if (mode === 'host') { R.hitstop = 0; ui.note = away ? 'Online · host · the other player is away' : 'Online · host'; } else ui.note = '';
      var hold = ui.paused || hostHold(dt);
      if (!hold) {
        if (R.hitstop > 0) R.hitstop -= dt;
        else simulate(dt, true);
      }
      R.draw(battle, hold || R.hitstop > 0 ? 1 : acc / STEP, hold ? 0 : dt, ui);
    }
    checkEnd(dt);
  }

  G.tick = tick; G.startBattle = startBattle;
  G.dbg = function () { return { state: state, mode: mode, away: away, waitLeft: waitLeft, net: Net.state, role: Net.role, room: Net.room, battle: battle }; };
  buildMenu();
  requestAnimationFrame(function (ts) { last = ts; requestAnimationFrame(frame); });
})();
