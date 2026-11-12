/* Anviltortoise - cast-iron snapping turtle. Its shell is a blacksmith's anvil; its tail is a hammer. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, cone, ball, torus } from '../geo.js';
import { A } from '../rig.js';

const IRON = '#3b3e48', IRON2 = '#2a2c34', RUST = '#5e4638', RUST2 = '#76543c', STEEL = '#8f98a6', BRIGHT = '#c2c8d2', WOOD = '#7a5232', EMB = '#ffa040';
const IRONM = { col: '#4a4e5a', metal: 1, rough: 0.42, env: 1 };
const STEELM = { col: '#b4bcc8', metal: 1, rough: 0.22, env: 1.3 };
const HOTM = { col: '#ffb060', metal: 0.3, rough: 0.4, glow: '#ff6a14', glowK: 2.4 };
const TAILB = ['t1', 't2', 't3'], LEGS = ['legFL', 'legFR', 'legBL', 'legBR'];
const FACE = 1.14;   // height of the anvil face
function join(gs) {
  return mergeGeometries(gs.map(g => {
    g = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    return g;
  }));
}
// closed chain of oval links through pts
function chainGeo(pts, step) {
  const cv = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), true), n = Math.round(cv.getLength() / step / 2) * 2, out = [];
  const t = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const g = torus(0.034, 0.012, 10, 6), p = cv.getPointAt(i / n);
    g.scale(1.45, 1, 1);
    cv.getTangentAt(i / n, t); u.crossVectors(up, t).normalize(); v.crossVectors(t, u).normalize();
    if (i % 2) m.makeBasis(t, u, v); else m.makeBasis(t, v, u.clone().negate());
    m.setPosition(p); g.applyMatrix4(m); out.push(g);
  }
  return join(out);
}

export default {
  id: 'anviltortoise', rim: '#ffc890', focus: 'anvil', top: 1.2, rough: 0.6,
  opts: { cell: 0.028, mottle: 0.14, mottleF: 13 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.5, 0]).bone('anvil', 'body', [0, FACE, 0])
      .bone('neck', 'body', [0.5, 0.46, 0]).bone('head', 'neck', [0.74, 0.56, 0]).bone('jaw', 'head', [0.82, 0.53, 0])
      .bone('legFL', 'body', [0.42, 0.42, 0.4], { m: 1 }).bone('legBL', 'body', [-0.44, 0.42, 0.4], { m: 1 })
      .bone('t1', 'body', [-0.6, 0.44, 0]).bone('t2', 't1', [-0.74, 0.47, 0]).bone('t3', 't2', [-0.88, 0.56, 0]);
    S.color(IRON);
    const ir = { col: IRON, metal: 1, gloss: 0.35 }, st = { col: BRIGHT, metal: 1, gloss: 0.8 }, sk = { col: RUST, gloss: 0.15 };
    // hull of the turtle with bolted rim plates
    S.ell('body', [0, 0.42, 0], [0.66, 0.21, 0.52], { col: IRON2, metal: 0.8, gloss: 0.3, k: 0.04 });
    for (const x of [-0.34, 0, 0.34]) S.box('body', [x, 0.46, 0.5 - Math.abs(x) * 0.14], [0.15, 0.075, 0.05], 0.03, Object.assign({ m: 1, k: 0.02, rot: [0, -x * 45, 0] }, ir));
    // anvil: feet, base, waist, top block with the face, horn to the front, step, heel with the hardy hole
    S.box('body', [0, 0.62, 0], [0.5, 0.09, 0.38], 0.03, Object.assign({ k: 0.015 }, ir));
    S.box('body', [0.4, 0.57, 0], [0.13, 0.075, 0.43], 0.03, Object.assign({ k: 0.015 }, ir));
    S.box('body', [-0.4, 0.57, 0], [0.13, 0.075, 0.43], 0.03, Object.assign({ k: 0.015 }, ir));
    S.box('body', [0, 0.78, 0], [0.3, 0.11, 0.24], 0.05, Object.assign({ k: 0.05 }, ir));
    S.box('body', [0, 1.0, 0], [0.52, 0.14, 0.3], 0.022, Object.assign({ k: 0.012 }, ir));
    S.cap('body', [0.48, 1.0, 0], [1.04, 1.102, 0], 0.14, 0.036, Object.assign({ k: 0.012 }, ir));
    S.box('body', [0.57, 1.05, 0], [0.07, 0.07, 0.2], 0.02, Object.assign({ k: 0.012 }, ir));
    S.box('body', [-0.59, 1.07, 0], [0.1, 0.07, 0.27], 0.02, Object.assign({ k: 0.012 }, ir));
    S.box('body', [-0.6, FACE, 0.11], [0.046, 0.07, 0.046], 0.008, { sub: 1, col: '#ffb040', glow: 3.2, k: 0.006 });
    S.ell('body', [-0.6, FACE, -0.1], [0.036, 0.06, 0.036], { sub: 1, col: '#ffb040', glow: 3.2, k: 0.006 });
    // rivets
    for (const x of [-0.4, -0.2, 0, 0.2, 0.4]) S.ell('body', [x, 0.63, 0.385], 0.034, Object.assign({ m: 1, k: 0.008 }, st));
    for (const [x, y] of [[-0.45, 1.07], [0.45, 1.07], [-0.45, 0.93], [0.45, 0.93]]) S.ell('body', [x, y, 0.302], 0.03, Object.assign({ m: 1, k: 0.008 }, st));
    for (const x of [-0.34, 0, 0.34]) S.ell('body', [x, 0.47, 0.552 - Math.abs(x) * 0.14], 0.03, Object.assign({ m: 1, k: 0.008 }, st));
    // neck, head with an iron brow plate, hooked steel beak
    S.cap('neck', [0.5, 0.46, 0], [0.74, 0.56, 0], 0.18, 0.155, Object.assign({ k: 0.06 }, sk));
    S.ell('head', [0.89, 0.62, 0], [0.23, 0.185, 0.2], Object.assign({ k: 0.05 }, sk));
    S.box('head', [0.88, 0.79, 0], [0.16, 0.04, 0.19], 0.03, Object.assign({ k: 0.02, rot: [0, 0, -14] }, ir));
    S.cap('head', [1.0, 0.645, 0], [1.17, 0.585, 0], 0.108, 0.062, { col: STEEL, metal: 1, gloss: 0.6, k: 0.03 });
    S.cap('head', [1.18, 0.58, 0], [1.2, 0.44, 0], 0.056, 0.028, { col: BRIGHT, metal: 1, gloss: 0.8, k: 0.03 });
    S.ell('jaw', [0.99, 0.485, 0], [0.17, 0.058, 0.135], { col: STEEL, metal: 1, gloss: 0.6, k: 0.012 });
    S.ell('head', [0.8, 0.55, 0.17], 0.045, Object.assign({ m: 1, k: 0.01 }, st));
    // thick legs: armour cap on the knee, scale bumps, a wide foot with 3 iron claws
    for (const [bn, x, sx] of [['legFL', 0.42, 1], ['legBL', -0.44, -1]]) {
      const fx = x + sx * 0.08;
      S.cap(bn, [x, 0.44, 0.42], [x + sx * 0.06, 0.18, 0.5], 0.17, 0.15, Object.assign({ m: 1 }, sk));
      S.ell(bn, [fx + 0.03, 0.085, 0.52], [0.2, 0.09, 0.18], { m: 1, col: IRON2, metal: 0.8, gloss: 0.3, k: 0.04 });
      S.ell(bn, [x + sx * 0.03 + 0.1, 0.31, 0.55], [0.075, 0.1, 0.11], Object.assign({ m: 1, k: 0.015 }, ir));
      S.ell(bn, [x + sx * 0.03 + 0.15, 0.31, 0.57], 0.03, Object.assign({ m: 1, k: 0.008 }, st));
      for (const [dx, y, z] of [[-0.06, 0.36, 0.585], [-0.02, 0.24, 0.635], [-0.13, 0.25, 0.6]]) S.ell(bn, [x + sx * 0.03 + dx, y, z], 0.05, { m: 1, col: RUST2, k: 0.012 });
      for (let i = -1; i <= 1; i++) S.cap(bn, [fx + 0.18, 0.07, 0.52 + i * 0.1], [fx + 0.29 - Math.abs(i) * 0.02, 0.032, 0.52 + i * 0.115], 0.046, 0.022, Object.assign({ m: 1, k: 0.012 }, st));
    }
    // tail: 2 thick segments, then a wooden handle with a steel hammer head
    S.tube(['t1', 't2'], [[-0.58, 0.44, 0], [-0.74, 0.47, 0], [-0.88, 0.56, 0]], [0.16, 0.125, 0.09], Object.assign({ k: 0.05 }, sk));
    S.tor('t2', [-0.74, 0.47, 0], 0.12, 0.03, Object.assign({ k: 0.012, rot: [0, 0, 75] }, ir));
    S.cap('t3', [-0.88, 0.56, 0], [-1.02, 0.74, 0], 0.062, 0.056, { col: WOOD, k: 0.02 });
    S.tor('t3', [-0.89, 0.575, 0], 0.07, 0.028, Object.assign({ k: 0.01, rot: [0, 0, 38] }, ir));
    S.box('t3', [-1.05, 0.78, 0], [0.17, 0.095, 0.1], 0.025, { col: STEEL, metal: 1, gloss: 0.6, k: 0.012, rot: [0, 0, 52] });
    // colour: polished face, worn bright edges, belly, hammer bands
    S.box('body', [0, FACE, 0], [0.5, 0.02, 0.28], 0.01, { paint: 1, col: STEEL, metal: 1, gloss: 0.8, cb: 0.012 });
    const edge = { paint: 1, col: BRIGHT, metal: 1, gloss: 0.85, cb: 0.012 };
    S.cap('body', [-0.52, FACE, 0.3], [0.52, FACE, 0.3], 0.03, 0.03, Object.assign({ m: 1 }, edge));
    S.cap('body', [-0.69, FACE, 0.27], [-0.69, FACE, -0.27], 0.03, 0.03, edge);
    S.cap('body', [0.52, 1.14, 0.3], [0.52, 0.87, 0.3], 0.028, 0.028, Object.assign({ m: 1 }, edge));
    S.cap('body', [-0.52, 1.0, 0.3], [-0.52, 0.87, 0.3], 0.028, 0.028, Object.assign({ m: 1 }, edge));
    S.cap('body', [-0.52, 0.86, 0.3], [0.52, 0.86, 0.3], 0.026, 0.026, Object.assign({ m: 1 }, edge));
    S.cap('body', [0.6, FACE, 0], [1.06, 1.135, 0], 0.07, 0.04, edge);
    S.cap('body', [-0.5, 0.71, 0.38], [0.5, 0.71, 0.38], 0.024, 0.024, Object.assign({ m: 1 }, edge));
    S.ell('body', [0, 0.24, 0], [0.5, 0.06, 0.36], { paint: 1, col: RUST, gloss: 0.1, cb: 0.05 });
    S.ell('t3', [-1.165, 0.635, 0], 0.07, { paint: 1, col: BRIGHT, metal: 1, gloss: 0.85, cb: 0.02 });
    S.ell('t3', [-0.935, 0.925, 0], 0.07, { paint: 1, col: BRIGHT, metal: 1, gloss: 0.85, cb: 0.02 });
    S.ell('head', [1.14, 0.665, 0.045], 0.018, { paint: 1, col: '#15161a', cb: 0.008, m: 1 });
    // glow: ember cracks in the iron, white-hot patch on the face
    const seam = { paint: 1, col: EMB, glow: 2.8, cb: 0.014, m: 1 };
    S.cap('body', [-0.3, 1.1, 0.3], [-0.18, 0.98, 0.3], 0.026, 0.03, seam);
    S.cap('body', [-0.18, 0.98, 0.3], [-0.27, 0.89, 0.3], 0.03, 0.02, seam);
    S.cap('body', [0.3, 1.12, 0.3], [0.21, 1.0, 0.3], 0.024, 0.03, seam);
    S.cap('body', [0.21, 1.0, 0.3], [0.33, 0.91, 0.3], 0.03, 0.02, seam);
    S.cap('body', [0.06, 0.87, 0.25], [-0.04, 0.76, 0.25], 0.03, 0.028, seam);
    S.cap('body', [-0.04, 0.76, 0.25], [0.07, 0.67, 0.31], 0.028, 0.02, seam);
    S.cap('body', [-0.2, 0.69, 0.38], [-0.3, 0.57, 0.4], 0.026, 0.018, seam);
    S.cap('body', [0.22, 0.5, 0.5], [0.12, 0.38, 0.49], 0.026, 0.016, seam);
    S.cap('body', [0.72, 1.04, 0.1], [0.86, 1.0, 0.07], 0.024, 0.016, seam);
    S.cap('body', [0.1, FACE, 0.06], [0.34, FACE, -0.12], 0.026, 0.016, { paint: 1, col: EMB, glow: 2.8, cb: 0.014 });
    S.cap('body', [-0.2, FACE, -0.05], [-0.4, FACE, 0.14], 0.026, 0.016, { paint: 1, col: EMB, glow: 2.8, cb: 0.014 });
    S.ell('body', [-0.05, FACE, 0], [0.22, 0.05, 0.17], { paint: 1, col: '#ff8a2a', glow: 1.7, cb: 0.05 });
    S.ell('body', [-0.05, FACE, 0], [0.12, 0.05, 0.09], { paint: 1, col: '#fff0c8', glow: 3.4, cb: 0.03 });
    S.ell('neck', [0.6, 0.4, 0], [0.16, 0.06, 0.12], { paint: 1, col: EMB, glow: 1.2, cb: 0.05 });

    // chain around the waist
    S.add('body', chainGeo([[0.36, 0.82, 0.3], [-0.36, 0.79, 0.3], [-0.36, 0.82, -0.3], [0.36, 0.79, -0.3]], 0.086), IRONM, {});
    // horseshoes on a nail: steel ones on both sides, a hot one on the left; tongs on the right
    const shoe = torus(0.09, 0.022, 20, 6, Math.PI * 1.4);
    shoe.rotateZ(-0.2 * Math.PI); shoe.scale(1, 1.15, 0.8);
    S.add('body', shoe, STEELM, { p: [-0.24, 0.975, 0.318], r: [0, 0, 8], m: 1, name: 'shoeL' });
    S.add('body', shoe, HOTM, { p: [0.12, 0.97, 0.318], r: [0, 0, -10], name: 'hot' });
    const rod = sx => [tube([[sx * 0.02, 0.1, 0], [sx * 0.05, 0.06, 0], [0, 0, 0], [-sx * 0.035, -0.1, 0], [-sx * 0.045, -0.24, 0]], [0.012, 0.016, 0.017, 0.014, 0.013], { ring: 6 })];
    S.add('body', join(rod(1).concat(rod(-1), [ball(0.024, 8, 6)])), IRONM, { p: [0.1, 0.985, -0.326], r: [0, 0, 6], name: 'tongs' });
    // iron studs on the hull rim and the tail
    for (const [x, z] of [[0.17, 0.545], [-0.17, 0.545], [0.5, 0.4], [-0.5, 0.4]]) S.add('body', cone(0.05, 0.1, 6), IRONM, { p: [x, 0.5, z], r: [62, 0, 0], m: 1 });
    S.add('t1', cone(0.05, 0.12, 6), IRONM, { p: [-0.66, 0.58, 0], r: [0, 0, 18] });
    S.add('t2', cone(0.042, 0.1, 6), IRONM, { p: [-0.8, 0.59, 0], r: [0, 0, 32] });
    S.eye('head', [1.0, 0.7, 0.138], 0.048, { dir: [0.6, 0.2, 0.77], sclera: '#2a1206', iris: '#ff7a14', iris2: '#ffe27a', lid: IRON, open: 18, tilt: -28, glow: 1.6, m: 1 });
  },
  anim(b, t, c) {
    const br = Math.sin(t.p * 0.8), a = t.a, s = t.s, h = t.h, k = t.k;
    const slam = k === 'slam' ? 1 : 0, melee = k === 'melee' ? 1 : 0, shot = k === 'shot' ? 1 : 0, bunk = k === 'buff' ? Math.min(1, a + s) : 0;
    A.quad(b, LEGS, t, 0.42, 0.05);
    // slam: the legs push, the body jumps, then it drops flat and squashes
    const jump = slam * (a < 0.35 ? -0.08 * Math.sin(a / 0.35 * Math.PI) : 0.45 * Math.sin((a - 0.35) / 0.65 * Math.PI / 2)), flat = slam * s;
    b.body.position.y += br * 0.01 + Math.abs(Math.sin(t.w)) * 0.022 * t.mv + jump * (1 - s) - flat * 0.22 - bunk * 0.2 - melee * a * 0.04;
    b.body.scale.set(1 + flat * 0.1 + br * 0.006, 1 - flat * 0.18 + br * 0.008, 1 + flat * 0.1 + br * 0.006);
    b.body.rotation.z = Math.sin(t.w * 2) * 0.015 * t.mv + h * 0.1 - t.sw * 0.03 + slam * a * (1 - s) * 0.12 + shot * (a * 0.04 - s * 0.03);
    b.body.rotation.x = Math.sin(t.w) * 0.03 * t.mv + t.sl * 0.05;
    b.body.rotation.y = melee * (a * 0.45 - s * 0.8);
    b.body.position.x += melee * (s * 0.12 - a * 0.06);
    // legs: tuck in the air, splay when flat, pull into the shell for the bunker
    const air = slam * Math.max(0, a - 0.35) * (1 - s), ls = 1 - bunk * 0.5;
    b.legFL.rotation.z += air * 0.5 - bunk * 0.3; b.legFR.rotation.z += air * 0.5 - bunk * 0.3;
    b.legBL.rotation.z += -air * 0.5 + bunk * 0.3; b.legBR.rotation.z += -air * 0.5 + bunk * 0.3;
    for (let i = 0; i < 4; i++) {
      const lg = b[LEGS[i]], sd = i % 2 ? -1 : 1;
      lg.rotation.x = -sd * (flat * 1.1 + air * 0.25 + h * 0.08);
      lg.scale.setScalar(ls);
      lg.position.z -= sd * bunk * 0.12; lg.position.y += bunk * 0.04;
    }
    // head: slow sway, snap of the beak, pulls back into the shell (bunker, hurt)
    const pull = Math.min(1, bunk + h * 0.5 + flat * 0.3);
    b.neck.position.x -= pull * 0.26; b.neck.scale.setScalar(1 - pull * 0.35);
    b.neck.rotation.z = br * 0.03 + t.sw * 0.06 + melee * a * 0.1 + shot * a * 0.2 + slam * a * 0.25 * (1 - s) - flat * 0.15;
    b.neck.rotation.y = t.lk * 0.2 + t.sl * 0.1 - melee * (a * 0.4 - s * 0.5);
    b.head.rotation.z = -br * 0.04 + h * 0.25 + shot * a * 0.15 - flat * 0.1 + Math.sin(t.w) * 0.03 * t.mv;
    b.head.rotation.y = t.lk * 0.3;
    const snap = Math.max(0, Math.sin(t.p * 0.45)) > 0.97 ? 1 : 0;
    b.jaw.rotation.z = -(0.05 + Math.max(0, br) * 0.04 + a * 0.3 + s * 0.45 + h * 0.4) * (1 - snap) * (1 - bunk);
    // tail hammer. melee: wind to one side, then sweep around. shot: lift and strike the anvil over the back.
    const sweep = melee * (a * 0.5 - s * 0.85), SW = [1.5, 0.3, 0.15], AZ = [-0.5, -0.3, 0.45], SZ = [-0.6, -0.4, 0.15], reach = shot * Math.max(a * 0.8, s) + melee * s * 0.8;
    for (let i = 0; i < 3; i++) {
      const tb = b[TAILB[i]];
      tb.rotation.y = Math.sin(t.p * 0.7 - i * 0.6) * 0.07 + t.sl * 0.2 + sweep * SW[i] + bunk * 0.7;
      tb.rotation.z = Math.sin(t.p * 0.8 - i * 0.5) * 0.03 - t.sw * 0.08 + shot * ((1 - s) * a * AZ[i] + s * SZ[i]) - melee * a * 0.12 + slam * (a * 0.2 - s * 0.3) + h * 0.12 - t.gl * 0.05 * (1 + Math.sin(t.tm * 6));
    }
    b.t1.scale.setScalar(1 + reach * 0.25);
    b.t2.position.multiplyScalar(1 + reach * 0.5); b.t3.position.multiplyScalar(1 + reach * 0.5);
    // hung tools swing
    const swg = Math.sin(t.tm * 2.4) * 0.05 + t.sw * 0.5 + Math.sin(t.tm * 21) * 0.2 * (s + h * 0.5) - Math.sin(t.w * 2) * 0.1 * t.mv;
    c.parts.shoeL.rotation.z += swg; c.parts.shoeR.rotation.z += swg * 0.8; c.parts.hot.rotation.z += swg * 1.2; c.parts.tongs.rotation.z += swg * 0.7;
    c.parts.hot.scale.setScalar(1 + 0.04 * Math.sin(t.tm * 5) + t.gl * 0.12);
  }
};
