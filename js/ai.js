/* Arena Beasts - opponent AI. It writes to side.ctrl only, the same interface as the player. */
(function (root) {
  'use strict';
  var G = root.G, AR = G.ARENA;

  G.DIFF = {
    easy: { think: 0.32, err: 0.36, dodge: 0.18, gap: 0.95, lead: 0.2, sw: 0 },
    normal: { think: 0.2, err: 0.19, dodge: 0.48, gap: 0.42, lead: 0.6, sw: 0.3 },
    hard: { think: 0.1, err: 0.07, dodge: 0.8, gap: 0.14, lead: 0.95, sw: 0.7 }
  };
  G.makeAI = function (diff) {
    return { d: G.DIFF[diff] || G.DIFF.normal, thinkT: 0.3, strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 1, gapT: 0.6, evT: 0, evx: 0, evy: 0, guardT: 0, windSeen: -1, windMon: null, spSeen: null, nT: 0, ox: 0, oy: 0 };
  };

  function best(aTypes, dTypes) { var m = 0, i, e; for (i = 0; i < aTypes.length; i++) { e = G.eff(aTypes[i], dTypes); if (e > m) m = e; } return m; }
  function matchup(a, d) { return best(a.types, d.types) - best(d.types, a.types); }
  G.matchup = matchup;
  function up(m) { return m && !m.fainted && m.state !== 'enter' && m.state !== 'bench' && m.state !== 'faint'; }
  function distP(x, y, m) { var dx = x - m.x, dy = y - m.y; return Math.sqrt(dx * dx + dy * dy); }

  function pickSwitch(side, foe, smart) {
    var bi = -1, bs = -99, i, t, s;
    for (i = 0; i < side.team.length; i++) {
      t = side.team[i];
      if (t.fainted || i === side.active) continue;
      if (!smart) return i;
      s = matchup(t.d, foe.d) + t.hp / t.maxHp * 0.8;
      if (s > bs) { bs = s; bi = i; }
    }
    return bi;
  }

  function evade(A, c, m, dx, dy) {
    var l = Math.sqrt(dx * dx + dy * dy) || 1; dx /= l; dy /= l;
    // do not dodge into a wall
    var ex = m.x + dx * 120, ey = m.y + dy * 120;
    if (ex < AR.x0 + m.r || ex > AR.x1 - m.r) dx = -dx;
    if (ey < AR.y0 + m.r || ey > AR.y1 - m.r) dy = -dy;
    if (m.dodgeCd <= 0 && m.state === 'idle' && m.rootT <= 0 && m.bulwark <= 0) {
      c.dodge = true; c.dodgeT = 0.15; A.evT = 0.22; A.evx = dx; A.evy = dy;
    } else A.guardT = 0.45;
  }

  function sigOK(b, side, m, foe, d) {
    var hp = m.hp / m.maxHp, n = 0, i;
    switch (m.d.sig.id) {
      case 'caldera': return d < 170;
      case 'riptide': return d < 540 && d > 140;
      case 'overgrowth': return true;
      case 'mirage': return d < 420;
      case 'glacier': return d < 430;
      case 'bulwark': return d < 210 || hp < 0.5;
      case 'cyclone': return hp < 0.7 || d < 150;
      case 'nightfall': return true;
      case 'zerofield':
        for (i = 0; i < b.proj.length; i++) if (b.proj[i].side !== side.idx) n++;
        return d < 210 || n >= 2;
      case 'phase': return true;
      case 'relay': return d < 380;
      case 'monsoon': return hp < 0.75;
      case 'xnova': case 'xpound': return d < m.d.sig.p.radius * 0.8;
      case 'xlob': return d < m.d.sigMove.range;
      case 'xbeam': return d < m.d.sig.p.range * 0.8;
    }
    return true;
  }

  function scoreMove(b, side, m, foe, mv, d) {
    var i, f, s = 0, hp = m.hp / m.maxHp, reach = G.moveReach(mv), per = m.d.ai;
    if (mv.power > 0) {
      var e = G.eff(mv.type, foe.d.types);
      if (e === 0) return 0;
      if (d - foe.r > reach * 0.92) return 0;
      s = mv.power * (mv.count || 1) * e * (m.d.types.indexOf(mv.type) >= 0 ? 1.3 : 1);
      if (mv.shape === 'lob') s *= 0.8;
      if (hp < 0.25 && per === 'aggressive') s *= 1.3;
      return s * (0.8 + Math.random() * 0.4);
    }
    if (mv.shape === 'zone') {
      var own = 0;
      for (i = 0; i < b.zones.length; i++) if (b.zones[i].side === side.idx) { own++; if (distP(b.zones[i].x, b.zones[i].y, foe) < b.zones[i].radius) return 0; }
      if (own >= 2 || d > reach + 40) return 0;
      return (per === 'tricky' ? 75 : 50) + Math.random() * 25;
    }
    if (mv.shape === 'self') {
      for (i = 0; i < mv.fx.length; i++) {
        f = mv.fx[i];
        if (f.k === 'heal') return hp < 0.55 ? 150 : 0;
        if (f.k === 'stage' && m.stages[f.stat] < 2) s = (d > 170 ? 55 : 22) + Math.random() * 25;
      }
      if (hp < 0.25 && per !== 'defensive') s *= 0.4;
      return s;
    }
    // status attack on the opponent
    if (d - foe.r > reach * 0.9) return 0;
    for (i = 0; i < mv.fx.length; i++) {
      f = mv.fx[i];
      if (f.k === 'status' && !foe.status && foe.ccImmune <= 0) s = Math.max(s, 78);
      if (f.k === 'conf' && foe.conf <= 0) s = Math.max(s, 62);
      if (f.k === 'stage' && f.who === 'foe' && foe.stages[f.stat] > -2) s = Math.max(s, 55);
    }
    return s ? s + Math.random() * 20 : 0;
  }

  G.aiThink = function (b, side, dt) {
    var A = side.ai, D = A.d, c = side.ctrl, m = side.team[side.active], os = b.sides[1 - side.idx], foe = os.team[os.active];
    var i, p, q, dd;
    c.guard = false;
    if (m.fainted || m.state === 'faint') { if (c.sw < 0) c.sw = pickSwitch(side, foe, D.sw > 0); c.mx = c.my = 0; return; }
    if (m.state === 'enter' || m.state === 'bench') { c.mx = c.my = 0; return; }
    if (A.evT > 0) A.evT -= dt;
    if (A.guardT > 0) A.guardT -= dt;
    if (A.gapT > 0) A.gapT -= dt;

    var foeUp = up(foe);
    // where the AI thinks the opponent is (Nightfall makes this wrong)
    if (foe.veil > 0 || foe.hidden) {
      A.nT -= dt;
      if (A.nT <= 0) { A.nT = 0.6; A.ox = (Math.random() - 0.5) * 300; A.oy = (Math.random() - 0.5) * 220; }
    } else { A.ox = A.oy = 0; }
    var tx = foe.x + A.ox, ty = foe.y + A.oy;
    var dx = tx - m.x, dy = ty - m.y, d = Math.sqrt(dx * dx + dy * dy) || 1, nx = dx / d, ny = dy / d;

    // ---- threat reactions ----
    if (foeUp && A.evT <= 0) {
      if (foe.state === 'wind' && foe.cur && (A.windSeen !== foe.windSeq || A.windMon !== foe) && foe.st < 0.24) {
        A.windSeen = foe.windSeq; A.windMon = foe;
        var sh = foe.cur.shape;
        if (sh !== 'self' && sh !== 'zone' && sh !== 'ring' && !(sh === 'lob' && !foe.cur.isSig) && G.inTele(foe, foe.cur, m, 12) && Math.random() < D.dodge) {
          if (sh === 'nova') evade(A, c, m, m.x - foe.x, m.y - foe.y);
          else if (sh === 'lob') evade(A, c, m, m.x - foe.aimX, m.y - foe.aimY);
          else {
            var a = foe.aimA, cr = Math.cos(a) * (m.y - foe.y) - Math.sin(a) * (m.x - foe.x);
            if (cr >= 0) evade(A, c, m, -Math.sin(a), Math.cos(a)); else evade(A, c, m, Math.sin(a), -Math.cos(a));
          }
        }
      }
      if (foe.state === 'special' && foe.sp && foe.sp.untarget && A.spSeen !== foe.sp && foe.sp.t > foe.sp.dur - 0.2) {
        A.spSeen = foe.sp;
        if (distP(foe.x, foe.y, m) < 170 && Math.random() < D.dodge) evade(A, c, m, m.x - foe.x, m.y - foe.y);
      }
      for (i = 0; i < b.proj.length; i++) {
        p = b.proj[i];
        if (p.side === side.idx || p.aiRoll || p.frozen > 0) continue;
        var rx = m.x - p.x, ry = m.y - p.y, s2 = p.vx * p.vx + p.vy * p.vy || 1, t = (rx * p.vx + ry * p.vy) / s2;
        if (t < 0 || t > 0.3) continue;
        var cx = p.x + p.vx * t - m.x, cy = p.y + p.vy * t - m.y, rr = p.r + m.r + 6;
        if (cx * cx + cy * cy < rr * rr) {
          p.aiRoll = true;
          if (Math.random() < D.dodge) { if (rx * -p.vy + ry * p.vx >= 0) evade(A, c, m, -p.vy, p.vx); else evade(A, c, m, p.vy, -p.vx); }
        }
      }
      for (i = 0; i < b.pend.length; i++) {
        q = b.pend[i];
        if (q.side === side.idx || q.aiRoll) continue;
        dd = distP(q.x, q.y, m);
        if (q.k === 'blast') {
          if (q.t < 0.3 && dd < q.radius + m.r * 0.5 + 8) { q.aiRoll = true; if (Math.random() < D.dodge) evade(A, c, m, m.x - q.x, m.y - q.y); }
        } else if (dd - q.r < 50 && dd > q.r - 10 && dd < q.maxR + m.r) {
          q.aiRoll = true; if (Math.random() < D.dodge) evade(A, c, m, q.x - m.x, q.y - m.y);
        }
      }
    }
    if (A.guardT > 0 && m.state === 'idle') c.guard = true;

    // ---- movement ----
    var per = m.d.ai, pref = m.d.pref, hp = m.hp / m.maxHp, low = hp < 0.25;
    var want = pref === 'melee' ? m.r + foe.r + 30 : pref === 'mid' ? 210 : 340;
    var bad = matchup(m.d, foe.d) <= -1;
    if (low) { if (per === 'aggressive') want = m.r + foe.r + 18; else if (per === 'careful') want += 90; else if (per === 'tricky') want += 40; }
    if (bad && (per === 'tricky' || per === 'careful')) want += 70;
    if (!foeUp) want = 260;
    var rad = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
    var sw = per === 'tricky' ? 1 : per === 'aggressive' ? 0.45 : 0.7;
    if (rad !== 0) sw *= 0.6;
    A.strafeT -= dt;
    if (A.strafeT <= 0) { A.strafe = -A.strafe; A.strafeT = 0.9 + Math.random() * 2.2; }
    var mx = nx * rad - ny * A.strafe * sw, my = ny * rad + nx * A.strafe * sw, wm = 48;
    if (m.x < AR.x0 + wm) mx += 1.2; else if (m.x > AR.x1 - wm) mx -= 1.2;
    if (m.y < AR.y0 + wm) my += 1.2; else if (m.y > AR.y1 - wm) my -= 1.2;
    for (i = 0; i < b.zones.length; i++) {
      q = b.zones[i];
      if (q.side === side.idx) continue;
      dd = distP(q.x, q.y, m);
      if (dd < q.radius + m.r + 14) { mx += (m.x - q.x) / (dd || 1) * 1.7; my += (m.y - q.y) / (dd || 1) * 1.7; }
    }
    if (D.dodge > 0.3) for (i = 0; i < b.pend.length; i++) {
      q = b.pend[i];
      if (q.side === side.idx || q.k !== 'blast') continue;
      dd = distP(q.x, q.y, m);
      if (dd < q.radius + m.r + 10) { mx += (m.x - q.x) / (dd || 1) * 2.2; my += (m.y - q.y) / (dd || 1) * 2.2; }
    }
    if (A.evT > 0) { mx = A.evx; my = A.evy; }
    c.mx = mx; c.my = my;
    c.ax = tx; c.ay = ty;

    // ---- decisions ----
    A.thinkT -= dt;
    if (A.thinkT > 0) return;
    A.thinkT = D.think * (0.7 + Math.random() * 0.6);
    if (!foeUp || m.state !== 'idle' || c.guard) return;

    if (D.sw > 0 && side.switchCd <= 0 && hp > 0.25 && bad && Math.random() < D.sw * 0.25) {
      var s = pickSwitch(side, foe, true);
      if (s >= 0 && matchup(side.team[s].d, foe.d) >= matchup(m.d, foe.d) + 1.5) { c.sw = s; c.swT = 0.4; return; }
    }
    function aim(lead) {
      var px = tx + foe.vx * lead * D.lead, py = ty + foe.vy * lead * D.lead;
      var a = Math.atan2(py - m.y, px - m.x) + (Math.random() - 0.5) * 2 * D.err;
      var l = Math.sqrt((px - m.x) * (px - m.x) + (py - m.y) * (py - m.y));
      c.ax = m.x + Math.cos(a) * l; c.ay = m.y + Math.sin(a) * l;
    }
    if (m.charge >= 100 && sigOK(b, side, m, foe, d)) {
      aim(m.d.sigMove.wind / 1000);
      c.sig = true; c.sigT = 0.3; A.gapT = D.gap;
      return;
    }
    if (A.gapT > 0) return;
    var bi = -1, bs = 20, sc, mv;
    for (i = 0; i < 4; i++) {
      if (m.cds[i] > 0) continue;
      sc = scoreMove(b, side, m, foe, m.d.moves[i], d);
      if (sc > bs) { bs = sc; bi = i; }
    }
    if (bi < 0) return;
    mv = m.d.moves[bi];
    aim(mv.shape === 'proj' ? d / mv.speed + mv.wind / 1000 : mv.shape === 'lob' ? mv.delay + mv.wind / 1000 : mv.wind / 1000);
    c.move = bi; c.moveT = 0.25;
    A.gapT = D.gap * (0.6 + Math.random() * 0.8);
  };
})(typeof window !== 'undefined' ? window : globalThis);
