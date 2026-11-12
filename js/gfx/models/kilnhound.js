/* Kilnhound (Glazefang) - porcelain mastiff. Its ribcage is an iron grate with the furnace behind it. Ember / Stone.
   Heart piece: the furnace core. Maker's mark: a blue paw print in glaze on the left shoulder. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, flame, ball, cone, torus, rbox, blade, canvasTex } from '../geo.js';
import { A } from '../rig.js';

const WHITE = '#dfe4ea', CREAM = '#cdd5df', COBALT = '#1f47b8', NAVY = '#152a66', IRON = '#2b2a31', MAGMA = '#ff8a2a';
const IRONM = { col: '#3a3940', metal: 0.85, rough: 0.42, env: 0.9 };
const FANG = { col: '#d9dde4', metal: 0.6, rough: 0.22, env: 1.1 };
const SPIKE = { col: '#c9ced6', metal: 1, rough: 0.25, env: 1.2 };
const FIRE = { col: '#ff7a1a', glow: '#ff6a10', glowK: 2.6, noOut: true };
const HOT = { col: '#ffb040', glow: '#ff9a20', glowK: 3, noOut: true };
const ORB = { col: '#ffe9a0', glow: '#ffd060', glowK: 3.5, noOut: true };   // heart piece: the brightest glow
const EMBER = { col: '#ffc060', glow: '#ff8a20', glowK: 2.3, noOut: true };
const PORC = { col: '#dfe4ea', rough: 0.2, env: 1 }, COBM = { col: '#2148b4', rough: 0.22, env: 1 };
const LEGS = ['legFL', 'legFR', 'legBL', 'legBR'];
const D = Math.PI / 180;
// collar: centre, axis along the neck, radius. Grate door: hinge line on the barrel.
const CC = [0.75, 1.14, 0], CU = [-0.423, 0.906, 0], CA = [0.906, 0.423, 0], CR = 0.35;
const GR = 0.392, GHY = 0.86 + GR * Math.sin(30 * D), GHZ = GR * Math.cos(30 * D);
// shards of the shell for the ultimate: place on the body, direction of flight
const SH = [[[0.5, 1.02, 0.46], [0.35, 0.55, 0.76]], [[-0.1, 1.2, 0.3], [0.05, 0.85, 0.52]], [[-0.66, 0.92, 0.44], [-0.5, 0.42, 0.76]], [[0.76, 0.72, 0.3], [0.72, -0.05, 0.69]]];
let pawTex = null;
const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v;
// legs: upper bone, lower bone, paw bone, front (1) or back (0), side (+1 = L), place in the walk cycle (4 beats), place in the trot
const LEG = [['legFL', 'lowFL', 'pawFL', 1, 1, 0.75, 0.5], ['legFR', 'lowFR', 'pawFR', 1, -1, 0.27, 0.02], ['legBL', 'lowBL', 'pawBL', 0, 1, 0, 0], ['legBR', 'lowBR', 'pawBR', 0, -1, 0.52, 0.52]];
const ST = [{}, {}, {}, {}];
// One leg in the step cycle. q = place in the cycle (0..1), duty = part of the cycle with the paw on the ground.
// f = place of the paw along the step (+1 front, -1 back). l = lift (0..1): fast up, reach forward, plant. land = load just after the paw lands.
function stride(q, duty, o) {
  q -= Math.floor(q);
  if (q < duty) { o.f = 1 - 2 * q / duty; o.l = 0; o.land = q < 0.2 ? Math.sin(Math.PI * q / 0.2) : 0; }
  else { const r = (q - duty) / (1 - duty); o.f = -1 + 2 * r * r * (3 - 2 * r); o.l = Math.sin(Math.PI * Math.pow(r, 0.72)); o.land = 0; }
  return o;
}

function join(gs) {
  return mergeGeometries(gs.map(g => {
    g = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    return g;
  }));
}
// closed chain of oval links through pts
function chainGeo(pts, step, R, r) {
  const cv = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), true), n = Math.round(cv.getLength() / step / 2) * 2, out = [];
  const t = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), ax = new THREE.Vector3(CA[0], CA[1], CA[2]);
  for (let i = 0; i < n; i++) {
    const g = torus(R, r, 10, 6), p = cv.getPointAt(i / n);
    g.scale(1.4, 1, 1);
    cv.getTangentAt(i / n, t); u.crossVectors(ax, t).normalize(); v.crossVectors(t, u).normalize();
    if (i % 2) m.makeBasis(t, u, v); else m.makeBasis(t, v, u.clone().negate());
    m.setPosition(p); g.applyMatrix4(m); out.push(g);
  }
  return join(out);
}
// kiln-door key: it hangs from the origin
function keyGeo() {
  const loop = torus(0.032, 0.011, 10, 5); loop.rotateY(Math.PI / 2); loop.translate(0, -0.02, 0);
  const bow = torus(0.062, 0.018, 16, 6); bow.translate(0, -0.11, 0);
  const shaft = new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8); shaft.translate(0, -0.275, 0);
  const ring = torus(0.026, 0.011, 10, 5); ring.rotateX(Math.PI / 2); ring.translate(0, -0.19, 0);
  const b1 = rbox(0.075, 0.04, 0.024); b1.translate(0.045, -0.365, 0);
  const b2 = rbox(0.05, 0.03, 0.024); b2.translate(0.035, -0.315, 0);
  return join([loop, bow, shaft, ring, b1, b2]);
}
// one door of the chest grate: 3 bars on the curve of the barrel, 3 rails. The hinge is at the origin.
function grateGeo() {
  const pt = (x, th) => [x, 0.86 + GR * Math.sin(th * D) - GHY, GR * Math.cos(th * D) - GHZ], out = [];
  for (const x of [-0.25, -0.1, 0.05]) out.push(tube([30, 13, -4, -21, -38].map(th => pt(x, th)), [0.027, 0.027, 0.027, 0.027, 0.027], { ring: 7 }));
  for (const [th, r] of [[30, 0.034], [-4, 0.024], [-38, 0.03]]) { const m = pt(-0.1, th); m[2] += 0.006; out.push(tube([pt(0.15, th), m, pt(-0.35, th)], [r, r, r], { ring: 7 })); }
  const latch = rbox(0.07, 0.075, 0.04), q = pt(-0.1, -38); latch.translate(q[0], q[1] - 0.01, q[2] + 0.012); out.push(latch);
  for (const x of [0.1, -0.3]) { const kn = new THREE.CylinderGeometry(0.046, 0.046, 0.07, 8); kn.rotateZ(Math.PI / 2); kn.translate(x, 0, 0); out.push(kn); }
  return join(out);
}
// maker's mark: a domed glaze seal with a paw print
function sealGeo(R, th) {
  const g = new THREE.SphereGeometry(R, 20, 5, 0, Math.PI * 2, 0, th), P = g.getAttribute('position'), U = g.getAttribute('uv'), rc = R * Math.sin(th);
  g.translate(0, -R * Math.cos(th), 0);
  for (let i = 0; i < P.count; i++) U.setXY(i, 0.5 + P.getX(i) / (2 * rc), 0.5 - P.getZ(i) / (2 * rc));
  g.rotateX(Math.PI / 2);   // the dome points to +Z; the top of the picture points to +Y
  return g;
}

// a copy of the geometry that points along d (the geometry points to +Y)
function aim(geo, d) {
  const g = geo.clone();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]).normalize()));
  return g;
}

export default {
  id: 'kilnhound', rim: '#ffb070', focus: 'core', top: 1.62, rough: 0.34,
  // loose parts that follow the body late: tail, ears, collar chain, key, flames
  dyn: [
    { b: ['tail1', 'tail2', 'tail3'], k: 58, d: 6, amt: 1, drag: 2 },
    { b: ['earL'], k: 70, d: 7, amt: 0.8, drag: 2, dir: [-0.1, -1, 0.2] }, { b: ['earR'], k: 70, d: 7, amt: 0.8, drag: 2, dir: [-0.1, -1, -0.2] },
    { b: ['collar'], k: 60, d: 5, amt: 0.4, drag: 1, dir: [0, -1, 0] }, { b: ['key'], k: 26, d: 3.2, amt: 1, drag: 1.5, dir: [0, -1, 0] },
    { b: ['flL'], k: 40, d: 5, drag: 5, amt: 0.9, dir: [0, 0.85, 0.5] }, { b: ['flR'], k: 40, d: 5, drag: 5, amt: 0.9, dir: [0, 0.85, -0.5] },
    { b: ['fsL'], k: 36, d: 5, drag: 5, amt: 0.9, dir: [0.1, 0.8, 0.6] }, { b: ['fsR'], k: 36, d: 5, drag: 5, amt: 0.9, dir: [0.1, 0.8, -0.6] },
    { b: ['ftL'], k: 36, d: 5, drag: 5, amt: 0.9, dir: [-0.1, 0.8, 0.6] }, { b: ['ftR'], k: 36, d: 5, drag: 5, amt: 0.9, dir: [-0.1, 0.8, -0.6] },
    { b: ['tip'], k: 34, d: 5, drag: 5, amt: 1, dir: [-0.2, 1, 0] }
  ],
  rig: { head: 'head', neck: ['neck'] },
  opts: { cell: 0.028, mottle: 0.05, mottleF: 13 },
  build(S) {
    // spine: body (the rigid furnace barrel), chest in front, hips behind. Legs: upper, lower, paw.
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.88, 0]).bone('chest', 'body', [0.36, 0.92, 0]).bone('hips', 'body', [-0.4, 0.9, 0])
      .bone('neck', 'chest', [0.6, 1.07, 0]).bone('head', 'neck', [0.86, 1.2, 0]).bone('jaw', 'head', [0.96, 1.0, 0])
      .bone('earL', 'head', [0.82, 1.46, 0.25], { m: 1 })
      .bone('legFL', 'chest', [0.5, 0.72, 0.3], { m: 1 }).bone('lowFL', 'legFL', [0.56, 0.42, 0.33], { m: 1 }).bone('pawFL', 'lowFL', [0.55, 0.15, 0.33], { m: 1 })
      .bone('legBL', 'hips', [-0.62, 0.72, 0.27], { m: 1 }).bone('lowBL', 'legBL', [-0.48, 0.43, 0.31], { m: 1 }).bone('pawBL', 'lowBL', [-0.7, 0.15, 0.31], { m: 1 })
      .bone('tail1', 'hips', [-0.86, 1.08, 0]).bone('tail2', 'tail1', [-1.04, 1.2, 0]).bone('tail3', 'tail2', [-1.11, 1.34, 0]).bone('core', 'body', [-0.1, 0.82, 0]);

    const G = { gloss: 0.75 }, GM = { m: 1, gloss: 0.75 }, PL = { col: COBALT, gloss: 0.8, k: 0.022 }, FE = { col: IRON, metal: 0.9, gloss: 0.35, k: 0.016 };
    S.color(WHITE);
    // torso: deep chest, barrel, hips. Then the furnace window through the ribs.
    S.ell('chest', [0.45, 0.9, 0], [0.4, 0.43, 0.42], G);
    S.cap('body', [0.2, 0.86, 0], [-0.4, 0.86, 0], 0.375, 0.355, G);
    S.ell('hips', [-0.58, 0.87, 0], [0.34, 0.36, 0.36], G);
    S.ell('chest', [0.72, 0.8, 0], [0.2, 0.27, 0.27], G);
    S.box('body', [-0.1, 0.82, 0], [0.24, 0.21, 0.7], 0.1, { sub: 1, col: '#ff7a24', glow: 2.4, k: 0.03 });
    // brazier: iron pan, two iron hoops, coals
    S.ell('body', [-0.1, 0.54, 0], [0.38, 0.1, 0.33], FE);
    S.tor('body', [0.17, 0.86, 0], 0.38, 0.052, Object.assign({ rot: [0, 0, 90] }, FE));
    S.tor('body', [-0.37, 0.86, 0], 0.362, 0.052, Object.assign({ rot: [0, 0, 90] }, FE));
    for (const [x, z, r] of [[-0.27, 0.1, 0.075], [-0.22, -0.13, 0.06], [0.07, 0.12, 0.065], [0.05, -0.1, 0.07], [-0.1, 0.2, 0.05], [-0.1, -0.22, 0.05]])
      S.ell('body', [x, 0.63, z], [r, r * 0.8, r], { col: '#5a2412', glow: 1.5, k: 0.02 });
    // ridge plates on the back
    for (const [x, y] of [[0.5, 1.31], [0.27, 1.265], [0.03, 1.24], [-0.21, 1.225], [-0.45, 1.225], [-0.68, 1.19]])
      S.box(x > 0.4 ? 'chest' : x < -0.4 ? 'hips' : 'body', [x, y, 0], [0.095, 0.045, 0.15 - Math.abs(x + 0.1) * 0.05], 0.035, PL);
    // front legs: shoulder, forearm, elbow plate, anklet, paw, toes
    S.ell('legFL', [0.5, 0.9, 0.3], [0.24, 0.3, 0.2], GM);
    S.cap('legFL', [0.51, 0.72, 0.32], [0.56, 0.42, 0.33], 0.185, 0.13, GM);
    S.cap('lowFL', [0.56, 0.42, 0.33], [0.55, 0.14, 0.33], 0.12, 0.115, GM);
    S.box('legFL', [0.45, 0.5, 0.33], [0.06, 0.1, 0.1], 0.04, { m: 1, col: COBALT, gloss: 0.8, k: 0.022, rot: [0, 0, 10] });
    S.tor('lowFL', [0.55, 0.27, 0.33], 0.12, 0.042, Object.assign({ m: 1 }, FE));
    S.ell('pawFL', [0.62, 0.09, 0.33], [0.2, 0.095, 0.17], { m: 1, col: COBALT, gloss: 0.8, k: 0.03 });
    for (let i = -1; i <= 1; i++) S.ell('pawFL', [0.79 - Math.abs(i) * 0.03, 0.065, 0.33 + i * 0.105], [0.065, 0.058, 0.052], { m: 1, col: WHITE, gloss: 0.8, k: 0.014 });
    // back legs: haunch, stifle, hock, anklet, paw, toes
    S.ell('legBL', [-0.64, 0.78, 0.27], [0.25, 0.31, 0.2], GM);
    S.cap('legBL', [-0.58, 0.6, 0.3], [-0.48, 0.43, 0.31], 0.165, 0.125, GM);
    S.cap('lowBL', [-0.48, 0.43, 0.31], [-0.72, 0.25, 0.31], 0.115, 0.1, GM);
    S.cap('lowBL', [-0.72, 0.25, 0.31], [-0.68, 0.12, 0.31], 0.1, 0.1, GM);
    S.tor('lowBL', [-0.705, 0.22, 0.31], 0.1, 0.04, Object.assign({ m: 1, rot: [0, 0, -18] }, FE));
    S.ell('pawBL', [-0.61, 0.09, 0.31], [0.2, 0.095, 0.17], { m: 1, col: COBALT, gloss: 0.8, k: 0.03 });
    for (let i = -1; i <= 1; i++) S.ell('pawBL', [-0.44 - Math.abs(i) * 0.03, 0.065, 0.31 + i * 0.105], [0.065, 0.058, 0.052], { m: 1, col: WHITE, gloss: 0.8, k: 0.014 });
    // neck. The chain collar is a rigid part.
    S.cap('neck', [0.6, 1.07, 0], [0.88, 1.2, 0], 0.31, 0.28, G);
    // head: skull, square muzzle, jowls, nose, brow, cheeks, jaw with a molten tongue
    S.ell('head', [0.92, 1.24, 0], [0.31, 0.29, 0.32], G);
    S.box('head', [1.2, 1.1, 0], [0.2, 0.165, 0.2], 0.1, { gloss: 0.75, k: 0.05 });
    S.ell('head', [1.17, 0.99, 0.16], [0.18, 0.14, 0.09], { m: 1, col: CREAM, gloss: 0.75, k: 0.04 });
    S.ell('head', [1.41, 1.17, 0], [0.06, 0.075, 0.115], { col: IRON, gloss: 0.85, k: 0.03 });
    S.ell('head', [1.465, 1.18, 0.052], [0.04, 0.03, 0.026], { m: 1, sub: 1, col: '#ffb050', glow: 2.2, k: 0.012 });
    S.cap('head', [0.78, 1.5, 0], [1.04, 1.485, 0], 0.075, 0.06, { gloss: 0.75, k: 0.04 });
    S.cap('head', [1.12, 1.425, 0.075], [1.19, 1.375, 0.26], 0.06, 0.046, { m: 1, gloss: 0.75, k: 0.03 });
    S.cap('head', [1.16, 1.4, 0], [1.2, 1.3, 0], 0.035, 0.03, { sub: 1, col: NAVY, k: 0.02 });
    S.ell('head', [0.9, 1.16, 0.29], [0.13, 0.15, 0.08], { m: 1, gloss: 0.75, k: 0.05 });
    S.cap('head', [1.27, 1.275, 0], [1.37, 1.25, 0], 0.07, 0.06, { gloss: 0.75, k: 0.03 });
    S.ell('jaw', [1.2, 0.88, 0], [0.27, 0.09, 0.21], { gloss: 0.75, k: 0.02 });
    S.ell('jaw', [1.37, 0.82, 0], [0.09, 0.05, 0.14], { col: COBALT, gloss: 0.8, k: 0.03 });
    S.box('jaw', [1.28, 0.957, 0], [0.22, 0.03, 0.27], 0.02, { sub: 1, col: '#ff8a2a', glow: 2.2, k: 0.014 });
    S.ell('jaw', [1.16, 0.925, 0], [0.19, 0.04, 0.12], { col: MAGMA, glow: 2.3, k: 0.02 });
    // hanging ears
    S.ell('earL', [0.82, 1.3, 0.355], [0.12, 0.18, 0.05], { m: 1, rot: [16, 0, 8], col: COBALT, gloss: 0.8, k: 0.03 });
    // tail with an iron band and an ember tip
    S.tube(['tail1', 'tail2', 'tail3'], [[-0.86, 1.08, 0], [-1.04, 1.2, 0], [-1.11, 1.34, 0], [-1.135, 1.42, 0]], [0.105, 0.082, 0.066, 0.055], G);
    S.tor('tail1', [-0.96, 1.15, 0], 0.085, 0.036, Object.assign({ rot: [0, 0, 56] }, FE));
    S.ell('tail3', [-1.14, 1.46, 0], 0.075, { col: MAGMA, glow: 2.4, k: 0.03 });
    // chips: places where a piece of porcelain broke off and the magma shows
    for (const [bn, x, y, z, r] of [['legFL', 0.62, 0.9, 0.5, 0.07], ['legBL', -0.76, 0.72, 0.46, 0.065], ['body', -0.8, 1.14, 0.2, 0.06], ['head', 0.82, 1.4, 0.27, 0.05], ['chest', 0.88, 0.94, 0.3, 0.055]])
      S.ell(bn, [x, y, z], r, { m: 1, sub: 1, col: '#ff8a26', glow: 2.4, k: 0.02 });

    // --- paint: cobalt patterns ----------------------------------------------------
    const P = (col, o) => Object.assign({ paint: 1, col, cb: 0.014, gloss: 0.8 }, o);
    // medallion on the shoulder and on the haunch: discs through the side, with a ring of dots
    for (const [bn, x, y, r] of [['legFL', 0.48, 0.97, 0.15], ['legBL', -0.64, 0.86, 0.16]]) {
      S.cap(bn, [x, y, 0.3], [x, y, 0.62], r, r, P(COBALT, { m: 1 }));
      S.cap(bn, [x, y, 0.3], [x, y, 0.62], r - 0.04, r - 0.04, P(WHITE, { m: 1 }));
      S.cap(bn, [x, y, 0.3], [x, y, 0.62], 0.05, 0.05, P(COBALT, { m: 1 }));
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5, px = x + Math.cos(a) * (r + 0.07), py = y + Math.sin(a) * (r + 0.07); S.cap(bn, [px, py, 0.25], [px, py, 0.62], 0.028, 0.028, P(COBALT, { m: 1 })); }
    }
    // chest medallion, blaze on the face, leg bands, tail band, dots beside the ridge
    S.cap('chest', [0.7, 0.76, 0], [1.1, 0.76, 0], 0.16, 0.16, P(COBALT));
    S.cap('chest', [0.7, 0.76, 0], [1.1, 0.76, 0], 0.115, 0.115, P(WHITE));
    S.cap('chest', [0.7, 0.76, 0], [1.1, 0.76, 0], 0.055, 0.055, P(COBALT));
    S.ell('head', [1.13, 1.35, 0.21], [0.13, 0.1, 0.13], P(COBALT, { m: 1, cb: 0.02 }));
    S.ell('head', [1.3, 1.26, 0], [0.13, 0.1, 0.05], P(COBALT, { cb: 0.02 }));
    S.cap('head', [0.96, 1.3, 0], [0.96, 1.7, 0], 0.1, 0.1, P(COBALT));
    S.cap('head', [0.96, 1.3, 0], [0.96, 1.7, 0], 0.062, 0.062, P(WHITE));
    S.cap('head', [0.96, 1.3, 0], [0.96, 1.7, 0], 0.026, 0.026, P(COBALT));
    for (const [y, z] of [[1.07, 0.1], [1.02, 0.155], [1.11, 0.165]]) S.cap('head', [1.3, y, z], [1.5, y, z], 0.021, 0.021, P(NAVY, { m: 1 }));
    S.tor('legFL', [0.53, 0.6, 0.325], 0.165, 0.03, P(COBALT, { m: 1, rot: [0, 0, -8] }));
    S.tor('legFL', [0.545, 0.51, 0.33], 0.145, 0.022, P(NAVY, { m: 1, rot: [0, 0, -8] }));
    S.tor('legBL', [-0.52, 0.5, 0.305], 0.14, 0.03, P(COBALT, { m: 1, rot: [0, 0, 30] }));
    S.tor('tail2', [-1.09, 1.3, 0], 0.07, 0.03, P(COBALT, { rot: [0, 0, 28] }));
    for (const x of [0.39, 0.15, -0.09, -0.33, -0.565]) S.cap('body', [x, 1.0, 0.21], [x, 1.4, 0.21], 0.045, 0.045, P(COBALT, { m: 1 }));
    S.cap('neck', [0.58, 1.1, 0.1], [0.58, 1.6, 0.1], 0.04, 0.04, P(COBALT, { m: 1 }));
    // --- paint: magma veins. Each vein is a thin slab that cuts through the porcelain.
    const V = (bn, c, half, rot, o) => S.box(bn, c, half.map(v => v < 0.03 ? 0.029 : v), 0.005, Object.assign({ paint: 1, col: '#ff5c0c', glow: 2.1, cb: 0.011, rot, gloss: 0 }, o));
    V('legFL', [0.42, 0.9, 0.42], [0.021, 0.26, 0.16], [0, 0, 30], { m: 1 });
    V('legFL', [0.62, 0.8, 0.42], [0.2, 0.021, 0.16], [0, 0, -26], { m: 1 });
    V('legFL', [0.63, 0.56, 0.36], [0.021, 0.13, 0.2], [0, 0, -18], { m: 1 });
    V('legBL', [-0.58, 0.82, 0.4], [0.021, 0.3, 0.16], [0, 0, -24], { m: 1 });
    V('legBL', [-0.78, 0.72, 0.4], [0.16, 0.021, 0.16], [0, 0, 32], { m: 1 });
    V('legBL', [-0.5, 0.62, 0.4], [0.1, 0.021, 0.16], [0, 0, -40], { m: 1 });
    V('chest', [0.84, 0.72, 0.2], [0.2, 0.021, 0.12], [0, 30, 40], { m: 1 });
    V('body', [-0.8, 1.02, 0], [0.021, 0.22, 0.24], [0, 0, 28]);
    V('head', [0.99, 1.3, 0.22], [0.021, 0.2, 0.14], [0, 0, 36], { m: 1 });
    V('head', [0.86, 1.22, 0.24], [0.16, 0.021, 0.14], [0, 0, -14], { m: 1 });
    V('head', [1.27, 1.08, 0.16], [0.021, 0.13, 0.1], [0, 0, -30], { m: 1 });
    V('jaw', [1.14, 0.85, 0], [0.021, 0.1, 0.3], [0, 0, 24]);
    V('neck', [0.66, 1.2, 0.2], [0.021, 0.2, 0.16], [0, 0, -30], { m: 1 });
    V('chest', [0.42, 1.2, 0.16], [0.16, 0.021, 0.2], [0, 0, 20], { m: 1 });
    V('tail1', [-0.95, 1.14, 0], [0.021, 0.1, 0.2], [0, 0, 60]);
    V('legBL', [-0.6, 0.34, 0.33], [0.021, 0.1, 0.2], [0, 0, 40], { m: 1 });
    // heat on the hoops near the fire
    // (no soft heat paint here: a soft painted patch becomes a blur, because colour is stored for each vertex)
    // soot above the furnace window, cobalt stripes on the muzzle and the tail

    S.tor('tail1', [-0.9, 1.11, 0], 0.1, 0.022, P(NAVY, { rot: [0, 0, 56] }));
    S.tor('head', [1.22, 1.1, 0], 0.2, 0.022, P(COBALT, { rot: [0, 0, 82] }));

    // --- rigid parts ---------------------------------------------------------------
    // chest grate: one hinged door on each side of the furnace
    S.add('body', grateGeo(), IRONM, { p: [0, GHY, GHZ], m: 1, name: 'grateL' });
    // furnace core and flames
    S.add('core', ball(0.15, 20, 14), ORB, { p: [-0.1, 0.82, 0], name: 'orb' });
    S.add('core', flame(0.085, 0.3), HOT, { p: [0.06, 0.7, 0], r: [0, 0, -14], name: 'fi0' });
    S.add('core', flame(0.085, 0.3), HOT, { p: [-0.26, 0.7, 0], r: [0, 0, 14], name: 'fi1' });
    S.add('core', flame(0.07, 0.24), HOT, { p: [-0.1, 0.7, 0.15], r: [10, 0, 0], name: 'fi2' });
    S.add('core', flame(0.07, 0.24), HOT, { p: [-0.1, 0.7, -0.15], r: [-10, 0, 0], name: 'fi3' });
    S.add('body', flame(0.13, 0.7), FIRE, { p: [-0.1, 0.78, 0.17], r: [27, 0, 0], name: 'flL', m: 1 });
    S.add('body', flame(0.085, 0.42), FIRE, { p: [0.04, 0.8, 0.2], r: [38, 0, -10], name: 'fsL', m: 1 });
    S.add('body', flame(0.085, 0.4), FIRE, { p: [-0.25, 0.8, 0.2], r: [38, 0, 12], name: 'ftL', m: 1 });
    // chain collar. The front of the chain hangs low. The kiln-door key hangs from it.
    const cp = [];
    for (let i = 0; i < 16; i++) {
      const q = i / 16 * Math.PI * 2, cq = Math.cos(q), sg = Math.pow(Math.max(0, -cq), 3) * 0.075;
      cp.push([CR * cq * CU[0] + CA[0] * sg, CR * cq * CU[1] + CA[1] * sg, CR * Math.sin(q)]);   // relative to the centre of the collar
    }
    S.add('neck', chainGeo(cp, 0.112, 0.058, 0.021), IRONM, { p: CC, name: 'collar' });
    S.add('neck', keyGeo(), SPIKE, { p: [CC[0] - CR * CU[0] + CA[0] * 0.085, CC[1] - CR * CU[1] + CA[1] * 0.085 - 0.02, 0], r: [0, 35, 0], name: 'key' });
    // fangs: an underbite. Small flame at the tip of the tail.
    S.add('jaw', aim(cone(0.048, 0.2, 8), [-0.06, 1, 0.04]), FANG, { p: [1.41, 0.9, 0.16], m: 1 });
    S.add('jaw', aim(cone(0.032, 0.12, 8), [-0.04, 1, 0]), FANG, { p: [1.45, 0.91, 0.058], m: 1 });
    S.add('head', aim(cone(0.04, 0.15, 8), [0.1, -1, 0.1]), FANG, { p: [1.33, 0.97, 0.215], m: 1 });
    S.add('tail3', flame(0.06, 0.2), EMBER, { p: [-1.14, 1.48, 0], r: [0, 0, 14], name: 'tip' });
    // iron claws: 3 on each paw
    const claws = join([-1, 0, 1].map(i => aim(cone(0.024, 0.085, 6), [1, -0.45, i * 0.12]).translate(0.835 - Math.abs(i) * 0.03, 0.075, i * 0.105)));
    S.add('pawFL', claws, IRONM, { p: [0, 0, 0.33], m: 1 });
    S.add('pawBL', claws, IRONM, { p: [-1.23, 0, 0.31], m: 1 });
    // maker's mark: blue paw print in glaze on the left shoulder
    pawTex = pawTex || canvasTex(128, 128, (g, W) => {
      g.fillStyle = '#dde2e8'; g.fillRect(0, 0, W, W);
      g.strokeStyle = '#1f47b8'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 57, 0, 7); g.stroke();
      g.fillStyle = '#1f47b8';
      g.beginPath(); g.ellipse(64, 82, 25, 20, 0, 0, 7); g.fill();
      for (const [x, y, rx, ry, a] of [[30, 56, 9, 12, -0.5], [50, 37, 10, 13, -0.15], [78, 37, 10, 13, 0.15], [98, 56, 9, 12, 0.5]]) { g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, 7); g.fill(); }
    });
    S.add('legFL', sealGeo(0.27, 0.42), { col: '#e4e6ea', map: pawTex, rough: 0.16, env: 1, noOut: true }, { p: [0.48, 0.97, 0.497], r: [-9, -4, 0], name: 'mark' });
    // shards of the shell: they show only in the ultimate
    const sg0 = blade([[0, 0.13], [0.1, 0.03], [0.05, -0.11], [-0.09, -0.05]], 0.034, { bevel: 0.009 }), sg1 = blade([[-0.02, 0.15], [0.09, -0.06], [-0.08, -0.09]], 0.034, { bevel: 0.009 });
    SH.forEach((q, i) => S.add('body', i % 2 ? sg1 : sg0, i === 1 || i === 2 ? COBM : PORC, { p: q[0], r: [i * 31, i * 47, i * 60], m: 1, name: 'sh' + i + 'L' }));
    // eyes: steady and calm, not angry
    S.eye('head', [1.1, 1.32, 0.2], 0.086, { dir: [0.78, 0.1, 0.6], iris: '#ff8a1e', iris2: '#ffe27a', sclera: '#fff1d0', lid: COBALT, open: 37, tilt: -9, glow: 0.7, size: 50, m: 1 });
  },
  anim(b, t, c) {
    // u: the ultimate (Vesuvian Shatter). It takes the place of the wind-up and the strike of the other poses.
    const u = A.ease(t.u || 0), nu = 1 - u, us = u * t.s, howl = u * (1 - 0.35 * t.s);
    const br = Math.sin(t.p), a = t.a * nu, s = t.s * nu, h = t.h, k = t.k, slam = k === 'slam', buff = k === 'buff', bite = !slam && !buff;
    const P = c.parts, tm = t.tm, mv = t.mv, throb = u * (0.5 + 0.5 * Math.sin(tm * 9)), shake = u * Math.sin(tm * 47);
    const ov = Math.sin(Math.min(1, s) * Math.PI);   // follow-through: 0 at the hit, a peak a moment later, 0 at the end
    // memory between frames: it pants after a run
    const M = c.kh || (c.kh = { tm, pant: 0 }), dt = cl(tm - M.tm, 0, 0.1); M.tm = tm;
    M.pant = cl(M.pant + (mv > 0.6 ? 0.5 : -0.28) * dt, 0, 1);
    const pant = M.pant * nu * (1 - a), puff = Math.sin(tm * 11);
    // motion of the body: F = forward part of the step, Sd = side part, trot = 0 for the 4-beat walk and 1 for the trot
    const sp = Math.hypot(t.vf, t.vs), spd = Math.min(1, sp / 2.6), tn = t.tn, noV = cl(1 - sp / 0.3 - Math.abs(tn) / 0.2, 0, 1);
    const F = cl(t.vf / 2.2, -1, 1) + noV, Sd = cl(t.vs / 2.2, -1, 1), trot = A.ease((spd - 0.5) / 0.35), duty = 0.68 - 0.17 * trot;
    const hx = t.hx || t.hz ? t.hx : -1, hb = h * -hx, hsd = h * t.hz;   // hb: pushed to the rear. hsd: pushed to the L side.
    // rest: the weight moves slowly from side to side, the head looks round
    const idle = (1 - mv) * nu * (1 - a), sway = Math.sin(tm * 0.7) * Math.sin(tm * 0.23 + 1) * idle, look = Math.sin(tm * 0.31 + 2) * Math.sin(tm * 0.83) * idle;

    // legs: each leg has its own place in the cycle. The paw lifts fast, reaches forward, plants and pushes back.
    let yawF = 0, yawB = 0, rollF = 0, rollB = 0, landF = 0, landB = 0;
    const amt = mv * cl(Math.abs(F) + Math.abs(Sd) + Math.abs(tn), 0.35, 1);
    for (let i = 0; i < 4; i++) {
      const L = LEG[i], up = b[L[0]], lo = b[L[1]], fr = L[3], sd = L[4], o = stride(t.w / TAU + L[5] + (L[6] - L[5]) * trot, duty, ST[i]);
      const inner = 1 - 0.3 * tn * sd * spd;   // the legs on the inner side of a turn take shorter steps
      const th = o.f * F * inner * (0.44 + 0.14 * trot) * mv, lat = o.f * (Sd * 0.9 + tn * (fr ? 0.6 : -0.6) * (1 - 0.6 * spd)) * 0.3 * mv, lift = o.l * amt;
      up.rotation.z += th + lift * (fr ? 0.22 : 0.3);
      up.rotation.x -= lat;
      lo.rotation.z -= lift * (fr ? 1.0 : 0.85);
      up.position.y -= 0.7 * (1 - Math.cos(th)) * (1 - o.l);   // the paw stays on the ground at the two ends of the step
      if (fr) { yawF += o.f * sd; rollF += o.l * sd; landF += o.land; } else { yawB += o.f * sd; rollB += o.l * sd; landB += o.land; }
    }
    // the body answers the legs: shoulders and hips turn against each other, the chest drops when a front paw lands
    const stepK = mv * cl(Math.abs(F), 0, 1), cy = yawF * 0.05 * stepK, dipF = landF * 0.024 * amt * (0.6 + 0.4 * spd), dipB = landB * 0.016 * amt;
    const crouch = a * (slam ? -0.03 : buff ? 0.02 : 0.09) + (slam ? s * 0.11 : 0) + h * 0.03 + cl(-t.va * 0.012, 0, 0.07);
    b.body.position.y += br * 0.005 - crouch - u * 0.012;
    b.body.position.x += (bite ? s * 0.34 - a * 0.15 : slam ? -a * 0.05 : 0) - hb * 0.06 + shake * 0.006;
    b.body.rotation.z += hb * 0.07 + (bite ? a * 0.07 - s * 0.1 : slam ? a * 0.1 - s * 0.08 : 0) + u * 0.05;
    b.body.rotation.x += hsd * 0.06;
    // ultimate: the body swells and throbs; one more push when the shell breaks
    b.body.scale.setScalar(1 + (buff ? s * 0.07 + a * 0.012 * Math.sin(tm * 30) : 0) + u * 0.06 + throb * 0.014 + us * 0.07);
    b.chest.position.y -= dipF;
    b.chest.rotation.y += cy - tn * 0.16;
    b.chest.rotation.x += rollF * 0.04 * amt + sway * 0.035 + hsd * 0.1;
    b.chest.rotation.z += (slam ? a * 0.12 - s * 0.1 : 0) + u * 0.1 + hb * 0.08;
    b.chest.scale.setScalar(1 + br * 0.022 + pant * 0.014 * puff + a * (slam ? 0.09 : 0.03) + (slam ? s * 0.12 : 0) + u * 0.08 + throb * 0.02);
    b.hips.position.y -= dipB + (bite ? a * 0.05 : 0);
    b.hips.rotation.y += yawB * 0.055 * stepK + tn * 0.13;
    b.hips.rotation.x += rollB * 0.045 * amt - sway * 0.03;
    // legs fold when the body comes down (wind-up, landing, hit). Front: the elbow goes back. Back: the stifle goes forward.
    const fF = Math.sqrt(Math.max(0, crouch + dipF) / 0.3), fB = Math.sqrt(Math.max(0, crouch + dipB + (bite ? a * 0.05 : 0)) / 0.3), rise = Math.min(0, crouch) - u * 0.015;
    for (let i = 0; i < 4; i++) {
      const L = LEG[i], up = b[L[0]], lo = b[L[1]], fr = L[3], sd = L[4];
      if (fr) { up.rotation.z -= fF; lo.rotation.z += 2 * fF; } else { up.rotation.z += fB; lo.rotation.z -= 2 * fB; }
      up.position.y += rise;
      // hit: the legs brace against the push. Ultimate: all 4 legs braced, wide and stiff.
      up.rotation.z += (fr ? 0.12 : -0.25) * hb + (fr ? 0.2 : -0.2) * u;
      up.rotation.x -= sd * (u * 0.2 + Math.max(0, hsd * sd) * 0.3) + hsd * 0.08;
    }
    // legs: reach and push in the lunge, spread wide for the blast
    if (bite) { b.legFL.rotation.z += s * 0.55 - a * 0.2; b.legFR.rotation.z += s * 0.45 - a * 0.25; b.legBL.rotation.z += -s * 0.5 + a * 0.2; b.legBR.rotation.z += -s * 0.42 + a * 0.15; }
    if (slam) { const sq = a * 0.1 + s * 0.3; b.legFL.rotation.x -= sq; b.legFR.rotation.x += sq; b.legBL.rotation.x -= sq; b.legBR.rotation.x += sq; b.legFL.rotation.z += s * 0.2; b.legFR.rotation.z += s * 0.2; }
    // paws: flat on the ground when they stand; the toes hang when the paw is in the air
    for (let i = 0; i < 4; i++) {
      const L = LEG[i], up = b[L[0]], pw = b[L[2]];
      pw.rotation.z = -(up.rotation.z + b[L[1]].rotation.z) - ST[i].l * amt * 0.55;
      pw.rotation.x = -up.rotation.x;
    }
    // neck and head: low for the bite, a high howl for the blast and the harden. The head stays level when the shoulders turn.
    const hi = bite ? 0 : 1;
    b.neck.rotation.z = br * 0.02 + (hi ? a * 0.3 - s * 0.15 : -a * 0.22 + s * 0.3 - ov * 0.1) + hb * 0.17 + h * 0.04 + howl * 0.5 - landF * 0.02 * amt - pant * 0.05;
    b.neck.rotation.y = -tn * 0.1 - cy * 0.4 + look * 0.1;
    b.head.rotation.z = br * 0.03 + landF * 0.035 * amt + (hi ? a * 0.45 - s * 0.2 : -a * 0.25 + s * 0.3 + ov * 0.14) + hb * 0.24 + h * 0.05 + howl * (0.62 + 0.03 * Math.sin(tm * 13));
    b.head.rotation.y = t.lk * 0.28 * nu - hsd * 0.4 - cy * 0.6 + look * 0.24;
    b.head.rotation.x = hsd * 0.15 - rollF * 0.04 * amt - sway * 0.035 + Math.sin(tm * 0.19 + 4) * idle * 0.05 + shake * 0.015;
    if (bite) b.head.position.x += s * 0.1;
    // the jaw opens wide in the wind-up; it snaps shut when the strike value falls. It hangs open when the hound pants.
    b.jaw.rotation.z = -Math.min(0.95, 0.03 + Math.max(0, br) * 0.05 + pant * (0.17 + 0.05 * puff) + h * 0.3 + a * (bite ? 0.55 : 0.35) + s * 0.7 + u * (0.72 + 0.05 * Math.sin(tm * 26)));
    // ears hang (spring bones); they jump with each step and twitch now and then
    const tw = Math.pow(Math.max(0, Math.sin(tm * 0.9 + 1) * Math.sin(tm * 0.37)), 6) * idle;
    const ef = Math.sin(t.p * 0.7) * 0.04 + landF * 0.1 * amt + s * 0.5 + h * 0.4 + hi * a * 0.3 + u * (0.55 + 0.1 * Math.sin(tm * 17));
    b.earL.rotation.x = -ef - tw * 0.5; b.earR.rotation.x = ef + Math.pow(Math.max(0, Math.sin(tm * 0.7 + 3) * Math.sin(tm * 0.29)), 6) * idle * 0.5;
    b.earL.rotation.z = b.earR.rotation.z = -s * 0.3 + a * 0.15 - u * 0.5;
    // tail (spring chain): slow wag, stiff and high in the wind-up
    const wg = (1 - a) * nu * (1 - 0.6 * mv);
    b.tail1.rotation.y = Math.sin(t.p * 2.2) * 0.26 * wg; b.tail2.rotation.y = Math.sin(t.p * 2.2 - 0.8) * 0.3 * wg; b.tail3.rotation.y = Math.sin(t.p * 2.2 - 1.6) * 0.32 * wg;
    b.tail1.rotation.z = -a * 0.35 + s * 0.3 - h * 0.5 - u * 0.45 + mv * 0.12; b.tail2.rotation.z = -a * 0.2 - h * 0.3 - u * 0.3 + shake * 0.03 + mv * 0.1; b.tail3.rotation.z = -a * 0.1 - u * 0.1 + ov * 0.2;
    // furnace: the core turns and swells, the flames flicker (they lean with the motion as spring parts)
    const pw = 1 + a * (slam ? 0.9 : 0.4) + s * (slam ? 1.5 : 0.5) + t.gl * 0.35 + (buff ? s * 0.6 : 0) + u * 1.5 + us * 0.8 + spd * 0.25;
    b.core.rotation.y = tm * (1.4 + u * 4) + t.o;
    b.core.position.y += Math.sin(tm * 3.1) * 0.012;
    P.orb.scale.setScalar(1 + 0.05 * Math.sin(tm * 9) + (pw - 1) * 0.45);
    for (let i = 0; i < 4; i++) P['fi' + i].scale.set(1, (0.9 + pw * 0.25) * (1 + 0.22 * Math.sin(tm * (19 + i * 3.7) + i * 2)), 1);
    const fl = (n, q, ph, side) => {
      const f = P[n];
      f.scale.y *= (0.72 + pw * 0.28) * (1 + 0.16 * Math.sin(tm * q + ph)); f.scale.x *= 1 + 0.08 * Math.sin(tm * (q + 5) + ph) + u * 0.25;
      f.rotation.z += 0.06 * Math.sin(tm * 7 + ph); f.rotation.x += ((slam ? s * 0.5 : 0) + u * 0.35) * side;
    };
    fl('flL', 17, 0, 1); fl('flR', 19, 2, -1); fl('fsL', 23, 1, 1); fl('fsR', 21, 3, -1); fl('ftL', 25, 4, 1); fl('ftR', 22, 5, -1);
    P.tip.scale.setScalar(1 + 0.2 * Math.sin(tm * 21) + t.gl * 0.5 + a * 0.6 + u * 0.9);
    // chest grate: the doors rattle with the steps and the hits; they swing wide open in the ultimate
    const door = Math.max(0, br) * 0.03 + (landF + landB) * 0.035 * amt + h * 0.25 + (slam ? a * 0.2 + s * 0.7 : buff ? s * 0.3 : 0) + t.gl * 0.06 * (1 + Math.sin(tm * 12)) + u * (1.3 + 0.06 * Math.sin(tm * 21));
    P.grateL.rotation.x = -door; P.grateR.rotation.x = door;
    // collar and key: spring parts. They jump with a hit and a strike.
    P.collar.rotation.z += landF * 0.03 * amt - s * 0.1 + h * 0.12;
    P.key.rotation.z += -s * 0.5 + h * 0.3 - u * 0.5 + shake * 0.08;
    // shards: they leave the shell, hang in the heat and fly out when the shell breaks
    for (let i = 0; i < 4; i++) for (let sd = 1; sd >= -1; sd -= 2) {
      const sh = P['sh' + i + (sd > 0 ? 'L' : 'R')], d = SH[i][1], r = u * (0.2 + 0.05 * Math.sin(tm * 3 + i * 1.7)) + us * 0.55;
      sh.visible = u > 0.03;
      sh.position.x += d[0] * r; sh.position.y += d[1] * r; sh.position.z += d[2] * r * sd;
      sh.rotation.x += (tm * 1.3 + i) * u * sd; sh.rotation.y += (tm * 0.9 + i * 2) * u;
      sh.scale.multiplyScalar(Math.max(0.001, u * (1.5 - 0.4 * us)));
    }
  }
};
