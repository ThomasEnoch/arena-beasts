/* Needlescorpion - polished ivory scorpion with silver filigree, embroidery-scissor claws and a golden needle tail. */
import * as THREE from 'three';
import { tube, cone, ball, torus, lathe, wing, canvasTex } from '../geo.js';

const IVORY = '#e2d8c2', IVORY2 = '#cbbd9c', SILVER = '#b9c2ce', DSILV = '#6f7888', UNDER = '#8d8370', GOLD = '#ffd24a';
const SILV = { col: '#c6ced8', metal: 1, rough: 0.2, env: 1.3 };
const STEEL = { col: '#d2dae4', metal: 1, rough: 0.1, env: 1.6 };
const GOLDM = { col: '#f2c648', metal: 0.9, rough: 0.2, env: 1.2 };
const NEEDLE = { col: '#ffd45a', metal: 0.8, rough: 0.16, glow: '#ffa818', glowK: 1.6, env: 1.2 };
const THREAD = { col: '#ff86a8', glow: '#ff3c70', glowK: 2.8, noOut: true };
const LEGM = { col: IVORY, rough: 0.22, env: 0.9 };
const TAILB = ['t1', 't2', 't3', 't4', 't5'];
const TP = [[-0.42, 0.40], [-0.66, 0.56], [-0.80, 0.84], [-0.72, 1.13], [-0.50, 1.33], [-0.24, 1.40]];
const R2D = 180 / Math.PI, ROLL = 30;
// the scissor plane is rolled outward; the moving blade turns around the normal of that plane
const AXL = new THREE.Vector3(0, Math.cos(ROLL / R2D), Math.sin(ROLL / R2D)), AXR = new THREE.Vector3(0, -Math.cos(ROLL / R2D), Math.sin(ROLL / R2D));
// shell plates: [cx, cy, rx, ry, rz]
const HEAD = [0.36, 0.34, 0.26, 0.15, 0.27];
const PLATES = [[0.14, 0.37, 0.13, 0.17, 0.3], [-0.01, 0.375, 0.13, 0.175, 0.31], [-0.15, 0.375, 0.125, 0.17, 0.295], [-0.28, 0.375, 0.115, 0.155, 0.26], [-0.39, 0.38, 0.105, 0.14, 0.22]];
function topY(x, z) {
  let y = 0.3;
  for (const e of [HEAD].concat(PLATES)) { const q = 1 - Math.pow((x - e[0]) / e[2], 2) - Math.pow(z / e[4], 2); if (q > 0) y = Math.max(y, e[1] + e[3] * Math.sqrt(q)); }
  return y;
}
// silver S-scroll that lies on the shell: a spiral out of point A, then a spiral into point B
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
let reelTex = null;

export default {
  id: 'needlescorpion', rim: '#fff0d0', focus: 'needle', top: 1.58, rough: 0.34,
  opts: { cell: 0.025, mottle: 0.05, mottleF: 14 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.34, 0]).bone('head', 'body', [0.3, 0.34, 0])
      .bone('armL', 'head', [0.44, 0.33, 0.24], { m: 1 }).bone('clawL', 'armL', [0.66, 0.36, 0.44], { m: 1 }).bone('snipL', 'clawL', [0.895, 0.345, 0.54], { m: 1 })
      .bone('t1', 'body', [TP[0][0], TP[0][1], 0]).bone('t2', 't1', [TP[1][0], TP[1][1], 0]).bone('t3', 't2', [TP[2][0], TP[2][1], 0])
      .bone('t4', 't3', [TP[3][0], TP[3][1], 0]).bone('t5', 't4', [TP[4][0], TP[4][1], 0])
      .bone('th1', 't5', [-0.03, 1.31, 0]).bone('th2', 'th1', [-0.53, 1.5, 0.03])
      .bone('leg1L', 'body', [0.2, 0.3, 0.25], { m: 1 }).bone('leg2L', 'body', [0.02, 0.3, 0.28], { m: 1 }).bone('leg3L', 'body', [-0.18, 0.3, 0.26], { m: 1 });
    S.color(IVORY);
    const pl = { k: 0.015, gloss: 0.75 }, sv = { col: SILVER, metal: 1, gloss: 0.7 };
    // head shield and 5 back plates
    S.ell('head', [HEAD[0], HEAD[1], 0], [HEAD[2], HEAD[3], HEAD[4]], { k: 0.03, gloss: 0.75 });
    PLATES.forEach((e, i) => S.ell('body', [e[0], e[1], 0], [e[2], e[3], e[4]], Object.assign({ col: i % 2 ? IVORY2 : IVORY }, pl)));
    S.cap('head', [0.5, 0.43, 0.19], [0.585, 0.4, 0.06], 0.03, 0.028, Object.assign({ m: 1, k: 0.01 }, sv));
    S.cap('head', [0.58, 0.28, 0.07], [0.72, 0.22, 0.035], 0.05, 0.02, { m: 1, col: DSILV, metal: 1, gloss: 0.7, k: 0.02 });
    S.ell('head', [0.6, 0.33, 0], [0.05, 0.05, 0.1], Object.assign({ k: 0.012 }, sv));
    // leg sockets and the seat of the bobbin
    for (const [x, z] of [[0.2, 0.24], [0.02, 0.265], [-0.18, 0.25]]) S.ell('body', [x, 0.3, z], 0.062, Object.assign({ m: 1, k: 0.012 }, sv));
    S.tor('body', [-0.1, 0.53, 0], 0.1, 0.03, Object.assign({ k: 0.01 }, sv));
    // arms: ivory with a silver band; the knuckle holds one ring of the scissors
    S.cap('armL', [0.44, 0.33, 0.24], [0.65, 0.36, 0.43], 0.082, 0.064, { m: 1, gloss: 0.75, k: 0.03 });
    S.tor('armL', [0.545, 0.345, 0.335], 0.068, 0.027, Object.assign({ m: 1, k: 0.008, rot: [0, -42.1, -84.2] }, sv));
    S.ell('armL', [0.45, 0.34, 0.245], 0.095, Object.assign({ m: 1, k: 0.012 }, sv));
    S.ell('clawL', [0.7, 0.375, 0.455], [0.095, 0.085, 0.09], { m: 1, col: IVORY2, gloss: 0.75, k: 0.012 });
    S.tor('clawL', [0.648, 0.36, 0.428], 0.072, 0.024, Object.assign({ m: 1, k: 0.008, rot: [0, -42.1, -84.2] }, sv));
    // tail: silver core, 5 ivory beads with a silver band, a thimble socket for the needle
    S.tube(TAILB, TP.map(p => [p[0], p[1], 0]), [0.075, 0.07, 0.066, 0.062, 0.058, 0.052], Object.assign({ k: 0.012 }, sv));
    for (let i = 0; i < 5; i++) {
      const a = TP[i], e = TP[i + 1], mx = (a[0] + e[0]) / 2, my = (a[1] + e[1]) / 2, ang = Math.atan2(e[1] - a[1], e[0] - a[0]) * R2D, r = 0.108 - i * 0.007;
      S.ell(TAILB[i], [mx, my, 0], [0.125, r, r], { rot: [0, 0, ang], k: 0.012, col: i % 2 ? IVORY2 : IVORY, gloss: 0.75 });
      S.tor(TAILB[i], [mx, my, 0], r - 0.004, 0.026, Object.assign({ rot: [0, 0, ang - 90], k: 0.008 }, sv));
    }
    S.cap('t5', [-0.26, 1.4, 0], [-0.15, 1.367, 0], 0.074, 0.05, Object.assign({ k: 0.012 }, sv));
    // colour: belly, silver inlay in the seams, golden running stitches, small side eyes
    S.ell('body', [-0.08, 0.2, 0], [0.62, 0.07, 0.28], { paint: 1, col: UNDER, cb: 0.05 });
    for (const x of [0.065, -0.08, -0.215, -0.335]) S.ell('body', [x, 0.4, 0], [0.02, 0.22, 0.36], { paint: 1, col: SILVER, metal: 1, gloss: 0.7, cb: 0.01 });
    S.ell('head', [0.24, 0.4, 0], [0.02, 0.2, 0.3], { paint: 1, col: SILVER, metal: 1, gloss: 0.7, cb: 0.01 });
    PLATES.forEach(e => { const z = e[4] * 0.8; S.ell('body', [e[0], topY(e[0], z), z], [0.042, 0.032, 0.024], { paint: 1, col: GOLD, glow: 1.7, cb: 0.01, m: 1 }); });
    for (const [x, z] of [[0.36, 0.215], [0.47, 0.19]]) S.ell('head', [x, topY(x, z), z], [0.036, 0.03, 0.022], { paint: 1, col: GOLD, glow: 1.7, cb: 0.01, m: 1 });
    S.ell('head', [0.56, 0.36, 0.165], 0.022, { paint: 1, col: '#fff0b0', glow: 3.5, cb: 0.008, m: 1 });
    S.ell('head', [0.53, 0.35, 0.2], 0.02, { paint: 1, col: '#fff0b0', glow: 3.5, cb: 0.008, m: 1 });
    for (let i = 0; i < 4; i++) S.ell('t5', [-0.25 + i * 0.03, 1.45 - i * 0.012, 0.04], 0.014, { paint: 1, col: DSILV, cb: 0.006, m: 1 });

    // scissor claws: fixed half on the claw bone, moving half and the pivot screw on the snip bone
    const O = [0.895, 0.345, 0.54], sp = { p: O, r: [ROLL, 0, 0], s: 1.3, m: 1 }, sc = ball(0.024, 10, 8);
    sc.scale(1, 0.7, 1); sc.translate(0, 0.03, 0);
    S.add('clawL', bladeGeo(1), STEEL, sp);
    S.add('clawL', handleGeo(1), SILV, sp);
    S.add('snipL', bladeGeo(-1), STEEL, sp);
    S.add('snipL', handleGeo(-1), SILV, sp);
    S.add('snipL', sc, GOLDM, sp);
    // golden needle with its eye; the thread goes through the eye and trails behind
    const ng = cone(0.03, 0.49, 10), eye = torus(0.04, 0.013, 18, 8);
    ng.translate(0, -0.23, 0); eye.scale(0.75, 1.5, 1); eye.translate(0, -0.3, 0);
    S.add('t5', ng, NEEDLE, { p: [0.242, 1.19, 0], r: [0, 0, -114], name: 'needle' });
    S.add('t5', eye, NEEDLE, { p: [0.242, 1.19, 0], r: [0, 0, -114] });
    S.add('th1', tube([[0.01, -0.01, -0.04], [0, 0, 0], [-0.1, 0.13, 0.035], [-0.28, 0.21, -0.03], [-0.5, 0.19, 0.03]], [0.015, 0.015, 0.015, 0.014, 0.013], { ring: 6 }), THREAD, { p: [-0.03, 1.31, 0] });
    S.add('th2', tube([[0, 0, 0], [-0.16, -0.06, -0.04], [-0.32, -0.02, 0.02], [-0.48, -0.14, -0.02], [-0.6, -0.12, 0.02]], [0.013, 0.012, 0.011, 0.009, 0.005], { ring: 6 }), THREAD, { p: [-0.53, 1.5, 0.03] });
    // bobbin on the back: silver spool, a reel of glowing thread, one loose strand to the tail
    if (!reelTex) reelTex = canvasTex(64, 64, (g, W, H) => {
      g.fillStyle = '#ff9ab8'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#b02c5c'; for (let i = 0; i < 12; i++) g.fillRect(0, i * 5.4 + 1, W, 1.8);
    });
    S.add('body', lathe([[0.001, 0], [0.115, 0], [0.12, 0.015], [0.115, 0.03], [0.056, 0.042], [0.05, 0.06], [0.05, 0.19], [0.056, 0.208], [0.115, 0.22], [0.12, 0.235], [0.115, 0.25], [0.032, 0.252], [0.03, 0.29], [0.001, 0.297]], 20), SILV, { p: [-0.1, 0.5, 0] });
    S.add('body', lathe([[0.052, 0.045], [0.084, 0.062], [0.094, 0.125], [0.084, 0.188], [0.052, 0.205]], 18), { col: '#ff86a8', map: reelTex, glow: '#ff2c64', glowK: 0.8, rough: 0.6 }, { p: [-0.1, 0.5, 0], name: 'reel' });
    S.add('body', tube([[-0.185, 0.63, 0.03], [-0.3, 0.66, 0.07], [-0.42, 0.6, 0.05], [-0.5, 0.52, 0]], [0.012, 0.012, 0.012, 0.012], { ring: 5 }), THREAD, {});
    // filigree scrolls on the shell
    S.add('head', sScroll(0.33, 0.15, 0.15, 0.11, 0.05, 0.045), SILV, { m: 1 });
    S.add('body', sScroll(-0.21, 0.165, -0.34, 0.1, 0.038, 0.04), SILV, { m: 1 });
    // legs: ivory with a silver knee
    const leg = tube([[0, 0, 0], [0.01, 0.17, 0.17], [0.02, 0.02, 0.34], [0.03, -0.29, 0.42]], [0.052, 0.046, 0.032, 0.008], { ring: 7 }), knee = ball(0.054, 10, 8);
    knee.translate(0.01, 0.165, 0.17);
    for (const [bn, p, ry] of [['leg1L', [0.2, 0.3, 0.25], 26], ['leg2L', [0.02, 0.3, 0.28], -4], ['leg3L', [-0.18, 0.3, 0.26], -34]]) {
      S.add(bn, leg, LEGM, { p, r: [0, ry, 0], m: 1 });
      S.add(bn, knee, SILV, { p, r: [0, ry, 0], m: 1 });
    }
    S.eye('head', [0.47, 0.452, 0.11], 0.05, { dir: [0.7, 0.55, 0.45], sclera: '#3a2418', iris: '#ffb428', iris2: '#fff2a8', pupil: 'slit', lid: IVORY2, open: 20, tilt: -26, glow: 1.4, m: 1 });
  },
  anim(b, t, c) {
    const br = Math.sin(t.p), a = t.a, s = t.s, h = t.h, w = t.w * 1.6, k = t.k;
    const melee = k === 'melee' ? 1 : 0, shot = k === 'shot' ? 1 : 0, guard = melee || shot ? 0 : 1, g = guard * Math.min(1, a + s);
    b.body.position.y += br * 0.012 + Math.abs(Math.sin(w)) * 0.012 * t.mv - a * 0.04 * (1 - guard) + g * 0.03;
    b.body.position.x += melee * (s * 0.2 - a * 0.1) + shot * (s * 0.07 - a * 0.06);
    b.body.rotation.z = melee * (s * 0.07 - a * 0.05) + shot * (a * 0.06 - s * 0.1) + h * 0.12 - t.sw * 0.04;
    b.body.rotation.x = t.sl * 0.08;
    b.head.rotation.y = t.lk * 0.2;
    b.head.rotation.z = -h * 0.1;
    for (let i = 1; i <= 3; i++) {
      const L = b['leg' + i + 'L'], R = b['leg' + i + 'R'], ph = w + i * 2.1;
      L.rotation.y = Math.sin(ph) * 0.4 * t.mv; R.rotation.y = Math.sin(ph) * 0.4 * t.mv;
      L.rotation.x = -Math.max(0, Math.cos(ph)) * 0.25 * t.mv - a * 0.08 + g * 0.06; R.rotation.x = Math.max(0, -Math.cos(ph)) * 0.25 * t.mv + a * 0.08 - g * 0.06;
    }
    // claws: open wide for the wind-up, then both swing in and snip (cross-cut)
    const idle = Math.max(0, Math.sin(t.p * 0.7));
    const sw = 0.1 + Math.sin(t.p * 0.5) * 0.04 + melee * (s * 0.55 - a * 0.6) - shot * a * 0.25 + g * 0.5 - h * 0.3;
    b.armL.rotation.y = sw; b.armR.rotation.y = -sw;
    b.armL.rotation.z = melee * (a * 0.3 + s * 0.14) + g * 0.45 + h * 0.2; b.armR.rotation.z = melee * (a * 0.3 - s * 0.1) + g * 0.45 + h * 0.2;
    b.clawL.rotation.y = melee * (s * 0.15 - a * 0.2); b.clawR.rotation.y = -b.clawL.rotation.y;
    const idleR = Math.max(0, Math.sin(t.p * 0.7 + 1.2)), act = 0.2 + a * (melee ? 0.8 : 0.25) + h * 0.4 + t.gl * 0.1 * (1 + Math.sin(t.tm * 9));
    b.snipL.quaternion.setFromAxisAngle(AXL, (act + idle * 0.32) * (1 - s));
    b.snipR.quaternion.setFromAxisAngle(AXR, (act + idleR * 0.32) * (1 - s));
    // tail: coil back then stab forward over the head (shot); arch over the body (guard)
    const AS = [0.22, 0.18, 0.08, -0.2, -0.3], SS = [-0.5, -0.42, 0.06, 0.42, 0.6], GS = [-0.1, -0.1, -0.12, -0.12, -0.1];
    const curl = br * 0.025 + h * 0.08 + t.sw * 0.05 + melee * (a * 0.06 - s * 0.05);
    for (let i = 0; i < 5; i++) {
      const tb = b[TAILB[i]];
      tb.rotation.z = curl * (i === 0 ? 0.6 : 1) + shot * (a * AS[i] + s * SS[i]) + g * GS[i];
      tb.rotation.y = Math.sin(t.p * 0.8 - i * 0.5) * 0.05 + t.sl * 0.12;
    }
    // thread waves behind the needle, the reel turns
    b.th1.rotation.z = Math.sin(t.tm * 2.3) * 0.12 + t.sw * 0.25 + shot * s * 0.5 - h * 0.2;
    b.th2.rotation.z = Math.sin(t.tm * 2.3 - 1.1) * 0.22 + t.sw * 0.3 - shot * s * 0.6;
    b.th1.rotation.y = Math.sin(t.tm * 1.7) * 0.18 + t.sl * 0.4; b.th2.rotation.y = Math.sin(t.tm * 1.7 - 1.3) * 0.3 + t.sl * 0.5;
    c.parts.reel.rotation.y = t.tm * 1.4 + t.o;
    c.parts.needle.scale.setScalar(1 + shot * a * 0.15 + t.gl * 0.08 * (1 + Math.sin(t.tm * 6)));
  }
};
