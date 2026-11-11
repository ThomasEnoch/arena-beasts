/* Arena Beasts - canvas renderer: arena, creatures, effects, HUD.
   All effect objects come from fixed pools, so a battle makes almost no garbage. */
(function () {
  'use strict';
  var G = window.G, AR = G.ARENA, R = G.R = {};
  var W = 960, H = 540, TAU = Math.PI * 2, PI = Math.PI;
  var FONT = '"Trebuchet MS","Segoe UI",Arial,sans-serif';
  var cv, ctx, scale = 1, offX = 0, offY = 0, dpr = 1, bg = null, time = 0, shake = 0;
  R.hitstop = 0; R.W = W; R.H = H;

  var ZCOL = { lava: '#f0693a', toxic: '#a653c9', spikes: '#9aa7b5', bubbles: '#3d8fe8', ice: '#6fd0e6', vines: '#57b84a', gravity: '#f065a8' };
  var THEMES = [
    { name: 'Dune', base: '#d8c08c', sp: ['#c7ac74', '#e7d5a6'], line: 'rgba(206,150,34,0.8)', floor: '#4b3a2c', plank: '#3e2f23' },
    { name: 'Glade', base: '#8cc472', sp: ['#79b05f', '#a2d588'], line: 'rgba(255,255,255,0.65)', floor: '#2e3d36', plank: '#26332d' },
    { name: 'Rink', base: '#c6e5ee', sp: ['#b2d6e2', '#e0f4f9'], line: 'rgba(60,120,190,0.6)', floor: '#2c3550', plank: '#252c44' },
    { name: 'Slate', base: '#a2a7bc', sp: ['#9197ad', '#b6bbcd'], line: 'rgba(255,214,90,0.7)', floor: '#33303f', plank: '#2a2835' }
  ];

  // ---- setup --------------------------------------------------------------
  R.init = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d', { alpha: false });
    R.resize(); window.addEventListener('resize', R.resize);
  };
  R.resize = function () {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = cv.clientWidth || window.innerWidth, h = cv.clientHeight || window.innerHeight;
    cv.width = Math.max(2, Math.round(w * dpr)); cv.height = Math.max(2, Math.round(h * dpr));
    scale = Math.min(cv.width / W, cv.height / H);
    offX = (cv.width - W * scale) / 2; offY = (cv.height - H * scale) / 2;
  };
  var LP = { x: 0, y: 0 };
  R.toLogical = function (cx, cy) {
    var r = cv.getBoundingClientRect();
    LP.x = ((cx - r.left) * dpr - offX) / scale; LP.y = ((cy - r.top) * dpr - offY) / scale;
    return LP;
  };
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  R.buildArena = function () {
    var th = THEMES[Math.floor(Math.random() * THEMES.length)], c = mk(W * 2, H * 2), g = c.getContext('2d'), i, x, y;
    g.scale(2, 2);
    var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#171a30'); gr.addColorStop(1, '#0b0c17');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = th.floor; g.fillRect(0, 88, W, 364);
    g.fillStyle = th.plank;
    for (x = 0; x < W; x += 40) g.fillRect(x, 88, 2, 364);
    for (i = 0; i < 60; i++) g.fillRect((i * 173) % W, 88 + (i * 97) % 360, 40, 1);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(AR.x0 + 6, AR.y0 + 8, AR.x1 - AR.x0, AR.y1 - AR.y0);
    g.fillStyle = th.base; g.fillRect(AR.x0, AR.y0, AR.x1 - AR.x0, AR.y1 - AR.y0);
    for (i = 0; i < 1100; i++) {
      g.fillStyle = th.sp[i & 1]; g.globalAlpha = 0.5 + Math.random() * 0.5;
      x = AR.x0 + Math.random() * (AR.x1 - AR.x0 - 4); y = AR.y0 + Math.random() * (AR.y1 - AR.y0 - 4);
      g.fillRect(Math.round(x), Math.round(y), 2 + (i % 3), 2);
    }
    g.globalAlpha = 1;
    var cx = (AR.x0 + AR.x1) / 2, cy = (AR.y0 + AR.y1) / 2;
    g.strokeStyle = th.line; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 118, 0, TAU); g.stroke();
    g.beginPath(); g.arc(cx, cy, 58, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(cx, AR.y0); g.lineTo(cx, AR.y1); g.stroke();
    g.strokeStyle = '#f4f4f8'; g.lineWidth = 4; g.strokeRect(AR.x0, AR.y0, AR.x1 - AR.x0, AR.y1 - AR.y0);
    bg = c; R.theme = th.name;
  };

  // ---- pools --------------------------------------------------------------
  var MAXP = 700, parts = [], pn = 0, i0;
  for (i0 = 0; i0 < MAXP; i0++) parts.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 3, col: '#fff', g: 0, drag: 0 });
  function emit(x, y, vx, vy, life, size, col, grav, drag) {
    if (pn >= MAXP) return;
    var p = parts[pn++];
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life; p.size = size; p.col = col; p.g = grav || 0; p.drag = drag || 0;
  }
  function puff(x, y, n, col, spd, life, size) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, s = spd * (0.3 + Math.random() * 0.7);
      emit(x, y, Math.cos(a) * s, Math.sin(a) * s * 0.75, life * (0.5 + Math.random() * 0.5), size * (0.6 + Math.random() * 0.8), col, 0, 3);
    }
  }
  var MAXF = 48, floats = [], fn = 0;
  for (i0 = 0; i0 < MAXF; i0++) floats.push({ x: 0, y: 0, t: 0, max: 1, txt: '', col: '#fff', size: 14 });
  function floatTxt(x, y, s, col, size, dur) {
    var f;
    if (fn >= MAXF) { f = floats[0]; floats[0] = floats[fn - 1]; floats[fn - 1] = f; } else f = floats[fn++];
    f.x = x + (Math.random() - 0.5) * 22; f.y = y; f.t = f.max = dur || 0.9; f.txt = s; f.col = col; f.size = size || 14;
  }
  var shapes = [], ghosts = [], msgs = [], callout = [null, null], banner = null;
  var statAcc = [0, 0], ghostAcc = [0, 0], faceDir = [1, -1];

  R.reset = function () {
    pn = 0; fn = 0; shapes.length = 0; ghosts.length = 0; msgs.length = 0; callout[0] = callout[1] = null; banner = null;
    shake = 0; R.hitstop = 0; faceDir[0] = 1; faceDir[1] = -1;
    R.buildArena();
  };
  R.banner = function (txt, col, dur) { banner = { txt: txt, col: col || '#fff', t: 0, max: dur || 1.4 }; };

  // ---- engine events -> visuals and sound ---------------------------------
  R.consume = function (b, ui) {
    var E = b.ev, i, e, c, n;
    for (i = 0; i < E.length; i++) {
      e = E[i];
      switch (e.k) {
        case 'msg':
          msgs.push({ txt: e.txt, col: e.col, t: 0 }); if (msgs.length > 3) msgs.shift();
          break;
        case 'cast':
          callout[e.side] = { name: e.name, type: e.type, t: 0, sig: e.sig };
          G.sfx(e.sig ? 'sig' : 'cast');
          if (e.sig) { shapes.push({ k: 'ring', x: e.x, y: e.y, r0: 90, r1: 10, t: 0, max: 0.4, col: '#ffe27a', w: 4 }); puff(e.x, e.y - 20, 24, '#ffe27a', 160, 0.6, 4); }
          break;
        case 'fire':
          c = G.TCOL[e.mv.type];
          switch (e.mv.shape) {
            case 'cone': shapes.push({ k: 'cone', x: e.x, y: e.y, a: e.a, range: e.mv.range, arc: e.mv.arc, t: 0, max: 0.18, col: c }); break;
            case 'line': shapes.push({ k: 'beam', x: e.x, y: e.y, a: e.a, len: e.mv.range, w: e.mv.width, t: 0, max: 0.22, col: c }); break;
            case 'nova': shapes.push({ k: 'ring', x: e.x, y: e.y, r0: 12, r1: e.mv.radius, t: 0, max: 0.25, col: c, w: 10 }); puff(e.x, e.y, 22, c, e.mv.radius * 2.6, 0.4, 5); break;
            case 'self': for (n = 0; n < 14; n++) emit(e.x + (Math.random() - 0.5) * 40, e.y - Math.random() * 20, 0, -60 - Math.random() * 70, 0.7, 4, c, 0, 0); break;
            default: puff(e.x + Math.cos(e.a) * 20, e.y + Math.sin(e.a) * 20 - 8, 6, c, 120, 0.25, 4);
          }
          G.sfx(e.mv.shape === 'nova' ? 'burst' : 'fire');
          break;
        case 'dmg':
          if (e.dot) {
            floatTxt(e.x, e.y - 46, '' + e.dmg, e.dot === 'recoil' ? '#ffb0a0' : (G.STATUS_COL[e.dot] || (e.type ? G.TCOL[e.type] : '#ddd')), 12, 0.7);
            if (e.dot === 'zone') G.sfx('weak');
          } else {
            c = e.eff >= 2 ? '#ffd23a' : e.eff < 1 ? '#b9bccb' : '#ffffff';
            floatTxt(e.x, e.y - 50, e.dmg + (e.crit ? '!' : ''), c, e.eff >= 2 || e.crit ? 22 : 17, 1);
            if (e.eff >= 2) floatTxt(e.x, e.y - 72, 'Super effective!', '#ffd23a', 12, 1.1);
            else if (e.eff < 1) floatTxt(e.x, e.y - 72, 'Not very effective', '#b9bccb', 11, 1.1);
            if (e.crit) floatTxt(e.x, e.y - 88, 'Critical hit!', '#ff8a5a', 12, 1.1);
            puff(e.x, e.y - 14, 8 + Math.min(20, e.big * 90 | 0), e.type ? G.TCOL[e.type] : '#fff', 220, 0.4, 5);
            puff(e.x, e.y - 14, 5, '#ffffff', 160, 0.25, 4);
            if (e.big > 0.1) { shake = Math.max(shake, 4 + e.big * 22); R.hitstop = Math.max(R.hitstop, e.big > 0.2 ? 0.08 : 0.045); G.sfx('big'); }
            else G.sfx(e.eff < 1 ? 'weak' : 'hit');
          }
          break;
        case 'miss': floatTxt(e.x, e.y - 50, 'Dodged!', '#bfe9ff', 13, 0.8); break;
        case 'text': floatTxt(e.x, e.y - 60, e.txt, e.col, 13, 1.1); break;
        case 'stage':
          floatTxt(e.x, e.y - 64, G.STAT_SHORT[e.stat] + (e.n > 0 ? ' +' : ' ') + e.n, e.n > 0 ? '#8fe0ff' : '#ff9a9a', 14, 1.2);
          for (n = 0; n < 10; n++) emit(e.x + (Math.random() - 0.5) * 44, e.y - (e.n > 0 ? 0 : 50) - Math.random() * 10, 0, e.n > 0 ? -90 : 90, 0.55, 4, e.n > 0 ? '#8fe0ff' : '#ff8080', 0, 0);
          G.sfx(e.n > 0 ? 'up' : 'down');
          break;
        case 'status': floatTxt(e.x, e.y - 64, G.STATUS_NAME[e.s] + '!', G.STATUS_COL[e.s], 14, 1.2); puff(e.x, e.y - 20, 12, G.STATUS_COL[e.s], 120, 0.5, 4); G.sfx('status'); break;
        case 'heal':
          floatTxt(e.x, e.y - 50, '+' + e.amt, '#8dff9a', 14, 0.9);
          for (n = 0; n < 6; n++) emit(e.x + (Math.random() - 0.5) * 40, e.y - Math.random() * 20, 0, -70, 0.6, 4, '#8dff9a', 0, 0);
          G.sfx('heal');
          break;
        case 'faint': puff(e.x, e.y - 10, 30, '#ffffff', 200, 0.7, 5); shake = Math.max(shake, 9); G.sfx('faint'); break;
        case 'send':
          shapes.push({ k: 'ring', x: e.x, y: e.y, r0: 6, r1: 70, t: 0, max: 0.4, col: '#ffffff', w: 5 });
          puff(e.x, e.y - 10, 22, e.side ? '#ff9a8a' : '#9ad0ff', 220, 0.5, 5); G.sfx('send');
          break;
        case 'recall': puff(e.x, e.y - 10, 18, '#ffffff', 160, 0.4, 4); break;
        case 'guard':
          shapes.push({ k: 'ring', x: e.x, y: e.y - 12, r0: 18, r1: e.perfect ? 46 : 34, t: 0, max: 0.2, col: e.perfect ? '#fff7b0' : '#bfe0ff', w: 4 });
          G.sfx('guard');
          break;
        case 'dodge': G.sfx('dodge'); puff(e.x, e.y, 6, '#e8e4d0', 80, 0.3, 4); break;
        case 'pop': puff(e.x, e.y - 8, e.n, G.TCOL[e.type] || '#fff', 140, 0.3, 4); break;
        case 'burst':
          c = G.TCOL[e.type];
          shapes.push({ k: 'ring', x: e.x, y: e.y, r0: 10, r1: e.r, t: 0, max: 0.3, col: c, w: 12 });
          puff(e.x, e.y, 30, c, e.r * 2.4, 0.5, 6); G.sfx('burst'); shake = Math.max(shake, 5);
          break;
        case 'zone': shapes.push({ k: 'ring', x: e.x, y: e.y, r0: 8, r1: e.r, t: 0, max: 0.3, col: G.TCOL[e.type], w: 5 }); break;
        case 'shake': shake = Math.max(shake, e.v); break;
        case 'teleport': c = G.TCOL[e.type]; puff(e.x, e.y - 14, 18, c, 180, 0.45, 5); puff(e.x2, e.y2 - 14, 18, c, 180, 0.45, 5); G.sfx('dodge'); break;
        case 'trail': shapes.push({ k: 'trail', x: e.x, y: e.y, x2: e.x2, y2: e.y2, t: 0, max: 0.3, col: G.TCOL[e.type] }); G.sfx('fire'); break;
        case 'ready': if (e.side === ui.me) { floatTxt(e.x, e.y - 84, 'Signature ready!', '#ffe27a', 14, 1.4); G.sfx('ready'); } break;
        case 'go': R.banner('FIGHT!', '#ffe27a', 1.1); G.sfx('go'); break;
        case 'end':
          R.banner(e.winner === 2 ? 'DRAW' : e.winner === ui.me ? 'VICTORY!' : 'DEFEAT', e.winner === ui.me ? '#ffe27a' : '#ff9a8a', 3);
          G.sfx(e.winner === ui.me ? 'win' : 'lose');
          break;
      }
    }
    E.length = 0;
  };

  // ---- drawing helpers ----------------------------------------------------
  function txt(s, x, y, font, fill, align, stroke, sw) {
    ctx.font = font; ctx.textAlign = align || 'left';
    if (stroke) { ctx.lineWidth = sw || 3; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = fill; ctx.fillText(s, x, y);
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }

  function drawZone(z, me) {
    var a = Math.min(1, z.t / 0.3, (z.dur - z.t) / 0.8), col = ZCOL[z.kind] || '#fff', i, n = 12, ang, rad;
    if (a <= 0) return;
    ctx.globalAlpha = 0.22 * a; ctx.fillStyle = col; circle(z.x, z.y, z.radius); ctx.fill();
    ctx.globalAlpha = 0.75 * a; ctx.strokeStyle = z.side === me ? col : '#ff5a5a'; ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]); ctx.lineDashOffset = -time * 20; circle(z.x, z.y, z.radius); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col; ctx.globalAlpha = 0.7 * a;
    for (i = 0; i < n; i++) {
      ang = i * TAU / n + time * 0.5 * (i % 2 ? 1 : -1); rad = z.radius * (0.25 + 0.65 * ((i * 37) % 10) / 10);
      var px = z.x + Math.cos(ang) * rad, py = z.y + Math.sin(ang) * rad, s = 4 + (i % 3) * 2;
      if (z.kind === 'spikes') { ctx.beginPath(); ctx.moveTo(px - 4, py + 3); ctx.lineTo(px, py - 6); ctx.lineTo(px + 4, py + 3); ctx.fill(); }
      else if (z.kind === 'bubbles') { ctx.lineWidth = 1.5; ctx.strokeStyle = '#d8f0ff'; circle(px, py + Math.sin(time * 3 + i) * 3, s); ctx.stroke(); }
      else ctx.fillRect(px - s / 2, py - s / 2 + Math.sin(time * 3 + i) * 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function drawTele(m, x, y, me) {
    var mv = m.cur, q = 1 - m.st / m.stMax, col = G.TCOL[mv.type], edge = m.side === me ? '#ffffff' : '#ff5a5a', half;
    if (q < 0) q = 0; if (q > 1) q = 1;
    ctx.fillStyle = col; ctx.strokeStyle = edge; ctx.lineWidth = 1.5;
    switch (mv.shape) {
      case 'cone':
        half = mv.arc * PI / 360;
        ctx.globalAlpha = 0.16; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, mv.range, m.aimA - half, m.aimA + half); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.6; ctx.stroke();
        ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, mv.range * q, m.aimA - half, m.aimA + half); ctx.closePath(); ctx.fill();
        break;
      case 'line': case 'dash': case 'proj':
        var len = mv.shape === 'dash' ? mv.dist + m.r : mv.range, w = mv.shape === 'proj' ? mv.pr * 2 : mv.width, al = mv.shape === 'proj' ? 0.5 : 1;
        ctx.save(); ctx.translate(x, y); ctx.rotate(m.aimA);
        ctx.globalAlpha = 0.16 * al; ctx.fillRect(0, -w / 2, len, w);
        ctx.globalAlpha = 0.55 * al; ctx.strokeRect(0, -w / 2, len, w);
        ctx.globalAlpha = 0.3 * al; ctx.fillRect(0, -w / 2, len * q, w);
        ctx.restore();
        break;
      case 'nova': case 'ring':
        ctx.globalAlpha = 0.14; circle(x, y, mv.radius); ctx.fill();
        ctx.globalAlpha = 0.6; ctx.stroke();
        ctx.globalAlpha = 0.28; circle(x, y, mv.radius * q); ctx.fill();
        break;
      case 'lob': case 'zone':
        ctx.globalAlpha = 0.14; circle(m.aimX, m.aimY, mv.radius); ctx.fill();
        ctx.globalAlpha = 0.6; ctx.stroke();
        ctx.globalAlpha = 0.28; circle(m.aimX, m.aimY, mv.radius * q); ctx.fill();
        break;
    }
    ctx.globalAlpha = 1;
  }

  function frameOf(m) {
    var S = G.SPR[m.id];
    return (m.moving || m.state === 'dash' || m.state === 'dodge' || m.state === 'special') ? S.move[(time * 11 | 0) % 6] : S.idle[(time * 5 | 0) % 4];
  }

  function drawMon(b, m, alpha, ui, dt) {
    if (m.state === 'bench') return;
    var si = m.side, d = m.d, sc = G.SIZE[d.size].sc, w = G.TEX * sc;
    var x = m.px + (m.x - m.px) * alpha, y = m.py + (m.y - m.py) * alpha;
    var cf = Math.cos(m.face);
    if (cf > 0.2) faceDir[si] = 1; else if (cf < -0.2) faceDir[si] = -1;
    var dir = faceDir[si], hov = d.hover ? 9 + Math.sin(time * 3 + si * 2) * 3 : 0, z = m.z + hov;
    var fr = frameOf(m), a = 1, sx = 1, sy = 1, rot = 0, ox = 0, oy = 0, q, n;

    // ground shadow
    var shr = Math.max(0.35, 1 - z / 260);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 3, m.r * shr, m.r * 0.42 * shr, 0, 0, TAU); ctx.fill();
    if (m.hidden) {
      ctx.strokeStyle = 'rgba(160,140,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y + 3, m.r * (0.6 + 0.4 * Math.sin(time * 14)), m.r * 0.3, 0, 0, TAU); ctx.stroke();
      return;
    }
    // auras under the sprite
    if (m.charge >= 100 && m.state !== 'faint') {
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 6); ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(x, y + 3, m.r + 8, (m.r + 8) * 0.45, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (m.cyclone > 0) {
      ctx.strokeStyle = G.TCOL.Gale; ctx.lineWidth = 3;
      for (n = 0; n < 4; n++) { ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(x, y, 150 - n * 30, time * (5 + n) + n * 1.6, time * (5 + n) + n * 1.6 + 1.6); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (pn < MAXP - 40) { q = Math.random() * TAU; emit(x + Math.cos(q) * 140, y + Math.sin(q) * 140, -Math.sin(q) * 260, Math.cos(q) * 260, 0.4, 4, '#dfe6ff', 0, 0); }
    }

    switch (m.state) {
      case 'enter': q = 1 - m.st / m.stMax; if (q < 0) q = 0; sx = sy = 0.2 + 0.8 * q; a = 0.4 + 0.6 * q; break;
      case 'faint': q = 1 - m.st / m.stMax; rot = Math.min(1, q * 2) * 1.5 * dir; a = 1 - q; oy = q * 8; break;
      case 'wind': q = 1 - m.st / m.stMax; sx = 1 + 0.13 * q; sy = 1 - 0.11 * q; ox = -Math.cos(m.aimA) * 5 * q; oy = -Math.sin(m.aimA) * 3 * q; break;
      case 'rec': q = m.st / m.stMax; if (m.cur) { ox = Math.cos(m.aimA) * 7 * q; oy = Math.sin(m.aimA) * 4 * q; sx = 1 - 0.06 * q; sy = 1 + 0.06 * q; } break;
      case 'stun': rot = Math.sin(time * 9) * 0.12; break;
      case 'dodge': case 'dash': sx = 1.12; sy = 0.9; break;
    }
    if (m.iframes > 0 && m.state !== 'enter') a *= 0.55;
    if (m.veil > 0) a *= si === ui.me ? 0.5 : 0.1;
    if (a <= 0.01) return;

    // afterimages
    if (m.state === 'dodge' || m.state === 'dash' || (m.state === 'special' && !m.sp.untarget)) {
      ghostAcc[si] += dt;
      if (ghostAcc[si] > 0.03 && ghosts.length < 24) { ghostAcc[si] = 0; ghosts.push({ img: fr, x: x, y: y - z, dir: dir, w: w, sc: sc, t: 0.22 }); }
    }

    ctx.save();
    ctx.translate(x + ox, y - z + oy);
    if (rot) ctx.rotate(rot);
    ctx.scale(dir * sx, sy);
    ctx.globalAlpha = a;
    ctx.drawImage(fr, -24 * sc, -38 * sc, w, w);
    if (m.hitFlash > 0) { ctx.globalAlpha = a * 0.85; ctx.drawImage(G.SPR[m.id].white, -24 * sc, -38 * sc, w, w); }
    if (m.bulwark > 0) { ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 10); ctx.drawImage(G.SPR[m.id].white, -24 * sc, -38 * sc, w, w); }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (m.state === 'faint' || m.state === 'enter') return;

    var top = y - z - 31 * sc;
    // focal glow when the signature power is ready
    if (m.charge >= 100) {
      var gx = x + (d.focal[0] - 24) * sc * dir, gy = y - z + (d.focal[1] - 38) * sc, gs = 26 + Math.sin(time * 7) * 6;
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(G.GLOW[d.types[0]], gx - gs, gy - gs, gs * 2, gs * 2); ctx.globalCompositeOperation = 'source-over';
    }
    // shields
    if (m.guarding) {
      ctx.globalAlpha = 0.22; ctx.fillStyle = G.TCOL[d.types[0]]; circle(x, y - z - 12 * sc, m.r + 12); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = m.guardT < 0.18 ? '#fff7b0' : '#d8ecff'; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (m.bulwark > 0) {
      ctx.strokeStyle = '#d7dee8'; ctx.lineWidth = 4; ctx.globalAlpha = 0.9; ctx.beginPath();
      for (n = 0; n < 6; n++) { q = n * TAU / 6 + PI / 6; ctx[n ? 'lineTo' : 'moveTo'](x + Math.cos(q) * (m.r + 20), y - z - 12 * sc + Math.sin(q) * (m.r + 20)); }
      ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#d7dee8'; ctx.fill(); ctx.globalAlpha = 1;
    }
    // status effects
    statAcc[si] += dt;
    if (statAcc[si] > 0.11) {
      statAcc[si] = 0;
      var rx = x + (Math.random() - 0.5) * m.r * 2, ry = y - z - Math.random() * 30 * sc;
      if (m.status === 'burn') emit(rx, ry, 0, -70, 0.5, 5, Math.random() < 0.5 ? '#ffb347' : '#f0693a', 0, 0);
      else if (m.status === 'poison' || m.status === 'toxic') emit(rx, ry, 0, -40, 0.7, 5, '#b866dd', 0, 0);
      else if (m.status === 'para') emit(rx, ry, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, 0.15, 4, '#fff27a', 0, 0);
      else if (m.status === 'chill') emit(rx, ry, 0, 30, 0.6, 4, '#c8f4ff', 0, 0);
      else if (m.status === 'sleep' && Math.random() < 0.3) floatTxt(x + 14, top, 'z', '#ffffff', 14, 0.9);
      if (m.slowT > 0) emit(rx, y, 0, -20, 0.4, 4, '#f065a8', 0, 0);
    }
    if (m.conf > 0 || m.state === 'stun') {
      ctx.fillStyle = m.conf > 0 ? '#ffd0f0' : '#fff27a';
      for (n = 0; n < 3; n++) { q = time * 6 + n * TAU / 3; ctx.fillRect(x + Math.cos(q) * 16 - 3, top - 4 + Math.sin(q) * 5 - 3, 6, 6); }
    }
    // small HP bar above the creature
    var bw = 46, f = Math.max(0, m.hp / m.maxHp);
    ctx.fillStyle = 'rgba(10,12,24,0.8)'; rr(x - bw / 2 - 2, top - 16, bw + 4, 8, 3); ctx.fill();
    ctx.fillStyle = f > 0.5 ? '#5fe26a' : f > 0.2 ? '#f2c81e' : '#f0553a'; ctx.fillRect(x - bw / 2, top - 14, bw * f, 4);
  }

  function drawProj(p, alpha) {
    var x = p.px + (p.x - p.px) * alpha, y = p.py + (p.y - p.py) * alpha - 8, col = G.TCOL[p.type], s = p.r;
    if (p.decoy) {
      var S = G.SPR[p.sprite], fr = S.move[(time * 11 | 0) % 6], w = G.TEX * 1.5;
      ctx.globalAlpha = 0.6; ctx.save(); ctx.translate(x, y - 6); ctx.scale(p.vx >= 0 ? 1 : -1, 1); ctx.drawImage(fr, -w / 2, -w * 0.7, w, w); ctx.restore(); ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(G.GLOW[p.type], x - s * 2.4, y - s * 2.4, s * 4.8, s * 4.8);
    ctx.globalCompositeOperation = 'source-over';
    if (!p.decoy) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(p.vy, p.vx) + PI / 4);
      ctx.fillStyle = col; ctx.fillRect(-s * 0.75, -s * 0.75, s * 1.5, s * 1.5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-s * 0.38, -s * 0.38, s * 0.76, s * 0.76);
      ctx.restore();
    }
    if (p.frozen > 0) { ctx.strokeStyle = '#f065a8'; ctx.lineWidth = 2; circle(x, y, s + 5); ctx.stroke(); }
    else if (pn < MAXP - 60 && ((p.age * 60 | 0) & 1)) emit(x, y, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 0.25, s * 0.7, col, 0, 0);
  }

  function drawShapes(dt) {
    var i = shapes.length, s, q, a;
    while (i--) {
      s = shapes[i]; s.t += dt; q = s.t / s.max;
      if (q >= 1) { shapes.splice(i, 1); continue; }
      a = 1 - q;
      switch (s.k) {
        case 'ring':
          ctx.globalAlpha = a; ctx.strokeStyle = s.col; ctx.lineWidth = s.w * (0.4 + 0.6 * a);
          circle(s.x, s.y, s.r0 + (s.r1 - s.r0) * (1 - (1 - q) * (1 - q))); ctx.stroke();
          break;
        case 'cone':
          var half = s.arc * PI / 360;
          ctx.globalAlpha = 0.65 * a; ctx.fillStyle = s.col; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, s.range, s.a - half, s.a + half); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 0.9 * a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.x, s.y, s.range * (0.6 + 0.4 * q), s.a - half, s.a + half); ctx.stroke();
          break;
        case 'beam':
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
          ctx.globalAlpha = 0.75 * a; ctx.fillStyle = s.col; ctx.fillRect(0, -s.w / 2 * a, s.len, s.w * a);
          ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -s.w / 5 * a, s.len, s.w / 2.5 * a);
          ctx.restore();
          break;
        case 'trail':
          ctx.globalAlpha = a; ctx.strokeStyle = s.col; ctx.lineWidth = 8 * a; ctx.beginPath(); ctx.moveTo(s.x, s.y - 12); ctx.lineTo(s.x2, s.y2 - 12); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * a; ctx.stroke();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---- HUD ----------------------------------------------------------------
  var BTN = R.buttons = [];
  (function () {
    var i;
    for (i = 0; i < 4; i++) BTN.push({ x: 8 + i * 189, y: 456, w: 183, h: 38, act: 'move', i: i });
    BTN.push({ x: 764, y: 456, w: 188, h: 38, act: 'sig', i: 0 });
    for (i = 0; i < 6; i++) BTN.push({ x: 8 + i * 124, y: 498, w: 118, h: 38, act: 'sw', i: i });
    BTN.push({ x: 752, y: 498, w: 62, h: 38, act: 'dodge', i: 0 });
    BTN.push({ x: 818, y: 498, w: 62, h: 38, act: 'guard', i: 0 });
    BTN.push({ x: 884, y: 498, w: 68, h: 38, act: 'auto', i: 0 });
  })();
  R.hitButton = function (x, y) {
    for (var i = 0; i < BTN.length; i++) { var b = BTN[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; }
    return null;
  };
  var SWKEY = ['Z', 'X', 'C', 'V', 'B', 'N'];

  function chip(s, x, y, col, mir, fg) {
    ctx.font = 'italic 800 10px ' + FONT;
    var w = ctx.measureText(s).width + 12, x0 = mir ? x - w : x;
    ctx.fillStyle = col; rr(x0, y, w, 14, 4); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = fg || '#ffffff'; ctx.fillText(s, x0 + w / 2, y + 10.5);
    return w + 4;
  }

  function panel(b, si, dt) {
    var side = b.sides[si], m = side.team[side.active], d = m.d, mir = si === 1, i, k, t;
    function X(v) { return mir ? W - v : v; }
    var al = mir ? 'right' : 'left', ar = mir ? 'left' : 'right';
    ctx.fillStyle = 'rgba(12,14,30,0.86)'; rr(mir ? W - 358 : 6, 6, 352, 80, 10); ctx.fill();
    ctx.fillStyle = si ? '#e0564a' : '#4a8fe8'; ctx.fillRect(mir ? W - 9 : 6, 14, 3, 64);
    // portrait
    ctx.fillStyle = G.shade(G.TCOL[d.types[0]], -0.35); circle(X(46), 44, 30); ctx.fill();
    ctx.save(); circle(X(46), 44, 29); ctx.clip();
    ctx.translate(X(46), 44); ctx.scale(mir ? -1 : 1, 1); ctx.drawImage(G.SPR[m.id].idle[0], -34, -38, 68, 68); ctx.restore();
    ctx.strokeStyle = si ? '#ff8a7a' : '#8ac4ff'; ctx.lineWidth = 3; circle(X(46), 44, 30); ctx.stroke();
    if (m.fainted) { ctx.fillStyle = 'rgba(10,10,20,0.6)'; circle(X(46), 44, 30); ctx.fill(); }
    txt(d.name.toUpperCase(), X(86), 28, 'italic 900 20px ' + FONT, '#ffffff', al);
    txt(Math.ceil(m.hp / m.maxHp * 100) + '%', X(348), 28, 'italic 800 16px ' + FONT, '#ffffff', ar);
    // chips
    var cx = 86;
    for (i = 0; i < d.types.length; i++) cx += chip(d.types[i].toUpperCase(), X(cx), 35, G.TCOL[d.types[i]], mir);
    for (k in m.stages) { t = m.stages[k]; if (t !== 0 && cx < 320) cx += chip(G.STAT_SHORT[k] + (t > 0 ? '+' : '') + t, X(cx), 35, t > 0 ? '#2f6fd8' : '#c8473c', mir); }
    if (m.status && cx < 320) cx += chip(G.STATUS_NAME[m.status].toUpperCase(), X(cx), 35, G.STATUS_COL[m.status], mir, '#101018');
    if (m.conf > 0 && cx < 320) cx += chip('CONFUSED', X(cx), 35, '#ffd0f0', mir, '#101018');
    // HP bar with a trailing loss marker
    m.shownHp += (m.hp - m.shownHp) * Math.min(1, dt * 4);
    var f = Math.max(0, m.hp / m.maxHp), fs = Math.max(f, m.shownHp / m.maxHp), bw = 262, bx = mir ? W - 86 - bw : 86;
    ctx.fillStyle = '#23263c'; rr(bx, 55, bw, 10, 5); ctx.fill();
    ctx.fillStyle = '#ffffff'; if (mir) ctx.fillRect(bx + bw * (1 - fs), 56, bw * fs, 8); else ctx.fillRect(bx, 56, bw * fs, 8);
    ctx.fillStyle = f > 0.5 ? '#5fe26a' : f > 0.2 ? '#f2c81e' : '#f0553a'; if (mir) ctx.fillRect(bx + bw * (1 - f), 56, bw * f, 8); else ctx.fillRect(bx, 56, bw * f, 8);
    // signature charge
    var c = m.charge / 100;
    ctx.fillStyle = '#23263c'; ctx.fillRect(bx, 70, bw, 4);
    ctx.fillStyle = c >= 1 ? (Math.sin(time * 8) > 0 ? '#fff3b0' : '#ffd23a') : '#c79a1e'; if (mir) ctx.fillRect(bx + bw * (1 - c), 70, bw * c, 4); else ctx.fillRect(bx, 70, bw * c, 4);
    // team markers
    for (i = 0; i < side.team.length; i++) {
      t = side.team[i]; var px = X(20 + i * 17);
      ctx.fillStyle = t.fainted ? '#3a3d52' : (t.hp / t.maxHp > 0.5 ? '#5fe26a' : t.hp / t.maxHp > 0.2 ? '#f2c81e' : '#f0553a');
      circle(px, 96, 5.5); ctx.fill();
      ctx.strokeStyle = i === side.active ? '#ffe27a' : '#0c0e1e'; ctx.lineWidth = 2; ctx.stroke();
    }
    txt(side.name.toUpperCase(), X(20 + 6 * 17 + 4), 100, 'italic 800 11px ' + FONT, si ? '#ff9a8a' : '#9ad0ff', al, 'rgba(0,0,0,0.7)', 3);
  }

  function keycap(s, x, y) {
    ctx.font = '700 9px ' + FONT; var w = Math.max(14, ctx.measureText(s).width + 8);
    ctx.fillStyle = 'rgba(8,10,22,0.75)'; rr(x - w, y, w, 12, 3); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#e8ecff'; ctx.fillText(s, x - w / 2, y + 9);
  }

  function bottomBar(b, ui) {
    var side = b.sides[ui.me], m = side.team[side.active], fo = b.active(1 - ui.me), d = m.d, i, bt, mv, cd, e, col, lab, lc, t, f;
    var canAct = !m.fainted && m.state !== 'enter';
    ctx.fillStyle = 'rgba(10,12,26,0.9)'; ctx.fillRect(0, 452, W, 88);
    for (i = 0; i < 4; i++) {
      bt = BTN[i]; mv = d.moves[i]; cd = m.cds[i]; col = G.TCOL[mv.type];
      ctx.save(); rr(bt.x, bt.y, bt.w, bt.h, 7); ctx.clip();
      ctx.fillStyle = G.shade(col, -0.62); ctx.fillRect(bt.x, bt.y, bt.w, bt.h);
      ctx.fillStyle = G.shade(col, cd > 0 || !canAct ? -0.45 : -0.1); ctx.fillRect(bt.x, bt.y, bt.w * (cd > 0 ? 1 - cd / mv.cd : 1), bt.h);
      ctx.fillStyle = col; ctx.fillRect(bt.x, bt.y, 5, bt.h);
      ctx.restore();
      txt(mv.name.toUpperCase(), bt.x + 12, bt.y + 16, 'italic 900 12px ' + FONT, '#ffffff', 'left', 'rgba(0,0,0,0.55)', 3);
      lab = G.SHAPE_LABEL[mv.shape]; lc = '#d6daf0';
      if (mv.power > 0 && fo && !fo.fainted) {
        e = G.eff(mv.type, fo.d.types);
        if (e >= 2) { lab = 'Super effective'; lc = '#a8ff8a'; } else if (e === 0) { lab = 'No effect'; lc = '#ff8a8a'; } else if (e < 1) { lab = 'Not very effective'; lc = '#ffc0a8'; }
      }
      txt(lab, bt.x + 12, bt.y + 30, '700 10px ' + FONT, lc, 'left', 'rgba(0,0,0,0.5)', 2.5);
      if (cd > 0) txt(cd.toFixed(1), bt.x + bt.w - 10, bt.y + 31, 'italic 900 15px ' + FONT, '#ffffff', 'right', 'rgba(0,0,0,0.6)', 3);
      else txt(mv.power > 0 ? '' + mv.power * (mv.count || 1) : '—', bt.x + bt.w - 10, bt.y + 31, 'italic 900 15px ' + FONT, '#ffffff', 'right', 'rgba(0,0,0,0.6)', 3);
      keycap(i === 0 ? '1 / LMB' : i === 1 ? '2 / RMB' : '' + (i + 1), bt.x + bt.w - 5, bt.y + 4);
    }
    // signature power
    bt = BTN[4]; f = m.charge / 100;
    ctx.save(); rr(bt.x, bt.y, bt.w, bt.h, 7); ctx.clip();
    ctx.fillStyle = '#2a2410'; ctx.fillRect(bt.x, bt.y, bt.w, bt.h);
    ctx.fillStyle = f >= 1 ? (Math.sin(time * 8) > 0 ? '#ffd23a' : '#e9b820') : '#7a5f14'; ctx.fillRect(bt.x, bt.y, bt.w * f, bt.h);
    ctx.restore();
    if (f >= 1) { ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 2; rr(bt.x, bt.y, bt.w, bt.h, 7); ctx.stroke(); }
    txt(d.sig.name.toUpperCase(), bt.x + 10, bt.y + 16, 'italic 900 12px ' + FONT, f >= 1 ? '#201a04' : '#ffe9a0', 'left');
    txt(f >= 1 ? 'Signature ready' : 'Signature ' + (m.charge | 0) + '%', bt.x + 10, bt.y + 30, '700 10px ' + FONT, f >= 1 ? '#3a2f08' : '#d9c684', 'left');
    keycap('R', bt.x + bt.w - 5, bt.y + 4);
    // team
    for (i = 0; i < 6; i++) {
      bt = BTN[5 + i]; t = side.team[i];
      if (!t) continue;
      var act = i === side.active;
      ctx.fillStyle = t.fainted ? '#14151f' : act ? '#27304f' : '#1a1e34'; rr(bt.x, bt.y, bt.w, bt.h, 7); ctx.fill();
      if (act) { ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.globalAlpha = t.fainted ? 0.3 : 1;
      ctx.drawImage(G.SPR[t.id].idle[0], bt.x + 2, bt.y - 2, 40, 40);
      txt(t.d.name.toUpperCase(), bt.x + 44, bt.y + 15, 'italic 800 10px ' + FONT, '#ffffff', 'left');
      f = t.hp / t.maxHp;
      ctx.fillStyle = '#0c0e1c'; ctx.fillRect(bt.x + 44, bt.y + 22, 66, 5);
      ctx.fillStyle = f > 0.5 ? '#5fe26a' : f > 0.2 ? '#f2c81e' : '#f0553a'; ctx.fillRect(bt.x + 44, bt.y + 22, 66 * f, 5);
      ctx.fillStyle = '#c79a1e'; ctx.fillRect(bt.x + 44, bt.y + 29, 66 * t.charge / 100, 2);
      ctx.globalAlpha = 1;
      if (!act && !t.fainted && side.switchCd > 0) {
        ctx.fillStyle = 'rgba(6,8,18,0.6)'; rr(bt.x, bt.y, bt.w * Math.min(1, side.switchCd / 8), bt.h, 7); ctx.fill();
      }
      keycap(SWKEY[i], bt.x + bt.w - 4, bt.y + 3);
    }
    // dodge, guard, auto
    bt = BTN[11]; f = m.dodgeCd > 0 ? 1 - m.dodgeCd / 1.7 : 1;
    ctx.fillStyle = '#1a1e34'; rr(bt.x, bt.y, bt.w, bt.h, 7); ctx.fill();
    ctx.fillStyle = f >= 1 ? '#3a78c8' : '#274a78'; rr(bt.x, bt.y + bt.h * (1 - f), bt.w, bt.h * f, 7); ctx.fill();
    txt('DODGE', bt.x + bt.w / 2, bt.y + 18, 'italic 900 11px ' + FONT, '#ffffff', 'center');
    txt('SPACE', bt.x + bt.w / 2, bt.y + 31, '700 9px ' + FONT, '#c8d4f0', 'center');
    bt = BTN[12]; f = m.guardM / 100;
    ctx.fillStyle = '#1a1e34'; rr(bt.x, bt.y, bt.w, bt.h, 7); ctx.fill();
    ctx.fillStyle = m.guardLock ? '#7a3030' : m.guarding ? '#e8d27a' : '#8a7a3a'; rr(bt.x, bt.y + bt.h * (1 - f), bt.w, bt.h * f, 7); ctx.fill();
    txt('GUARD', bt.x + bt.w / 2, bt.y + 18, 'italic 900 11px ' + FONT, '#ffffff', 'center');
    txt('SHIFT', bt.x + bt.w / 2, bt.y + 31, '700 9px ' + FONT, '#e8e0c0', 'center');
    bt = BTN[13];
    ctx.fillStyle = ui.note ? '#4a8fe8' : ui.auto ? '#2f9a58' : '#e9b820'; rr(bt.x, bt.y, bt.w, bt.h, 16); ctx.fill();
    txt(ui.note ? 'ONLINE' : ui.auto ? 'AUTO' : 'MANUAL', bt.x + bt.w / 2, bt.y + (ui.note ? 23 : 18), 'italic 900 11px ' + FONT, '#14140c', 'center');
    if (!ui.note) txt('TAB', bt.x + bt.w / 2, bt.y + 31, '700 9px ' + FONT, '#3a3410', 'center');
  }

  function topCentre(b, dt) {
    var t = Math.ceil(b.timeLeft), i, m, a;
    ctx.fillStyle = 'rgba(12,14,30,0.9)'; rr(430, 4, 100, 44, 9); ctx.fill();
    txt('TIME LEFT', 480, 17, '700 9px ' + FONT, '#8fa0d8', 'center');
    txt((t / 60 | 0) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60), 480, 41, 'italic 900 24px ' + FONT, t <= 30 ? '#ff8a7a' : '#ffffff', 'center');
    for (i = msgs.length - 1; i >= 0; i--) {
      m = msgs[i]; m.t += dt;
      if (m.t > 4) { msgs.splice(i, 1); continue; }
    }
    for (i = 0; i < msgs.length; i++) {
      m = msgs[i]; a = Math.min(1, (4 - m.t) / 0.8) * (0.55 + 0.45 * (i + 1) / msgs.length);
      ctx.globalAlpha = a;
      txt(m.txt.toUpperCase(), 480, 64 + i * 15, 'italic 900 13px ' + FONT, m.col, 'center', 'rgba(10,10,24,0.9)', 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawCallouts(dt) {
    for (var si = 0; si < 2; si++) {
      var c = callout[si]; if (!c) continue;
      c.t += dt; if (c.t > 1.3) { callout[si] = null; continue; }
      var a = Math.min(1, c.t / 0.08, (1.3 - c.t) / 0.25), s = c.name.toUpperCase() + '!';
      ctx.font = 'italic 900 ' + (c.sig ? 17 : 14) + 'px ' + FONT;
      var w = ctx.measureText(s).width + 22, x = si ? AR.x1 - w - 8 : AR.x0 + 8, y = AR.y0 + 8;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(14,12,30,0.92)'; rr(x, y, w, c.sig ? 30 : 26, 4); ctx.fill();
      ctx.strokeStyle = c.sig ? '#ffe27a' : G.TCOL[c.type]; ctx.lineWidth = 3; ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText(s, x + w / 2, y + (c.sig ? 21 : 18));
      ctx.globalAlpha = 1;
    }
  }

  // ---- frame --------------------------------------------------------------
  R.draw = function (b, alpha, dt, ui) {
    var i, p, m, a, sx = 0, sy = 0;
    time += dt;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#07080f'; ctx.fillRect(0, 0, cv.width, cv.height);
    if (shake > 0.2) { sx = (Math.random() - 0.5) * shake; sy = (Math.random() - 0.5) * shake; shake *= Math.exp(-9 * dt); } else shake = 0;
    ctx.setTransform(scale, 0, 0, scale, offX + sx * scale, offY + sy * scale);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bg, 0, 0, W, H);

    var a0 = b.active(0), a1 = b.active(1), me = ui.me;
    // ground effects stay inside the arena
    ctx.save(); ctx.beginPath(); ctx.rect(AR.x0, AR.y0, AR.x1 - AR.x0, AR.y1 - AR.y0); ctx.clip();
    for (i = 0; i < b.zones.length; i++) drawZone(b.zones[i], me);

    // telegraphs
    for (i = 0; i < 2; i++) {
      m = i ? a1 : a0;
      if (m.state === 'wind' && m.cur && m.cur.shape !== 'self') drawTele(m, m.px + (m.x - m.px) * alpha, m.py + (m.y - m.py) * alpha, me);
    }
    for (i = 0; i < b.pend.length; i++) {
      p = b.pend[i];
      var col = G.TCOL[p.type], edge = p.side === me ? '#ffffff' : '#ff5a5a';
      if (p.k === 'blast') {
        a = 1 - p.t / p.T;
        ctx.globalAlpha = 0.16; ctx.fillStyle = col; circle(p.x, p.y, p.radius); ctx.fill();
        ctx.globalAlpha = 0.7; ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.stroke();
        ctx.globalAlpha = 0.34; circle(p.x, p.y, p.radius * a); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.fillRect(p.x - 6, p.y - 12 - (1 - a) * 240, 12, 12);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x - 3, p.y - 9 - (1 - a) * 240, 6, 6);
      } else {
        ctx.globalAlpha = 0.75; ctx.strokeStyle = col; ctx.lineWidth = 12; circle(p.x, p.y, Math.max(4, p.r - 14)); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; circle(p.x, p.y, p.r); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // player aim guide
    if (!ui.auto) {
      m = b.active(me);
      if (!m.fainted && m.state !== 'bench' && m.state !== 'faint') {
        var px = m.px + (m.x - m.px) * alpha, py = m.py + (m.y - m.py) * alpha;
        ctx.globalAlpha = 0.35; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 7]);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ui.mx, ui.my); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 0.8; circle(ui.mx, ui.my, 7); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(ui.mx - 1, ui.my - 1, 2, 2); ctx.globalAlpha = 1;
      }
    }

    // trainers
    ctx.imageSmoothingEnabled = true;
    for (i = 0; i < 2; i++) {
      var tx = i ? 916 : 44, ty = 276 + Math.sin(time * 2 + i) * 1.5;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(tx, 310, 16, 6, 0, 0, TAU); ctx.fill();
      ctx.drawImage(G.TRAINER[i], tx - 25, ty - 36, 50, 70);
    }
    // afterimages
    i = ghosts.length;
    while (i--) {
      p = ghosts[i]; p.t -= dt;
      if (p.t <= 0) { ghosts.splice(i, 1); continue; }
      ctx.globalAlpha = p.t / 0.22 * 0.45;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.dir, 1); ctx.drawImage(p.img, -24 * p.sc, -38 * p.sc, p.w, p.w); ctx.restore();
    }
    ctx.globalAlpha = 1;
    // creatures, far one first
    if (a0.y <= a1.y) { drawMon(b, a0, alpha, ui, dt); drawMon(b, a1, alpha, ui, dt); }
    else { drawMon(b, a1, alpha, ui, dt); drawMon(b, a0, alpha, ui, dt); }

    for (i = 0; i < b.proj.length; i++) drawProj(b.proj[i], alpha);
    drawShapes(dt);

    // particles
    i = 0;
    while (i < pn) {
      p = parts[i]; p.life -= dt;
      if (p.life <= 0) { pn--; parts[i] = parts[pn]; parts[pn] = p; continue; }
      if (p.drag) { a = Math.exp(-p.drag * dt); p.vx *= a; p.vy *= a; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      a = p.life / p.max * 2; ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.fillStyle = p.col; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      i++;
    }
    ctx.globalAlpha = 1;

    // weather and darkness
    if (b.weather) {
      ctx.strokeStyle = 'rgba(170,210,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (i = 0; i < 70; i++) {
        var rx = AR.x0 + ((i * 97 + time * 240) % (AR.x1 - AR.x0)), ry = AR.y0 + ((i * 53 + time * 620 + i * i * 7) % (AR.y1 - AR.y0));
        ctx.moveTo(rx, ry); ctx.lineTo(rx - 4, ry + 12);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(40,80,150,0.12)'; ctx.fillRect(AR.x0, AR.y0, AR.x1 - AR.x0, AR.y1 - AR.y0);
    }
    if (b.dark) {
      a = Math.min(1, b.dark.t / 0.5, (6 - b.dark.t) / 0.3);
      if (b.dark.side === me) { ctx.fillStyle = 'rgba(14,8,34,' + (0.38 * a) + ')'; ctx.fillRect(0, 88, W, 364); }
      else {
        m = b.active(me);
        var gr = ctx.createRadialGradient(m.x, m.y - 10, 60, m.x, m.y - 10, 250);
        gr.addColorStop(0, 'rgba(10,6,28,0)'); gr.addColorStop(1, 'rgba(10,6,28,' + (0.9 * a) + ')');
        ctx.fillStyle = gr; ctx.fillRect(0, 88, W, 364);
      }
    }

    // floating text
    i = 0;
    while (i < fn) {
      p = floats[i]; p.t -= dt;
      if (p.t <= 0) { fn--; floats[i] = floats[fn]; floats[fn] = p; continue; }
      a = p.t / p.max; p.y -= 34 * dt * (0.4 + a);
      ctx.globalAlpha = a < 0.3 ? a / 0.3 : 1;
      var grow = a > 0.85 ? 1 + (a - 0.85) * 3 : 1;
      txt(p.txt, p.x, p.y, 'italic 900 ' + (p.size * grow | 0) + 'px ' + FONT, p.col, 'center', 'rgba(14,12,28,0.95)', 4);
      i++;
    }
    ctx.globalAlpha = 1;
    drawCallouts(dt);

    // HUD (no screen shake)
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    panel(b, 0, dt); panel(b, 1, dt);
    topCentre(b, dt);
    bottomBar(b, ui);

    if (ui.note) txt(ui.note, AR.x0 + 8, AR.y1 - 8, '700 10px ' + FONT, '#ffffff', 'left', 'rgba(10,10,24,0.8)', 3);
    if (b.intro > 0) {
      ctx.fillStyle = 'rgba(6,8,18,0.35)'; ctx.fillRect(0, 88, W, 364);
      txt(b.sides[0].name.toUpperCase() + '  VS  ' + b.sides[1].name.toUpperCase(), 480, 250, 'italic 900 34px ' + FONT, '#ffffff', 'center', '#0c0e1e', 8);
      txt('ARENA: ' + R.theme.toUpperCase() + '   ·   GET READY', 480, 284, 'italic 800 15px ' + FONT, '#ffe27a', 'center', '#0c0e1e', 5);
    }
    if (banner) {
      banner.t += dt;
      if (banner.t > banner.max) banner = null;
      else {
        a = Math.min(1, banner.t / 0.12, (banner.max - banner.t) / 0.3);
        var gs = 1 + Math.max(0, 0.25 - banner.t) * 3;
        ctx.globalAlpha = a;
        txt(banner.txt, 480, 280, 'italic 900 ' + (64 * gs | 0) + 'px ' + FONT, banner.col, 'center', '#0c0e1e', 12);
        ctx.globalAlpha = 1;
      }
    }
    if (ui.paused) {
      ctx.fillStyle = 'rgba(6,8,18,0.6)'; ctx.fillRect(0, 0, W, H);
      txt('PAUSED', 480, 262, 'italic 900 56px ' + FONT, '#ffffff', 'center', '#0c0e1e', 10);
      txt('Press P or Esc to continue', 480, 296, '700 15px ' + FONT, '#c8d4f0', 'center');
    }
  };
})();
