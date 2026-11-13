/* Arena Beasts - online play: the room, the ready state, the messages from the other player and a lost connection.
   The connection itself is in js/net.js (G.Net). The battle snapshots are in G.NetSync.
   Messages (m.t): hello, ready, start, resume, lobby, i (held input), a (one action), s (snapshot), pi/po (ping), full. */
(function () {
  'use strict';
  var G = window.G, A = G.APP, Net = G.Net, Sync = G.NetSync, UI = G.UI, SET = G.SET, $ = A.$;
  var ovText = null;
  // The 2 players must have the same release of the game. If not, the battle of the guest goes out of step with the host.
  var MYV = String(window.AB_V || '');
  function hello() { Net.send({ t: 'hello', name: A.myName, v: MYV }); }
  // true = the other player sent its version and it is different. null = the version did not come yet.
  function verBad() { return A.peerV !== null && A.peerV !== MYV; }
  function verOK() { return A.peerV === MYV; }

  function roomLink() { return location.origin + location.pathname + '?room=' + Net.room; }
  // Draw the online status, the Start button and the status of the result screen again.
  function refreshLobby() {
    var st = Net.state, on = st === 'connected', bad = on && verBad(), txt, start = $('start'), n = A.picks.length;
    var local = location.protocol === 'file:' || /^(localhost|127\.|\[::1\])/.test(location.hostname);
    if (st === 'off') txt = Net.error || 'Play with a friend: create a room and send the link.';
    else if (st === 'opening') txt = 'Opening the room…';
    else if (st === 'joining') txt = 'Connecting to the room…';
    else if (st === 'waiting') txt = 'Room is open. Send the link to the other player.' + (local ? ' The link works on this computer only.' : '');
    else if (st === 'rejoining') txt = 'Connection lost. Reconnecting…';
    else if (bad) txt = A.peerName + ' has a different version of the game. Both players: load the page again.';
    else txt = A.notice + 'Connected to ' + A.peerName + '. ' + (A.peerReady ? A.peerName + ' is ready.' : A.peerName + ' is selecting a team.');
    $('nstatus').textContent = txt;
    $('nstatus').className = (st === 'off' && Net.error) || st === 'rejoining' || bad ? 'err' : on ? 'ok' : '';
    $('create').classList.toggle('hidden', st !== 'off');
    $('leave').classList.toggle('hidden', st === 'off');
    $('linkbox').classList.toggle('hidden', !(Net.role === 'host' && st === 'waiting'));
    if (Net.role === 'host' && Net.room) $('link').value = roomLink();
    $('mback').textContent = UI.view === 'online' && st !== 'off' ? 'Leave room and go back' : 'Back';
    if (UI.view !== 'online') {
      start.disabled = n !== 6;
      start.textContent = n === 6 ? 'Start battle' : 'Select ' + (6 - n) + ' more';
    } else if (st === 'off') { start.disabled = true; start.textContent = 'Create a room first'; }
    else if (!on) { start.disabled = true; start.textContent = 'Waiting for player'; }
    else if (bad) { start.disabled = true; start.textContent = 'Different version'; }
    else {
      start.disabled = n !== 6;
      start.textContent = n !== 6 ? 'Select ' + (6 - n) + ' more' : A.myReady ? 'Ready. Waiting…' : 'Ready';
    }
    var rs = $('rstatus');
    if (rs) rs.textContent = bad ? txt : on ? (A.myReady ? 'Waiting for ' + A.peerName + '…' : A.peerReady ? A.peerName + ' wants a rematch.' : '') : st === 'rejoining' ? 'Connection lost. Reconnecting…' : (A.mode !== 'solo' ? 'The other player left.' : '');
    var ag = $('again');
    if (ag && A.mode !== 'solo') { ag.disabled = !on || bad; ag.textContent = A.myReady ? 'Cancel rematch' : 'Rematch'; }
  }
  function setReady(v) {
    if (!A.online() || !verOK() || A.picks.length !== 6) return;
    A.myReady = v; A.notice = '';
    Net.send({ t: 'ready', on: v, team: v ? A.picks : null });
    refreshLobby();
    maybeStart();
  }
  function maybeStart() {
    if (Net.role !== 'host' || !A.online() || !verOK() || !A.myReady || !A.peerReady || !A.peerTeam || A.picks.length !== 6) return;
    if (A.state === 'battle' && !A.battle.over) return;
    var teams = [A.picks.slice(), A.peerTeam.slice()], names = [A.myName, A.peerName === A.myName ? A.peerName + ' 2' : A.peerName];
    Net.send({ t: 'start', teams: teams, names: names });
    A.myReady = A.peerReady = false;
    A.startBattle(teams[0], teams[1], 'host', names);
  }
  function giveAI(txt) {
    var s = A.battle.sides[1];
    s.isAI = true; s.ai = G.makeAI('normal');
    A.battle.msg(txt, '#ffe27a');
  }
  // The connection to the other player closed. final = the player left the room, or the retry time ended.
  function peerGone(final) {
    var live = A.state === 'battle' && A.battle && !A.battle.over;
    A.myReady = A.peerReady = false; A.peerTeam = null; A.ping = -1;
    if (live && A.mode === 'host') {
      if (final || !Net.reserved) {
        Net.reserved = ''; A.away = false; A.mode = 'solo';
        giveAI('The other player left. The AI plays now.');
      } else {
        A.away = true;                                   // hold the battle: see hostHold
        if (A.waitLeft <= 0) giveAI(A.battle.sides[1].name + ' lost the connection. The AI plays now.');
      }
    } else if (live && A.mode === 'guest' && final) A.toMenu();
    // guest, not final: the battle stays on the screen while G.Net tries to connect again
    refreshLobby();
  }
  // Host: hold the battle while the guest is away. Returns true while the battle is on hold.
  function hostHold(dt) {
    if (A.mode !== 'host' || !A.away || A.waitLeft <= 0 || !A.battle || A.battle.over) return false;
    A.waitLeft -= dt;
    if (A.waitLeft > 0) return true;
    giveAI(A.battle.sides[1].name + ' did not come back. The AI plays now.');
    return false;
  }
  // Host: the guest of this battle connected again. Give back the control and send the battle.
  function resumeGuest() {
    var s = A.battle.sides[1], c = s.ctrl;
    A.away = false; s.isAI = false;
    c.mx = c.my = 0; c.guard = false; c.dodge = false; c.sig = false; c.move = -1; c.sw = -1;
    Net.send({ t: 'resume', teams: A.lastTeams, names: [A.battle.sides[0].name, s.name] });
    Net.send(Sync.snap(A.battle, [], A.snapN++));
    A.battle.msg(s.name + ' is back.', '#8dff9a');
  }
  // Message on top of the battle while a player is away. Each display frame, from main.js.
  function netOverlay() {
    var t = '', btn = '';
    if (A.state === 'battle' && A.battle && !A.battle.over) {
      if (A.mode === 'guest' && Net.state === 'rejoining') { t = 'Connection lost. Reconnecting…'; btn = 'Leave battle'; }
      else if (A.mode === 'host' && A.away && A.waitLeft > 0) { t = A.battle.sides[1].name + ' lost the connection. Waiting ' + Math.ceil(A.waitLeft) + ' s…'; btn = 'Play against AI now'; }
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
  function liveGuestBattle() { return A.mode === 'guest' && A.state === 'battle' && A.battle; }

  Net.onChange = function () { saveRoom(); refreshLobby(); };
  Net.onOpen = function () {
    A.myReady = A.peerReady = false; A.peerTeam = null; A.peerV = null;
    hello();
    if (Net.role === 'host') {
      if (A.mode === 'host' && A.state === 'battle' && A.battle && !A.battle.over && Net.reserved && Net.peerId === Net.reserved) resumeGuest();
      else Net.send({ t: 'lobby' });
    }
    refreshLobby();
  };
  Net.onClose = peerGone;
  Net.onMessage = function (m) {
    var a, c, ct;
    switch (m.t) {
      case 'hello':
        A.peerName = A.cleanName(m.name, Net.role === 'host' ? 'Guest' : 'Host');
        A.peerV = typeof m.v === 'string' ? m.v.slice(0, 16) : '';   // a release before the version check sends no version
        if (verBad() && A.myReady) { A.myReady = false; Net.send({ t: 'ready', on: false }); }
        refreshLobby();
        break;
      case 'ready':
        A.peerReady = !!m.on; A.peerTeam = A.peerReady ? A.cleanTeam(m.team) : null;
        if (!A.peerTeam) A.peerReady = false;
        refreshLobby(); maybeStart();
        break;
      case 'start':
        if (Net.role !== 'guest' || !verOK()) break;
        a = A.cleanTeam(m.teams && m.teams[0]); c = A.cleanTeam(m.teams && m.teams[1]);
        if (!a || !c) break;
        A.myReady = A.peerReady = false;
        A.startBattle(a, c, 'guest', [A.cleanName(m.names && m.names[0], 'Host'), A.cleanName(m.names && m.names[1], 'Guest')]);
        break;
      case 'resume':   // the host has a battle in progress for this player
        if (Net.role !== 'guest' || !verOK()) break;
        a = A.cleanTeam(m.teams && m.teams[0]); c = A.cleanTeam(m.teams && m.teams[1]);
        if (!a || !c) break;
        A.myReady = A.peerReady = false;
        // After a short connection loss the battle is still on the screen. After a page reload, build it again.
        if (!(liveGuestBattle() && A.lastTeams && A.lastTeams[0].join() === a.join() && A.lastTeams[1].join() === c.join()))
          A.startBattle(a, c, 'guest', [A.cleanName(m.names && m.names[0], 'Host'), A.cleanName(m.names && m.names[1], 'Guest')]);
        if (A.picks.length !== 6) { A.picks = c.slice(); A.refresh(); }
        break;
      case 'lobby':    // the host has no battle for this player (for example, the host loaded the page again)
        if (Net.role === 'guest' && liveGuestBattle() && !A.battle.over) {
          A.toMenu(); A.notice = 'The battle stopped because the host restarted. '; refreshLobby();
        }
        break;
      case 'i':
        if (A.mode === 'host' && A.battle && Net.role === 'host') {
          ct = A.battle.sides[1].ctrl;
          ct.mx = A.num(m.mx, -1, 1); ct.my = A.num(m.my, -1, 1); ct.ax = A.num(m.ax, -200, 1200); ct.ay = A.num(m.ay, -200, 800); ct.guard = !!m.g;
        }
        break;
      case 'a':
        if (A.mode === 'host' && A.battle && Net.role === 'host' && typeof m.k === 'string') {
          ct = A.battle.sides[1].ctrl;
          ct.ax = A.num(m.ax, -200, 1200); ct.ay = A.num(m.ay, -200, 800);
          A.applyAct(1, m.k, m.i | 0);
        }
        break;
      case 's':
        if (A.mode === 'guest' && A.battle && Net.role === 'guest') { try { Sync.apply(A.battle, m, performance.now()); } catch (e) { /* skip a bad snapshot */ } }
        break;
      case 'pi': Net.send({ t: 'po', ts: A.num(m.ts, 0, 1e15) }); break;
      case 'po': if (typeof m.ts === 'number') A.ping = Math.max(0, Math.round(performance.now() - m.ts)); break;
      case 'full': Net.leave('This room is full.'); break;
    }
  };

  // ---- start --------------------------------------------------------------
  function initLobby() {
    var pn = $('pname');
    A.myName = A.cleanName(SET.get('name'), 'Player');
    pn.value = SET.get('name');
    pn.oninput = function () { SET.set('name', pn.value); };
    // The name is also in the Settings screen. Each change comes through the settings store.
    SET.onChange(function (k) {
      if (k !== 'name') return;
      A.myName = A.cleanName(SET.get('name'), 'Player');
      if (document.activeElement !== pn) pn.value = SET.get('name');
      if (A.online()) hello();
    });
    $('create').onclick = function () { G.sfx('ui'); Net.host(); };
    $('leave').onclick = function () { G.sfx('ui'); Net.leave(); peerGone(true); };
    $('nmbtn').onclick = function () {
      if (A.state !== 'battle' || !A.battle) return;
      G.sfx('ui');
      if (A.mode === 'guest') { Net.leave(); peerGone(true); }
      else if (A.mode === 'host' && A.away && A.waitLeft > 0) { A.waitLeft = 0; giveAI('The AI plays for ' + A.battle.sides[1].name + ' now.'); }
    };
    $('copy').onclick = function () {
      var link = $('link'), done = function () { $('copy').textContent = 'Copied'; setTimeout(function () { $('copy').textContent = 'Copy link'; }, 1500); };
      link.select();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link.value).then(done, function () { try { document.execCommand('copy'); done(); } catch (e) { /* user can copy by hand */ } });
      else { try { document.execCommand('copy'); done(); } catch (e) { /* user can copy by hand */ } }
    };
  }
  // Open the room of a link, or the room of the host after a page reload. Returns true if a room opens.
  function openSavedRoom() {
    var room = new URLSearchParams(location.search).get('room'), mine = null;
    try { mine = sessionStorage.getItem('ab_host'); } catch (e) { /* storage is optional */ }
    if (room) { Net.join(room.toLowerCase()); return true; }
    if (Net.validRoom(mine)) { Net.host(mine); return true; }   // the same room: the link stays valid
    return false;
  }
  function hasSavedRoom() {
    var mine = null;
    try { mine = sessionStorage.getItem('ab_host'); } catch (e) { /* storage is optional */ }
    return !!new URLSearchParams(location.search).get('room') || Net.validRoom(mine);
  }

  A.refreshLobby = refreshLobby; A.setReady = setReady; A.peerGone = peerGone; A.hostHold = hostHold;
  A.netOverlay = netOverlay; A.initLobby = initLobby; A.openSavedRoom = openSavedRoom; A.hasSavedRoom = hasSavedRoom;
})();
