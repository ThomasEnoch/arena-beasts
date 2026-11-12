/* Kilnhound - porcelain mastiff. Its ribcage is an iron brazier with a furnace core. Ember / Stone. */
import * as THREE from 'three';
import { tube, flame, ball, cone, torus } from '../geo.js';
import { A } from '../rig.js';

const WHITE = '#dfe4ea', CREAM = '#cdd5df', COBALT = '#1f47b8', NAVY = '#152a66', IRON = '#2b2a31', MAGMA = '#ff8a2a';
const IRONM = { col: '#3a3940', metal: 0.85, rough: 0.42, env: 0.9 };
const FANG = { col: '#d9dde4', metal: 0.6, rough: 0.22, env: 1.1 };
const SPIKE = { col: '#c9ced6', metal: 1, rough: 0.25, env: 1.2 };
const FIRE = { col: '#ff7a1a', glow: '#ff6a10', glowK: 3.2, noOut: true };
const HOT = { col: '#ffb040', glow: '#ff9a20', glowK: 3.6, noOut: true };
const ORB = { col: '#ffe9a0', glow: '#ffd060', glowK: 5, noOut: true };
const EMBER = { col: '#ffc060', glow: '#ff8a20', glowK: 3, noOut: true };
const LEGS = ['legFL', 'legFR', 'legBL', 'legBR'];

// a copy of the geometry that points along d (the geometry points to +Y)
function aim(geo, d) {
  const g = geo.clone();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]).normalize()));
  return g;
}

export default {
  id: 'kilnhound', rim: '#ffb070', focus: 'core', top: 1.62, rough: 0.34,
  opts: { cell: 0.028, mottle: 0.05, mottleF: 13 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.88, 0]).bone('chest', 'body', [0.36, 0.92, 0])
      .bone('neck', 'chest', [0.6, 1.07, 0]).bone('head', 'neck', [0.86, 1.2, 0]).bone('jaw', 'head', [0.96, 1.0, 0])
      .bone('earL', 'head', [0.82, 1.46, 0.25], { m: 1 })
      .bone('legFL', 'body', [0.5, 0.72, 0.3], { m: 1 }).bone('legBL', 'body', [-0.62, 0.72, 0.27], { m: 1 })
      .bone('tail1', 'body', [-0.86, 1.08, 0]).bone('tail2', 'tail1', [-1.04, 1.2, 0]).bone('core', 'body', [-0.1, 0.82, 0]);

    const G = { gloss: 0.75 }, GM = { m: 1, gloss: 0.75 }, PL = { col: COBALT, gloss: 0.8, k: 0.022 }, FE = { col: IRON, metal: 0.9, gloss: 0.35, k: 0.016 };
    S.color(WHITE);
    // torso: deep chest, barrel, hips. Then the furnace window through the ribs.
    S.ell('chest', [0.45, 0.9, 0], [0.4, 0.43, 0.42], G);
    S.cap('body', [0.2, 0.86, 0], [-0.4, 0.86, 0], 0.375, 0.355, G);
    S.ell('body', [-0.58, 0.87, 0], [0.34, 0.36, 0.36], G);
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
      S.box(x > 0.4 ? 'chest' : 'body', [x, y, 0], [0.095, 0.045, 0.15 - Math.abs(x + 0.1) * 0.05], 0.035, PL);
    // front legs: shoulder, forearm, elbow plate, anklet, paw, toes
    S.ell('legFL', [0.5, 0.9, 0.3], [0.24, 0.3, 0.2], GM);
    S.cap('legFL', [0.51, 0.72, 0.32], [0.56, 0.42, 0.33], 0.185, 0.13, GM);
    S.cap('legFL', [0.56, 0.42, 0.33], [0.55, 0.14, 0.33], 0.12, 0.115, GM);
    S.box('legFL', [0.45, 0.5, 0.33], [0.06, 0.1, 0.1], 0.04, { m: 1, col: COBALT, gloss: 0.8, k: 0.022, rot: [0, 0, 10] });
    S.tor('legFL', [0.55, 0.27, 0.33], 0.12, 0.042, Object.assign({ m: 1 }, FE));
    S.ell('legFL', [0.62, 0.09, 0.33], [0.2, 0.095, 0.17], { m: 1, col: COBALT, gloss: 0.8, k: 0.03 });
    for (let i = -1; i <= 1; i++) S.ell('legFL', [0.79 - Math.abs(i) * 0.03, 0.065, 0.33 + i * 0.105], [0.065, 0.058, 0.052], { m: 1, col: WHITE, gloss: 0.8, k: 0.014 });
    // back legs: haunch, stifle, hock, anklet, paw, toes
    S.ell('legBL', [-0.64, 0.78, 0.27], [0.25, 0.31, 0.2], GM);
    S.cap('legBL', [-0.58, 0.6, 0.3], [-0.48, 0.43, 0.31], 0.165, 0.125, GM);
    S.cap('legBL', [-0.48, 0.43, 0.31], [-0.72, 0.25, 0.31], 0.115, 0.1, GM);
    S.cap('legBL', [-0.72, 0.25, 0.31], [-0.68, 0.12, 0.31], 0.1, 0.1, GM);
    S.tor('legBL', [-0.705, 0.22, 0.31], 0.1, 0.04, Object.assign({ m: 1, rot: [0, 0, -18] }, FE));
    S.ell('legBL', [-0.61, 0.09, 0.31], [0.2, 0.095, 0.17], { m: 1, col: COBALT, gloss: 0.8, k: 0.03 });
    for (let i = -1; i <= 1; i++) S.ell('legBL', [-0.44 - Math.abs(i) * 0.03, 0.065, 0.31 + i * 0.105], [0.065, 0.058, 0.052], { m: 1, col: WHITE, gloss: 0.8, k: 0.014 });
    // neck with an iron collar
    S.cap('neck', [0.6, 1.07, 0], [0.88, 1.2, 0], 0.31, 0.28, G);
    S.tor('neck', [0.72, 1.125, 0], 0.3, 0.06, Object.assign({ rot: [0, 0, -65] }, FE));
    // head: skull, square muzzle, jowls, nose, brow, cheeks, jaw with a molten tongue
    S.ell('head', [0.92, 1.24, 0], [0.31, 0.29, 0.32], G);
    S.box('head', [1.2, 1.1, 0], [0.2, 0.165, 0.2], 0.1, { gloss: 0.75, k: 0.05 });
    S.ell('head', [1.17, 0.99, 0.16], [0.18, 0.14, 0.09], { m: 1, col: CREAM, gloss: 0.75, k: 0.04 });
    S.ell('head', [1.41, 1.17, 0], [0.06, 0.075, 0.115], { col: IRON, gloss: 0.85, k: 0.03 });
    S.ell('head', [1.465, 1.18, 0.052], [0.04, 0.03, 0.026], { m: 1, sub: 1, col: '#ffb050', glow: 3, k: 0.012 });
    S.cap('head', [0.78, 1.5, 0], [1.04, 1.485, 0], 0.075, 0.06, { gloss: 0.75, k: 0.04 });
    S.cap('head', [1.12, 1.425, 0.075], [1.19, 1.375, 0.26], 0.06, 0.046, { m: 1, gloss: 0.75, k: 0.03 });
    S.cap('head', [1.16, 1.4, 0], [1.2, 1.3, 0], 0.035, 0.03, { sub: 1, col: NAVY, k: 0.02 });
    S.ell('head', [0.9, 1.16, 0.29], [0.13, 0.15, 0.08], { m: 1, gloss: 0.75, k: 0.05 });
    S.cap('head', [1.27, 1.275, 0], [1.37, 1.25, 0], 0.07, 0.06, { gloss: 0.75, k: 0.03 });
    S.ell('jaw', [1.2, 0.88, 0], [0.27, 0.09, 0.21], { gloss: 0.75, k: 0.02 });
    S.ell('jaw', [1.37, 0.82, 0], [0.09, 0.05, 0.14], { col: COBALT, gloss: 0.8, k: 0.03 });
    S.box('jaw', [1.28, 0.957, 0], [0.22, 0.03, 0.27], 0.02, { sub: 1, col: '#ff8a2a', glow: 2.6, k: 0.014 });
    S.ell('jaw', [1.16, 0.925, 0], [0.19, 0.04, 0.12], { col: MAGMA, glow: 2.6, k: 0.02 });
    // hanging ears
    S.ell('earL', [0.82, 1.3, 0.355], [0.12, 0.18, 0.05], { m: 1, rot: [16, 0, 8], col: COBALT, gloss: 0.8, k: 0.03 });
    // tail with an iron band and an ember tip
    S.tube(['tail1', 'tail2'], [[-0.86, 1.08, 0], [-1.04, 1.2, 0], [-1.13, 1.4, 0]], [0.105, 0.08, 0.055], G);
    S.tor('tail1', [-0.96, 1.15, 0], 0.085, 0.036, Object.assign({ rot: [0, 0, 56] }, FE));
    S.ell('tail2', [-1.14, 1.46, 0], 0.075, { col: MAGMA, glow: 2.8, k: 0.03 });
    // chips: places where a piece of porcelain broke off and the magma shows
    for (const [bn, x, y, z, r] of [['legFL', 0.62, 0.9, 0.5, 0.07], ['legBL', -0.76, 0.72, 0.46, 0.065], ['body', -0.8, 1.14, 0.2, 0.06], ['head', 0.82, 1.4, 0.27, 0.05], ['chest', 0.88, 0.94, 0.3, 0.055]])
      S.ell(bn, [x, y, z], r, { m: 1, sub: 1, col: '#ff9a30', glow: 2.6, k: 0.02 });

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
    const V = (bn, c, half, rot, o) => S.box(bn, c, half, 0.005, Object.assign({ paint: 1, col: '#ff7416', glow: 3.4, cb: 0.012, rot, gloss: 0 }, o));
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
    // heat on the hoops near the fire
    S.box('body', [-0.1, 0.82, 0], [0.31, 0.25, 0.7], 0.1, { paint: 1, col: '#ff9a40', glow: 1.1, cb: 0.05, op: 0.45 });

    // --- rigid parts ---------------------------------------------------------------
    // cage bars: 3 thin hoops and two rails on each side
    const hoop = torus(0.385, 0.022, 30, 7); hoop.rotateY(Math.PI / 2);
    for (const x of [-0.235, -0.1, 0.035]) S.add('body', hoop, IRONM, { p: [x, 0.86, 0] });
    const rail = tube([[0.17, 0, 0], [-0.1, 0, 0.012], [-0.37, 0, 0]], [0.024, 0.024, 0.024], { ring: 7 });
    S.add('body', rail, IRONM, { p: [0, 0.9, 0.383], m: 1 });
    S.add('body', rail, IRONM, { p: [0, 0.7, 0.345], m: 1 });
    // furnace core and flames
    S.add('core', ball(0.15, 20, 14), ORB, { p: [-0.1, 0.82, 0], name: 'orb' });
    S.add('core', flame(0.085, 0.3), HOT, { p: [0.06, 0.7, 0], r: [0, 0, -14], name: 'fi0' });
    S.add('core', flame(0.085, 0.3), HOT, { p: [-0.26, 0.7, 0], r: [0, 0, 14], name: 'fi1' });
    S.add('core', flame(0.07, 0.24), HOT, { p: [-0.1, 0.7, 0.15], r: [10, 0, 0], name: 'fi2' });
    S.add('core', flame(0.07, 0.24), HOT, { p: [-0.1, 0.7, -0.15], r: [-10, 0, 0], name: 'fi3' });
    S.add('body', flame(0.13, 0.7), FIRE, { p: [-0.1, 0.78, 0.17], r: [27, 0, 0], name: 'flL', m: 1 });
    S.add('body', flame(0.085, 0.42), FIRE, { p: [0.04, 0.8, 0.2], r: [38, 0, -10], name: 'fsL', m: 1 });
    S.add('body', flame(0.085, 0.4), FIRE, { p: [-0.25, 0.8, 0.2], r: [38, 0, 12], name: 'ftL', m: 1 });
    // collar spikes
    const sp = cone(0.042, 0.15, 8), ax = [-0.423, 0.906];
    for (const deg of [0, 40, 80, 120]) {
      const q = deg * Math.PI / 180, d = [Math.cos(q) * ax[0], Math.cos(q) * ax[1], Math.sin(q)];
      S.add('neck', aim(sp, d), SPIKE, { p: [0.72 + d[0] * 0.34, 1.125 + d[1] * 0.34, d[2] * 0.34], m: deg ? 1 : 0 });
    }
    // fangs: an underbite. Small flame at the tip of the tail.
    S.add('jaw', aim(cone(0.04, 0.17, 8), [-0.06, 1, 0.04]), FANG, { p: [1.41, 0.9, 0.16], m: 1 });
    S.add('jaw', aim(cone(0.028, 0.1, 8), [-0.04, 1, 0]), FANG, { p: [1.45, 0.91, 0.058], m: 1 });
    S.add('head', aim(cone(0.034, 0.13, 8), [0.1, -1, 0.1]), FANG, { p: [1.33, 0.97, 0.215], m: 1 });
    S.add('tail2', flame(0.06, 0.2), EMBER, { p: [-1.14, 1.48, 0], r: [0, 0, 14], name: 'tip' });
    S.eye('head', [1.1, 1.32, 0.2], 0.075, { dir: [0.78, 0.1, 0.6], iris: '#ff8a1e', iris2: '#ffe27a', sclera: '#fff1d0', lid: COBALT, open: 24, tilt: -26, glow: 0.7, m: 1 });
  },
  anim(b, t, c) {
    const br = Math.sin(t.p), a = t.a, s = t.s, h = t.h, k = t.k, slam = k === 'slam', buff = k === 'buff', bite = !slam && !buff;
    const P = c.parts, gait = Math.abs(Math.sin(t.w)) * t.mv;
    A.quad(b, LEGS, t, 0.62, 0.08);
    // the body sinks into a crouch for the wind-up; the legs stay on the ground
    const drop = a * (slam ? -0.03 : buff ? 0.02 : 0.09) + (slam ? s * 0.11 : 0) + h * 0.03;
    b.body.position.y += br * 0.012 + gait * 0.04 - drop;
    for (const n of LEGS) b[n].position.y += drop * 0.85;
    b.body.position.x += (bite ? s * 0.34 - a * 0.15 : slam ? -a * 0.05 : 0) - h * 0.06;
    b.body.rotation.z += Math.sin(t.w * 2) * 0.025 * t.mv + h * 0.1 + (bite ? a * 0.07 - s * 0.1 : slam ? a * 0.1 - s * 0.08 : 0);
    b.body.rotation.x = Math.sin(t.w) * 0.03 * t.mv;
    if (buff) b.body.scale.setScalar(1 + s * 0.07 + a * 0.012 * Math.sin(t.tm * 30));
    // legs: reach and push in the lunge, spread wide for the blast
    if (bite) { b.legFL.rotation.z += s * 0.55 - a * 0.2; b.legFR.rotation.z += s * 0.45 - a * 0.25; b.legBL.rotation.z += -s * 0.5 + a * 0.25; b.legBR.rotation.z += -s * 0.42 + a * 0.2; }
    if (slam) { const sp = a * 0.1 + s * 0.3; b.legFL.rotation.x -= sp; b.legFR.rotation.x += sp; b.legBL.rotation.x -= sp; b.legBR.rotation.x += sp; b.legFL.rotation.z += s * 0.2; b.legFR.rotation.z += s * 0.2; }
    // chest: breath, and a deep swell before the blast
    b.chest.scale.setScalar(1 + br * 0.018 + a * (slam ? 0.09 : 0.03) + (slam ? s * 0.12 : 0));
    b.chest.rotation.z = slam ? a * 0.12 - s * 0.1 : 0;
    // neck and head: low for the bite, a high howl for the blast and the harden
    const up = bite ? 0 : 1;
    b.neck.rotation.z = br * 0.02 + t.sw * 0.06 + (up ? a * 0.3 - s * 0.15 : -a * 0.22 + s * 0.3) + h * 0.2;
    b.head.rotation.z = br * 0.03 + Math.sin(t.w) * 0.05 * t.mv + (up ? a * 0.45 - s * 0.2 : -a * 0.25 + s * 0.3) + h * 0.3;
    b.head.rotation.y = t.lk * 0.28 + h * 0.25;
    b.head.rotation.x = h * 0.2 + t.sl * 0.1;
    if (bite) b.head.position.x += s * 0.1;
    // the jaw opens wide in the wind-up; it snaps shut when the strike value falls
    b.jaw.rotation.z = -Math.min(0.95, 0.03 + Math.max(0, br) * 0.05 + h * 0.3 + a * (bite ? 0.55 : 0.35) + s * 0.7);
    // ears hang; they trail and flap
    const ef = Math.sin(t.p * 0.7) * 0.06 + gait * 0.25 + s * 0.5 + h * 0.4 + up * a * 0.3;
    b.earL.rotation.x = -ef + t.sl * 0.3; b.earR.rotation.x = ef + t.sl * 0.3;
    b.earL.rotation.z = b.earR.rotation.z = -t.sw * 0.4 - s * 0.3 + a * 0.15;
    // tail: slow wag, stiff and high in the wind-up
    b.tail1.rotation.y = Math.sin(t.p * 2.2) * (0.3 - a * 0.25) + t.sl * 0.5;
    b.tail2.rotation.y = Math.sin(t.p * 2.2 - 0.8) * 0.35 * (1 - a) + t.sl * 0.5;
    b.tail1.rotation.z = t.sw * 0.3 - a * 0.35 + s * 0.3 - h * 0.6; b.tail2.rotation.z = t.sw * 0.25 - a * 0.2 - h * 0.4;
    // furnace: the core turns and swells, the flames flicker and lean back
    const pw = 1 + a * (slam ? 0.9 : 0.4) + s * (slam ? 1.5 : 0.5) + t.gl * 0.35 + (buff ? s * 0.6 : 0);
    b.core.rotation.y = t.tm * 1.4 + t.o;
    b.core.position.y += Math.sin(t.tm * 3.1) * 0.012;
    P.orb.scale.setScalar(1 + 0.05 * Math.sin(t.tm * 9) + (pw - 1) * 0.45);
    for (let i = 0; i < 4; i++) P['fi' + i].scale.set(1, (0.9 + pw * 0.25) * (1 + 0.22 * Math.sin(t.tm * (19 + i * 3.7) + i * 2)), 1);
    const lean = t.sw * 0.55, fl = (n, sp, ph, side) => {
      const f = P[n];
      f.scale.y *= (0.72 + pw * 0.28) * (1 + 0.16 * Math.sin(t.tm * sp + ph)); f.scale.x *= 1 + 0.08 * Math.sin(t.tm * (sp + 5) + ph);
      f.rotation.z += lean + 0.06 * Math.sin(t.tm * 7 + ph); f.rotation.x += t.sl * 0.4 + (slam ? s * 0.5 : 0) * side;
    };
    fl('flL', 17, 0, 1); fl('flR', 19, 2, -1); fl('fsL', 23, 1, 1); fl('fsR', 21, 3, -1); fl('ftL', 25, 4, 1); fl('ftR', 22, 5, -1);
    P.tip.scale.setScalar(1 + 0.2 * Math.sin(t.tm * 21) + t.gl * 0.5 + a * 0.6);
    P.tip.rotation.z += t.sw * 0.6;
  }
};
