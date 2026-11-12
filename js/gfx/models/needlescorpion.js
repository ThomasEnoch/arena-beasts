/* Needlescorpion (Seamsting) - sewing engine in the shape of a scorpion: ivory plates with gold seams, steel scissor claws,
   a golden needle tail, a bobbin of glowing violet thread on the back (heart piece), a red pin cushion, thimbles on the feet. Venom / Iron. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, cone, ball, torus, lathe, wing, canvasTex } from '../geo.js';

const IVORY = '#e1d9c6', IVORY2 = '#cdc1a4', UNDER = '#8d8370', GOLD = '#d6aa42', DGOLD = '#8e6c28', RED = '#b3222c', DRED = '#6e1219';
const SILV = { col: '#c6ced8', metal: 1, rough: 0.2, env: 1.3 };
const STEEL = { col: '#d2dae4', metal: 1, rough: 0.1, env: 1.6 };
const GOLDM = { col: '#e4ba4a', metal: 0.9, rough: 0.22, env: 1.2 };
const NEEDLE = { col: '#f0c64e', metal: 0.85, rough: 0.16, glow: '#ffb030', glowK: 0.45, env: 1.3 };
const THREAD = { col: '#5a30d8', glow: '#6a2cff', glowK: 2.0, noOut: true };
const PEARL = { col: '#ded8cc', rough: 0.2, env: 1.1 };
const LEGM = { col: IVORY, rough: 0.3, env: 0.8 };
const TAILB = ['t1', 't2', 't3', 't4', 't5'];
const TP = [[-0.42, 0.40], [-0.66, 0.56], [-0.80, 0.84], [-0.72, 1.13], [-0.50, 1.33], [-0.24, 1.40]];
const R2D = 180 / Math.PI, ROLL = 30, BX = -0.165, CX = 0.105;   // BX = bobbin, CX = pin cushion
// the scissor plane is rolled outward; the moving blade turns around the normal of that plane
const AXL = new THREE.Vector3(0, Math.cos(ROLL / R2D), Math.sin(ROLL / R2D)), AXR = new THREE.Vector3(0, -Math.cos(ROLL / R2D), Math.sin(ROLL / R2D));
// shell plates: [cx, cy, rx, ry, rz]
const HEAD = [0.36, 0.34, 0.26, 0.15, 0.27];
const PLATES = [[0.14, 0.37, 0.13, 0.17, 0.3], [-0.01, 0.375, 0.13, 0.175, 0.31], [-0.15, 0.375, 0.125, 0.17, 0.295], [-0.28, 0.375, 0.115, 0.155, 0.26], [-0.39, 0.38, 0.105, 0.14, 0.22]];
// tail in the ultimate: rotation of each tail bone for the needle that stands straight up, and for the stab
const UP = [-0.75, 0.37, 0.65, 0.67, 0.86], DN = [-0.6, -0.37, 0.03, 0.1, 0.09];
function topY(x, z) {
  let y = 0.3;
  for (const e of [HEAD].concat(PLATES)) { const q = 1 - Math.pow((x - e[0]) / e[2], 2) - Math.pow(z / e[4], 2); if (q > 0) y = Math.max(y, e[1] + e[3] * Math.sqrt(q)); }
  return y;
}
const join = gs => mergeGeometries(gs.map(g => { g = g.index ? g.toNonIndexed() : g.clone(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; }));
const _q = new THREE.Quaternion(), _y = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3();
const aim = (g, d) => g.applyQuaternion(_q.setFromUnitVectors(_y, _v.set(d[0], d[1], d[2]).normalize()));   // the +Y axis of g goes to d
// gold S-scroll that lies on the shell: a spiral out of point A, then a spiral into point B
function sScroll(ax, az, bx, bz, ra, rb) {
  const pts = [], n = 14, turns = 1.4, add = (x, z) => pts.push([x, topY(x, z) + 0.004, z]);
  for (let i = 0; i <= n; i++) { const u = i / n, a = -Math.PI / 2 + (1 - u) * turns * 6.2832, r = 0.012 + (ra - 0.012) * u; add(ax + Math.cos(a) * r, az + Math.sin(a) * r); }
  for (let i = 0; i <= n; i++) { const u = i / n, a = Math.PI / 2 + u * turns * 6.2832, r = rb + (0.012 - rb) * u; add(bx + Math.cos(a) * r, bz + Math.sin(a) * r); }
  return tube(pts, pts.map(() => 0.011), { ring: 5, seg: pts.length * 3 });
}
// scissor halves in the scissor frame: x = along the blades, z = side, y = normal of the scissor plane. sg = +1 fixed half, -1 moving half
function bladeGeo(sg) {
  const g = wing([[-0.012 * sg, -0.045], [0.04 * sg, -0.035], [0.058 * sg, 0.03], [0.046 * sg, 0.15], [0, 0.44], [-0.01 * sg, 0.06]], 0.022, { smooth: false });
  g.translate(0, -0.012 * sg, 0);
  return g;
}
function handleGeo(sg) {   // shank and finger ring; the ring is on the opposite side of the blade
  const y = -0.012 * sg, cx = -0.15, cz = -0.07 * sg, R = 0.047, pts = [[-0.01, y, -0.004 * sg], [-0.065, y, -0.026 * sg]];
  const a0 = Math.atan2(-cz, -cx);
  for (let i = 0; i <= 8; i++) { const a = a0 + sg * i * Math.PI / 4; pts.push([cx + Math.cos(a) * R, y, cz + Math.sin(a) * R]); }
  return tube(pts, pts.map(() => 0.014), { ring: 6, seg: 44 });
}
// piece of tape measure on the outer side of tail bead i. The texture goes along the tail.
function tapeGeo(i, r) {
  const a = TP[i], e = TP[i + 1], mx = (a[0] + e[0]) / 2, my = (a[1] + e[1]) / 2, l = Math.hypot(e[0] - a[0], e[1] - a[1]), dx = (e[0] - a[0]) / l, dy = (e[1] - a[1]) / l;
  let nx = -dy, ny = dx;
  if (nx * (mx + 0.33) + ny * (my - 0.95) < 0) { nx = -nx; ny = -ny; }   // the outer side looks away from the centre of the tail curve
  const pos = [], uv = [], idx = [], n = 10, w = 0.036, th0 = 30 / R2D, th1 = 150 / R2D;
  for (let j = 0; j <= n; j++) {
    const u = j / n, th = th1 + (th0 - th1) * u, ca = Math.cos(th) * 0.128, sa = Math.sin(th);
    for (let c = 0; c < 3; c++) {
      const z = (c - 1) * w, h = (Math.sqrt(Math.max(0, r * r - z * z)) + 0.008) * sa + (1 - sa) * 0.01;
      pos.push(mx + dx * ca + nx * h, my + dy * ca + ny * h, z); uv.push((i + u) / 5, c / 2);
    }
    if (j) { const q = (j - 1) * 3; for (let c = 0; c < 2; c++) idx.push(q + c, q + c + 3, q + c + 1, q + c + 1, q + c + 3, q + c + 4); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
let reelTex = null, tapeTex = null;
// legs: [bone, position of the socket, angle of the leg to the front]. KN = the knee in the frame of the leg.
const LEGS = [['leg1L', [0.2, 0.3, 0.25], 26], ['leg2L', [0.02, 0.3, 0.28], -4], ['leg3L', [-0.18, 0.3, 0.26], -34]], KN = [0.01, 0.17, 0.17];
const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v, sm = x => { x = cl(x, 0, 1); return x * x * (3 - 2 * x); };
// one step. u = phase 0..1. The foot is in the air for the first 36%: it goes forward fast. Then it stands and goes back slowly.
const SWG = 0.36, cyc = x => ((x / TAU) % 1 + 1) % 1;
const stride = u => u < SWG ? -Math.cos(Math.PI * sm(u / SWG)) : 1 - 2 * (u - SWG) / (1 - SWG);   // -1 = behind, 1 = in front
const lift = u => u < SWG ? Math.pow(Math.sin(Math.PI * u / SWG), 0.8) : 0;

export default {
  id: 'needlescorpion', rim: '#fff0d0', focus: 'reel', top: 1.58, rough: 0.4,
  opts: { cell: 0.025, mottle: 0.05, mottleF: 14 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.34, 0]).bone('hip', 'body', [-0.08, 0.36, 0]).bone('head', 'body', [0.3, 0.34, 0])
      .bone('armL', 'head', [0.44, 0.33, 0.24], { m: 1 }).bone('clawL', 'armL', [0.66, 0.36, 0.44], { m: 1 }).bone('snipL', 'clawL', [0.895, 0.345, 0.54], { m: 1 })
      .bone('t1', 'hip', [TP[0][0], TP[0][1], 0]).bone('t2', 't1', [TP[1][0], TP[1][1], 0]).bone('t3', 't2', [TP[2][0], TP[2][1], 0])
      .bone('t4', 't3', [TP[3][0], TP[3][1], 0]).bone('t5', 't4', [TP[4][0], TP[4][1], 0])
      .bone('th1', 't5', [-0.03, 1.31, 0]).bone('th2', 'th1', [-0.53, 1.5, 0.03])
      .bone('leg1L', 'body', [0.2, 0.3, 0.25], { m: 1 }).bone('leg2L', 'body', [0.02, 0.3, 0.28], { m: 1 }).bone('leg3L', 'hip', [-0.18, 0.3, 0.26], { m: 1 });
    // each leg has a lower part that turns at the knee
    LEGS.forEach(([bn, p, ry], i) => S.bone('shin' + (i + 1) + 'L', bn, [p[0] + KN[0] * Math.cos(ry / R2D) + KN[2] * Math.sin(ry / R2D), p[1] + KN[1], p[2] - KN[0] * Math.sin(ry / R2D) + KN[2] * Math.cos(ry / R2D)], { m: 1 }));
    S.color(IVORY);
    const pl = { k: 0.014, gloss: 0.5 }, gd = { col: GOLD, metal: 1, gloss: 0.7 };
    // head shield and 5 back plates, with a raised gold seam in each groove
    S.ell('head', [HEAD[0], HEAD[1], 0], [HEAD[2], HEAD[3], HEAD[4]], { k: 0.03, gloss: 0.5 });
    PLATES.forEach((e, i) => S.ell(i < 2 ? 'body' : 'hip', [e[0], e[1], 0], [e[2], e[3], e[4]], Object.assign({ col: i % 2 ? IVORY2 : IVORY }, pl)));
    for (let i = 0; i < 4; i++) { const a = PLATES[i], e = PLATES[i + 1], f = 0.905; S.ell(i < 1 ? 'body' : 'hip', [(a[0] + e[0]) / 2, (a[1] + e[1]) / 2, 0], [0.026, (a[3] + e[3]) / 2 * f, (a[4] + e[4]) / 2 * f], Object.assign({ k: 0.008 }, gd)); }
    S.ell('head', [0.5, 0.37, 0], [0.14, 0.07, 0.2], { k: 0.012, col: IVORY2, gloss: 0.5 });   // raised brow plate
    S.cap('head', [0.5, 0.43, 0.19], [0.585, 0.4, 0.06], 0.03, 0.028, Object.assign({ m: 1, k: 0.01 }, gd));
    S.cap('head', [0.58, 0.28, 0.07], [0.73, 0.215, 0.035], 0.052, 0.022, { m: 1, col: DGOLD, metal: 1, gloss: 0.6, k: 0.02 });
    S.ell('head', [0.6, 0.33, 0], [0.05, 0.05, 0.1], Object.assign({ k: 0.012 }, gd));
    // leg sockets, the seat of the bobbin, the red pin cushion on its gold ring
    for (const [x, z] of [[0.2, 0.24], [0.02, 0.265], [-0.18, 0.25]]) S.ell(x < -0.1 ? 'hip' : 'body', [x, 0.3, z], 0.062, Object.assign({ m: 1, k: 0.012 }, gd));
    S.tor('hip', [BX, 0.53, 0], 0.1, 0.03, Object.assign({ k: 0.01 }, gd));
    S.ell('body', [CX, 0.565, 0], [0.11, 0.09, 0.11], { col: RED, k: 0.014, gloss: 0.05 });
    S.tor('body', [CX, 0.522, 0], 0.104, 0.026, Object.assign({ k: 0.008 }, gd));
    // arms: ivory with a gold band; the knuckle holds one ring of the scissors
    S.cap('armL', [0.44, 0.33, 0.24], [0.65, 0.36, 0.43], 0.082, 0.064, { m: 1, gloss: 0.5, k: 0.03 });
    S.tor('armL', [0.545, 0.345, 0.335], 0.068, 0.027, Object.assign({ m: 1, k: 0.008, rot: [0, -42.1, -84.2] }, gd));
    S.ell('armL', [0.45, 0.34, 0.245], 0.095, Object.assign({ m: 1, k: 0.012 }, gd));
    S.ell('clawL', [0.7, 0.375, 0.455], [0.1, 0.088, 0.094], { m: 1, col: IVORY2, gloss: 0.5, k: 0.012 });
    S.tor('clawL', [0.648, 0.36, 0.428], 0.072, 0.024, Object.assign({ m: 1, k: 0.008, rot: [0, -42.1, -84.2] }, gd));
    S.ell('clawL', [0.725, 0.455, 0.47], 0.03, Object.assign({ m: 1, k: 0.008 }, gd));   // rivet on the knuckle
    // tail: gold core, 5 ivory beads with a gold band, a thimble socket for the needle
    S.tube(TAILB, TP.map(p => [p[0], p[1], 0]), [0.075, 0.07, 0.066, 0.062, 0.058, 0.052], Object.assign({ k: 0.012 }, gd));
    for (let i = 0; i < 5; i++) {
      const a = TP[i], e = TP[i + 1], mx = (a[0] + e[0]) / 2, my = (a[1] + e[1]) / 2, ang = Math.atan2(e[1] - a[1], e[0] - a[0]) * R2D, r = 0.108 - i * 0.007;
      S.ell(TAILB[i], [mx, my, 0], [0.125, r, r], { rot: [0, 0, ang], k: 0.012, col: i % 2 ? IVORY2 : IVORY, gloss: 0.5 });
      S.tor(TAILB[i], [mx, my, 0], r - 0.006, 0.022, Object.assign({ rot: [0, 0, ang - 90], k: 0.008 }, gd));
    }
    S.cap('t5', [-0.26, 1.4, 0], [-0.15, 1.367, 0], 0.076, 0.052, Object.assign({ k: 0.012 }, gd));
    // colour: belly, the seam behind the head, golden running stitches, small side eyes, lobes of the cushion, dimples of the socket
    S.ell('body', [-0.08, 0.2, 0], [0.62, 0.07, 0.28], { paint: 1, col: UNDER, cb: 0.05 });
    S.ell('head', [0.235, 0.4, 0], [0.022, 0.2, 0.3], { paint: 1, col: GOLD, metal: 1, gloss: 0.7, cb: 0.01 });
    PLATES.forEach(e => { const z = e[4] * 0.8; S.ell('body', [e[0], topY(e[0], z), z], [0.042, 0.032, 0.022], { paint: 1, col: GOLD, metal: 1, gloss: 0.7, cb: 0.01, m: 1 }); });
    for (const [x, z] of [[0.36, 0.215], [0.47, 0.19]]) S.ell('head', [x, topY(x, z), z], [0.036, 0.03, 0.022], { paint: 1, col: GOLD, metal: 1, gloss: 0.7, cb: 0.01, m: 1 });
    S.ell('head', [0.56, 0.36, 0.165], 0.022, { paint: 1, col: '#ffe2a0', glow: 1.5, cb: 0.008, m: 1 });
    S.ell('head', [0.53, 0.35, 0.2], 0.02, { paint: 1, col: '#ffe2a0', glow: 1.5, cb: 0.008, m: 1 });
    for (const an of [0, 60, 120]) S.tor('body', [CX, 0.56, 0], 0.107, 0.012, { paint: 1, col: DRED, cb: 0.008, rot: [0, an, 90] });
    for (let i = 0; i < 4; i++) S.ell('t5', [-0.25 + i * 0.03, 1.45 - i * 0.012, 0.04], 0.014, { paint: 1, col: DGOLD, cb: 0.006, m: 1 });
    // old ivory: darker in the folds
    S.paint((p, n, col, info) => { if (info.metal < 0.3 && info.glow < 0.1 && col[0] > 0.5 && col[1] > 0.4) { const e = 1 - info.ao; col[1] *= 1 - e * 0.1; col[2] *= 1 - e * 0.3; } });

    // scissor claws: fixed half on the claw bone, moving half and the brass pivot screw on the snip bone
    const O = [0.895, 0.345, 0.54], sp = { p: O, r: [ROLL, 0, 0], s: 1.3, m: 1 }, sc = ball(0.034, 12, 8);
    sc.scale(1, 0.62, 1); sc.translate(0, 0.03, 0);
    S.add('clawL', bladeGeo(1), STEEL, sp);
    S.add('clawL', handleGeo(1), SILV, sp);
    S.add('snipL', bladeGeo(-1), STEEL, sp);
    S.add('snipL', handleGeo(-1), SILV, sp);
    S.add('snipL', join([sc, new THREE.CylinderGeometry(0.017, 0.017, 0.07, 8)]), GOLDM, sp);
    // golden needle with its eye; the violet thread goes through the eye and trails behind
    const ng = cone(0.032, 0.5, 10), eye = torus(0.042, 0.014, 18, 8);
    ng.translate(0, -0.23, 0); eye.scale(0.75, 1.5, 1); eye.translate(0, -0.3, 0);
    S.add('t5', ng, NEEDLE, { p: [0.242, 1.19, 0], r: [0, 0, -114], name: 'needle' });
    S.add('t5', eye, NEEDLE, { p: [0.242, 1.19, 0], r: [0, 0, -114] });
    S.add('th1', tube([[0.01, -0.01, -0.04], [0, 0, 0], [-0.1, 0.13, 0.035], [-0.28, 0.21, -0.03], [-0.5, 0.19, 0.03]], [0.016, 0.016, 0.016, 0.015, 0.014], { ring: 6 }), THREAD, { p: [-0.03, 1.31, 0] });
    S.add('th2', tube([[0, 0, 0], [-0.16, -0.06, -0.04], [-0.32, -0.02, 0.02], [-0.48, -0.14, -0.02], [-0.6, -0.12, 0.02]], [0.014, 0.013, 0.012, 0.01, 0.005], { ring: 6 }), THREAD, { p: [-0.53, 1.5, 0.03] });
    // heart piece: the bobbin on the back. Gold spool, a reel of glowing violet thread, one loose strand to the tail.
    if (!reelTex) reelTex = canvasTex(64, 64, (g, W, H) => {
      g.fillStyle = '#a874ff'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#4a1cb0'; g.lineWidth = 2.6;
      for (let i = -4; i < 16; i++) { g.beginPath(); g.moveTo(0, i * 6); g.lineTo(W, i * 6 + 22); g.stroke(); }
    });
    S.add('hip', lathe([[0.001, 0], [0.115, 0], [0.12, 0.015], [0.115, 0.03], [0.056, 0.042], [0.05, 0.06], [0.05, 0.19], [0.056, 0.208], [0.115, 0.22], [0.12, 0.235], [0.115, 0.25], [0.032, 0.252], [0.03, 0.29], [0.001, 0.297]], 20), GOLDM, { p: [BX, 0.5, 0] });
    const rl = lathe([[0.052, -0.08], [0.086, -0.063], [0.097, 0], [0.086, 0.063], [0.052, 0.08]], 18), kn = ball(0.022, 8, 6);
    kn.translate(0.094, 0.02, 0);
    S.add('hip', mergeGeometries([rl, kn]), { col: '#8a68f0', map: reelTex, glow: '#6824ff', glowK: 3.1, rough: 0.55 }, { p: [BX, 0.625, 0], name: 'reel' });
    const pg = [];
    for (let i = 0; i < 3; i++) pg.push(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 8).translate(Math.cos(i * 2.094) * 0.078, 0.257, Math.sin(i * 2.094) * 0.078));
    S.add('hip', join(pg), { col: DGOLD, metal: 1, rough: 0.4 }, { p: [BX, 0.5, 0], name: 'pegs' });
    S.add('hip', tube([[BX - 0.085, 0.63, 0.03], [-0.34, 0.67, 0.07], [-0.44, 0.6, 0.05], [-0.5, 0.52, 0]], [0.013, 0.013, 0.013, 0.013], { ring: 5 }), THREAD, {});
    // pins in the cushion: steel shafts, pearl heads
    const sh = [], hd = [];
    for (const d of [[0, 1, 0.1], [0.55, 0.8, 0.25], [-0.5, 0.8, -0.3], [0.2, 0.75, -0.65], [-0.25, 0.7, 0.66], [0.6, 0.6, -0.4]]) {
      const l = Math.hypot(d[0], d[1], d[2]), u = [d[0] / l, d[1] / l, d[2] / l], c = [CX + u[0] * 0.13, 0.565 + u[1] * 0.12, u[2] * 0.13];
      sh.push(aim(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 6), u).translate(c[0], c[1], c[2]));
      hd.push(ball(0.027, 10, 8).translate(c[0] + u[0] * 0.075, c[1] + u[1] * 0.075, c[2] + u[2] * 0.075));
    }
    S.add('body', join(sh), STEEL); S.add('body', join(hd), PEARL);
    // gold scrolls on the shell
    S.add('head', sScroll(0.33, 0.165, 0.17, 0.135, 0.045, 0.04), GOLDM, { m: 1 });
    S.add('hip', sScroll(-0.25, 0.185, -0.36, 0.11, 0.034, 0.038), GOLDM, { m: 1 });
    // maker's mark: a cross stitch in gold on the head plate
    const xs = [];
    for (const sg of [1, -1]) {
      const pts = []; for (let i = 0; i <= 4; i++) { const u = i / 4 - 0.5, x = 0.335 + u * 0.12, z = u * 0.12 * sg; pts.push([x, topY(x, z) + 0.008 + (sg > 0 ? 0.006 : 0), z]); }
      xs.push(tube(pts, [0.008, 0.015, 0.015, 0.015, 0.008], { ring: 6 }));
    }
    S.add('head', join(xs), GOLDM);
    // tape measure along the tail
    if (!tapeTex) tapeTex = canvasTex(512, 32, (g, W, H) => {
      g.fillStyle = '#e4dcae'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#b02828'; g.fillRect(0, 0, W, 2.5); g.fillRect(0, H - 2.5, W, 2.5);
      g.fillStyle = '#1e1812';
      for (let i = 0; i <= 30; i++) { const x = i / 30 * W, l = i % 6 === 0 ? H : i % 3 === 0 ? H * 0.62 : H * 0.4; g.fillRect(x - (i % 3 ? 2 : 3), 0, i % 3 ? 4 : 6, l); }
      g.fillStyle = '#b02828'; g.font = 'bold 16px sans-serif';
      for (let i = 0; i < 5; i++) g.fillText(String(i + 1), i / 5 * W + 9, H - 5);
    });
    const TAPE = { col: '#ffffff', map: tapeTex, rough: 0.7, side: 1, noOut: true };
    for (let i = 0; i < 5; i++) S.add(TAILB[i], tapeGeo(i, 0.108 - i * 0.007), TAPE);
    // legs: ivory with a gold knee, a steel thimble on each foot
    // The upper part goes from the socket up to the knee. The lower part goes from the knee out and down to the foot; its geometry is relative to the knee.
    const LP = [[0, 0, 0], [0.01 - KN[0], 0.02 - KN[1], 0.35 - KN[2]], [0.03 - KN[0], -0.285 - KN[1], 0.43 - KN[2]]];
    const thigh = tube([[0, 0, 0], [0.004, 0.1, 0.07], KN], [0.056, 0.054, 0.05], { ring: 7 }), leg = tube([[0, 0, 0], [0.004, -0.04, 0.1], LP[1], [0.02 - KN[0], -0.14 - KN[1], 0.4 - KN[2]], LP[2]], [0.05, 0.047, 0.04, 0.032, 0.024], { ring: 7 }), knee = ball(0.06, 10, 8), fd = [0.01, -0.305, 0.08];
    const thim = aim(lathe([[0.001, 0], [0.027, 0.008], [0.037, 0.034], [0.042, 0.09], [0.052, 0.096], [0.052, 0.114], [0.043, 0.12]], 12), [-fd[0], -fd[1], -fd[2]]).translate(LP[2][0] + fd[0] * 0.04, LP[2][1] + fd[1] * 0.04, LP[2][2] + fd[2] * 0.04);
    LEGS.forEach(([bn, p, ry], i) => {
      const sn = 'shin' + (i + 1) + 'L', kp = [p[0] + KN[0] * Math.cos(ry / R2D) + KN[2] * Math.sin(ry / R2D), p[1] + KN[1], p[2] - KN[0] * Math.sin(ry / R2D) + KN[2] * Math.cos(ry / R2D)];
      S.add(bn, thigh, LEGM, { p, r: [0, ry, 0], m: 1 });
      S.add(sn, leg, LEGM, { p: kp, r: [0, ry, 0], m: 1 });
      S.add(sn, knee, GOLDM, { p: kp, r: [0, ry, 0], m: 1 });
      S.add(sn, thim, SILV, { p: kp, r: [0, ry, 0], m: 1 });
    });
    S.eye('head', [0.47, 0.452, 0.11], 0.054, { dir: [0.7, 0.55, 0.45], sclera: '#3a2418', iris: '#ffb428', iris2: '#fff2a8', pupil: 'slit', lid: IVORY2, open: 27, tilt: -13, glow: 1.2, m: 1 });
  },
  anim(b, t, c) {
    const us = t.u * t.u * (3 - 2 * t.u), nu = 1 - us, tm = t.tm;
    const br = Math.sin(t.p), a = t.a * (1 - us * 0.9), s = t.s * (1 - us * 0.7), h = t.h, k = t.k;
    const melee = k === 'melee' ? 1 : 0, shot = k === 'shot' ? 1 : 0, guard = melee || shot ? 0 : 1, g = guard * Math.min(1, a + s);
    // how the body moves. Without a speed (turn on the spot, old tools) the legs step on the spot or follow t.sw.
    const hasV = Math.abs(t.vf) + Math.abs(t.vs) > 0.05, fx = hasV ? cl(t.vf / 2.6, -1, 1) : t.sw * t.mv, fs = hasV ? cl(t.vs / 2.6, -1, 1) : 0;
    const acc = cl(t.af / 30, -1, 1), tn = t.tn, air = cl(t.va / 3, -1, 1), wl = t.w * 2.2;
    const shift = Math.sin(tm * 0.5) * Math.sin(tm * 0.19 + 1) * (1 - t.mv) * nu;                          // at rest the weight goes slowly from side to side
    const tap = Math.pow(Math.max(0, Math.sin(tm * 0.8 + 2)), 24) * (0.5 + 0.5 * Math.sin(tm * 11)) * (1 - t.mv) * nu * (1 - a);   // a fussy tap of one front foot
    const over = 4 * s * (1 - s), ring = s * (1 - s) * 3;                                                  // follow-through after a strike
    // ultimate: the needle works like a sewing machine. st: 0 = the needle stands straight up, 1 = the stab.
    const ph = tm * 15, cy = 0.5 - 0.5 * Math.cos(ph), st = cy * cy, hit = us * st;
    const step = Math.sin(wl) * t.mv;
    b.body.position.y += br * 0.006 - a * 0.045 * (1 - guard) + g * 0.03 - us * 0.03 - hit * 0.014 - Math.max(0, -air) * 0.04;
    b.body.position.x += melee * (s * 0.2 - a * 0.1 - over * 0.03) + shot * (s * 0.07 - a * 0.06);
    b.body.position.z += shift * 0.022;
    b.body.rotation.z = melee * (s * 0.07 - a * 0.05) + shot * (a * 0.06 - s * 0.1) + h * 0.06 + us * 0.03 - hit * 0.06;
    b.body.rotation.x = shift * 0.03 + step * 0.025;
    b.body.rotation.y = step * 0.04;
    // the rear part of the body turns against the front with each step, curves into a turn, and breathes
    b.hip.rotation.y = -Math.sin(wl - 0.7) * 0.075 * t.mv + tn * 0.16 * nu + fs * 0.06;
    b.hip.rotation.z = br * 0.012 - acc * 0.03 - melee * a * 0.05 + shot * (a * 0.05 - s * 0.04) + hit * 0.03;
    b.hip.scale.y = 1 + br * 0.02;
    const look = Math.sin(tm * 0.6) * Math.sin(tm * 0.21 + 2) * (1 - t.mv) * nu;
    b.head.rotation.y = t.lk * 0.2 - step * 0.04 - tn * 0.14 * nu - look * 0.12 - h * t.hz * 0.25;
    b.head.rotation.z = -h * (0.1 + t.hx * 0.15) + Math.sin(t.p * 0.5 + 1) * 0.02 - us * 0.05 - melee * a * 0.08 + melee * over * 0.06;
    b.head.rotation.x = look * 0.05;
    // legs: 2 tripods that alternate (leg 1 and 3 of one side with leg 2 of the other side). Each leg has its own phase.
    // The foot goes forward fast in the air and back slowly on the ground; the knee lifts it. The step follows the direction of the motion, also to the side and backward.
    for (let i = 1; i <= 3; i++) for (const sg of [1, -1]) {
      const sd = sg > 0 ? 'L' : 'R', L = b['leg' + i + sd], Sh = b['shin' + i + sd], tri = (i % 2 === 1) === (sg > 0);
      const u = cyc(wl + (tri ? 0 : Math.PI) + (i - 1) * 0.35 + (sg < 0 ? 0.17 : 0)), sr = stride(u), lf = lift(u) * t.mv + (i === 1 && sg > 0 ? tap : 0);
      const f = fx - sg * tn * 0.55, gs = fs + (2 - i) * tn * 0.5;                    // forward part and side part of the step of this leg (a turn makes the inner legs step back)
      const out = sg * (sr * gs + h * t.hz * 0.5) - sg * shift * 0.15 + a * (melee ? -0.25 : 0.1) + us * 0.25 + Math.max(0, -air) * 0.3;   // + = the foot goes away from the body
      L.rotation.y = sg * (sr * f * 0.48 + (2 - i) * (us * 0.16 + Math.max(0, -air) * 0.1));
      L.rotation.x = -sg * (lf * 0.32 + us * 0.08 + hit * 0.03 - air * 0.12 - out * 0.08 + g * 0.06 - a * (1 - guard) * 0.06);
      Sh.rotation.x = sg * (lf * 0.24 - out * 0.34);
      Sh.rotation.y = sg * sr * f * 0.12;
    }
    // claws: open wide for the wind-up, then both swing in and snip (cross-cut). They follow the body late and lead a turn. In the ultimate they stay open wide.
    const idle = Math.max(0, Math.sin(t.p * 0.7));
    const sw = 0.1 + Math.sin(t.p * 0.5) * 0.04 + melee * (s * 0.55 - a * 0.6 + over * 0.12) - shot * a * 0.25 + g * 0.5 - h * 0.3 - us * 0.62 - Math.abs(acc) * 0.06;
    b.armL.rotation.y = sw - tn * 0.12 * nu + step * 0.03; b.armR.rotation.y = -sw - tn * 0.12 * nu + step * 0.03;
    b.armL.rotation.z = melee * (a * 0.3 + s * 0.14) + g * 0.45 + h * 0.2 + us * 0.16 + step * 0.03; b.armR.rotation.z = melee * (a * 0.3 - s * 0.1) + g * 0.45 + h * 0.2 + us * 0.16 - step * 0.03;
    b.clawL.rotation.y = melee * (s * 0.15 - a * 0.2 + over * 0.14) - us * 0.2 + acc * 0.05; b.clawR.rotation.y = -(melee * (s * 0.15 - a * 0.2 + over * 0.1) - us * 0.2 + acc * 0.05);
    b.clawL.rotation.z = Math.sin(tm * 0.9) * Math.sin(tm * 0.31) * 0.05 * nu; b.clawR.rotation.z = Math.sin(tm * 0.8 + 2) * Math.sin(tm * 0.27 + 1) * 0.05 * nu;
    const idleR = Math.max(0, Math.sin(t.p * 0.7 + 1.2)), act = 0.2 + a * (melee ? 0.8 : 0.25) + h * 0.4 + t.gl * 0.1 * (1 + Math.sin(tm * 9)) + us * (0.95 - st * 0.2);
    b.snipL.quaternion.setFromAxisAngle(AXL, (act + idle * 0.32 * nu) * (1 - s));
    b.snipR.quaternion.setFromAxisAngle(AXR, (act + idleR * 0.32 * nu) * (1 - s));
    // tail: it balances the body. It leans against a turn and a side step, it lags behind a start, it shakes with the steps.
    // It coils back then stabs forward over the head (shot) and swings past its rest after the stab; it arches over the body (guard).
    const AS = [0.22, 0.18, 0.08, -0.2, -0.3], SS = [-0.5, -0.42, 0.06, 0.42, 0.6], GS = [-0.1, -0.1, -0.12, -0.12, -0.1];
    const curl = br * 0.025 + h * 0.08 + melee * (a * 0.06 - s * 0.05) + acc * 0.04;
    for (let i = 0; i < 5; i++) {
      const tb = b[TAILB[i]], wob = Math.sin(s * 11 - i * 0.7) * ring * (shot ? 0.3 : 0.14) + Math.sin(wl * 2 - i * 0.6) * 0.012 * t.mv;
      tb.rotation.z = (curl * (i === 0 ? 0.6 : 1) + shot * (a * AS[i] + s * SS[i]) + g * GS[i] + wob) * nu + us * (UP[i] + (DN[i] - UP[i]) * st);
      tb.rotation.y = (Math.sin(t.p * 0.8 - i * 0.5) * 0.05 + tn * 0.05) * nu;
      tb.rotation.x = (-tn * 0.09 - fs * 0.06 + h * t.hz * 0.08 - shift * 0.03) * nu;
    }
    b.t1.scale.setScalar(1 + us * 0.1);
    // thread: a spring part. Here only a small wave, and a whip with each stitch in the ultimate.
    b.th1.rotation.z = Math.sin(tm * 2.3) * 0.1 + shot * s * 0.5 + us * (0.5 + Math.sin(ph - 1) * 0.5);
    b.th2.rotation.z = Math.sin(tm * 2.3 - 1.1) * 0.18 - shot * s * 0.6 + us * Math.sin(ph - 2) * 0.7;
    b.th1.rotation.y = Math.sin(tm * 1.7) * 0.12; b.th2.rotation.y = Math.sin(tm * 1.7 - 1.3) * 0.2;
    // bobbin: it turns slowly and feeds the thread. It spins fast in the ultimate. The angle is kept on the creature so that the speed changes smoothly.
    const dt = Math.min(0.1, Math.max(0, tm - (c.reelT === undefined ? tm : c.reelT)));
    c.reelT = tm; c.reelA = ((c.reelA || 0) + dt * (1.4 + t.mv * 1.5 + a * 6 + t.gl * 2 + us * 24)) % 6.2832;
    c.parts.reel.rotation.y = c.reelA + t.o; c.parts.pegs.rotation.y = c.reelA + t.o;
    const pulse = 1 + 0.03 * Math.sin(t.p * 1.3) + t.gl * 0.05 * (1 + Math.sin(tm * 6)) + us * (0.1 + 0.05 * Math.sin(ph));
    c.parts.reel.scale.set(pulse, 1, pulse);
    c.parts.needle.scale.setScalar(1 + shot * a * 0.15 + t.gl * 0.08 * (1 + Math.sin(tm * 6)) + hit * 0.1);
  },
  // loose parts: the thread behind the needle (very light), the tail chain (heavy, it only lags a little)
  dyn: [
    { b: ['th1', 'th2'], k: 28, d: 3.6, drag: 5 },
    { b: ['t1', 't2', 't3', 't4', 't5'], k: 75, d: 6.5, amt: 0.45, drag: 0.8 }
  ]
};
