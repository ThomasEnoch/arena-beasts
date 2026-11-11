/* Arena Beasts - battle engine. No DOM access: this file also runs in Node for headless tests.
   The engine advances in fixed steps. It reports visuals and sounds through the b.ev event list. */
(function (root) {
  'use strict';
  var G = root.G;
  var AR = G.ARENA = { x0: 90, y0: 104, x1: 870, y1: 448 };
  var SIZE = G.SIZE = { S: { r: 17, sc: 1.5, acc: 2600 }, M: { r: 21, sc: 1.75, acc: 1700 }, L: { r: 26, sc: 2, acc: 950 } };
  var PI = Math.PI, TAU = PI * 2;
  var DOT = { burn: 0.015, poison: 0.02, toxic: 0.035 };
  var SDUR = { burn: 8, poison: 8, toxic: 8, para: 6, chill: 4, sleep: 1.5 };
  var STATS = ['atk', 'def', 'spa', 'spd', 'spe'];
  var MAXSTAGE = 4;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function angDiff(a, b) { var d = a - b; while (d > PI) d -= TAU; while (d < -PI) d += TAU; return d; }
  function stageMul(n) { return n >= 0 ? (2 + n) / 2 : 2 / (2 - n); }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function distP(x, y, b) { var dx = x - b.x, dy = y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function clampArena(m) { m.x = clamp(m.x, AR.x0 + m.r, AR.x1 - m.r); m.y = clamp(m.y, AR.y0 + m.r * 0.6, AR.y1 - m.r * 0.6); }
  G.clamp = clamp; G.angDiff = angDiff; G.stageMul = stageMul; G.dist = dist;

  function inCone(src, tgt, a, range, arcDeg) {
    var dx = tgt.x - src.x, dy = tgt.y - src.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > range + tgt.r) return false;
    if (d < tgt.r + 4) return true;
    var half = arcDeg * PI / 360 + Math.asin(Math.min(1, tgt.r / d));
    return Math.abs(angDiff(Math.atan2(dy, dx), a)) <= half;
  }
  function inLine(sx, sy, a, range, width, tgt) {
    var dx = tgt.x - sx, dy = tgt.y - sy, ca = Math.cos(a), sa = Math.sin(a);
    var t = dx * ca + dy * sa;
    if (t < -tgt.r || t > range + tgt.r) return false;
    return Math.abs(-dx * sa + dy * ca) <= width / 2 + tgt.r;
  }
  var TMP = { x: 0, y: 0, r: 0 };
  // True when tgt (with a safety margin) is inside the area that src's current wind-up will hit.
  G.inTele = function (src, mv, tgt, margin) {
    TMP.x = tgt.x; TMP.y = tgt.y; TMP.r = tgt.r + margin;
    switch (mv.shape) {
      case 'cone': return inCone(src, TMP, src.aimA, mv.range, mv.arc);
      case 'line': return inLine(src.x, src.y, src.aimA, mv.range, mv.width, TMP);
      case 'dash': return inLine(src.x, src.y, src.aimA, mv.dist + src.r, mv.width, TMP);
      case 'proj': return inLine(src.x, src.y, src.aimA, mv.range, mv.pr * 2 + (mv.count ? 60 : 0), TMP);
      case 'nova': case 'ring': return dist(src, tgt) <= mv.radius + TMP.r;
      case 'lob': return distP(src.aimX, src.aimY, tgt) <= mv.radius + TMP.r;
    }
    return false;
  };
  G.moveReach = function (mv) {
    switch (mv.shape) {
      case 'cone': case 'line': case 'proj': return mv.range;
      case 'nova': case 'ring': return mv.radius;
      case 'lob': case 'zone': return mv.range + mv.radius * 0.6;
      case 'dash': return mv.dist;
    }
    return 0;
  };

  // ---- construction -------------------------------------------------------
  function makeMon(id, si) {
    var d = G.DEX[id], maxHp = d.st.hp * 3 + 100;
    return {
      id: id, d: d, side: si, maxHp: maxHp, hp: maxHp, shownHp: maxHp, r: SIZE[d.size].r,
      stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, status: null, statusT: 0, statusTick: 0, conf: 0,
      cds: [0, 0, 0, 0], charge: 0, fainted: false,
      x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, kx: 0, ky: 0, z: 0, face: si ? PI : 0,
      state: 'bench', st: 0, stMax: 1, cur: null, curI: -1, aimA: 0, aimX: 0, aimY: 0, windSeq: 0,
      dodgeCd: 0, iframes: 0, guardM: 100, guarding: false, guardT: 0, guardRegenT: 0, guardLock: false,
      ccImmune: 0, slowT: 0, slowF: 1, rootT: 0, zoneSlow: 1, zs: 1,
      bulwark: 0, cyclone: 0, cycTick: 0, veil: 0, veilHit: false, hidden: false, sp: null,
      dashHit: false, dashV: 0, dvx: 0, dvy: 0, hitFlash: 0, moving: false, dealt: 0, taken: 0, kos: 0, healUses: 0
    };
  }
  function resetVolatile(m) {
    for (var i = 0; i < 5; i++) m.stages[STATS[i]] = 0;
    m.conf = 0; m.bulwark = 0; m.cyclone = 0; m.veil = 0; m.veilHit = false; m.hidden = false; m.sp = null; m.cur = null;
    m.guarding = false; m.slowT = 0; m.rootT = 0; m.kx = m.ky = m.vx = m.vy = 0; m.z = 0; m.iframes = 0; m.zoneSlow = m.zs = 1;
  }
  function mkSide(idx, ids, name) {
    return {
      idx: idx, name: name, team: ids.map(function (id) { return makeMon(id, idx); }), active: 0, switchCd: 0,
      ctrl: { mx: 0, my: 0, ax: (AR.x0 + AR.x1) / 2, ay: (AR.y0 + AR.y1) / 2, move: -1, moveT: 0, dodge: false, dodgeT: 0, guard: false, sig: false, sigT: 0, sw: -1, swT: 0 },
      isAI: false, ai: null
    };
  }

  function Battle(teamA, teamB, opts) {
    opts = opts || {};
    this.t = 0;
    this.timeLeft = this.totalTime = opts.time || 420;
    this.intro = opts.intro === undefined ? 2.4 : opts.intro;
    this.over = false; this.winner = -1;
    this.proj = []; this.zones = []; this.pend = []; this.ev = [];
    this.weather = null; this.dark = null;
    var n = opts.names || ['You', 'Rival'];
    this.sides = [mkSide(0, teamA, n[0]), mkSide(1, teamB, n[1])];
    this.sendOut(0, 0); this.sendOut(1, 0);
  }
  G.Battle = Battle;
  var BP = Battle.prototype;

  BP.active = function (si) { var s = this.sides[si]; return s.team[s.active]; };
  BP.msg = function (txt, col) { this.ev.push({ k: 'msg', txt: txt, col: col || '#ffffff' }); };
  BP.sendOut = function (si, idx) {
    var side = this.sides[si], m = side.team[idx];
    side.active = idx;
    resetVolatile(m);
    m.x = m.px = si === 0 ? AR.x0 + 150 : AR.x1 - 150;
    m.y = m.py = (AR.y0 + AR.y1) / 2;
    m.face = si ? PI : 0;
    m.state = 'enter'; m.st = m.stMax = 0.55;
    this.ev.push({ k: 'send', side: si, x: m.x, y: m.y, id: m.id });
    this.msg(side.name + ' sent out ' + m.d.name + '!', si ? '#ff9a8a' : '#9ad0ff');
  };
  BP.switchTo = function (si, idx) {
    var side = this.sides[si], old = side.team[side.active];
    this.ev.push({ k: 'recall', side: si, x: old.x, y: old.y });
    if (this.dark && this.dark.side === si) this.dark = null;
    old.state = 'bench'; resetVolatile(old);
    side.switchCd = 8;
    this.sendOut(si, idx);
  };
  BP.end = function (w) {
    if (this.over) return;
    this.over = true; this.winner = w;
    this.ev.push({ k: 'end', winner: w });
  };
  BP.aliveCount = function (si) { var t = this.sides[si].team, n = 0; for (var i = 0; i < t.length; i++) if (!t[i].fainted) n++; return n; };
  BP.hpFrac = function (si) { var t = this.sides[si].team, s = 0; for (var i = 0; i < t.length; i++) s += t[i].hp / t[i].maxHp; return s / t.length; };

  // ---- small effect helpers -----------------------------------------------
  function targetable(m) {
    return !m.fainted && m.state !== 'enter' && m.state !== 'bench' && m.state !== 'faint' && m.iframes <= 0 &&
      !(m.state === 'special' && m.sp && m.sp.untarget);
  }
  function present(m) { return m && !m.fainted && m.state !== 'enter' && m.state !== 'bench' && m.state !== 'faint'; }
  function addCharge(b, m, v) {
    if (m.charge >= 100 || m.fainted) return;
    m.charge += v;
    if (m.charge >= 100) { m.charge = 100; b.ev.push({ k: 'ready', side: m.side, x: m.x, y: m.y }); }
  }
  function setStun(m, t) {
    if (m.state === 'special' || m.state === 'enter' || m.state === 'faint' || m.bulwark > 0) return false;
    m.state = 'stun'; m.st = m.stMax = Math.min(t, 1.5); m.cur = null; m.guarding = false;
    return true;
  }
  function special(m, sp) { sp.t = 0; m.sp = sp; m.state = 'special'; m.cur = null; m.vx = m.vy = 0; m.guarding = false; }
  function tryStatus(b, m, s) {
    if (m.fainted || m.status) return false;
    var ty = m.d.types;
    if (s === 'burn' && ty.indexOf('Ember') >= 0) return false;
    if ((s === 'poison' || s === 'toxic') && (ty.indexOf('Venom') >= 0 || ty.indexOf('Iron') >= 0)) return false;
    if (s === 'para' && ty.indexOf('Volt') >= 0) return false;
    if (s === 'chill' && ty.indexOf('Frost') >= 0) return false;
    if (s === 'sleep') {
      if (m.ccImmune > 0 || !setStun(m, 1.5)) return false;
    }
    m.status = s; m.statusT = SDUR[s]; m.statusTick = 1;
    b.ev.push({ k: 'status', x: m.x, y: m.y, s: s, side: m.side });
    b.msg(m.d.name + ': ' + G.STATUS_NAME[s] + '!', G.STATUS_COL[s]);
    return true;
  }
  function confuse(b, m, t) {
    if (m.fainted || m.conf > 0 || m.bulwark > 0) return;
    m.conf = t;
    b.ev.push({ k: 'text', x: m.x, y: m.y, txt: 'Confused!', col: '#ffd0f0' });
    b.msg(m.d.name + ' is confused!', '#ffd0f0');
  }
  function stage(b, m, stat, n) {
    if (m.fainted) return;
    var o = m.stages[stat], v = clamp(o + n, -MAXSTAGE, MAXSTAGE);
    if (v === o) return;
    m.stages[stat] = v;
    var up = n > 0;
    b.ev.push({ k: 'stage', x: m.x, y: m.y, stat: stat, n: n, side: m.side });
    b.msg(m.d.name + "'s " + G.STAT_NAME[stat] + (up ? (n > 1 ? ' rose sharply!' : ' rose!') : (n < -1 ? ' fell sharply!' : ' fell!')), up ? '#8fe0ff' : '#ff9a9a');
  }
  function heal(b, m, amt) {
    if (m.fainted || amt <= 0) return;
    var h = Math.min(amt, m.maxHp - m.hp);
    if (h <= 0) return;
    m.hp += h;
    b.ev.push({ k: 'heal', x: m.x, y: m.y, amt: Math.round(h) });
  }
  function selfDamage(b, m, amt) {
    if (m.fainted) return;
    amt = Math.min(Math.round(amt), Math.max(0, Math.ceil(m.hp) - 1));
    if (amt <= 0) return;
    m.hp -= amt; m.hitFlash = 0.1;
    b.ev.push({ k: 'dmg', x: m.x, y: m.y, dmg: amt, eff: 1, crit: false, side: m.side, dot: 'recoil', big: 0 });
  }
  function knock(src, tgt, f) {
    if (tgt.bulwark > 0 || tgt.fainted) return;
    var dx = tgt.x - src.x, dy = tgt.y - src.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    var k = f * (tgt.d.size === 'L' ? 0.7 : tgt.d.size === 'S' ? 1.2 : 1);
    tgt.kx += dx / d * k; tgt.ky += dy / d * k;
  }
  function faint(b, src, tgt) {
    tgt.fainted = true; tgt.hp = 0; tgt.status = null;
    resetVolatile(tgt);
    tgt.state = 'faint'; tgt.st = tgt.stMax = 1.3;
    if (src) src.kos++;
    if (b.dark && b.dark.side === tgt.side) b.dark = null;
    b.ev.push({ k: 'faint', x: tgt.x, y: tgt.y, side: tgt.side });
    b.msg(tgt.d.name + ' fainted!', '#ffd27a');
  }
  function dealDamage(b, src, tgt, dmg, info) {
    dmg = Math.max(1, Math.round(dmg));
    if (dmg > tgt.hp) dmg = Math.ceil(tgt.hp);
    tgt.hp -= dmg; tgt.taken += dmg; tgt.hitFlash = 0.12;
    if (src) { src.dealt += dmg; if (!info.noCharge) addCharge(b, src, dmg / tgt.maxHp * 55); }
    if (!info.dot) addCharge(b, tgt, dmg / tgt.maxHp * 40);
    b.ev.push({ k: 'dmg', x: tgt.x, y: tgt.y, dmg: dmg, eff: info.eff === undefined ? 1 : info.eff, crit: !!info.crit, side: tgt.side, dot: info.dot || null, type: info.type || null, big: dmg / tgt.maxHp });
    if (tgt.status === 'sleep' && !info.dot) {
      tgt.status = null;
      if (tgt.state === 'stun') { tgt.state = 'idle'; tgt.ccImmune = 5; }
    }
    if (tgt.hp <= 0.5) faint(b, src, tgt);
  }
  function applyGuard(b, tgt, dmg) {
    if (!tgt.guarding) return dmg;
    if (tgt.guardT < 0.18) {
      b.ev.push({ k: 'text', x: tgt.x, y: tgt.y, txt: 'Perfect guard!', col: '#fff7b0' });
      b.ev.push({ k: 'guard', x: tgt.x, y: tgt.y, perfect: true });
      addCharge(b, tgt, 4);
      return dmg * 0.1;
    }
    tgt.guardM -= Math.min(50, dmg / tgt.maxHp * 300); tgt.guardRegenT = 1.5;
    b.ev.push({ k: 'guard', x: tgt.x, y: tgt.y, perfect: false });
    if (tgt.guardM <= 0) {
      tgt.guardM = 0; tgt.guardLock = true; tgt.guarding = false;
      if (setStun(tgt, 1.0)) b.ev.push({ k: 'text', x: tgt.x, y: tgt.y, txt: 'Guard broken!', col: '#ff8a8a' });
    }
    return dmg * 0.35;
  }

  // A normal move hits tgt. Returns damage, or -1 when the hit did not connect.
  function hit(b, src, tgt, mv) {
    if (!present(tgt)) return -1;
    if (!targetable(tgt)) { b.ev.push({ k: 'miss', x: tgt.x, y: tgt.y }); return -1; }
    var e = G.eff(mv.type, tgt.d.types), dmg = 0, guarded = tgt.guarding;
    if (mv.power > 0 && e === 0) { b.ev.push({ k: 'text', x: tgt.x, y: tgt.y, txt: 'No effect', col: '#b8b8c8' }); return -1; }
    if (mv.power === 0 && guarded) { b.ev.push({ k: 'text', x: tgt.x, y: tgt.y, txt: 'Blocked', col: '#b8d8ff' }); b.ev.push({ k: 'guard', x: tgt.x, y: tgt.y }); return -1; }
    if (mv.power > 0) {
      var phys = mv.cat === 'phys', ak = phys ? 'atk' : 'spa', dk = phys ? 'def' : 'spd';
      var A = src.d.st[ak] * stageMul(src.stages[ak]);
      if (phys && src.status === 'burn') A *= 0.7;
      var D = tgt.d.st[dk] * stageMul(tgt.stages[dk]);
      dmg = 0.48 * mv.power * A / D + 2;
      if (src.d.types.indexOf(mv.type) >= 0) dmg *= 1.3;
      dmg *= e;
      if (b.weather) { if (mv.type === 'Tide') dmg *= 1.25; else if (mv.type === 'Ember') dmg *= 0.75; }
      var crit = Math.random() < 0.06;
      if (crit) dmg *= 1.5;
      dmg *= 0.92 + Math.random() * 0.08;
      var veilHit = src.veil > 0 && !src.veilHit;
      if (veilHit) dmg *= 1.6;
      dmg = applyGuard(b, tgt, dmg);
      if (tgt.bulwark > 0) dmg *= 0.3;
      dealDamage(b, src, tgt, dmg, { eff: e, crit: crit, type: mv.type });
      if (veilHit) {
        src.veilHit = true; src.veil = 0.01;
        if (!guarded) tryStatus(b, tgt, 'toxic');
      }
      if (mv.kb) knock(src, tgt, mv.kb);
    }
    // on-hit effects
    for (var i = 0; i < mv.fx.length; i++) {
      var f = mv.fx[i];
      switch (f.k) {
        case 'status': if (!guarded && Math.random() < f.ch) tryStatus(b, tgt, f.s); break;
        case 'conf': if (!guarded && Math.random() < f.ch) confuse(b, tgt, 4); break;
        case 'stage':
          if (f.who === 'foe') { if (!guarded && Math.random() < f.ch) stage(b, tgt, f.stat, f.n); }
          else if (mv.cat !== 'status') stage(b, src, f.stat, f.n);
          break;
        case 'drain': heal(b, src, dmg * f.pct); break;
        case 'recoil': selfDamage(b, src, dmg * f.pct); break;
      }
    }
    return dmg;
  }
  // Self effects of a status move. They apply when the move fires.
  function useFx(b, m, mv) {
    for (var i = 0; i < mv.fx.length; i++) {
      var f = mv.fx[i];
      if (f.k === 'stage' && f.who === 'self') stage(b, m, f.stat, f.n);
      else if (f.k === 'heal') { heal(b, m, m.maxHp * f.pct * Math.pow(0.7, m.healUses)); m.healUses++; }
      else if (f.k === 'cure') { if (m.status) { m.status = null; b.msg(m.d.name + ' is healthy again!', '#b8ffb8'); } m.conf = 0; }
    }
  }
  // Signature power damage: a share of the target's maximum HP.
  function sigHit(b, src, tgt, pct, type) {
    if (!present(tgt)) return -1;
    if (!targetable(tgt)) { b.ev.push({ k: 'miss', x: tgt.x, y: tgt.y }); return -1; }
    var e = G.eff(type, tgt.d.types), m = e === 0 ? 0.5 : Math.sqrt(e);
    var dmg = tgt.maxHp * pct * m;
    dmg = applyGuard(b, tgt, dmg);
    if (tgt.bulwark > 0) dmg *= 0.3;
    dealDamage(b, src, tgt, dmg, { eff: e === 0 ? 0.5 : e, noCharge: true, type: type });
    return dmg;
  }

  function spawnProj(b, p) { p.id = b.pid = (b.pid || 0) + 1; p.px = p.x; p.py = p.y; p.age = 0; p.frozen = 0; p.passed = false; p.aiRoll = false; b.proj.push(p); }
  function addZone(b, si, z) {
    var n = 0, oldest = -1, i;
    for (i = 0; i < b.zones.length; i++) if (b.zones[i].side === si) { n++; if (oldest < 0) oldest = i; }
    if (n >= 3) b.zones.splice(oldest, 1);
    z.side = si; z.t = 0; z.tickT = 0.25;
    z.x = clamp(z.x, AR.x0, AR.x1); z.y = clamp(z.y, AR.y0, AR.y1);
    b.zones.push(z);
    b.ev.push({ k: 'zone', x: z.x, y: z.y, r: z.radius, type: z.type });
  }

  // ---- signature powers ---------------------------------------------------
  var PHASE_STRIKE = {
    name: 'Phase Strike', type: 'Shade', cat: 'spec', power: 0, shape: 'cone', range: 105, arc: 120, wind: 320, rec: 500, fx: [],
    strike: function (b, side, m, foe) {
      if (inCone(m, foe, m.aimA, 105, 120)) {
        var d = sigHit(b, m, foe, 0.32, 'Shade');
        if (d > 0 && !foe.fainted) {
          if (!foe.guarding) tryStatus(b, foe, 'chill');
          var stole = false;
          for (var i = 0; i < 5; i++) {
            var s = STATS[i];
            if (foe.stages[s] > 0) { m.stages[s] = Math.min(MAXSTAGE, m.stages[s] + foe.stages[s]); foe.stages[s] = 0; stole = true; }
          }
          if (stole) { b.msg(m.d.name + ' stole the stat increases!', '#c9b8ff'); b.ev.push({ k: 'stage', x: m.x, y: m.y, stat: 'atk', n: 1, side: m.side }); }
        }
      }
      selfDamage(b, m, m.maxHp * 0.08);
      stage(b, m, 'spd', -1);
    }
  };

  G.PHASE_STRIKE = PHASE_STRIKE;

  var SIG = {
    caldera: function (b, side, m, foe) {
      b.ev.push({ k: 'shake', v: 10 });
      if (dist(m, foe) <= 200 + foe.r) { if (sigHit(b, m, foe, 0.34, 'Ember') > 0 && !foe.guarding) tryStatus(b, foe, 'burn'); }
      addZone(b, side.idx, { x: m.x, y: m.y, radius: 200, dur: 5, kind: 'lava', pct: 0.012, status: 'burn', statusCh: 0.4, type: 'Ember' });
      stage(b, m, 'spe', -2);
      m.st = 0.7;
    },
    riptide: function (b, side, m, foe) {
      m.st = 1.5; m.rootT = 1.5;
      if (!inLine(m.x, m.y, m.aimA, 600, 60, foe)) return;
      var d = sigHit(b, m, foe, 0.30, 'Tide');
      if (d < 0 || foe.fainted || foe.bulwark > 0) return;
      var a = m.aimA, sx = foe.x, sy = foe.y;
      var tx = clamp(m.x + Math.cos(a) * (m.r + foe.r + 34), AR.x0 + foe.r, AR.x1 - foe.r);
      var ty = clamp(m.y + Math.sin(a) * (m.r + foe.r + 34), AR.y0 + foe.r, AR.y1 - foe.r);
      special(foe, {
        dur: 0.5, pulled: true,
        upd: function (b, side, f) { var q = Math.min(1, f.sp.t / 0.5); q = q * q * (3 - 2 * q); f.x = sx + (tx - sx) * q; f.y = sy + (ty - sy) * q; }
      });
      confuse(b, foe, 2);
    },
    overgrowth: function (b, side, m, foe) {
      addZone(b, side.idx, { x: m.aimX, y: m.aimY, radius: 170, dur: 6, kind: 'vines', pct: 0.02, slow: 0.5, healOwner: 0.01, type: 'Bloom' });
      if (distP(m.aimX, m.aimY, foe) <= 170 + foe.r) sigHit(b, m, foe, 0.15, 'Bloom');
      stage(b, m, 'def', -1);
      m.rootT = 0.8; m.st = 0.8;
    },
    mirage: function (b, side, m, foe) {
      var ox = m.x, oy = m.y, pa = Math.atan2(foe.y - m.y, foe.x - m.x), k;
      for (k = -1; k <= 1; k += 2) {
        spawnProj(b, {
          x: ox + Math.cos(pa + k * 1.57) * 30, y: oy + Math.sin(pa + k * 1.57) * 30,
          vx: Math.cos(pa + k * 0.9) * 330, vy: Math.sin(pa + k * 0.9) * 330,
          r: 16, life: 2.6, side: side.idx, mv: null, src: m, homing: 4, type: 'Volt', decoy: true, pct: 0.18, sprite: m.id
        });
      }
      var tx = clamp(foe.x + Math.cos(pa) * 260, AR.x0 + m.r, AR.x1 - m.r), ty = clamp(foe.y + Math.sin(pa) * 260, AR.y0 + m.r, AR.y1 - m.r);
      if (distP(tx, ty, foe) < 150) {
        tx = clamp(foe.x - Math.cos(pa) * 260, AR.x0 + m.r, AR.x1 - m.r); ty = clamp(foe.y - Math.sin(pa) * 260, AR.y0 + m.r, AR.y1 - m.r);
      }
      b.ev.push({ k: 'teleport', x: ox, y: oy, x2: tx, y2: ty, type: 'Volt' });
      m.x = m.px = tx; m.y = m.py = ty; m.iframes = 0.4;
      selfDamage(b, m, m.maxHp * 0.1);
      m.st = 0.3;
    },
    glacier: function (b, side, m, foe) {
      var sx = m.x, sy = m.y, tx = m.aimX, ty = m.aimY;
      special(m, {
        dur: 0.55, untarget: true,
        upd: function (b, side, f) { var q = Math.min(1, f.sp.t / 0.55); f.x = sx + (tx - sx) * q; f.y = sy + (ty - sy) * q; f.z = Math.sin(q * PI) * 110; },
        end: function (b, side, f, foe) {
          f.z = 0; clampArena(f);
          b.ev.push({ k: 'shake', v: 12 });
          b.ev.push({ k: 'burst', x: f.x, y: f.y, r: 130, type: 'Frost' });
          if (dist(f, foe) <= 130 + foe.r) { if (sigHit(b, f, foe, 0.38, 'Frost') > 0 && !foe.guarding) tryStatus(b, foe, 'chill'); }
          addZone(b, side.idx, { x: f.x, y: f.y, radius: 130, dur: 5, kind: 'ice', pct: 0.008, slow: 0.6, type: 'Frost' });
          f.state = 'rec'; f.st = f.stMax = 1.2; f.rootT = 1.2;
        }
      });
    },
    bulwark: function (b, side, m) { m.bulwark = 5; m.st = 0.2; },
    cyclone: function (b, side, m) { m.cyclone = 5; m.cycTick = 0.5; m.status = null; m.conf = 0; m.st = 0.2; },
    nightfall: function (b, side, m) {
      m.veil = 6; m.veilHit = false;
      b.dark = { side: side.idx, t: 6 };
      stage(b, m, 'def', -2);
      m.st = 0.2;
    },
    zerofield: function (b, side, m, foe) {
      for (var i = 0; i < b.proj.length; i++) {
        var p = b.proj[i];
        if (p.side !== side.idx) { p.frozen = 0.8; p.flipTo = side.idx; p.flipSrc = m; }
      }
      b.ev.push({ k: 'shake', v: 6 });
      if (dist(m, foe) <= 220 + foe.r) { if (sigHit(b, m, foe, 0.28, 'Mind') > 0 && !foe.fainted) { foe.slowT = 2.5; foe.slowF = 0.5; } }
      for (i = 0; i < 4; i++) m.cds[i] += 3;
      m.st = 0.5;
    },
    phase: function (b, side, m) {
      b.ev.push({ k: 'teleport', x: m.x, y: m.y, x2: m.x, y2: m.y, type: 'Shade' });
      special(m, {
        dur: 0.5, untarget: true,
        upd: function () { },
        end: function (b, side, f, foe) {
          var a = foe.face + PI, d = foe.r + f.r + 26;
          var tx = clamp(foe.x + Math.cos(a) * d, AR.x0 + f.r, AR.x1 - f.r), ty = clamp(foe.y + Math.sin(a) * d, AR.y0 + f.r, AR.y1 - f.r);
          f.hidden = false;
          f.x = f.px = tx; f.y = f.py = ty;
          b.ev.push({ k: 'teleport', x: tx, y: ty, x2: tx, y2: ty, type: 'Shade' });
          f.aimA = f.face = Math.atan2(foe.y - f.y, foe.x - f.x); f.aimX = foe.x; f.aimY = foe.y;
          f.cur = PHASE_STRIKE; f.curI = -1; f.state = 'wind'; f.st = f.stMax = 0.32; f.windSeq++;
        }
      });
      m.hidden = true;
    },
    relay: function (b, side, m) {
      special(m, {
        dur: 0.8, seg: -1, segT: 1, hit: false, sx: 0, sy: 0, tx: 0, ty: 0,
        upd: function (b, side, f, foe, dt) {
          var s = f.sp; s.segT += dt;
          if (s.segT >= 0.16) {
            s.segT = 0; s.seg++; s.hit = false; s.sx = f.x; s.sy = f.y;
            var a = Math.atan2(foe.y - f.y, foe.x - f.x) + (s.seg === 0 ? 0 : (s.seg % 2 ? 0.12 : -0.12));
            var d = Math.min(420, dist(f, foe) + 110);
            s.tx = clamp(f.x + Math.cos(a) * d, AR.x0 + f.r, AR.x1 - f.r); s.ty = clamp(f.y + Math.sin(a) * d, AR.y0 + f.r, AR.y1 - f.r);
            f.face = a;
            b.ev.push({ k: 'trail', x: s.sx, y: s.sy, x2: s.tx, y2: s.ty, type: 'Volt' });
          }
          var q = s.segT / 0.16;
          f.x = s.sx + (s.tx - s.sx) * q; f.y = s.sy + (s.ty - s.sy) * q;
          if (!s.hit && present(foe) && dist(f, foe) < f.r + foe.r + 16) { s.hit = true; sigHit(b, f, foe, 0.08, 'Volt'); }
        },
        end: function (b, side, f) { f.slowT = 2.5; f.slowF = 0.5; f.state = 'rec'; f.st = f.stMax = 0.5; }
      });
    },
    monsoon: function (b, side, m) {
      b.weather = { k: 'rain', side: side.idx, t: 8, acc: 0 };
      for (var i = b.zones.length - 1; i >= 0; i--) if (b.zones[i].side !== side.idx) b.zones.splice(i, 1);
      m.status = null; m.conf = 0;
      m.rootT = 1; m.st = 1;
      b.msg('Rain starts to fall!', '#8fc8ff');
    }
  };
  function bulwarkEnd(b, side, m, foe) {
    b.ev.push({ k: 'burst', x: m.x, y: m.y, r: 150, type: 'Stone' });
    b.ev.push({ k: 'shake', v: 8 });
    if (present(foe) && dist(m, foe) <= 150 + foe.r) { if (sigHit(b, m, foe, 0.30, 'Stone') > 0) knock(m, foe, 320); }
  }
  function cycloneTick(b, side, m, foe, dt) {
    m.cyclone -= dt;
    if (m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.04 * dt);
    var inside = present(foe) && dist(m, foe) < 150 + foe.r;
    if (inside && foe.bulwark <= 0) {
      var dx = foe.x - m.x, dy = foe.y - m.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      foe.kx += dx / d * 1400 * dt; foe.ky += dy / d * 1400 * dt;
    }
    m.cycTick -= dt;
    if (m.cycTick <= 0) {
      m.cycTick += 0.5;
      b.ev.push({ k: 'heal', x: m.x, y: m.y, amt: Math.round(m.maxHp * 0.02) });
      if (inside && targetable(foe)) {
        var e = G.eff('Gale', foe.d.types);
        dealDamage(b, m, foe, foe.maxHp * 0.015 * Math.sqrt(e), { eff: e, noCharge: true, type: 'Gale' });
      }
    }
    if (m.cyclone <= 0) { m.cyclone = 0; stage(b, m, 'spa', -2); }
  }

  // ---- fighter update -----------------------------------------------------
  function monSpeed(m) {
    var s = 105 + m.d.st.spe * stageMul(m.stages.spe) * 1.15;
    if (m.status === 'para') s *= 0.65; else if (m.status === 'chill') s *= 0.55;
    if (m.slowT > 0) s *= m.slowF;
    s *= m.zs;
    if (m.veil > 0) s *= 1.2;
    return s;
  }
  function moveMon(m, mx, my, speed, dt) {
    var acc = SIZE[m.d.size].acc, tvx = mx * speed, tvy = my * speed;
    var dvx = tvx - m.vx, dvy = tvy - m.vy, dl = Math.sqrt(dvx * dvx + dvy * dvy), stp = acc * dt;
    if (dl <= stp) { m.vx = tvx; m.vy = tvy; } else { m.vx += dvx / dl * stp; m.vy += dvy / dl * stp; }
    m.x += (m.vx + m.kx) * dt; m.y += (m.vy + m.ky) * dt;
    var f = Math.exp(-5 * dt); m.kx *= f; m.ky *= f;
    clampArena(m);
  }
  function walk(b, m, c, speed, dt) {
    var mx = c.mx, my = c.my, l = Math.sqrt(mx * mx + my * my);
    if (m.rootT > 0 || m.bulwark > 0) speed = 0;
    if (l > 0.01 && speed > 0) {
      mx /= l; my /= l;
      if (m.conf > 0) { var a = Math.sin(b.t * 2.3 + m.side * 2) * 1.6, ca = Math.cos(a), sa = Math.sin(a), t = mx * ca - my * sa; my = mx * sa + my * ca; mx = t; }
      m.moving = true;
    } else { mx = my = 0; }
    moveMon(m, mx, my, speed, dt);
  }
  function startWind(b, side, m, mv, i) {
    var c = side.ctrl, dx = c.ax - m.x, dy = c.ay - m.y, d = Math.sqrt(dx * dx + dy * dy);
    var a = d > 1 ? Math.atan2(dy, dx) : m.face;
    if (m.conf > 0) a += (Math.random() - 0.5) * 1.4;
    var ad = (mv.shape === 'lob' || mv.shape === 'zone') ? Math.min(d, mv.range) : d;
    m.aimA = m.face = a;
    m.aimX = clamp(m.x + Math.cos(a) * ad, AR.x0, AR.x1); m.aimY = clamp(m.y + Math.sin(a) * ad, AR.y0, AR.y1);
    m.cur = mv; m.curI = i; m.state = 'wind'; m.st = m.stMax = mv.wind / 1000; m.windSeq++;
    if (i >= 0) m.cds[i] = mv.cd;
    else { m.charge = 0; b.msg(m.d.name + ' uses ' + mv.name + '!', '#ffe27a'); }
    b.ev.push({ k: 'cast', side: side.idx, name: mv.name, type: mv.type, sig: !!mv.isSig, x: m.x, y: m.y });
  }
  function fireMove(b, side, m, foe, mv) {
    var si = side.idx, a = m.aimA, k;
    b.ev.push({ k: 'fire', side: si, mv: mv, x: m.x, y: m.y, a: a, ax: m.aimX, ay: m.aimY });
    m.state = 'rec'; m.st = m.stMax = (mv.rec || 240) / 1000;
    if (mv.isSig) { SIG[m.d.sig.id](b, side, m, foe); return; }
    if (mv.strike) { mv.strike(b, side, m, foe); return; }
    if (mv.cat === 'status') useFx(b, m, mv);
    switch (mv.shape) {
      case 'cone': if (inCone(m, foe, a, mv.range, mv.arc)) hit(b, m, foe, mv); break;
      case 'line': if (inLine(m.x, m.y, a, mv.range, mv.width, foe)) hit(b, m, foe, mv); break;
      case 'nova': if (dist(m, foe) <= mv.radius + foe.r) hit(b, m, foe, mv); break;
      case 'ring': b.pend.push({ k: 'ring', x: m.x, y: m.y, r: m.r, speed: mv.speed, maxR: mv.radius, side: si, mv: mv, src: m, done: false, type: mv.type }); break;
      case 'lob': b.pend.push({ k: 'blast', x: m.aimX, y: m.aimY, radius: mv.radius, t: mv.delay, T: mv.delay, side: si, mv: mv, src: m, type: mv.type }); break;
      case 'proj':
        var n = mv.count || 1, sp = (mv.spread || 0) * PI / 180;
        for (k = 0; k < n; k++) {
          var pa = a + (k - (n - 1) / 2) * sp;
          spawnProj(b, { x: m.x + Math.cos(pa) * m.r, y: m.y + Math.sin(pa) * m.r, vx: Math.cos(pa) * mv.speed, vy: Math.sin(pa) * mv.speed, r: mv.pr, life: mv.range / mv.speed, side: si, mv: mv, src: m, homing: mv.homing || 0, type: mv.type });
        }
        break;
      case 'zone':
        var z = { x: m.aimX, y: m.aimY, radius: mv.radius, type: mv.type };
        for (k in mv.zone) z[k] = mv.zone[k];
        addZone(b, si, z);
        break;
      case 'dash':
        m.state = 'dash'; m.st = m.stMax = 0.26; m.dashV = mv.dist / 0.26; m.dashHit = false;
        break;
    }
  }
  function tryAct(b, side, m) {
    var c = side.ctrl;
    if (c.sw >= 0) {
      var t = side.team[c.sw];
      if (c.sw === side.active || !t || t.fainted) c.sw = -1;
      else if (side.switchCd <= 0 && m.bulwark <= 0) { var idx = c.sw; c.sw = -1; b.switchTo(side.idx, idx); return true; }
    }
    if (c.sig && m.charge >= 100) { c.sig = false; startWind(b, side, m, m.d.sigMove, -1); return true; }
    if (c.dodge && m.dodgeCd <= 0 && m.bulwark <= 0 && m.rootT <= 0) {
      c.dodge = false;
      var dx = c.mx, dy = c.my, l = Math.sqrt(dx * dx + dy * dy);
      if (l < 0.01) { dx = -Math.cos(m.face); dy = -Math.sin(m.face); l = 1; }
      m.dvx = dx / l * 620; m.dvy = dy / l * 620;
      m.state = 'dodge'; m.st = m.stMax = 0.2; m.iframes = 0.27; m.dodgeCd = 1.7;
      b.ev.push({ k: 'dodge', side: side.idx, x: m.x, y: m.y });
      return true;
    }
    if (c.move >= 0 && m.cds[c.move] <= 0) { var i = c.move; c.move = -1; startWind(b, side, m, m.d.moves[i], i); return true; }
    return false;
  }

  function updMon(b, side, m, foe, dt) {
    var c = side.ctrl, i;
    m.px = m.x; m.py = m.y;
    m.zs = m.zoneSlow; m.zoneSlow = 1;
    var cdRate = m.status === 'para' ? 0.75 : 1;
    for (i = 0; i < 4; i++) if (m.cds[i] > 0) { m.cds[i] -= dt * cdRate; if (m.cds[i] < 0) m.cds[i] = 0; }
    if (m.dodgeCd > 0) m.dodgeCd -= dt;
    if (m.iframes > 0) m.iframes -= dt;
    if (m.ccImmune > 0) m.ccImmune -= dt;
    if (m.slowT > 0) m.slowT -= dt;
    if (m.rootT > 0) m.rootT -= dt;
    if (m.hitFlash > 0) m.hitFlash -= dt;
    if (m.conf > 0) { m.conf -= dt; if (m.conf <= 0) { m.conf = 0; b.msg(m.d.name + ' snapped out of it!', '#ffffff'); b.ev.push({ k: 'text', x: m.x, y: m.y, txt: 'Snapped out of it!', col: '#ffffff' }); } }
    if (m.state !== 'enter') addCharge(b, m, 0.5 * dt);
    if (m.status) {
      m.statusT -= dt;
      if (DOT[m.status]) {
        m.statusTick -= dt;
        if (m.statusTick <= 0) { m.statusTick += 1; dealDamage(b, null, m, DOT[m.status] * m.maxHp, { dot: m.status }); if (m.fainted) return; }
      }
      if (m.statusT <= 0 && m.status !== 'sleep') m.status = null;
    }
    if (m.bulwark > 0) { m.bulwark -= dt; if (m.bulwark <= 0) { m.bulwark = 0; bulwarkEnd(b, side, m, foe); } }
    if (m.cyclone > 0) cycloneTick(b, side, m, foe, dt);
    if (m.veil > 0) { m.veil -= dt; if (m.veil <= 0) { m.veil = 0; if (b.dark && b.dark.side === side.idx) b.dark = null; } }

    var wasGuard = m.guarding;
    m.guarding = false; m.moving = false;
    var speed = monSpeed(m);
    switch (m.state) {
      case 'enter':
        m.st -= dt; if (m.st <= 0) m.state = 'idle';
        break;
      case 'stun':
        m.st -= dt; moveMon(m, 0, 0, 0, dt);
        if (m.st <= 0) {
          m.state = 'idle'; m.ccImmune = 5;
          if (m.status === 'sleep') { m.status = null; b.msg(m.d.name + ' woke up!', '#ffffff'); }
        }
        break;
      case 'special':
        var sp = m.sp;
        sp.t += dt;
        sp.upd(b, side, m, foe, dt);
        if (m.fainted || m.sp !== sp) break;
        if (sp.t >= sp.dur) {
          m.sp = null; m.state = 'idle';
          if (sp.end) sp.end(b, side, m, foe);
        }
        break;
      case 'dash':
        m.x += Math.cos(m.aimA) * m.dashV * dt; m.y += Math.sin(m.aimA) * m.dashV * dt; clampArena(m);
        if (!m.dashHit && present(foe) && dist(m, foe) <= m.r + foe.r + 8) { m.dashHit = true; hit(b, m, foe, m.cur); }
        m.st -= dt;
        if (m.st <= 0 && m.state === 'dash') { m.state = 'rec'; m.st = m.stMax = 0.28; m.vx = Math.cos(m.aimA) * 120; m.vy = Math.sin(m.aimA) * 120; }
        break;
      case 'dodge':
        m.x += m.dvx * dt; m.y += m.dvy * dt; clampArena(m);
        m.st -= dt;
        if (m.st <= 0) { m.state = 'idle'; m.vx = m.dvx * 0.3; m.vy = m.dvy * 0.3; }
        break;
      case 'wind':
        walk(b, m, c, speed * 0.25, dt);
        m.st -= dt;
        if (m.st <= 0) fireMove(b, side, m, foe, m.cur);
        break;
      case 'rec':
        walk(b, m, c, speed * 0.6, dt);
        m.st -= dt;
        if (m.st <= 0) { m.state = 'idle'; m.cur = null; }
        break;
      case 'idle':
        m.face = Math.atan2(c.ay - m.y, c.ax - m.x);
        if (m.guardLock && m.guardM >= 30) m.guardLock = false;
        if (c.guard && m.guardM > 0 && !m.guardLock && m.bulwark <= 0) {
          m.guarding = true;
          m.guardT = wasGuard ? m.guardT + dt : 0;
          m.guardM -= 22 * dt; m.guardRegenT = 1.2;
          if (m.guardM <= 0) { m.guardM = 0; m.guardLock = true; }
          walk(b, m, c, speed * 0.4, dt);
        } else {
          if (!tryAct(b, side, m)) walk(b, m, c, speed, dt);
        }
        break;
    }
    if (!m.guarding) {
      if (m.guardRegenT > 0) m.guardRegenT -= dt;
      else if (m.guardM < 100) m.guardM = Math.min(100, m.guardM + 30 * dt);
    }
  }

  function updSide(b, side, dt) {
    var c = side.ctrl, m = side.team[side.active], o = b.sides[1 - side.idx], foe = o.team[o.active];
    if (side.switchCd > 0) side.switchCd -= dt;
    if (c.moveT > 0) { c.moveT -= dt; if (c.moveT <= 0) c.move = -1; }
    if (c.dodgeT > 0) { c.dodgeT -= dt; if (c.dodgeT <= 0) c.dodge = false; }
    if (c.sigT > 0) { c.sigT -= dt; if (c.sigT <= 0) c.sig = false; }
    if (m.state === 'faint') {
      m.st -= dt;
      if (m.st <= 0) {
        var next = -1, i;
        if (c.sw >= 0 && side.team[c.sw] && !side.team[c.sw].fainted) next = c.sw;
        else for (i = 0; i < side.team.length; i++) if (!side.team[i].fainted) { next = i; break; }
        c.sw = -1;
        if (next < 0) b.end(1 - side.idx);
        else { m.state = 'bench'; b.sendOut(side.idx, next); }
      }
      return;
    }
    if (c.swT > 0) { c.swT -= dt; if (c.swT <= 0) c.sw = -1; }
    updMon(b, side, m, foe, dt);
  }

  function separate(b) {
    var a = b.active(0), c = b.active(1);
    if (!present(a) || !present(c)) return;
    if (a.state === 'special' || c.state === 'special' || a.state === 'dash' || c.state === 'dash' || a.state === 'dodge' || c.state === 'dodge') return;
    var dx = c.x - a.x, dy = c.y - a.y, d = Math.sqrt(dx * dx + dy * dy), min = (a.r + c.r) * 0.8;
    if (d >= min) return;
    if (d < 0.01) { dx = 1; dy = 0; d = 1; }
    var push = (min - d) / 2, nx = dx / d, ny = dy / d;
    if (a.bulwark <= 0) { a.x -= nx * push; a.y -= ny * push; clampArena(a); }
    if (c.bulwark <= 0) { c.x += nx * push; c.y += ny * push; clampArena(c); }
  }

  function updProj(b, dt) {
    var P = b.proj, i = P.length, p, foe, dx, dy, d, sp;
    while (i--) {
      p = P[i]; p.px = p.x; p.py = p.y; p.age += dt;
      foe = b.active(1 - p.side);
      if (p.frozen > 0) {
        p.frozen -= dt;
        if (p.frozen <= 0) {
          p.side = p.flipTo; p.src = p.flipSrc; p.passed = false; p.aiRoll = false;
          foe = b.active(1 - p.side);
          sp = Math.max(380, Math.sqrt(p.vx * p.vx + p.vy * p.vy));
          dx = foe.x - p.x; dy = foe.y - p.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
          p.vx = dx / d * sp; p.vy = dy / d * sp; p.homing = 5; p.life = 2.2;
        }
        continue;
      }
      if (p.homing > 0 && present(foe) && foe.veil <= 0 && !foe.hidden) {
        sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        var ca = Math.atan2(p.vy, p.vx), df = angDiff(Math.atan2(foe.y - p.y, foe.x - p.x), ca), mx = p.homing * dt;
        if (df > mx) df = mx; else if (df < -mx) df = -mx;
        ca += df; p.vx = Math.cos(ca) * sp; p.vy = Math.sin(ca) * sp;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0 || p.x < AR.x0 - 20 || p.x > AR.x1 + 20 || p.y < AR.y0 - 20 || p.y > AR.y1 + 20) {
        b.ev.push({ k: 'pop', x: p.x, y: p.y, type: p.type, n: 4 });
        P[i] = P[P.length - 1]; P.pop(); continue;
      }
      if (!present(foe)) continue;
      dx = foe.x - p.x; dy = foe.y - p.y; d = Math.sqrt(dx * dx + dy * dy);
      if (foe.cyclone > 0 && d < 150) {
        b.ev.push({ k: 'pop', x: p.x, y: p.y, type: 'Gale', n: 8 });
        P[i] = P[P.length - 1]; P.pop(); continue;
      }
      if (d <= p.r + foe.r && !p.passed) {
        if (!targetable(foe)) { p.passed = true; b.ev.push({ k: 'miss', x: foe.x, y: foe.y }); continue; }
        if (foe.bulwark > 0) {
          p.side = 1 - p.side; p.vx = -p.vx; p.vy = -p.vy; p.src = foe; p.homing = 0; p.aiRoll = false;
          if (p.life < 1.2) p.life = 1.2;
          b.ev.push({ k: 'guard', x: foe.x, y: foe.y, perfect: true });
          continue;
        }
        if (p.decoy) { if (sigHit(b, p.src, foe, p.pct, p.type) > 0 && Math.random() < 0.3 && !foe.guarding) tryStatus(b, foe, 'para'); }
        else hit(b, p.src, foe, p.mv);
        b.ev.push({ k: 'pop', x: p.x, y: p.y, type: p.type, n: p.decoy ? 16 : 8 });
        P[i] = P[P.length - 1]; P.pop();
      }
    }
  }

  function updPend(b, dt) {
    var Q = b.pend, i = Q.length, p, foe, d;
    while (i--) {
      p = Q[i]; foe = b.active(1 - p.side);
      if (p.k === 'ring') {
        p.r += p.speed * dt;
        if (!p.done && present(foe)) {
          d = dist(p, foe);
          if (d - foe.r <= p.r && d + foe.r >= p.r - 34) {
            p.done = true;
            hit(b, p.src, foe, p.mv);
          }
        }
        if (p.r >= p.maxR) { Q[i] = Q[Q.length - 1]; Q.pop(); }
      } else {
        p.t -= dt;
        if (p.t <= 0) {
          b.ev.push({ k: 'burst', x: p.x, y: p.y, r: p.radius, type: p.type });
          if (present(foe) && dist(p, foe) <= p.radius + foe.r * 0.5) hit(b, p.src, foe, p.mv);
          Q[i] = Q[Q.length - 1]; Q.pop();
        }
      }
    }
  }

  function updZones(b, dt) {
    var Z = b.zones, i = Z.length, z, foe, own;
    while (i--) {
      z = Z[i]; z.t += dt;
      if (z.t >= z.dur) { Z.splice(i, 1); continue; }
      foe = b.active(1 - z.side);
      if (!present(foe) || (foe.state === 'special' && foe.sp && foe.sp.untarget)) continue;
      if (dist(z, foe) > z.radius + foe.r * 0.3) continue;
      if (z.slow && z.slow < foe.zoneSlow) foe.zoneSlow = z.slow;
      z.tickT -= dt;
      if (z.tickT <= 0) {
        z.tickT += 0.5;
        own = b.active(z.side);
        if (z.pct) dealDamage(b, own, foe, foe.maxHp * z.pct, { dot: 'zone', type: z.type, noCharge: true });
        if (foe.fainted) continue;
        if (z.status && Math.random() < z.statusCh) tryStatus(b, foe, z.status);
        if (z.healOwner && present(own)) heal(b, own, own.maxHp * z.healOwner);
      }
    }
  }

  BP.step = function (dt) {
    var b = this, si, m;
    if (b.over) return;
    b.t += dt;
    if (b.intro > 0) { b.intro -= dt; if (b.intro <= 0) b.ev.push({ k: 'go' }); return; }
    b.timeLeft -= dt;
    if (b.timeLeft <= 0) {
      b.timeLeft = 0;
      var a = b.hpFrac(0), c = b.hpFrac(1);
      b.msg('Time is up!', '#ffe27a');
      b.end(Math.abs(a - c) < 0.001 ? 2 : (a > c ? 0 : 1));
      return;
    }
    if (b.weather) {
      var w = b.weather; w.t -= dt;
      m = b.active(w.side);
      if (present(m) && m.hp < m.maxHp) {
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.03 * dt);
        w.acc += dt;
        if (w.acc >= 1) { w.acc -= 1; b.ev.push({ k: 'heal', x: m.x, y: m.y, amt: Math.round(m.maxHp * 0.03) }); }
      }
      if (w.t <= 0) { b.weather = null; b.msg('The rain stopped.', '#8fc8ff'); }
    }
    if (b.dark) { b.dark.t -= dt; if (b.dark.t <= 0) b.dark = null; }
    for (si = 0; si < 2; si++) if (b.sides[si].isAI && G.aiThink) G.aiThink(b, b.sides[si], dt);
    for (si = 0; si < 2; si++) { updSide(b, b.sides[si], dt); if (b.over) return; }
    separate(b);
    updProj(b, dt);
    updPend(b, dt);
    updZones(b, dt);
  };
})(typeof window !== 'undefined' ? window : globalThis);
