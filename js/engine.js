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
      ultT: 0, bulHits: 0, dashHit: false, dashV: 0, dvx: 0, dvy: 0, hitFlash: 0, moving: false, dealt: 0, taken: 0, kos: 0, healUses: 0
    };
  }
  function resetVolatile(m) {
    for (var i = 0; i < 5; i++) m.stages[STATS[i]] = 0;
    m.conf = 0; m.bulwark = 0; m.cyclone = 0; m.veil = 0; m.veilHit = false; m.hidden = false; m.sp = null; m.cur = null;
    m.guarding = false; m.slowT = 0; m.rootT = 0; m.kx = m.ky = m.vx = m.vy = 0; m.z = 0; m.iframes = 0; m.zoneSlow = m.zs = 1; m.ultT = 0; m.bulHits = 0;
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
      if (tgt.bulwark > 0) { dmg *= 0.3; temper(b, tgt); }
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
        case 'root': if (!guarded && tgt.bulwark <= 0 && Math.random() < f.ch) { tgt.rootT = Math.max(tgt.rootT, f.t); b.ev.push({ k: 'text', x: tgt.x, y: tgt.y, txt: 'Rooted!', col: '#d8c8ff' }); } break;
        case 'stun': if (!guarded && tgt.ccImmune <= 0 && Math.random() < f.ch && setStun(tgt, f.t)) b.ev.push({ k: 'text', x: tgt.x, y: tgt.y, txt: 'Stunned!', col: '#fff27a' }); break;
        case 'slow': if (!guarded && Math.random() < f.ch) { tgt.slowT = Math.max(tgt.slowT, f.t); tgt.slowF = f.f; b.ev.push({ k: 'text', x: tgt.x, y: tgt.y, txt: 'Slowed!', col: '#f0a8d8' }); } break;
        case 'sap': if (!guarded && dmg > 0 && tgt.charge > 0) { var sp = Math.min(f.n, tgt.charge); tgt.charge -= sp; addCharge(b, src, sp); b.ev.push({ k: 'text', x: tgt.x, y: tgt.y, txt: 'Power drained!', col: '#c9b8ff' }); } break;
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
    if (tgt.bulwark > 0) { dmg *= 0.3; temper(b, tgt); }
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
  // SIG[id](b, side, m, foe) runs when the wind-up of a signature power ends. Each Beast has one id (sig.id in js/data.js).
  // To add a Beast: add SIG.<id> here, its effect in js/gfx/ults.js and its rule for the AI in sigOK (js/ai.js).
  var SIG = {};

  // ---- signature powers of the 20 Beasts (the stories are in LORE.md) -----------
  // Each one sends 'ult' events: { k: 'ult', id, ph, side, x, y, ... }. The renderer has an effect sequence for each id and phase.
  function ult(b, id, ph, m, o) {
    var e = { k: 'ult', id: id, ph: ph, side: m.side, x: m.x, y: m.y }, k;
    if (o) for (k in o) e[k] = o[k];
    b.ev.push(e);
  }
  function stunTxt(b, foe, t, txt) {
    if (foe.fainted || foe.ccImmune > 0 || !setStun(foe, t)) return false;
    b.ev.push({ k: 'text', x: foe.x, y: foe.y, txt: txt || 'Stunned!', col: '#fff27a' });
    return true;
  }
  // Forgeshell: each blow that the anvil shell takes makes the last burst stronger.
  function temper(b, m) {
    if (m.d.sig.id !== 'masterwork') return;
    m.bulHits = Math.min(6, (m.bulHits || 0) + 1);
    ult(b, 'masterwork', 'temper', m, { n: m.bulHits });
  }

  // Glazefang: the shell breaks. A burst, 10 shards that fly to the walls, and molten glass on the floor.
  var SHARD = { name: 'Porcelain Shard', type: 'Stone', cat: 'phys', power: 30, fx: [], shape: 'proj' };
  SIG.shatter = function (b, side, m, foe) {
    var i, a;
    b.ev.push({ k: 'shake', v: 13 }); ult(b, 'shatter', 'hit', m, { r: 200 });
    if (present(foe) && dist(m, foe) <= 200 + foe.r) { if (sigHit(b, m, foe, 0.25, 'Ember') > 0 && !foe.guarding) tryStatus(b, foe, 'burn'); }
    for (i = 0; i < 10; i++) {
      a = i / 10 * TAU + 0.31;
      spawnProj(b, { x: m.x + Math.cos(a) * 60, y: m.y + Math.sin(a) * 60, vx: Math.cos(a) * 440, vy: Math.sin(a) * 440, r: 10, life: 1.3, side: side.idx, mv: SHARD, src: m, homing: 0, type: 'Stone' });
    }
    addZone(b, side.idx, { x: m.x, y: m.y, radius: 200, dur: 5, kind: 'lava', pct: 0.012, status: 'burn', statusCh: 0.4, type: 'Ember' });
    stage(b, m, 'spe', -2);
    m.st = 0.7; m.ultT = 5;
  };

  // Mantick: the bell stops time, then 2 cuts from 2 sides.
  SIG.twelfth = function (b, side, m, foe) {
    b.ev.push({ k: 'shake', v: 8 }); ult(b, 'twelfth', 'chime', m, { r: 210 });
    if (present(foe) && dist(m, foe) <= 210 + foe.r) { if (sigHit(b, m, foe, 0.10, 'Iron') > 0) stunTxt(b, foe, 1.3, 'Time stopped!'); }
    special(m, {
      dur: 0.82, n: 0, untarget: true,
      upd: function (b, side, f, foe) {
        var s = f.sp, a, ox, oy, d;
        if (s.n >= 2 || s.t < 0.22 + s.n * 0.3) return;
        s.n++;
        if (!present(foe) || dist(f, foe) > 380) return;
        a = Math.atan2(foe.y - f.y, foe.x - f.x) + (s.n === 1 ? 0.5 : -0.5); d = foe.r + f.r + 30;
        ox = f.x; oy = f.y;
        f.x = clamp(foe.x + Math.cos(a) * d, AR.x0 + f.r, AR.x1 - f.r); f.y = clamp(foe.y + Math.sin(a) * d, AR.y0 + f.r, AR.y1 - f.r);
        f.face = f.aimA = Math.atan2(foe.y - f.y, foe.x - f.x);
        ult(b, 'twelfth', 'cut', f, { x2: ox, y2: oy, n: s.n });
        sigHit(b, f, foe, 0.10, 'Iron');
      },
      end: function (b, side, f, foe) { if (present(foe)) knock(f, foe, 300); stage(b, f, 'spe', -1); f.state = 'rec'; f.st = f.stMax = 0.35; }
    });
  };

  // Argantler: a wave of quicksilver crosses the arena, carries the opponent with it and sets into spikes.
  SIG.chrometide = function (b, side, m) {
    var a = m.aimA, ca = Math.cos(a), sa = Math.sin(a), zoned = false;
    b.ev.push({ k: 'shake', v: 8 }); ult(b, 'chrometide', 'wave', m, { a: a, len: 610, dur: 0.85, v: 720 });
    special(m, {
      dur: 0.85, front: 0, hit: false,
      upd: function (b, side, f, foe, dt) {
        var s = f.sp, al, lat, d;
        s.front += 720 * dt;
        if (s.hit || !present(foe)) return;
        al = (foe.x - f.x) * ca + (foe.y - f.y) * sa; lat = Math.abs(-(foe.x - f.x) * sa + (foe.y - f.y) * ca);
        if (al < -foe.r || al > s.front + foe.r || al < s.front - 120 || lat > 100 + foe.r) return;
        s.hit = true;
        d = sigHit(b, f, foe, 0.30, 'Iron');
        if (d < 0) return;
        if (!foe.fainted && foe.bulwark <= 0) { foe.kx += ca * 520; foe.ky += sa * 520; }
        zoned = true;
        ult(b, 'chrometide', 'crash', foe);
        addZone(b, side.idx, { x: foe.x + ca * 80, y: foe.y + sa * 80, radius: 140, dur: 5, kind: 'chrome', pct: 0.02, type: 'Iron' });
      },
      end: function (b, side, f) {
        if (!zoned) addZone(b, side.idx, { x: f.x + ca * 420, y: f.y + sa * 420, radius: 140, dur: 5, kind: 'chrome', pct: 0.02, type: 'Iron' });
        stage(b, f, 'def', -1); f.state = 'rec'; f.st = f.stMax = 0.3;
      }
    });
  };

  // Brasswail: 3 movements in one lane. Each is wider and stronger. Each one that hits heals Brasswail.
  SIG.symphony = function (b, side, m) {
    var a = m.aimA, W = [70, 115, 165], P = [0.08, 0.10, 0.15];
    special(m, {
      dur: 1.0, n: 0,
      upd: function (b, side, f, foe) {
        var s = f.sp, d;
        if (s.n >= 3 || s.t < s.n * 0.36) return;
        b.ev.push({ k: 'shake', v: 6 + s.n * 3 }); ult(b, 'symphony', 'pulse', f, { a: a, n: s.n, w: W[s.n], len: 700 });
        d = present(foe) && inLine(f.x, f.y, a, 700, W[s.n], foe) ? sigHit(b, f, foe, P[s.n], 'Gale') : -1;
        if (d > 0) { heal(b, f, f.maxHp * 0.03); if (s.n === 2 && !foe.fainted) { knock(f, foe, 420); confuse(b, foe, 3); } }
        s.n++;
      },
      end: function (b, side, f) { f.state = 'rec'; f.st = f.stMax = 0.4; }
    });
  };

  // Noonshell: the sky turns over. Opponent shots turn round. The opponent falls upward, then the ground comes back.
  SIG.zenith = function (b, side, m, foe) {
    var i, p;
    for (i = 0; i < b.proj.length; i++) { p = b.proj[i]; if (p.side !== side.idx) { p.frozen = 0.8; p.flipTo = side.idx; p.flipSrc = m; } }
    b.ev.push({ k: 'shake', v: 6 }); ult(b, 'zenith', 'invert', m, { r: 220 });
    if (present(foe) && targetable(foe) && dist(m, foe) <= 220 + foe.r) {
      if (foe.bulwark > 0 || foe.guarding || foe.state === 'special') { if (sigHit(b, m, foe, 0.24, 'Mind') > 0 && !foe.fainted) { foe.slowT = 2.5; foe.slowF = 0.5; } }
      else {
        ult(b, 'zenith', 'lift', foe);
        special(foe, {
          dur: 0.85, pulled: true,
          upd: function (b, side, f) { var q = Math.min(1, f.sp.t / 0.85); f.z = Math.pow(Math.sin(q * PI), 0.6) * 130; },
          end: function (b, side, f) {
            f.z = 0;
            b.ev.push({ k: 'shake', v: 12 }); ult(b, 'zenith', 'slam', f, { r: 120 });
            if (sigHit(b, m, f, 0.28, 'Mind') > 0 && !f.fainted) { f.slowT = 2.5; f.slowF = 0.5; }
          }
        });
      }
    }
    for (i = 0; i < 4; i++) m.cds[i] += 3;
    m.st = 0.5;
  };

  // Coilbell: lightning falls 4 times where the opponent goes. The floor below Coilbell stays live.
  function boltAt(b, si, m, foe, chain) {
    var ok = present(foe) && foe.veil <= 0 && !foe.hidden;
    var x = ok ? foe.x + foe.vx * 0.22 : m.aimX, y = ok ? foe.y + foe.vy * 0.22 : m.aimY;
    b.pend.push({ k: 'blast', x: clamp(x, AR.x0, AR.x1), y: clamp(y, AR.y0, AR.y1), radius: 76, t: 0.44, T: 0.44, side: si, src: m, type: 'Volt', pct: 0.11, status: 'para', statusCh: 0.35, ult: 'brainstorm', chain: chain - 1 });
  }
  SIG.brainstorm = function (b, side, m, foe) {
    b.ev.push({ k: 'shake', v: 8 }); ult(b, 'brainstorm', 'start', m, { r: 170 });
    addZone(b, side.idx, { x: m.x, y: m.y, radius: 170, dur: 3.5, kind: 'volt', pct: 0.025, slow: 0.75, type: 'Volt' });
    boltAt(b, side.idx, m, foe, 4);
    selfDamage(b, m, m.maxHp * 0.08);
    m.st = 0.4; m.ultT = 2;
  };

  // Pleatheron: a whirlwind of metal sheets for 5 seconds. It heals, pushes the opponent and stops shots.
  SIG.thousandfolds = function (b, side, m, foe) {
    m.cyclone = 5; m.cycTick = 0.5; m.status = null; m.conf = 0; m.st = 0.2;
    ult(b, 'thousandfolds', 'open', m, { r: 150 });
    if (present(foe) && dist(m, foe) <= 150 + foe.r) { if (sigHit(b, m, foe, 0.08, 'Gale') > 0) knock(m, foe, 260); }
  };

  // Basaltback: 5 blows on the ground. Each one reaches farther. The last one brings up the basalt.
  SIG.faultline = function (b, side, m) {
    var R = [110, 135, 160, 185, 210];
    special(m, {
      dur: 5 * 0.26 + 0.15, n: 0, acc: 0.26,
      upd: function (b, side, f, foe, dt) {
        var s = f.sp, r;
        s.acc += dt;
        if (s.acc < 0.26 || s.n >= 5) return;
        s.acc = 0; r = R[s.n]; s.n++;
        b.ev.push({ k: 'shake', v: 7 + s.n * 1.5 }); ult(b, 'faultline', 'pound', f, { r: r, n: s.n });
        if (present(foe) && dist(f, foe) <= r + foe.r) { if (sigHit(b, f, foe, 0.068, 'Stone') > 0 && s.n === 5) knock(f, foe, 300); }
        if (s.n === 5) addZone(b, side.idx, { x: f.x, y: f.y, radius: 210, dur: 3, kind: 'basalt', pct: 0.015, slow: 0.8, type: 'Stone' });
      },
      end: function (b, side, f) { stage(b, f, 'spe', -1); f.state = 'rec'; f.st = f.stMax = 0.6; }
    });
  };

  // Gloomlure: all lights go out except the lantern. The opponent is pulled to the light.
  SIG.lighthouse = function (b, side, m, foe) {
    m.veil = 6; m.veilHit = false;
    b.dark = { side: side.idx, t: 6 };
    ult(b, 'lighthouse', 'dark', m);
    if (present(foe) && foe.bulwark <= 0 && dist(m, foe) < 460) { knock(m, foe, -340); b.ev.push({ k: 'text', x: foe.x, y: foe.y, txt: 'Lured!', col: '#9fe8d8' }); }
    stage(b, m, 'def', -2);
    m.st = 0.2;
  };

  // Pangyre: a saw blade that cuts through the opponent 5 times. The last cut is the deepest.
  SIG.sawblade = function (b, side, m) {
    special(m, {
      dur: 0.8, seg: -1, segT: 1, hit: false, sx: 0, sy: 0, tx: 0, ty: 0,
      upd: function (b, side, f, foe, dt) {
        var s = f.sp, a, d;
        s.segT += dt;
        if (s.segT >= 0.16) {
          s.segT = 0; s.seg++; s.hit = false; s.sx = f.x; s.sy = f.y;
          a = Math.atan2(foe.y - f.y, foe.x - f.x) + (s.seg === 0 ? 0 : (s.seg % 2 ? 0.12 : -0.12));
          d = Math.min(420, dist(f, foe) + 110);
          s.tx = clamp(f.x + Math.cos(a) * d, AR.x0 + f.r, AR.x1 - f.r); s.ty = clamp(f.y + Math.sin(a) * d, AR.y0 + f.r, AR.y1 - f.r);
          f.face = a;
          ult(b, 'sawblade', 'cut', f, { x2: s.tx, y2: s.ty, n: s.seg });
        }
        d = s.segT / 0.16;
        f.x = s.sx + (s.tx - s.sx) * d; f.y = s.sy + (s.ty - s.sy) * d;
        if (!s.hit && present(foe) && dist(f, foe) < f.r + foe.r + 16) { s.hit = true; sigHit(b, f, foe, s.seg >= 4 ? 0.11 : 0.075, 'Iron'); }
      },
      end: function (b, side, f) { f.slowT = 2.5; f.slowF = 0.5; f.state = 'rec'; f.st = f.stMax = 0.5; }
    });
  };

  // Seamsting: it sews the floor. The opponent in the area is stitched in position, and the thread drains it.
  SIG.tapestry = function (b, side, m, foe) {
    var x = m.aimX, y = m.aimY;
    b.ev.push({ k: 'shake', v: 6 }); ult(b, 'tapestry', 'stitch', m, { x2: x, y2: y, r: 170 });
    addZone(b, side.idx, { x: x, y: y, radius: 170, dur: 6, kind: 'thread', pct: 0.02, slow: 0.5, healOwner: 0.012, type: 'Venom' });
    if (present(foe) && distP(x, y, foe) <= 170 + foe.r) {
      if (sigHit(b, m, foe, 0.14, 'Venom') > 0 && !foe.fainted && !foe.guarding && foe.bulwark <= 0) {
        foe.rootT = Math.max(foe.rootT, 1.6);
        b.ev.push({ k: 'text', x: foe.x, y: foe.y, txt: 'Stitched!', col: '#e8c8ff' });
      }
    }
    stage(b, m, 'def', -1);
    m.rootT = 0.6; m.st = 0.6;
  };

  // Spectrail: 7 colours go to one point. 3 hits: the last one is the white pillar.
  SIG.spectrum = function (b, side, m) {
    var x = m.aimX, y = m.aimY, P = [0.10, 0.10, 0.17], T = [0.2, 0.5, 0.85];
    ult(b, 'spectrum', 'converge', m, { x2: x, y2: y, r: 120, dur: 0.9 });
    special(m, {
      dur: 0.95, n: 0,
      upd: function (b, side, f, foe) {
        var s = f.sp, d;
        if (s.n >= 3 || s.t < T[s.n]) return;
        b.ev.push({ k: 'shake', v: 5 + s.n * 4 }); ult(b, 'spectrum', 'tick', f, { x2: x, y2: y, r: 120, n: s.n });
        d = present(foe) && distP(x, y, foe) <= 120 + foe.r ? sigHit(b, f, foe, P[s.n], 'Mind') : -1;
        if (d > 0 && s.n === 2 && !foe.fainted && !foe.guarding) tryStatus(b, foe, 'burn');
        s.n++;
      },
      end: function (b, side, f) { for (var i = 0; i < 4; i++) f.cds[i] += 2; f.state = 'rec'; f.st = f.stMax = 0.3; }
    });
  };

  // Smolderasp: a poison haze and 2 serpents of smoke that hunt the opponent.
  SIG.threeserpents = function (b, side, m, foe) {
    var k, pa = present(foe) ? Math.atan2(foe.y - m.y, foe.x - m.x) : m.aimA;
    b.ev.push({ k: 'shake', v: 7 }); ult(b, 'threeserpents', 'haze', m, { r: 200 });
    if (present(foe) && dist(m, foe) <= 200 + foe.r) { if (sigHit(b, m, foe, 0.14, 'Venom') > 0 && !foe.fainted) confuse(b, foe, 2.5); }
    addZone(b, side.idx, { x: m.x, y: m.y, radius: 200, dur: 5, kind: 'smoke', pct: 0.02, slow: 0.7, status: 'poison', statusCh: 0.5, type: 'Venom' });
    for (k = -1; k <= 1; k += 2) {
      spawnProj(b, {
        x: m.x + Math.cos(pa + k * 1.57) * 34, y: m.y + Math.sin(pa + k * 1.57) * 34, vx: Math.cos(pa + k * 1.0) * 290, vy: Math.sin(pa + k * 1.0) * 290,
        r: 16, life: 3, side: side.idx, mv: null, src: m, homing: 3.4, type: 'Venom', decoy: true, pct: 0.09, st: 'poison', stCh: 0.6, sprite: m.id
      });
    }
    stage(b, m, 'def', -1);
    m.iframes = 0.5; m.st = 0.5;
  };

  // Forgeshell: the anvil shell takes blows for 5 seconds (see temper), then gives them back.
  SIG.masterwork = function (b, side, m) { m.bulwark = 5; m.bulHits = 0; m.st = 0.2; ult(b, 'masterwork', 'start', m); };
  function bulwarkEnd(b, side, m, foe) {
    var n = m.bulHits || 0, r = 150 + n * 10;
    m.bulHits = 0;
    b.ev.push({ k: 'shake', v: 9 + n });
    ult(b, 'masterwork', 'quench', m, { r: r, n: n });
    if (present(foe) && dist(m, foe) <= r + foe.r) { if (sigHit(b, m, foe, 0.24 + n * 0.025, m.d.sig.type) > 0) knock(m, foe, 320 + n * 30); }
  }

  // Lodetalon: 4 beams mark a point. It goes up out of reach and falls on that point.
  SIG.truenorth = function (b, side, m) {
    var sx = m.x, sy = m.y, tx = m.aimX, ty = m.aimY;
    ult(b, 'truenorth', 'mark', m, { x2: tx, y2: ty, r: 110, dur: 0.8 });
    special(m, {
      dur: 0.8, untarget: true,
      upd: function (b, side, f) {
        var q = Math.min(1, f.sp.t / 0.8), e = q < 0.55 ? 0 : (q - 0.55) / 0.45;
        e = e * e;
        f.x = sx + (tx - sx) * e; f.y = sy + (ty - sy) * e;
        f.z = q < 0.55 ? Math.sin(q / 0.55 * PI / 2) * 170 : 170 * (1 - e);
      },
      end: function (b, side, f, foe) {
        f.z = 0; clampArena(f);
        b.ev.push({ k: 'shake', v: 13 }); ult(b, 'truenorth', 'dive', f, { r: 110 });
        if (present(foe) && dist(f, foe) <= 110 + foe.r) { if (sigHit(b, f, foe, 0.32, 'Volt') > 0) stunTxt(b, foe, 1.0); }
        selfDamage(b, f, f.maxHp * 0.08);
        f.state = 'rec'; f.st = f.stMax = 0.5;
      }
    });
  };

  // Atollem: a reef grows round the target and holds it. Atollem heals while the opponent stands in the reef.
  SIG.atoll = function (b, side, m, foe) {
    var x = m.aimX, y = m.aimY;
    b.ev.push({ k: 'shake', v: 9 }); ult(b, 'atoll', 'reef', m, { x2: x, y2: y, r: 160 });
    if (present(foe) && distP(x, y, foe) <= 160 + foe.r) {
      if (sigHit(b, m, foe, 0.24, 'Bloom') > 0 && !foe.fainted && !foe.guarding && foe.bulwark <= 0) {
        foe.rootT = Math.max(foe.rootT, 1.3);
        b.ev.push({ k: 'text', x: foe.x, y: foe.y, txt: 'Held by the reef!', col: '#ffd0e6' });
      }
    }
    addZone(b, side.idx, { x: x, y: y, radius: 160, dur: 6, kind: 'reef', pct: 0.022, slow: 0.6, healOwner: 0.012, type: 'Bloom' });
    stage(b, m, 'spe', -1);
    m.st = 0.8;
  };

  // Bellowcroak: the blast throws the opponent away and throws Bellowcroak the other way. Steam stays.
  SIG.overpressure = function (b, side, m, foe) {
    var d, dx, dy, l;
    b.ev.push({ k: 'shake', v: 15 }); ult(b, 'overpressure', 'boom', m, { r: 220 });
    d = present(foe) && dist(m, foe) <= 220 + foe.r ? sigHit(b, m, foe, 0.36, 'Gale') : -1;
    if (d > 0 && !foe.fainted) { if (!foe.guarding) tryStatus(b, foe, 'burn'); knock(m, foe, 520); }
    dx = m.x - foe.x; dy = m.y - foe.y; l = Math.sqrt(dx * dx + dy * dy) || 1;
    m.kx += dx / l * 460; m.ky += dy / l * 460;
    addZone(b, side.idx, { x: m.x, y: m.y, radius: 190, dur: 3, kind: 'steam', slow: 0.7, type: 'Gale' });
    selfDamage(b, m, m.maxHp * 0.1);
    m.st = 0.7;
  };

  // Shutterscale: the flash holds the opponent in the frame. One second later the plate develops and burns.
  SIG.freezeframe = function (b, side, m, foe) {
    var x = m.aimX, y = m.aimY, i;
    b.ev.push({ k: 'shake', v: 6 }); ult(b, 'freezeframe', 'flash', m, { x2: x, y2: y, r: 150 });
    if (present(foe) && distP(x, y, foe) <= 150 + foe.r) { if (sigHit(b, m, foe, 0.17, 'Mind') > 0) stunTxt(b, foe, 1.2, 'Caught in the frame!'); }
    b.pend.push({ k: 'blast', x: x, y: y, radius: 150, t: 1.0, T: 1.0, side: side.idx, src: m, type: 'Mind', pct: 0.17, status: 'burn', statusCh: 1, ult: 'freezeframe', chain: 0 });
    for (i = 0; i < 4; i++) m.cds[i] += 2;
    m.st = 0.6;
  };

  // Chronovesp: it takes time from the opponent and gives it to itself.
  SIG.stolenhour = function (b, side, m, foe) {
    var i, got = false;
    b.ev.push({ k: 'shake', v: 7 });
    if (present(foe) && dist(m, foe) <= 200 + foe.r) {
      if (sigHit(b, m, foe, 0.18, 'Shade') > 0 && !foe.fainted) {
        got = true;
        foe.slowT = 4; foe.slowF = 0.4;
        for (i = 0; i < 4; i++) foe.cds[i] += 2.5;
        b.ev.push({ k: 'text', x: foe.x, y: foe.y, txt: 'Time stolen!', col: '#f0a8ff' });
      }
    }
    ult(b, 'stolenhour', 'steal', m, { r: 200, x2: foe.x, y2: foe.y, n: got ? 1 : 0 });
    for (i = 0; i < 4; i++) m.cds[i] = 0;
    m.dodgeCd = 0;
    addZone(b, side.idx, { x: m.x, y: m.y, radius: 200, dur: 5, kind: 'gravity', pct: 0.015, slow: 0.5, type: 'Shade' });
    stage(b, m, 'def', -1);
    m.st = 0.4; m.ultT = 4;
  };

  // Lustrewing: 6 beams of fire and ice turn round it for 1.8 seconds.
  SIG.lastwaltz = function (b, side, m) {
    var a0 = m.aimA, W = 1.5, hits = 0;
    ult(b, 'lastwaltz', 'spin', m, { a: a0, w: W, dur: 1.8, len: 250 });
    special(m, {
      dur: 1.8, cd: 0.15,
      upd: function (b, side, f, foe, dt) {
        var s = f.sp, k;
        s.cd -= dt;
        if (s.cd > 0 || !present(foe)) return;
        for (k = 0; k < 6; k++) {
          if (!inLine(f.x, f.y, a0 + s.t * W + k * PI / 3, 250, 34, foe)) continue;
          s.cd = 0.42;
          if (sigHit(b, f, foe, 0.095, k % 2 ? 'Frost' : 'Ember') > 0 && hits++ === 0 && !foe.fainted && !foe.guarding) tryStatus(b, foe, 'burn');
          break;
        }
      },
      end: function (b, side, f) { stage(b, f, 'spa', -2); f.state = 'rec'; f.st = f.stMax = 0.4; }
    });
  };
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
    if (m.ultT > 0) m.ultT -= dt;
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
          temper(b, foe);
          continue;
        }
        if (p.decoy) { if (sigHit(b, p.src, foe, p.pct, p.type) > 0 && Math.random() < (p.stCh || 0.3) && !foe.guarding) tryStatus(b, foe, p.st || 'para'); }
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
          if (p.ult) b.ev.push({ k: 'ult', id: p.ult, ph: 'strike', side: p.side, x: p.x, y: p.y, r: p.radius, n: p.chain || 0 });
          else b.ev.push({ k: 'burst', x: p.x, y: p.y, r: p.radius, type: p.type });
          if (present(foe) && dist(p, foe) <= p.radius + foe.r * 0.5) {
            // a blast of a signature power does a share of maximum HP
            if (p.pct) { if (sigHit(b, p.src, foe, p.pct, p.type) > 0 && p.status && !foe.guarding && Math.random() < (p.statusCh || 1)) tryStatus(b, foe, p.status); }
            else hit(b, p.src, foe, p.mv);
          }
          Q[i] = Q[Q.length - 1]; Q.pop();
          if (p.chain > 0 && !p.src.fainted) boltAt(b, p.side, p.src, b.active(1 - p.side), p.chain);
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
