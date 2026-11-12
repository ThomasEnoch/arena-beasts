/* Chandeliermoth (Lustrewing) - a moth of black wrought-iron scrolls with gold leaf. Its wings are chandelier arms
   with rows of crystal drops (clear, cyan tint). Candles on the antennas and the wing tips (heart piece: the flames),
   a tier of 6 candles below the thorax, wax drips, a hanging chain on top. Ember / Frost. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, wing, lathe, crystal, ball, cone, torus, flame, canvasTex } from '../geo.js';

const IRON = '#211f28', IRON2 = '#3a3744', GOLD = '#c8a048', AMBER = '#ffb347';
const IRONM = { col: '#33313b', metal: 0.9, rough: 0.42, env: 0.9 };
const GOLDM = { col: '#dcb658', metal: 1, rough: 0.22, env: 1.3 };
const WAXM = { col: '#e2d6b4', rough: 0.5, glow: '#ff9840', glowK: 0.18 };
const SILVM = { col: '#d4d8e0', metal: 1, rough: 0.2, env: 1.4 };
const FLAME = { col: '#ffc060', glow: '#ff8a1c', glowK: 3.4, noOut: true };
const HALO = { col: '#ff9a30', add: true, op: 0.2, noOut: true };
const CRYS = { col: '#b8ecff', op: 0.5, rough: 0.04, env: 1.3, glow: '#48d0ff', glowK: 0.3, flat: true, noOut: true };   // clear crystal with a cyan tint
const D2R = Math.PI / 180, X = [1, 0, 0], Y = [0, 1, 0];
let texF = null, texH = null;

// one geometry from many (no uv)
function join(list) {
  return mergeGeometries(list.map(g => { const q = g.index ? g.toNonIndexed() : g.clone(); q.deleteAttribute('uv'); if (!q.getAttribute('normal')) q.computeVertexNormals(); return q; }));
}
const at = (g, p) => g.clone().translate(p[0], p[1], p[2]);
function aim(geo, d) {
  const g = geo.clone();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]).normalize()));
  return g;
}
// scroll: points of a spiral around c in the plane (ex, ey). Radius r0 -> r1, angle a0 -> a1 in degrees.
function spiral(c, ex, ey, r0, r1, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, q = (a0 + (a1 - a0) * f) * D2R, r = r0 + (r1 - r0) * f, cs = Math.cos(q) * r, sn = Math.sin(q) * r;
    out.push([c[0] + ex[0] * cs + ey[0] * sn, c[1] + ex[1] * cs + ey[1] * sn, c[2] + ex[2] * cs + ey[2] * sn]);
  }
  return out;
}
const sp2 = (cu, cv, r0, r1, a0, a1, n) => spiral([cu, cv, 0], X, Y, r0, r1, a0, a1, n);
// n points of a quadratic curve from p0 to p2 (p2 is not included: the next curve starts there)
function bez(p0, p1, p2, n) {
  const out = [];
  for (let i = 0; i < n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; out.push(p0.map((v, j) => v * a + p1[j] * b + p2[j] * c)); }
  return out;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

// --- wing layout. A wing is a flat plane: base point, span direction, chord direction. Points are [span, chord].
function plane(p, span, chord) {
  const z = new THREE.Vector3(span[0], span[1], span[2]).normalize(), x = new THREE.Vector3(chord[0], chord[1], chord[2]);
  x.addScaledVector(z, -x.dot(z)).normalize();
  return { p, m: new THREE.Matrix4().makeBasis(x, new THREE.Vector3().crossVectors(z, x), z), at: (u, v) => [p[0] + z.x * u + x.x * v, p[1] + z.y * u + x.y * v, p[2] + z.z * u + x.z * v] };
}
const FW = plane([0.08, 1.07, 0.15], [0.16, 0.42, 0.89], [1, 0.12, -0.1]);     // forewing
const HW = plane([-0.14, 1.0, 0.15], [-0.38, 0.2, 0.9], [1, 0.05, 0.4]);       // hindwing
const FC = [[0, -0.05], [0.14, -0.13], [0.4, -0.2], [0.53, -0.23], [0.66, -0.25], [0.86, -0.12], [0.93, -0.02], [1.0, 0.1], [1.08, 0.32], [0.8, 0.31], [0.45, 0.24], [0.15, 0.13], [0, 0.06]];
const HC = [[0, -0.05], [0.1, -0.2], [0.28, -0.36], [0.5, -0.42], [0.7, -0.3], [0.8, -0.08], [0.74, 0.1], [0.5, 0.14], [0.22, 0.11], [0, 0.05]];
// the crystal hangers hang from these points of the frames
const DA = FW.at(0.93, -0.02), DB = FW.at(0.53, -0.23), DC = HW.at(0.5, -0.42);
const A0 = [0.43, 1.15, 0.1], TIP = [0.18, 0.3, 0.13];      // antenna root, candle cup (relative to the root)
const T0 = [0.02, 0.76, 0], C0 = [0.02, 1.2, 0];            // candle tier, chain
const DN = [['dAL', 'wingL', 1, 0], ['dAR', 'wingR', -1, 1.3], ['dBL', 'wingL', 1, 2.1], ['dBR', 'wingR', -1, 3.4], ['dCL', 'hindL', 1, 4.2], ['dCR', 'hindR', -1, 5.5]];
const FL = ['c0L', 'c0R', 'c1L', 'c1R', 'c2L', 'c2R'];
const WT = FW.at(1.05, 0.285);                               // candle on the tip of the forewing
const BEAT = 0.42;                                           // waltz: seconds for one beat (3 beats = 1 bar)
const ease = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
const cl = (v, a, b) => v < a ? a : v > b ? b : v;
// loose parts (spring bones). The crystal hangers are pendulums with low damping, each one a little different.
const FLAMES = ['flameL', 'flameR', 'wfL', 'wfR'].concat(FL), LEGS = ['lg0L', 'lg0R', 'lg1L', 'lg1R', 'lg2L', 'lg2R'];
const DYN = DN.map(([n], i) => ({ b: [n], k: 23 + i * 1.7, d: 1.7 + (i * 3 % 5) * 0.22, amt: 0.9, drag: 3.2 + (i % 3) * 0.5, dir: [0, -1, 0] }));
DYN.push({ b: ['tier'], k: 34, d: 2.8, amt: 0.45, drag: 1.5, dir: [0, -1, 0] }, { b: ['chain'], k: 58, d: 4.2, amt: 0.8, drag: 2, dir: [0, 1, 0] },
  { b: ['antL'], k: 78, d: 4.6, amt: 0.6, drag: 2, dir: [0.2, 1, 0.3] }, { b: ['antR'], k: 84, d: 5, amt: 0.6, drag: 2, dir: [0.2, 1, -0.3] },
  { b: ['abd1', 'abd2', 'abd3'], k: 75, d: 6, amt: 0.45, drag: 1 });
LEGS.forEach((n, i) => DYN.push({ b: [n], k: 50 + i * 4, d: 3.6 + (i % 3) * 0.4, amt: 0.8, drag: 3, dir: [0.2, -1, i % 2 ? -0.5 : 0.5] }));
FLAMES.forEach((n, i) => DYN.push({ b: [n], k: 38 + (i % 4) * 3, d: 5, amt: 0.9, drag: 5, dir: [0, 1, 0] }));     // the flames lean away from the motion
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
  for (let i = 1; i <= 48; i++) { if (at(i / 48) < 0) { t1 = i / 48; t0 = (i - 1) / 48; break; } if (i === 48) return null; }
  for (let i = 0; i < 12; i++) { const m = (t0 + t1) / 2; if (at(m) < 0) t1 = m; else t0 = m; }
  return [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, a[2] + (b[2] - a[2]) * t1];
}

// frame + scroll ribs + gold bosses + membrane of one wing
function wingGeo(W, ctrl, ribs, bars, beads) {
  const cv = new THREE.CatmullRomCurve3(ctrl.map(q => new THREE.Vector3(q[0], q[1], 0)), true, 'centripetal');
  const out = cv.getSpacedPoints(64).slice(0, 64).map(q => [q.x, q.y]), L = q => [q[1], 0, q[0]];
  const iron = [tube(out.concat([out[0], out[1], out[2]]).map(L), [0.019, 0.019], { ring: 6, seg: 134 })];
  for (const r of ribs) iron.push(tube(r.map(L), [0.014, 0.007], { ring: 5, seg: r.length * 3 }));
  for (const [p, q] of bars) iron.push(tube([p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], q].map(L), [0.008, 0.008], { ring: 4, seg: 4 }));
  return {
    memb: wing(out, 0.012, { smooth: false, bevel: 0.003 }).applyMatrix4(W.m),
    iron: join(iron).applyMatrix4(W.m),
    gold: join(beads.map(q => at(ball(q[2], 10, 8), L(q)))).applyMatrix4(W.m)
  };
}
// crystal hanger: a ring on the frame, an arched gold yoke, crystal drops on fine chains. drops: [place, chain length, size]
function hanger(dir, L, drops) {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize(), bar = [], cry = [];
  const bp = s => [d.x * s, -0.056 + d.y * s - 0.036 * (s / L) * (s / L), d.z * s];
  for (let i = 0; i <= 8; i++) bar.push(bp(-L + 2 * L * i / 8));
  const gold = [tube(bar, [0.008, 0.012, 0.008], { ring: 5, seg: 16 }), at(torus(0.02, 0.006, 12, 5), [0, -0.03, 0]), at(ball(0.015, 8, 6), bp(-L)), at(ball(0.015, 8, 6), bp(L))];
  for (const [s, len, r] of drops) {
    const q = bp(s);
    gold.push(tube([q, [q[0], q[1] - len / 2, q[2]], [q[0], q[1] - len, q[2]]], [0.004, 0.004], { ring: 4, seg: 2 }));
    cry.push(at(crystal(0.012, 0.013, 0.013, 4), [q[0], q[1] - len * 0.5, q[2]]));
    cry.push(at(crystal(r, r * 2.5, r * 1.3, 6), [q[0], q[1] - len - r * 2.5, q[2]]));
  }
  return { gold: join(gold), cry: join(cry) };
}
// candle parts: a dish, a wax stub with a melted top and drips
const cup = r => lathe([[0, 0], [r * 0.5, 0.004], [r * 0.9, 0.018], [r, 0.03], [r * 0.82, 0.03], [r * 0.45, 0.02], [0, 0.018]], 12);
function candle(r, h, turn) {
  const g = [lathe([[0, 0], [r, 0], [r * 1.04, h * 0.2], [r * 0.96, h * 0.9], [r * 1.06, h], [r * 0.7, h * 1.03], [r * 0.3, h * 0.95], [0, h * 0.94]], 10)];
  [[0.6, 0.42], [2.9, 0.55], [4.6, 0.3]].forEach(([q, f]) => g.push(at(flame(r * 0.42, h * (0.98 - f), 6), [Math.cos(q + turn) * r, h * f, Math.sin(q + turn) * r])));
  g.push(at(ball(r * 0.5, 7, 5), [Math.cos(2.9 + turn) * r * 1.15, 0.004, Math.sin(2.9 + turn) * r * 1.15]));
  // wax that ran over the edge of the dish: a run on the dish and a drip that hangs below it
  [[2.9, 0.085], [0.9, 0.055]].forEach(([q, len]) => {
    const cx = Math.cos(q + turn), sz = Math.sin(q + turn), R = r * 1.8;
    g.push(tube([[cx * r * 1.1, 0.006, sz * r * 1.1], [cx * R * 0.8, 0.004, sz * R * 0.8], [cx * R, -0.008, sz * R]], [r * 0.34, r * 0.3, r * 0.28], { ring: 5, seg: 4 }));
    g.push(at(flame(r * 0.34, len, 6).rotateX(Math.PI), [cx * R, -0.004, sz * R]));
  });
  return join(g);
}
// membrane texture: amber scales, dark veins from the root, tracery bands, a rose-window eye spot
function wingTex(ry, sx, sy) {
  return canvasTex(256, 256, (g, W, H) => {
    let gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, '#4a1c06'); gr.addColorStop(0.4, '#b85f14'); gr.addColorStop(1, '#ffbe4c');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,214,130,0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) for (let j = 0; j < 12; j++) { g.beginPath(); g.arc((i + (j % 2) * 0.5) * W / 13, (j + 0.5) * H / 12, W / 26, -1.2, 1.2); g.stroke(); }
    g.strokeStyle = 'rgba(52,18,4,0.8)'; g.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const y = H * (i + 0.5) / 9; g.beginPath(); g.moveTo(0, H * ry); g.quadraticCurveTo(W * 0.45, H * ry + (y - H * ry) * 0.35, W, y); g.stroke(); }
    g.strokeStyle = 'rgba(40,14,4,0.7)'; g.lineWidth = 2.5;
    for (const fx of [0.34, 0.88]) for (let j = 0; j < 7; j++) {
      const y0 = H * j / 7, y1 = H * (j + 1) / 7, x = W * fx;
      g.beginPath(); g.moveTo(x - 16, y0); g.quadraticCurveTo(x + 6, y0 + 4, x + 16, (y0 + y1) / 2); g.quadraticCurveTo(x + 6, y1 - 4, x - 16, y1); g.stroke();
    }
    const cx = W * sx, cy = H * sy, R = W * 0.14;
    gr = g.createRadialGradient(cx, cy, 2, cx, cy, R * 1.5);
    gr.addColorStop(0, 'rgba(255,244,200,1)'); gr.addColorStop(0.5, 'rgba(255,170,60,0.8)'); gr.addColorStop(1, 'rgba(255,150,40,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * 1.5, 0, 7); g.fill();
    g.strokeStyle = 'rgba(46,16,4,0.85)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) { const q = i * Math.PI / 4; g.beginPath(); g.moveTo(cx + Math.cos(q) * R * 0.3, cy + Math.sin(q) * R * 0.3); g.lineTo(cx + Math.cos(q) * R, cy + Math.sin(q) * R); g.stroke(); }
    g.fillStyle = '#3a1204'; g.beginPath(); g.arc(cx, cy, R * 0.3, 0, 7); g.fill();
  });
}

export default {
  id: 'chandeliermoth', rim: '#ffc27a', focus: 'flameL', top: 1.84, rough: 0.45,
  opts: { cell: 0.024, mottle: 0.06, mottleF: 14 },
  dyn: DYN,
  rig: { head: 'head', neck: [] },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.95, 0]).bone('head', 'body', [0.3, 1.0, 0])
      .bone('antL', 'head', A0, { m: 1 })
      .bone('abd1', 'body', [-0.2, 0.94, 0]).bone('abd2', 'abd1', [-0.5, 0.87, 0]).bone('abd3', 'abd2', [-0.7, 0.8, 0])
      .bone('wingL', 'body', FW.p, { m: 1 }).bone('hindL', 'body', HW.p, { m: 1 })
      .bone('dAL', 'wingL', DA, { m: 1 }).bone('dBL', 'wingL', DB, { m: 1 }).bone('dCL', 'hindL', DC, { m: 1 })
      .bone('tier', 'body', T0).bone('chain', 'body', C0).bone('tipL', 'wingL', WT, { m: 1 });

    const O = (a, b) => Object.assign({}, a, b);
    const Fe = { col: IRON, metal: 0.6, gloss: 0.3, k: 0.016 }, Fe2 = { col: IRON2, metal: 0.65, gloss: 0.4, k: 0.012 }, Au = { col: GOLD, metal: 1, gloss: 0.7, k: 0.012 };
    S.color(IRON);
    // thorax: a black iron barrel with 4 ribbed bands. A little candle light shows in the seams between the bands.
    S.ell('body', [0.04, 0.97, 0], [0.28, 0.21, 0.21], Fe);
    for (const [x, R] of [[-0.15, 0.155], [-0.02, 0.2], [0.11, 0.2], [0.23, 0.155]]) S.tor('body', [x, 0.97, 0], R, 0.034, O(Fe2, { rot: [0, 0, 90] }));
    S.cap('body', [0.24, 0.98, 0], [0.34, 1.0, 0], 0.1, 0.1, Fe);
    S.tor('body', [0.29, 0.99, 0], 0.12, 0.045, O(Fe2, { rot: [0, 0, 90] }));
    S.ell('body', [0.02, 1.185, 0], [0.055, 0.04, 0.055], Au);
    S.ell('body', [0.02, 0.765, 0], [0.09, 0.05, 0.09], Fe2);
    S.ell('body', [0.08, 1.07, 0.14], 0.075, O(Fe2, { m: 1 }));
    S.ell('body', [-0.14, 1.0, 0.14], 0.065, O(Fe2, { m: 1 }));
    // wing arms: the thick root of each leading edge
    S.cap('wingL', FW.at(0.02, 0.04), FW.at(0.3, 0.17), 0.05, 0.03, O(Fe, { m: 1, k: 0.02 }));
    S.cap('hindL', HW.at(0.02, 0.03), HW.at(0.25, 0.1), 0.042, 0.028, O(Fe, { m: 1, k: 0.02 }));
    // head: iron skull, snout, gold eye rings, gold sockets for the antennae
    S.ell('head', [0.44, 1.02, 0], [0.17, 0.16, 0.18], Fe);
    S.ell('head', [0.59, 0.985, 0], [0.06, 0.055, 0.07], Fe2);
    S.tor('head', [0.528, 1.052, 0.137], 0.1, 0.026, O(Fe2, { m: 1, rot: [0, -56, 90], k: 0.01 }));
    S.ell('head', [A0[0], A0[1], A0[2]], 0.048, O(Fe2, { m: 1 }));
    S.box('head', [0.52, 1.15, 0], [0.045, 0.028, 0.06], 0.022, Au);
    // abdomen: a turned iron spindle of 5 beads with gold collars, gold tail cap
    const segs = [['abd1', -0.29, 0.925, 0.135], ['abd1', -0.43, 0.89, 0.128], ['abd2', -0.57, 0.85, 0.114], ['abd3', -0.7, 0.8, 0.096], ['abd3', -0.81, 0.75, 0.076]];
    segs.forEach(([bn, x, y, r], i) => S.ell(bn, [x, y, 0], [r * 1.1, r, r], i % 2 ? Fe2 : Fe));
    for (const [bn, x, y, r] of [['abd1', -0.36, 0.908, 0.122], ['abd2', -0.5, 0.87, 0.112], ['abd2', -0.635, 0.826, 0.097], ['abd3', -0.755, 0.776, 0.078]])
      S.tor(bn, [x, y, 0], r, 0.026, O(Fe2, { rot: [0, 0, 110] }));
    S.cap('abd3', [-0.86, 0.73, 0], [-0.95, 0.69, 0], 0.05, 0.03, Au);
    // --- paint: glowing seams, lantern windows, gold rivets, soot
    for (const [x, R] of [[-0.085, 0.188], [0.045, 0.21], [0.17, 0.186]]) S.tor('body', [x, 0.97, 0], R, 0.014, { paint: 1, col: '#b8501c', glow: 0.8, cb: 0.008, rot: [0, 0, 90] });
    // gold leaf on the crest of each band (it is worn: not a full ring)
    for (const [x, R] of [[-0.15, 0.155], [-0.02, 0.2], [0.11, 0.2], [0.23, 0.155]]) S.tor('body', [x, 0.985, 0], R + 0.034, 0.011, { paint: 1, col: '#e8c460', metal: 1, gloss: 0.8, cb: 0.006, op: 0.9, rot: [0, 0, 90] });
    // gold leaf: a thin line on the collar, on the eye rings, on the wing roots and on the abdomen collars
    S.tor('body', [0.29, 0.99, 0], 0.166, 0.012, { paint: 1, col: '#e8c460', metal: 1, gloss: 0.8, cb: 0.006, rot: [0, 0, 90] });
    S.tor('head', [0.542, 1.056, 0.158], 0.1, 0.011, { paint: 1, col: '#e8c460', metal: 1, gloss: 0.8, cb: 0.006, m: 1, rot: [0, -56, 90] });
    S.ell('body', [0.085, 1.125, 0.165], 0.036, { paint: 1, col: '#e8c460', metal: 1, gloss: 0.8, cb: 0.008, m: 1 });
    S.ell('body', [-0.145, 1.05, 0.16], 0.03, { paint: 1, col: '#e8c460', metal: 1, gloss: 0.8, cb: 0.008, m: 1 });
    S.ell('body', [0.04, 0.8, 0], [0.3, 0.1, 0.2], { paint: 1, col: '#17151c', metal: 0.5, gloss: 0.15, cb: 0.03 });   // the gold leaf is gone from the belly: soot
    segs.slice(0, 4).forEach(([bn, x, y, r], i) => {
      S.ell(bn, [x, y + 0.01, r * 0.95], [0.04 - i * 0.005, 0.055 - i * 0.007, 0.05], { paint: 1, col: '#c8641c', glow: 0.9, cb: 0.012, m: 1 });
      S.ell(bn, [x, y + r, 0], [0.035, 0.03, 0.035], { paint: 1, col: '#f2d27a', metal: 1, gloss: 0.8, cb: 0.01 });
    });
    for (const x of [-0.02, 0.11]) for (const deg of [25, 65, 105, 145])
      S.ell('body', [x, 0.97 + Math.cos(deg * D2R) * 0.234, Math.sin(deg * D2R) * 0.234], 0.021, { paint: 1, col: '#f2d27a', metal: 1, gloss: 0.8, cb: 0.008, m: 1 });
    S.ell('head', [0.4, 1.12, 0], [0.12, 0.06, 0.1], { paint: 1, col: '#17161c', op: 0.6, cb: 0.04 });
    S.ell('head', [0.6, 1.0, 0.06], [0.03, 0.03, 0.03], { paint: 1, col: AMBER, glow: 1, cb: 0.01, m: 1 });

    // --- wings: iron frames with scroll ribs, gold bosses, amber membranes ---------------------
    if (!texF) { texF = wingTex(0.56, 0.667, 0.3); texH = wingTex(0.25, 0.59, 0.5); }
    const MF = { map: texF, emap: texF, glow: '#ffffff', glowK: 0.4, col: '#ffffff', op: 0.55, rough: 0.3, env: 0.8, noOut: true };
    const MH = { map: texH, emap: texH, glow: '#ffffff', glowK: 0.4, col: '#ffffff', op: 0.55, rough: 0.3, env: 0.8, noOut: true };
    const fw = wingGeo(FW, FC, [
      bez([0.03, 0], [0.4, -0.02], [0.72, 0.05], 10).concat(sp2(0.72, 0.15, 0.1, 0.022, 270, 740, 18)),
      bez([0.03, -0.02], [0.3, -0.02], [0.56, -0.055], 8).concat(sp2(0.56, -0.125, 0.07, 0.018, 90, -380, 16)),
      bez([0.87, -0.1], [0.9, 0.05], [0.905, 0.19], 5).concat(sp2(0.955, 0.19, 0.05, 0.015, 180, -270, 14)),
      bez([0.03, 0.03], [0.2, 0.11], [0.4, 0.129], 6).concat(sp2(0.4, 0.165, 0.036, 0.012, 270, 690, 12))
    ], [[[0.25, 0.165], [0.26, -0.005]], [[0.55, 0.265], [0.57, 0.035]], [[0.3, -0.175], [0.3, -0.03]], [[0.78, -0.17], [0.8, 0.07]]],
    [[0.72, 0.15, 0.03], [0.56, -0.125, 0.024], [0.955, 0.19, 0.02], [0.4, 0.165, 0.018], [0.02, 0, 0.036]]);
    const hw = wingGeo(HW, HC, [
      bez([0.03, 0], [0.25, 0.02], [0.47, -0.01], 8).concat(sp2(0.47, -0.14, 0.13, 0.025, 90, -470, 22)),
      bez([0.03, -0.03], [0.14, -0.22], [0.39, -0.385], 8).concat([[0.39, -0.385]]),
      bez([0.63, -0.33], [0.7, -0.22], [0.695, -0.07], 5).concat(sp2(0.64, -0.07, 0.055, 0.016, 0, 450, 14))
    ], [[[0.2, 0.105], [0.2, 0.012]], [[0.6, 0.125], [0.6, -0.02]], [[0.47, -0.27], [0.47, -0.41]]],
    [[0.47, -0.14, 0.036], [0.64, -0.07, 0.02], [0.02, 0, 0.03]]);
    S.add('hindL', hw.memb, MH, { p: HW.p, m: 1 });
    S.add('hindL', hw.iron, IRONM, { p: HW.p, m: 1 });
    S.add('hindL', hw.gold, GOLDM, { p: HW.p, m: 1 });
    S.add('wingL', fw.memb, MF, { p: FW.p, m: 1 });
    S.add('wingL', fw.iron, IRONM, { p: FW.p, m: 1 });
    S.add('wingL', fw.gold, GOLDM, { p: FW.p, m: 1 });
    // --- crystal hangers: 11 cut drops below each pair of wings ------------------------------
    const hA = hanger(sub(FW.at(1.0, 0.1), FW.at(0.86, -0.12)), 0.18, [[-0.18, 0.05, 0.036], [-0.108, 0.1, 0.03], [-0.036, 0.14, 0.044], [0.036, 0.09, 0.032], [0.108, 0.13, 0.04], [0.18, 0.06, 0.034]]);
    const hB = hanger(sub(FW.at(0.66, -0.25), FW.at(0.4, -0.2)), 0.2, [[-0.2, 0.06, 0.034], [-0.12, 0.11, 0.04], [-0.04, 0.07, 0.032], [0.04, 0.15, 0.046], [0.12, 0.08, 0.034], [0.2, 0.12, 0.038]]);
    const hC = hanger(sub(HW.at(0.7, -0.3), HW.at(0.28, -0.36)), 0.22, [[-0.22, 0.06, 0.034], [-0.132, 0.12, 0.042], [-0.044, 0.08, 0.034], [0.044, 0.14, 0.044], [0.132, 0.07, 0.036], [0.22, 0.05, 0.032]]);
    for (const [bn, g, p] of [['dAL', hA, DA], ['dBL', hB, DB], ['dCL', hC, DC]]) {
      S.add(bn, g.gold, GOLDM, { p, m: 1 });
      S.add(bn, g.cry, CRYS, { p, m: 1 });
    }

    // --- antennae: a thorny iron stalk that ends in a scroll, a gold dish, a candle stub with a flame
    const ex = [0.811, 0, 0.585];
    const stalk = bez([0, 0, 0], [-0.03, 0.2, 0.02], TIP, 8), thorn = cone(0.011, 0.07, 5);
    const ant = [tube(stalk.concat(spiral([TIP[0], TIP[1] - 0.05, TIP[2]], ex, Y, 0.05, 0.014, 90, -360, 14)), [0.019, 0.014, 0.008], { ring: 6, seg: 60 })];
    for (const i of [2, 4, 6]) { ant.push(at(aim(thorn, [-0.4, 0.5, 1]), stalk[i])); ant.push(at(aim(thorn, [-0.4, 0.5, -1]), stalk[i])); }
    S.add('antL', join(ant), IRONM, { p: A0, m: 1 });
    S.add('antL', cup(0.055), GOLDM, { p: [A0[0] + TIP[0], A0[1] + TIP[1] + 0.008, A0[2] + TIP[2]], m: 1 });
    S.add('antL', candle(0.032, 0.11, 0), WAXM, { p: [A0[0] + TIP[0], A0[1] + TIP[1] + 0.03, A0[2] + TIP[2]], m: 1 });
    S.add('antL', flame(0.045, 0.2), FLAME, { p: [A0[0] + TIP[0], A0[1] + TIP[1] + 0.135, A0[2] + TIP[2]], m: 1, name: 'flameL' });
    S.add('antL', ball(0.1, 12, 8), HALO, { p: [A0[0] + TIP[0], A0[1] + TIP[1] + 0.21, A0[2] + TIP[2]], m: 1, name: 'haloL' });

    // --- candles on the wing tips: a gold dish, a candle stub with wax drips, a flame. The bone 'tip' keeps them upright.
    S.add('tipL', join([cup(0.058), at(torus(0.02, 0.007, 10, 5), [0, -0.012, 0])]), GOLDM, { p: WT, m: 1 });
    S.add('tipL', candle(0.032, 0.105, 1.3), WAXM, { p: [WT[0], WT[1] + 0.022, WT[2]], m: 1 });
    S.add('tipL', flame(0.042, 0.18), FLAME, { p: [WT[0], WT[1] + 0.122, WT[2]], m: 1, name: 'wfL' });

    // --- candle tier: a spindle below the thorax, 6 scroll arms, a ring, 6 candles, crystal drops
    const stem = lathe([[0, -0.305], [0.022, -0.3], [0.036, -0.27], [0.018, -0.24], [0.03, -0.19], [0.058, -0.155], [0.03, -0.12], [0.022, -0.06], [0.042, -0.02], [0.03, 0]], 12);
    const ring = torus(0.36, 0.014, 40, 6); ring.rotateX(Math.PI / 2); ring.translate(0, -0.14, 0);
    const tIron = [stem, ring], tGold = [], tWax = [], tCry = [at(crystal(0.055, 0.05, 0.12, 6), [0, -0.355, 0])];
    for (let i = 0; i < 6; i++) {
      const q = (30 + i * 60) * D2R, e = [Math.cos(q), 0, Math.sin(q)], R3 = (r, y) => [e[0] * r, y, e[2] * r];
      tIron.push(tube(bez(R3(0.03, -0.15), R3(0.2, -0.33), R3(0.36, -0.155), 8).concat([R3(0.36, -0.155)]), [0.016, 0.011], { ring: 5, seg: 16 }));
      tIron.push(tube(spiral(R3(0.125, -0.165), e, Y, 0.05, 0.012, 250, -180, 12), [0.011, 0.006], { ring: 5, seg: 30 }));
      tGold.push(at(cup(0.055), R3(0.36, -0.14)));
      tWax.push(at(candle(0.028, 0.1, q), R3(0.36, -0.115)));
      const q2 = i * 60 * D2R;
      tCry.push(at(crystal(0.024, 0.05, 0.034, 6), [Math.cos(q2) * 0.36, -0.205, Math.sin(q2) * 0.36]));
    }
    S.add('tier', join(tIron), IRONM, { p: T0 });
    S.add('tier', join(tGold), GOLDM, { p: T0 });
    S.add('tier', join(tWax), WAXM, { p: T0 });
    S.add('tier', join(tCry), CRYS, { p: T0 });
    [30, 90, 150].forEach((deg, i) => S.add('tier', flame(0.032, 0.13), FLAME, { p: [T0[0] + Math.cos(deg * D2R) * 0.36, T0[1] - 0.015, Math.sin(deg * D2R) * 0.36], m: 1, name: 'c' + i + 'L' }));

    // --- chain loop on top: 3 links and a large ring -------------------------------------------
    const link = torus(0.03, 0.009, 14, 6), link2 = link.clone().rotateY(Math.PI / 2), top = torus(0.055, 0.012, 22, 6).rotateY(Math.PI / 2);
    S.add('chain', join([at(link, [0, 0.03, 0]), at(link2, [0, 0.07, 0]), at(link, [0, 0.11, 0]), at(top, [0, 0.175, 0])]), GOLDM, { p: C0 });

    // --- gold ornaments: a scroll on the back, a spiked collar, a crown, a coiled tongue --------
    const orn = [tube(spiral([0.17, 1.24, 0], X, Y, 0.07, 0.018, 230, 650, 16), [0.017, 0.009], { ring: 6, seg: 48 })];
    for (const deg of [25, 60, 95]) for (const sg of [1, -1]) {
      const cs = Math.cos(deg * D2R), sn = Math.sin(deg * D2R) * sg;
      orn.push(at(aim(cone(0.028, 0.13, 6), [-0.5, cs, sn]), [0.27, 0.99 + cs * 0.15, sn * 0.15]));
    }
    S.add('body', join(orn), GOLDM);
    const hg = [tube(spiral([0.61, 0.9, 0], X, Y, 0.06, 0.014, 120, 620, 18), [0.014, 0.007], { ring: 5, seg: 54 })];
    for (const [z, hh] of [[0, 0.12], [0.055, 0.085], [-0.055, 0.085]]) hg.push(at(aim(cone(0.024, hh, 6), [0.25, 1, z * 3]), [0.53, 1.155 - Math.abs(z) * 0.2, z]));
    S.add('head', join(hg), GOLDM);
    // --- wrought-iron scrolls on the flanks of the thorax, with gold bosses and gold leaves; 6 short scroll legs
    const F = fieldOf(S), onT = (x, deg, sd, lift) => { const q = deg * D2R, e = [0, Math.cos(q), Math.sin(q) * sd], h0 = hit(F, [x, 0.97 + e[1] * 0.6, e[2] * 0.6], [x, 0.97, 0]) || [x, 0.97 + e[1] * 0.2, e[2] * 0.2]; return [h0[0], h0[1] + e[1] * lift, h0[2] + e[2] * lift]; };
    const scr = [], leaf = [], lf = ball(1, 8, 5);
    for (const sd of [1, -1]) {
      // an S: two spirals joined by a bar. (x, degrees from the top) on the thorax
      const sA = [], sB = [];
      for (let i = 0; i <= 22; i++) { const u = i / 22, q = (200 - u * 560) * D2R, r = 0.012 + (1 - u) * 0.055; sA.push(onT(0.13 + Math.cos(q) * r, 104 + Math.sin(q) * r * 250, sd, 0.008)); }
      for (let i = 0; i <= 22; i++) { const u = i / 22, q = (20 + u * 560) * D2R, r = 0.012 + u * 0.05; sB.push(onT(-0.075 + Math.cos(q) * r, 112 + Math.sin(q) * r * 250, sd, 0.008)); }
      scr.push(tube(sA.reverse().concat(sB.reverse()), [0.014, 0.014], { ring: 6, seg: 100 }));
      for (const [x, d, r] of [[0.13, 104, 0.024], [-0.075, 112, 0.022]]) leaf.push(at(ball(r, 9, 7), onT(x, d, sd, 0.012)));
      for (const [x, d, rz] of [[0.215, 92, 0.5], [0.03, 124, -0.5], [-0.16, 100, 2.6]]) leaf.push(lf.clone().scale(0.05, 0.012, 0.022).rotateZ(rz).rotateX(d * D2R * sd).translate(...onT(x, d, sd, 0.008)));
    }
    // 6 scroll legs. Each leg is its own part: it hangs from its joint and swings (dyn).
    [[0.19, 150], [0.06, 156], [-0.07, 150]].forEach(([x, d], i) => {
      const p0 = onT(x, d, 1, -0.01), e = [0.3, -1, 0.75], c0 = [e[0] * 0.16, e[1] * 0.1, e[2] * 0.14];
      S.add('body', join([tube([[0, 0, 0], [e[0] * 0.05, -0.05, e[2] * 0.1]].concat(spiral(c0, [e[0], 0, e[2]], Y, 0.045, 0.012, 100, -260, 12)), [0.016, 0.012, 0.007], { ring: 5, seg: 36 }), ball(0.022, 8, 6)]), IRONM, { p: p0, m: 1, name: 'lg' + i + 'L' });
    });
    S.add('body', join(scr), IRONM);
    S.add('body', join(leaf), GOLDM);
    // --- maker's mark: two linked rings on the thorax, one gold and one silver (the twins Oriel and Brisa)
    // They lie on the back, behind the chain: the gold ring on the left, the silver ring on the right.
    const mk = onT(-0.09, 0, 1, 0.016);
    S.add('body', torus(0.047, 0.0115, 26, 8).rotateX(Math.PI / 2).rotateX(0.38), GOLDM, { p: [mk[0], mk[1], 0.031], name: 'markG' });
    S.add('body', torus(0.047, 0.0115, 26, 8).rotateX(Math.PI / 2).rotateX(0.38), SILVM, { p: [mk[0], mk[1], -0.031], name: 'markS' });
    // tail: an iron scroll with a crystal drop
    S.add('abd3', tube([[-0.93, 0.7, 0]].concat(spiral([-1.0, 0.745, 0], X, Y, 0.09, 0.02, 285, -185, 18)), [0.022, 0.01], { ring: 6, seg: 57 }), IRONM);
    S.add('abd3', crystal(0.038, 0.085, 0.05, 6), CRYS, { p: [-1.0, 0.55, 0] });

    S.eye('head', [0.52, 1.05, 0.125], 0.1, { dir: [0.55, 0.15, 0.82], sclera: '#0d0809', iris: '#3a1404', iris2: '#ff9a2a', pupil: 'round', size: 62, lid: IRON2, open: 64, tilt: 6, glow: 0.9, m: 1 });
  },
  anim(b, t, c) {
    const P = c.parts, a = t.a, s = t.s, h = t.h, k = t.k, tm = t.tm, melee = k === 'melee', shot = k === 'shot', slam = k === 'slam', buff = k === 'buff';
    const s2 = 4 * s * (1 - s);                 // the late part of a strike: parts that follow use it
    // ultimate "The Last Waltz": the wings open flat and wide like the arms of a chandelier, the drops swing out,
    // the flames grow, and the body sways in waltz time: a deep dip on beat 1, two light steps on beats 2 and 3.
    const u = t.u || 0, uo = ease(u * 1.5), nu = 1 - uo;
    const beat = tm / BEAT, bi = Math.floor(beat) % 3, fb = beat - Math.floor(beat), bar = beat / 3;
    const step = Math.sin(Math.PI * fb) * Math.sin(Math.PI * fb) * (bi === 0 ? -1 : 0.42);       // -1 = the dip of beat 1
    const side = Math.sin(Math.PI * bar);                                                          // one side for one bar, then the other side
    const turn = (Math.floor(bar) + ease((bar - Math.floor(bar)) * 1.4)) * Math.PI / 3;            // the candle tier turns 60 degrees in each bar
    // --- how the body moves. mvR: how much it moves. dF, dS: part of the full speed forward / to the L side. push: how hard it accelerates or rises.
    const mvR = Math.max(t.mv, Math.min(1, Math.hypot(t.vf, t.vs) / 1.2), Math.min(0.5, Math.abs(t.tn) * 0.7));
    const noV = Math.abs(t.vf) + Math.abs(t.vs) < 0.02 && Math.abs(t.tn) < 0.02;
    const dF = cl(t.vf / 2.6 + (noV ? t.sw * 1.4 : 0), -1, 1), dS = cl(t.vs / 2.6, -1, 1), sp = Math.min(1, Math.hypot(dF, dS));
    const push = cl(Math.hypot(t.af, t.as) / 30, 0, 1) + cl(t.va * 0.25, 0, 0.6);
    const hitB = -t.hx * h, hitS = t.hz * h, hit0 = h * (1 - Math.min(1, Math.abs(t.hx) + Math.abs(t.hz)));   // push to the back / to the L; hit0: a hit with no direction
    const rest = (1 - mvR) * (1 - Math.max(a, s)) * nu;
    // flutter: the beat is not even. The beat time changes a little all the time, and it is faster when the moth accelerates or rises.
    const fs = c._flut || (c._flut = { acc: 0, tm });
    let dt = tm - fs.tm; fs.tm = tm; if (!(dt > 0) || dt > 0.2) dt = 0;
    fs.acc += Math.min(dt, 0.034) * 12.6 * (push * 0.55 + sp * 0.12); if (fs.acc > 1e4) fs.acc -= 1e4;
    const br = Math.sin(t.p), ph = tm * 12.6 + Math.sin(tm * 2.1) * Math.sin(tm * 0.83 + 1) * 1.1 + fs.acc, pw = buff ? Math.min(1, a + s) * nu : 0;      // about 2 wing beats each second
    // the beat stops when the wings hold a pose
    const still = Math.min(1, (melee ? a * 0.4 + s : slam ? a * 0.5 + s : shot ? a * 0.3 + s * 0.6 : pw * 0.5) * nu + uo);
    const amp = (0.3 + mvR * 0.08 + push * 0.16 + t.gl * 0.06) * (1 + 0.2 * Math.sin(tm * 3.3 + 1) * Math.sin(tm * 1.1)) * (1 - still * 0.85);
    // hover: it drifts away a little and corrects (two slow waves, so the path does not repeat)
    const dx = Math.sin(tm * 0.9) * Math.sin(tm * 0.37 + 1) * 0.07 * rest, dz = Math.sin(tm * 0.7 + 2) * Math.sin(tm * 0.29) * 0.08 * rest;
    // body: each down stroke lifts it. Drop from above: it rises, falls on the target, rises again.
    b.body.position.y += br * 0.02 - Math.sin(ph - 0.9) * 0.075 * amp + Math.sin(tm * 1.3) * Math.sin(tm * 0.41 + 2) * 0.03 * rest + (melee ? a * 0.2 - s * 0.3 : slam ? a * 0.14 - s * 0.12 : shot ? a * 0.05 : pw * 0.1) * nu - (hitB + hit0) * 0.04 + uo * (0.06 + step * 0.075);
    b.body.position.x += dx + (melee ? s * 0.3 - a * 0.12 : shot ? -a * 0.06 - s * 0.08 : 0) * nu - (hitB + hit0) * 0.08;
    b.body.position.z += dz + hitS * 0.08 + uo * side * 0.09;
    // it puts its nose down to fly forward, rolls into a side step, leans against its drift, and pitches up when it brakes
    b.body.rotation.z = -dF * 0.17 * mvR + dx * 1.2 + (hitB + hit0) * 0.2 - Math.sin(ph - 0.4) * 0.03 * amp + (melee ? a * 0.25 - s * 0.42 : shot ? a * 0.14 - s * 0.12 : slam ? s * 0.06 - a * 0.08 : pw * 0.08) * nu + uo * (0.07 - step * 0.05);
    b.body.rotation.x = dS * 0.16 * mvR - dz * 1.2 + t.tn * 0.1 * sp + hitS * 0.22 + uo * side * 0.17;
    b.body.rotation.y = t.lk * 0.1 + Math.sin(tm * 0.6) * Math.sin(tm * 0.23 + 1) * 0.08 * rest + uo * side * 0.1;
    // wings. lift > 0 = up. Crystal rain: sweep forward. Dust burst: flat, wide, shiver. Drop: folded up.
    const pose = (melee ? s * 0.95 - a * 0.22 : shot ? a * 0.45 - s * 0.35 : slam ? a * 0.55 - s * 0.5 : pw * 0.3) * nu;
    const shiver = (slam ? Math.sin(tm * 47) * (0.07 * s + 0.025 * a) * nu : 0) + h * Math.sin(tm * 38) * 0.06 + t.gl * Math.sin(tm * 9) * 0.03;
    // ultimate: the forewings go down to level (-0.44), the hindwings to level (-0.2); a small rise and fall with each step
    const liftF = Math.sin(ph) * amp + pose + h * 0.3 + shiver + uo * (-0.44 - step * 0.07), liftH = Math.sin(ph - 0.7) * amp * 0.85 + pose * 0.8 + h * 0.22 - shiver + uo * (-0.2 - step * 0.09);
    const sweep = (shot ? s * 0.62 - a * 0.4 : melee ? -s * 0.3 : slam ? s * 0.1 : pw * 0.12) * nu - dF * 0.08 * mvR - h * 0.1 + uo * 0.3;
    const sweepH = (sweep - uo * 0.3) * 0.6 - (slam ? s * 0.28 * nu : 0) - pw * 0.1 - uo * 0.34;
    const twist = Math.cos(ph) * 0.3 * amp + (shot ? a * 0.15 - s * 0.28 : 0) * nu + dF * 0.06 * mvR;
    // in a turn the wing on the outside lifts and beats wider; in a side step the wing on the far side lifts
    const bank = (t.tn * 0.16 + dS * 0.1) * mvR * nu, wob = Math.sin(tm * 5.3) * Math.sin(tm * 1.9 + 1) * 0.04 * (1 - still);
    b.wingL.rotation.set(-(liftF - bank + wob), sweep, twist); b.wingR.rotation.set(liftF + bank - wob, -sweep, twist);
    b.hindL.rotation.set(-(liftH - bank * 0.8), sweepH, twist * 0.7); b.hindR.rotation.set(liftH + bank * 0.8, -sweepH, twist * 0.7);
    { const g = 1 + (slam ? s * 0.12 * nu : 0) + uo * 0.1; b.wingL.scale.setScalar(g); b.wingR.scale.setScalar(g); b.hindL.scale.setScalar(g); b.hindR.scale.setScalar(g); }
    // crystal hangers: pendulums (dyn). Here: they stay level when the wing turns and they get a small push from each wing beat.
    // In the ultimate they swing outward, more on each step, and they follow the sway of the body.
    const jit = h * 0.3 + (slam ? s * 0.25 + a * 0.05 : 0) * nu + t.gl * 0.05, out = uo * (0.5 + Math.abs(step) * 0.22);
    for (const [n, w, sg, q] of DN) {
      const d = b[n], wb = b[w];
      d.rotation.x = -wb.rotation.x * 0.85 - b.body.rotation.x * 0.8 + Math.sin(t.p * 1.7 + q) * 0.05 * (1 + t.gl) - sg * ((melee ? s2 * 0.5 : slam ? s * 0.3 : 0) * nu + out) + uo * side * 0.2 + jit * Math.cos(tm * 33 + q * 2);
      d.rotation.z = -wb.rotation.z - b.body.rotation.z * 0.8 + Math.sin(ph - 1.1 + q * 0.3) * 0.22 * amp + (shot ? s2 * 0.9 - a * 0.45 : 0) * nu + jit * Math.sin(tm * 41 + q) + uo * Math.sin(tm * 5 + q) * 0.06;
    }
    // candles on the wing tips: they stay upright when the wing moves
    b.tipL.rotation.x = -b.wingL.rotation.x * 0.9 - b.body.rotation.x * 0.7; b.tipR.rotation.x = -b.wingR.rotation.x * 0.9 - b.body.rotation.x * 0.7;
    b.tipL.rotation.z = b.tipR.rotation.z = -twist * 0.9 - b.body.rotation.z * 0.7;
    // head and antennae. The head stays level when the body pitches; it looks around at rest.
    const look = Math.sin(tm * 0.8) * Math.sin(tm * 0.27 + 2) * rest;
    b.head.rotation.z = br * 0.03 - (hitB + hit0) * 0.25 - b.body.rotation.z * 0.5 + (melee ? s2 * 0.25 - a * 0.15 : shot ? a * 0.15 - s * 0.2 : pw * 0.15) * nu + uo * (0.12 + step * 0.04);
    b.head.rotation.y = t.lk * 0.45 + look * 0.25 - hitS * 0.3;
    b.head.rotation.x = Math.sin(t.p * 0.6) * 0.05 - b.body.rotation.x * 0.5 - uo * side * 0.2;
    const twL = Math.max(0, Math.sin(tm * 1.9) * Math.sin(tm * 0.53 + 1) - 0.72) * 1.4 * rest, twR = Math.max(0, Math.sin(tm * 1.6 + 2) * Math.sin(tm * 0.47) - 0.72) * 1.4 * rest;
    const az = Math.sin(t.p * 1.3) * 0.05 - h * 0.35 + dF * 0.1 * mvR + (melee ? a * 0.15 + s * 0.3 : shot ? a * 0.2 - s * 0.45 : slam ? a * 0.25 - s * 0.2 : pw * 0.18) * nu + uo * 0.12;
    const ax = Math.sin(t.p * 0.9) * 0.05 + pw * 0.25 + (slam ? s * 0.35 * nu : 0) + h * 0.15 + uo * 0.3;
    b.antL.rotation.z = az - twL; b.antR.rotation.z = az + Math.sin(t.p * 1.3 + 1.2) * 0.03 - twR;
    b.antL.rotation.x = ax - uo * side * 0.1; b.antR.rotation.x = -ax - uo * side * 0.1;
    // abdomen: a spring moves it (dyn). Here: breath wave, it pumps with the wing beat, it curls in the wind-up; in the waltz it swings behind the body like a skirt
    const curl = br * 0.04 + Math.sin(ph - 1.6) * 0.05 * amp + dF * 0.06 * mvR + (melee ? a * 0.2 - s * 0.3 : shot ? a * 0.12 : slam ? s * 0.15 - a * 0.1 : -pw * 0.1) * nu + h * 0.12 - uo * (0.1 + step * 0.06);
    ['abd1', 'abd2', 'abd3'].forEach((n, i) => { b[n].rotation.z = curl * (0.6 + 0.3 * i); b[n].rotation.y = Math.sin(t.p * 0.9 - i * 0.7) * 0.04 + t.tn * 0.07 * mvR + uo * Math.sin(Math.PI * bar - 0.5 - i * 0.5) * 0.22; });
    // legs: they hang and swing (dyn). They pull up a little when it flies fast, and one leg moves now and then at rest.
    for (let i = 0; i < 6; i++) { const lg = P[LEGS[i]]; lg.rotation.z -= sp * mvR * 0.3 - Math.max(0, Math.sin(tm * 1.1 + i * 2.3) * Math.sin(tm * 0.37 + i) - 0.7) * 0.9 * rest; lg.rotation.x += (i % 2 ? -1 : 1) * (sp * mvR * 0.25 + Math.max(a, s) * 0.3 * nu); }
    // candle tier and chain: they hang and swing (dyn). The tier turns for the buff (60 degrees = the same picture) and with each bar of the waltz.
    b.tier.rotation.z = -b.body.rotation.z * 0.65 + Math.sin(t.p * 1.1) * 0.03 + h * 0.2 * Math.sin(tm * 19);   // it hangs: it stays almost level when the body pitches
    b.tier.rotation.x = -b.body.rotation.x * 0.65 + Math.cos(t.p * 0.9) * 0.03;
    b.tier.rotation.y = Math.sin(t.p * 0.5) * 0.15 * nu + (buff ? (a * 1.047 + s * 2.094) * nu : 0) + t.gl * Math.sin(tm * 1.5) * 0.2 * nu + (uo > 0.02 ? turn : 0);
    b.tier.position.y += (melee ? s * 0.12 * nu : 0) - uo * 0.03 - Math.sin(ph - 1.3) * 0.02 * amp;
    b.chain.rotation.z = Math.sin(t.p * 1.2) * 0.05 + h * 0.3 + (melee ? s2 * 0.3 * nu : 0);
    b.chain.rotation.x = Math.cos(t.p) * 0.04 - uo * side * 0.45;
    // flames: they lean away from the motion (dyn) and flicker; they grow with power; tall in the ultimate, with a pulse on beat 1
    const grow = Math.max(0.3, 1 + a * 0.3 * nu + t.gl * 0.4 + (buff ? pw * 0.9 : s * 0.3 * nu) - h * 0.35 + uo * (0.85 + (bi === 0 ? 0.3 * Math.sin(Math.PI * fb) : 0)));
    const fla = (f, sp1, q, g, lx) => {
      const wd = (1 + (g - 1) * 0.45) * (1 + 0.06 * Math.sin(tm * (sp1 + 6) + q));
      // the flicker: a fast wave, a slower wave, and a short dip now and then (a draught)
      const dip = Math.max(0, Math.sin(tm * 2.3 + q * 1.7) * Math.sin(tm * 0.9 + q) - 0.8) * 2.2;
      f.scale.y *= g * (1 + 0.13 * Math.sin(tm * sp1 + q) + 0.07 * Math.sin(tm * sp1 * 1.9 + q * 3) - dip * 0.5 - sp * mvR * 0.15); f.scale.x *= wd; f.scale.z *= wd;
      f.rotation.z += 0.07 * Math.sin(tm * 7.3 + q) + dip * 0.3; f.rotation.x += 0.05 * Math.sin(tm * 5.1 + q * 2) + lx;
    };
    fla(P.flameL, 17, 0, grow, 0); fla(P.flameR, 19, 2.3, grow, 0);
    fla(P.wfL, 16, 1.1, grow * 0.95, uo * side * 0.25); fla(P.wfR, 18, 3.6, grow * 0.95, uo * side * 0.25);
    for (let i = 0; i < 6; i++) fla(P[FL[i]], 15 + i * 2.3, i * 1.7, grow * (1 + pw * 0.3), 0);
    P.haloL.scale.multiplyScalar(1 + (grow - 1) * 0.6 + 0.08 * Math.sin(tm * 6));
    P.haloR.scale.multiplyScalar(1 + (grow - 1) * 0.6 + 0.08 * Math.sin(tm * 6 + 2));
  }
};
