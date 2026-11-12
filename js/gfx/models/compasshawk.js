/* Compasshawk (Lodetalon) - a hawk made from a captain's astrolabe and compass. Brass astrolabe rings with degree marks
   turn round the body. The wing feathers are compass needles: blue steel shafts, red tips. A dark lodestone heart with
   blue sparks sits in a ring cage (heart piece). The tail is the arc of a sextant.
   Maker's mark: an eight-point compass star on the breast ring. Gale / Volt. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, blade, wing, lathe, crystal, ball, cone, rbox, torus, canvasTex } from '../geo.js';

const BRASS = '#b08a38', PALE = '#d6b660', GOLD = '#e8c256', BRONZE = '#43341f', RED = '#c4201c', BLUE = '#58a8ff';
const GOLDM = { col: '#e8c462', metal: 1, rough: 0.22, env: 1.4 };
const BRASSM = { col: '#c9a348', metal: 1, rough: 0.28, env: 1.2, flat: true };
const ENAMEL = { col: '#c8201c', metal: 0.2, rough: 0.16, env: 1.3, glow: '#ff2a18', glowK: 0.22, flat: true };
const BLUED = { col: '#2b3970', metal: 1, rough: 0.24, env: 1.4, flat: true };
const DARK = { col: '#1d1a24', metal: 0.6, rough: 0.3, env: 1.0 };
const LODE = { col: '#232532', metal: 0.75, rough: 0.33, env: 1.3, flat: true };                        // dark lodestone
const SPARK = { col: '#8cc0ff', glow: '#2f8cff', glowK: 3.4, noOut: true };                             // blue sparks: the brightest glow
const HALO = { col: '#2f7cff', add: true, op: 0.13, noOut: true };
const JEWEL = { col: '#9cc4f0', glow: '#3a90f0', glowK: 1.3, noOut: true };
let featT = null, FEATHM = null;

const D2R = Math.PI / 180, TAU = Math.PI * 2;
const C = [0, 0.9, 0];                                          // lodestone heart = centre of the rings
const SH = [0.27, 1.0, 0.17];                                   // shoulder
const NA = [0.28, 1.0, 0.24], NY = -12, NL = 1.16, NW = 0.09;   // wing needle: root, yaw (degrees), length, half width
const ND = [Math.sin(NY * D2R), Math.cos(NY * D2R)];            // needle direction [x, z]
const along = d => [NA[0] + ND[0] * d, NA[1], NA[2] + ND[1] * d];
const NM = along(NL / 2);                                       // pivot of the needle = wrist
const EL = along(0.19);                                         // elbow: the needle starts to turn here
// needle feathers: distance of the root along the needle, yaw (degrees), length, half width, bone
const FEATHERS = [[0.27, -70, 0.5, 0.054, 'foreL'], [0.46, -62, 0.6, 0.056, 'foreL'], [0.67, -52, 0.58, 0.052, 'tipL'], [0.86, -40, 0.48, 0.046, 'tipL'], [1.03, -27, 0.36, 0.04, 'tipL']];
const NF = FEATHERS.length;
// rings: radius, tilt of the axis (degrees), speed, phase, number of degree marks
const RINGS = [[0.405, 13, 1.0, 0, 36], [0.345, -20, -1.45, 2.1, 24], [0.285, 28, 2.1, 4.2, 18]];
const RT = 0.015, RW = 0.034;                                   // ring band: half thickness, half width
const T0 = [-0.5, 0.9, 0], RS = 0.56, SA = 30 * D2R;            // sextant tail: pivot, radius of the limb, half angle of the arc

const join = list => mergeGeometries(list.map(g => { const q = g.index ? g.toNonIndexed() : g.clone(); q.deleteAttribute('uv'); if (!q.getAttribute('normal')) q.computeVertexNormals(); return q; }));
const at = (g, p) => g.clone().translate(p[0], p[1], p[2]);
// flat diamond needle from the origin to +Z. u = the widest place.
const needle = (len, w, u, d) => wing([[0, 0], [len * u, w], [len, 0], [len * u, -w]], d, { smooth: false, bevel: d * 0.4 });
// the 2 halves of a compass needle: point at the origin / point at the far end
const halfIn = (len, w, d) => wing([[0, 0], [len, w], [len, -w]], d, { smooth: false, bevel: d * 0.4 });
const halfOut = (len, w, d) => wing([[0, w], [len, 0], [0, -w]], d, { smooth: false, bevel: d * 0.4 });
const boss = k => lathe([[0, -0.042 * k], [0.036 * k, -0.037 * k], [0.062 * k, -0.02 * k], [0.066 * k, 0], [0.062 * k, 0.02 * k], [0.036 * k, 0.037 * k], [0, 0.042 * k]], 16);
// needle feather: blue steel shaft with a light ridge, a gold band, a red tip. u = root to tip.
function featherTex() {
  return canvasTex(256, 32, (g, W, H) => {
    g.fillStyle = '#2f3f84'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1b2552'; g.fillRect(0, 0, W, 5); g.fillRect(0, H - 5, W, 5);
    g.fillStyle = '#6f86d8'; g.fillRect(0, H / 2 - 1.5, W, 3);
    for (let i = 1; i < 7; i++) { g.fillStyle = 'rgba(12,18,48,0.55)'; g.fillRect(W * 0.09 * i, 0, 2, H); }
    g.fillStyle = '#d6241c'; g.fillRect(W * 0.66, 0, W * 0.34, H);
    g.fillStyle = '#ff6a50'; g.fillRect(W * 0.66, H / 2 - 1.5, W * 0.34, 3);
    g.fillStyle = '#e8c462'; g.fillRect(W * 0.63, 0, W * 0.035, H);
  });
}
// astrolabe ring around the X axis: a gold band with studs, and a scale of degree marks with a pointer to north
function ringGeo(R, n) {
  const band = lathe([[R - RT, -RW], [R + RT, -RW * 0.55], [R + RT, RW * 0.55], [R - RT, RW], [R - RT, -RW]], 56);
  band.rotateZ(-Math.PI / 2);
  const gold = [band], marks = [];
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) { const g = ball(0.02, 8, 6); g.translate(sx * RW * 0.8, R, 0); g.rotateX((i + 0.5) * TAU / 4); gold.push(g); }
  for (let i = 0; i < n; i++) {
    const big = i % 3 === 0, g = rbox(big ? RW * 1.5 : RW * 0.8, 0.014, big ? 0.017 : 0.01);
    g.translate(0, R + RT, 0); g.rotateX((i + 0.5) * TAU / n); marks.push(g);
  }
  const north = cone(0.036, 0.095, 4); north.translate(0, R + RT - 0.006, 0); marks.push(north);
  const south = ball(0.027, 8, 6); south.translate(0, -(R + RT + 0.01), 0); marks.push(south);
  return [join(gold), join(marks)];
}
// spark set: bolts that jump from the lodestone, and small shards
function sparkGeo(seed) {
  const list = [];
  for (let i = 0; i < 4; i++) {
    const an = i * 1.57 + seed, d = new THREE.Vector3(0.3 * Math.sin(i * 2.3 + seed), Math.cos(an), Math.sin(an)).normalize(), side = new THREE.Vector3(1, 0, 0).cross(d).normalize(), pts = [];
    for (let j = 0; j < 5; j++) { const r = 0.07 + j * 0.04, z = (j % 2 ? 1 : -1) * 0.022 * (j > 0 && j < 4 ? 1 : 0); pts.push([d.x * r + side.x * z + (j % 2) * 0.012, d.y * r + side.y * z, d.z * r + side.z * z]); }
    list.push(tube(pts, [0.015, 0.012, 0.01, 0.007, 0.002], { ring: 5, seg: 8 }));
    const sh = crystal(0.012, 0.03, 0.03, 4); sh.translate(d.x * 0.2 + side.x * 0.05, d.y * 0.2 + side.y * 0.05, d.z * 0.2 + side.z * 0.05); list.push(sh);
  }
  return join(list);
}
const arcPts = (r, n) => Array.from({ length: n + 1 }, (_, i) => { const q = -SA + 2 * SA * i / n; return [-Math.cos(q) * r, Math.sin(q) * r]; });
const ease = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
const cl1 = x => x < -1 ? -1 : x > 1 ? 1 : x;
// spring that follows a value: it comes late, goes past and settles. With no time step (a still pose) it is at the value.
function spr(st, key, target, k, d, dt) {
  if (!(dt > 0)) { st[key] = target; st[key + 'v'] = 0; return target; }
  let x = st[key] || 0, v = st[key + 'v'] || 0;
  const n = Math.ceil(dt / 0.012), hh = dt / n;
  for (let i = 0; i < n; i++) { v += ((target - x) * k - v * d) * hh; x += v * hh; }
  st[key] = x; st[key + 'v'] = v;
  return x;
}
// wing stroke. q = phase in cycles. -1 = wing up, +1 = wing down. The down-beat is fast (DOWN of the cycle), the up-beat is slower.
const DOWN = 0.36;
function stroke(q) { q -= Math.floor(q); return q < DOWN ? -Math.cos(Math.PI * ease(q / DOWN)) : Math.cos(Math.PI * (q - DOWN) / (1 - DOWN)); }
// how much the wing folds (elbow and wrist): only in the up-beat
function folded(q) { q -= Math.floor(q); return q < DOWN ? 0 : Math.pow(Math.sin(Math.PI * (q - DOWN) / (1 - DOWN)), 1.3); }
// spring parts: each needle feather trails in the air and whips (drag). The crest, the index arm of the sextant and the talons follow too.
const DYN = [
  { b: ['cr0'], k: 80, d: 7, amt: 0.6, drag: 3, dir: [-1, 0.25, 0] }, { b: ['crL'], k: 80, d: 7, amt: 0.6, drag: 3, dir: [-1, 0.2, 0.2] }, { b: ['crR'], k: 80, d: 7, amt: 0.6, drag: 3, dir: [-1, 0.2, -0.2] },
  { b: ['index'], k: 38, d: 4, amt: 0.9, drag: 1.5, dir: [-1, 0, 0] }, { b: ['vern'], k: 38, d: 4, amt: 0.9, drag: 1.5, dir: [-1, 0, 0] },
  { b: ['clawL'], k: 50, d: 6, amt: 0.6, drag: 2 }, { b: ['clawR'], k: 50, d: 6, amt: 0.6, drag: 2 }
];
FEATHERS.forEach(([, yaw], i) => {
  const sy = Math.sin(yaw * D2R), cy = Math.cos(yaw * D2R), q = { k: 78 - i * 5, d: 7, amt: 0.55, drag: 4 };
  DYN.push(Object.assign({ b: ['f' + i + 'L'], dir: [sy, 0, cy] }, q), Object.assign({ b: ['f' + i + 'R'], dir: [sy, 0, -cy] }, q));
});
const _qy = new THREE.Quaternion(), YAX = new THREE.Vector3(0, 1, 0), XAX = new THREE.Vector3(1, 0, 0), GTAU = [0.2, 0.3, 0.42];
const rnd = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();

export default {
  id: 'compasshawk', rim: '#ffe2a0', focus: 'core', top: 1.5, rough: 0.38,
  opts: { cell: 0.024, mottle: 0.05, mottleF: 14 },
  dyn: DYN,
  rig: { head: 'head', neck: ['neck'] },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', C)
      .bone('ring1', 'body', C).bone('ring2', 'body', C).bone('ring3', 'body', C)
      .bone('neck', 'body', [0.36, 1.0, 0]).bone('head', 'neck', [0.5, 1.2, 0])
      .bone('wingL', 'body', SH, { m: 1 }).bone('foreL', 'wingL', EL, { m: 1 }).bone('tipL', 'foreL', NM, { m: 1 })
      .bone('tail', 'body', [-0.42, 0.9, 0]).bone('legL', 'body', [-0.24, 0.8, 0.09], { m: 1 }).bone('clawL', 'legL', [-0.375, 0.7, 0.1], { m: 1 });

    const M = { metal: 1, gloss: 0.55, k: 0.02 }, Dk = { col: BRONZE, metal: 0.9, gloss: 0.4, k: 0.014 }, G = { col: GOLD, metal: 1, gloss: 0.7, k: 0.012 };
    const O = (a, b) => Object.assign({}, a, b);
    S.color(BRASS);
    // --- body: breast and hips with an open cage between them. Only the spine and the keel cross the ring zone (|x| < 0.17).
    S.ell('body', [0.28, 0.9, 0], [0.17, 0.19, 0.17], M);
    S.ell('body', [0.33, 0.84, 0], [0.13, 0.14, 0.13], O(M, { col: PALE }));
    S.ell('body', [0.41, 0.8, 0.07], [0.05, 0.045, 0.05], O(M, { col: PALE, k: 0.012, m: 1 }));
    S.ell('body', [0.35, 0.735, 0.06], [0.05, 0.04, 0.05], O(M, { k: 0.012, m: 1 }));
    S.cap('body', [0.2, 0.74, 0], [0.42, 0.86, 0], 0.04, 0.05, Dk);
    S.ell('body', [-0.28, 0.9, 0], [0.17, 0.15, 0.14], M);
    S.ell('body', [-0.3, 0.95, 0], [0.12, 0.09, 0.11], O(M, { col: PALE }));
    S.cap('body', [-0.3, 1.05, 0], [0.3, 1.07, 0], 0.04, 0.04, Dk);
    S.cap('body', [-0.3, 0.75, 0], [0.24, 0.73, 0], 0.04, 0.04, Dk);
    // gold sockets that hold the heart, tail collar, breast ring (it holds the maker's mark)
    S.tor('body', [0.13, 0.9, 0], 0.085, 0.028, O(G, { rot: [0, 0, 90] }));
    S.tor('body', [-0.13, 0.9, 0], 0.07, 0.026, O(G, { rot: [0, 0, 90] }));
    S.tor('body', [-0.41, 0.9, 0], 0.092, 0.028, O(G, { rot: [0, 0, 90] }));
    S.tor('body', [0.438, 0.868, 0], 0.082, 0.024, O(G, { rot: [0, 0, 82] }));
    // --- neck and head
    S.cap('neck', [0.36, 0.99, 0], [0.5, 1.2, 0], 0.115, 0.095, M);
    S.ell('neck', [0.37, 1.12, 0], [0.08, 0.07, 0.09], O(M, { col: PALE }));
    S.tor('neck', [0.4, 1.05, 0], 0.118, 0.03, O(G, { rot: [0, 0, -36] }));
    S.ell('head', [0.56, 1.25, 0], [0.15, 0.115, 0.12], M);
    S.ell('head', [0.5, 1.3, 0], [0.11, 0.07, 0.09], O(M, { col: PALE }));
    S.box('head', [0.625, 1.322, 0.082], [0.09, 0.024, 0.046], 0.02, O(Dk, { m: 1, rot: [0, 0, -16] }));   // sharp brow
    S.ell('head', [0.69, 1.235, 0], [0.06, 0.05, 0.055], G);                                                // cere
    S.ell('head', [0.55, 1.2, 0.105], 0.03, O(G, { m: 1 }));
    // --- wings: shoulder ball, short arm with a band. The needles are rigid parts.
    S.ell('wingL', SH, [0.075, 0.065, 0.075], O(G, { m: 1 }));
    S.cap('wingL', [0.272, 1.0, 0.2], [0.248, 1.0, 0.4], 0.05, 0.034, O(M, { m: 1 }));
    S.tor('wingL', [0.26, 1.0, 0.3], 0.046, 0.022, O(Dk, { m: 1, rot: [90, 0, 0] }));
    S.ell('foreL', EL, [0.05, 0.045, 0.05], O(G, { m: 1 }));
    // --- tail root, thighs
    S.cap('tail', [-0.42, 0.9, 0], [-0.56, 0.9, 0], 0.08, 0.05, Dk);
    S.cap('legL', [-0.24, 0.8, 0.09], [-0.36, 0.71, 0.1], 0.07, 0.048, O(M, { m: 1 }));
    S.ell('clawL', [-0.375, 0.7, 0.1], 0.052, O(G, { m: 1 }));
    // --- paint: blue glow in the sockets and seams, blue enamel in the breast ring, degree marks on the spine and the keel,
    //     engraved feather rows on the breast and the hips, falcon stripe, red crown
    const glow = { paint: 1, col: BLUE, glow: 1.3, cb: 0.012 }, cut = { paint: 1, col: BRONZE, cb: 0.008, metal: 0.8, gloss: 0.3, op: 0.8 };
    S.ell('body', [0.112, 0.9, 0], [0.03, 0.07, 0.07], glow);
    S.ell('body', [-0.112, 0.9, 0], [0.03, 0.055, 0.055], glow);
    S.cap('body', [0.2, 0.94, 0.16], [0.4, 0.97, 0.11], 0.016, 0.016, O(glow, { m: 1 }));
    S.cap('body', [-0.2, 0.92, 0.135], [-0.38, 0.92, 0.09], 0.015, 0.015, O(glow, { m: 1 }));
    S.ell('wingL', [0.255, 1.0, 0.37], [0.06, 0.06, 0.016], O(glow, { m: 1 }));
    S.ell('body', [0.45, 0.868, 0], [0.04, 0.072, 0.072], { paint: 1, col: '#1c2c74', gloss: 0.9, metal: 0.1, cb: 0.008 });
    for (let i = 0; i < 9; i++) S.ell('body', [-0.2 + i * 0.05, 1.09, 0], [0.008, 0.03, i % 2 ? 0.035 : 0.06], { paint: 1, col: GOLD, metal: 1, gloss: 0.7, cb: 0.007 });
    for (let i = 0; i < 7; i++) S.ell('body', [-0.15 + i * 0.05, 0.71, 0], [0.008, 0.03, i % 2 ? 0.035 : 0.06], { paint: 1, col: GOLD, metal: 1, gloss: 0.7, cb: 0.007 });
    for (const [x, r] of [[0.3, 0.2], [0.23, 0.2]]) S.tor('body', [x, 0.9, 0], r * 0.86, 0.007, O(cut, { rot: [0, 0, 78] }));
    for (const x of [-0.24, -0.32]) S.tor('body', [x, 0.9, 0], 0.145, 0.007, O(cut, { rot: [0, 0, 90] }));
    S.cap('head', [0.625, 1.25, 0.1], [0.585, 1.15, 0.09], 0.026, 0.02, { paint: 1, col: BRONZE, cb: 0.012, m: 1 });
    S.ell('head', [0.47, 1.36, 0], [0.09, 0.03, 0.03], { paint: 1, col: RED, gloss: 0.9, cb: 0.01 });

    // --- astrolabe rings: each ring on its own bone
    RINGS.forEach(([R, , , , n], i) => {
      const [gold, marks] = ringGeo(R, n);
      S.add('ring' + (i + 1), gold, GOLDM, { p: C });
      S.add('ring' + (i + 1), marks, i === 1 ? ENAMEL : BLUED, { p: C });
    });
    // --- lodestone heart: a dark stone in a cage of 2 thin rings, blue sparks that jump from it
    S.add('body', crystal(0.085, 0.12, 0.12, 6), LODE, { p: C, r: [0, 0, 16], name: 'core' });
    const hoop = torus(0.128, 0.008, 28, 5);
    S.add('body', join([hoop, hoop.clone().rotateX(Math.PI / 2)]), GOLDM, { p: C, name: 'cage' });
    S.add('body', sparkGeo(0.3), SPARK, { p: C, name: 'spA' });
    S.add('body', sparkGeo(1.9), SPARK, { p: C, name: 'spB' });
    S.add('body', ball(0.13, 14, 10), HALO, { p: C, name: 'halo' });

    // --- wings: one compass needle for each wing (brass half on the arm, red half on the tip), 5 needle feathers behind it
    if (!featT) { featT = featherTex(); FEATHM = { col: '#ffffff', map: featT, metal: 0.78, rough: 0.26, env: 1.3, flat: true }; }
    const NR = [0, NY, 0], H = NL / 2;
    S.add('foreL', halfIn(H, NW, 0.036), BRASSM, { p: NA, r: NR, order: 'YXZ', m: 1 });
    S.add('tipL', halfOut(H, NW, 0.036), ENAMEL, { p: NM, r: NR, order: 'YXZ', m: 1 });
    S.add('foreL', join([tube([[0, 0, 0.02], [0, 0, H]], [0.016, 0.024], { ring: 6, seg: 2 }), at(ball(0.024, 8, 6), [-0.02, 0, FEATHERS[0][0]]), at(ball(0.024, 8, 6), [-0.02, 0, FEATHERS[1][0]])]), GOLDM, { p: NA, r: NR, order: 'YXZ', m: 1 });
    S.add('tipL', join([tube([[0, 0, 0], [0, 0, H - 0.02]], [0.024, 0.006], { ring: 6, seg: 2 }), boss(1), at(ball(0.024, 8, 6), [-0.02, 0, FEATHERS[2][0] - H]), at(ball(0.024, 8, 6), [-0.02, 0, FEATHERS[3][0] - H]), at(ball(0.02, 8, 6), [-0.02, 0, FEATHERS[4][0] - H])]), GOLDM, { p: NM, r: NR, order: 'YXZ', m: 1 });
    S.add('tipL', ball(0.024, 10, 8), JEWEL, { p: [NM[0], NM[1] + 0.046, NM[2]], name: 'gemL', m: 1 });
    FEATHERS.forEach(([d, yaw, len, w, bone], i) => {
      const q = along(d);
      S.add(bone, needle(len, w, 0.3, 0.026), FEATHM, { p: [q[0] - ND[1] * 0.02, 0.984, q[2] + ND[0] * 0.02], r: [0, yaw, 0], order: 'YXZ', name: 'f' + i + 'L', m: 1 });
    });

    // --- tail: the arc of a sextant. 2 needle feathers are the arms, a brass limb with degree marks joins them,
    //     the index arm with its clamp turns on the pivot.
    const limb = blade(arcPts(RS + 0.038, 14).concat(arcPts(RS - 0.038, 14).reverse()), 0.024, { bevel: 0.006 }); limb.rotateX(-Math.PI / 2);
    const brace = tube(arcPts(0.31, 6).map(q => [q[0], 0, q[1]]), [0.013, 0.013, 0.013, 0.013, 0.013, 0.013, 0.013], { ring: 5 });
    S.add('tail', join([limb, brace, at(ball(0.03, 8, 6), [-Math.cos(SA) * RS, 0, Math.sin(SA) * RS]), at(ball(0.03, 8, 6), [-Math.cos(SA) * RS, 0, -Math.sin(SA) * RS])]), BRASSM, { p: T0 });
    const ticks = [];
    for (let i = 0; i <= 12; i++) { const q = -SA + i * 5 * D2R, g = rbox(i % 3 ? 0.034 : 0.058, 0.012, i % 3 ? 0.008 : 0.012); g.rotateY(q); g.translate(-Math.cos(q) * (RS + (i % 3 ? 0.012 : 0)), 0.014, Math.sin(q) * (RS + (i % 3 ? 0.012 : 0))); ticks.push(g); }
    S.add('tail', join(ticks), BLUED, { p: T0 });
    S.add('tail', needle(0.63, 0.052, 0.3, 0.026), FEATHM, { p: [-0.5, 0.893, 0.02], r: [0, -60, 0], order: 'YXZ', name: 'tfL', m: 1 });
    S.add('tail', needle(0.72, 0.044, 0.22, 0.026), FEATHM, { p: [-0.5, 0.922, 0], r: [0, -90, 0], order: 'YXZ', name: 'index' });
    S.add('tail', join([at(boss(0.85), [0, 0.02, 0]), at(rbox(0.07, 0.03, 0.115), [-RS, 0.022, 0]), at(ball(0.022, 8, 6), [-RS, 0.046, 0.04]), at(ball(0.022, 8, 6), [-RS, 0.046, -0.04])]), GOLDM, { p: T0, name: 'vern' });

    // --- head: hooked beak, lower jaw, crest of 3 blades
    S.add('head', tube([[-0.03, 0, 0], [0.06, 0.002, 0], [0.125, -0.03, 0], [0.147, -0.11, 0]], [0.05, 0.045, 0.03, 0.004], { ring: 8 }), DARK, { p: [0.72, 1.24, 0], s: [1, 1, 0.72] });
    S.add('head', tube([[-0.02, 0, 0], [0.05, -0.012, 0], [0.105, -0.01, 0]], [0.03, 0.026, 0.004], { ring: 7 }), DARK, { p: [0.7, 1.19, 0], s: [1, 1, 0.75], name: 'jaw' });
    S.add('head', blade([[0.02, -0.025], [-0.08, 0.035], [-0.34, 0.09], [-0.1, -0.03]], 0.024), ENAMEL, { p: [0.45, 1.335, 0], name: 'cr0' });
    S.add('head', blade([[0.02, -0.02], [-0.07, 0.03], [-0.27, 0.05], [-0.09, -0.03]], 0.02), BLUED, { p: [0.455, 1.315, 0.04], r: [0, 14, 0], name: 'crL', m: 1 });

    // --- maker's mark: an eight-point compass star in the breast ring. Rivets on the breast and the hips.
    const sp = [];
    for (let i = 0; i < 16; i++) { const q = i * TAU / 16, r = i % 4 === 0 ? 0.076 : i % 2 === 0 ? 0.046 : 0.02; sp.push([Math.sin(q) * r, Math.cos(q) * r]); }
    const star = blade(sp, 0.016, { bevel: 0.005 }); star.rotateY(Math.PI / 2);
    S.add('body', join([star, at(ball(0.014, 8, 6), [0.01, 0, 0])]), GOLDM, { p: [0.476, 0.866, 0], r: [0, 0, -8] });
    const rv = [];
    for (const z of [-1, 1]) { for (const [x, y] of [[0.3, 1.02], [0.2, 0.99], [0.17, 0.83], [-0.2, 0.99], [-0.34, 0.99], [-0.2, 0.82]]) rv.push(at(ball(0.014, 6, 5), [x, y, z * (x > 0 ? 0.145 : 0.115)])); }
    S.add('body', join(rv), GOLDM);

    // --- talons: tucked back below the hips
    const claw = dz => tube([[-0.13, -0.03, dz * 0.4], [-0.185, -0.06, dz], [-0.165, -0.115, dz], [-0.11, -0.118, dz * 0.8]], [0.02, 0.018, 0.012, 0.002], { ring: 6 });
    S.add('clawL', join([
      tube([[0, 0, 0], [-0.08, -0.02, 0], [-0.14, -0.03, 0]], [0.026, 0.022, 0.026], { ring: 6 }), claw(-0.04), claw(0), claw(0.04),
      tube([[-0.14, -0.03, 0], [-0.2, -0.012, 0], [-0.235, -0.05, 0]], [0.018, 0.014, 0.002], { ring: 6 })
    ]), DARK, { p: [-0.375, 0.7, 0.1], m: 1, name: 'talL' });

    S.eye('head', [0.63, 1.265, 0.09], 0.056, { dir: [0.5, 0.05, 0.86], sclera: '#0c1630', iris: '#2f7cff', iris2: '#d6ecff', pupil: 'round', size: 52, lid: BRONZE, open: 31, tilt: -22, glow: 1.2, m: 1 });
  },
  anim(b, t, c) {
    const P = c.parts, st = c.st || (c.st = { tm: t.tm, wp: t.tm * 13, gy: [0, 0, 0], gx: [0, 0, 0], bank: 0 });
    let dt = t.tm - st.tm; if (!(dt > 0 && dt < 0.1)) dt = 0; st.tm = t.tm;
    const u = ease(t.u || 0), a = t.a * (1 - u), s = t.s, h = t.h, k = t.k, melee = k === 'melee', shot = k === 'shot', slam = k === 'slam', buff = k === 'buff';
    const va = t.va || 0, spd = Math.min(1, Math.hypot(t.vf, t.vs) / 2.6), push = Math.max(0, Math.min(1, t.af / 25)), climb = Math.max(0, Math.min(1, va / 6)), hx = (t.hx || 0) * h, hz = (t.hz || 0) * h;
    // strike wave: body, then shoulder, elbow and wing tip (and the talons). Each part comes later and swings past.
    const s1 = spr(st, 's1', s, 900, 36, dt), s2 = spr(st, 's2', s1, 700, 27, dt), s3 = spr(st, 's3', s2, 600, 21, dt);
    // dive: wings fold. hov: ring hover. flat: the rings lie flat below the body.
    const dive = melee ? s1 : 0, hov = buff ? Math.min(1, a + s) : 0, flat = slam ? ease(a * 1.4 + s) * (1 - u) : 0;
    // what the game does to the whole body of a hover creature: bank in a turn and a side step, dip with the acceleration and the speed
    const bank = t.tn * 0.3 * (0.3 + 0.7 * spd) + cl1(t.vs / 2.6) * 0.16, dip = cl1(t.af / 45) * 0.15 + cl1(t.vf / 2.6) * 0.07;

    // wing beat. At rest: a hover with quick beats. When it starts or climbs: hard, fast beats. At speed: a glide with the wings out,
    // and a beat now and then. The down-beat is fast and wide. In the up-beat the elbow and the wrist fold.
    const glide = spd * (1 - Math.max(push, climb)) * (1 - a) * (1 - h), still = Math.max(dive, u);
    const rate = 12.5 - glide * 7 + push * 6 + climb * 4 + a * 2 - h * 4;
    st.wp = dt > 0 ? st.wp + dt * rate : t.tm * rate;
    const q = st.wp / TAU, gust = 0.5 + 0.5 * Math.sin(t.tm * 1.7) * Math.sin(t.tm * 0.6 + 1);      // in the glide the beats come and go
    const amp = (0.3 + 0.14 * push + 0.1 * climb + 0.05 * t.gl) * (1 - glide * (0.55 + 0.4 * gust)) * (1 - still) * (1 - 0.65 * hov) * (1 - 0.5 * flat);
    const str = stroke(q), strT = stroke(q - 0.09), fo = folded(q) * amp / 0.3, foT = folded(q - 0.07) * amp / 0.3;
    // wings. Left wing: rotation.x - = up, rotation.y - = swept back. Order YXZ: lift first, then sweep.
    let up = -0.12 - glide * 0.06 + str * amp, elb = fo * 0.42, elbS = -fo * 0.3, tipUp = 0.1 - glide * 0.12 + strT * amp * 0.75 + foT * 0.35, sweep = -glide * 0.16 - push * 0.1, tipSweep = -foT * 0.45 - glide * 0.1;
    if (melee) { up += -a * 0.6 - s1 * 0.36; tipUp += -a * 0.25 + s3 * 0.06; sweep += a * 0.2 - s1 * 1.1; elbS -= s2 * 0.25; tipSweep -= s3 * 0.5; }                              // dive strike: wings fold back
    else if (shot) { up += -a * 0.5 + s1 * 0.3; tipUp += -a * 0.3 + s3 * 0.25; sweep += -a * 0.6 + s1 * 0.7; elbS += -a * 0.2 + s2 * 0.3; tipSweep += -a * 0.35 + s3 * 0.6; }     // needle volley: wings snap forward
    else if (slam) { up += -a * 0.95 + s1 * 0.6; elb += -a * 0.15 + s2 * 0.2; tipUp += -a * 0.45 + s3 * 0.4; sweep += a * 0.1; }                                                   // magnetic pulse: wings high, then down
    else { up -= hov * 0.3; tipUp -= hov * 0.25; sweep += hov * 0.12; }                                                                                                              // ring hover: wide and steady
    up += h * 0.35; tipUp += h * 0.4; sweep -= h * 0.25; elb += h * 0.3;
    // True North Descent: the wings go straight up and back, and they hold. A small shiver runs through them.
    const quiv = Math.sin(t.tm * 37) * 0.02 * u;
    up += (UW[0] - up) * u + quiv; tipUp += (UW[1] - tipUp) * u; sweep += (UW[2] - sweep) * u; tipSweep += (UW[3] - tipSweep) * u; elb *= 1 - u; elbS *= 1 - u;
    for (const n of ['wingL', 'wingR', 'foreL', 'foreR', 'tipL', 'tipR']) b[n].rotation.order = 'YXZ';
    // in a turn the wing on the inner side goes down and the wing on the outer side goes up
    const tw = t.tn * 0.16 * (1 - still);
    b.wingL.rotation.x = up + tw; b.wingR.rotation.x = -(up - tw); b.foreL.rotation.x = elb; b.foreR.rotation.x = -elb; b.tipL.rotation.x = tipUp; b.tipR.rotation.x = -tipUp;
    b.wingL.rotation.y = sweep; b.wingR.rotation.y = -sweep; b.foreL.rotation.y = elbS; b.foreR.rotation.y = -elbS; b.tipL.rotation.y = tipSweep; b.tipR.rotation.y = -tipSweep;
    // needle feathers (spring parts): they follow the beat with a delay, open for the volley, fold along the needle for the dive
    const fold = Math.max(dive, u * 0.8);
    for (let i = 0; i < NF; i++) {
      const lag = stroke(q - 0.12 - i * 0.035);
      const fan = (shot ? s2 * 0.32 - a * 0.18 : 0) + hov * 0.16 + h * 0.2 + t.gl * 0.06 * Math.sin(t.tm * 11 + i) + fold * (NY - FEATHERS[i][1]) * D2R * 0.85 + glide * 0.05 - fo * 0.08;
      const L = P['f' + i + 'L'], R = P['f' + i + 'R'], twf = lag * amp * 0.45;
      L.rotation.y += fan; R.rotation.y -= fan; L.rotation.x += twf; R.rotation.x -= twf;
    }
    // body: it rises with each down-beat and sinks in the up-beat, pitches down for the dive. A hit throws it back.
    // In the ultimate it points like a compass needle: beak forward and down. It swings a little and comes back to the line.
    const bob = strT * amp * 0.11 * (1 - still), swing = Math.sin(t.tm * 6.3) * Math.exp(-((t.tm * 0.9) % 1) * 3) * u;
    const drift = Math.sin(t.tm * 0.8) * Math.sin(t.tm * 0.31 + 2) * (1 - spd) * (1 - a) * (1 - u);
    b.body.position.y += bob + drift * 0.02 + a * (slam ? 0.16 : melee ? 0.12 : 0.05) - s * (melee ? 0.2 : slam ? 0.12 : 0) + hov * 0.12 - h * 0.04 + u * 0.14;
    b.body.position.x += (melee ? s * 0.32 - a * 0.12 : shot ? -s * 0.1 - a * 0.04 : 0) + hx * 0.1;
    b.body.position.z += drift * 0.03 + hz * 0.1;
    b.body.rotation.z = (0.1 - spd * 0.08 + climb * 0.12) * (1 - u) + (melee ? a * 0.3 - s * 0.62 * (1 - u) : shot ? a * 0.16 - s * 0.12 : slam ? a * 0.1 - s * 0.05 : hov * 0.14) - hx * 0.24 - u * 0.82;
    b.body.rotation.x = hz * 0.22 + drift * 0.04;
    b.body.rotation.y = swing * 0.09;
    // neck and head: the head stays fixed on the target. It stays level when the body banks, dips and bobs. It looks round in short, sharp moves.
    const nod = Math.sin(t.p * 0.6), gz = t.tm * 1.3, g0 = Math.floor(gz), gf = ease((gz - g0) * 7), look = (rnd(g0 - 1) + (rnd(g0) - rnd(g0 - 1)) * gf - 0.5) * (1 - a) * (1 - u) * (1 - spd * 0.6);
    const lvl = 1 - u, bz = b.body.rotation.z - (melee ? a * 0.3 - s * 0.62 * (1 - u) : 0) + u * 0.82;      // the pitch of the body that the head takes out
    b.neck.position.y -= bob * 0.5; b.head.position.y -= bob * 0.35;
    b.neck.rotation.z = nod * 0.03 * lvl + (dip * 0.45 - bz * 0.4) * lvl + (melee ? -a * 0.2 + s1 * 0.2 * lvl : shot ? -a * 0.15 + s1 * 0.12 : slam ? a * 0.2 - s1 * 0.25 : hov * 0.1) + h * 0.15 - hx * 0.2 - u * 0.55;
    b.head.rotation.z = -nod * 0.04 * lvl + (dip * 0.5 - bz * 0.45) * lvl + (melee ? -a * 0.1 + s2 * 0.38 * lvl : shot ? -a * 0.1 + s2 * 0.05 : slam ? a * 0.25 - s2 * 0.3 : hov * 0.12) - h * 0.3 - hx * 0.2 - u * 0.2 + Math.abs(look) * 0.1;
    b.neck.rotation.x = -bank * 0.35 * lvl - b.body.rotation.x * 0.4; b.head.rotation.x = (Math.sin(t.p * 0.45) * 0.07 * (1 - a) + look * 0.12 - bank * 0.55) * lvl - b.body.rotation.x * 0.4;
    b.head.rotation.y = t.lk * 0.3 * lvl + look * 0.5; b.neck.rotation.y = t.lk * 0.12 + look * 0.15 - t.tn * 0.1;
    P.jaw.rotation.z -= a * 0.3 + s * (shot || slam ? 0.55 : 0.25) + h * 0.45 + t.gl * 0.08 + u * 0.35;
    // crest (spring parts): - = up
    const cr = Math.sin(t.p * 1.2 + 0.5) * 0.05 - a * 0.45 - t.gl * (0.2 + 0.06 * Math.sin(t.tm * 9)) - h * 0.35 + dive * 0.25 - hov * 0.3 + u * 0.3 - Math.abs(look) * 0.25;
    P.cr0.rotation.z += cr; P.crL.rotation.z += cr * 0.8; P.crR.rotation.z += cr * 0.8;
    // tail (the sextant): it steers against the bank and against the turn, a little late. The index arm is a spring part: it moves along the limb.
    const steer = spr(st, 'tl', t.tn + cl1(t.vs / 2.6) * 0.5, 90, 9, dt);
    b.tail.rotation.z = -strT * amp * 0.25 + (push - climb) * -0.1 + (melee ? -a * 0.3 + s2 * 0.35 : slam ? -a * 0.3 + s2 * 0.3 : shot ? a * 0.2 - s2 * 0.25 : -hov * 0.2) - h * 0.3 + hx * 0.2 + u * 0.1;
    b.tail.rotation.y = (-steer * 0.32 + Math.sin(t.p * 0.6) * 0.04) * (1 - u);
    b.tail.rotation.x = (-steer * 0.45 - bank * 0.5) * (1 - u);
    const ix = Math.max(-0.46, Math.min(0.46, (Math.sin(t.p * 0.42) * 0.3 + Math.sin(t.p * 1.9) * 0.03 + (shot ? s2 * 0.4 - a * 0.3 : 0) + h * 0.3 * Math.sin(t.tm * 30)) * (1 - u) + swing * 0.3));
    P.index.rotation.y += ix; P.vern.rotation.y += ix;
    // legs: the thighs are tucked. The talons (spring bones) hang a little, clench now and then, and reach down and forward in the dive.
    const grab = melee ? s2 * 1.0 - a * 0.15 : slam ? a * 0.35 + s2 * 0.2 : 0, land = Math.max(0, Math.min(1, -va / 5));
    const clench = Math.pow(Math.max(0, Math.sin(t.tm * 0.9)), 10) * 0.35;
    b.legL.rotation.z = Math.sin(t.p * 1.2) * 0.04 + grab * 0.7 + land * 0.5 + h * 0.3 - u * 0.25 - spd * 0.1; b.legR.rotation.z = -Math.sin(t.p * 1.2) * 0.04 + grab * 0.64 + land * 0.5 + h * 0.25 - u * 0.25 - spd * 0.1;
    b.clawL.rotation.z = grab * 0.6 + land * 0.5 - clench + 0.1 * Math.sin(t.tm * 0.7) * Math.sin(t.tm * 0.23); b.clawR.rotation.z = grab * 0.55 + land * 0.5 - clench * 0.7 + 0.1 * Math.sin(t.tm * 0.6 + 2) * Math.sin(t.tm * 0.29);
    // rings: each axis leans away from the body axis and turns around it. They are gyroscopes: when the body turns or banks,
    // they keep their plane for a moment, then they follow (each ring at its own speed).
    // Slam: all rings lie flat below the body, then grow as a wave. Ultimate: the 3 rings line up in one plane, with each north pointer at the top.
    const dYaw = -(t.yr ? t.yr : -t.tn * 5) * dt, dBank = bank - st.bank; st.bank = bank;
    for (let i = 0; i < 3; i++) {
      const r = RINGS[i], bn = b['ring' + (i + 1)], sp = r[2], free = 1 - u, kf = dt > 0 ? Math.exp(-dt / GTAU[i]) : 1;
      st.gy[i] = cl1((st.gy[i] + dYaw) * kf); st.gx[i] = cl1((st.gx[i] - dBank) * kf);
      const tilt = r[1] * D2R * (1 + 0.25 * hov) * (1 - 0.8 * dive) * free + Math.sin(t.tm * 31 + i * 2) * 0.22 * h + Math.sin(t.tm * 6 + i * 2.1) * 0.08 * t.gl * free;
      _e.set(((t.o * sp + r[3]) % TAU) * free + hov * 2.2 * (sp > 0 ? 1 : -1), 0, tilt, 'XYZ'); _q.setFromEuler(_e);
      if (flat > 0) { _e.set(0, t.o * sp * 0.6 + r[3], Math.PI / 2, 'XYZ'); _q2.setFromEuler(_e); _q.slerp(_q2, flat); }
      bn.quaternion.copy(_q).premultiply(_qy.setFromAxisAngle(YAX, st.gy[i] * free)).premultiply(_qy.setFromAxisAngle(XAX, st.gx[i] * free));
      bn.position.y -= flat * 0.36;
      bn.scale.setScalar(1 + (slam ? s1 * (0.45 + 0.22 * i) : 0) + hov * 0.1 - dive * 0.15 * free + t.gl * 0.04 * Math.sin(t.tm * 8 + i * 2) + u * 0.06 * Math.sin(t.tm * 5 - i * 1.2));
    }
    // heart: the dark stone turns slowly. Blue sparks jump from it: more and larger when it has power.
    const pulse = 0.5 + 0.5 * Math.sin(t.p * 2.4);
    const flare = a * 0.35 + (slam ? s * 1.1 : s * 0.3) + t.gl * (0.25 + 0.1 * Math.sin(t.tm * 8)) + hov * 0.3 - h * 0.25 + u * 0.7 + push * 0.2;
    P.core.scale.setScalar(Math.max(0.8, Math.min(1.3, 1 + pulse * 0.04 + flare * 0.2)));
    P.core.rotation.y = t.tm * 0.9 + a * 3;
    P.halo.scale.setScalar(1 + pulse * 0.15 + Math.max(0, flare) * 1.5);
    const fk = Math.floor(t.tm * 15), pw = Math.max(0, flare);
    P.spA.visible = rnd(fk) > 0.3 - pw * 0.3; P.spB.visible = rnd(fk + 7.3) > 0.55 - pw * 0.5;
    P.spA.rotation.set(rnd(fk + 1) * TAU, rnd(fk + 2) * 0.5, 0); P.spB.rotation.set(rnd(fk + 3) * TAU, 0, rnd(fk + 4) * 0.5);
    P.spA.scale.setScalar(0.75 + rnd(fk + 5) * 0.35 + pw * 0.7); P.spB.scale.setScalar(0.7 + rnd(fk + 6) * 0.4 + pw * 0.8);
    const gem = 1 + pulse * 0.2 + a * 0.5 + t.gl * 0.3 + (shot ? s * 0.6 : 0) + u * 0.4;
    P.gemL.scale.setScalar(gem); P.gemR.scale.setScalar(gem);
  }
};
// wing pose of the ultimate: arm lift, tip lift, arm sweep, tip sweep (radians; - = up / back)
const UW = [-1.2, -0.12, -0.6, -0.3];
