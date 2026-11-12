/* Basaltgorilla (Basaltback) - the quarry engine. An ape of dark basalt columns, moved by steel pistons with brass fittings. Stone / Brawl.
   Heart piece: the quarry lamp in the chest. Maker's mark: a six-sided stamp in white paint on the right shoulder. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, lathe, ball, torus, rbox, canvasTex } from '../geo.js';
import { A } from '../rig.js';

const ROCK = '#41444b', ROCK2 = '#5c6069', DARK = '#292b30', LIGHT = '#878b93', IRON = '#7e8894', BRASS = '#c9a148', AMBER = '#ff9428', YEL = '#d0a21e', BLK = '#1a1a1d';
const BAS1 = { col: '#33363c', rough: 0.9, flat: true }, BAS2 = { col: '#50545c', rough: 0.85, flat: true };
const DSTEEL = { col: '#3c434c', metal: 0.9, rough: 0.42, env: 1 }, CHROME = { col: '#e0e6ee', metal: 1, rough: 0.1, env: 1.6 };
const BRASSM = { col: BRASS, metal: 1, rough: 0.3, env: 1.1 };
const EMBER = { col: '#ffc070', glow: '#ff8a1a', glowK: 2, noOut: true };
const LAMPM = { col: '#fff3cc', glow: '#ffc250', glowK: 3.5, noOut: true };   // heart piece: the brightest glow
let beamTex = null;
const STAMP = { col: '#d9d9d3', rough: 0.9, noOut: true };
const TOOTH = { col: '#d2c8b6', rough: 0.45, flat: true };

const D2R = Math.PI / 180, UP = new THREE.Vector3(0, 1, 0);
const join = list => mergeGeometries(list.map(g => { g = g.index ? g.toNonIndexed() : g.clone(); g.deleteAttribute('uv'); return g; }));
// Basalt column: 6 sides, flat top with a small chamfer. p = centre of the base, lean = degrees to the back, out = degrees to the side.
function column(r, h, p, lean = 0, out = 0, turn = 0) {
  const g = lathe([[r, 0], [r * 0.95, h - r * 0.22], [r * 0.74, h], [0, h]], 6);
  g.rotateY(turn * D2R); g.rotateX(out * D2R); g.rotateZ(lean * D2R); g.translate(p[0], p[1], p[2]);
  return g;
}
// Round bar from A to B.
function bar(A, B, r, n = 10) {
  const d = new THREE.Vector3(B[0] - A[0], B[1] - A[1], B[2] - A[2]), l = d.length(), g = new THREE.CylinderGeometry(r, r, l, n, 1);
  g.translate(0, l / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())); g.translate(A[0], A[1], A[2]);
  return g;
}
const mix = (A, B, u) => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u];
// piston lines: back to shoulder, upper arm to forearm
const SA = [-0.08, 1.54, 0.34], SB = [0.22, 1.55, 0.47], EA = [0.1, 1.2, 0.56], EB = [0.26, 0.72, 0.56];
const ST = [-0.08, 1.42, 0];   // pivot of the column stack on the back
const SD = [SB[0] - SA[0], SB[1] - SA[1], SB[2] - SA[2]], ED = [EB[0] - EA[0], EB[1] - EA[1], EB[2] - EA[2]];
const SDR = [SD[0], SD[1], -SD[2]], EDR = [ED[0], ED[1], -ED[2]];   // the same lines on the right side
function pump(rod, dir, d) { rod.position.x += dir[0] * d; rod.position.y += dir[1] * d; rod.position.z += dir[2] * d; }
// quarry lamp: centre and direction of the beam
const LC = [0.52, 0.94, 0], LD = new THREE.Vector3(0.97, -0.26, 0).normalize(), LQ = new THREE.Quaternion().setFromUnitVectors(UP, LD);
const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v, STP = [{}, {}, {}, {}];
// One limb in the step cycle. q = place in the cycle (0..1), duty = part of the cycle with the limb on the ground.
// f = place along the step (+1 front, -1 back). l = lift (0..1): fast up, reach forward, plant. load = weight on the limb. land = just after it lands.
function stride(q, duty, o) {
  q -= Math.floor(q);
  if (q < duty) { o.f = 1 - 2 * q / duty; o.l = 0; o.load = Math.sin(Math.PI * q / duty); o.land = q < 0.18 ? Math.sin(Math.PI * q / 0.18) : 0; }
  else { const r = (q - duty) / (1 - duty); o.f = -1 + 2 * r * r * (3 - 2 * r); o.l = Math.sin(Math.PI * Math.pow(r, 0.72)); o.load = 0; o.land = 0; }
  return o;
}
// one fist of the ultimate. q = place in the beat (0..1). Returns [up, hit]: up = 1 when the fist is high, hit = 1 at the blow.
function beat(q) {
  q -= Math.floor(q);
  return [q < 0.55 ? A.ease(q / 0.55) : q < 0.8 ? 1 - Math.pow((q - 0.55) / 0.25, 2) : 0, Math.exp(-(q >= 0.8 ? q - 0.8 : q + 0.2) * 9)];
}

let hazardTex = null;
export default {
  id: 'basaltgorilla', rim: '#ffb070', focus: 'lamp', top: 1.95, rough: 0.85, opts: { cell: 0.028, mottle: 0.1, mottleF: 13, sb: 0.05 },
  // the basalt columns on the back are heavy and loose: they shift late and settle after each start, stop and turn
  dyn: [
    { b: ['stack'], k: 95, d: 5, amt: 0.3, drag: 0 },
    { b: ['colA'], k: 75, d: 4.5, amt: 0.14, drag: 0, dir: [-0.6, 0.8, 0] }, { b: ['hot'], k: 75, d: 4.5, amt: 0.14, drag: 0, dir: [-0.6, 0.8, 0] },
    { b: ['colB'], k: 55, d: 3.8, amt: 0.2, drag: 0, dir: [-0.6, 0.8, 0] }
  ],
  rig: { head: 'head', neck: ['neck'] },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('hips', 'root', [-0.32, 0.72, 0]).bone('chest', 'hips', [-0.02, 1.0, 0]).bone('neck', 'chest', [0.34, 1.3, 0]).bone('head', 'neck', [0.46, 1.32, 0]).bone('jaw', 'head', [0.58, 1.22, 0])
      .bone('stack', 'chest', ST).bone('armL', 'chest', [0.28, 1.3, 0.46], { m: 1 }).bone('foreL', 'armL', [0.44, 0.79, 0.54], { m: 1 }).bone('fistL', 'foreL', [0.56, 0.33, 0.54], { m: 1 })
      .bone('legL', 'hips', [-0.42, 0.56, 0.3], { m: 1 }).bone('shinL', 'legL', [-0.4, 0.37, 0.32], { m: 1 }).bone('footL', 'shinL', [-0.42, 0.14, 0.33], { m: 1 });
    const FE = { col: IRON, metal: 1, gloss: 0.6, k: 0.012 }, BR = { col: BRASS, metal: 1, gloss: 0.6, k: 0.012 };
    S.color(ROCK);
    // torso: blocks along a sloped spine (40 degrees)
    S.box('hips', [-0.36, 0.68, 0], [0.26, 0.24, 0.31], 0.07, { k: 0.025 });
    S.box('chest', [-0.1, 0.9, 0], [0.24, 0.25, 0.33], 0.07, { k: 0.03, rot: [0, 0, 40], col: DARK });
    S.box('chest', [0.18, 1.14, 0], [0.3, 0.33, 0.45], 0.08, { k: 0.03, rot: [0, 0, 40] });
    S.box('chest', [-0.05, 1.417, 0], [0.27, 0.1, 0.35], 0.05, { k: 0.02, rot: [0, 0, 40], col: ROCK2 });
    S.cap('neck', [0.28, 1.3, 0], [0.48, 1.32, 0], 0.2, 0.17, { k: 0.04, col: DARK });
    S.box('chest', [0.485, 0.935, 0.235], [0.16, 0.065, 0.19], 0.04, { k: 0.015, rot: [0, 0, 40], col: ROCK2, m: 1 });
    S.box('chest', [0.09, 0.69, 0], [0.13, 0.05, 0.22], 0.035, { k: 0.015, rot: [0, 0, 40], col: ROCK2 });
    S.box('hips', [-0.6, 0.78, 0], [0.07, 0.15, 0.22], 0.04, { k: 0.015, rot: [0, 0, 12], col: ROCK2 });
    // chest vents: 3 slots in each chest plate. Steel seat of the quarry lamp between the plates.
    for (let i = -1; i <= 1; i++) S.box('chest', [0.51 + i * 0.066, 0.905 + i * 0.055, 0.235], [0.027, 0.05, 0.13], 0.01, { sub: 1, k: 0.008, rot: [0, 0, 40], col: '#ff9a36', glow: 1.8, m: 1 });
    S.cap('chest', [0.4, 0.99, 0], [0.5, 0.945, 0], 0.15, 0.165, FE);
    // head: small, heavy brow, crest, large jaw
    S.box('head', [0.56, 1.34, 0], [0.17, 0.16, 0.17], 0.06, { k: 0.03 });
    S.box('head', [0.71, 1.25, 0], [0.085, 0.07, 0.12], 0.04, { k: 0.02, col: ROCK2 });
    S.box('head', [0.7, 1.462, 0], [0.09, 0.05, 0.2], 0.03, { k: 0.015, rot: [0, 0, -12], col: DARK });
    S.box('head', [0.5, 1.51, 0], [0.15, 0.06, 0.07], 0.035, { k: 0.02, rot: [0, 0, 18], col: ROCK2 });
    S.box('jaw', [0.69, 1.165, 0], [0.12, 0.055, 0.145], 0.035, { k: 0.015, col: LIGHT });
    S.ell('head', [0.795, 1.27, 0.045], [0.03, 0.025, 0.028], { m: 1, sub: 1, col: '#ff9a40', glow: 1.6, k: 0.01 });
    // arms: shoulder block, upper arm with a plate, brass elbow, huge forearm with 2 steel bands, fist
    S.box('armL', [0.3, 1.34, 0.5], [0.21, 0.19, 0.2], 0.07, { m: 1, k: 0.03, rot: [0, 0, 20] });
    S.cap('armL', [0.3, 1.26, 0.5], [0.44, 0.8, 0.54], 0.165, 0.145, { m: 1, k: 0.03, col: DARK });
    S.box('armL', [0.38, 1.02, 0.54], [0.135, 0.15, 0.17], 0.05, { m: 1, k: 0.02, rot: [0, 0, 17], col: ROCK2 });
    S.ell('foreL', [0.44, 0.79, 0.54], 0.165, { m: 1, k: 0.02, col: BRASS, metal: 1, gloss: 0.55 });
    S.cap('foreL', [0.45, 0.76, 0.54], [0.56, 0.36, 0.54], 0.17, 0.22, { m: 1, k: 0.03, col: DARK });
    S.box('foreL', [0.525, 0.52, 0.54], [0.2, 0.15, 0.215], 0.06, { m: 1, k: 0.02, rot: [0, 0, 15] });
    S.tor('foreL', [0.47, 0.69, 0.54], 0.2, 0.04, O(FE, { m: 1, rot: [0, 0, 15] }));
    S.tor('foreL', [0.565, 0.345, 0.54], 0.215, 0.04, O(FE, { m: 1, rot: [0, 0, 15] }));
    // brass bolts on the steel bands
    for (const [cx, cy, R] of [[0.47, 0.69, 0.235], [0.565, 0.345, 0.25]]) for (const dg of [-60, 0, 60, 120, 180, 240]) {
      const c = Math.cos(dg * D2R) * R, s = Math.sin(dg * D2R) * R;
      S.ell('foreL', [cx + c * 0.966, cy + c * 0.259, 0.54 + s], 0.034, O(BR, { m: 1, k: 0.008 }));
    }
    S.box('fistL', [0.63, 0.16, 0.54], [0.21, 0.16, 0.2], 0.07, { m: 1, k: 0.025, col: ROCK2 });
    for (let i = 0; i < 4; i++) S.ell('fistL', [0.82, 0.13, 0.4 + i * 0.095], [0.07, 0.085, 0.052], { m: 1, k: 0.018, col: LIGHT });
    S.cap('fistL', [0.6, 0.27, 0.36], [0.76, 0.21, 0.35], 0.07, 0.06, { m: 1, k: 0.02, col: LIGHT });
    // short legs
    S.cap('legL', [-0.42, 0.56, 0.3], [-0.4, 0.37, 0.32], 0.21, 0.19, { m: 1, k: 0.03, col: DARK });
    S.cap('shinL', [-0.4, 0.37, 0.32], [-0.44, 0.24, 0.33], 0.185, 0.17, { m: 1, k: 0.03, col: DARK });
    S.box('shinL', [-0.36, 0.42, 0.34], [0.11, 0.1, 0.16], 0.04, { m: 1, k: 0.02, col: ROCK2 });
    S.box('footL', [-0.36, 0.09, 0.34], [0.25, 0.09, 0.17], 0.05, { m: 1, k: 0.025 });
    for (let i = -1; i <= 1; i++) S.ell('footL', [-0.12, 0.07, 0.34 + i * 0.11], [0.07, 0.06, 0.055], { m: 1, k: 0.015, col: LIGHT });
    S.tor('shinL', [-0.44, 0.215, 0.33], 0.175, 0.035, O(FE, { m: 1 }));
    // brass mounts of the pistons
    S.box('chest', [SA[0] - 0.02, SA[1] - 0.05, SA[2]], [0.09, 0.075, 0.08], 0.02, O(BR, { m: 1 }));
    S.box('armL', [EA[0] + 0.03, EA[1], EA[2]], [0.07, 0.08, 0.08], 0.02, O(BR, { m: 1 }));

    // The warning stripes are textured plates (see hazardTex below). Painted stripes became a blur,
    // because colour is stored for each vertex of the body.
    // orange heat in the old cracks. The cracks are not straight.
    // Each crack is a groove that is cut into the rock (sub), with the heat inside. A thin painted line would break
    // into dashes and blur, because colour is stored for each vertex of the body.
    const HEAT = { sub: 1, col: AMBER, glow: 2.3, k: 0.008 };
    const crack = (bn, pts, r, m) => { for (let i = 0; i < pts.length - 1; i++) S.cap(bn, pts[i], pts[i + 1], Math.max(0.032, r), Math.max(0.026, r * (i === pts.length - 2 ? 0.6 : 1)), Object.assign({ m }, HEAT)); };
    crack('chest', [[0.26, 0.8, 0.36], [0.12, 0.86, 0.365], [0.04, 1.02, 0.37], [-0.14, 1.07, 0.37], [-0.3, 1.24, 0.37]], 0.03, 1);
    crack('chest', [[0.26, 0.8, 0.36], [0.2, 0.74, 0.2], [0.27, 0.77, 0]], 0.028, 1);
    crack('hips', [[-0.12, 0.62, 0.3], [-0.26, 0.76, 0.31], [-0.36, 0.77, 0.31], [-0.5, 0.94, 0.3]], 0.028, 1);
    crack('hips', [[-0.52, 0.925, 0.24], [-0.44, 0.925, 0.08], [-0.53, 0.925, -0.08], [-0.45, 0.925, -0.24]], 0.026, 0);
    crack('armL', [[0.12, 1.2, 0.72], [0.28, 1.17, 0.715], [0.5, 1.24, 0.71]], 0.026, 1);
    crack('armL', [[0.28, 1.17, 0.71], [0.3, 1.05, 0.715]], 0.022, 1);
    S.tor('foreL', [0.56, 0.41, 0.54], 0.25, 0.03, Object.assign({ m: 1, rot: [0, 0, 15] }, HEAT));
    crack('foreL', [[0.66, 0.66, 0.72], [0.7, 0.54, 0.74], [0.66, 0.44, 0.75]], 0.024, 1);
    for (let i = 0; i < 3; i++) S.ell('fistL', [0.84, 0.14, 0.4475 + i * 0.095], [0.035, 0.07, 0.028], Object.assign({ m: 1 }, HEAT));
    crack('legL', [[-0.28, 0.2, 0.5], [-0.42, 0.24, 0.51], [-0.58, 0.2, 0.5]], 0.024, 1);
    S.ell('head', [0.5, 1.51, 0.075], [0.12, 0.03, 0.03], Object.assign({ m: 1, rot: [0, 0, 18] }, HEAT));
    // soot and lamp light on the chest round the lamp
    // (no soft light paint on the chest: it became a blur. The lamp part gives the light.)

    // worn yellow and black warning stripes: steel plates with a texture, bolted on the upper arms, the knees and the rear
    hazardTex = hazardTex || canvasTex(128, 128, (g, W, H) => {
      g.fillStyle = '#e2b21c'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#17181c';
      for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 16, 0); g.lineTo(i * 32 + 16 + H, H); g.lineTo(i * 32 + H, H); g.closePath(); g.fill(); }
      g.strokeStyle = 'rgba(70,72,80,0.85)'; g.lineCap = 'round';      // wear: scratches down to the steel
      for (const [x0, y0, x1, y1, w] of [[14, 30, 52, 22, 5], [70, 96, 112, 88, 6], [30, 104, 44, 78, 4], [92, 20, 104, 44, 4], [56, 60, 74, 56, 3]]) { g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
      g.strokeStyle = '#17181c'; g.lineWidth = 7; g.strokeRect(3, 3, W - 6, H - 6);
    });
    const HAZM = { col: '#e6e6e6', map: hazardTex, metal: 0.35, rough: 0.55, env: 0.6 };
    S.add('armL', rbox(0.25, 0.28, 0.024), HAZM, { p: [0.38, 1.02, 0.748], r: [0, 0, 17], m: 1, name: 'hazArmL' });
    S.add('legL', rbox(0.024, 0.18, 0.3), HAZM, { p: [-0.286, 0.42, 0.34], m: 1, name: 'hazLegL' });
    S.add('hips', rbox(0.024, 0.28, 0.42), HAZM, { p: [-0.712, 0.79, 0], r: [0, 0, 12], name: 'hazHip' });
    // basalt columns on the back: dark and light, some with a hot top. Their positions are relative to the stack pivot.
    const dk = [], lt = [], hot = [], col = (list, r, h, q, lean, out, turn, glow) => {
      const p = [q[0] - ST[0], q[1] - ST[1], q[2] - ST[2]];
      list.push(column(r, h, p, lean, out, turn));
      if (glow) { const g = new THREE.CylinderGeometry(r * 0.52, r * 0.52, 0.03, 6); g.translate(0, h + 0.006, 0); g.rotateY(turn * D2R); g.rotateX(out * D2R); g.rotateZ(lean * D2R); g.translate(p[0], p[1], p[2]); hot.push(g); }
    };
    col(dk, 0.13, 0.36, [0.0, 1.5, 0], 16, 0, 0, 1); col(lt, 0.145, 0.5, [-0.15, 1.36, 0], 28, 0, 30); col(dk, 0.125, 0.4, [-0.33, 1.2, 0], 42, 0, 10, 1); col(lt, 0.11, 0.28, [-0.36, 1.02, 0], 56, 0, 30);
    for (const sg of [1, -1]) {
      col(lt, 0.1, 0.3, [-0.06, 1.45, 0.2 * sg], 22, 14 * sg, 20); col(dk, 0.105, 0.36, [-0.24, 1.28, 0.21 * sg], 36, 16 * sg, 0, sg > 0);
      col(lt, 0.09, 0.26, [-0.36, 1.1, 0.2 * sg], 50, 18 * sg, 15); col(dk, 0.08, 0.2, [0.1, 1.52, 0.17 * sg], 8, 10 * sg, 5);
    }
    S.add('stack', join(dk), BAS1, { p: ST, name: 'colA' });
    S.add('stack', join(lt), BAS2, { p: ST, name: 'colB' });
    S.add('stack', join(hot), EMBER, { p: ST, name: 'hot' });
    // columns on the shoulders
    S.add('armL', join([column(0.105, 0.3, [0.26, 1.44, 0.52], 10, 18, 0), column(0.075, 0.24, [0.14, 1.42, 0.59], 28, 28, 20)]), BAS1, { m: 1 });
    S.add('armL', column(0.085, 0.22, [0.4, 1.43, 0.6], -16, 30, 10), BAS2, { m: 1 });
    // columns on the fore-arms: they stand along the arm and end in a crown above the elbow. The piston runs between them.
    S.add('foreL', join([column(0.1, 0.58, [0.41, 0.3, 0.705], 16, -5, 0), column(0.08, 0.44, [0.59, 0.33, 0.72], 13, -7, 20)]), BAS1, { m: 1 });
    S.add('foreL', join([column(0.088, 0.5, [0.41, 0.3, 0.385], 17, 5, 30), column(0.07, 0.36, [0.5, 0.52, 0.735], 15, -8, 10)]), BAS2, { m: 1 });
    // pistons: dark steel cylinder with brass collars, bright rod that slides, brass ball joints
    S.add('chest', join([bar(SA, mix(SA, SB, 0.6), 0.078, 12), ball(0.086, 10, 8).translate(SA[0], SA[1], SA[2])]), DSTEEL, { m: 1 });
    S.add('chest', join([bar(mix(SA, SB, 0.48), mix(SA, SB, 0.62), 0.092, 12), bar(mix(SA, SB, 0.16), mix(SA, SB, 0.24), 0.092, 12)]), BRASSM, { m: 1 });
    S.add('chest', bar([0, 0, 0], mix([0, 0, 0], SD, 0.62), 0.04, 8), CHROME, { p: mix(SA, SB, 0.42), name: 'rodL', m: 1 });
    S.add('armL', ball(0.078, 10, 8), BRASSM, { p: SB, m: 1 });
    S.add('armL', join([bar(EA, mix(EA, EB, 0.6), 0.072, 12), ball(0.08, 10, 8).translate(EA[0], EA[1], EA[2])]), DSTEEL, { m: 1 });
    S.add('armL', join([bar(mix(EA, EB, 0.5), mix(EA, EB, 0.62), 0.086, 12), bar(mix(EA, EB, 0.12), mix(EA, EB, 0.2), 0.086, 12)]), BRASSM, { m: 1 });
    S.add('armL', bar([0, 0, 0], mix([0, 0, 0], ED, 0.6), 0.038, 8), CHROME, { p: mix(EA, EB, 0.42), name: 'ramL', m: 1 });
    S.add('foreL', ball(0.074, 10, 8), BRASSM, { p: EB, m: 1 });
    // brass pressure pipes: back to chest plate, back to hip
    S.add('chest', tube([[-0.1, 1.5, 0.13], [0.15, 1.63, 0.2], [0.39, 1.43, 0.25], [0.57, 1.21, 0.26], [0.64, 1.06, 0.24]], [0.03, 0.028, 0.028, 0.028, 0.026], { ring: 7 }), BRASSM, { m: 1 });
    S.add('chest', tube([[-0.2, 1.4, 0.36], [-0.12, 1.2, 0.48], [-0.14, 0.98, 0.44], [-0.22, 0.8, 0.36]], [0.028, 0.028, 0.026, 0.024], { ring: 7 }), BRASSM, { m: 1 });
    // quarry lamp in the chest (heart piece): steel can, brass rim and cage, bright lens
    const aim = g => g.applyQuaternion(LQ);
    S.add('chest', aim(lathe([[0.001, -0.08], [0.12, -0.08], [0.155, -0.04], [0.162, 0.06], [0.145, 0.066], [0.14, 0.05], [0.001, 0.05]], 18)), DSTEEL, { p: LC });
    const bow = torus(0.152, 0.014, 14, 6, Math.PI); bow.scale(1, 0.55, 1); bow.translate(0, 0.064, 0);
    S.add('chest', aim(join([torus(0.152, 0.024, 22, 7).rotateX(Math.PI / 2).translate(0, 0.066, 0), bow, bow.clone().rotateY(Math.PI / 2), ball(0.03, 8, 6).translate(0, 0.15, 0)])), BRASSM, { p: LC });
    S.add('chest', aim(ball(0.136, 18, 10).scale(1, 0.42, 1).translate(0, 0.052, 0)), LAMPM, { p: LC, name: 'lamp' });
    // the light of the lamp: a faint cone that fades with the distance
    beamTex = beamTex || canvasTex(8, 64, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, '#5a5a5a'); gr.addColorStop(0.7, '#161616'); gr.addColorStop(1, '#000000'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
    S.add('chest', aim(new THREE.ConeGeometry(0.27, 0.72, 20, 1, true).rotateX(Math.PI).translate(0, 0.43, 0)), { basic: true, col: '#c07826', map: beamTex, add: true, side: true, noOut: true }, { p: LC, name: 'beam' });
    // maker's mark: six-sided stamp in white paint on the right shoulder
    S.add('armR', join([new THREE.RingGeometry(0.074, 0.108, 6), new THREE.CircleGeometry(0.036, 6)]).rotateY(Math.PI), STAMP, { p: [0.3, 1.365, -0.713], r: [0, 0, 20], name: 'stamp' });
    // teeth of the lower jaw; the column for the throw (the model shows it only for a shot)
    S.add('jaw', new THREE.ConeGeometry(0.035, 0.11, 4).translate(0, 0.055, 0), TOOTH, { p: [0.77, 1.2, 0.09], r: [0, 0, -8], m: 1 });
    S.add('fistL', column(0.12, 0.62, [0, -0.31, 0], 0, 0, 0).rotateX(90 * D2R), BAS2, { p: [0.66, 0.17, 0.54], name: 'rock' });
    // eyes: lamps under a heavy brow, with a pupil. Proud, not cruel.
    S.eye('head', [0.735, 1.36, 0.095], 0.054, { dir: [0.95, 0, 0.3], sclera: '#2a1408', iris: '#ff9a1e', iris2: '#ffe27a', pupil: 'round', lid: DARK, open: 38, tilt: -13, glow: 1.1, size: 56, m: 1 });
  },
  anim(b, t, c) {
    // u: the ultimate (Faultline Overdrive). It takes the place of the wind-up and the strike of the other poses.
    const u = A.ease(t.u || 0), nu = 1 - u, P = c.parts, tm = t.tm;
    const br = Math.sin(t.p), a = t.a * nu, s = t.s * nu, h = t.h, k = t.k, mv = t.mv;
    const melee = k === 'melee', shot = k === 'shot', slam = k === 'slam', buff = k === 'buff', vent = buff ? Math.min(1, a + s) : 0;
    const ov = Math.sin(Math.min(1, s) * Math.PI);   // follow-through: 0 at the hit, a peak a moment later, 0 at the end
    // ultimate: the fists pound the ground in turn. Each fist: 2 blows each second, so 4 blows each second together.
    const [upL, hitL] = beat(tm * 2), [upR, hitR] = beat(tm * 2 + 0.5), dnL = u * (1 - upL), dnR = u * (1 - upR), hit = u * Math.max(hitL, hitR);
    // motion of the body: F = forward part of the step, Sd = side part, trot = 0 for 4 separate beats and 1 when arm and opposite leg move together
    const sp = Math.hypot(t.vf, t.vs), spd = Math.min(1, sp / 2.6), tn = t.tn, noV = cl(1 - sp / 0.3 - Math.abs(tn) / 0.2, 0, 1);
    const F = cl(t.vf / 2.2, -1, 1) + noV, Sd = cl(t.vs / 2.2, -1, 1), trot = A.ease((spd - 0.45) / 0.35), duty = 0.66 - 0.12 * trot;
    const hx = t.hx || t.hz ? t.hx : -1, hb = h * -hx, hsd = h * t.hz;   // hb: pushed to the rear. hsd: pushed to the L side.
    const idle = (1 - mv) * nu * (1 - a), sway = Math.sin(tm * 0.6) * Math.sin(tm * 0.2 + 1) * idle, look = Math.sin(tm * 0.29 + 2) * Math.sin(tm * 0.77) * idle;
    // memory between frames: the basalt columns shift and settle after a hit
    const M = c.bg || (c.bg = { tm, x: 0, v: 0, h: 0 }), dt = cl(tm - M.tm, 0, 0.05); M.tm = tm;
    if (h > M.h + 0.4) M.v += 2.6;
    M.h = h; M.v += (-M.x * 150 - M.v * 5) * dt; M.x = cl(M.x + M.v * dt, -0.4, 0.4);

    // knuckle walk. Arms: reach, plant, carry the weight, push. Legs: short steps with knees that bend.
    const amt = mv * cl(Math.abs(F) + Math.abs(Sd) + Math.abs(tn), 0.35, 1) * nu, stepK = amt * cl(Math.abs(F), 0, 1), sit = cl(-t.va * 0.012, 0, 0.07);
    const oL = stride(t.w / TAU + 0.75 - 0.25 * trot, duty, STP[0]), oR = stride(t.w / TAU + 0.27 - 0.25 * trot, duty, STP[1]);
    const gL = stride(t.w / TAU, duty, STP[2]), gR = stride(t.w / TAU + 0.52, duty, STP[3]);
    const inL = 1 - 0.3 * tn * spd, inR = 1 + 0.3 * tn * spd, latT = tn * 0.5 * (1 - 0.6 * spd);
    const thL = oL.f * F * inL * 0.4 * amt, thR = oR.f * F * inR * 0.4 * amt;
    let aL = thL + oL.l * amt * 0.3, aR = thR + oR.l * amt * 0.3, fL = oL.l * amt * 0.6, fR = oR.l * amt * 0.6;
    const ldL = oL.load * amt, ldR = oR.load * amt, sup = ldL - ldR, land = (oL.land + oR.land) * amt;
    // the shoulder lifts with the arm in the air; it comes down so that the fist stays on the ground at the two ends of the step
    b.armL.position.y += oL.l * amt * 0.07 - 1.25 * (1 - Math.cos(thL)) * (1 - oL.l) * 0.7 + land * 0.02;
    b.armR.position.y += oR.l * amt * 0.07 - 1.25 * (1 - Math.cos(thR)) * (1 - oR.l) * 0.7 + land * 0.02;
    b.armL.rotation.x -= oL.f * (Sd * 0.8 + latT) * 0.25 * amt + Math.max(0, hsd) * 0.25; b.armR.rotation.x -= oR.f * (Sd * 0.8 + latT) * 0.25 * amt + Math.min(0, hsd) * 0.25;
    for (let i = 0; i < 2; i++) {
      const sd = i ? -1 : 1, o = i ? gR : gL, th = o.f * F * (i ? inR : inL) * 0.5 * amt, lf = o.l * amt, lg = b[i ? 'legR' : 'legL'], sh = b[i ? 'shinR' : 'shinL'];
      lg.rotation.z = th + lf * 0.45 - hb * 0.2 + sit * 2;
      lg.rotation.x = -o.f * (Sd * 0.8 - latT) * 0.3 * amt - sd * (u * 0.14 + Math.max(0, hsd * sd) * 0.25);
      sh.rotation.z = -lf * 1.0 - sit * 4;
      lg.position.y -= 0.55 * (1 - Math.cos(th)) * (1 - o.l);
      lg.scale.y = 1 + u * 0.125;                                         // ultimate: it stands tall on straight legs with the feet apart
      const ft = b[i ? 'footR' : 'footL']; ft.rotation.z = -(lg.rotation.z + sh.rotation.z) - lf * 0.3; ft.rotation.x = -lg.rotation.x;
    }
    // hips and chest: they turn against each other; the heavy chest swings over the arm that carries the weight; it drops when a fist lands
    b.hips.position.y += br * 0.008 - a * 0.05 + (slam ? a * 0.12 - s * 0.08 : 0) + u * 0.07 - hit * 0.04 - (gL.land + gR.land) * 0.012 * amt - sit;
    b.hips.position.x += (melee ? s * 0.22 : slam ? s * 0.1 : shot ? s * 0.08 : 0) - a * 0.08 - u * 0.06 - hb * 0.05;
    b.hips.rotation.x = (gL.l - gR.l) * 0.04 * amt - sway * 0.025;
    b.hips.rotation.y = (gL.f - gR.f) * 0.04 * stepK + tn * 0.1;
    b.hips.rotation.z = hb * 0.08;
    let lean = br * 0.012 + hb * 0.13 + h * 0.03 + u * 0.35 - land * 0.035, twist = (oL.f - oR.f) * 0.07 * stepK - tn * 0.25;
    if (slam) {             // pile-driver: both fists go up, then down into the ground
      aL += a * 2.3 + s * 0.42; aR += a * 2.3 + s * 0.42; fL += a * 0.5 - s * 0.2; fR += a * 0.5 - s * 0.2; lean += a * 0.42 - s * 0.3 - ov * 0.06;
    } else if (shot) {      // column throw: the left arm goes up and back, then throws
      aL += a * 2.75 + s * 1.0; fL += a * 0.35 - s * 0.2; aR += -a * 0.2 + s * 0.3; lean += a * 0.3 - s * 0.34; twist += -a * 0.3 + s * 0.4 + ov * 0.1;
    } else if (melee) {     // grab: the left arm goes back, then reaches far forward and comes down
      aL += -a * 0.55 + s * 1.3; fL += a * 0.5 - s * 0.15; aR += s * 0.2; lean += a * 0.12 - s * 0.26; twist += -a * 0.38 + s * 0.5 + ov * 0.12;
    } else {                // steam vent: chest out, shoulders up, arms open
      lean += vent * 0.3; aL -= vent * 0.3; aR -= vent * 0.3; fL += vent * 0.5; fR += vent * 0.5;
      b.armL.position.y += vent * 0.1; b.armR.position.y += vent * 0.1;
      b.armL.rotation.x -= vent * 0.4; b.armR.rotation.x += vent * 0.4;
    }
    // ultimate: one arm goes high while the other one drives its fist into the ground. The shoulder of the blow drops.
    aL += u * (-0.22 + upL * 2.2); aR += u * (-0.22 + upR * 2.2); fL += u * upL * 0.6; fR += u * upR * 0.6;
    twist += (dnL - dnR) * 0.16;
    const roll = sup * 0.09 + sway * 0.035 + hsd * 0.12 + (dnL - dnR) * 0.2;
    b.chest.rotation.z = lean; b.chest.rotation.y = twist; b.chest.rotation.x = roll;
    b.chest.position.z += sup * 0.03; b.chest.position.y -= land * 0.02;
    b.chest.scale.setScalar(1 + br * 0.016 + vent * 0.1 + a * 0.02 + u * 0.05);
    b.armL.rotation.z = aL - hb * 0.12 + sway * 0.04; b.armR.rotation.z = aR - hb * 0.12 - sway * 0.04;
    b.foreL.rotation.z = fL + h * 0.3; b.foreR.rotation.z = fR + h * 0.3;
    b.foreL.position.multiplyScalar(1 + dnL * 0.22); b.foreR.position.multiplyScalar(1 + dnR * 0.22);   // the piston drives the fore-arm out
    b.fistL.rotation.z = -fL * 0.5 - dnL * 0.25 - oL.l * amt * 0.35; b.fistR.rotation.z = -fR * 0.5 - dnR * 0.25 - oR.l * amt * 0.35;
    // neck and head: the head stays level when the chest swings and turns
    b.neck.rotation.z = -lean * 0.35 + u * 0.12; b.neck.rotation.x = -roll * 0.5; b.neck.rotation.y = -twist * 0.4 + look * 0.12;
    b.head.rotation.z = -lean * 0.35 - br * 0.02 + hb * 0.3 + vent * 0.35 + (slam ? s * 0.2 : 0) + u * 0.18 - hit * 0.1 + land * 0.03 + ov * 0.08;
    b.head.rotation.y = t.lk * 0.3 - twist * 0.4 + look * 0.22 - hsd * 0.3;
    b.head.rotation.x = -roll * 0.5 + Math.sin(tm * 0.21 + 3) * idle * 0.06 + hsd * 0.1;
    b.jaw.rotation.z = -(0.02 + a * 0.2 + s * 0.4 + h * 0.3 + vent * 0.45 + Math.max(0, br) * 0.03 + u * (0.4 + 0.08 * Math.sin(tm * 25)));
    // back columns (spring parts): they shake and rise when the power grows; they jump at each blow; they shift and settle after a hit
    const rise = vent * 0.07 + t.gl * (0.02 + 0.012 * Math.sin(tm * 9)) + a * 0.02 + u * 0.04 + hit * 0.06 + Math.abs(M.x) * 0.1;
    b.stack.position.y += rise * 0.4; b.stack.rotation.z = hb * 0.08 - hit * 0.05 - ov * 0.05 + M.x * 0.2 - land * 0.015;
    P.colA.position.y += rise - M.x * 0.03; P.colB.position.y += rise * 0.5 + M.x * 0.07 + Math.sin(tm * 31) * 0.006 * (vent + t.gl + u);
    P.hot.position.y += rise - M.x * 0.03 + (vent + t.gl + u) * (0.012 + 0.008 * Math.sin(tm * 13));
    // pistons: each rod slides along its line with the motion of the arm; it comes out when its arm carries the weight
    pump(P.rodL, SD, 0.08 * Math.sin(aL * 0.8) + br * 0.02 + vent * 0.08 + ldL * 0.07); pump(P.rodR, SDR, 0.08 * Math.sin(aR * 0.8) + br * 0.02 + vent * 0.08 + ldR * 0.07);
    pump(P.ramL, ED, -fL * 0.12 + br * 0.01 + dnL * 0.2 + ldL * 0.06); pump(P.ramR, EDR, -fR * 0.12 + br * 0.01 + dnR * 0.2 + ldR * 0.06);
    // quarry lamp: a slow hum; brighter and larger with the power
    P.lamp.scale.setScalar(1 + 0.04 * Math.sin(tm * 5.3) + t.gl * 0.1 + a * 0.08 + s * 0.12 + u * 0.12 + hit * 0.15);
    P.beam.scale.setScalar(1 + 0.03 * Math.sin(tm * 5.3) + t.gl * 0.15 + u * 0.15 + hit * 0.08);
    const rock = P.rock;
    rock.visible = shot && a > 0.04;
    rock.scale.setScalar(Math.max(0.01, Math.min(1, a * 2.5)));
  }
};
// options with extra fields
function O(base, extra) { return Object.assign({}, base, extra); }
