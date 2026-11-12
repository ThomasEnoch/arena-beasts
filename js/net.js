/* Arena Beasts - online play.
   G.Net     : peer-to-peer transport (WebRTC data channel through the PeerJS broker).
   G.NetSync : state snapshots. The host runs the battle. The guest shows a mirror of it.
   All data from the other player is untrusted: every field is checked before use. */
(function () {
  'use strict';
  var G = window.G;
  var PREFIX = 'arena-beasts-v1-', ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';

  // ---- transport ----------------------------------------------------------
  // N.id       : this browser's identity. It lets the host know a player who comes back.
  // N.peerId   : (host) identity of the connected guest.
  // N.reserved : (host) identity of the guest in the current battle. Only this guest can come back.
  var N = G.Net = { role: null, state: 'off', room: '', error: '', peer: null, conn: null, id: '', peerId: '', reserved: '', onChange: null, onOpen: null, onMessage: null, onClose: null };
  var joinTimer = 0, retryTimer = 0, lastRx = 0, lostAt = 0, dialAt = 0, goneFn = null;
  var REJOIN_MS = 60000, DIAL_MS = 8000;
  function set(state, err) { N.state = state; N.error = err || ''; if (N.onChange) N.onChange(); }
  function code(n) {
    var a = new Uint8Array(n), s = '', i;
    window.crypto.getRandomValues(a);
    for (i = 0; i < n; i++) s += ALPHA[a[i] % ALPHA.length];
    return s;
  }
  function validId(v) { return typeof v === 'string' && /^[a-z0-9]{12}$/.test(v); }
  try { N.id = localStorage.getItem('ab_id'); } catch (e) { /* storage is optional */ }
  if (!validId(N.id)) { N.id = code(12); try { localStorage.setItem('ab_id', N.id); } catch (e) { /* storage is optional */ } }
  N.available = function () { return typeof window.Peer === 'function'; };
  N.validRoom = function (r) { return typeof r === 'string' && /^[a-z0-9]{6}$/.test(r); };

  function wire(conn, pid) {
    N.conn = conn; conn.pid = pid || '';
    lastRx = performance.now();
    conn.on('open', function () {
      if (conn !== N.conn) return;
      clearTimeout(joinTimer); clearInterval(retryTimer);
      lastRx = performance.now();
      N.peerId = conn.pid;
      set('connected');
      if (N.onOpen) N.onOpen();
    });
    conn.on('data', function (d) {
      if (conn !== N.conn) return;
      lastRx = performance.now();
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return; } }
      if (!d || typeof d !== 'object' || typeof d.t !== 'string') return;
      if (d.t === 'hb') return;
      if (d.t === 'bye') { gone(d.f === 1); return; }
      if (N.onMessage) N.onMessage(d);
    });
    // final = the other player used "Leave room". If not final, the player can come back.
    function gone(final) {
      if (conn !== N.conn) return;
      var was = N.state;
      N.conn = null; goneFn = null;
      try { conn.close(); } catch (e) { /* ignore */ }
      if (N.role === 'host') {
        if (was !== 'connected') return;            // a connection that did not open
        set('waiting');
        if (N.onClose) N.onClose(final);
      } else if (was === 'rejoining') {
        return;                                     // the retry timer makes the next attempt
      } else if (was === 'connected' && !final) {
        lostAt = performance.now();
        set('rejoining');
        clearInterval(retryTimer); retryTimer = setInterval(retry, 2000);
        if (N.onClose) N.onClose(false);
      } else {
        N.leave(final ? 'The host closed the room.' : 'The connection to the host closed.');
        if (N.onClose) N.onClose(true);
      }
    }
    conn.on('close', function () { gone(false); });
    conn.on('error', function () { gone(false); });
    setTimeout(function () { if (conn === N.conn && !conn.open) gone(false); }, 15000);
    goneFn = function () { gone(false); };
  }
  // A closed tab does not always report the close. A heartbeat finds a silent connection.
  setInterval(function () {
    if (N.state !== 'connected' || !N.conn) return;
    N.send({ t: 'hb' });
    if (performance.now() - lastRx > 7000 && goneFn) goneFn();
  }, 1000);
  window.addEventListener('pagehide', function () { N.send({ t: 'bye' }); });

  // The broker connection can drop. Connect to the broker again after a short time.
  function keepBroker(peer) {
    peer.on('disconnected', function () {
      setTimeout(function () {
        if (peer === N.peer && !peer.destroyed && peer.disconnected) { try { peer.reconnect(); } catch (e) { /* ignore */ } }
      }, 2000);
    });
  }

  // host(room): open a room. A given room code is used again (the host loaded the page again).
  N.host = function (room, tries) {
    if (!N.available()) { set('off', 'The network library did not load. Check the internet connection.'); return; }
    var keep = N.validRoom(room), opened = false;
    tries = tries | 0;
    N.leave();
    N.role = 'host'; N.room = keep ? room : code(6);
    set('opening');
    var peer = N.peer = new window.Peer(PREFIX + N.room);
    peer.on('open', function () { if (peer !== N.peer) return; opened = true; if (N.state === 'opening') set('waiting'); });
    peer.on('connection', function (conn) {
      if (peer !== N.peer) return;
      var pid = conn.metadata && validId(conn.metadata.id) ? conn.metadata.id : '', old = N.conn;
      // The room has 2 places. A second connection is accepted only from the same player (a new connection replaces the old one).
      if ((old && !(pid && pid === old.pid)) || (N.reserved && pid !== N.reserved)) {
        conn.on('open', function () { try { conn.send({ t: 'full' }); } catch (e) { /* ignore */ } setTimeout(function () { conn.close(); }, 400); });
        return;
      }
      if (old) { N.conn = null; goneFn = null; try { old.close(); } catch (e) { /* ignore */ } }
      wire(conn, pid);
    });
    keepBroker(peer);
    peer.on('error', function (err) {
      if (peer !== N.peer) return;
      var type = err && err.type || 'unknown';
      if (type === 'unavailable-id') {
        // After a page reload the broker can hold the old room code for a short time.
        if (keep && tries < 4) setTimeout(function () { if (peer === N.peer) N.host(room, tries + 1); }, 1500);
        else N.host();
        return;
      }
      if ((N.conn && N.conn.open) || (opened && !peer.destroyed)) return;   // the room can continue
      N.leave('Network error: ' + type + '.');
      if (N.onClose) N.onClose(true);
    });
  };

  // guest: one connection attempt to the room
  function dial() {
    var peer = N.peer, old = N.conn, c;
    if (!peer || !peer.open) return;
    if (old) { N.conn = null; try { old.close(); } catch (e) { /* ignore */ } }
    dialAt = performance.now();
    c = peer.connect(PREFIX + N.room, { reliable: true, serialization: 'json', metadata: { id: N.id } });
    if (c) wire(c, '');
  }
  function guestPeer() {
    var peer = N.peer = new window.Peer();
    peer.on('open', function () {
      if (peer !== N.peer) return;
      if (N.state === 'opening') {
        set('joining');
        joinTimer = setTimeout(function () {
          if (peer === N.peer && N.state === 'joining') N.leave('No connection. The room is closed, or a firewall blocks the connection.');
        }, 15000);
      }
      if (N.state === 'joining' || N.state === 'rejoining') dial();
    });
    keepBroker(peer);
    peer.on('error', function (err) {
      if (peer !== N.peer) return;
      var type = err && err.type || 'unknown', c;
      if (N.conn && N.conn.open) return;
      if (N.state === 'rejoining') {
        // the host is not there at this time: drop this attempt, the retry timer makes a new one
        if (type === 'peer-unavailable' && N.conn) { c = N.conn; N.conn = null; try { c.close(); } catch (e) { /* ignore */ } }
        return;
      }
      if (N.state === 'connected') return;
      N.leave(type === 'peer-unavailable' ? 'Room not found. Ask the host for a new link.' : 'Network error: ' + type + '.');
      if (N.onClose) N.onClose(true);
    });
  }
  // guest: the connection dropped. Try again until the time limit.
  function retry() {
    if (N.state !== 'rejoining') { clearInterval(retryTimer); return; }
    var now = performance.now(), p = N.peer;
    if (now - lostAt > REJOIN_MS) {
      N.leave('The connection to the host is lost.');
      if (N.onClose) N.onClose(true);
      return;
    }
    if (!p || p.destroyed) guestPeer();
    else if (p.disconnected) { try { p.reconnect(); } catch (e) { /* ignore */ } }
    else if (p.open && (!N.conn || now - dialAt > DIAL_MS)) dial();
  }

  N.join = function (room) {
    if (!N.available()) { set('off', 'The network library did not load. Check the internet connection.'); return; }
    if (!N.validRoom(room)) { set('off', 'This room link is not valid.'); return; }
    N.leave();
    N.role = 'guest'; N.room = room;
    set('opening');
    guestPeer();
  };

  N.send = function (obj) {
    var c = N.conn;
    if (c && c.open) { try { c.send(obj); } catch (e) { /* a lost message is acceptable */ } }
  };
  N.leave = function (msg) {
    var p = N.peer;
    clearTimeout(joinTimer); clearInterval(retryTimer);
    N.send({ t: 'bye', f: 1 });
    goneFn = null;
    N.peer = null; N.conn = null; N.role = null; N.room = ''; N.peerId = '';
    if (p) { try { p.destroy(); } catch (e) { /* ignore */ } }
    set('off', msg || '');
  };

  // ---- snapshots ----------------------------------------------------------
  var S = G.NetSync = {};
  var STATUS = [null, 'burn', 'poison', 'toxic', 'para', 'chill', 'sleep'];
  var STATES = ['bench', 'enter', 'idle', 'wind', 'rec', 'dash', 'dodge', 'stun', 'special', 'faint'];
  var ZK = { lava: 1, toxic: 1, spikes: 1, bubbles: 1, ice: 1, vines: 1, gravity: 1, volt: 1, smoke: 1, chrome: 1, basalt: 1, reef: 1, steam: 1, thread: 1 };
  var seq = -1, lastT = 0, interval = 33, projMap = {}, prevAct = [-1, -1];
  function r1(v) { return Math.round(v * 10) / 10; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function num(v, lo, hi, def) { return typeof v === 'number' && isFinite(v) ? (v < lo ? lo : v > hi ? hi : v) : def; }

  S.reset = function () { seq = -1; lastT = 0; interval = 33; projMap = {}; prevAct[0] = prevAct[1] = -1; };
  S.alpha = function (now) { if (!lastT) return 1; var a = (now - lastT) / interval; return a > 1 ? 1 : a < 0 ? 0 : a; };

  // Events go to the guest as plain data. A move object becomes the few fields the renderer reads.
  S.event = function (e) {
    if (e.k !== 'fire') return e;
    var m = e.mv;
    return { k: 'fire', side: e.side, x: r1(e.x), y: r1(e.y), a: r2(e.a), ax: r1(e.ax), ay: r1(e.ay), mv: { type: m.type, shape: m.shape, range: m.range, arc: m.arc, width: m.width, radius: m.radius } };
  };

  function curIdx(m) {
    if (!m.cur) return -9;
    if (m.cur === m.d.sigMove) return -1;
    if (m.cur === G.PHASE_STRIKE) return -2;
    return m.d.moves.indexOf(m.cur);
  }
  function monFull(m) {
    var s = m.stages, fl = 0;
    if (m.iframes > 0) fl |= 1; if (m.guarding) fl |= 2; if (m.guardT < 0.18) fl |= 4; if (m.guardLock) fl |= 8;
    if (m.slowT > 0) fl |= 16; if (m.bulwark > 0) fl |= 32; if (m.cyclone > 0) fl |= 64; if (m.veil > 0) fl |= 128;
    if (m.hidden) fl |= 256; if (m.sp) fl |= 512; if (m.sp && m.sp.untarget) fl |= 1024; if (m.hitFlash > 0) fl |= 2048;
    if (m.moving) fl |= 4096; if (m.conf > 0) fl |= 8192; if (m.ultT > 0) fl |= 16384;
    return {
      x: r1(m.x), y: r1(m.y), z: r1(m.z), f: r2(m.face), s: STATES.indexOf(m.state), st: r2(m.st), sm: r2(m.stMax), c: curIdx(m),
      aa: r2(m.aimA), ax: r1(m.aimX), ay: r1(m.aimY), fl: fl, gm: Math.round(m.guardM), dc: r2(Math.max(0, m.dodgeCd)),
      sg: [s.atk, s.def, s.spa, s.spd, s.spe], cd: [r1(m.cds[0]), r1(m.cds[1]), r1(m.cds[2]), r1(m.cds[3])]
    };
  }
  S.snap = function (b, evs, n) {
    var out = { t: 's', n: n, tl: r2(b.timeLeft), it: r2(Math.max(0, b.intro)), bt: r2(b.t), ov: b.over ? 1 : 0, wn: b.winner, wt: b.weather ? 1 : 0, dk: b.dark ? [b.dark.side, r2(b.dark.t)] : 0, S: [], P: [], Z: [], Q: [], E: evs };
    var si, i, side, m, p;
    for (si = 0; si < 2; si++) {
      side = b.sides[si];
      var tm = [];
      for (i = 0; i < side.team.length; i++) { m = side.team[i]; tm.push([Math.round(m.hp), Math.round(m.charge), m.fainted ? 1 : 0, STATUS.indexOf(m.status), m.dealt, m.kos]); }
      out.S.push({ a: side.active, sc: r1(Math.max(0, side.switchCd)), tm: tm, m: monFull(side.team[side.active]) });
    }
    for (i = 0; i < b.proj.length; i++) { p = b.proj[i]; out.P.push([p.id, r1(p.x), r1(p.y), Math.round(p.vx), Math.round(p.vy), p.r, p.type, p.decoy ? p.sprite : 0, p.frozen > 0 ? 1 : 0, r2(p.age)]); }
    for (i = 0; i < b.zones.length; i++) { p = b.zones[i]; out.Z.push([r1(p.x), r1(p.y), p.radius, r1(p.t), p.dur, p.side, p.kind]); }
    for (i = 0; i < b.pend.length; i++) {
      p = b.pend[i];
      if (p.k === 'blast') out.Q.push([0, r1(p.x), r1(p.y), p.radius, r2(p.t), p.T, p.side, p.type]);
      else out.Q.push([1, r1(p.x), r1(p.y), r1(p.r), 0, p.maxR, p.side, p.type]);
    }
    return out;
  };

  // Guest: copy a snapshot into the mirror battle. Positions keep a start point (px,py) for smooth drawing.
  S.apply = function (b, s, now) {
    if (typeof s.n !== 'number' || s.n <= seq || !Array.isArray(s.S) || s.S.length !== 2) return;
    seq = s.n;
    var al = S.alpha(now), si, i, side, ss, m, L, F, fl, a, rx, ry, p, q, id;
    for (si = 0; si < 2; si++) {
      side = b.sides[si]; ss = s.S[si];
      if (!ss || !Array.isArray(ss.tm) || !ss.m) continue;
      a = ss.a | 0;
      if (a < 0 || a >= side.team.length) continue;
      for (i = 0; i < side.team.length; i++) {
        m = side.team[i]; L = ss.tm[i];
        if (!Array.isArray(L)) continue;
        m.hp = num(L[0], 0, m.maxHp, m.hp); m.charge = num(L[1], 0, 100, 0); m.fainted = !!L[2]; m.status = STATUS[L[3]] || null;
        m.dealt = num(L[4], 0, 1e6, 0); m.kos = num(L[5], 0, 99, 0);
        if (i !== a) m.state = 'bench';
      }
      m = side.team[a]; F = ss.m;
      var nx = num(F.x, 0, 960, m.x), ny = num(F.y, 0, 540, m.y);
      rx = m.px + (m.x - m.px) * al; ry = m.py + (m.y - m.py) * al;
      if (prevAct[si] === a && Math.abs(nx - rx) + Math.abs(ny - ry) < 220) { m.px = rx; m.py = ry; } else { m.px = nx; m.py = ny; }
      m.x = nx; m.y = ny; prevAct[si] = a;
      side.active = a; side.switchCd = num(ss.sc, 0, 60, 0);
      m.z = num(F.z, 0, 400, 0); m.face = num(F.f, -10, 10, 0);
      m.state = STATES[F.s] || 'idle'; m.st = num(F.st, -1, 60, 0); m.stMax = num(F.sm, 0.01, 60, 1);
      m.cur = F.c === -1 ? m.d.sigMove : F.c === -2 ? G.PHASE_STRIKE : (m.d.moves[F.c] || null);
      m.aimA = num(F.aa, -10, 10, 0); m.aimX = num(F.ax, 0, 960, 0); m.aimY = num(F.ay, 0, 540, 0);
      fl = F.fl | 0;
      m.iframes = fl & 1 ? 1 : 0; m.guarding = !!(fl & 2); m.guardT = fl & 4 ? 0 : 1; m.guardLock = !!(fl & 8);
      m.slowT = fl & 16 ? 1 : 0; m.bulwark = fl & 32 ? 1 : 0; m.cyclone = fl & 64 ? 1 : 0; m.veil = fl & 128 ? 1 : 0;
      m.hidden = !!(fl & 256); m.sp = fl & 512 ? { untarget: !!(fl & 1024) } : null; m.hitFlash = fl & 2048 ? 0.1 : 0;
      m.moving = !!(fl & 4096); m.conf = fl & 8192 ? 1 : 0; m.ultT = fl & 16384 ? 1 : 0;
      if (m.state === 'special' && !m.sp) m.sp = { untarget: false };
      m.guardM = num(F.gm, 0, 100, 100); m.dodgeCd = num(F.dc, 0, 10, 0);
      if (Array.isArray(F.sg)) { m.stages.atk = num(F.sg[0], -4, 4, 0); m.stages.def = num(F.sg[1], -4, 4, 0); m.stages.spa = num(F.sg[2], -4, 4, 0); m.stages.spd = num(F.sg[3], -4, 4, 0); m.stages.spe = num(F.sg[4], -4, 4, 0); }
      if (Array.isArray(F.cd)) for (i = 0; i < 4; i++) m.cds[i] = num(F.cd[i], 0, 99, 0);
    }
    // projectiles keep their identity so they move smoothly between snapshots
    var nm = {}, arr = b.proj;
    arr.length = 0;
    if (Array.isArray(s.P)) for (i = 0; i < s.P.length && i < 80; i++) {
      q = s.P[i];
      if (!Array.isArray(q) || !G.TCOL[q[6]]) continue;
      id = q[0]; p = projMap[id];
      var x = num(q[1], -50, 1010, 0), y = num(q[2], -50, 590, 0), vx = num(q[3], -2000, 2000, 0), vy = num(q[4], -2000, 2000, 0);
      if (p) { p.px = p.px + (p.x - p.px) * al; p.py = p.py + (p.y - p.py) * al; }
      else { p = { px: x - vx * interval / 1000, py: y - vy * interval / 1000 }; }
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.r = num(q[5], 2, 40, 8); p.type = q[6];
      p.decoy = !!(q[7] && G.SPR[q[7]]); p.sprite = p.decoy ? q[7] : null; p.frozen = q[8] ? 1 : 0; p.age = num(q[9], 0, 99, 0);
      nm[id] = p; arr.push(p);
    }
    projMap = nm;
    b.zones.length = 0;
    if (Array.isArray(s.Z)) for (i = 0; i < s.Z.length && i < 12; i++) {
      q = s.Z[i];
      if (Array.isArray(q) && ZK[q[6]]) b.zones.push({ x: num(q[0], 0, 960, 0), y: num(q[1], 0, 540, 0), radius: num(q[2], 5, 400, 50), t: num(q[3], 0, 99, 0), dur: num(q[4], 0.1, 99, 1), side: q[5] ? 1 : 0, kind: q[6] });
    }
    b.pend.length = 0;
    if (Array.isArray(s.Q)) for (i = 0; i < s.Q.length && i < 24; i++) {
      q = s.Q[i];
      if (!Array.isArray(q) || !G.TCOL[q[7]]) continue;
      if (q[0] === 0) b.pend.push({ k: 'blast', x: num(q[1], 0, 960, 0), y: num(q[2], 0, 540, 0), radius: num(q[3], 5, 400, 50), t: num(q[4], 0, 9, 0), T: num(q[5], 0.05, 9, 0.5), side: q[6] ? 1 : 0, type: q[7] });
      else b.pend.push({ k: 'ring', x: num(q[1], 0, 960, 0), y: num(q[2], 0, 540, 0), r: num(q[3], 0, 600, 0), maxR: num(q[5], 1, 600, 100), side: q[6] ? 1 : 0, type: q[7] });
    }
    b.timeLeft = num(s.tl, 0, 9999, b.timeLeft); b.intro = num(s.it, 0, 10, 0); b.t = num(s.bt, 0, 1e5, b.t);
    b.weather = s.wt ? { k: 'rain' } : null;
    b.dark = Array.isArray(s.dk) ? { side: s.dk[0] ? 1 : 0, t: num(s.dk[1], 0, 6, 0) } : null;
    if (s.ov) { b.over = true; b.winner = s.wn === 0 || s.wn === 1 ? s.wn : 2; }
    if (Array.isArray(s.E)) {
      if (b.ev.length > 400) b.ev.length = 0;   // tab was hidden: drop old effects
      for (i = 0; i < s.E.length && i < 200; i++) { q = s.E[i]; if (q && typeof q === 'object' && typeof q.k === 'string') b.ev.push(q); }
    }
    if (lastT) { a = now - lastT; interval = Math.max(25, Math.min(90, interval * 0.9 + a * 0.1)); }
    lastT = now;
  };
})();
