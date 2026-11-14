/* Arena Beasts - HUD: a transparent 2D canvas on top of the 3D view. The layout uses a 960 x 540 logical frame.
   Style: flat warm-black plates, hairlines, brass accents, ivory text. Corner radius 2. Names in a book serif. */
const G = window.G;
const W = 960, H = 540;
const SANS = '"Fredoka","Trebuchet MS","Segoe UI",system-ui,sans-serif', SERIF = SANS;
const C = { plate: 'rgba(19,32,56,0.92)', surf: '#1c2d4d', surf2: '#2c4675', line: '#3a5586', line2: '#5574ab', brass: '#ffc83d', brassDim: '#c79a1e', ivory: '#ffffff', muted: '#cbd8ee', faint: '#93a8cc', blue: '#58a6ff', red: '#ff6b5e', good: '#5fd068', warn: '#ffc83d', bad: '#ff6b5e', ink: 'rgba(10,18,32,0.94)' };
let cv, ctx, scale = 1, offX = 0, offY = 0, dpr = 1, time = 0;

export const HUD = { W, H, theme: '' };

G.shade = function (hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; } else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
};

HUD.init = function (canvas) { cv = canvas; ctx = cv.getContext('2d'); HUD.resize(); };
HUD.resize = function () {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth || window.innerWidth, h = cv.clientHeight || window.innerHeight;
  cv.width = Math.max(2, Math.round(w * dpr)); cv.height = Math.max(2, Math.round(h * dpr));
  scale = Math.min(cv.width / W, cv.height / H);
  offX = (cv.width - W * scale) / 2; offY = (cv.height - H * scale) / 2;
  HUD.dpr = dpr; HUD.scale = scale; HUD.offX = offX; HUD.offY = offY; HUD.cw = cv.width; HUD.ch = cv.height;
};
const LP = { x: 0, y: 0 };
HUD.toLogical = function (cx, cy) {
  const r = cv.getBoundingClientRect();
  LP.x = ((cx - r.left) * dpr - offX) / scale; LP.y = ((cy - r.top) * dpr - offY) / scale;
  return LP;
};

// ---- pools ------------------------------------------------------------------
const MAXF = 48, floats = [];
let fn = 0;
for (let i = 0; i < MAXF; i++) floats.push({ x: 0, y: 0, h: 0, rise: 0, t: 0, max: 1, txt: '', col: '#fff', size: 14, jx: 0 });
// x, y: place in the arena (game pixels). h: height above the floor (game pixels).
HUD.floatTxt = function (x, y, h, s, col, size, dur) {
  let f;
  if (fn >= MAXF) { f = floats[0]; floats[0] = floats[fn - 1]; floats[fn - 1] = f; } else f = floats[fn++];
  f.x = x; f.y = y; f.h = h; f.rise = 0; f.jx = (Math.random() - 0.5) * 22; f.t = f.max = dur || 0.9; f.txt = s; f.col = col; f.size = size || 14;
};
let msgs = [], banner = null;
const callout = [null, null];
let ultCut = null;
HUD.reset = function () { fn = 0; msgs.length = 0; callout[0] = callout[1] = null; banner = null; ultCut = null; };
// the name card of an ultimate: portrait, title of the Beast, name of the ultimate
HUD.ultCut = function (side, name, type, id, epithet) { ultCut = { side, name, type, id, epithet: epithet || '', t: 0 }; };
HUD.banner = function (txt, col, dur) { banner = { txt, col: col || C.ivory, t: 0, max: dur || 1.4 }; };
HUD.msg = function (txt, col) { msgs.push({ txt, col, t: 0 }); if (msgs.length > 3) msgs.shift(); };
HUD.callout = function (side, name, type, sig) { callout[side] = { name, type, t: 0, sig }; };

// ---- drawing helpers ----------------------------------------------------------
function ls(v) { if ('letterSpacing' in ctx) ctx.letterSpacing = (v * 0.25) + 'px'; }
function txt(s, x, y, font, fill, align, stroke, sw, sp) {
  ctx.font = font; ctx.textAlign = align || 'left'; ls(sp || 0);
  if (stroke) { ctx.lineWidth = sw || 3; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
  ls(0);
}
// small upper-case label with wide spacing
function lab(s, x, y, size, fill, align, weight) { txt(s, x, y, (weight || 600) + ' ' + (size * 1.25).toFixed(1) + 'px ' + SANS, fill, align); }
// font with a smaller size when the text is wider than maxW
function fit(s, font, maxW, sp) {
  ctx.font = font; ls(sp || 0);
  const w = ctx.measureText(s).width; ls(0);
  return w <= maxW ? font : font.replace(/(\d+(\.\d+)?)px/, (m, n) => (Math.max(6, n * maxW / w)).toFixed(1) + 'px');
}
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r === undefined ? 8 : r); else ctx.rect(x, y, w, h); }
function plate(x, y, w, h, fill, edge) { ctx.fillStyle = fill || C.plate; rr(x, y, w, h); ctx.fill(); if (edge !== null) { ctx.strokeStyle = edge || C.line2; ctx.lineWidth = 1; rr(x + 0.5, y + 0.5, w - 1, h - 1); ctx.stroke(); } }
function hpCol(f) { return f > 0.5 ? C.good : f > 0.2 ? C.warn : C.bad; }

const BTN = HUD.buttons = [];
(function () {
  let i;
  for (i = 0; i < 4; i++) BTN.push({ x: 8 + i * 189, y: 456, w: 183, h: 38, act: 'move', i });
  BTN.push({ x: 764, y: 456, w: 188, h: 38, act: 'sig', i: 0 });
  for (i = 0; i < 6; i++) BTN.push({ x: 8 + i * 124, y: 498, w: 118, h: 38, act: 'sw', i });
  BTN.push({ x: 752, y: 498, w: 62, h: 38, act: 'dodge', i: 0 });
  BTN.push({ x: 818, y: 498, w: 62, h: 38, act: 'guard', i: 0 });
  BTN.push({ x: 884, y: 498, w: 68, h: 38, act: 'auto', i: 0 });
  BTN.push({ x: 884, y: 424, w: 68, h: 25, act: 'menu', i: 0 });   // opens the pause menu (js/ui.js)
  BTN.push({ x: 214, y: 424, w: 150, h: 25, act: 'cmd', i: 0 });   // the 2 commands of the Keeper (js/keeper.js)
  BTN.push({ x: 370, y: 424, w: 150, h: 25, act: 'cmd', i: 1 });
})();
HUD.hitButton = function (x, y) {
  for (let i = 0; i < BTN.length; i++) { const b = BTN[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; }
  return null;
};

// label with an optional colour square in front. Returns its width.
function tag(s, x, y, type, mir, col) {
  ctx.font = '600 11.5px ' + SANS;
  const tw = ctx.measureText(s).width, w = tw + (type ? 18 : 0), x0 = mir ? x - w : x;
  if (type) G.drawTypeIcon(ctx, type, x0 + 7, y - 4, 14);
  txt(s, x0 + (type ? 18 : 0), y, '600 11.5px ' + SANS, col || C.ivory, 'left');
  return w + 9;
}

function panel(b, si, dt) {
  const side = b.sides[si], m = side.team[side.active], d = m.d, mir = si === 1, team = si ? C.red : C.blue;
  let i, k, t;
  const X = v => mir ? W - v : v;
  const al = mir ? 'right' : 'left', ar = mir ? 'left' : 'right';
  plate(mir ? W - 358 : 6, 6, 352, 74);
  ctx.fillStyle = team; ctx.fillRect(mir ? W - 8 : 6, 6, 2, 74);
  // portrait in a square frame
  const px = mir ? W - 72 : 16;
  ctx.fillStyle = C.surf; ctx.fillRect(px, 14, 56, 56);
  ctx.save(); ctx.beginPath(); ctx.rect(px, 14, 56, 56); ctx.clip();
  ctx.translate(px + 28, 42); ctx.scale(mir ? -1 : 1, 1); ctx.drawImage(G.SPR[m.id].idle[0], -32, -33, 64, 64); ctx.restore();
  if (m.fainted) { ctx.fillStyle = 'rgba(10,18,32,0.65)'; ctx.fillRect(px, 14, 56, 56); }
  ctx.strokeStyle = C.line2; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, 14.5, 55, 55);
  const nm = d.name.toUpperCase();
  txt(d.name, X(82), 31, fit(d.name, '700 20px ' + SANS, 200), C.ivory, al);
  txt(Math.ceil(m.hp / m.maxHp * 100) + '%', X(348), 30, '700 15px ' + SANS, C.ivory, ar);
  // labels: types, stat stages, status
  let cx = 82;
  for (i = 0; i < d.types.length; i++) cx += tag(d.types[i], X(cx), 46, d.types[i], mir);
  for (k in m.stages) { t = m.stages[k]; if (t !== 0 && cx < 318) cx += tag(G.STAT_SHORT[k] + (t > 0 ? ' +' : ' ') + t, X(cx), 46, null, mir, t > 0 ? C.blue : C.bad); }
  if (m.status && cx < 318) cx += tag(G.STATUS_NAME[m.status], X(cx), 46, null, mir, G.STATUS_COL[m.status]);
  if (m.conf > 0 && cx < 318) cx += tag('Confused', X(cx), 46, null, mir, '#e8b8d8');
  if (m.brace > 0 && cx < 318) cx += tag('Braced', X(cx), 46, null, mir, C.brass);
  // HP bar with a trailing loss marker
  m.shownHp += (m.hp - m.shownHp) * Math.min(1, dt * 4);
  const f = Math.max(0, m.hp / m.maxHp), fs = Math.max(f, m.shownHp / m.maxHp), bw = 266, bx = mir ? W - 82 - bw : 82;
  ctx.save(); rr(bx, 52, bw, 10, 5); ctx.clip();
  ctx.fillStyle = '#0d1626'; ctx.fillRect(bx, 52, bw, 10);
  ctx.fillStyle = C.ivory; if (mir) ctx.fillRect(bx + bw * (1 - fs), 52, bw * fs, 10); else ctx.fillRect(bx, 52, bw * fs, 10);
  ctx.fillStyle = hpCol(f); if (mir) ctx.fillRect(bx + bw * (1 - f), 52, bw * f, 10); else ctx.fillRect(bx, 52, bw * f, 10);
  ctx.restore();
  // signature charge
  const c = m.charge / 100;
  ctx.fillStyle = '#0d1626'; ctx.fillRect(bx, 66, bw, 4);
  ctx.fillStyle = c >= 1 ? (Math.sin(time * 8) > 0 ? C.ivory : C.brass) : C.brassDim; if (mir) ctx.fillRect(bx + bw * (1 - c), 66, bw * c, 4); else ctx.fillRect(bx, 66, bw * c, 4);
  // team markers and the player name
  for (i = 0; i < side.team.length; i++) {
    t = side.team[i]; const qx = X(10 + i * 12) - (mir ? 7 : 0);
    ctx.fillStyle = t.fainted ? C.line : hpCol(t.hp / t.maxHp); ctx.fillRect(qx, 86, 7, 7);
    if (i === side.active) { ctx.strokeStyle = C.ivory; ctx.lineWidth = 1; ctx.strokeRect(qx - 1.5, 84.5, 10, 10); }
  }
  txt(side.name, X(88), 94, '700 12.5px ' + SANS, team, al, C.ink, 3.5);
  // the Keeper of this side: the crest of the guild and the crowd favour
  if (side.keeper) {
    const fv = Math.max(0, Math.min(1, side.favour / 100)), fw = 100, fx0 = mir ? W - 248 - fw : 248;
    G.drawTypeIcon(ctx, side.keeper.guild, X(236), 90, 13);
    ctx.fillStyle = C.ink; ctx.fillRect(fx0 - 1, 86, fw + 2, 8);
    ctx.fillStyle = C.brass; if (mir) ctx.fillRect(fx0 + fw * (1 - fv), 87, fw * fv, 6); else ctx.fillRect(fx0, 87, fw * fv, 6);
  }
}

function keycap(s, x, y) { txt(s, x, y + 8, '600 10px ' + SANS, C.faint, 'right'); }

function bottomBar(b, ui) {
  const side = b.sides[ui.me], m = side.team[side.active], fo = b.active(1 - ui.me), d = m.d;
  let i, bt, mv, cd, e, col, lb, lc, t, f, nm;
  const canAct = !m.fainted && m.state !== 'enter';
  ctx.fillStyle = 'rgba(19,32,56,0.96)'; ctx.fillRect(-400, 450, W + 800, 90);
  ctx.fillStyle = C.line2; ctx.fillRect(-400, 450, W + 800, 1);
  for (i = 0; i < 4; i++) {
    bt = BTN[i]; mv = d.moves[i]; cd = m.cds[i]; col = G.TCOL[mv.type];
    const off = cd > 0 || !canAct;
    plate(bt.x, bt.y, bt.w, bt.h, C.surf, off ? C.line : C.line2);
    ctx.fillStyle = off ? G.shade(col, -0.45) : col; ctx.fillRect(bt.x + 1, bt.y + 1, 3, bt.h - 2);
    if (cd > 0) { ctx.fillStyle = C.brassDim; ctx.fillRect(bt.x + 4, bt.y + bt.h - 3, (bt.w - 5) * (1 - cd / mv.cd), 2); }
    nm = mv.name; ctx.globalAlpha = off ? 0.5 : 1; G.drawTypeIcon(ctx, mv.type, bt.x + 17, bt.y + 13, 18); ctx.globalAlpha = 1;
    txt(nm, bt.x + 30, bt.y + 17, fit(nm, '600 13px ' + SANS, bt.w - 78), off ? C.muted : C.ivory, 'left');
    lb = G.SHAPE_LABEL[mv.shape]; lc = C.faint;
    if (mv.power > 0 && fo && !fo.fainted) {
      e = G.eff(mv.type, fo.d.types);
      if (e >= 2) { lb = 'Super effective'; lc = C.good; } else if (e === 0) { lb = 'No effect'; lc = C.bad; } else if (e < 1) { lb = 'Not very effective'; lc = C.warn; }
    }
    txt(lb, bt.x + 12, bt.y + 32, '500 11.5px ' + SANS, lc, 'left');
    txt(cd > 0 ? cd.toFixed(1) : (mv.power > 0 ? '' + mv.power * (mv.count || 1) : '–'), bt.x + bt.w - 9, bt.y + 32, '700 17px ' + SANS, cd > 0 ? C.muted : C.ivory, 'right');
    keycap(G.KEYS.text('move' + (i + 1)), bt.x + bt.w - 8, bt.y + 4);
  }
  // signature power
  bt = BTN[4]; f = m.charge / 100;
  const ready = f >= 1;
  plate(bt.x, bt.y, bt.w, bt.h, ready ? C.brass : C.surf, ready ? C.brass : C.brassDim);
  if (!ready) { ctx.fillStyle = 'rgba(194,161,92,0.2)'; ctx.fillRect(bt.x + 1, bt.y + 1, (bt.w - 2) * f, bt.h - 2); }
  nm = d.sig.name;
  txt(nm, bt.x + 10, bt.y + 17, fit(nm, '700 13.5px ' + SANS, bt.w - 34), ready ? '#231a00' : C.ivory, 'left');
  txt(ready ? 'Signature ready' : 'Signature ' + (m.charge | 0) + '%', bt.x + 10, bt.y + 32, '500 11.5px ' + SANS, ready ? '#4a3a08' : C.muted, 'left');
  txt(G.KEYS.text('sig', 1), bt.x + bt.w - 8, bt.y + 13, '600 10px ' + SANS, ready ? '#4a3a08' : C.faint, 'right');
  // team
  for (i = 0; i < 6; i++) {
    bt = BTN[5 + i]; t = side.team[i];
    if (!t) continue;
    const act = i === side.active;
    plate(bt.x, bt.y, bt.w, bt.h, act ? C.surf2 : C.surf, act ? C.brass : C.line);
    ctx.globalAlpha = t.fainted ? 0.3 : 1;
    ctx.drawImage(G.SPR[t.id].idle[0], bt.x + 3, bt.y + 1, 36, 36);
    nm = t.d.name;
    txt(nm, bt.x + 43, bt.y + 16, fit(nm, '600 12.5px ' + SANS, bt.w - 62), C.ivory, 'left');
    f = t.hp / t.maxHp;
    ctx.fillStyle = '#0d1626'; ctx.fillRect(bt.x + 43, bt.y + 22, 66, 5);
    ctx.fillStyle = hpCol(f); ctx.fillRect(bt.x + 43, bt.y + 22, 66 * f, 5);
    ctx.fillStyle = C.brassDim; ctx.fillRect(bt.x + 43, bt.y + 29, 66 * t.charge / 100, 1);
    ctx.globalAlpha = 1;
    if (!act && !t.fainted && side.switchCd > 0) { ctx.fillStyle = 'rgba(10,18,32,0.6)'; ctx.fillRect(bt.x + 1, bt.y + 1, (bt.w - 2) * Math.min(1, side.switchCd / 8), bt.h - 2); }
    if (ui.pick === i && !act) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; rr(bt.x + 1, bt.y + 1, bt.w - 2, bt.h - 2); ctx.stroke(); }   // selected with the scroll wheel
    keycap(G.KEYS.text('sw' + (i + 1), 1), bt.x + bt.w - 6, bt.y + 4);
  }
  // dodge, guard, auto
  bt = BTN[11]; f = m.dodgeCd > 0 ? 1 - m.dodgeCd / 1.7 : 1;
  plate(bt.x, bt.y, bt.w, bt.h, C.surf, f >= 1 ? C.line2 : C.line);
  ctx.fillStyle = 'rgba(111,159,216,' + (f >= 1 ? 0.22 : 0.1) + ')'; ctx.fillRect(bt.x + 1, bt.y + 1 + (bt.h - 2) * (1 - f), bt.w - 2, (bt.h - 2) * f);
  lab('Dodge', bt.x + bt.w / 2, bt.y + 18, 10, f >= 1 ? C.ivory : C.muted, 'center');
  lab(G.KEYS.text('dodge', 1), bt.x + bt.w / 2, bt.y + 30, 8, C.faint, 'center');
  bt = BTN[12]; f = m.guardM / 100;
  plate(bt.x, bt.y, bt.w, bt.h, C.surf, m.guarding ? C.brass : C.line2);
  ctx.fillStyle = m.guardLock ? 'rgba(207,107,88,0.3)' : 'rgba(194,161,92,' + (m.guarding ? 0.4 : 0.2) + ')'; ctx.fillRect(bt.x + 1, bt.y + 1 + (bt.h - 2) * (1 - f), bt.w - 2, (bt.h - 2) * f);
  lab('Guard', bt.x + bt.w / 2, bt.y + 18, 10, m.guardLock ? C.bad : C.ivory, 'center');
  lab(G.KEYS.text('guard', 1), bt.x + bt.w / 2, bt.y + 30, 8, C.faint, 'center');
  bt = BTN[13];
  plate(bt.x, bt.y, bt.w, bt.h, C.surf, ui.auto || ui.note ? C.brass : C.line2);
  lab(ui.note ? 'Online' : ui.auto ? 'Auto' : 'Manual', bt.x + bt.w / 2, bt.y + (ui.note ? 23 : 18), 10, ui.auto || ui.note ? C.brass : C.ivory, 'center');
  if (!ui.note) lab(G.KEYS.text('auto', 1), bt.x + bt.w / 2, bt.y + 30, 8, C.faint, 'center');
  bt = BTN[14];
  plate(bt.x, bt.y, bt.w, bt.h, C.surf, C.line2);
  lab('Menu', bt.x + 25, bt.y + 16, 9.5, C.ivory, 'center');
  lab('Esc', bt.x + 53, bt.y + 16, 8, C.faint, 'center');
  // the Keeper of the player: the crowd favour and the 2 commands. A command shows its cost and its key.
  const kp = side.keeper;
  if (kp) {
    const fv = Math.max(0, Math.min(100, side.favour));
    plate(8, 424, 200, 25, C.plate, C.line2);
    G.drawTypeIcon(ctx, kp.guild, 21, 436.5, 16);
    lab('Crowd', 34, 441, 9.5, C.ivory, 'left');
    ctx.fillStyle = '#0d1626'; rr(84, 432, 88, 9, 4); ctx.fill();
    if (fv >= 1) { ctx.fillStyle = C.brass; rr(84, 432, 88 * fv / 100, 9, 4); ctx.fill(); }
    txt('' + (fv | 0), 202, 441, '700 12.5px ' + SANS, C.ivory, 'right');
    for (i = 0; i < 2; i++) {
      bt = BTN[15 + i];
      const kc = G.KEEPER.CMDS[kp.cmds[i]], ok = fv >= kc.cost && side.cmdCd <= 0 && canAct;
      plate(bt.x, bt.y, bt.w, bt.h, C.surf, ok ? C.brass : C.line);
      ctx.fillStyle = 'rgba(255,200,61,' + (ok ? 0.24 : 0.1) + ')'; ctx.fillRect(bt.x + 1, bt.y + 1, (bt.w - 2) * Math.min(1, fv / kc.cost), bt.h - 2);
      txt(kc.name, bt.x + 9, bt.y + 17, fit(kc.name, '600 12.5px ' + SANS, bt.w - 66), ok ? C.ivory : C.muted, 'left');
      txt('' + kc.cost, bt.x + bt.w - 28, bt.y + 17, '700 12.5px ' + SANS, ok ? C.brass : C.faint, 'right');
      txt(G.KEYS.text('cmd' + (i + 1), 1), bt.x + bt.w - 7, bt.y + 16, '600 10px ' + SANS, C.faint, 'right');
    }
  }
}

function topCentre(b, dt) {
  const t = Math.ceil(b.timeLeft);
  let i, m, a;
  plate(434, 6, 92, 40);
  lab('Time', 480, 18, 8, C.faint, 'center');
  txt((t / 60 | 0) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60), 480, 40, '700 22px ' + SANS, t <= 30 ? C.bad : C.ivory, 'center');
  for (i = msgs.length - 1; i >= 0; i--) { m = msgs[i]; m.t += dt; if (m.t > 4) msgs.splice(i, 1); }
  for (i = 0; i < msgs.length; i++) {
    m = msgs[i]; a = Math.min(1, (4 - m.t) / 0.8) * (0.55 + 0.45 * (i + 1) / msgs.length);
    ctx.globalAlpha = a;
    txt(m.txt, 480, 64 + i * 16, '600 13px ' + SANS, m.col, 'center', C.ink, 4);
  }
  ctx.globalAlpha = 1;
}

function drawUltCut(dt) {
  const c = ultCut;
  if (!c) return;
  c.t += dt;
  if (c.t > 1.7) { ultCut = null; return; }
  const a = Math.min(1, c.t / 0.1, (1.7 - c.t) / 0.3), w = 430, h = 60, e = Math.min(1, c.t / 0.18), slide = (1 - e * (2 - e)) * 160;
  const x = c.side ? W - 14 - w + slide : 14 - slide, y = 100, col = G.TCOL[c.type], pw = 96, px = c.side ? x + w - pw : x, tx = c.side ? x + 18 : x + pw + 18;
  ctx.save(); ctx.globalAlpha = a;
  rr(x, y, w, h, 12); ctx.clip();
  ctx.fillStyle = 'rgba(13,22,38,0.95)'; ctx.fillRect(x, y, w, h);
  // a slanted block in the type colour behind the portrait
  ctx.fillStyle = col; ctx.beginPath();
  if (c.side) { ctx.moveTo(x + w - pw - 22, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - pw + 6, y + h); }
  else { ctx.moveTo(x, y); ctx.lineTo(x + pw + 22, y); ctx.lineTo(x + pw - 6, y + h); ctx.lineTo(x, y + h); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(x, y, w, 2);
  const spr = G.SPR[c.id] && G.SPR[c.id].idle[0];
  if (spr) { ctx.save(); ctx.translate(px + pw / 2, y + h / 2 + 2); ctx.scale(c.side ? -1 : 1, 1); ctx.drawImage(spr, -45, -47, 90, 90); ctx.restore(); }
  ctx.restore();
  ctx.globalAlpha = a;
  ctx.strokeStyle = C.brass; ctx.lineWidth = 2; rr(x + 1, y + 1, w - 2, h - 2, 11); ctx.stroke();
  G.drawTypeIcon(ctx, c.type, tx + 10, y + 18, 19);
  txt(c.epithet || 'Signature power', tx + 26, y + 23, '600 13px ' + SANS, C.brass, 'left');
  let fs = 25; ctx.font = '700 ' + fs + 'px ' + SANS;
  while (fs > 15 && ctx.measureText(c.name).width > w - pw - 40) { fs--; ctx.font = '700 ' + fs + 'px ' + SANS; }
  txt(c.name, tx, y + 49, '700 ' + fs + 'px ' + SANS, C.ivory, 'left');
  ctx.globalAlpha = 1;
}

function drawCallouts(dt) {
  for (let si = 0; si < 2; si++) {
    const c = callout[si]; if (!c) continue;
    c.t += dt; if (c.t > 1.3) { callout[si] = null; continue; }
    const a = Math.min(1, c.t / 0.08, (1.3 - c.t) / 0.25), s = c.name + '!', font = (c.sig ? '700 16px ' + SANS : '600 14px ' + SANS), sp = 0;
    ctx.font = font; ls(sp);
    const w = ctx.measureText(s).width + 26, slide = (1 - Math.min(1, c.t / 0.12)) * 24, x = si ? W - 10 - w + slide : 10 - slide, y = 104, h = c.sig ? 28 : 24; ls(0);
    ctx.globalAlpha = a;
    plate(x, y, w, h, C.plate, c.sig ? C.brass : C.line2);
    ctx.fillStyle = c.sig ? C.brass : G.TCOL[c.type]; ctx.fillRect(si ? x + w - 4 : x + 1, y + 1, 3, h - 2);
    txt(s, x + w / 2 + (si ? -1 : 1), y + (c.sig ? 19 : 16), font, C.ivory, 'center', null, 0, sp);
    ctx.globalAlpha = 1;
  }
}

/* One HUD frame. proj(x, y, h, out) changes an arena place into logical screen coordinates.
   bars: [{ x, y, h, f }] small HP bars above the creatures. */
const PP = { x: 0, y: 0 };
HUD.draw = function (b, ui, dt, proj, bars) {
  let i, p, a;
  time += dt;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(scale, 0, 0, scale, offX, offY);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // darkness of Nightfall for the player who is not its owner
  if (b.dark && b.dark.side !== ui.me) {
    a = Math.min(1, b.dark.t / 0.5, (6 - b.dark.t) / 0.3);
    const m = b.active(ui.me); proj(m.x, m.y, 20, PP);
    const gr = ctx.createRadialGradient(PP.x, PP.y, 70, PP.x, PP.y, 270);
    gr.addColorStop(0, 'rgba(8,6,10,0)'); gr.addColorStop(1, 'rgba(8,6,10,' + (0.93 * a) + ')');
    ctx.fillStyle = gr; ctx.fillRect(-400, -200, W + 800, H + 400);
  }
  // small HP bars
  for (i = 0; i < bars.length; i++) {
    p = bars[i]; if (!p.on) continue;
    proj(p.x, p.y, p.h, PP);
    const bw = 46, f = Math.max(0, p.f);
    ctx.fillStyle = C.ink; ctx.fillRect(PP.x - bw / 2 - 1, PP.y - 3, bw + 2, 6);
    ctx.fillStyle = hpCol(f); ctx.fillRect(PP.x - bw / 2, PP.y - 2, bw * f, 4);
    ctx.fillStyle = p.side ? C.red : C.blue; ctx.fillRect(PP.x - bw / 2 - 1, PP.y + 4, bw + 2, 1);
  }
  // floating text
  i = 0;
  while (i < fn) {
    p = floats[i]; p.t -= dt;
    if (p.t <= 0) { fn--; floats[i] = floats[fn]; floats[fn] = p; continue; }
    a = p.t / p.max; p.rise += 34 * dt * (0.4 + a);
    proj(p.x, p.y, p.h, PP);
    ctx.globalAlpha = a < 0.3 ? a / 0.3 : 1;
    const grow = a > 0.85 ? 1 + (a - 0.85) * 2.5 : 1, num = p.size >= 17;
    txt(p.txt, PP.x + p.jx, PP.y - p.rise, '700 ' + (p.size * (num ? 1.15 : 1) * grow).toFixed(1) + 'px ' + SANS, p.col, 'center', C.ink, 4);
    i++;
  }
  ctx.globalAlpha = 1;
  drawCallouts(dt);
  drawUltCut(dt);
  panel(b, 0, dt); panel(b, 1, dt);
  topCentre(b, dt);
  bottomBar(b, ui);
  if (ui.note) lab(ui.note, 876, 441, 8.5, C.muted, 'right');
  if (b.intro > 0) {
    a = Math.min(1, b.intro / 0.3);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(13,22,38,0.82)'; ctx.fillRect(-400, 218, W + 800, 84);
    ctx.fillStyle = C.brassDim; ctx.fillRect(-400, 218, W + 800, 1); ctx.fillRect(-400, 301, W + 800, 1);
    txt(b.sides[0].name + '  vs  ' + b.sides[1].name, 480, 262, '700 32px ' + SANS, C.ivory, 'center');
    lab('Arena: ' + HUD.theme, 480, 288, 12, C.brass, 'center');
    if (b.sides[0].keeper && b.sides[1].keeper) lab(G.KEEPER.GUILDS[b.sides[0].keeper.guild].name + '  ·  ' + G.KEEPER.GUILDS[b.sides[1].keeper.guild].name, 480, 236, 10, C.muted, 'center');
    ctx.globalAlpha = 1;
  }
  if (banner) {
    banner.t += dt;
    if (banner.t > banner.max) banner = null;
    else {
      a = Math.min(1, banner.t / 0.15, (banner.max - banner.t) / 0.3);
      const sp = 0, s = banner.txt, gs = 1 + Math.max(0, 0.2 - banner.t) * 2;
      ctx.globalAlpha = a;
      
      txt(s, 480, 292, '700 ' + (58 * gs | 0) + 'px ' + SANS, banner.col, 'center', C.ink, 10);
      ctx.globalAlpha = 1;
    }
  }
  // a stopped battle: the pause menu of js/ui.js (a page element) is on top of this canvas
};
HUD.clear = function () { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); };
