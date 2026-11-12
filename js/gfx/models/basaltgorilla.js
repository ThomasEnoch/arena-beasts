/* Basaltgorilla - ape of basalt columns, held together by hydraulic pistons and geothermal cables. Stone / Ember. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, lathe, ball } from '../geo.js';

const ROCK = '#4b423d', ROCK2 = '#685c52', DARK = '#2d2828', LIGHT = '#8a7c6a', IRON = '#59616c', AMBER = '#ffa030';
const BAS1 = { col: '#3c3634', rough: 0.9, flat: true }, BAS2 = { col: '#5a5049', rough: 0.85, flat: true };
const DSTEEL = { col: '#3c434c', metal: 0.9, rough: 0.42, env: 1 }, STEEL = { col: '#97a2b0', metal: 1, rough: 0.28, env: 1.2 }, CHROME = { col: '#e0e6ee', metal: 1, rough: 0.1, env: 1.6 };
const CABLE = { col: '#ffb648', glow: '#ff8a1a', glowK: 2.4, noOut: true }, EMBER = { col: '#ffd884', glow: '#ff9a20', glowK: 3.4, noOut: true };
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

export default {
  id: 'basaltgorilla', rim: '#ffb070', focus: 'chest', top: 1.95, rough: 0.85, opts: { cell: 0.028, mottle: 0.17, mottleF: 13, sb: 0.05 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('hips', 'root', [-0.32, 0.72, 0]).bone('chest', 'hips', [-0.02, 1.0, 0]).bone('head', 'chest', [0.46, 1.32, 0]).bone('jaw', 'head', [0.58, 1.22, 0])
      .bone('stack', 'chest', ST).bone('armL', 'chest', [0.28, 1.3, 0.46], { m: 1 }).bone('foreL', 'armL', [0.44, 0.79, 0.54], { m: 1 }).bone('fistL', 'foreL', [0.56, 0.33, 0.54], { m: 1 })
      .bone('legL', 'hips', [-0.42, 0.56, 0.3], { m: 1 });
    S.color(ROCK);
    // torso: blocks along a sloped spine (40 degrees)
    S.box('hips', [-0.36, 0.68, 0], [0.26, 0.24, 0.31], 0.07, { k: 0.025 });
    S.box('chest', [-0.1, 0.9, 0], [0.24, 0.25, 0.33], 0.07, { k: 0.03, rot: [0, 0, 40], col: DARK });
    S.box('chest', [0.18, 1.14, 0], [0.3, 0.33, 0.45], 0.08, { k: 0.03, rot: [0, 0, 40] });
    S.box('chest', [-0.05, 1.417, 0], [0.27, 0.1, 0.35], 0.05, { k: 0.02, rot: [0, 0, 40], col: ROCK2 });
    S.cap('chest', [0.28, 1.3, 0], [0.48, 1.32, 0], 0.2, 0.17, { k: 0.04, col: DARK });
    S.box('chest', [0.485, 0.935, 0.235], [0.16, 0.065, 0.19], 0.04, { k: 0.015, rot: [0, 0, 40], col: ROCK2, m: 1 });
    S.box('chest', [0.09, 0.69, 0], [0.13, 0.05, 0.22], 0.035, { k: 0.015, rot: [0, 0, 40], col: ROCK2 });
    S.box('hips', [-0.6, 0.78, 0], [0.07, 0.15, 0.22], 0.04, { k: 0.015, rot: [0, 0, 12], col: ROCK2 });
    // chest vents: 3 slots in each chest plate
    for (let i = -1; i <= 1; i++) S.box('chest', [0.51 + i * 0.066, 0.905 + i * 0.055, 0.235], [0.027, 0.05, 0.13], 0.01, { sub: 1, k: 0.008, rot: [0, 0, 40], col: '#ffb040', glow: 3, m: 1 });
    // head: small, heavy brow, crest, large jaw
    S.box('head', [0.56, 1.34, 0], [0.17, 0.16, 0.17], 0.06, { k: 0.03 });
    S.box('head', [0.71, 1.25, 0], [0.085, 0.07, 0.12], 0.04, { k: 0.02, col: ROCK2 });
    S.box('head', [0.7, 1.462, 0], [0.09, 0.05, 0.2], 0.03, { k: 0.015, rot: [0, 0, -12], col: DARK });
    S.box('head', [0.5, 1.51, 0], [0.15, 0.06, 0.07], 0.035, { k: 0.02, rot: [0, 0, 18], col: ROCK2 });
    S.box('jaw', [0.69, 1.165, 0], [0.12, 0.055, 0.145], 0.035, { k: 0.015, col: LIGHT });
    S.ell('head', [0.795, 1.27, 0.045], [0.03, 0.025, 0.028], { m: 1, sub: 1, col: '#ffb050', glow: 2.6, k: 0.01 });
    // arms: shoulder block, upper arm, steel elbow, huge forearm with 2 steel bands, fist
    S.box('armL', [0.3, 1.34, 0.5], [0.21, 0.19, 0.2], 0.07, { m: 1, k: 0.03, rot: [0, 0, 20] });
    S.cap('armL', [0.3, 1.26, 0.5], [0.44, 0.8, 0.54], 0.165, 0.145, { m: 1, k: 0.03, col: DARK });
    S.box('armL', [0.38, 1.02, 0.54], [0.135, 0.15, 0.17], 0.05, { m: 1, k: 0.02, rot: [0, 0, 17], col: ROCK2 });
    S.ell('foreL', [0.44, 0.79, 0.54], 0.165, { m: 1, k: 0.02, col: IRON, metal: 1, gloss: 0.55 });
    S.cap('foreL', [0.45, 0.76, 0.54], [0.56, 0.36, 0.54], 0.17, 0.22, { m: 1, k: 0.03, col: DARK });
    S.box('foreL', [0.525, 0.52, 0.54], [0.2, 0.15, 0.215], 0.06, { m: 1, k: 0.02, rot: [0, 0, 15] });
    S.tor('foreL', [0.47, 0.69, 0.54], 0.2, 0.04, { m: 1, k: 0.012, rot: [0, 0, 15], col: IRON, metal: 1, gloss: 0.6 });
    S.tor('foreL', [0.565, 0.345, 0.54], 0.215, 0.04, { m: 1, k: 0.012, rot: [0, 0, 15], col: IRON, metal: 1, gloss: 0.6 });
    S.box('fistL', [0.63, 0.16, 0.54], [0.21, 0.16, 0.2], 0.07, { m: 1, k: 0.025, col: ROCK2 });
    for (let i = 0; i < 4; i++) S.ell('fistL', [0.82, 0.13, 0.4 + i * 0.095], [0.07, 0.085, 0.052], { m: 1, k: 0.018, col: LIGHT });
    S.cap('fistL', [0.6, 0.27, 0.36], [0.76, 0.21, 0.35], 0.07, 0.06, { m: 1, k: 0.02, col: LIGHT });
    // short legs
    S.cap('legL', [-0.42, 0.56, 0.3], [-0.44, 0.24, 0.33], 0.21, 0.17, { m: 1, k: 0.03, col: DARK });
    S.box('legL', [-0.36, 0.42, 0.34], [0.11, 0.1, 0.16], 0.04, { m: 1, k: 0.02, col: ROCK2 });
    S.box('legL', [-0.36, 0.09, 0.34], [0.25, 0.09, 0.17], 0.05, { m: 1, k: 0.025 });
    for (let i = -1; i <= 1; i++) S.ell('legL', [-0.12, 0.07, 0.34 + i * 0.11], [0.07, 0.06, 0.055], { m: 1, k: 0.015, col: LIGHT });
    S.tor('legL', [-0.44, 0.215, 0.33], 0.175, 0.035, { m: 1, k: 0.012, col: IRON, metal: 1, gloss: 0.6 });
    // steel mounts of the pistons
    S.box('chest', [SA[0] - 0.02, SA[1] - 0.05, SA[2]], [0.08, 0.07, 0.07], 0.02, { m: 1, k: 0.012, col: IRON, metal: 1, gloss: 0.5 });
    S.box('armL', [EA[0] + 0.03, EA[1], EA[2]], [0.06, 0.07, 0.07], 0.02, { m: 1, k: 0.012, col: IRON, metal: 1, gloss: 0.5 });
    // colour: geothermal seams between the blocks
    const seam = { paint: 1, col: AMBER, glow: 2.6, cb: 0.014 }, seamM = Object.assign({ m: 1 }, seam);
    S.box('chest', [0.46, 0.925, 0], [0.18, 0.09, 0.04], 0.02, Object.assign({ rot: [0, 0, 40] }, seam));
    S.cap('chest', [0.26, 0.8, 0.36], [-0.3, 1.24, 0.37], 0.03, 0.03, seamM);
    S.cap('chest', [0.26, 0.8, 0.36], [0.26, 0.76, 0], 0.03, 0.03, seamM);
    S.cap('hips', [-0.12, 0.62, 0.3], [-0.5, 0.94, 0.3], 0.028, 0.028, seamM);
    S.cap('armL', [0.12, 1.2, 0.72], [0.5, 1.24, 0.71], 0.028, 0.02, seamM);
    S.cap('armL', [0.3, 1.2, 0.71], [0.4, 0.9, 0.72], 0.024, 0.016, seamM);
    S.tor('foreL', [0.56, 0.41, 0.54], 0.25, 0.022, Object.assign({ rot: [0, 0, 15] }, seamM));
    S.cap('foreL', [0.5, 0.64, 0.76], [0.56, 0.42, 0.77], 0.024, 0.024, seamM);
    for (let i = 0; i < 3; i++) S.ell('fistL', [0.84, 0.14, 0.4475 + i * 0.095], [0.03, 0.07, 0.016], seamM);
    S.cap('legL', [-0.28, 0.2, 0.5], [-0.58, 0.2, 0.5], 0.024, 0.024, seamM);
    S.ell('head', [0.5, 1.51, 0.075], [0.12, 0.02, 0.02], Object.assign({ rot: [0, 0, 18] }, seamM));

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
    // columns on the shoulders and a spike on each elbow
    S.add('armL', join([column(0.105, 0.3, [0.26, 1.44, 0.52], 10, 18, 0), column(0.075, 0.24, [0.14, 1.42, 0.59], 28, 28, 20)]), BAS1, { m: 1 });
    S.add('armL', column(0.085, 0.22, [0.4, 1.43, 0.6], -16, 30, 10), BAS2, { m: 1 });
    S.add('foreL', column(0.085, 0.3, [0.38, 0.8, 0.56], 62, 0, 0), BAS2, { m: 1 });
    // hydraulic pistons: dark cylinder, bright rod that slides, steel joints
    S.add('chest', join([bar(SA, mix(SA, SB, 0.6), 0.07, 12), bar(mix(SA, SB, 0.5), mix(SA, SB, 0.62), 0.082, 12), ball(0.08, 10, 8).translate(SA[0], SA[1], SA[2])]), DSTEEL, { m: 1 });
    S.add('chest', bar([0, 0, 0], mix([0, 0, 0], SD, 0.62), 0.034, 8), CHROME, { p: mix(SA, SB, 0.42), name: 'rodL', m: 1 });
    S.add('armL', ball(0.07, 10, 8), STEEL, { p: SB, m: 1 });
    S.add('armL', join([bar(EA, mix(EA, EB, 0.6), 0.064, 12), bar(mix(EA, EB, 0.5), mix(EA, EB, 0.62), 0.076, 12), ball(0.075, 10, 8).translate(EA[0], EA[1], EA[2])]), DSTEEL, { m: 1 });
    S.add('armL', bar([0, 0, 0], mix([0, 0, 0], ED, 0.6), 0.032, 8), CHROME, { p: mix(EA, EB, 0.42), name: 'ramL', m: 1 });
    S.add('foreL', ball(0.066, 10, 8), STEEL, { p: EB, m: 1 });
    // geothermal cables: back to chest plate, back to hip
    S.add('chest', tube([[-0.1, 1.5, 0.13], [0.15, 1.63, 0.2], [0.39, 1.43, 0.25], [0.57, 1.21, 0.26], [0.64, 1.06, 0.24]], [0.026, 0.024, 0.024, 0.024, 0.022], { ring: 7 }), CABLE, { m: 1 });
    S.add('chest', tube([[-0.2, 1.4, 0.36], [-0.12, 1.2, 0.48], [-0.14, 0.98, 0.44], [-0.22, 0.8, 0.36]], [0.024, 0.024, 0.022, 0.02], { ring: 7 }), CABLE, { m: 1 });
    // teeth of the lower jaw; the column for the throw (the model shows it only for a shot)
    S.add('jaw', new THREE.ConeGeometry(0.035, 0.11, 4).translate(0, 0.055, 0), TOOTH, { p: [0.77, 1.2, 0.09], r: [0, 0, -8], m: 1 });
    S.add('fistL', column(0.12, 0.62, [0, -0.31, 0], 0, 0, 0).rotateX(90 * D2R), BAS2, { p: [0.66, 0.17, 0.54], name: 'rock' });
    S.eye('head', [0.735, 1.36, 0.095], 0.046, { dir: [0.95, 0, 0.3], sclera: '#2a1408', iris: '#ff9a1e', iris2: '#ffe27a', pupil: 'none', lid: DARK, open: 30, tilt: -22, glow: 1.6, size: 54, m: 1 });
  },
  anim(b, t, c) {
    const br = Math.sin(t.p), st = Math.sin(t.w), a = t.a, s = t.s, h = t.h, k = t.k, mv = t.mv;
    const melee = k === 'melee', shot = k === 'shot', slam = k === 'slam', buff = k === 'buff', vent = buff ? Math.min(1, a + s) : 0;
    // knuckle walk: arm and opposite leg move together
    let aL = st * 0.42 * mv, aR = -st * 0.42 * mv, fL = 0, fR = 0;
    b.armL.position.y += Math.max(0, Math.cos(t.w)) * 0.07 * mv; b.armR.position.y += Math.max(0, -Math.cos(t.w)) * 0.07 * mv;
    b.legL.rotation.z = -st * 0.5 * mv; b.legR.rotation.z = st * 0.5 * mv;
    b.legL.position.y += Math.max(0, -Math.cos(t.w)) * 0.06 * mv; b.legR.position.y += Math.max(0, Math.cos(t.w)) * 0.06 * mv;
    b.hips.position.y += br * 0.01 + Math.abs(st) * 0.04 * mv - a * 0.05 + (slam ? a * 0.12 - s * 0.08 : 0);
    b.hips.position.x += (melee ? s * 0.22 : slam ? s * 0.1 : shot ? s * 0.08 : 0) - a * 0.08;
    b.hips.rotation.x = st * 0.05 * mv;
    b.hips.rotation.z = -t.sw * 0.05 + h * 0.1;
    let lean = br * 0.015 + h * 0.2 - t.sw * 0.04, twist = st * 0.1 * mv;
    if (slam) {             // pile-driver: both fists go up, then down into the ground
      aL += a * 2.3 + s * 0.42; aR += a * 2.3 + s * 0.42; fL += a * 0.5 - s * 0.2; fR += a * 0.5 - s * 0.2; lean += a * 0.42 - s * 0.3;
    } else if (shot) {      // column throw: the left arm goes up and back, then throws
      aL += a * 2.75 + s * 1.0; fL += a * 0.35 - s * 0.2; aR += -a * 0.2 + s * 0.3; lean += a * 0.3 - s * 0.34; twist += -a * 0.3 + s * 0.4;
    } else if (melee) {     // grab: the left arm goes back, then reaches far forward and comes down
      aL += -a * 0.55 + s * 1.3; fL += a * 0.5 - s * 0.15; aR += s * 0.2; lean += a * 0.12 - s * 0.26; twist += -a * 0.38 + s * 0.5;
    } else {                // steam vent: chest out, shoulders up, arms open
      lean += vent * 0.3; aL -= vent * 0.3; aR -= vent * 0.3; fL += vent * 0.5; fR += vent * 0.5;
      b.armL.position.y += vent * 0.1; b.armR.position.y += vent * 0.1;
      b.armL.rotation.x = -vent * 0.4; b.armR.rotation.x = vent * 0.4;
    }
    b.chest.rotation.z = lean; b.chest.rotation.y = twist; b.chest.rotation.x = t.sl * 0.07;
    b.chest.scale.setScalar(1 + br * 0.014 + vent * 0.1 + a * 0.02);
    b.armL.rotation.z = aL - h * 0.12; b.armR.rotation.z = aR - h * 0.12;
    b.foreL.rotation.z = fL + h * 0.3; b.foreR.rotation.z = fR + h * 0.3;
    b.fistL.rotation.z = -fL * 0.5; b.fistR.rotation.z = -fR * 0.5;
    b.head.rotation.z = -lean * 0.7 - br * 0.02 + h * 0.3 + vent * 0.35 + (slam ? s * 0.2 : 0);
    b.head.rotation.y = t.lk * 0.3 - twist * 0.8;
    b.jaw.rotation.z = -(0.02 + a * 0.2 + s * 0.4 + h * 0.3 + vent * 0.45 + Math.max(0, br) * 0.03);
    // back columns: they shake and rise when the power grows
    const rise = vent * 0.07 + t.gl * (0.02 + 0.012 * Math.sin(t.tm * 9)) + a * 0.02;
    b.stack.position.y += rise * 0.4; b.stack.rotation.z = t.sw * 0.04 + h * 0.08; b.stack.rotation.x = t.sl * 0.06;
    c.parts.colA.position.y += rise; c.parts.colB.position.y += rise * 0.5 + Math.sin(t.tm * 31) * 0.006 * (vent + t.gl);
    c.parts.hot.position.y += rise + (vent + t.gl) * (0.012 + 0.008 * Math.sin(t.tm * 13));
    // pistons: each rod slides along its line with the motion of the arm
    pump(c.parts.rodL, SD, 0.08 * Math.sin(aL * 0.8) + br * 0.02 + vent * 0.08); pump(c.parts.rodR, SDR, 0.08 * Math.sin(aR * 0.8) + br * 0.02 + vent * 0.08);
    pump(c.parts.ramL, ED, -fL * 0.12 + br * 0.01); pump(c.parts.ramR, EDR, -fR * 0.12 + br * 0.01);
    const rock = c.parts.rock;
    rock.visible = shot && a > 0.04;
    rock.scale.setScalar(Math.max(0.01, Math.min(1, a * 2.5)));
  }
};
