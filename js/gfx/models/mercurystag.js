/* Mercurystag (Argantler, the Fountain Stag) - a stag of black volcanic glass with cut facets. Antlers and hooves are liquid silver.
   Heart piece: the silver pool at the base of the antlers. Tide marks along the flanks. Maker's mark: a wave on the left haunch. Iron / Tide. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { crystal, ball, tube, flame } from '../geo.js';
import { A } from '../rig.js';

const OBS = '#1c1b29', OBS2 = '#3a3658', DEEP = '#100f17', SILVER = '#d5dbe6', D2R = Math.PI / 180;
const SHARD = { col: '#242134', rough: 0.12, flat: true, env: 1.5 };
const CHROME = { col: '#e9eff6', metal: 1, rough: 0.05, env: 1.6 };
const HEART = { col: '#dfe8f4', metal: 1, rough: 0.04, env: 1.8, glow: '#6f9fd8', glowK: 0.3 };      // the mirror in the chest
const POOL = { col: '#e4f0ff', metal: 1, rough: 0.05, env: 1.6, glow: '#a6d2ff', glowK: 2.6 };       // heart piece
const HALO = { col: '#9fd0ff', glow: '#9fd0ff', glowK: 1.2, add: true, op: 0.14, noOut: true };
const MARK = { col: '#e6eefa', metal: 1, rough: 0.1, env: 1.4, glow: '#8fc4ff', glowK: 0.9, noOut: true };
const LEG = ['FL', 'FR', 'BL', 'BR'], TAU = Math.PI * 2, GS = { c: 0, lift: 0, flex: 0, load: 0 };
const cl = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
// One leg in the step cycle. ph = phase (rad), duty = part of the cycle with the foot on the ground.
// c: position of the foot along the step (1 = far forward, -1 = far back). lift, flex: 0..1 while the foot is in the air
// (it lifts fast, the joints bend early). load: 0..1 just after the foot lands.
function stride(ph, duty, o) {
  let u = ph / TAU; u -= Math.floor(u);
  if (u < duty) { const s = u / duty; o.c = 1 - 2 * s; o.lift = 0; o.flex = 0; o.load = s < 0.35 ? Math.sin(s / 0.35 * Math.PI) : 0; }
  else { const s = (u - duty) / (1 - duty), e = s * s * (3 - 2 * s); o.c = 2 * e - 1; o.lift = Math.sin(Math.PI * Math.pow(s, 0.8)); o.flex = Math.sin(Math.PI * Math.pow(s, 0.6)); o.load = 0; }
  return o;
}

// antler of the left side: [x, y, z, radius, bone index]. Beam, brow tine, front tine, back tine, crown fork.
const DROPS = [
  [0.83, 1.86, 0.12, 0.07, 0], [0.78, 1.95, 0.2, 0.064, 0], [0.73, 2.03, 0.29, 0.058, 0],
  [0.69, 2.11, 0.38, 0.052, 1], [0.67, 2.2, 0.455, 0.046, 1], [0.67, 2.29, 0.5, 0.04, 1],
  [0.7, 2.37, 0.515, 0.034, 2], [0.75, 2.44, 0.5, 0.028, 2], [0.81, 2.49, 0.46, 0.022, 2],
  [0.93, 1.93, 0.17, 0.048, 0], [1.02, 1.99, 0.21, 0.038, 0], [1.1, 2.06, 0.24, 0.028, 0], [1.16, 2.13, 0.25, 0.02, 0],
  [0.84, 2.08, 0.33, 0.042, 1], [0.93, 2.15, 0.36, 0.033, 1], [1.01, 2.23, 0.37, 0.024, 1],
  [0.77, 2.26, 0.47, 0.036, 1], [0.86, 2.33, 0.49, 0.028, 1], [0.94, 2.41, 0.49, 0.02, 1],
  [0.58, 2.15, 0.42, 0.04, 1], [0.48, 2.21, 0.46, 0.031, 1], [0.39, 2.28, 0.49, 0.023, 1],
  [0.6, 2.42, 0.54, 0.03, 2], [0.52, 2.48, 0.56, 0.022, 2]
];
const ANT = [[0.84, 1.8, 0.1], [0.71, 2.07, 0.335], [0.685, 2.33, 0.51]];
// free drops near the antler: [x, y, z, radius, bone index]
const SAT = [[1.23, 2.21, 0.27, 0.02, 0], [0.97, 2.1, 0.3, 0.024, 0], [0.55, 2.05, 0.3, 0.026, 1], [0.3, 2.34, 0.52, 0.018, 1], [0.87, 2.56, 0.42, 0.02, 2], [0.45, 2.55, 0.58, 0.016, 2]];

function join(list) {
  return mergeGeometries(list.map(g => { const q = g.index ? g.toNonIndexed() : g.clone(); q.deleteAttribute('uv'); if (!q.getAttribute('normal')) q.computeVertexNormals(); return q; }));
}
// obsidian shard at p that points along d
const _q = new THREE.Quaternion(), _eu = new THREE.Euler(), _n = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
// cut one flat facet: the plane through p with the normal n. h = half size of the cut.
function facet(S, bone, p, n, h, o) {
  _n.set(n[0], n[1], n[2]).normalize(); _eu.setFromQuaternion(_q.setFromUnitVectors(UP, _n), 'XYZ');
  S.box(bone, [p[0] + _n.x * h, p[1] + _n.y * h, p[2] + _n.z * h], [h, h, h], 0.004,
    Object.assign({ sub: 1, k: 0.008, col: OBS2, gloss: 0.95, rot: [_eu.x / D2R, _eu.y / D2R, _eu.z / D2R] }, o));
}
function shard(p, d, r, up, down, sides) {
  const g = crystal(r, up, down === undefined ? r * 0.8 : down, sides || 5);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]).normalize()));
  return g.translate(p[0], p[1], p[2]);
}

export default {
  id: 'mercurystag', rim: '#cfe0ff', focus: 'pool', top: 2.55, rough: 0.5,
  opts: { cell: 0.026, mottle: 0.12, mottleF: 7 },
  // spring bones: the antlers are liquid, so they slosh and swing long. Ears and tail settle fast.
  dyn: [
    { b: ['ant1L', 'ant2L', 'ant3L'], k: 44, d: 3.6, amt: 0.4, drag: 0.5 }, { b: ['ant1R', 'ant2R', 'ant3R'], k: 49, d: 4, amt: 0.4, drag: 0.5 },
    { b: ['earL'], k: 90, d: 8, amt: 0.6, drag: 2 }, { b: ['earR'], k: 84, d: 7.5, amt: 0.6, drag: 2 },
    { b: ['tail'], k: 55, d: 6, amt: 0.9, drag: 2 }
  ],
  build(S) {
    // spine in 3 parts: hips (croup and back legs), body (barrel), chest (shoulders and front legs). Legs: front = shoulder, knee, hoof.
    // back = hip, stifle (gas), hock, hoof.
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.92, 0]).bone('chest', 'body', [0.08, 0.96, 0]).bone('hips', 'body', [-0.2, 0.96, 0])
      .bone('neck1', 'chest', [0.5, 1.06, 0]).bone('neck2', 'neck1', [0.72, 1.33, 0]).bone('head', 'neck2', [0.83, 1.56, 0])
      .bone('earL', 'head', [0.83, 1.7, 0.09], { m: 1 })
      .bone('ant1L', 'head', ANT[0], { m: 1 }).bone('ant2L', 'ant1L', ANT[1], { m: 1 }).bone('ant3L', 'ant2L', ANT[2], { m: 1 })
      .bone('legFL', 'chest', [0.4, 0.82, 0.16], { m: 1 }).bone('kneeFL', 'legFL', [0.445, 0.48, 0.18], { m: 1 }).bone('hoofFL', 'kneeFL', [0.42, 0.18, 0.18], { m: 1 })
      .bone('legBL', 'hips', [-0.5, 0.88, 0.17], { m: 1 }).bone('gasBL', 'legBL', [-0.38, 0.58, 0.2], { m: 1 }).bone('hockBL', 'gasBL', [-0.6, 0.42, 0.2], { m: 1 }).bone('hoofBL', 'hockBL', [-0.55, 0.18, 0.2], { m: 1 })
      .bone('tail', 'hips', [-0.78, 1.08, 0]);

    const G = { gloss: 0.3 }, GM = { m: 1, gloss: 0.3 }, FAC = { col: OBS2, gloss: 0.9, k: 0.018 }, O = (a, b) => Object.assign({}, a, b);
    const HOOF = { col: SILVER, metal: 1, gloss: 0.9, k: 0.02 };
    S.color(OBS);
    // torso: deep chest, lean barrel, strong rump, withers
    S.ell('chest', [0.36, 0.94, 0], [0.36, 0.31, 0.26], G);
    S.ell('body', [-0.06, 0.93, 0], [0.48, 0.26, 0.23], G);
    S.ell('hips', [-0.48, 0.95, 0], [0.32, 0.3, 0.25], G);
    S.ell('chest', [0.3, 1.16, 0], [0.2, 0.11, 0.12], G);
    S.ell('chest', [0.6, 0.86, 0], [0.16, 0.2, 0.17], G);
    // cut facets: keel on the chest, flank plates, croup plate, ridge plates on the spine
    S.box('chest', [0.66, 0.9, 0], [0.1, 0.2, 0.1], 0.02, O(FAC, { rot: [0, 45, -12] }));
    // knapped facets: flat cuts through the glass
    facet(S, 'body', [-0.05, 1.085, 0.15], [0.04, 0.7, 0.7], 0.3, { m: 1 });
    facet(S, 'body', [-0.06, 0.8, 0.164], [-0.03, -0.62, 0.78], 0.3, { m: 1 });
    facet(S, 'body', [-0.646, 1.172, 0], [-0.6, 0.8, 0], 0.24);
    facet(S, 'body', [-0.655, 0.975, 0.175], [-0.7, 0.1, 0.7], 0.2, { m: 1 });
    facet(S, 'chest', [0.549, 0.98, 0.189], [0.7, 0.15, 0.7], 0.2, { m: 1 });
    facet(S, 'chest', [0.28, 1.235, 0.055], [0.1, 0.8, 0.6], 0.14, { m: 1 });
    // the socket of the mirror in the chest
    S.ell('chest', [0.74, 0.93, 0], [0.09, 0.105, 0.095], { sub: 1, col: '#8ea6c8', glow: 0.5, k: 0.02 });
    S.tor('chest', [0.7, 0.93, 0], 0.1, 0.03, { rot: [0, 0, 90], col: SILVER, metal: 1, gloss: 0.9, k: 0.012 });
    // front legs: shoulder blade, forearm, knee, cannon, silver hoof
    S.ell('legFL', [0.38, 0.92, 0.19], [0.17, 0.22, 0.1], GM);
    facet(S, 'legFL', [0.38, 0.95, 0.268], [0.12, 0.2, 1], 0.2, { m: 1 });
    facet(S, 'legFL', [0.5, 0.98, 0.235], [0.8, 0.25, 0.55], 0.12, { m: 1 });
    S.cap('legFL', [0.4, 0.84, 0.17], [0.44, 0.49, 0.18], 0.125, 0.066, GM);
    S.ell('kneeFL', [0.445, 0.48, 0.18], [0.075, 0.08, 0.07], O(FAC, { m: 1, k: 0.03 }));
    S.cap('kneeFL', [0.44, 0.46, 0.18], [0.42, 0.2, 0.18], 0.055, 0.047, GM);
    S.ell('hoofFL', [0.42, 0.17, 0.18], [0.062, 0.05, 0.062], O(HOOF, { m: 1 }));
    S.cap('hoofFL', [0.43, 0.1, 0.18], [0.48, 0.055, 0.18], 0.062, 0.058, O(HOOF, { m: 1 }));
    // back legs: haunch, thigh, gaskin, hock, cannon, silver hoof
    S.ell('legBL', [-0.5, 0.9, 0.19], [0.23, 0.27, 0.12], GM);
    facet(S, 'legBL', [-0.5, 0.93, 0.285], [-0.08, 0.14, 1], 0.24, { m: 1 });
    facet(S, 'legBL', [-0.66, 0.9, 0.245], [-0.8, -0.1, 0.6], 0.14, { m: 1 });
    S.cap('legBL', [-0.46, 0.8, 0.19], [-0.38, 0.58, 0.2], 0.13, 0.08, GM);
    S.cap('gasBL', [-0.38, 0.58, 0.2], [-0.6, 0.42, 0.2], 0.076, 0.058, GM);
    S.ell('hockBL', [-0.605, 0.42, 0.2], [0.07, 0.075, 0.066], O(FAC, { m: 1, k: 0.03 }));
    S.cap('hockBL', [-0.6, 0.42, 0.2], [-0.555, 0.2, 0.2], 0.052, 0.046, GM);
    S.ell('hoofBL', [-0.55, 0.17, 0.2], [0.06, 0.05, 0.06], O(HOOF, { m: 1 }));
    S.cap('hoofBL', [-0.54, 0.1, 0.2], [-0.49, 0.055, 0.2], 0.062, 0.058, O(HOOF, { m: 1 }));
    // neck and head
    S.tube(['neck1', 'neck2', 'head'], [[0.5, 1.08, 0], [0.7, 1.3, 0], [0.8, 1.5, 0], [0.85, 1.6, 0]], [0.22, 0.16, 0.12, 0.115], { gloss: 0.3, k: 0.07 });
    facet(S, 'neck2', [0.66, 1.3, 0.112], [0.15, -0.1, 1], 0.15, { m: 1 });
    facet(S, 'neck2', [0.81, 1.235, 0], [0.85, -0.5, 0], 0.13);
    S.ell('head', [0.9, 1.62, 0], [0.14, 0.125, 0.118], G);
    S.cap('head', [0.96, 1.6, 0], [1.2, 1.49, 0], 0.095, 0.055, G);
    S.cap('head', [0.9, 1.53, 0], [1.14, 1.44, 0], 0.062, 0.04, G);
    S.box('head', [0.98, 1.7, 0], [0.1, 0.03, 0.07], 0.02, O(FAC, { rot: [0, 0, -24] }));
    S.box('head', [0.95, 1.6, 0.105], [0.07, 0.05, 0.025], 0.02, O(FAC, { m: 1, rot: [0, -14, -20] }));
    S.ell('head', [1.245, 1.475, 0], [0.04, 0.04, 0.048], { col: SILVER, metal: 1, gloss: 1, k: 0.02 });
    S.cap('head', [0.855, 1.7, 0.09], [0.84, 1.8, 0.1], 0.05, 0.042, { m: 1, col: SILVER, metal: 1, gloss: 0.9, k: 0.02 });
    S.cap('earL', [0.83, 1.7, 0.1], [0.74, 1.79, 0.3], 0.052, 0.024, { m: 1, gloss: 0.3, k: 0.04 });
    S.ell('head', [1.02, 1.685, 0], [0.036, 0.028, 0.032], { col: '#cfe4ff', glow: 1.0, metal: 1, gloss: 1, k: 0.012 });
    // the basin of the pool between the antlers (heart piece)
    S.ell('head', [0.85, 1.745, 0], [0.085, 0.034, 0.125], { col: SILVER, metal: 1, gloss: 1, glow: 1.2, k: 0.014 });
    S.tor('head', [0.985, 1.66, 0], 0.118, 0.022, { rot: [0, 0, 62], col: SILVER, metal: 1, gloss: 1, k: 0.012 });
    // tail
    S.cap('tail', [-0.76, 1.08, 0], [-0.9, 1.0, 0], 0.07, 0.042, G);

    // --- paint: silver veins. Each vein is a thin sheet that cuts through the stone. ------------
    const VN = (bn, c, r, rot, o) => S.ell(bn, c, r, Object.assign({ paint: 1, col: '#e3e9f4', metal: 1, gloss: 1, glow: 0.45, cb: 0.011, rot }, o));
    // tide marks: level lines along the flanks, like the lines that the water leaves on a harbour wall
    for (const [y, x0, x1, th] of [[0.835, -0.74, 0.6, 0.015], [0.925, -0.6, 0.46, 0.012], [1.0, -0.42, 0.28, 0.01]])
      S.ell('body', [(x0 + x1) / 2, y, 0], [(x1 - x0) / 2, th, 0.44], { paint: 1, col: '#e3e9f4', metal: 1, gloss: 1, glow: 0.45, cb: 0.013 });
    VN('legFL', [0.43, 0.6, 0.24], [0.012, 0.4, 0.1], [0, 0, 5], { m: 1 });
    VN('legBL', [-0.57, 0.3, 0.26], [0.012, 0.18, 0.1], [0, 0, -11], { m: 1 });
    VN('neck1', [0.64, 1.3, 0.11], [0.3, 0.3, 0.012], [0, 0, 0], { m: 1 });
    VN('neck2', [0.72, 1.36, 0], [0.012, 0.14, 0.2], [0, 0, 50]);
    VN('head', [1.08, 1.6, 0], [0.19, 0.12, 0.012], [0, 0, 0]);
    VN('head', [0.94, 1.62, 0.1], [0.012, 0.1, 0.08], [0, 0, 28], { m: 1 });
    VN('chest', [0.56, 0.98, 0], [0.012, 0.3, 0.3], [0, 0, 58]);
    // pools where the veins meet, inner ear, hoof bands
    // maker's mark: the dark ground of the wave on the left haunch
    S.cap('legBL', [-0.52, 0.95, 0.2], [-0.52, 0.95, 0.4], 0.105, 0.105, { paint: 1, col: DEEP, gloss: 1, cb: 0.012 });
    // facets: each flat cut of the glass takes the light in its own way
    S.paint((p, n, c, info) => {
      if (info.metal > 0.25 || info.glow > 0.2) return;
      const q = Math.round(n.x * 2.4) * 12.9898 + Math.round(n.y * 2.4) * 78.233 + Math.round(n.z * 2.4) * 37.719 + Math.round(p.x * 2.2) * 4.1;
      const v = Math.abs(Math.sin(q) * 43758.5453) % 1, f = 0.72 + 0.62 * v * v;
      c[0] *= f; c[1] *= f; c[2] *= f * 1.04; info.gloss = Math.max(info.gloss, 0.3 + 0.65 * v);
    });
    S.cap('earL', [0.8, 1.76, 0.17], [0.76, 1.8, 0.27], 0.022, 0.012, { paint: 1, col: '#aeb9cc', metal: 1, gloss: 0.8, cb: 0.012, m: 1 });
    S.ell('body', [0, 0.69, 0], [0.5, 0.06, 0.16], { paint: 1, col: DEEP, cb: 0.05 });

    // --- obsidian shards: mane, chest ruff, spine, haunch, joints, tail, beard -------------------
    S.add('neck1', join([shard([0.44, 1.24, 0], [-0.62, 0.78, 0], 0.055, 0.22), shard([0.53, 1.36, 0.02], [-0.7, 0.7, 0.1], 0.05, 0.2), shard([0.5, 1.3, -0.03], [-0.75, 0.6, -0.2], 0.04, 0.15)]), SHARD, { p: [0, 0, 0] });
    S.add('neck2', join([shard([0.62, 1.47, 0], [-0.74, 0.66, 0], 0.045, 0.18), shard([0.69, 1.58, -0.015], [-0.8, 0.6, -0.1], 0.04, 0.15), shard([0.66, 1.52, 0.03], [-0.8, 0.5, 0.3], 0.03, 0.11)]), SHARD, { p: [0, 0, 0] });
    S.add('chest', join([shard([0.68, 1.1, 0], [0.85, -0.5, 0], 0.055, 0.2), shard([0.64, 1.12, 0.09], [0.7, -0.45, 0.5], 0.045, 0.17), shard([0.64, 1.12, -0.09], [0.7, -0.45, -0.5], 0.045, 0.17), shard([0.6, 0.7, 0], [0.5, -0.85, 0], 0.045, 0.14)]), SHARD, { p: [0, 0, 0] });
    S.add('hips', join([shard([-0.42, 1.2, 0], [-0.5, 0.86, 0], 0.045, 0.15), shard([-0.6, 1.17, 0], [-0.65, 0.75, 0], 0.05, 0.19), shard([-0.72, 1.1, 0], [-0.8, 0.6, 0], 0.04, 0.14), shard([-0.3, 1.17, 0], [-0.5, 0.86, 0], 0.036, 0.11)]), SHARD, { p: [0, 0, 0] });
    S.add('body', join([shard([0.0, 1.17, 0.012], [-0.55, 0.83, 0.1], 0.036, 0.11), shard([-0.16, 1.16, -0.012], [-0.5, 0.86, -0.1], 0.034, 0.1)]), SHARD, { p: [0, 0, 0] });
    S.add('chest', shard([0.16, 1.2, 0], [-0.5, 0.86, 0], 0.04, 0.13), SHARD, { p: [0, 0, 0] });
    S.add('legBL', shard([0, 0, 0], [-0.7, 0.45, 0.55], 0.045, 0.18), SHARD, { p: [-0.66, 1.02, 0.24], m: 1 });
    S.add('kneeFL', shard([0, 0, 0], [-0.85, 0.5, 0.1], 0.03, 0.13), SHARD, { p: [0.39, 0.52, 0.18], m: 1 });
    S.add('hockBL', shard([0, 0, 0], [-0.7, 0.7, 0.05], 0.03, 0.14), SHARD, { p: [-0.65, 0.46, 0.2], m: 1 });
    S.add('tail', join([shard([-0.9, 1.0, 0], [-0.75, -0.65, 0], 0.045, 0.2), shard([-0.86, 1.03, 0.03], [-0.9, -0.2, 0.4], 0.03, 0.12), shard([-0.86, 1.03, -0.03], [-0.9, -0.2, -0.4], 0.03, 0.12)]), SHARD, { p: [0, 0, 0] });
    S.add('head', shard([0, 0, 0], [0.15, -1, 0], 0.028, 0.13), SHARD, { p: [1.06, 1.43, 0] });

    // --- mercury: the heart in the chest, the antlers, the free drops -------------------------------
    S.add('chest', ball(0.068, 18, 12), HEART, { p: [0.72, 0.93, 0], name: 'heart' });
    // maker's mark: a small wave, cut into the left haunch
    S.add('legBL', tube([[-0.085, -0.025, 0], [-0.05, 0.02, 0], [-0.012, -0.018, 0], [0.03, 0.03, 0], [0.064, 0.05, 0], [0.084, 0.03, 0], [0.068, 0.008, 0]], [0.007, 0.011, 0.011, 0.011, 0.01, 0.008, 0.005], { ring: 6, seg: 30 }), MARK, { p: [-0.52, 0.945, 0.318] });
    // heart piece: the silver pool at the base of the antlers, and the drops that fall from the antlers
    S.add('head', ball(0.075, 20, 12), POOL, { p: [0.85, 1.772, 0], s: [1, 0.5, 1.35], name: 'pool' });
    S.add('head', ball(0.15, 16, 10), HALO, { p: [0.85, 1.79, 0], s: [1, 0.6, 1.2], name: 'halo' });
    S.add('ant1L', flame(0.02, 0.075, 8).rotateX(Math.PI), CHROME, { p: [1.1, 2.03, 0.24], m: 1, name: 'dr0L' });
    S.add('ant2L', flame(0.018, 0.066, 8).rotateX(Math.PI), CHROME, { p: [0.4, 2.25, 0.49], m: 1, name: 'dr1L' });
    for (let k = 0; k < 3; k++) {
      const grp = DROPS.filter(d => d[4] === k).map(d => ball(d[3] * 1.22 + 0.004, d[3] > 0.035 ? 16 : 12, d[3] > 0.035 ? 12 : 8).translate(d[0] - ANT[k][0], d[1] - ANT[k][1], d[2] - ANT[k][2]));
      S.add('ant' + (k + 1) + 'L', join(grp), CHROME, { p: ANT[k], m: 1 });
    }
    SAT.forEach((d, i) => S.add('ant' + (d[4] + 1) + 'L', ball(d[3] * 1.3, 12, 8), CHROME, { p: [d[0], d[1], d[2]], m: 1, name: 'sa' + i + 'L' }));
    S.eye('head', [0.965, 1.652, 0.088], 0.055, { dir: [0.5, 0.12, 0.85], sclera: '#0e0d16', iris: '#f2f7ff', iris2: '#86b2f0', pupil: 'bar', size: 60, lid: OBS2, open: 46, tilt: -5, glow: 0.7, m: 1 });
  },
  anim(b, t, c) {
    // u = the ultimate, Tides of Chrome. It takes the place of the wind-up and the strike poses.
    const u = A.ease(t.u || 0), nu = 1 - u;
    const P = c.parts, br = Math.sin(t.p), a = t.a * nu, s = t.s * nu, h = t.h, k = t.k, melee = k === 'melee', shot = k === 'shot', rear = k === 'buff' || k === 'slam';
    const tn = (t.tn || 0) * nu, hx = (t.hx || 0) * h, hz = (t.hz || 0) * h, fol = s * (1 - s) * 4;
    // ---- gait: a 4-beat walk when it is slow, a trot (diagonal pairs) at speed. Each leg has its own phase. ----
    const vm = Math.hypot(t.vf || 0, t.vs || 0), known = vm + Math.abs(t.tn || 0) > 0.05, spd = known ? Math.min(1, vm / 2.6) : t.mv;
    const dF = known ? (vm > 0.05 ? t.vf / vm : 0) : 1, dS = known && vm > 0.05 ? t.vs / vm : 0, sk = known ? cl(vm / 0.5, 0, 1) : 1;
    const q = A.ease((spd - 0.45) / 0.35), duty = 0.64 - 0.2 * q, mv = t.mv * nu, St = (0.55 - 0.1 * q) * sk * mv;
    let loadF = 0, loadB = 0, yawF = 0, yawB = 0, rollF = 0, rollB = 0;
    for (let i = 0; i < 4; i++) {
      const front = i < 2, sg = i & 1 ? -1 : 1, n = LEG[i], U = b['leg' + n];
      const g = stride(t.w + TAU * (front ? (sg > 0 ? 0.25 : 0.77) + 0.25 * q : (sg > 0 ? 0 : 0.52)), duty, GS);
      // the foot goes back on the ground, then it lifts fast and reaches forward. The inner legs take shorter steps in a turn.
      const th = St * dF * g.c * (1 - 0.3 * tn * sg), lat = (0.3 * dS * sk + 0.26 * tn * (front ? 1 : -1) * (1 - sk * 0.6)) * mv * g.c;
      U.rotation.z += th + g.lift * mv * (front ? 0.12 : -0.04);
      U.rotation.x -= lat;
      U.position.y += g.lift * 0.025 * mv - 0.66 * (2 - Math.cos(th) - Math.cos(lat));
      const fx = g.flex * mv * (0.65 + 0.35 * spd);
      if (front) { b['knee' + n].rotation.z -= fx * 0.95; b['hoof' + n].rotation.z -= fx * 0.6 - g.load * 0.1 * mv; loadF += g.load; yawF += g.c * sg; rollF += g.lift * sg; }
      else { b['gas' + n].rotation.z -= fx * 0.5; b['hock' + n].rotation.z += fx * 0.95; b['hoof' + n].rotation.z -= fx * 0.5; loadB += g.load; yawB += g.c * sg; rollB += g.lift * sg; }
    }
    // the body answers the legs: shoulders and hips turn against each other, the chest drops when a front hoof lands,
    // the spine curves into a turn
    b.chest.position.y -= 0.02 * loadF * mv; b.hips.position.y -= 0.022 * loadB * mv;
    b.chest.rotation.y += 0.07 * yawF * sk * mv * dF - tn * 0.14;
    b.hips.rotation.y += 0.08 * yawB * sk * mv * dF + tn * 0.12;
    b.chest.rotation.x += 0.03 * rollF * mv + hz * 0.1; b.hips.rotation.x += 0.05 * rollB * mv;
    b.body.rotation.z += 0.018 * (loadB - loadF) * mv;
    // ---- rest: the weight goes from one side to the other, and the free back leg rests on the tip of its hoof ----
    const rest = cl(1 - t.mv * 2 - a - s - u - h, 0, 1), ws = Math.sin(t.tm * 0.5) * Math.sin(t.tm * 0.17 + 1) * rest;
    b.body.position.z += ws * 0.022; b.hips.rotation.x += ws * 0.035;
    for (const n of LEG) b['leg' + n].rotation.x += ws * 0.026;
    const rcR = cl((ws - 0.3) / 0.5, 0, 1), rcL = cl((-ws - 0.3) / 0.5, 0, 1);
    b.gasBR.rotation.z -= rcR * 0.2; b.hockBR.rotation.z += rcR * 0.42; b.hoofBR.rotation.z -= rcR * 0.6;
    b.gasBL.rotation.z -= rcL * 0.2; b.hockBL.rotation.z += rcL * 0.42; b.hoofBL.rotation.z -= rcL * 0.6;
    // the legs stay upright when the shoulders and the hips roll
    b.legFL.rotation.x -= b.chest.rotation.x; b.legFR.rotation.x -= b.chest.rotation.x; b.legBL.rotation.x -= b.hips.rotation.x; b.legBR.rotation.x -= b.hips.rotation.x;
    // in the air the front legs fold and the back legs stretch; they reach down when it falls
    const air = cl((t.va || 0) / 4, -1, 1);
    if (air) for (const sd of ['L', 'R']) {
      b['legF' + sd].rotation.z += air * 0.3; b['kneeF' + sd].rotation.z -= Math.max(0, air) * 0.8; b['legB' + sd].rotation.z -= air * 0.35; b['hockB' + sd].rotation.z += Math.max(0, -air) * 0.3;
    }
    // ultimate: the head goes low, the front hooves go wide and stay on the floor, the croup stays high
    b.body.rotation.z -= u * 0.16; b.body.position.y -= u * 0.05; b.body.position.x += u * 0.05;
    b.legFL.rotation.z += u * 0.66; b.legFR.rotation.z += u * 0.7; b.legFL.rotation.x -= u * 0.1; b.legFR.rotation.x += u * 0.1;
    b.hoofFL.rotation.z -= u * 0.42; b.hoofFR.rotation.z -= u * 0.46; b.kneeFL.rotation.z += u * 0.06; b.kneeFR.rotation.z += u * 0.06;
    b.legBL.rotation.z += u * 0.16; b.legBR.rotation.z += u * 0.16; b.legBL.position.y -= u * 0.03; b.legBR.position.y -= u * 0.03;
    b.hips.rotation.z += u * 0.04; b.chest.rotation.z -= u * 0.03;
    // rear up on the back legs (shield and stomp): the body turns, the back hooves stay in place, the front legs fold.
    // The stomp comes down on straight front legs.
    const up = rear ? a * 0.3 - s * (k === 'slam' ? 0.2 : 0.08) : 0, upP = Math.max(0, up), upN = Math.max(0, -up);
    const drop = melee ? a * 0.07 : 0;
    b.body.rotation.z += up + h * 0.05 - hx * 0.05 + (melee ? -a * 0.05 + s * 0.04 : 0);
    b.body.position.y += upP * 0.5 - upN * 0.2 - drop;
    b.body.position.x += (melee ? s * 0.36 - a * 0.14 : shot ? s * 0.06 - a * 0.05 : 0) - h * 0.03 - upP * 0.1;
    b.legBL.rotation.z -= up; b.legBR.rotation.z -= up;
    b.legFL.rotation.z += upP * 1.5 + upN + (melee ? s * 0.5 - a * 0.15 : 0); b.legFR.rotation.z += upP * 2.0 + upN + (melee ? s * 0.4 : 0);
    b.kneeFL.rotation.z -= upP * 2.4 + (melee ? s * 0.35 : 0); b.kneeFR.rotation.z -= upP * 3.2 + (melee ? s * 0.2 : 0);
    b.hoofFL.rotation.z -= upP * 1.4; b.hoofFR.rotation.z -= upP * 1.6;
    b.legFL.position.y += upN * 0.3; b.legFR.position.y += upN * 0.3;
    // charge: it sits back on its back legs (stifle and hock bend), one front hoof paws the floor. Then the back legs push.
    if (melee) {
      for (const sd of ['L', 'R']) { b['gasB' + sd].rotation.z -= a * 0.22; b['hockB' + sd].rotation.z += a * 0.42 - s * 0.15; b['legF' + sd].position.y += drop * 0.9; }
      b.legBL.rotation.z -= s * 0.45 - a * 0.15; b.legBR.rotation.z -= s * 0.38 - a * 0.1;
      const paw = Math.sin(t.tm * 20), pw = a * Math.max(0, paw);
      b.legFR.rotation.z += a * paw * 0.22 + pw * 0.2; b.kneeFR.rotation.z -= pw * 0.9; b.hoofFR.rotation.z -= pw * 0.5; b.legFR.position.y += pw * 0.03;
    }
    // hit: the chest and the neck whip with the push, the legs on the far side brace
    b.legFL.rotation.x -= Math.max(0, hz) * 0.22; b.legBL.rotation.x -= Math.max(0, hz) * 0.26; b.legFR.rotation.x += Math.max(0, -hz) * 0.22; b.legBR.rotation.x += Math.max(0, -hz) * 0.26;
    b.legBL.rotation.z += hx * 0.28; b.legBR.rotation.z += hx * 0.2; b.legFL.rotation.z += hx * 0.12; b.legFR.rotation.z += hx * 0.18;
    b.hips.rotation.y += hz * 0.08; b.chest.rotation.y -= hz * 0.12;
    // breath: in the chest, not in the whole body
    b.chest.scale.set(1, 1 + br * 0.012 + a * 0.02, 1 + br * 0.024 + a * 0.03);
    b.chest.position.y += br * 0.006 * rest;
    // neck: proud curve. It drops for the charge, it pulls back and whips for the shot. It moves against the chest: the head stays level.
    const sway = Math.sin(t.p * 0.6), look = Math.sin(t.tm * 0.37) * Math.sin(t.tm * 0.11 + 2) * rest;
    const low = Math.min(1, a + s), n1 = melee ? -low * 0.5 : shot ? a * 0.28 - s * 0.45 + fol * 0.12 : rear ? a * 0.1 - s * 0.2 : 0;
    const rip = Math.sin(t.tm * 5.5), nod = Math.sin(t.w * 2 + 0.6) * mv, cy = b.chest.rotation.y;
    b.neck1.rotation.z = sway * 0.03 + n1 + h * 0.14 - hx * 0.3 + nod * 0.035 + 0.05 * loadF * mv - spd * mv * 0.1 - u * (0.36 + rip * 0.02);
    b.neck2.rotation.z = -sway * 0.03 + n1 * 0.7 + h * 0.08 - hx * 0.15 - nod * 0.02 - u * 0.2;
    b.head.rotation.z = sway * 0.03 + (melee ? -low * 0.42 : shot ? a * 0.3 - s * 0.6 - fol * 0.2 : rear ? -a * 0.15 : 0) - h * 0.2 + hx * 0.25 - nod * 0.03 + spd * mv * 0.08 - u * (0.12 - rip * 0.03);
    b.neck1.rotation.y = -cy * 0.45 - tn * 0.08 - hz * 0.25;
    b.neck2.rotation.y = t.lk * 0.15 * nu - cy * 0.3 - tn * 0.07 + look * 0.14 - hz * 0.2;
    b.head.rotation.y = t.lk * 0.35 * nu - cy * 0.25 + look * 0.3 + h * 0.2 * (hz ? 0 : 1) - hz * 0.3;
    b.head.rotation.x = h * 0.15 + hz * 0.2 + look * 0.05;
    // ears: quick twitches at random times. Tail: a flick now and then. The spring bones add the lag.
    const tw1 = cl((Math.sin(t.tm * 1.9) * Math.sin(t.tm * 0.7 + 1) - 0.55) * 4, 0, 1), tw2 = cl((Math.sin(t.tm * 2.3 + 2) * Math.sin(t.tm * 0.53) - 0.55) * 4, 0, 1);
    b.earL.rotation.y = tw1 * 0.5 + a * 0.5 + h * 0.6 - look * 0.2; b.earR.rotation.y = -(tw2 * 0.5 + a * 0.5 + h * 0.6 + look * 0.2);
    b.earL.rotation.x = -a * 0.2 - u * 0.5; b.earR.rotation.x = a * 0.2 + u * 0.5;
    const flick = cl((Math.sin(t.tm * 5.1) * Math.sin(t.tm * 0.83 + 0.5) - 0.35) * 2.5, 0, 1);
    b.tail.rotation.z = flick * 0.45 - a * 0.6 + h * 0.5 + u * 0.7 + spd * mv * 0.25;
    b.tail.rotation.y = Math.sin(t.tm * 9) * flick * 0.3;
    // antlers: 3 groups of drops on each side. They drift, they lag, they pull together for the charge, they open for the shield.
    const cz = melee ? Math.min(1, a + s * 0.6) : 0, open = (rear ? a * 0.45 + s * 0.3 : 0) + (shot ? s * 0.2 : 0) + t.gl * 0.06;
    const whip = shot ? a * 0.22 - s * 0.4 : 0;
    for (let i = 1; i <= 3; i++) {
      const L = b['ant' + i + 'L'], R = b['ant' + i + 'R'], dr = Math.sin(t.p * (0.5 + i * 0.2) + i * 1.7) * 0.02 * i, lag = whip + fol * 0.1 * i - cz * 0.2;
      L.rotation.z = dr + lag; R.rotation.z = Math.sin(t.p * (0.55 + i * 0.2) + i * 2.4) * 0.02 * i + lag;
      L.rotation.x = -cz * 0.2 + open * 0.3 + dr * 0.6; R.rotation.x = cz * 0.2 - open * 0.3 - dr * 0.6;
      const fl = Math.sin(t.tm * (0.9 + i * 0.25) + i) * 0.012 * i;
      L.position.y += fl + open * 0.05; R.position.y += Math.sin(t.tm * (1.0 + i * 0.22) + i * 2) * 0.012 * i + open * 0.05;
      const sc = 1 - cz * 0.1 + s * 0.08 + open * 0.08;
      L.scale.setScalar(sc); R.scale.setScalar(sc);
      // ultimate: the antlers melt. Each section bends forward and a ripple runs from the base to the tips.
      const wv = Math.sin(t.tm * 5.5 - i * 1.3) * u;
      L.rotation.z -= u * (i === 1 ? 0.55 : 0.3) - wv * 0.1; R.rotation.z -= u * (i === 1 ? 0.55 : 0.3) - wv * 0.1;
      L.rotation.x += u * 0.1; R.rotation.x -= u * 0.1;
      if (i === 1) { L.scale.set(sc * (1 - u * 0.5), sc * (1 + u * (0.7 + wv * 0.08)), sc * (1 + u * 0.25)); R.scale.copy(L.scale); }
      else { L.scale.y *= 1 + wv * 0.12; R.scale.y *= 1 + wv * 0.12; }
    }
    // the pool: slow ripple. It swells and pours forward in the ultimate.
    const pr = Math.sin(t.tm * 2.6);
    P.pool.scale.set(1 + pr * 0.05 + u * 0.3 + a * 0.15, 1 - pr * 0.08 + t.gl * 0.3 + u * 0.25, 1 + pr * 0.04 + u * 0.15);
    P.pool.position.y += u * 0.01 + t.gl * 0.008;
    P.halo.scale.multiplyScalar(1 + pr * 0.06 + t.gl * 0.25 + a * 0.2 - u * 0.3);
    // drops fall from the antlers and form again
    for (let i = 0; i < 2; i++) for (const sd of ['L', 'R']) {
      const d = P['dr' + i + sd], f = (t.tm * (0.42 + i * 0.11 + u * 0.9) + i * 0.37 + (sd === 'L' ? 0 : 0.5)) % 1, g = Math.min(1, f * 5);
      d.position.y -= f * f * 0.75; d.scale.multiplyScalar(g * (f > 0.85 ? (1 - f) / 0.15 : 1)); d.scale.y *= 1 + f * 1.2;
      // a drop that falls stays behind when the stag moves or turns
      d.position.x -= f * f * cl((t.vf || 0) / 2.6, -1, 1) * 0.3; d.position.z -= f * f * (cl((t.vs || 0) / 2.6, -1, 1) * 0.3 + tn * 0.15);
    }
    const slosh = cl((t.af || 0) / 30, -1, 1) * 0.1 + t.sw * 0.05, sloshZ = cl((t.as || 0) / 30, -1, 1) * 0.1 + tn * 0.06;
    // free drops: slow orbit. Shot: they fly forward. Shield: they move to a dome around the body.
    const dome = rear ? Math.min(1, a + s) : 0;
    for (let i = 0; i < SAT.length; i++) {
      for (const sd of [1, -1]) {
        const p = P['sa' + i + (sd > 0 ? 'L' : 'R')], d = SAT[i], ph = t.tm * (1.1 + i * 0.17) * (1 + t.gl * 0.8) + i * 1.9 + sd;
        p.position.x += Math.cos(ph) * 0.04 - slosh * (1 + i * 0.3); p.position.y += Math.sin(ph * 1.3) * 0.035; p.position.z += Math.sin(ph) * 0.04 * sd - sloshZ * (1 + i * 0.3);
        if (shot) { p.position.x += s * (0.4 + i * 0.09) - a * 0.1; p.position.y += s * (0.3 + i * 0.05) + a * 0.06; p.scale.multiplyScalar(1 + a * 0.8 + s * 0.6); }
        if (dome) {
          const q = (i + 0.5) / SAT.length * Math.PI + t.tm * 0.8, tx = 0.1 + Math.cos(q) * 0.8, ty = 1.35 + Math.sin(q * 2 + i) * 0.3, tz = Math.sin(q) * 0.75;
          p.position.x += (tx - d[0]) * dome; p.position.y += (ty - d[1]) * dome; p.position.z += (tz - d[2]) * dome * sd;
          p.scale.multiplyScalar(1 + dome * 1.6);
        }
        if (melee) { p.position.x += (0.9 - d[0]) * low * 0.5; p.position.z += (0.1 - d[2]) * low * 0.6 * sd; }
        // ultimate: the free drops are the front of the wave
        if (u > 0) { p.position.y += u * (0.12 + i * 0.05 + Math.sin(t.tm * 5.5 - i) * 0.04); p.position.x += u * 0.06 * (i % 3); p.scale.multiplyScalar(1 + u * 0.9); p.scale.x *= 1 - u * 0.4; }
      }
    }
    P.heart.scale.setScalar(1 + 0.06 * Math.sin(t.tm * 3.2) + a * 0.25 + t.gl * 0.2 + s * 0.2);
  }
};
