/* Coralgolem - towering guardian of brain coral with a pearl that floats in its hollow chest. Tide / Stone. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, ball, lathe, canvasTex } from '../geo.js';
import { noise } from '../sculpt.js';

const CORAL = '#d8d2c4', SHADE = '#b9ae98', DEEP = '#8f8672', BLUSH = '#e2b29c', SEA = '#48d4e4', LINING = '#1c7e94';
const STEM = { col: '#e4dac6', rough: 0.72 };
const TIP = { col: '#f6b698', rough: 0.55, glow: '#ff8e6a', glowK: 0.4 };
const RIB = { col: '#ece2cf', rough: 0.5 };
const BARN = { col: '#ffffff', rough: 0.85, vc: true, flat: true };
const KELP = { col: '#3f9a4e', rough: 0.45, glow: '#1c6a30', glowK: 0.25, noOut: true };
const KELP2 = { col: '#2c7a52', rough: 0.45, glow: '#145a3a', glowK: 0.25, noOut: true };
const AURA = { col: '#bdf4ff', glow: '#8fe6ff', glowK: 1.3, add: true, op: 0.3, noOut: true };
const MOTE = { col: '#f4fdff', glow: '#b8f2ff', glowK: 3, noOut: true };
let pearlTex = null, PEARL = null;

const D = Math.PI / 180, _e = new THREE.Euler(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
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
// kelp strand that hangs down: a flat wavy band
function kelp(len, w, wave, ph) {
  const pts = [], rr = [];
  for (let i = 0; i <= 5; i++) { const u = i / 5; pts.push([Math.sin(u * 4.4 + ph) * wave * u, -u * len, 0]); rr.push(w * (i === 0 ? 0.6 : i === 5 ? 0.15 : 1 - u * 0.25)); }
  const g = tube(pts, rr, { ring: 6 }); g.scale(1, 1, 0.22);
  return g;
}

export default {
  id: 'coralgolem', rim: '#bfeff5', focus: 'pearl', top: 2.1, rough: 0.8, opts: { mottle: 0.1, mottleF: 17 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('hips', 'root', [0, 0.64, 0]).bone('chest', 'hips', [0, 0.9, 0]).bone('head', 'chest', [0.2, 1.44, 0])
      .bone('pearl', 'chest', [0.06, 1.12, 0]).bone('ribL', 'chest', [0.42, 1.12, 0.24], { m: 1 })
      .bone('armL', 'chest', [0.0, 1.42, 0.46]).bone('foreL', 'armL', [0.16, 0.98, 0.61]).bone('kelp', 'foreL', [0.23, 0.7, 0.62])
      .bone('armR', 'chest', [0.04, 1.36, -0.42]).bone('foreR', 'armR', [0.12, 1.02, -0.55])
      .bone('legL', 'hips', [0, 0.56, 0.21], { m: 1 })
      .bone('weed', 'chest', [-0.5, 1.42, -0.12]).bone('weed2', 'weed', [-0.52, 1.14, -0.12]);

    S.color(CORAL);
    // stump legs with three toe knobs
    S.cap('legL', [0, 0.56, 0.2], [0.02, 0.22, 0.21], 0.17, 0.18, { m: 1 });
    S.ell('legL', [0.06, 0.11, 0.21], [0.24, 0.12, 0.18], { m: 1, col: SHADE, k: 0.05 });
    for (let i = -1; i <= 1; i++) S.ell('legL', [0.27 - Math.abs(i) * 0.03, 0.07, 0.21 + i * 0.11], [0.07, 0.062, 0.058], { m: 1, col: DEEP, k: 0.02 });
    S.ell('legL', [0.1, 0.42, 0.27], [0.12, 0.1, 0.11], { m: 1, k: 0.05 });
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
    S.ell('foreL', [0.6, 0.46, 0.55], [0.27, 0.26, 0.23], { k: 0.07, w: 2 });
    S.ell('foreL', [0.8, 0.34, 0.44], 0.1, { k: 0.04 });
    S.ell('foreL', [0.84, 0.4, 0.555], 0.105, { k: 0.04 });
    S.ell('foreL', [0.78, 0.34, 0.665], 0.095, { k: 0.04 });
    S.ell('foreL', [0.66, 0.64, 0.59], 0.115, { k: 0.05 });
    S.ell('foreL', [0.5, 0.3, 0.59], 0.12, { k: 0.05 });
    // right arm: thin, with three fingers
    S.ell('armR', [0.04, 1.36, -0.44], 0.15, { w: 2 });
    S.cap('armR', [0.04, 1.34, -0.46], [0.12, 1.02, -0.55], 0.1, 0.085, { w: 2 });
    S.ell('foreR', [0.12, 1.02, -0.55], 0.105, { k: 0.04, w: 2 });
    S.cap('foreR', [0.12, 1.02, -0.55], [0.34, 0.86, -0.5], 0.088, 0.1, { w: 2 });
    S.ell('foreR', [0.43, 0.82, -0.49], [0.115, 0.1, 0.105]);
    for (let i = -1; i <= 1; i++) S.cap('foreR', [0.5, 0.83, -0.49 + i * 0.065], [0.6, 0.77 - Math.abs(i) * 0.01, -0.49 + i * 0.085], 0.044, 0.036, { col: SHADE, k: 0.02 });
    // the hole through the chest and the room for the pearl
    S.cap('chest', [-0.8, 1.12, 0], [0.8, 1.12, 0], 0.2, 0.2, { sub: 1, col: LINING, glow: 1.1, k: 0.03 });
    S.ell('chest', [0.04, 1.12, 0], [0.27, 0.25, 0.26], { sub: 1, col: LINING, glow: 1.1, k: 0.03 });
    S.tor('chest', [0.43, 1.12, 0], 0.24, 0.062, { rot: [0, 0, 90], k: 0.04 });
    S.tor('chest', [-0.43, 1.1, 0], 0.235, 0.055, { rot: [0, 0, 90], k: 0.04, col: SHADE });
    // deep eye sockets
    S.ell('head', [0.435, 1.515, 0.085], [0.062, 0.046, 0.056], { m: 1, sub: 1, col: '#0e2c36', glow: 0.7, k: 0.01 });

    // colour: dark below, blush on the high lumps, sea-blue light in the cracks
    S.ell('hips', [0, 0.3, 0], [0.6, 0.22, 0.6], { paint: 1, col: DEEP, cb: 0.14, op: 0.7 });
    S.ell('chest', [-0.08, 1.66, 0.3], [0.22, 0.1, 0.2], { paint: 1, col: BLUSH, cb: 0.08, op: 0.7 });
    S.ell('foreL', [0.8, 0.38, 0.57], [0.16, 0.2, 0.26], { paint: 1, col: BLUSH, cb: 0.08, op: 0.6 });
    S.ell('head', [0.47, 1.43, 0], [0.03, 0.014, 0.1], { paint: 1, col: '#4a4438', cb: 0.01 });
    const crack = { paint: 1, col: SEA, glow: 2.6, cb: 0.013 };
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
    // brain coral: grooves that wind over the whole surface
    S.paint((p, n, c, info) => {
      if (info.glow > 0.12 || c[2] > c[0]) return;
      const u = p.y * 0.72 + p.x * 0.45 + p.z * 0.53 + (noise(p.x * 2.7 + 7, p.y * 2.7, p.z * 2.7 + 3) - 0.5) * 0.5 + noise(p.x * 6.5, p.y * 6.5 + 2, p.z * 6.5) * 0.07;
      const v = Math.sin(u * 52);
      let g = (-0.1 - v) / 0.5; g = g < 0 ? 0 : g > 1 ? 1 : g;
      const k = 1 - 0.46 * g + (v > 0.4 ? (v - 0.4) * 0.14 : 0);
      c[0] *= k * (1 - 0.06 * g); c[1] *= k; c[2] *= k * (1 + 0.08 * g);
    });

    // the pearl, its light and three small bubbles in orbit
    if (!PEARL) {
      pearlTex = canvasTex(256, 128, (g, W, H) => {
        const gr = g.createLinearGradient(0, 0, W, H);
        gr.addColorStop(0, '#dffaff'); gr.addColorStop(0.22, '#ffd6ea'); gr.addColorStop(0.45, '#e4dcff'); gr.addColorStop(0.7, '#c6f6ff'); gr.addColorStop(1, '#ffdcee');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.globalAlpha = 0.5;
        for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ffc4e2'; g.beginPath(); g.ellipse((i * 67 + 20) % W, (i * 41 + 16) % H, 34, 12, i, 0, 7); g.fill(); }
        g.globalAlpha = 1;
      });
      PEARL = { col: '#ffffff', map: pearlTex, emap: pearlTex, glowK: 0.95, rough: 0.14, env: 1.6, noOut: true };
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
    o = onEll([0.6, 0.46, 0.55], [0.27, 0.26, 0.23], 112, 42); S.add('foreL', b7, BARN, { p: o.p, r: aim(o.n), s: 0.9 });
    o = onEll([-0.02, 0.66, 0], [0.36, 0.25, 0.36], -62, 18); S.add('hips', b5, BARN, { p: o.p, r: aim(o.n) });
    o = onEll([0, 1.12, 0], [0.48, 0.46, 0.42], -64, -8); S.add('chest', b7, BARN, { p: o.p, r: aim(o.n), s: 0.95 });
    o = onEll([0.26, 1.5, 0], [0.2, 0.165, 0.19], -96, 52); S.add('head', b4, BARN, { p: o.p, r: aim(o.n), s: 0.8 });
    S.add('legR', b4, BARN, { p: [0.13, 0.42, -0.33], r: aim([0.7, 0.1, -0.7]) });
    // kelp: a short cape from the back hump, two strands under the club arm
    const KX = [[-0.43, -0.34, 50], [-0.5, -0.22, 25], [-0.535, -0.09, -10], [-0.53, 0.04, -40]];
    S.add('weed', merge(KX.map(([x, z, yaw], i) => at(kelp(0.3, 0.04, 0.012, i), [x + 0.5, 0, z + 0.12], [0, yaw, 0]))), KELP2, { p: [-0.5, 1.44, -0.12] });
    KX.forEach(([x, z, yaw], i) => S.add('weed2', kelp(0.24 + (i % 2) * 0.14 + i * 0.03, 0.042, 0.035, i * 1.7), i % 2 ? KELP2 : KELP, { p: [x - 0.01, 1.15, z], r: [0, yaw, 0], name: 'kp' + i }));
    S.add('kelp', kelp(0.38, 0.036, 0.03, 0.5), KELP, { p: [0.2, 0.74, 0.66], r: [0, 20, 0], name: 'ka0' });
    S.add('kelp', kelp(0.28, 0.032, 0.03, 2.2), KELP2, { p: [0.27, 0.66, 0.57], r: [0, -30, 0], name: 'ka1' });
    S.eye('head', [0.405, 1.515, 0.085], 0.042, { dir: [1, -0.05, 0.2], sclera: '#0c2a34', iris: '#58e6f6', iris2: '#dffcff', pupil: 'none', size: 62, lid: SHADE, open: 40, tilt: -14, glow: 2.2, m: 1 });
  },
  anim(b, t, c) {
    const br = Math.sin(t.p * 0.8), st = Math.sin(t.w), a = t.a, s = t.s, h = t.h, P = c.parts;
    const slam = t.k === 'slam' ? 1 : 0, shot = t.k === 'shot' ? 1 : 0, buff = t.k === 'buff' ? 1 : 0, mel = t.k === 'melee' ? 1 : 0;
    // heavy walk
    b.hips.position.y += br * 0.012 + Math.abs(st) * 0.04 * t.mv - a * (0.05 + buff * 0.1) - s * slam * 0.08;
    b.hips.rotation.x = st * 0.05 * t.mv;
    b.hips.rotation.y = st * 0.08 * t.mv + mel * (-a * 0.55 + s * 0.7);
    b.hips.rotation.z = -t.sw * 0.05 + h * 0.1;
    b.hips.position.x += mel * (s * 0.2 - a * 0.08) + slam * s * 0.06;
    b.legL.rotation.z = st * 0.42 * t.mv; b.legR.rotation.z = -st * 0.42 * t.mv;
    b.legL.position.y += Math.max(0, Math.cos(t.w)) * 0.07 * t.mv; b.legR.position.y += Math.max(0, -Math.cos(t.w)) * 0.07 * t.mv;
    b.chest.scale.setScalar(1 + br * 0.014 + buff * (a * 0.02 + s * 0.07));
    b.chest.rotation.z = br * 0.012 + h * 0.14 + slam * (a * 0.22 - s * 0.34) + shot * (a * 0.16 - s * 0.1) - buff * a * 0.12 - mel * s * 0.12;
    b.chest.rotation.x = t.sl * 0.06;
    b.head.rotation.z = -br * 0.03 + h * 0.3 + slam * (a * 0.3 - s * 0.2) - buff * a * 0.35 + shot * a * 0.2 + Math.sin(t.w) * 0.03 * t.mv;
    b.head.rotation.y = t.lk * 0.3 + mel * (a * 0.3 - s * 0.3);
    // club arm: up for the ground punch, round for the hook
    b.armL.rotation.z = -st * 0.18 * t.mv + br * 0.02 - h * 0.25 + slam * (a * 2.45 + s * 0.3) + mel * (-a * 0.5 + s * 0.95) - buff * a * 0.15;
    b.armL.rotation.x = -br * 0.02 - shot * (a * 0.55 + s * 0.8) - slam * a * 0.2;
    b.foreL.rotation.z = slam * (a * 0.45 - s * 0.1) + mel * (-a * 0.3 + s * 0.3) + h * 0.2;
    b.armR.rotation.z = st * 0.3 * t.mv - br * 0.03 - h * 0.4 + slam * (a * 0.5 - s * 0.6) + mel * a * 0.4 - buff * a * 0.4;
    b.armR.rotation.x = br * 0.03 + shot * (a * 0.75 + s * 0.9) + slam * a * 0.3;
    b.foreR.rotation.z = Math.sin(t.p * 1.3) * 0.05 + shot * a * 0.4 + buff * a * 0.5;
    // the pearl floats, turns and flares; the rib cage opens for the beam
    const flare = shot * (a * 0.45 + s * 0.8) + buff * a * (0.25 + 0.15 * Math.sin(t.tm * 7)) + t.gl * 0.14 + slam * a * 0.15;
    b.pearl.position.y += Math.sin(t.tm * 1.7) * 0.022 + h * Math.sin(t.tm * 40) * 0.015;
    b.pearl.position.x += shot * (s * 0.16 - a * 0.04);
    b.pearl.rotation.y = t.tm * (1.2 + t.gl * 1.5 + a * 3);
    b.pearl.rotation.z = Math.sin(t.tm * 0.9) * 0.25;
    P.pearl.scale.setScalar(1 + flare);
    P.aura.scale.setScalar(1 + flare * 1.6 + 0.07 * Math.sin(t.tm * 4.3));
    const open = 0.04 * br + shot * (a * 0.9 + s * 0.5) - buff * a * 0.22 + slam * s * 0.3 + h * 0.2 + t.gl * 0.1;
    b.ribL.rotation.y = -open; b.ribR.rotation.y = open;
    // kelp hangs and sways
    const sway = Math.sin(t.p * 1.1);
    b.weed.rotation.z = sway * 0.04 - t.sw * 0.3 - b.chest.rotation.z * 0.6; b.weed.rotation.x = -t.sl * 0.25;
    b.weed2.rotation.z = Math.sin(t.p * 1.1 - 0.9) * 0.07 - t.sw * 0.35 + buff * s * 0.3;
    for (let i = 0; i < 4; i++) { const k = P['kp' + i]; k.rotation.z += Math.sin(t.p * 1.4 - i * 1.1) * 0.12 - t.sw * 0.3; k.rotation.x += -t.sl * 0.4 + Math.sin(t.p * 0.9 + i) * 0.05; }
    b.kelp.rotation.z = -(b.armL.rotation.z + b.foreL.rotation.z) * 0.85 - t.sw * 0.4 + sway * 0.06;
    b.kelp.rotation.x = -b.armL.rotation.x * 0.8 - t.sl * 0.4;
    P.ka0.rotation.z += Math.sin(t.p * 1.5) * 0.1; P.ka1.rotation.z += Math.sin(t.p * 1.5 + 1.4) * 0.12;
  }
};
