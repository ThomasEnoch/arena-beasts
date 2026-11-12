/* Prismpeacock (Spectrail) - polished silver peacock with engraved feather lines, a sapphire crest
   and a fan of 15 glass feathers. Heart piece: the eye spots of the feathers. One feather has a crack filled with gold. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, cone, ball, crystal, wing, torus, canvasTex } from '../geo.js';

const SILVER = '#ccd3dd', DARK = '#566078', GOLD = '#e8bc48', BLUE = '#1c4fb4', PALE = '#dfe3ea';
const SILV = { col: '#c8d0da', metal: 1, rough: 0.2, env: 1.3 };
const GOLDM = { col: '#f0c44c', metal: 0.9, rough: 0.22, env: 1.2 };
const KINTS = { col: '#ffd45a', metal: 0.8, rough: 0.2, env: 1.3, glow: '#ffb020', glowK: 0.7 };   // gold that fills the crack
const STEELF = { col: '#aeb8c8', metal: 1, rough: 0.16, env: 1.5 };
const SAPH = { col: '#2a56e6', rough: 0.06, glow: '#2450ff', glowK: 1.1, flat: true, env: 1.7, noOut: true };
const PRISM = { col: '#dfe6f6', rough: 0.05, glow: '#c8dcff', glowK: 1.1, flat: true, env: 1.5 };
const ENGR = { col: '#3c4660', metal: 1, rough: 0.4, env: 0.8 };
const MARK = { col: '#dfe3ea', metal: 0.55, rough: 0.3, env: 1, noOut: true };
const R2D = 180 / Math.PI, LEAN = 20, FA = 12 / R2D, GA = 36 / R2D, ROOT = [-0.4, 0.93, 0];
const FN = new THREE.Vector3(Math.cos(LEAN / R2D), Math.sin(LEAN / R2D), 0);   // normal of the fan plane
const CRACKED = 11, SPOT = 0.08 + 0.8 * (1.15 - 0.08);                          // cracked feather; distance hub -> eye spot of the centre feather
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
const ease = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
const cl = (v, a, b) => v < a ? a : v > b ? b : v, fr01 = x => x - Math.floor(x), TAU = Math.PI * 2;
// One leg of a walk. ph = 0..1 of the cycle, air = the part of the cycle that the foot is in the air.
// G[0] swing: +1 = the foot is in front, -1 = behind (fast forward in the air, slow back on the ground).
// G[1] lift 0..1 (fast up, slower down). G[2] 0..1 in the air (-1 on the ground). G[3] pulse right after the foot lands.
const G = [0, 0, 0, 0];
function gait(ph, air) {
  if (ph < air) { const q = ph / air; G[0] = -1 + 2 * ease(q); G[1] = Math.pow(Math.sin(Math.PI * Math.pow(q, 0.8)), 0.75); G[2] = q; G[3] = 0; }
  else { const q = (ph - air) / (1 - air); G[0] = 1 - 2 * q; G[1] = 0; G[2] = -1; G[3] = q < 0.22 ? 1 - q / 0.22 : 0; }
  return G;
}
// feather direction in model space (for the spring of each feather)
const fdir = i => { const sp = (i - 7) * 12 / R2D, l = LEAN / R2D; return [-Math.sin(l) * Math.cos(sp), Math.cos(l) * Math.cos(sp), Math.sin(sp)]; };
const fspring = i => ({ k: 34 + (i % 3) * 5 + Math.abs(i - 7) * 1.6, d: 3.4 + (i % 4) * 0.55, amt: 0.26, drag: 4, dir: fdir(i) });
// loose parts: the 15 feathers follow late, each with its own spring, so the fan sways and settles feather after feather
const DYN = [{ b: ['fan'], k: 62, d: 6, amt: 0.3, drag: 1.5, dir: [-0.34, 0.94, 0] }];
for (let i = 0; i < 15; i++) DYN.push(Object.assign({ b: ['f' + i] }, fspring(i)));
DYN.push(Object.assign({ b: ['crack'] }, fspring(CRACKED)));                       // the gold in the crack moves with its feather
for (const n of ['crest', 'gems']) DYN.push({ b: [n], k: 70, d: 4.5, amt: 0.75, drag: 3, dir: [-0.1, 1, 0] });
// 15 glass materials: the glow goes from magenta (f0, right side) to cyan (f14, left side); the glass tint is shifted (dichroic)
const FEA = [];
for (let i = 0; i < 15; i++) {
  const hue = 0.87 - i / 14 * 0.37, c = new THREE.Color();
  FEA.push({ col: '#' + c.setHSL((hue + 0.1) % 1, 0.85, 0.66).getHexString(), glow: '#' + c.setHSL(hue, 1, 0.55).getHexString(), glowK: 3, op: 0.62, rough: 0.06, env: 1.6, noOut: true });
}
let texA = null, texB = null, texM = null;
function featherTex(em) {
  return canvasTex(256, 64, (g, W, H) => {
    g.fillStyle = em ? '#2c2c2c' : '#d6d6d6'; g.fillRect(0, 0, W, H);
    g.strokeStyle = em ? '#585858' : '#f4f4f4'; g.lineWidth = 2;
    for (let k = 0; k < 24; k++) { const x = k * W / 22; g.beginPath(); g.moveTo(x + W * 0.07, 0); g.lineTo(x, H / 2); g.lineTo(x + W * 0.07, H); g.stroke(); }
    g.strokeStyle = em ? '#8a8a8a' : '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    const ex = W * 0.8, ey = H / 2;
    g.fillStyle = em ? '#0c0c0c' : '#3a3a48'; g.beginPath(); g.ellipse(ex, ey, W * 0.092, H * 0.4, 0, 0, 7); g.fill();
    g.fillStyle = em ? '#b4b4b4' : '#e8e8e8'; g.beginPath(); g.ellipse(ex, ey, W * 0.066, H * 0.29, 0, 0, 7); g.fill();
    g.fillStyle = em ? '#141414' : '#50506a'; g.beginPath(); g.ellipse(ex + W * 0.006, ey, W * 0.042, H * 0.18, 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ex, ey, W * 0.026, H * 0.115, 0, 0, 7); g.fill();
  });
}
// maker's mark: an engraved eye spot
function markTex() {
  return canvasTex(96, 96, (g, W, H) => {
    const cx = W / 2, cy = H / 2;
    g.fillStyle = '#c4cad6'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#c89a30'; g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, W * 0.44, 0, 7); g.stroke();
    g.strokeStyle = '#3a4258'; g.lineWidth = 2;
    for (let k = 0; k < 16; k++) { const a = k / 16 * 6.2832; g.beginPath(); g.moveTo(cx + Math.cos(a) * W * 0.3, cy + Math.sin(a) * H * 0.3); g.lineTo(cx + Math.cos(a + 0.25) * W * 0.4, cy + Math.sin(a + 0.25) * H * 0.4); g.stroke(); }
    g.fillStyle = '#2c3448'; g.beginPath(); g.ellipse(cx, cy, W * 0.25, H * 0.3, 0, 0, 7); g.fill();
    g.fillStyle = '#d8dce6'; g.beginPath(); g.ellipse(cx, cy, W * 0.19, H * 0.235, 0, 0, 7); g.fill();
    g.fillStyle = '#1c4fb4'; g.beginPath(); g.ellipse(cx, cy + H * 0.02, W * 0.13, H * 0.16, 0, 0, 7); g.fill();
    g.fillStyle = '#10182c'; g.beginPath(); g.ellipse(cx, cy + H * 0.03, W * 0.06, H * 0.075, 0, 0, 7); g.fill();
  });
}
// one geometry from several (same material)
function join(gs, uv) {
  return mergeGeometries(gs.map(g => {
    g = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && !(uv && k === 'uv')) g.deleteAttribute(k);
    return g;
  }));
}
// glass feather: long axis +Y, width Z, thin X; with the eye-spot ball near the tip
function featherGeo(L, off) {
  const s0 = 0.08, l = L - s0;
  const g = wing([[s0, -0.01], [s0 + 0.3 * l, -0.03], [s0 + 0.6 * l, -0.08], [s0 + 0.8 * l, -0.09], [s0 + 0.94 * l, -0.055], [L, 0], [s0 + 0.94 * l, 0.055], [s0 + 0.8 * l, 0.09], [s0 + 0.6 * l, 0.08], [s0 + 0.3 * l, 0.03], [s0, 0.01]], 0.014);
  g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2);
  const eb = ball(0.056, 12, 8), U = eb.getAttribute('uv');
  for (let i = 0; i < U.count; i++) U.setXY(i, 0.8, 0.5);
  eb.scale(0.55, 1.25, 1); eb.translate(0, s0 + 0.8 * l, 0);
  const m = join([g, eb], true);
  m.translate(off, 0, 0);
  return m;
}
// the crack: a forked zigzag of gold across the feather (feather space: +Y long axis, Z width)
function crackGeo(off) {
  const seg = (a, b, r) => tube([[off, a[0], a[1]], [off, b[0], b[1]]], [r, r], { ring: 5, seg: 1 });
  const P = [[0.47, -0.062], [0.53, -0.022], [0.575, -0.04], [0.64, 0.004], [0.675, -0.012], [0.74, 0.03], [0.77, 0.014], [0.83, 0.064]], gs = [];
  for (let i = 0; i < P.length - 1; i++) gs.push(seg(P[i], P[i + 1], 0.0115));
  gs.push(seg([0.64, 0.004], [0.685, 0.046], 0.009), seg([0.685, 0.046], [0.72, 0.076], 0.007), seg([0.575, -0.04], [0.62, -0.072], 0.008));
  for (const p of P) gs.push(ball(0.0125, 6, 5).translate(off, p[0], p[1]));
  return join(gs);
}
function aimY(dx, dy, dz) { const l = Math.hypot(dx, dy, dz); return [0, Math.atan2(-dz, dx) * R2D, -Math.acos(dy / l) * R2D]; }
// wing plate: [cx, cy, cz, rx, ry, rz]
const WG = [-0.04, 0.86, 0.2, 0.27, 0.115, 0.05];
function wingZ(x, y) { const q = 1 - Math.pow((x - WG[0]) / WG[3], 2) - Math.pow((y - WG[1]) / WG[4], 2); return WG[2] + WG[5] * Math.sqrt(Math.max(0, q)) + 0.004; }
function sScroll(ax, ay, bx, by, ra, rb) {
  const pts = [], n = 14, turns = 1.35, add = (x, y) => pts.push([x, y, wingZ(x, y) + 0.008]);
  for (let i = 0; i <= n; i++) { const u = i / n, a = -Math.PI / 2 + (1 - u) * turns * 6.2832, r = 0.01 + (ra - 0.01) * u; add(ax + Math.cos(a) * r, ay + Math.sin(a) * r); }
  for (let i = 0; i <= n; i++) { const u = i / n, a = Math.PI / 2 + u * turns * 6.2832, r = rb + (0.01 - rb) * u; add(bx + Math.cos(a) * r, by + Math.sin(a) * r); }
  return tube(pts, pts.map(() => 0.011), { ring: 5, seg: pts.length * 3 });
}
// The field of the sculpted body (the same blend that Sculpt.build() makes). It lets a rigid detail lie on the surface.
function fieldOf(S) {
  const P = S.prims.filter(p => !p.paint);
  const smin = (a, b, k) => { const m = a < b ? a : b, h = k - Math.abs(a - b); return k <= 0 || h <= 0 ? m : m - h * h / (4 * k); };
  return (x, y, z) => { let v = 1e3; for (const p of P) { const d = p.f(x, y, z); v = p.sub ? -smin(-v, d, p.k) : smin(v, d, p.k); } return v; };
}
// first point of the surface on the way from a (outside) to b (inside)
function hit(F, a, b) {
  const at = t => F(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  let t0 = 0, t1 = 1;
  for (let i = 1; i <= 20; i++) { if (at(i / 20) < 0) { t1 = i / 20; t0 = (i - 1) / 20; break; } if (i === 20) return null; }
  for (let i = 0; i < 12; i++) { const m = (t0 + t1) / 2; if (at(m) < 0) t1 = m; else t0 = m; }
  return [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, a[2] + (b[2] - a[2]) * t1];
}

export default {
  id: 'prismpeacock', rim: '#d0e8ff', focus: 'eyespot', top: 2.1, rough: 0.34,
  opts: { cell: 0.024, mottle: 0.04, mottleF: 16 },
  dyn: DYN,
  rig: { head: 'head', neck: ['neck1', 'neck2', 'neck3'] },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.8, 0])
      .bone('neck1', 'body', [0.3, 0.92, 0]).bone('neck2', 'neck1', [0.5, 1.16, 0]).bone('neck3', 'neck2', [0.42, 1.42, 0]).bone('head', 'neck3', [0.48, 1.6, 0])
      .bone('wingL', 'body', [0.14, 0.93, 0.17], { m: 1 })
      .bone('legL', 'body', [0, 0.66, 0.11], { m: 1 }).bone('shinL', 'legL', [-0.06, 0.4, 0.12], { m: 1 }).bone('footL', 'shinL', [0, 0.035, 0.12], { m: 1 })
      .bone('fan', 'body', ROOT);
    for (let j = 0; j < 5; j++) S.bone('fa' + j, 'fan', ROOT);
    // heart piece: the eye spot of the centre feather (the element comes out here)
    S.bone('eyespot', 'fa2', [ROOT[0] - Math.sin(LEAN / R2D) * SPOT, ROOT[1] + Math.cos(LEAN / R2D) * SPOT, 0]);
    S.color(SILVER);
    const mt = { metal: 0.78, gloss: 0.62 }, gd = { col: GOLD, metal: 1, gloss: 0.7 };
    // body: slender silver egg, chest, rump and a short tail cover under the fan
    S.ell('body', [-0.02, 0.8, 0], [0.36, 0.2, 0.2], Object.assign({ k: 0.04 }, mt));
    S.ell('body', [0.22, 0.86, 0], [0.2, 0.2, 0.18], Object.assign({ k: 0.05 }, mt));
    S.cap('body', [-0.3, 0.86, 0], [-0.42, 0.94, 0], 0.13, 0.1, Object.assign({ k: 0.04 }, mt));
    // tail coverts: 3 plates that overlap, under the fan
    S.ell('body', [-0.56, 0.82, 0], [0.17, 0.05, 0.15], Object.assign({ k: 0.014, col: DARK }, mt));
    S.ell('body', [-0.49, 0.835, 0], [0.15, 0.055, 0.14], Object.assign({ k: 0.014 }, mt));
    S.ell('body', [-0.42, 0.8, 0], [0.13, 0.065, 0.13], Object.assign({ k: 0.014 }, mt));
    // fan hub: gold ring, dark disc, a sapphire at the back
    S.tor('fan', [-0.42, 0.94, 0], 0.1, 0.032, Object.assign({ k: 0.01, rot: [0, 0, -70] }, gd));
    S.ell('fan', [-0.43, 0.935, 0], [0.045, 0.1, 0.1], { k: 0.01, col: DARK, metal: 1, gloss: 0.6, rot: [0, 0, 20] });
    S.ell('fan', [-0.472, 0.92, 0], [0.034, 0.05, 0.05], { k: 0.008, col: BLUE, glow: 0.9, gloss: 1, rot: [0, 0, 20] });
    // neck with gold collars, small head, gold beak base, brow ridge
    S.tube(['neck1', 'neck2', 'neck3'], [[0.3, 0.92, 0], [0.5, 1.16, 0], [0.42, 1.42, 0], [0.48, 1.6, 0]], [0.1, 0.066, 0.058, 0.064], Object.assign({ k: 0.05 }, mt));
    S.tor('neck1', [0.325, 0.95, 0], 0.096, 0.028, Object.assign({ k: 0.01, rot: aimY(0.2, 0.24, 0) }, gd));
    S.tor('neck2', [0.5, 1.16, 0], 0.066, 0.025, Object.assign({ k: 0.01, rot: aimY(0.06, 0.25, 0) }, gd));
    S.tor('neck3', [0.42, 1.42, 0], 0.059, 0.023, Object.assign({ k: 0.01, rot: aimY(-0.01, 0.22, 0) }, gd));
    S.ell('head', [0.5, 1.625, 0], [0.13, 0.11, 0.105], Object.assign({ k: 0.03 }, mt));
    S.ell('head', [0.545, 1.69, 0.062], [0.065, 0.026, 0.04], Object.assign({ k: 0.02, m: 1, rot: [0, 0, -14] }, mt));
    S.cap('head', [0.59, 1.612, 0], [0.675, 1.59, 0], 0.054, 0.038, Object.assign({ k: 0.012 }, gd));
    S.ell('head', [0.47, 1.725, 0], [0.058, 0.034, 0.05], Object.assign({ k: 0.012 }, gd));
    S.ell('head', [0.655, 1.615, 0.03], [0.02, 0.012, 0.014], { sub: 1, k: 0.006, col: '#3a2c10', m: 1 });
    // folded wings: a plate with rows of feather plates that overlap; gold shoulder; thighs
    S.ell('wingL', [WG[0], WG[1], WG[2]], [WG[3], WG[4], WG[5]], Object.assign({ m: 1, k: 0.02 }, mt));
    S.ell('wingL', [0.13, 0.9, 0.2], [0.08, 0.074, 0.052], Object.assign({ m: 1, k: 0.012 }, gd));
    S.cap('legL', [0, 0.7, 0.11], [-0.04, 0.52, 0.12], 0.095, 0.05, Object.assign({ m: 1, k: 0.04 }, mt));
    S.tor('legL', [-0.035, 0.535, 0.12], 0.05, 0.024, Object.assign({ m: 1, k: 0.01, rot: aimY(-0.04, -0.18, 0.01) }, gd));
    // chest medallion (sapphire) and rivets on the back
    S.tor('body', [0.4, 0.86, 0], 0.056, 0.025, Object.assign({ k: 0.01, rot: [0, 0, 78] }, gd));
    S.ell('body', [0.414, 0.862, 0], 0.05, { col: '#2f66f0', glow: 1, gloss: 1, k: 0.01 });
    for (const x of [-0.26, -0.14, -0.02, 0.1]) S.ell('body', [x, 0.8 + 0.2 * Math.sqrt(1 - Math.pow((x + 0.02) / 0.36, 2)) + 0.004, 0], 0.032, Object.assign({ k: 0.008 }, gd));
    // colour: blue enamel on chest, neck and wings, pale cheek, dark belly
    S.ell('body', [0.3, 0.8, 0], [0.12, 0.2, 0.2], { paint: 1, col: BLUE, gloss: 0.9, cb: 0.02 });
    S.tube(['neck1', 'neck2', 'neck3'], [[0.36, 0.93, 0], [0.56, 1.15, 0], [0.48, 1.42, 0], [0.53, 1.56, 0]], [0.085, 0.062, 0.054, 0.05], { paint: 1, col: BLUE, gloss: 0.9, cb: 0.012 });
    S.ell('head', [0.47, 1.69, 0], [0.105, 0.052, 0.085], { paint: 1, col: BLUE, gloss: 0.9, cb: 0.014 });
    S.ell('head', [0.535, 1.6, 0.09], [0.065, 0.024, 0.03], { paint: 1, col: PALE, cb: 0.01, m: 1 });
    S.ell('body', [0, 0.62, 0], [0.34, 0.07, 0.16], { paint: 1, col: DARK, metal: 1, gloss: 0.5, cb: 0.04 });
    S.ell('wingL', [-0.2, 0.86, 0.26], [0.085, 0.04, 0.05], { paint: 1, col: BLUE, gloss: 0.9, cb: 0.012, m: 1 });

    // engraved feather lines on the back and the thighs: dark arcs that lie on the silver (the round end points back / down)
    const F = fieldOf(S), eng = [], engT = [];
    const arc = (out, n, fn) => { const pts = []; for (let i = 0; i <= n; i++) { const q = fn(Math.PI * i / n); if (q) pts.push(q); } if (pts.length > 2) out.push(tube(pts, pts.map(() => 0.0075), { ring: 5, seg: pts.length * 2 })); };
    for (const sd of [1, -1]) for (const [th, xs] of [[13, [-0.3, -0.19, -0.08, 0.03, 0.14, 0.25]], [33, [-0.245, -0.135, -0.025, 0.085, 0.195]]]) for (const cx of xs)
      arc(eng, 10, a => { const x = cx - Math.sin(a) * 0.055, q = (th - Math.cos(a) * 10) / R2D * sd; return hit(F, [x, 0.8 + Math.cos(q) * 0.34, Math.sin(q) * 0.34], [x, 0.8 + Math.cos(q) * 0.1, Math.sin(q) * 0.1]); });
    S.add('body', join(eng), ENGR);
    for (const [cx, cy, w] of [[-0.035, 0.72, 0.05], [0.04, 0.685, 0.045], [-0.045, 0.635, 0.042], [0.015, 0.6, 0.036]])
      arc(engT, 8, a => { const x = cx + Math.cos(a) * w, y = cy - Math.sin(a) * w * 0.85; return hit(F, [x, y, 0.32], [x, y, 0.1]); });
    S.add('legL', join(engT), ENGR, { m: 1 });

    // fan: 15 glass feathers on 5 fan bones, silver spokes, a prism at the hub
    if (!texA) { texA = featherTex(false); texB = featherTex(true); texM = markTex(); MARK.map = texM; for (const m of FEA) { m.map = texA; m.emap = texB; } }
    const fr = i => [(i - 7) * 12, 0, LEAN], fo = i => i % 2 ? 0.016 : 0;
    for (let i = 0; i < 15; i++)
      S.add('fa' + ((i / 3) | 0), featherGeo(1.15 - 0.004 * (i - 7) * (i - 7), fo(i)), FEA[i], { p: ROOT, r: fr(i), order: 'ZXY', name: 'f' + i });
    S.add('fa' + ((CRACKED / 3) | 0), crackGeo(fo(CRACKED)), KINTS, { p: ROOT, r: fr(CRACKED), order: 'ZXY', name: 'crack' });
    const spoke = tube([[0.034, 0.03, 0], [0.034, 0.25, 0], [0.034, 0.46, 0]], [0.018, 0.013, 0.006], { ring: 6 });
    for (let j = 0; j < 5; j++) S.add('fa' + j, spoke, SILV, { p: ROOT, r: [(j - 2) * 36, 0, LEAN], order: 'ZXY' });
    S.add('fan', crystal(0.055, 0.18, 0.05, 6), PRISM, { p: [-0.34, 0.955, 0], r: [0, 0, LEAN], name: 'prism' });
    // rivets round the back of the hub ring
    const riv = [];
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.2832; riv.push(ball(0.017, 7, 5).translate(-0.03, Math.cos(a) * 0.1, Math.sin(a) * 0.1)); }
    S.add('fan', join(riv), GOLDM, { p: [-0.42, 0.94, 0], r: [0, 0, LEAN] });
    // crest: 5 silver pins, each with a cut sapphire
    const pins = [], gems = [];
    for (let k = 0; k < 5; k++) {
      const al = (-18 + k * 18) / R2D, len = 0.23 - Math.abs(k - 2) * 0.02, d = [-Math.sin(al) * len, Math.cos(al) * len, (k - 2) * 0.016];
      pins.push(tube([[0, 0, 0], [d[0] * 0.5, d[1] * 0.5, d[2] * 0.5], d], [0.012, 0.01, 0.008], { ring: 5 }));
      gems.push(crystal(0.03, 0.055, 0.03, 6).rotateZ(al).translate(d[0], d[1], d[2]));
    }
    S.add('head', join(pins), SILV, { p: [0.47, 1.735, 0], name: 'crest' });
    S.add('head', join(gems), SAPH, { p: [0.47, 1.735, 0], name: 'gems' });
    // beak: upper and lower part
    S.add('head', join([cone(0.04, 0.185, 10).rotateZ(-104 / R2D), cone(0.024, 0.12, 8).rotateZ(-116 / R2D).translate(-0.004, -0.03, 0)]), GOLDM, { p: [0.665, 1.596, 0] });
    // wing feathers (3 steel blades) and a gold scroll on each wing
    const wf = [];
    for (let i = 0; i < 3; i++) {
      const L = 0.42 - i * 0.045, g = wing([[0, -0.03], [L * 0.5, -0.05], [L, 0], [L * 0.5, 0.05], [0, 0.03]], 0.016);
      g.rotateY(-Math.PI / 2); g.rotateX(Math.PI / 2); g.rotateZ((4 + i * 13) / R2D); g.translate(i * 0.035, -i * 0.02, i * 0.006);
      wf.push(g);
    }
    S.add('wingL', join(wf), STEELF, { p: [-0.2, 0.88, 0.236], m: 1 });
    S.add('wingL', sScroll(0.03, 0.87, -0.09, 0.9, 0.04, 0.034), GOLDM, { m: 1 });
    // engraved feather lines on the wing plate: rows of arcs, the round end points back
    const arcs = [];
    for (const [cx, cy] of [[-0.16, 0.905], [-0.16, 0.815], [-0.235, 0.86], [-0.085, 0.785], [-0.005, 0.782], [0.075, 0.79], [-0.235, 0.95], [-0.235, 0.77], [0.15, 0.82]]) {
      const pts = [];
      for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.5 + i / 10), x = cx + Math.cos(a) * 0.05, y = cy + Math.sin(a) * 0.043; if (1 - Math.pow((x - WG[0]) / WG[3], 2) - Math.pow((y - WG[1]) / WG[4], 2) > 0.06) pts.push([x, y, wingZ(x, y) + 0.001]); }
      if (pts.length > 2) arcs.push(tube(pts, pts.map(() => 0.0075), { ring: 5, seg: pts.length * 2 }));
    }
    S.add('wingL', join(arcs), ENGR, { m: 1 });
    // maker's mark: an eye spot engraved below the left wing
    S.add('body', new THREE.CircleGeometry(0.046, 20), MARK, { p: [0.164, 0.703, 0.161], r: [31, 18, 0], name: 'mark' });
    // legs: gold rods with a knee ball and an ankle band; 3 front toes, 1 back toe and a spur
    const up = join([tube([[0, 0, 0], [-0.03, -0.13, 0.005], [-0.06, -0.26, 0.01]], [0.032, 0.027, 0.024], { ring: 7 }), ball(0.042, 10, 8).translate(-0.06, -0.26, 0.01)]);
    // the leg has 3 parts: thigh, shank (the joint between them bends backward, as on a bird), foot with toes
    const FT = [0.06, -0.365, 0], toe = (x, z) => tube([[0, 0, 0], [x * 0.55, -0.01, z * 0.55], [x, -0.02, z]], [0.021, 0.017, 0.006], { ring: 5 });
    const low = join([tube([[0, 0, 0], [0.02, -0.2, 0], FT], [0.024, 0.02, 0.02], { ring: 7 }), ball(0.031, 10, 8).translate(FT[0], FT[1], 0),
      torus(0.024, 0.009, 12, 6).rotateX(Math.PI / 2).translate(0.03, -0.25, 0), torus(0.024, 0.009, 12, 6).rotateX(Math.PI / 2).translate(0.012, -0.1, 0),
      tube([[0.035, -0.27, 0], [-0.01, -0.285, 0], [-0.045, -0.275, 0]], [0.014, 0.01, 0.003], { ring: 5 })]);
    S.add('legL', up, GOLDM, { p: [0, 0.66, 0.11], m: 1 });
    S.add('shinL', low, GOLDM, { p: [-0.06, 0.4, 0.12], m: 1 });
    S.add('footL', join([toe(0.16, 0), toe(0.13, 0.095), toe(0.13, -0.095), toe(-0.1, 0), ball(0.024, 8, 6)]), GOLDM, { p: [0, 0.035, 0.12], m: 1, name: 'toesL' });
    // proud eyes: sapphire iris, lids half down
    S.eye('head', [0.56, 1.645, 0.078], 0.047, { dir: [0.5, 0.1, 0.85], sclera: '#101a34', iris: '#2a6cff', iris2: '#a8ecff', lid: SILVER, open: 36, tilt: -5, glow: 0.8, m: 1 });
  },
  anim(b, t, c) {
    const br = Math.sin(t.p), a = t.a, s = t.s, h = t.h, k = t.k, sway = Math.sin(t.p * 0.6), tm = t.tm, P = c.parts;
    const shot = k === 'shot' ? 1 : 0, slam = k === 'slam' ? 1 : 0, buff = k === 'buff' ? 1 : 0, melee = k === 'melee' ? 1 : 0, show = shot + slam;
    const s2 = 4 * s * (1 - s);                 // the late part of a strike: parts that follow use it
    // ultimate "Spectrum Convergence": first the fan opens fully (uo), then the feather tips tilt forward to one point (uc)
    const u = t.u || 0, uo = ease(u * 2), uc = ease(u * 2 - 1), nu = 1 - u * 0.8;
    // --- how the body moves. dF, dS = part of the full speed forward / to the L side. (No speed in the pose: the old lag value gives the direction.)
    const noV = Math.abs(t.vf) + Math.abs(t.vs) < 0.02 && Math.abs(t.tn) < 0.02;
    // mvR: how much it moves (0..1). It also counts the speed and the turn, so the legs step when the body moves or turns.
    const mvR = Math.max(t.mv, Math.min(1, Math.hypot(t.vf, t.vs) / 1.2), Math.min(0.5, Math.abs(t.tn) * 0.7));
    const dF = cl(t.vf / 2.6 + (noV ? t.sw * 1.4 : 0), -1, 1), dS = cl(t.vs / 2.6, -1, 1), sp = Math.min(1, Math.hypot(dF, dS)), mv = mvR * (1 - uo);
    const rest = (1 - mvR) * (1 - Math.max(a, s)) * (1 - uo);
    const shift = Math.sin(tm * 0.7) * Math.sin(tm * 0.23 + 1) * rest;            // at rest the weight goes from leg to leg
    const hitB = -t.hx * h, hitS = t.hz * h, hit0 = h * (1 - Math.min(1, Math.abs(t.hx) + Math.abs(t.hz)));   // push to the back / to the L; hit0: a hit with no direction
    const land = cl(-t.va * 0.07, 0, 0.6), air = cl(t.va * 0.07, 0, 0.6);
    // fan: 0 = closed, 1 = fully open. It closes a little when the bird runs.
    let f = 0.7 + sway * 0.03 + t.gl * 0.1 + show * 0.3 * Math.max(a, s) + buff * (s * 0.3 - a * 0.5) - melee * a * 0.25 - h * 0.3 - sp * mv * 0.12 + Math.sin(tm * 0.5) * Math.sin(tm * 0.17 + 2) * 0.05 * rest;
    f = f < 0.08 ? 0.08 : f > 1 ? 1 : f;
    f += (1.06 - f) * uo;
    const quiver = (s * show + buff * s + h * 0.6 + t.gl * 0.3 + uc * 0.5) * Math.sin(tm * 38) * 0.02;
    const cone = uc * (0.6 + 0.04 * Math.sin(tm * 5));
    for (let j = 0; j < 5; j++) b['fa' + j].quaternion.setFromAxisAngle(FN, (j - 2) * GA * (f - 1));
    for (let i = 0; i < 15; i++) {
      const p = P['f' + i], j = (i / 3) | 0;
      // the cracked feather is shy: at rest it hides a little behind its neighbour. In the ultimate it stands straight.
      const shy = i === CRACKED ? (1 - uo) * (1 - show * Math.max(a, s)) : 0;
      // each step sends a small wave through the fan, from the centre to the sides
      p.rotation.x = (i - 7) * FA + ((i - 7) * FA - (j - 2) * GA) * (f - 1) + Math.sin(t.p * 1.4 + i * 0.7) * 0.02 + quiver * (i % 2 ? 1 : -1) - shy * 0.05
        + Math.sin(t.w * 2 - Math.abs(i - 7) * 0.5) * 0.012 * mv * Math.sign(i - 7);
      // twist round the shaft: idle shimmer; in the ultimate a wave runs from feather to feather, colour after colour
      const tw = Math.sin(t.p * 1.1 + i * 0.9) * (0.2 + t.gl * 0.15) * (1 - uc * 0.8) + s * show * 0.5 * (i % 2 ? 1 : -1) + shy * 0.3
        + uc * 0.22 * Math.sin(tm * 7 - Math.abs(i - 7) * 0.8);
      if (uc > 0) { _e.set(0, tw, -cone, 'ZYX'); p.quaternion.multiply(_q.setFromEuler(_e)); }
      else p.rotation.y = tw;
      if (i === CRACKED) P.crack.quaternion.copy(p.quaternion);
    }
    b.fan.rotation.z = (sway * 0.03 + show * (a * 0.12 - s * 0.3 + s2 * 0.1) + buff * (a * 0.2 - s * 0.15) + h * 0.2 + melee * (a * 0.15 - s2 * 0.2)) * nu + uo * 0.1 - uc * 0.28 + Math.sin(t.w * 2 + 1) * 0.02 * mv;
    b.fan.rotation.x = shift * 0.03 - hitS * 0.15;
    const ca = LEAN / R2D - cone;
    b.eyespot.position.set(-Math.sin(ca) * SPOT, Math.cos(ca) * SPOT, 0);
    P.prism.scale.setScalar(1 + show * a * 0.5 + s * 0.4 + t.gl * 0.2 + 0.05 * Math.sin(tm * 5) + uc * (0.5 + 0.15 * Math.sin(tm * 9)));
    // --- body: it goes up over the leg that stands, the hips roll and turn with each step; it sinks before a strike and on a landing
    const stepUp = (0.5 - 0.5 * Math.cos(t.w * 2 + 0.5)) * 0.03 * mv * (0.3 + 0.7 * sp);
    b.body.position.y += br * 0.006 + stepUp - 0.015 * mv + (slam * (a * 0.05 + s * 0.03) - buff * a * 0.05 - melee * a * 0.05) * nu - uo * 0.035 - land * 0.1;
    b.body.position.x += melee * (s * 0.14 - a * 0.1) - shot * (a * 0.03 + s * 0.05) - hitB * 0.04;
    b.body.position.z += shift * 0.03;
    b.body.rotation.z = hitB * 0.16 + hit0 * 0.14 - dF * mv * 0.05 + (show * a * 0.08 - shot * s * 0.1 - buff * a * 0.16 + melee * (a * 0.12 - s * 0.18)) * nu + uo * 0.1 + land * 0.1;
    b.body.rotation.x = Math.sin(t.w + 0.6) * 0.045 * mv * (0.4 + 0.6 * sp) + shift * 0.045 + hitS * 0.12;
    b.body.rotation.y = Math.sin(t.w + 0.3) * 0.07 * mv * dF - t.tn * 0.05 * mvR;
    // --- legs: thigh, shank, foot. Each foot lifts fast and high, reaches, lands with the toes apart, then pushes back slowly.
    const lifts = mv * (0.5 + 0.5 * Math.max(sp, Math.abs(t.tn))), cyc = t.w / TAU;
    const tnT = t.tn * (1 - sp) * 0.55 * (1 - uo);       // a turn on the spot: the foot on the inside steps back, the foot on the outside steps forward
    for (let q = 0; q < 2; q++) {
      const sd = q ? -1 : 1, e = q ? 'R' : 'L', g = gait(fr01(cyc + (q ? 0.53 : 0)), 0.42), sw = g[0], lf = g[1] * lifts, au = g[2] < 0 ? 0 : g[2], pl = g[3] * mv;
      const inner = 1 - 0.35 * t.tn * sd;                                         // the leg on the inside of a turn takes shorter steps
      const relax = Math.max(0, -shift * sd) * 0.5;                               // the leg with no weight on it bends a little
      const th = b['leg' + e], sh = b['shin' + e], ft = b['foot' + e];
      th.rotation.z = sw * 0.44 * (dF * mv * inner - sd * tnT) + lf * 0.5 + relax * 0.16 + land * 0.5 - b.body.rotation.z + (q ? -uo * 0.1 : uo * 0.12) - hitB * 0.15;
      th.rotation.x = -sw * 0.3 * dS * mv + shift * 0.05 - b.body.rotation.x * 0.8 - sd * uo * 0.1 - Math.max(0, hitS * sd) * 0.3 * sd;
      sh.rotation.z = lf * (-1.05 + 1.6 * au) - relax * 0.3 - land * 0.9 - air * 0.3 + (q ? uo * 0.06 : -uo * 0.1);
      th.position.y += lf * 0.035;
      // the foot stays flat on the ground; in the air the toes hang down, then they come up for the reach
      ft.rotation.z = -(b.body.rotation.z + th.rotation.z + sh.rotation.z) + lf * (-0.9 + 1.5 * au) - air * 0.7;
      ft.rotation.x = -(b.body.rotation.x + th.rotation.x);
      const tp = P['toes' + e], spread = 1 + pl * 0.35 - g[1] * lifts * 0.35 + uo * 0.25 + land * 0.4;
      tp.scale.z *= spread; tp.scale.x *= 1 + pl * 0.1;
    }
    // --- neck and head. The head holds still in space while the body goes forward, then it snaps forward (2 times in each cycle).
    const hp = fr01(t.w / Math.PI + 0.22), hb = (hp < 0.62 ? 1 - 2 * hp / 0.62 : -1 + 2 * ease((hp - 0.62) / 0.38)) * dF * mv;
    const look = Math.sin(tm * 0.9) * Math.sin(tm * 0.31 + 2) * rest, pre = Math.sin(t.p * 0.37);
    b.neck1.rotation.z = (sway * 0.04 + show * (a * 0.12 - s * 0.35) + melee * (a * 0.5 - s * 0.7) - buff * a * 0.3) * nu + hitB * 0.4 + hit0 * 0.3 + uo * 0.2 - hb * 0.2 + br * 0.012;
    b.neck2.rotation.z = (-sway * 0.05 + show * (a * 0.1 - s * 0.2) + melee * (-a * 0.55 + s * 0.18 + s2 * 0.2) - buff * a * 0.25) * nu + hitB * 0.2 + hit0 * 0.15 + uo * 0.22 + hb * 0.06;
    b.neck3.rotation.z = (sway * 0.03 + melee * (-a * 0.3 + s2 * 0.35) + buff * a * 0.2) * nu - uo * 0.3 + hb * 0.05 - hitB * 0.15;
    b.head.rotation.z = (-sway * 0.04 - show * a * 0.2 + shot * s * 0.4 + melee * (a * 0.3 + s2 * 0.3 - s * 0.1) + buff * a * 0.3) * nu - hitB * 0.3 - hit0 * 0.3 + uo * 0.12 + uc * 0.05 * Math.sin(tm * 3) + hb * 0.09 + b.body.rotation.z * -0.5;
    // the neck bends into a turn and makes an S; it turns against the hips so that the head looks straight ahead
    b.neck1.rotation.y = -t.tn * 0.12 - b.body.rotation.y * 0.5; b.neck1.rotation.x = hitS * 0.3 - dS * mv * 0.06 - b.body.rotation.x * 0.6;
    b.neck2.rotation.y = t.lk * 0.15 - t.tn * 0.18 - b.body.rotation.y * 0.3 + look * 0.1; b.neck2.rotation.x = hitS * 0.2 + t.tn * 0.08;
    b.neck3.rotation.y = look * 0.12 + t.tn * 0.06;
    b.head.rotation.y = t.lk * 0.4 + look * 0.3 - b.body.rotation.y * 0.2;
    b.head.rotation.x = Math.max(0, pre - 0.6) * 0.5 * rest + t.tn * 0.1 - hitS * 0.2;          // now and then it tilts its head to admire itself
    // crest: a spring moves it (dyn). Here: only what the bird does on purpose.
    const flick = Math.max(0, Math.sin(tm * 1.3) * Math.sin(tm * 0.37 + 0.5) - 0.8) * 2 * rest;
    const cz = Math.sin(t.p * 1.7) * 0.05 + show * a * 0.25 * nu - h * 0.4 - uo * 0.3 - flick * 0.5 + hb * 0.1;
    P.crest.rotation.z = P.gems.rotation.z = cz;
    P.crest.scale.setScalar(1 + uo * 0.35 + t.gl * 0.08); P.gems.scale.copy(P.crest.scale);
    // wings: lifted for the pirouette, a small shrug in other moves, open in the air and on a landing; the wing on the outside of a turn lifts; half open in the ultimate
    const lift = (slam * Math.max(a, s * 0.8) + shot * a * 0.25 + buff * s * 0.5) * nu + h * 0.3 + Math.max(0, br) * 0.03 + uo * 0.42 + air * 0.9 + land * 0.5 + (0.5 + 0.5 * Math.sin(t.w * 2)) * 0.035 * mv * sp;
    const lL = lift + Math.max(0, -t.tn) * 0.22 * mvR, lR = lift + Math.max(0, t.tn) * 0.22 * mvR, flap = slam * s * Math.sin(tm * 30) * 0.2 * nu;
    b.wingL.rotation.y = lL * 1.1; b.wingR.rotation.y = -lR * 1.1;
    b.wingL.rotation.x = -lL * 0.8 - flap; b.wingR.rotation.x = lR * 0.8 + flap;
    b.wingL.rotation.z = lL * 0.35; b.wingR.rotation.z = lR * 0.35;
  }
};
