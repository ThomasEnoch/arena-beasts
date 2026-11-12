/* Coralgolem (Atollem, the Sea Wall) - a slow guardian of white and pale pink coral. Brain coral on the shoulders, purple sea fans,
   anemones, barnacles and kelp. Heart piece: the blue-green pearl that floats in its hollow chest, behind bars of coral.
   Maker's mark: a ring of blue sea glass on its brow. Bloom / Tide. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, ball, lathe, canvasTex, wing, torus } from '../geo.js';
import { noise } from '../sculpt.js';
import { A } from '../rig.js';

const CORAL = '#e4dfd7', SHADE = '#cdbfb0', DEEP = '#a39584', BLUSH = '#ecaaa6', SEA = '#48d4e4', LINING = '#1c7e94';
const STEM = { col: '#e6dccb', rough: 0.72 };
const TIP = { col: '#f6b0a0', rough: 0.55, glow: '#ff8e7a', glowK: 0.4 };
const RIB = { col: '#efc6ba', rough: 0.5 };
const BARN = { col: '#ffffff', rough: 0.85, vc: true, flat: true };
const KELP = { col: '#3f9a4e', rough: 0.45, glow: '#1c6a30', glowK: 0.25, noOut: true };
const KELP2 = { col: '#2c7a52', rough: 0.45, glow: '#145a3a', glowK: 0.25, noOut: true };
const AURA = { col: '#a8f6e6', glow: '#6fe8d8', glowK: 1.3, add: true, op: 0.3, noOut: true };
const MOTE = { col: '#f4fffb', glow: '#a8f6e8', glowK: 1.8, noOut: true };
const ANEM = { col: '#f58cb2', rough: 0.5, glow: '#ff4f8e', glowK: 0.3 };
const ANEM2 = { col: '#f4a660', rough: 0.5, glow: '#ff8a3a', glowK: 0.3 };
const GLASS = { col: '#1f6fe4', rough: 0.06, env: 1.7, glow: '#1450c8', glowK: 0.7, noOut: true };   // maker's mark: blue sea glass
let pearlTex = null, PEARL = null, fanTex = null, FAN = null;

const D = Math.PI / 180, _e = new THREE.Euler(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0), TAU = Math.PI * 2, GL = { c: 0, lift: 0, flex: 0, load: 0 }, GR = { c: 0, lift: 0, flex: 0, load: 0 };
const cl = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
// One leg in the step cycle. ph = phase (rad), duty = part of the cycle with the foot on the floor.
// c: position of the foot along the step (1 = far forward, -1 = far back). lift, flex: 0..1 while the foot is in the air.
// load: 0..1 just after the foot lands (the weight comes down).
function stride(ph, duty, o) {
  let u = ph / TAU; u -= Math.floor(u);
  if (u < duty) { const s = u / duty; o.c = 1 - 2 * s; o.lift = 0; o.flex = 0; o.load = s < 0.4 ? Math.sin(s / 0.4 * Math.PI) : 0; }
  else { const s = (u - duty) / (1 - duty), e = s * s * (3 - 2 * s); o.c = 2 * e - 1; o.lift = Math.sin(Math.PI * Math.pow(s, 0.85)); o.flex = Math.sin(Math.PI * Math.pow(s, 0.6)); o.load = 0; }
  return o;
}
// a copy of a geometry at a place: position, rotation (degrees) or a direction for +Y, scale
function at(g, p, r, s) {
  if (r && r.isVector3) _q.setFromUnitVectors(UP, _v.copy(r).normalize()); else { r = r || [0, 0, 0]; _q.setFromEuler(_e.set(r[0] * D, r[1] * D, r[2] * D, 'XYZ')); }
  return g.clone().applyMatrix4(_m.compose(new THREE.Vector3(p[0], p[1], p[2]), _q, _s.setScalar(s || 1)));
}
function merge(list) {
  return mergeGeometries(list.map(g => { if (g.getAttribute('uv')) g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));
}
// rotation (degrees, XYZ) that turns +Y to the direction n
function aim(n) { _e.setFromQuaternion(_q.setFromUnitVectors(UP, _v.set(n[0], n[1], n[2]).normalize()), 'XYZ'); return [_e.x / D, _e.y / D, _e.z / D]; }
// point and normal on an ellipsoid. az: 0 = front, 90 = +Z side. el: up
function onEll(c, r, az, el) {
  if (typeof r === 'number') r = [r, r, r];
  const d = [Math.cos(el * D) * Math.cos(az * D), Math.sin(el * D), Math.cos(el * D) * Math.sin(az * D)];
  return { p: [c[0] + r[0] * d[0], c[1] + r[1] * d[1], c[2] + r[2] * d[2]], n: [d[0] / r[0], d[1] / r[1], d[2] / r[2]] };
}
// staghorn antler: branches that fork, with round pale tips. It grows to +Y, about 0.45 high.
function antler() {
  const br = [
    [[[0, -0.04, 0], [0.02, 0.12, 0.01], [0.0, 0.27, 0.03], [-0.03, 0.44, 0.02]], [0.056, 0.046, 0.036, 0.024]],
    [[[0.01, 0.09, 0.0], [0.1, 0.17, 0.03], [0.15, 0.28, 0.02], [0.14, 0.38, -0.01]], [0.038, 0.032, 0.026, 0.02]],
    [[[0.0, 0.19, 0.02], [-0.09, 0.25, 0.07], [-0.15, 0.35, 0.1]], [0.034, 0.027, 0.02]],
    [[[0.1, 0.17, 0.03], [0.17, 0.2, 0.09], [0.23, 0.28, 0.13]], [0.028, 0.022, 0.017]],
    [[[-0.01, 0.3, 0.03], [0.04, 0.36, -0.05], [0.05, 0.45, -0.09]], [0.028, 0.022, 0.017]],
    [[[-0.09, 0.25, 0.07], [-0.14, 0.26, 0.0], [-0.2, 0.31, -0.04]], [0.024, 0.02, 0.015]]
  ];
  const stems = [], tips = [];
  for (const [pts, rr] of br) {
    stems.push(tube(pts, rr, { ring: 7 }));
    tips.push(at(ball(rr[rr.length - 1] * 1.75, 9, 7), pts[pts.length - 1]));
  }
  return [merge(stems), merge(tips)];
}
// barnacle cluster: small volcano cones on a low dome. The dome top is at the origin, the cones point to +Y.
function barnacles(n, spread, seed) {
  const prof = [[0.055, -0.03], [0.046, 0.012], [0.031, 0.05], [0.023, 0.064], [0.015, 0.054], [0.011, 0.024]], RC = 0.3, list = [];
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const a = i * 2.4 + rnd(), d = spread * Math.sqrt((i + 0.25) / n), ti = d / RC, sc = 0.75 + rnd() * 0.75;
    const dir = new THREE.Vector3(Math.sin(ti) * Math.cos(a), Math.cos(ti), Math.sin(ti) * Math.sin(a));
    const g = at(lathe(prof, 9), [dir.x * RC, (dir.y - 1) * RC, dir.z * RC], dir, sc), P = g.getAttribute('position'), col = new Float32Array(P.count * 3);
    for (let j = 0; j < P.count; j++) {
      const q = j % prof.length, tone = q >= 4 ? 0 : 0.66 + q * 0.1 + rnd() * 0.05;
      _c.set(q >= 4 ? '#1d4a54' : '#d9d3c2').multiplyScalar(q >= 4 ? 1 : tone);
      col[j * 3] = _c.r; col[j * 3 + 1] = _c.g; col[j * 3 + 2] = _c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    list.push(g);
  }
  return merge(list);
}
// anemone: a short column with two rings of tentacles. It grows to +Y, about 0.2 high.
function anemone(n, seed) {
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const list = [lathe([[0.058, -0.02], [0.046, 0.03], [0.042, 0.075], [0.056, 0.098], [0.03, 0.104], [0.0001, 0.092]], 10)];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + rnd() * 0.3, cs = Math.cos(a), sn = Math.sin(a), l = 0.085 + rnd() * 0.04;
    list.push(tube([[cs * 0.036, 0.09, sn * 0.036], [cs * 0.072, 0.1 + l * 0.6, sn * 0.072], [cs * (0.1 + rnd() * 0.03), 0.1 + l, sn * (0.1 + rnd() * 0.03)]], [0.016, 0.013, 0.008], { ring: 5, seg: 5 }));
    if (i % 2 === 0) list.push(tube([[cs * 0.012, 0.094, sn * 0.012], [cs * 0.03, 0.15, sn * 0.03], [cs * 0.036, 0.185 + rnd() * 0.02, sn * 0.036]], [0.013, 0.01, 0.007], { ring: 5, seg: 4 }));
  }
  return merge(list);
}
// sea fan: a flat fan with a lace of veins. It grows to +Y from its foot, about 0.5 high. It faces +Z and -Z.
function seaFan() {
  const g = wing([[0, -0.03], [0.07, -0.13], [0.2, -0.235], [0.34, -0.25], [0.45, -0.17], [0.5, -0.02], [0.48, 0.13], [0.39, 0.235], [0.24, 0.26], [0.1, 0.17], [0, 0.03]], 0.014);
  return g.rotateX(-Math.PI / 2);
}
// kelp strand that hangs down: a flat wavy band
function kelp(len, w, wave, ph) {
  const pts = [], rr = [];
  for (let i = 0; i <= 5; i++) { const u = i / 5; pts.push([Math.sin(u * 4.4 + ph) * wave * u, -u * len, 0]); rr.push(w * (i === 0 ? 0.6 : i === 5 ? 0.15 : 1 - u * 0.25)); }
  const g = tube(pts, rr, { ring: 6 }); g.scale(1, 1, 0.22);
  return g;
}

export default {
  id: 'coralgolem', rim: '#bfeff5', focus: 'pearl', top: 2.1, rough: 0.84, opts: { mottle: 0.15, mottleF: 17 },
  // spring parts: all of them move as in water (high drag, they settle slowly). Sea fans, anemones, the kelp cape and the kelp on the club arm.
  dyn: [
    { b: ['fan0'], k: 38, d: 6, amt: 0.8, drag: 5, dir: [0, 1, 0] }, { b: ['fan1'], k: 44, d: 6.5, amt: 0.7, drag: 5, dir: [0.2, 0.6, 0.75] }, { b: ['fan2'], k: 41, d: 6, amt: 0.7, drag: 5, dir: [-0.6, 0.5, 0.6] },
    { b: ['an0'], k: 60, d: 7, amt: 0.6, drag: 4, dir: [-0.5, 0.8, 0.3] }, { b: ['an1'], k: 66, d: 7, amt: 0.6, drag: 4, dir: [0.3, 0.9, -0.3] },
    { b: ['an2'], k: 62, d: 7, amt: 0.6, drag: 4, dir: [0.5, 0.5, 0.7] }, { b: ['an3'], k: 58, d: 7, amt: 0.6, drag: 4, dir: [-0.4, 0.8, 0.4] },
    { b: ['weed', 'weed2'], k: 34, d: 5.5, amt: 0.8, drag: 3.2 }, { b: ['kelp'], k: 30, d: 5, amt: 0.9, drag: 3.2, dir: [0, -1, 0] },
    { b: ['kp0'], k: 26, d: 4.6, amt: 0.8, drag: 3.2, dir: [0, -1, 0] }, { b: ['kp1'], k: 29, d: 5, amt: 0.8, drag: 3.2, dir: [0, -1, 0] },
    { b: ['kp2'], k: 24, d: 4.4, amt: 0.8, drag: 3.2, dir: [0, -1, 0] }, { b: ['kp3'], k: 28, d: 4.8, amt: 0.8, drag: 3.2, dir: [0, -1, 0] },
    { b: ['ka0'], k: 26, d: 4.6, amt: 0.8, drag: 3.2, dir: [0, -1, 0] }, { b: ['ka1'], k: 30, d: 5, amt: 0.8, drag: 3.2, dir: [0, -1, 0] }
  ],
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('hips', 'root', [0, 0.64, 0]).bone('chest', 'hips', [0, 0.9, 0]).bone('head', 'chest', [0.2, 1.44, 0])
      .bone('pearl', 'chest', [0.06, 1.12, 0]).bone('ribL', 'chest', [0.42, 1.12, 0.24], { m: 1 })
      .bone('armL', 'chest', [0.0, 1.42, 0.46]).bone('foreL', 'armL', [0.16, 0.98, 0.61]).bone('handL', 'foreL', [0.48, 0.64, 0.585]).bone('kelp', 'foreL', [0.23, 0.7, 0.62])
      .bone('armR', 'chest', [0.04, 1.36, -0.42]).bone('foreR', 'armR', [0.12, 1.02, -0.55]).bone('handR', 'foreR', [0.37, 0.845, -0.5])
      .bone('legL', 'hips', [0, 0.56, 0.21], { m: 1 }).bone('shinL', 'legL', [0.02, 0.36, 0.21], { m: 1 }).bone('footL', 'shinL', [0.03, 0.16, 0.21], { m: 1 })
      .bone('weed', 'chest', [-0.5, 1.42, -0.12]).bone('weed2', 'weed', [-0.52, 1.14, -0.12]);

    S.color(CORAL);
    // stump legs with three toe knobs
    S.cap('legL', [0, 0.56, 0.2], [0.012, 0.4, 0.205], 0.17, 0.175, { m: 1 });
    S.cap('shinL', [0.015, 0.35, 0.205], [0.02, 0.22, 0.21], 0.175, 0.18, { m: 1 });
    S.ell('footL', [0.06, 0.11, 0.21], [0.24, 0.12, 0.18], { m: 1, col: SHADE, k: 0.05 });
    for (let i = -1; i <= 1; i++) S.ell('footL', [0.27 - Math.abs(i) * 0.03, 0.07, 0.21 + i * 0.11], [0.075, 0.064, 0.06], { m: 1, col: '#d9a49a', k: 0.02 });
    S.ell('shinL', [0.1, 0.4, 0.27], [0.12, 0.1, 0.11], { m: 1, k: 0.05 });
    // hips, barrel chest, lumps (the left side is larger)
    S.ell('hips', [-0.02, 0.66, 0], [0.36, 0.25, 0.36]);
    S.ell('chest', [0, 1.12, 0], [0.48, 0.46, 0.42], { sb: 0.05 });
    S.ell('chest', [-0.28, 1.44, -0.1], [0.27, 0.2, 0.3], { k: 0.07 });
    S.ell('chest', [-0.06, 1.47, 0.3], [0.3, 0.21, 0.25], { k: 0.07 });
    S.ell('chest', [0.04, 1.4, -0.3], [0.2, 0.16, 0.2], { k: 0.07 });
    S.ell('chest', [0.3, 0.8, 0.0], [0.2, 0.13, 0.24], { col: SHADE, cb: 0.06 });
    S.ell('chest', [-0.36, 0.92, 0.18], [0.17, 0.2, 0.2], { k: 0.07 });
    S.ell('chest', [-0.3, 0.86, -0.24], [0.15, 0.15, 0.16], { k: 0.07 });
    // head: small, low between the shoulders, heavy brow
    S.ell('head', [0.26, 1.5, 0], [0.2, 0.165, 0.19]);
    S.ell('head', [0.36, 1.415, 0], [0.13, 0.07, 0.14], { col: SHADE, k: 0.03 });
    S.cap('head', [0.4, 1.59, -0.13], [0.4, 1.59, 0.13], 0.065, 0.065, { k: 0.04 });
    S.ell('head', [0.16, 1.62, 0.08], [0.12, 0.08, 0.1], { k: 0.05 });
    // left arm: a great club of brain coral
    S.ell('armL', [0.0, 1.42, 0.5], [0.23, 0.23, 0.22], { w: 2 });
    S.cap('armL', [0.0, 1.4, 0.52], [0.16, 1.0, 0.61], 0.19, 0.16, { w: 2 });
    S.ell('foreL', [0.16, 0.98, 0.61], 0.17, { w: 2 });
    S.cap('foreL', [0.16, 0.98, 0.61], [0.46, 0.68, 0.585], 0.165, 0.195, { w: 2 });
    S.ell('handL', [0.6, 0.46, 0.55], [0.27, 0.26, 0.23], { k: 0.07, w: 2 });
    S.ell('handL', [0.8, 0.34, 0.44], 0.1, { k: 0.04 });
    S.ell('handL', [0.84, 0.4, 0.555], 0.105, { k: 0.04 });
    S.ell('handL', [0.78, 0.34, 0.665], 0.095, { k: 0.04 });
    S.ell('handL', [0.66, 0.64, 0.59], 0.115, { k: 0.05 });
    S.ell('handL', [0.5, 0.3, 0.59], 0.12, { k: 0.05 });
    // right arm: thin, with three fingers
    S.ell('armR', [0.04, 1.36, -0.44], 0.15, { w: 2 });
    S.cap('armR', [0.04, 1.34, -0.46], [0.12, 1.02, -0.55], 0.1, 0.085, { w: 2 });
    S.ell('foreR', [0.12, 1.02, -0.55], 0.105, { k: 0.04, w: 2 });
    S.cap('foreR', [0.12, 1.02, -0.55], [0.34, 0.86, -0.5], 0.088, 0.1, { w: 2 });
    S.ell('handR', [0.43, 0.82, -0.49], [0.115, 0.1, 0.105]);
    for (let i = -1; i <= 1; i++) S.cap('handR', [0.5, 0.83, -0.49 + i * 0.065], [0.6, 0.77 - Math.abs(i) * 0.01, -0.49 + i * 0.085], 0.044, 0.036, { col: SHADE, k: 0.02 });
    // the hole through the chest and the room for the pearl
    S.cap('chest', [-0.8, 1.12, 0], [0.8, 1.12, 0], 0.2, 0.2, { sub: 1, col: LINING, glow: 0.7, k: 0.03 });
    S.ell('chest', [0.04, 1.12, 0], [0.27, 0.25, 0.26], { sub: 1, col: LINING, glow: 0.7, k: 0.03 });
    S.tor('chest', [0.43, 1.12, 0], 0.24, 0.062, { rot: [0, 0, 90], k: 0.04 });
    S.tor('chest', [-0.43, 1.1, 0], 0.235, 0.055, { rot: [0, 0, 90], k: 0.04, col: SHADE });
    // deep eye sockets
    S.ell('head', [0.435, 1.515, 0.088], [0.066, 0.056, 0.062], { m: 1, sub: 1, col: '#0e2c36', glow: 0.4, k: 0.01 });

    // colour: dark below, pale pink on the high lumps and on the knuckles, sea-blue light in the cracks
    S.ell('hips', [0, 0.3, 0], [0.6, 0.22, 0.6], { paint: 1, col: DEEP, cb: 0.14, op: 0.6 });
    S.ell('chest', [-0.08, 1.66, 0.3], [0.26, 0.12, 0.24], { paint: 1, col: BLUSH, cb: 0.1, op: 0.8 });
    S.ell('chest', [-0.3, 1.62, -0.1], [0.24, 0.1, 0.26], { paint: 1, col: BLUSH, cb: 0.1, op: 0.7 });
    S.ell('armR', [0.04, 1.5, -0.4], [0.18, 0.1, 0.18], { paint: 1, col: BLUSH, cb: 0.08, op: 0.7 });
    S.ell('armL', [0.0, 1.6, 0.56], [0.2, 0.1, 0.18], { paint: 1, col: BLUSH, cb: 0.08, op: 0.7 });
    S.ell('foreL', [0.8, 0.38, 0.57], [0.18, 0.22, 0.28], { paint: 1, col: BLUSH, cb: 0.1, op: 0.8 });
    S.ell('foreR', [0.56, 0.8, -0.49], [0.1, 0.07, 0.14], { paint: 1, col: BLUSH, cb: 0.05, op: 0.8 });
    S.ell('head', [0.2, 1.66, 0], [0.2, 0.07, 0.2], { paint: 1, col: BLUSH, cb: 0.07, op: 0.6 });
    S.ell('legL', [0.12, 0.44, 0.3], [0.12, 0.1, 0.1], { paint: 1, col: BLUSH, cb: 0.07, op: 0.6, m: 1 });
    S.ell('head', [0.47, 1.43, 0], [0.03, 0.014, 0.1], { paint: 1, col: '#5a5046', cb: 0.01 });
    const crack = { paint: 1, col: SEA, glow: 0.9, cb: 0.013 };
    const line = (bone, c, r, list, w) => { const pts = list.map(a => onEll(c, r, a[0], a[1]).p); S.tube(bone, pts, pts.map((p, i) => (w || 0.026) * (1 - i / pts.length * 0.5)), crack); };
    const CH = [[0, 1.12, 0], [0.48, 0.46, 0.42]], FI = [[0.6, 0.46, 0.55], [0.27, 0.26, 0.23]];
    line('chest', CH[0], CH[1], [[26, 30], [34, 44], [28, 56], [38, 64]]);
    line('chest', CH[0], CH[1], [[34, 44], [48, 46], [56, 38]]);
    line('chest', CH[0], CH[1], [[-30, 26], [-42, 34], [-46, 48], [-58, 52]]);
    line('chest', CH[0], CH[1], [[-36, -22], [-50, -30], [-52, -44]]);
    line('chest', CH[0], CH[1], [[30, -28], [42, -38], [40, -52], [52, -58]]);
    line('chest', CH[0], CH[1], [[150, 8], [138, -6], [142, -22], [128, -30]]);
    line('chest', CH[0], CH[1], [[-140, 34], [-128, 20], [-134, 4]]);
    line('foreL', FI[0], FI[1], [[70, 50], [84, 30], [74, 8], [88, -12]], 0.03);
    line('foreL', FI[0], FI[1], [[84, 30], [104, 24], [118, 8]], 0.026);
    line('foreL', FI[0], FI[1], [[30, 52], [8, 62], [-16, 50]], 0.026);
    line('armL', [0.0, 1.42, 0.5], [0.23, 0.23, 0.22], [[60, 20], [78, -4], [70, -30]], 0.024);
    S.cap('legL', [0.15, 0.44, 0.29], [0.18, 0.3, 0.3], 0.024, 0.02, Object.assign({ m: 1 }, crack));
    S.cap('legL', [0.18, 0.3, 0.3], [0.14, 0.2, 0.35], 0.02, 0.014, Object.assign({ m: 1 }, crack));
    // brain coral: deep grooves that wind over the shoulders and the club. The other surfaces are rough coral with small pores.
    const BRAIN = [[0.0, 1.44, 0.5, 0.4], [-0.06, 1.5, 0.3, 0.38], [0.04, 1.38, -0.42, 0.3], [-0.28, 1.46, -0.1, 0.36], [0.62, 0.44, 0.55, 0.42]];
    S.paint((p, n, c, info) => {
      if (info.glow > 0.12 || c[2] > c[0]) return;
      let m = 0;
      for (const q of BRAIN) { const dx = p.x - q[0], dy = p.y - q[1], dz = p.z - q[2], w = (q[3] - Math.sqrt(dx * dx + dy * dy + dz * dz)) / 0.14; if (w > m) m = w; }
      m = m > 1 ? 1 : m;
      const u = p.y * 0.72 + p.x * 0.45 + p.z * 0.53 + (noise(p.x * 2.7 + 7, p.y * 2.7, p.z * 2.7 + 3) - 0.5) * 0.5 + noise(p.x * 6.5, p.y * 6.5 + 2, p.z * 6.5) * 0.07;
      const v = Math.sin(u * 44);
      let g = (-0.1 - v) / 0.5; g = g < 0 ? 0 : g > 1 ? 1 : g;
      g *= 0.2 + 0.8 * m;
      let k = 1 - 0.6 * g + (v > 0.4 ? (v - 0.4) * 0.14 * m : 0);
      // pores and pits on the rough coral
      const pr = noise(p.x * 19 + 3, p.y * 19, p.z * 19 + 8);
      if (pr > 0.66) k *= 1 - (pr - 0.66) * 1.5 * (1 - m * 0.7);
      c[0] *= k * (1 - 0.04 * g); c[1] *= k * (1 - 0.05 * g); c[2] *= k * (1 + 0.04 * g);
    });

    // the pearl, its light and three small bubbles in orbit
    if (!PEARL) {
      pearlTex = canvasTex(256, 128, (g, W, H) => {
        const gr = g.createLinearGradient(0, 0, W, H);
        gr.addColorStop(0, '#8ff2e2'); gr.addColorStop(0.22, '#4fd8cc'); gr.addColorStop(0.45, '#7fe4f2'); gr.addColorStop(0.7, '#56dcc4'); gr.addColorStop(1, '#9af4e6');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.globalAlpha = 0.45;
        for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#e8fffa' : '#3fc4d6'; g.beginPath(); g.ellipse((i * 67 + 20) % W, (i * 41 + 16) % H, 34, 12, i, 0, 7); g.fill(); }
        g.globalAlpha = 1;
      });
      PEARL = { col: '#ffffff', map: pearlTex, emap: pearlTex, glowK: 1.9, rough: 0.14, env: 1.6, noOut: true };
      // sea fan: purple lace. The foot of the fan is at the left edge of the texture.
      fanTex = canvasTex(256, 256, (g, W, H) => {
        g.fillStyle = '#7d42b8'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#4b2280';
        for (let r = 1; r <= 9; r++) for (let j = -8; j <= 8; j++) { const a = j * 0.185 + (r % 2) * 0.09, d = r * 27; g.beginPath(); g.ellipse(Math.cos(a) * d, H / 2 + Math.sin(a) * d, 7, 4.5, a, 0, 7); g.fill(); }
        g.strokeStyle = '#d9b2f6'; g.lineCap = 'round';
        for (let j = -5; j <= 5; j++) {
          const a = j * 0.29, x1 = Math.cos(a) * 120, y1 = H / 2 + Math.sin(a) * 120;
          g.lineWidth = 6; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(x1, y1); g.stroke();
          g.lineWidth = 3.5;
          for (const da of [-0.1, 0.1]) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(Math.cos(a + da) * 290, H / 2 + Math.sin(a + da) * 290); g.stroke(); }
        }
        g.strokeStyle = 'rgba(232,200,255,0.5)'; g.lineWidth = 2.5;
        for (const d of [70, 125, 180, 232]) { g.beginPath(); g.arc(0, H / 2, d, -1.6, 1.6); g.stroke(); }
      });
      FAN = { col: '#ffffff', map: fanTex, rough: 0.7, side: true, noOut: true, glow: '#4a2080', glowK: 0.3 };
    }
    S.add('pearl', ball(0.12, 26, 18), PEARL, { p: [0.06, 1.12, 0], name: 'pearl' });
    S.add('pearl', ball(0.175, 20, 14), AURA, { p: [0.06, 1.12, 0], name: 'aura' });
    S.add('pearl', merge([at(ball(0.026, 8, 6), [0.19, 0.03, 0]), at(ball(0.02, 8, 6), [-0.1, -0.05, 0.16]), at(ball(0.017, 8, 6), [-0.09, 0.07, -0.17])]), MOTE, { p: [0.06, 1.12, 0], name: 'motes' });
    // rib prongs in front of the pearl: a cage that can open
    const prong = (y, z) => tube([[0, y, z - 0.24], [0.13, y * 0.95, (z - 0.24) * 1.0 - 0.03], [0.2, y * 0.75, z * 0.45 - 0.24], [0.19, y * 0.5, 0.07 - 0.24]], [0.05, 0.042, 0.03, 0.012], { ring: 7 });
    S.add('ribL', merge([prong(0.135, 0.2), prong(0, 0.245), prong(-0.135, 0.2)]), RIB, { p: [0.44, 1.12, 0.24], m: 1 });
    // staghorn antlers: left shoulder, head (the right one is broken short), back, club arm
    const [stem, tips] = antler();
    for (const [bone, p, r, s] of [['chest', [-0.08, 1.63, 0.33], [20, 0, 12], 1.02], ['head', [0.2, 1.62, 0.09], [24, 20, 6], 0.84], ['head', [0.21, 1.62, -0.1], [-30, 150, 4], 0.4],
      ['chest', [-0.4, 1.56, -0.14], [-14, 200, 34], 0.62], ['foreL', [0.41, 0.92, 0.63], [26, 60, -24], 0.46]]) {
      S.add(bone, stem, STEM, { p, r, s }); S.add(bone, tips, TIP, { p, r, s });
    }
    // barnacle armour
    const b7 = barnacles(7, 0.17, 11), b5 = barnacles(5, 0.13, 5), b4 = barnacles(4, 0.1, 23);
    let o = onEll([0.0, 1.42, 0.5], [0.23, 0.23, 0.22], 58, 30); S.add('armL', b7, BARN, { p: o.p, r: aim(o.n) });
    o = onEll([0.16, 0.98, 0.61], 0.17, 84, 6); S.add('foreL', b5, BARN, { p: o.p, r: aim(o.n) });
    o = onEll([0.6, 0.46, 0.55], [0.27, 0.26, 0.23], 112, 42); S.add('handL', b7, BARN, { p: o.p, r: aim(o.n), s: 0.9 });
    o = onEll([-0.02, 0.66, 0], [0.36, 0.25, 0.36], -62, 18); S.add('hips', b5, BARN, { p: o.p, r: aim(o.n) });
    o = onEll([0, 1.12, 0], [0.48, 0.46, 0.42], -64, -8); S.add('chest', b7, BARN, { p: o.p, r: aim(o.n), s: 0.95 });
    o = onEll([0.26, 1.5, 0], [0.2, 0.165, 0.19], -96, 52); S.add('head', b4, BARN, { p: o.p, r: aim(o.n), s: 0.8 });
    S.add('shinR', b4, BARN, { p: [0.13, 0.42, -0.33], r: aim([0.7, 0.1, -0.7]) });
    // kelp: a short cape from the back hump, two strands under the club arm
    const KX = [[-0.43, -0.34, 50], [-0.5, -0.22, 25], [-0.535, -0.09, -10], [-0.53, 0.04, -40]];
    S.add('weed', merge(KX.map(([x, z, yaw], i) => at(kelp(0.3, 0.04, 0.012, i), [x + 0.5, 0, z + 0.12], [0, yaw, 0]))), KELP2, { p: [-0.5, 1.44, -0.12] });
    KX.forEach(([x, z, yaw], i) => S.add('weed2', kelp(0.24 + (i % 2) * 0.14 + i * 0.03, 0.042, 0.035, i * 1.7), i % 2 ? KELP2 : KELP, { p: [x - 0.01, 1.15, z], r: [0, yaw, 0], name: 'kp' + i }));
    S.add('kelp', kelp(0.38, 0.036, 0.03, 0.5), KELP, { p: [0.2, 0.74, 0.66], r: [0, 20, 0], name: 'ka0' });
    S.add('kelp', kelp(0.28, 0.032, 0.03, 2.2), KELP2, { p: [0.27, 0.66, 0.57], r: [0, -30, 0], name: 'ka1' });
    // purple sea fans: a large one on the right shoulder, small ones on the club arm and on the back
    const fan = seaFan();
    S.add('chest', fan, FAN, { p: [0.0, 1.5, -0.36], r: [-14, 72, 0], name: 'fan0' });
    S.add('foreL', fan, FAN, { p: [0.28, 0.96, 0.74], r: [38, 20, -24], s: 0.56, name: 'fan1' });
    S.add('chest', fan, FAN, { p: [-0.42, 1.02, 0.3], r: [30, 118, 26], s: 0.6, name: 'fan2' });
    // anemones: they live on the shoulders, on the hip and on the club
    const an9 = anemone(9, 7), an7 = anemone(7, 31);
    o = onEll([-0.06, 1.47, 0.3], [0.3, 0.21, 0.25], 150, 50); S.add('chest', an9, ANEM, { p: o.p, r: aim(o.n), name: 'an0' });
    o = onEll([0.04, 1.4, -0.3], [0.2, 0.16, 0.2], -30, 62); S.add('chest', an7, ANEM2, { p: o.p, r: aim(o.n), s: 0.8, name: 'an1' });
    o = onEll([-0.02, 0.66, 0], [0.36, 0.25, 0.36], 52, 26); S.add('hips', an7, ANEM, { p: o.p, r: aim(o.n), s: 0.75, name: 'an2' });
    o = onEll([0.6, 0.46, 0.55], [0.27, 0.26, 0.23], 150, 56); S.add('handL', an9, ANEM2, { p: o.p, r: aim(o.n), s: 0.85, name: 'an3' });
    // maker's mark: a ring of blue sea glass on the brow
    S.add('head', torus(0.044, 0.016, 24, 8).rotateY(Math.PI / 2), GLASS, { p: [0.462, 1.6, 0], r: [0, 0, 14], name: 'mark' });
    S.eye('head', [0.402, 1.515, 0.088], 0.05, { dir: [1, -0.05, 0.2], sclera: '#0c2a34', iris: '#3fbfae', iris2: '#c8fff0', pupil: 'round', size: 60, lid: SHADE, open: 52, tilt: 10, glow: 0.9, m: 1 });
  },
  anim(b, t, c) {
    // u = the ultimate, Living Atoll. It takes the place of the wind-up and the strike poses.
    const u = A.ease(t.u || 0), nu = 1 - u, pulse = 0.5 + 0.5 * Math.sin(t.tm * 4.2);
    const br = Math.sin(t.p * 0.8), a = t.a * nu, s = t.s * nu, h = t.h, P = c.parts;
    const slam = t.k === 'slam' ? 1 : 0, shot = t.k === 'shot' ? 1 : 0, buff = t.k === 'buff' ? 1 : 0, mel = t.k === 'melee' ? 1 : 0;
    const tn = (t.tn || 0) * nu, hx = (t.hx || 0) * h, hz = (t.hz || 0) * h, fol = s * (1 - s) * 4;
    // ---- heavy walk: each leg has its own phase (the 2 sides are not exact mirrors), the knee bends when the foot lifts ----
    const vm = Math.hypot(t.vf || 0, t.vs || 0), known = vm + Math.abs(t.tn || 0) > 0.05, mv = t.mv * nu;
    const dF = known ? (vm > 0.05 ? t.vf / vm : 0) : 1, dS = known && vm > 0.05 ? t.vs / vm : 0, sk = known ? cl(vm / 0.5, 0, 1) : 1, St = 0.44 * sk * mv;
    const gl = stride(t.w, 0.6, GL), gr = stride(t.w + Math.PI + 0.22, 0.6, GR), load = (gl.load + gr.load) * mv, liftD = (gr.lift - gl.lift) * mv;
    const rest = cl(1 - t.mv * 2 - a - s - u - h, 0, 1), ws = Math.sin(t.tm * 0.37) * Math.sin(t.tm * 0.13 + 1) * rest, look = Math.sin(t.tm * 0.29) * Math.sin(t.tm * 0.11 + 2) * rest;
    const air = cl((t.va || 0) / 4, -1, 1);
    // the hips: they go down when the weight lands, they move over the leg that holds the weight, they turn with the step
    const drop = a * (0.05 + buff * 0.1) + s * slam * 0.08 + load * 0.045 + Math.max(0, -air) * 0.05;
    const swayZ = 0.055 * liftD + ws * 0.035, roll = 0.06 * liftD + ws * 0.035, yawH = 0.055 * (gl.c - gr.c) * sk * mv * dF;
    b.hips.position.y += br * 0.006 - drop + 0.018 * (gl.lift + gr.lift) * mv - u * 0.27;
    b.hips.position.z += swayZ + hz * 0.04;
    b.hips.position.x += mel * (s * 0.2 - a * 0.08) + slam * s * 0.06 - u * 0.1 + hx * 0.05;
    b.hips.rotation.x = roll + hz * 0.06;
    b.hips.rotation.y = yawH + mel * (-a * 0.55 + s * 0.7) + tn * 0.06;
    b.hips.rotation.z = h * 0.05 - hx * 0.08 - u * 0.15 + 0.04 * sk * mv * dF;
    // legs: thigh, shin and foot. The knees take up each drop of the hips, so the feet stay on the floor.
    const kb = Math.acos(cl(1 - drop / 0.4, 0.3, 1));
    for (const sd of ['L', 'R']) {
      const g = sd === 'L' ? gl : gr, sg = sd === 'L' ? 1 : -1, U = b['leg' + sd], K = b['shin' + sd], F = b['foot' + sd];
      const th = St * dF * g.c * (1 - 0.25 * tn * sg), lat = 0.26 * dS * sk * mv * g.c, push = g.lift ? 0 : cl((-g.c - 0.45) / 0.55, 0, 1) * mv;
      const fx = g.flex * mv;
      U.rotation.z += th + fx * 0.42 + kb + u * 0.9 + Math.abs(air) * 0.25;
      K.rotation.z -= fx * 0.9 + kb * 2 + u * 2.0 + Math.max(0, air) * 0.6;
      F.rotation.z += fx * 0.4 + g.lift * Math.max(0, g.c) * 0.3 * mv - push * 0.4 * sk + kb - u * 0.3;
      U.rotation.x -= lat + roll - hz * 0.3 * (hz * sg > 0 ? 1 : 0.2);
      U.rotation.y -= tn * 0.3 * g.c * mv * (1 - sk * 0.5) + yawH * 0.6;
      U.position.y += g.lift * 0.03 * mv + push * 0.015 - 0.45 * (2 - Math.cos(th) - Math.cos(lat));
      U.position.z -= swayZ * 0.8;
    }
    // hit: the far leg goes back and takes the weight
    b.legR.rotation.z += hx * 0.4; b.shinR.rotation.z -= Math.abs(hx) * 0.25; b.footR.rotation.z -= hx * 0.3; b.legL.rotation.z -= hx * 0.1;
    // the chest turns against the hips, it nods when the weight lands, it leads a turn. Breath is in the chest.
    b.chest.scale.setScalar(1 + br * 0.014 + buff * (a * 0.02 + s * 0.07) + u * pulse * 0.02);
    b.chest.rotation.z = br * 0.012 + h * 0.06 - hx * 0.25 + load * 0.035 + slam * (a * 0.22 - s * 0.34) + shot * (a * 0.16 - s * 0.1) - buff * a * 0.12 - mel * (s * 0.12 - fol * 0.06) - u * 0.38;
    b.chest.rotation.y = -yawH * 1.6 - tn * 0.2 + mel * (-a * 0.3 + s * 0.15 + fol * 0.35) + look * 0.05;
    b.chest.rotation.x = -roll * 1.25 + hz * 0.22;
    const bodyY = b.hips.rotation.y + b.chest.rotation.y, bodyX = b.hips.rotation.x + b.chest.rotation.x;
    b.head.rotation.z = -br * 0.03 + h * 0.15 + hx * 0.3 - load * 0.05 + slam * (a * 0.3 - s * 0.2) - buff * a * 0.35 + shot * a * 0.2 + u * 0.3;
    b.head.rotation.y = t.lk * 0.3 * nu + mel * (a * 0.3 - s * 0.3) - bodyY * 0.7 + look * 0.35 - hz * 0.3;
    b.head.rotation.x = -bodyX * 0.6 + look * 0.06 + hz * 0.15;
    // arms: they swing against the legs, with elbows and wrists that follow late. The club is heavy, so it swings less.
    // Club arm: up for the ground punch, round for the hook. Ultimate: the two hands press on the floor.
    const swL = gr.c * sk * mv * dF, swR = gl.c * sk * mv * dF;
    b.armL.rotation.z = swL * 0.17 + br * 0.02 * nu - h * 0.2 + hx * 0.2 + slam * (a * 2.45 + s * 0.3) + mel * (-a * 0.5 + s * 0.95) - buff * a * 0.15 + u * 0.85 - Math.min(0, air) * 0.3;
    b.armL.rotation.x = -br * 0.02 * nu - shot * (a * 0.55 + s * 0.8) - slam * a * 0.2 - u * 0.1 + tn * 0.1 - h * 0.15 - ws * 0.03;
    b.foreL.rotation.z = (0.05 + Math.max(0, swL) * 0.12) * mv + slam * (a * 0.45 - s * 0.1) + mel * (-a * 0.3 + s * 0.3) + h * 0.2 + u * 0.1;
    b.handL.rotation.z = -swL * 0.1 + slam * (a * 0.3 - s * 0.45 + fol * 0.2) + mel * (-a * 0.25 + fol * 0.5) - load * 0.04 - u * 0.2;
    b.handL.rotation.y = mel * (a * 0.2 - fol * 0.3);
    b.armR.rotation.z = swR * 0.34 - br * 0.03 * nu - h * 0.3 + hx * 0.3 + slam * (a * 0.5 - s * 0.6) + mel * a * 0.4 - buff * a * 0.4 + u * 0.55 - Math.min(0, air) * 0.4;
    b.armR.rotation.x = br * 0.03 * nu + shot * (a * 0.75 + s * 0.9) + slam * a * 0.3 + u * 0.12 + tn * 0.14 + h * 0.3 - ws * 0.03;
    b.foreR.rotation.z = Math.sin(t.p * 1.3) * 0.05 * nu + (0.12 + Math.max(0, swR) * 0.3) * mv + shot * a * 0.4 + buff * a * 0.5 + h * 0.3 - u * 0.68;
    b.handR.rotation.z = -swR * 0.25 + Math.sin(t.tm * 1.1) * Math.sin(t.tm * 0.37 + 1) * 0.12 * rest + shot * (s * 0.3 - a * 0.2) + fol * 0.2 + u * 0.25;
    // the pearl floats, turns and flares. It follows the body late: it stays behind at a start, a stop, a turn and a step.
    // The rib cage opens for the beam. Ultimate: the chest opens, the pearl rises and pulses.
    const flare = shot * (a * 0.45 + s * 0.8) + buff * a * (0.25 + 0.15 * Math.sin(t.tm * 7)) + t.gl * 0.14 + slam * a * 0.15 + u * (0.22 + pulse * 0.3);
    b.pearl.position.y += Math.sin(t.tm * 1.7) * 0.022 + h * Math.sin(t.tm * 40) * 0.015 + u * (0.16 + pulse * 0.02) + Math.sin(t.w * 2 - 1.7) * 0.022 * mv;
    b.pearl.position.x += shot * (s * 0.16 - a * 0.04) + u * 0.2 - t.sw * 0.05 * nu - cl((t.af || 0) / 30, -1, 1) * 0.06 * nu - hx * 0.05;
    b.pearl.position.z += (t.sl * 0.05 - cl((t.as || 0) / 30, -1, 1) * 0.06 - tn * 0.04) * nu - swayZ * 0.6 - hz * 0.05;
    b.pearl.rotation.y = t.tm * (1.2 + t.gl * 1.5 + a * 3 + u * 2);
    b.pearl.rotation.z = Math.sin(t.tm * 0.9) * 0.25;
    P.pearl.scale.setScalar(1 + flare);
    P.aura.scale.setScalar(1 + flare * 1.6 + 0.07 * Math.sin(t.tm * 4.3));
    const open = 0.04 * br + shot * (a * 0.9 + s * 0.5) - buff * a * 0.22 + slam * s * 0.3 + h * 0.2 + t.gl * 0.1 + u * (1.0 + pulse * 0.1);
    b.ribL.rotation.y = -open; b.ribR.rotation.y = open;
    // sea fans and anemones: a slow wave of their own (the spring parts add the drag of the water). Anemones pull in when it is hurt.
    for (let i = 0; i < 3; i++) { const f = P['fan' + i]; f.rotation.x += Math.sin(t.p * 0.9 + i * 1.9) * 0.05; f.rotation.z += Math.sin(t.p * 0.7 + i) * 0.03; }
    for (let i = 0; i < 4; i++) {
      const an = P['an' + i], w = Math.sin(t.p * 1.3 + i * 1.6), g = 1 - h * 0.45 + u * (0.2 + pulse * 0.15) + t.gl * 0.08;
      an.scale.set(an.scale.x * g * (1 - w * 0.05), an.scale.y * g * (1 + w * 0.09), an.scale.z * g * (1 - w * 0.05));
    }
    // kelp hangs plumb and drifts (the spring parts make it trail and swing)
    const sway = Math.sin(t.p * 1.1);
    b.weed.rotation.z = sway * 0.04 - (b.chest.rotation.z + b.hips.rotation.z) * 0.7; b.weed.rotation.x = -bodyX * 0.7;
    b.weed2.rotation.z = Math.sin(t.p * 1.1 - 0.9) * 0.07 + buff * s * 0.3;
    for (let i = 0; i < 4; i++) { const k = P['kp' + i]; k.rotation.z += Math.sin(t.p * 1.4 - i * 1.1) * 0.12; k.rotation.x += Math.sin(t.p * 0.9 + i) * 0.05; }
    b.kelp.rotation.z = -(b.armL.rotation.z + b.foreL.rotation.z) * 0.85 - b.chest.rotation.z * 0.7 + sway * 0.06;
    b.kelp.rotation.x = -b.armL.rotation.x * 0.8;
    P.ka0.rotation.z += Math.sin(t.p * 1.5) * 0.1; P.ka1.rotation.z += Math.sin(t.p * 1.5 + 1.4) * 0.12;
  }
};
