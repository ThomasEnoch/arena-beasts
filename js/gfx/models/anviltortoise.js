/* Anviltortoise (Forgeshell) - cast-iron snapping turtle. Its shell is a blacksmith's anvil; its tail is a hammer. Iron / Ember.
   Heart piece: the glow in the square hole of the anvil face. Maker's mark: a brass plate with hammer and anvil on the right flank. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, cone, ball, torus, rbox, canvasTex } from '../geo.js';
import { A } from '../rig.js';

const IRON = '#3b3e48', IRON2 = '#2a2c34', CAST = '#423d40', RUST = '#5e4638', RUST2 = '#7a4e34', STEEL = '#8f98a6', BRIGHT = '#c2c8d2', WOOD = '#7a5232', EMB = '#ffa040';
const IRONM = { col: '#4a4e5a', metal: 1, rough: 0.42, env: 1 };
const STEELM = { col: '#b4bcc8', metal: 1, rough: 0.22, env: 1.3 };
const HOTM = { col: '#ffb060', metal: 0.3, rough: 0.4, glow: '#ff6a14', glowK: 2.2 };
const HEARTM = { col: '#fff0c4', glow: '#ffb240', glowK: 3.5, noOut: true };   // heart piece: the brightest glow
const SPARKM = { col: '#fff2c8', glow: '#ffc060', glowK: 3.2, noOut: true };
const CRACKM = { col: '#ffc070', glow: '#ff7a1c', glowK: 2.6, noOut: true };   // a crack that shows the heat inside
const BRASSM = { col: '#c9a148', metal: 1, rough: 0.3, env: 1.1 };
const TAILB = ['t1', 't2', 't3'], cl = (v, a, b) => v < a ? a : v > b ? b : v;
// legs: upper bone, lower bone, foot bone, front (1) or back (0), side (+1 = L), place in the walk cycle (4 separate beats)
const LEG = [['legFL', 'lowFL', 'footFL', 1, 1, 0.75], ['legFR', 'lowFR', 'footFR', 1, -1, 0.28], ['legBL', 'lowBL', 'footBL', 0, 1, 0], ['legBR', 'lowBR', 'footBR', 0, -1, 0.53]];
const ST = [{}, {}, {}, {}];
// One leg in the step cycle. q = place in the cycle (0..1), duty = part of the cycle with the foot on the ground.
// f = place of the foot along the step (+1 front, -1 back). l = lift (0..1). land = load just after the foot lands.
function stride(q, duty, o) {
  q -= Math.floor(q);
  if (q < duty) { o.f = 1 - 2 * q / duty; o.l = 0; o.land = q < 0.16 ? Math.sin(Math.PI * q / 0.16) : 0; }
  else { const r = (q - duty) / (1 - duty); o.f = -1 + 2 * r * r * (3 - 2 * r); o.l = Math.sin(Math.PI * Math.pow(r, 0.75)); o.land = 0; }
  return o;
}
const FACE = 1.14;   // height of the anvil face
const HOLE = [-0.63, FACE, 0.07], HIT = [-0.14, FACE, 0];   // the square hole (heart piece); the place where the tail hammer lands
// tail angles for the ultimate: hammer high and back, hammer on the shell
const UP = [-0.49, 0.02, -0.01], DOWN = [-0.71, -0.7, -0.34], BEAT = 1.15;
let markTex = null;
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
  id: 'anviltortoise', rim: '#ffc890', focus: 'heart', top: 1.2, rough: 0.6,
  // the hammer tail is a heavy pendulum: loose spring, low damping. The long neck leads each turn.
  dyn: [{ b: ['t1', 't2', 't3'], k: 30, d: 2.6, amt: 0.9, drag: 0.5 }],
  rig: { head: 'head', neck: ['neck1', 'neck2'] },
  opts: { cell: 0.028, mottle: 0.05, mottleF: 13 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.5, 0]).bone('anvil', 'body', [0, FACE, 0])
      .bone('neck1', 'body', [0.5, 0.46, 0]).bone('neck2', 'neck1', [0.62, 0.51, 0]).bone('head', 'neck2', [0.74, 0.56, 0]).bone('jaw', 'head', [0.82, 0.53, 0])
      .bone('legFL', 'body', [0.42, 0.42, 0.4], { m: 1 }).bone('lowFL', 'legFL', [0.47, 0.31, 0.56], { m: 1 }).bone('footFL', 'lowFL', [0.51, 0.14, 0.6], { m: 1 })
      .bone('legBL', 'body', [-0.44, 0.42, 0.4], { m: 1 }).bone('lowBL', 'legBL', [-0.49, 0.31, 0.56], { m: 1 }).bone('footBL', 'lowBL', [-0.53, 0.14, 0.6], { m: 1 })
      .bone('t1', 'body', [-0.6, 0.44, 0]).bone('t2', 't1', [-0.74, 0.47, 0]).bone('t3', 't2', [-0.88, 0.56, 0]);
    S.color(IRON);
    // sk: the rough cast iron of the animal. ir: the smoother iron of the anvil. st: bright steel.
    const ir = { col: IRON, metal: 1, gloss: 0.35 }, st = { col: BRIGHT, metal: 1, gloss: 0.8 }, sk = { col: '#34363e', metal: 0.7, gloss: 0.24 };
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
    S.box('body', [-0.63, 1.07, 0], [0.14, 0.07, 0.27], 0.02, Object.assign({ k: 0.012 }, ir));
    // heart piece: the square hole in the face. A smaller round hole is next to it.
    S.box('body', [HOLE[0], FACE - 0.03, HOLE[2]], [0.08, 0.11, 0.08], 0.01, { sub: 1, col: '#ffc45a', glow: 3.5, k: 0.006 });
    S.ell('body', [-0.63, FACE, -0.15], [0.04, 0.07, 0.04], { sub: 1, col: '#ffa040', glow: 2.3, k: 0.006 });
    // hammer dents all over the face, and some on the horn and the sides
    const DENTS = [[0.34, 0.1, 0.07], [0.14, -0.15, 0.06], [-0.06, 0.13, 0.075], [-0.3, -0.07, 0.085], [-0.2, 0.17, 0.05], [0.42, -0.1, 0.05], [0.03, -0.01, 0.055], [-0.42, 0.15, 0.045], [0.24, -0.02, 0.045], [-0.12, -0.17, 0.05]];
    for (const [x, z, r] of DENTS) S.ell('body', [x, FACE + 0.038, z], [r, 0.062, r], { sub: 1, col: '#59606c', metal: 1, gloss: 0.5, k: 0.01 });
    S.ell('body', [0.7, 1.19, 0.03], [0.06, 0.06, 0.05], { sub: 1, col: '#59606c', metal: 1, gloss: 0.5, k: 0.01 });
    for (const [x, y, r] of [[0.1, 1.02, 0.05], [-0.36, 0.96, 0.045], [0.36, 0.98, 0.04]]) S.ell('body', [x, y, 0.335], [r, r, 0.06], { sub: 1, m: 1, col: '#23252b', metal: 1, gloss: 0.3, k: 0.01 });
    // rivets
    for (const x of [-0.4, -0.2, 0, 0.2, 0.4]) S.ell('body', [x, 0.63, 0.385], 0.034, Object.assign({ m: 1, k: 0.008 }, st));
    for (const [x, y] of [[-0.45, 1.07], [0.45, 1.07], [-0.45, 0.93], [0.45, 0.93]]) S.ell('body', [x, y, 0.302], 0.03, Object.assign({ m: 1, k: 0.008 }, st));
    for (const x of [-0.34, 0, 0.34]) S.ell('body', [x, 0.47, 0.552 - Math.abs(x) * 0.14], 0.03, Object.assign({ m: 1, k: 0.008 }, st));
    // neck, head with an iron brow plate, hooked steel beak
    S.tube(['neck1', 'neck2'], [[0.5, 0.46, 0], [0.62, 0.51, 0], [0.74, 0.56, 0]], [0.18, 0.168, 0.155], Object.assign({ k: 0.06 }, sk));
    S.tor('neck1', [0.57, 0.49, 0], 0.172, 0.03, Object.assign({ k: 0.014, rot: [0, 0, -67] }, ir));
    S.tor('neck2', [0.67, 0.53, 0], 0.158, 0.026, Object.assign({ k: 0.014, rot: [0, 0, -67] }, ir));
    S.ell('head', [0.89, 0.62, 0], [0.23, 0.185, 0.2], Object.assign({ k: 0.05 }, sk));
    S.box('head', [0.88, 0.79, 0], [0.16, 0.04, 0.19], 0.03, Object.assign({ k: 0.02, rot: [0, 0, -14] }, ir));
    S.cap('head', [1.0, 0.645, 0], [1.17, 0.585, 0], 0.108, 0.062, { col: STEEL, metal: 1, gloss: 0.6, k: 0.03 });
    S.cap('head', [1.18, 0.58, 0], [1.2, 0.44, 0], 0.056, 0.028, { col: BRIGHT, metal: 1, gloss: 0.8, k: 0.03 });
    S.ell('jaw', [0.99, 0.485, 0], [0.17, 0.058, 0.135], { col: STEEL, metal: 1, gloss: 0.6, k: 0.012 });
    S.ell('head', [0.8, 0.55, 0.17], 0.045, Object.assign({ m: 1, k: 0.01 }, st));
    // thick legs: armour cap on the knee, scale bumps, a wide foot with 3 iron claws
    // The leg goes out from the shell to the knee, then down to the foot (a wide stance).
    for (const [bn, lo, ft, x, sx] of [['legFL', 'lowFL', 'footFL', 0.42, 1], ['legBL', 'lowBL', 'footBL', -0.44, -1]]) {
      const kx = x + sx * 0.05, fx = x + sx * 0.09;
      S.cap(bn, [x, 0.44, 0.42], [kx, 0.31, 0.56], 0.17, 0.155, Object.assign({ m: 1 }, sk));
      S.cap(lo, [kx, 0.31, 0.56], [fx, 0.16, 0.6], 0.15, 0.142, Object.assign({ m: 1 }, sk));
      S.ell(ft, [fx + 0.03, 0.085, 0.61], [0.2, 0.09, 0.17], { m: 1, col: IRON2, metal: 0.8, gloss: 0.3, k: 0.04 });
      S.ell(bn, [kx + 0.08, 0.34, 0.63], [0.075, 0.1, 0.11], Object.assign({ m: 1, k: 0.015 }, ir));
      S.ell(bn, [kx + 0.13, 0.34, 0.655], 0.03, Object.assign({ m: 1, k: 0.008 }, st));
      for (const [dx, y, z] of [[-0.08, 0.37, 0.66], [-0.02, 0.25, 0.725], [-0.13, 0.26, 0.69]]) S.ell(y > 0.3 ? bn : lo, [kx + dx, y, z], 0.05, { m: 1, col: '#30323a', metal: 1, gloss: 0.4, k: 0.01 });
      S.tor(lo, [fx, 0.2, 0.6], 0.148, 0.03, Object.assign({ m: 1, k: 0.012, rot: [8, 0, 0] }, ir));
      for (let i = -1; i <= 1; i++) S.cap(ft, [fx + 0.18, 0.07, 0.61 + i * 0.1], [fx + 0.29 - Math.abs(i) * 0.02, 0.032, 0.61 + i * 0.115], 0.046, 0.022, Object.assign({ m: 1, k: 0.012 }, st));
    }
    // tail: 2 thick segments, then a wooden handle with a steel hammer head
    S.tube(['t1', 't2'], [[-0.58, 0.44, 0], [-0.74, 0.47, 0], [-0.88, 0.56, 0]], [0.16, 0.125, 0.09], Object.assign({ k: 0.05 }, sk));
    S.tor('t2', [-0.74, 0.47, 0], 0.12, 0.03, Object.assign({ k: 0.012, rot: [0, 0, 75] }, ir));
    S.cap('t3', [-0.88, 0.56, 0], [-1.02, 0.74, 0], 0.062, 0.056, { col: WOOD, k: 0.02 });
    S.tor('t3', [-0.89, 0.575, 0], 0.07, 0.028, Object.assign({ k: 0.01, rot: [0, 0, 38] }, ir));
    S.box('t3', [-1.05, 0.78, 0], [0.19, 0.105, 0.115], 0.025, { col: STEEL, metal: 1, gloss: 0.6, k: 0.012, rot: [0, 0, 52] });
    S.box('t3', [-1.05, 0.78, 0], [0.05, 0.12, 0.13], 0.02, Object.assign({ k: 0.01, rot: [0, 0, 52] }, ir));
    // colour: polished face, worn bright edges, belly, hammer bands
    S.box('body', [-0.06, FACE, 0], [0.58, 0.02, 0.28], 0.01, { paint: 1, col: STEEL, metal: 1, gloss: 0.8, cb: 0.012 });
    for (const [x, z, r] of DENTS) S.ell('body', [x, FACE, z], [r * 0.85, 0.04, r * 0.85], { paint: 1, col: '#4c535e', metal: 1, gloss: 0.45, cb: 0.02, op: 0.8 });
    const edge = { paint: 1, col: BRIGHT, metal: 1, gloss: 0.85, cb: 0.012 };
    S.cap('body', [-0.52, FACE, 0.3], [0.52, FACE, 0.3], 0.03, 0.03, Object.assign({ m: 1 }, edge));
    S.cap('body', [-0.77, FACE, 0.27], [-0.77, FACE, -0.27], 0.03, 0.03, edge);
    S.cap('body', [0.52, 1.14, 0.3], [0.52, 0.87, 0.3], 0.028, 0.028, Object.assign({ m: 1 }, edge));
    S.cap('body', [-0.52, 1.0, 0.3], [-0.52, 0.87, 0.3], 0.028, 0.028, Object.assign({ m: 1 }, edge));
    S.cap('body', [-0.52, 0.86, 0.3], [0.52, 0.86, 0.3], 0.026, 0.026, Object.assign({ m: 1 }, edge));
    S.cap('body', [0.6, FACE, 0], [1.06, 1.135, 0], 0.07, 0.04, edge);
    S.cap('body', [-0.5, 0.71, 0.38], [0.5, 0.71, 0.38], 0.024, 0.024, Object.assign({ m: 1 }, edge));
    S.ell('body', [0, 0.24, 0], [0.5, 0.06, 0.36], { paint: 1, col: RUST, gloss: 0.1, cb: 0.05 });
    S.ell('t3', [-1.165, 0.635, 0], 0.07, { paint: 1, col: BRIGHT, metal: 1, gloss: 0.85, cb: 0.02 });
    S.ell('t3', [-0.935, 0.925, 0], 0.07, { paint: 1, col: BRIGHT, metal: 1, gloss: 0.85, cb: 0.02 });
    S.ell('head', [1.14, 0.665, 0.045], 0.018, { paint: 1, col: '#15161a', cb: 0.008, m: 1 });
    // No soft paint here (rust, soot, stains, painted cracks). Colour is stored for each vertex of the body,
    // so a soft or a thin painted mark becomes a blur or a broken line. Small marks are rigid parts: see the cracks below.
    for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]])   // worn bright rim of the square hole
      S.cap('body', [HOLE[0] + ax * 0.1, FACE, HOLE[2] + az * 0.1], [HOLE[0] + bx * 0.1, FACE, HOLE[2] + bz * 0.1], 0.02, 0.02, { paint: 1, col: BRIGHT, metal: 1, gloss: 0.85, cb: 0.012 });

    // chain around the waist
    S.add('body', chainGeo([[0.36, 0.82, 0.3], [-0.36, 0.79, 0.3], [-0.36, 0.82, -0.3], [0.36, 0.79, -0.3]], 0.086), IRONM, {});
    // ember cracks in the iron: thin flat tubes that sit on the surface, so that their edges stay sharp
    const crack = (pts, flat) => { const g = tube(pts, pts.map((p, i) => i === 0 || i === pts.length - 1 ? 0.006 : 0.014), { ring: 6 }); if (flat === 'y') g.scale(1, 0.35, 1); else g.scale(1, 1, 0.35); return g; };
    S.add('body', crack([[0.3, 1.125, 0], [0.25, 1.05, 0], [0.31, 0.99, 0], [0.27, 0.93, 0], [0.33, 0.88, 0]]), CRACKM, { p: [0, 0, 0.303] });
    S.add('body', crack([[0.27, 0.93, 0], [0.2, 0.9, 0]]), CRACKM, { p: [0, 0, 0.303] });
    S.add('body', crack([[-0.03, 1.125, 0], [-0.09, 1.04, 0], [-0.04, 0.97, 0], [-0.1, 0.89, 0]]), CRACKM, { p: [0, 0, -0.303] });
    S.add('body', crack([[-0.04, 0.97, 0], [0.02, 0.94, 0]]), CRACKM, { p: [0, 0, -0.303] });
    S.add('anvil', crack([[0.06, 0, 0.1], [0.16, 0, 0.02], [0.27, 0, 0.04], [0.36, 0, -0.06], [0.44, 0, -0.16]], 'y'), CRACKM, { p: [0, FACE + 0.004, 0] });
    S.add('body', crack([[-0.12, 0.7, 0], [-0.17, 0.62, 0], [-0.13, 0.56, 0]]), CRACKM, { p: [0, 0, 0.385] });
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
    // heart piece: molten glow in the square hole. Sparks where the hammer lands (they show only in the ultimate).
    S.add('anvil', rbox(0.15, 0.07, 0.15), HEARTM, { p: [HOLE[0], FACE - 0.075, HOLE[2]], name: 'heart' });
    const star = join([cone(0.035, 0.2, 5), cone(0.03, 0.16, 5).rotateZ(1.1), cone(0.03, 0.16, 5).rotateZ(-1.1), cone(0.028, 0.15, 5).rotateX(1.15), cone(0.028, 0.15, 5).rotateX(-1.15), ball(0.06, 8, 6)]);
    S.add('anvil', star, SPARKM, { p: [HIT[0], FACE + 0.02, 0], name: 'flash' });
    // maker's mark: brass plate with hammer and anvil, riveted to the right flank
    markTex = markTex || canvasTex(128, 96, (g, W, H) => {
      g.fillStyle = '#d8b25a'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#5a3d12'; g.lineWidth = 4; g.strokeRect(7, 7, W - 14, H - 14);
      g.fillStyle = '#4a300c';
      g.beginPath(); g.moveTo(26, 50); g.lineTo(84, 50); g.lineTo(110, 56); g.lineTo(84, 62); g.lineTo(72, 62); g.lineTo(66, 72); g.lineTo(80, 78); g.lineTo(80, 84); g.lineTo(34, 84); g.lineTo(34, 78); g.lineTo(48, 72); g.lineTo(42, 62); g.lineTo(26, 62); g.closePath(); g.fill();
      g.save(); g.translate(58, 30); g.rotate(-0.5); g.fillRect(-28, -3, 50, 6); g.fillRect(12, -11, 16, 22); g.restore();
    });
    S.add('body', rbox(0.25, 0.19, 0.022), { col: '#e2e2e2', map: markTex, metal: 0.9, rough: 0.34, env: 1.1 }, { p: [0.31, 1.0, -0.312], name: 'plate' });
    S.add('body', join([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(q => ball(0.02, 8, 6).translate(q[0] * 0.105, q[1] * 0.075, -0.012))), BRASSM, { p: [0.31, 1.0, -0.312] });
    // eyes: grumpy and old. Heavy lids, a small hot iris.
    S.eye('head', [1.0, 0.7, 0.138], 0.056, { dir: [0.6, 0.2, 0.77], sclera: '#2a1206', iris: '#ff7a14', iris2: '#ffe27a', lid: IRON, open: 27, tilt: -19, glow: 1.5, size: 52, m: 1 });
  },
  anim(b, t, c) {
    // u: the ultimate (Masterwork Cataclysm). It takes the place of the wind-up and the strike of the other poses.
    const u = A.ease(t.u || 0), nu = 1 - u;
    const br = Math.sin(t.p * 0.8), a = t.a * nu, s = t.s * nu, h = t.h, k = t.k, P = c.parts, tm = t.tm, mv = t.mv;
    const slam = k === 'slam' ? 1 : 0, melee = k === 'melee' ? 1 : 0, shot = k === 'shot' ? 1 : 0, bunk = k === 'buff' ? Math.min(1, a + s) : 0;
    // ultimate: the tail hammer goes up slowly and comes down on the shell. ph = place in one beat, hl = 1 at the top, hit = 1 at the blow.
    const ph = (tm / BEAT) % 1, hl = ph < 0.6 ? A.ease(ph / 0.6) : ph < 0.72 ? 1 : ph < 0.84 ? 1 - Math.pow((ph - 0.72) / 0.12, 2) : 0;
    const hit = u * Math.exp(-(ph >= 0.84 ? ph - 0.84 : ph + 0.16) * 11), ring = hit * Math.sin(tm * 60);
    // motion of the body: F = forward part of the step, Sd = side part
    const sp = Math.hypot(t.vf, t.vs), spd = Math.min(1, sp / 2.6), tn = t.tn, noV = cl(1 - sp / 0.3 - Math.abs(tn) / 0.2, 0, 1);
    const F = cl(t.vf / 2.2, -1, 1) + noV, Sd = cl(t.vs / 2.2, -1, 1);
    const hx = t.hx || t.hz ? t.hx : -1, hb = h * -hx, hsd = h * t.hz;   // hb: pushed to the rear. hsd: pushed to the L side.
    const idle = (1 - mv) * nu * (1 - a) * (1 - bunk), sway = Math.sin(tm * 0.5) * Math.sin(tm * 0.19 + 1) * idle, look = Math.sin(tm * 0.27 + 2) * Math.sin(tm * 0.71) * idle;
    // memory between frames: the tools on the nails swing like pendulums when the body starts and stops
    const M = c.at || (c.at = { tm, x: 0, v: 0 }), dt = cl(tm - M.tm, 0, 0.05); M.tm = tm;
    M.v += (-t.af * 0.3 - M.x * 42 - M.v * 2.6) * dt; M.x = cl(M.x + M.v * dt, -0.7, 0.7);

    // legs: a wide, slow walk with 4 separate beats. The foot goes round in the flat plane: lift, reach, plant, push.
    const jump = slam * (a < 0.35 ? -0.08 * Math.sin(a / 0.35 * Math.PI) : 0.45 * Math.sin((a - 0.35) / 0.65 * Math.PI / 2)), flat = slam * s;
    const air = slam * Math.max(0, a - 0.35) * (1 - s), ls = 1 - bunk * 0.5 - u * 0.66, drop = cl(-t.va * 0.012, 0, 0.06);
    const amt = mv * cl(Math.abs(F) + Math.abs(Sd) + Math.abs(tn), 0.35, 1) * nu * (1 - bunk), stepK = amt * cl(Math.abs(F), 0, 1);
    let roll = 0, yaw = 0, land = 0;
    for (let i = 0; i < 4; i++) {
      const L = LEG[i], up = b[L[0]], lo = b[L[1]], ft = b[L[2]], fr = L[3], sd = L[4], o = stride(t.w / Math.PI + L[5], 0.74, ST[i]);
      const inner = 1 - 0.3 * tn * sd * spd;   // the legs on the inner side of a turn take shorter steps
      const th = o.f * F * inner * 0.52 * amt, lat = o.f * (Sd * 0.8 + tn * (fr ? 0.7 : -0.7)) * 0.4 * amt, lift = o.l * amt;
      up.rotation.y += sd * th;                       // the leg rows forward and back
      up.rotation.z += th * 0.3 + (fr ? 1 : -1) * (air * 0.5 - bunk * 0.3 - u * 0.5) + (fr ? 0.1 : -0.2) * hb;
      up.rotation.x -= sd * (lift * 0.34 + flat * 1.1 + air * 0.25 + drop * 3 + Math.max(0, hsd * sd) * 0.3 + h * 0.06);
      lo.rotation.x += sd * lift * 0.3 - lat;         // the knee folds in the lift; the foot goes to the side for a side step and a turn
      lo.rotation.z -= lift * 0.4;
      up.scale.setScalar(ls);
      up.position.z -= sd * (bunk * 0.12 + u * 0.17); up.position.y += bunk * 0.04 + u * 0.1;
      ft.rotation.set(-(up.rotation.x + lo.rotation.x) * 0.9, -up.rotation.y, -(up.rotation.z + lo.rotation.z) - lift * 0.3);   // the foot stays flat and points forward
      roll += o.l * sd; land += o.land; if (fr) yaw += o.f * sd;
    }
    // shell: rigid. It rolls away from the leg in the air, yaws with the front legs and drops a little at each footfall.
    const by = yaw * 0.045 * stepK, bx = -roll * 0.04 * amt + sway * 0.02 + hsd * 0.07;
    b.body.position.y += br * 0.005 * nu + jump * (1 - s) - flat * 0.22 - bunk * 0.2 - melee * a * 0.04 - u * 0.215 - hit * 0.012 - land * 0.012 * amt - drop;
    b.body.scale.set(1 + flat * 0.1 + hit * 0.035, 1 - flat * 0.18 - hit * 0.05, 1 + flat * 0.1 + hit * 0.035);
    b.body.rotation.z = hb * 0.08 + slam * a * (1 - s) * 0.12 + shot * (a * 0.04 - s * 0.03) + ring * 0.006;
    b.body.rotation.x = bx;
    b.body.rotation.y = by + melee * (a * 0.45 - s * 0.8);
    b.body.position.x += melee * (s * 0.12 - a * 0.06) - hb * 0.04;
    // neck: 2 parts. It reaches out of the shell and pulls back; it curves into a turn; the head stays level.
    const pull = Math.min(1, bunk + h * 0.5 * nu + flat * 0.3);
    const reach = ((Math.sin(tm * 0.43) * Math.sin(tm * 0.17 + 2) * 0.05 + 0.015) * idle + amt * (0.05 + yaw * 0.012) + shot * a * 0.03 + melee * (s * 0.05 - a * 0.05)) * (1 - pull);
    const nz = br * 0.03 + melee * a * 0.1 + shot * a * 0.2 + slam * a * 0.25 * (1 - s) - flat * 0.15 - u * 0.1 + hb * 0.15 - land * 0.012 * amt;
    const ny = -tn * 0.4 - by + look * 0.3 - melee * (a * 0.4 - s * 0.5) - hsd * 0.4;
    b.neck1.position.x += reach - pull * 0.26 - u * 0.36; b.neck1.position.y += u * 0.05;
    b.neck1.scale.setScalar(1 - pull * 0.35 - u * 0.42);
    b.neck1.rotation.z = nz * 0.55; b.neck2.rotation.z = nz * 0.45 + reach * 0.8;
    b.neck1.rotation.y = ny * 0.55; b.neck2.rotation.y = ny * 0.45;
    b.neck2.position.x += reach * 0.6;
    b.head.rotation.z = -br * 0.04 - reach * 0.8 + hb * 0.3 + h * 0.05 + shot * a * 0.15 - flat * 0.1 + land * 0.02 * amt - hit * 0.12;
    b.head.rotation.y = t.lk * 0.3 * nu + look * 0.2;
    b.head.rotation.x = -bx + Math.sin(tm * 0.23 + 3) * idle * 0.06 - hsd * 0.1;
    const snap = Math.max(0, Math.sin(t.p * 0.45)) > 0.97 ? 1 : 0;
    b.jaw.rotation.z = -(0.05 + Math.max(0, br) * 0.04 + a * 0.3 + s * 0.45 + h * 0.4) * (1 - snap) * (1 - bunk) * nu;
    // tail hammer (spring chain: it swings late like a pendulum). melee: wind to one side, then sweep round. shot: lift and strike the anvil over the back.
    const sweep = melee * (a * 0.5 - s * 0.85), SW = [1.5, 0.3, 0.15], AZ = [-0.5, -0.3, 0.45], SZ = [-0.6, -0.4, 0.15], rc = shot * Math.max(a * 0.8, s) + melee * s * 0.8;
    for (let i = 0; i < 3; i++) {
      const tb = b[TAILB[i]];
      tb.rotation.y = Math.sin(t.p * 0.7 - i * 0.6) * 0.07 * nu + sweep * SW[i] + bunk * 0.7 + tn * 0.12 * amt;
      tb.rotation.z = (Math.sin(t.p * 0.8 - i * 0.5) * 0.03 + hb * 0.12 - t.gl * 0.05 * (1 + Math.sin(tm * 6)) + land * 0.015 * amt) * nu + shot * ((1 - s) * a * AZ[i] + s * SZ[i]) - melee * a * 0.12 + slam * (a * 0.2 - s * 0.3)
        + u * (DOWN[i] + (UP[i] - DOWN[i]) * hl) + (i === 2 ? hit * Math.abs(Math.sin(tm * 30)) * 0.12 : 0);
    }
    // the tail gets longer to reach the anvil (shot, melee) and still longer for the blows of the ultimate
    b.t1.scale.setScalar(1 + rc * 0.25 + u * 0.35);
    b.t2.position.multiplyScalar(1 + rc * 0.5 + u); b.t3.position.multiplyScalar(1 + rc * 0.5 + u);
    // hung tools swing; they jump at each blow and at each footfall
    const swg = Math.sin(tm * 2.4) * 0.03 + M.x + Math.sin(tm * 21) * 0.2 * (s + h * 0.5) + ring * 0.3 + land * 0.04 * amt;
    P.shoeL.rotation.z += swg; P.shoeR.rotation.z += swg * 0.8; P.hot.rotation.z += swg * 1.2; P.tongs.rotation.z += swg * 0.7;
    P.hot.scale.setScalar(1 + 0.04 * Math.sin(tm * 5) + t.gl * 0.12);
    // heart piece: the glow in the square hole breathes; it jumps at each blow. Sparks fly from the place of the blow.
    P.heart.scale.set(1, 1 + 0.25 * Math.sin(tm * 3.3) + t.gl * 0.5 + a * 0.6 + s * 0.8 + u * 0.8 + hit * 2.2, 1);
    P.flash.visible = hit > 0.04;
    P.flash.scale.setScalar(Math.max(0.001, hit * 1.7)); P.flash.rotation.y = tm * 9;
  }
};
