/* Gyropangolin (Pangyre) - small pangolin of bronze scales that overlap, with a brass gyroscope in a hole through its body.
   The rotor is blue-white and turns all the time (heart piece). Steel claws, old leather straps from the pit harness. Iron / Brawl. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, blade, ball, torus, rbox } from '../geo.js';


const BRONZE = '#b47a3e', BRONZE2 = '#96602e', UNDER = '#3e2c22', DARK = '#241a16', GOLD = '#e6c052', DBRASS = '#8a6a28', ICE = '#a4d8ff', VERD = '#3a5444', LEATHER = '#74492a', LEATHER2 = '#a07a50';
const GOLDM = { col: '#f0c850', metal: 1, rough: 0.18, env: 1.6 };
const DSTEEL = { col: '#3a4048', metal: 0.9, rough: 0.4, env: 1 };
const STEEL = { col: '#aab4c0', metal: 1, rough: 0.25, env: 1.3 };
const CRESTM = { col: '#c98c4a', metal: 1, rough: 0.3, env: 1.2, flat: true };
const CLAW = { col: '#c2cad4', metal: 1, rough: 0.22, env: 1.4 };
const CORE = { col: '#cfeaff', glow: '#6cbcff', glowK: 3.3, noOut: true };
const SCRATCH = { col: '#f6e2ae', metal: 0.7, rough: 0.35, noOut: true };

const D2R = Math.PI / 180, TAU = Math.PI * 2;
const cl = (v, a, b) => v < a ? a : v > b ? b : v, sm = x => { x = cl(x, 0, 1); return x * x * (3 - 2 * x); };
// one step. u = phase 0..1. The foot is in the air for the first 40%: it goes forward fast. Then it stands and goes back slowly.
const SWG = 0.4, cyc = x => ((x / TAU) % 1 + 1) % 1;
const stride = u => u < SWG ? -Math.cos(Math.PI * sm(u / SWG)) : 1 - 2 * (u - SWG) / (1 - SWG);   // -1 = behind, 1 = in front
const lift = u => u < SWG ? Math.pow(Math.sin(Math.PI * u / SWG), 0.8) : 0;
const LEATHERM = { col: '#74492a', rough: 0.85, env: 0.3 };
const C = [-0.02, 0.57, 0], R = [0.54, 0.47, 0.37], HOLE = 0.28;   // torso ellipsoid, radius of the hole through it
const TAIL = [[-0.47, 0.52, 0], [-0.67, 0.4, 0], [-0.86, 0.28, 0], [-1.02, 0.19, 0], [-1.15, 0.13, 0]], TR = [0.27, 0.2, 0.15, 0.105, 0.05], TB = ['tail1', 'tail2', 'tail3', 'tail4'];
const NCR = 6, NTT = 4;   // saw teeth on the spine, saw teeth on the tail
const join = list => mergeGeometries(list.map(g => { g = g.index ? g.toNonIndexed() : g.clone(); g.deleteAttribute('uv'); return g; }));
const at = (g, x, y, z) => { g.translate(x, y, z); return g; };
const YAX = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion().setFromAxisAngle(YAX, Math.PI / 4), _e = new THREE.Euler(), _v = new THREE.Vector3();
// Armour scale: a flat diamond with centre P and normal n; one corner points along the body. A scale near the gyro hole becomes smaller so that it does not cover the hole.
function plate(S, bone, P, n, r, o) {
  if (o.guard) { const d = Math.hypot(P[0] - C[0], P[1] - C[1]) - HOLE - 0.03; if (Math.abs(P[2]) > 0.16) { if (d < 0.055) return; r = Math.min(r, d); } }
  _e.setFromQuaternion(_q.setFromUnitVectors(YAX, _v.set(n[0], n[1], n[2]).normalize()).multiply(_q2), 'XYZ');
  S.box(bone, P, [r * 0.84, 0.028, r * 0.84], 0.02, Object.assign({ rot: [_e.x / D2R, _e.y / D2R, _e.z / D2R], metal: 1, gloss: 0.55, k: 0.01 }, o));
}
// saw tooth: a scalloped plate. x = along the body, y = out of the body
const tooth = s => { const g = blade([[-0.075, -0.03], [0.07, -0.03], [0.06, 0.05], [-0.03, 0.12], [-0.11, 0.1]], 0.036, { bevel: 0.012, bevelSeg: 1 }); g.scale(s, s, 1); return g; };

export default {
  id: 'gyropangolin', rim: '#ffd890', focus: 'gyro', top: 1.25, rough: 0.5, opts: { cell: 0.024, mottle: 0.1, mottleF: 15 },
  build(S) {
    // The gyroscope housing (body) is rigid. The joints are round it: chest and hips, neck and head, legs in 2 parts, the scales of the back in 3 groups.
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', C).bone('shell', 'body', C).bone('shellF', 'body', C).bone('shellB', 'body', C).bone('gyro', 'body', C)
      .bone('chest', 'body', [0.2, 0.55, 0]).bone('hips', 'body', [-0.24, 0.55, 0]).bone('neck', 'chest', [0.42, 0.53, 0]).bone('head', 'neck', [0.62, 0.46, 0])
      .bone('legFL', 'chest', [0.37, 0.42, 0.27], { m: 1 }).bone('shinFL', 'legFL', [0.38, 0.27, 0.285], { m: 1 })
      .bone('legBL', 'hips', [-0.43, 0.42, 0.27], { m: 1 }).bone('shinBL', 'legBL', [-0.42, 0.27, 0.285], { m: 1 })
      .bone('tail1', 'hips', TAIL[0]).bone('tail2', 'tail1', TAIL[1]).bone('tail3', 'tail2', TAIL[2]).bone('tail4', 'tail3', TAIL[3]);
    S.color(UNDER);
    S.ell('body', C, R, { metal: 0.5, gloss: 0.3 });
    // chest and hips: the 2 ends of the body, each on its own bone, so that the spine can flex round the housing
    S.ell('chest', [0.3, 0.55, 0], [0.235, 0.372, 0.294], { metal: 0.5, gloss: 0.3 });
    S.ell('hips', [-0.34, 0.55, 0], [0.235, 0.372, 0.294], { metal: 0.5, gloss: 0.3 });
    // the hole for the gyroscope, from side to side
    S.cap('body', [C[0], C[1], -0.7], [C[0], C[1], 0.7], HOLE, HOLE, { sub: 1, col: DARK, k: 0.012 });
    // brass bezel around the hole with a bearing bridge on each side
    S.tor('body', [C[0], C[1], 0.33], HOLE + 0.02, 0.043, { m: 1, rot: [90, 0, 0], col: GOLD, metal: 1, gloss: 0.7, k: 0.012 });
    S.cap('body', [C[0] - 0.3, C[1], 0.335], [C[0] + 0.3, C[1], 0.335], 0.034, 0.034, { m: 1, col: DBRASS, metal: 1, gloss: 0.6, k: 0.012 });
    S.ell('body', [C[0], C[1], 0.34], [0.065, 0.065, 0.04], { m: 1, col: GOLD, metal: 1, gloss: 0.7, k: 0.012 });
    // head: small and pointed, with round cheeks
    S.cap('neck', [0.42, 0.53, 0], [0.64, 0.45, 0], 0.21, 0.15, { metal: 0.5, gloss: 0.3 });
    S.ell('head', [0.69, 0.43, 0], [0.17, 0.125, 0.135], { metal: 0.5, gloss: 0.3 });
    S.cap('head', [0.75, 0.41, 0], [0.92, 0.345, 0], 0.085, 0.042, { col: '#57402e', k: 0.05 });
    S.ell('head', [0.945, 0.34, 0], 0.044, { col: DARK, gloss: 0.8, k: 0.02 });
    S.ell('head', [0.6, 0.535, 0.118], [0.042, 0.055, 0.03], { m: 1, col: '#57402e', k: 0.03 });
    // legs, feet
    for (const [bn, x] of [['legFL', 0.37], ['legBL', -0.43]]) {
      const sn = bn.replace('leg', 'shin');   // the lower leg and the foot turn at the knee
      S.cap(bn, [x, 0.42, 0.27], [x + 0.01, 0.27, 0.285], 0.135, 0.12, { m: 1 });
      S.cap(sn, [x + 0.01, 0.27, 0.285], [x + 0.02, 0.15, 0.3], 0.12, 0.105, { m: 1 });
      S.ell(sn, [x + 0.07, 0.065, 0.3], [0.15, 0.065, 0.115], { m: 1, col: DARK, k: 0.03, gloss: 0.4 });
      S.tor(sn, [x + 0.02, 0.17, 0.3], 0.105, 0.03, { m: 1, col: GOLD, metal: 1, gloss: 0.7, k: 0.01 });
    }
    // tail
    S.tube(TB, TAIL, TR, { metal: 0.5, gloss: 0.3, k: 0.06 });
    // scales on the back: 7 rows on the shell bone. Rows above the hole are narrow. The back edge of each scale stands up over the next row.
    const pl = (i, col) => ({ col: col || (i % 2 ? BRONZE2 : BRONZE), guard: 1 });
    [26, 48, 72, 96, 120, 143, 165].forEach((phi, i) => {
      const over = phi > 58 && phi < 132, set = i % 2 ? (over ? [-13, 13] : [-36, -12, 12, 36]) : (over ? [-27, 0, 27] : [-46, -23, 0, 23, 46]);
      for (const psi of set) {
        const cp = Math.cos(phi * D2R), sp = Math.sin(phi * D2R), cs = Math.cos(psi * D2R), ss = Math.sin(psi * D2R);
        const n = [cp * cs / R[0], sp * cs / R[1], ss / R[2]], nl = Math.hypot(n[0], n[1], n[2]);
        plate(S, i < 2 ? 'shellF' : i < 5 ? 'shell' : 'shellB', [C[0] + R[0] * cp * cs + n[0] / nl * 0.014, C[1] + R[1] * sp * cs + n[1] / nl * 0.014, R[2] * ss], [n[0] / nl + sp * 0.4, n[1] / nl - cp * 0.4, n[2] / nl], 0.122, pl(i));
      }
    });
    // scales on the shoulders and the hips, on the head, on the tail
    for (const [bn, x] of [['legFL', 0.37], ['legBL', -0.43]]) {
      plate(S, bn, [x + 0.01, 0.45, 0.385], [0.1, 0.25, 1], 0.13, { m: 1, col: BRONZE });
      plate(S, bn, [x + 0.03, 0.31, 0.405], [0.1, 0.1, 1], 0.1, { m: 1, col: BRONZE2 });
    }
    plate(S, 'neck', [0.52, 0.71, 0], [0.5, 1, 0], 0.1, { col: BRONZE }); plate(S, 'neck', [0.6, 0.6, 0.1], [0.55, 1, 0.5], 0.085, { col: BRONZE2, m: 1 });
    plate(S, 'head', [0.69, 0.565, 0], [0.5, 1, 0], 0.085, { col: BRONZE }); plate(S, 'head', [0.79, 0.49, 0], [0.45, 1, 0], 0.06, { col: BRONZE2 });
    for (let j = 0; j < 4; j++) {
      const A0 = TAIL[j], B0 = TAIL[j + 1], dx = B0[0] - A0[0], dy = B0[1] - A0[1], dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl, nx = uy, ny = -ux;
      for (const [u, set] of [[0.12, [0]], [0.12, [62]], [0.6, [32]], [0.6, [-32]]]) for (const psi of set) {
        const rr = TR[j] + (TR[j + 1] - TR[j]) * u, cs = Math.cos(psi * D2R), ss = Math.sin(psi * D2R), mm = u < 0.5 && psi !== 0;
        plate(S, TB[j], [A0[0] + dx * u + nx * cs * rr, A0[1] + dy * u + ny * cs * rr, ss * rr], [nx * cs - ux * 0.34, ny * cs - uy * 0.34, ss], Math.max(0.06, rr * 0.66 + 0.02), { col: (j + (u < 0.5 ? 0 : 1)) % 2 ? BRONZE2 : BRONZE, m: mm ? 1 : 0 });
      }
    }
    S.ell('tail4', [-1.16, 0.125, 0], [0.075, 0.035, 0.055], { col: BRONZE, metal: 1, gloss: 0.55, k: 0.012, rot: [0, 0, 20] });
    // old leather straps from the pit harness: a collar, a strap over the back that holds the gyroscope, a strap at the root of the tail. Brass buckles.
    const lt = { col: LEATHER, k: 0.012, gloss: 0.12 }, bk = { col: GOLD, metal: 1, gloss: 0.7, k: 0.008 };
    S.tor('neck', [0.47, 0.53, 0], 0.222, 0.05, Object.assign({ rot: [0, 0, 70] }, lt));
    S.box('neck', [0.535, 0.7, 0.16], [0.045, 0.034, 0.055], 0.012, Object.assign({ rot: [42, 0, -18] }, bk));
    const sp = [];
    for (let th = -54; th <= 54; th += 13.5) sp.push([C[0] - 0.045, C[1] + (R[1] + 0.058) * Math.cos(th * D2R), (R[2] + 0.058) * Math.sin(th * D2R)]);
    S.tube('shell', sp, sp.map(() => 0.048), lt);
    for (const th of [36]) S.box('shell', [C[0] - 0.045, C[1] + (R[1] + 0.085) * Math.cos(th * D2R), (R[2] + 0.085) * Math.sin(th * D2R)], [0.066, 0.032, 0.055], 0.012, Object.assign({ rot: [th, 0, 0], m: 1 }, bk));
    S.ell('shell', sp[0], 0.05, Object.assign({ m: 0 }, bk)); S.ell('shell', sp[sp.length - 1], 0.05, bk);
    S.tor('tail1', [-0.555, 0.47, 0], 0.25, 0.046, Object.assign({ rot: [0, 0, -59] }, lt));
    S.box('tail1', [-0.42, 0.69, 0.1], [0.045, 0.032, 0.05], 0.012, Object.assign({ rot: [22, 0, 31] }, bk));
    // colour: glow band inside the hole, light belly, old patches on some scales, dark seams around the bezel, the red mark of the gyroscope, wear on the leather
    S.tor('body', C, HOLE, 0.035, { paint: 1, rot: [90, 0, 0], col: ICE, glow: 2.2, cb: 0.014 });
    S.ell('body', [0.0, 0.14, 0], [0.4, 0.07, 0.24], { paint: 1, col: '#6a5038', cb: 0.06 });
    for (const [x, y, z, r] of [[-0.2, 1.02, 0.1, 0.07], [0.22, 0.95, -0.14, 0.06], [-0.42, 0.78, 0.2, 0.06], [0.36, 0.72, 0.22, 0.05], [-0.8, 0.52, 0.06, 0.05], [0.1, 1.03, 0.16, 0.04], [-0.38, 0.86, -0.18, 0.05]])
      S.ell('shell', [x, y, z], r, { paint: 1, col: VERD, metal: 0.8, gloss: 0.2, cb: 0.03, op: 0.55 });
    S.tor('body', [C[0], C[1], 0.3], HOLE + 0.075, 0.016, { paint: 1, rot: [90, 0, 0], col: DARK, cb: 0.01, m: 1 });
    S.ell('body', [C[0] + Math.cos(52 * D2R) * (HOLE + 0.02), C[1] + Math.sin(52 * D2R) * (HOLE + 0.02), 0.37], [0.03, 0.05, 0.04], { paint: 1, col: '#c8241c', gloss: 0.4, cb: 0.008, rot: [0, 0, 52 - 90], m: 1 });
    for (const th of [-20, 8, 30]) S.ell('shell', [C[0] - 0.045, C[1] + (R[1] + 0.1) * Math.cos(th * D2R), (R[2] + 0.1) * Math.sin(th * D2R)], [0.035, 0.035, 0.035], { paint: 1, col: LEATHER2, cb: 0.02, op: 0.8 });
    S.ell('head', [0.43, 0.6, 0.2], 0.05, { paint: 1, col: LEATHER2, cb: 0.02, op: 0.8 });
    // dark patina at the edges of the scales and where they overlap
    S.paint((p, n, col, info) => {
      if (info.metal > 0.6 && info.glow < 0.1) { const e = 0.36 + 0.64 * info.ao * info.ao, g = 1 - info.ao; col[0] *= e * (1 - g * 0.25); col[1] *= e * (1 - g * 0.06); col[2] *= e * (1 - g * 0.1); }
    });

    // gyroscope rotor on its own bone: heavy brass rim, hub, 3 dark balance weights. Its inner ring, spokes and core are blue-white (heart piece).
    const rot = [torus(0.185, 0.042, 36, 10), new THREE.CylinderGeometry(0.06, 0.06, 0.13, 12).rotateX(Math.PI / 2)], wt = [], web = [torus(0.105, 0.017, 24, 6), new THREE.CylinderGeometry(0.038, 0.038, 0.2, 10).rotateX(Math.PI / 2)];
    for (let i = 0; i < 6; i++) web.push(new THREE.CylinderGeometry(0.014, 0.018, 0.15, 6).translate(0, 0.105, 0).rotateZ(i * TAU / 6));
    for (let i = 0; i < 3; i++) wt.push(new THREE.CylinderGeometry(0.034, 0.034, 0.1, 8).rotateX(Math.PI / 2).translate(0.185, 0, 0).rotateZ(i * TAU / 3 + 0.3));
    S.add('gyro', join(rot), GOLDM, { p: C });
    S.add('gyro', join(wt), DSTEEL, { p: C });
    S.add('gyro', join(web), CORE, { p: C, name: 'core' });
    // fixed axle, gimbal ring that tumbles in the hole
    S.add('body', join([new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8).rotateX(Math.PI / 2), at(new THREE.CylinderGeometry(0.04, 0.05, 0.03, 10).rotateX(Math.PI / 2), 0, 0, 0.375), at(new THREE.CylinderGeometry(0.05, 0.04, 0.03, 10).rotateX(Math.PI / 2), 0, 0, -0.375)]), STEEL, { p: C });
    S.add('body', join([torus(0.252, 0.016, 44, 6).rotateX(Math.PI / 2), at(ball(0.028, 8, 6), 0.252, 0, 0), at(ball(0.028, 8, 6), -0.252, 0, 0)]), STEEL, { p: C, name: 'gimbal' });
    // rivets on the bezel
    const rv = [];
    for (let i = 0; i < 10; i++) { const an = (i + 0.5) * TAU / 10; rv.push(at(ball(0.02, 8, 6), C[0] + Math.cos(an) * (HOLE + 0.02), C[1] + Math.sin(an) * (HOLE + 0.02), 0.372)); }
    S.add('body', join(rv), STEEL, { m: 1 });
    // crest: a row of scalloped plates on the spine and on the tail. They are the teeth of the saw.
    [34, 58, 82, 106, 130, 154].forEach((phi, i) => {
      S.add(i < 2 ? 'shellF' : i < 4 ? 'shell' : 'shellB', tooth(1.3 - Math.abs(i - 2.5) * 0.1), CRESTM, { p: [C[0] + R[0] * Math.cos(phi * D2R) * 1.03, C[1] + R[1] * Math.sin(phi * D2R) * 1.03, 0], r: [0, 0, phi - 90], name: 'cr' + i });
    });
    for (let j = 0; j < NTT; j++) {
      const A0 = TAIL[j], B0 = TAIL[j + 1], dx = B0[0] - A0[0], dy = B0[1] - A0[1], dl = Math.hypot(dx, dy), nx = dy / dl, ny = -dx / dl, u = 0.62, rr = TR[j] + (TR[j + 1] - TR[j]) * u;
      S.add(TB[j], tooth(0.92 - j * 0.14), CRESTM, { p: [A0[0] + dx * u + nx * (rr + 0.01), A0[1] + dy * u + ny * (rr + 0.01), 0], r: [0, 0, Math.atan2(ny, nx) / D2R - 90], name: 'tt' + j });
    }
    // maker's mark: tally marks in groups of five scratched on the top scales of the tail (its falls)
    for (const [j, offs] of [[0, [-0.075, 0.075]], [1, [0]]]) {
      const A0 = TAIL[j], B0 = TAIL[j + 1], dx = B0[0] - A0[0], dy = B0[1] - A0[1], dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl, rr = TR[j] + (TR[j + 1] - TR[j]) * 0.12;
      let px = uy - ux * 0.34, py = -ux - uy * 0.34; const l = Math.hypot(px, py); px /= l; py /= l;   // normal of the scale; (py, -px) lies in the scale and points to the tail tip
      const o = [A0[0] + dx * 0.12 + uy * rr + px * 0.033, A0[1] + dy * 0.12 - ux * rr + py * 0.033], ex = -py, ey = px, tl = [];
      const pt = (e, z) => [o[0] + ex * e, o[1] + ey * e, z];
      for (const z0 of offs) {
        for (let i = 0; i < 4; i++) { const z = z0 + (i - 1.5) * 0.024; tl.push(tube([pt(-0.04, z), pt(0, z + 0.003), pt(0.04, z)], [0.004, 0.0075, 0.004], { ring: 5 })); }
        tl.push(tube([pt(-0.03, z0 - 0.055), pt(0, z0), pt(0.03, z0 + 0.055)], [0.004, 0.0075, 0.004], { ring: 5 }));
      }
      S.add(TB[j], join(tl), SCRATCH);
    }
    // digging claws of steel: long at the front, short at the back
    const claw = (len, x, z, yaw) => at(tube([[0, 0, 0], [len * 0.55, 0.04, 0], [len, -0.04, 0]], [0.04, 0.033, 0.005], { ring: 7 }).rotateY(-yaw * D2R), x, 0.07, z);
    S.add('shinFL', join([claw(0.21, 0.5, 0.225, -14), claw(0.235, 0.52, 0.3, 0), claw(0.21, 0.5, 0.375, 14)]), CLAW, { m: 1 });
    // loose ends of the harness straps: they hang from the buckles and flap
    const se = rbox(0.07, 0.19, 0.02).translate(0, -0.095, 0);
    S.add('shell', se, LEATHERM, { p: [C[0] - 0.045, C[1] + (R[1] + 0.1) * Math.cos(36 * D2R), (R[2] + 0.1) * Math.sin(36 * D2R)], r: [-52, 0, 0], name: 'strapL' });
    S.add('neck', se, LEATHERM, { p: [0.535, 0.7, 0.2], r: [-28, 0, 8], s: 0.8, name: 'strapC' });
    S.add('shinBL', join([claw(0.115, -0.24, 0.235, -12), claw(0.125, -0.22, 0.3, 0), claw(0.115, -0.24, 0.365, 12)]), CLAW, { m: 1 });
    S.eye('head', [0.76, 0.48, 0.094], 0.044, { dir: [0.5, 0.3, 0.82], sclera: '#101c26', iris: '#58b4ff', iris2: '#d4eeff', pupil: 'round', lid: BRONZE2, open: 56, tilt: 7, glow: 1.2, size: 52, m: 1 });
  },
  anim(b, t, c) {
    const us = t.u * t.u * (3 - 2 * t.u), tm = t.tm, P = c.parts;
    const br = Math.sin(t.p), a = t.a * (1 - us * 0.9), s = t.s * (1 - us * 0.85), h = t.h, k = t.k;
    const melee = k === 'melee', slam = k === 'slam', buff = k === 'buff', spin = buff ? Math.min(1, a + s) : 0;
    // curl: 0 = walk, 1 = closed wheel. It rolls for a melee strike. In the ultimate it stays a wheel.
    const roll = melee ? s : 0, wheel = Math.max(roll, us), curl = Math.min(1, wheel + (melee ? a * 0.35 : slam ? a * 0.3 : 0) + h * 0.2), nc = 1 - curl, nw = 1 - wheel;
    const over = 4 * s * (1 - s);   // after a strike: parts go past their rest and come back
    // angles that must change smoothly are kept on the creature: the turn of the saw wheel and the extra turn of the gyroscope
    const dt = Math.min(0.1, Math.max(0, tm - (c.gyT === undefined ? tm : c.gyT)));
    c.gyT = tm;
    c.sawA = (c.sawA || 0) + dt * 15 * us; c.gyA = ((c.gyA || 0) + dt * (us * 36 + a * 6)) % (TAU * 64);
    if (us < 0.3) { const tg = Math.round(c.sawA / TAU) * TAU; c.sawA += (tg - c.sawA) * Math.min(1, dt * 14 * (1 - us / 0.3)); if (us === 0) c.sawA = 0; }
    // how the body moves. Without a speed (turn on the spot, old tools) the legs step on the spot or follow t.sw.
    const hasV = Math.abs(t.vf) + Math.abs(t.vs) > 0.05, fx = hasV ? cl(t.vf / 2.6, -1, 1) : t.sw * t.mv, fs = hasV ? cl(t.vs / 2.6, -1, 1) : 0;
    const spd = Math.min(1, Math.hypot(fx, fs)), acc = cl(t.af / 30, -1, 1), tn = t.tn, air = cl(t.va / 3, -1, 1), crouch = Math.max(0, -air) * nc;
    const hop = Math.pow(Math.max(0, Math.sin(t.p * 0.45)), 10) * (1 - t.mv) * nc;                         // a small eager hop now and then
    const shift = Math.sin(tm * 0.55) * Math.sin(tm * 0.2 + 1) * (1 - t.mv) * nc;                          // at rest the weight goes slowly from side to side
    const look = Math.sin(tm * 0.7) * Math.sin(tm * 0.24 + 2) * (1 - spd) * nc, sniff = Math.pow(Math.max(0, Math.sin(tm * 0.6 + 4)), 8) * Math.sin(tm * 13) * (1 - t.mv) * nc;
    // legs: a quick trot (diagonal pairs) at speed, 4 separate beats when it is slow. Each foot goes forward fast in the air with a bent knee, then back slowly on the ground.
    // The step follows the direction of the motion (forward, backward, to the side). In a turn the inner legs take shorter steps.
    const q = sm((spd - 0.3) / 0.4), wl = t.w * 2.1, mq = t.mv * nc, wind = a * (melee || slam ? 0.3 : 0.12) * nc;
    let dipF = 0, dipB = 0, yawF = 0, yawB = 0, rollF = 0;
    for (const [n, sg, fr, off] of [['FL', 1, 1, 1.571], ['FR', -1, 1, 4.712], ['BL', 1, -1, -q * 1.571], ['BR', -1, -1, 3.26 - q * 1.571]]) {
      const L = b['leg' + n], Sh = b['shin' + n], u = cyc(wl + off), sr = stride(u), lf = lift(u) * mq;
      const f = fx - sg * tn * 0.5, gs = fs + fr * tn * 0.45, land = u > SWG ? Math.pow(Math.max(0, 1 - (u - SWG) / 0.22), 2) * mq : 0;
      L.rotation.z = (sr * f * 0.44 + lf * 0.28 * cl(f * 3, -1, 1)) * nc - fr * curl + crouch * 0.25 * fr + wind * 0.5 * fr - air * Math.max(0, air) * 0.2 * fr;
      L.rotation.x = (-sr * gs * 0.4 - h * t.hz * 0.25 - sg * shift * 0.06) * nc;
      L.position.y += lf * 0.035;
      Sh.rotation.z = -lf * 0.85 - fr * (curl * 0.6 + crouch * 0.5 + wind) - land * 0.12;
      L.scale.setScalar(1 - curl * 0.3);
      if (fr > 0) { dipF += land; yawF += sg * sr * f; rollF += sg * lf; } else { dipB += land; yawB += sg * sr * f; }
    }
    // the body answers the legs: chest and hips turn against each other, each end drops when its feet land, the head stays level
    b.body.position.y += br * 0.006 + hop * 0.04 - a * 0.05 + (slam ? s * 0.1 : 0) + spin * 0.03 - crouch * 0.05 + us * (0.05 + Math.abs(Math.sin(c.sawA * 1.5)) * 0.02);
    b.body.position.x += (melee ? 0 : s * 0.1) - a * 0.06;
    b.body.rotation.z = (dipB - dipF) * 0.02 - ((t.w * 0.8 + tm * 11) % TAU) * roll - c.sawA + h * 0.06 + spin * 0.1 - (slam ? a * 0.08 : 0);
    b.body.rotation.x = us * Math.sin(tm * 3.1) * 0.05 + shift * 0.02;
    b.chest.rotation.y = yawF * 0.04 * mq - tn * 0.16 * nw;
    b.hips.rotation.y = yawB * 0.045 * mq + tn * 0.14 * nw;
    b.chest.position.y -= dipF * 0.022; b.hips.position.y -= dipB * 0.02;
    b.chest.rotation.x = rollF * 0.04 + shift * 0.04; b.hips.rotation.x = -shift * 0.035;
    b.chest.rotation.z = -curl * 0.25 - a * (melee ? 0.12 : 0.05) * nc + hop * 0.1 - h * t.hx * 0.1 * nc + over * 0.06;
    b.hips.rotation.z = curl * 0.25 + a * (melee ? 0.08 : 0) * nc - acc * 0.04 * nc;
    // scales: they breathe, they flare for the burst, and a wave runs along the back when it starts and stops. In the ultimate they stand up and buzz.
    const fl = 1 + (slam ? -a * 0.06 + s * 0.24 : 0) + roll * 0.04 - h * 0.04 + spin * 0.05 + t.gl * 0.012 * Math.sin(tm * 17) + us * (0.12 + 0.02 * Math.sin(tm * 43));
    const rip = Math.min(1, Math.abs(acc) * 1.4) * nw, r0 = Math.sin(tm * 21) * rip, r1 = Math.sin(tm * 21 - 1.5) * rip, r2 = Math.sin(tm * 21 - 3) * rip;
    const f0 = fl + Math.sin(t.p + 0.5) * 0.014 + r0 * 0.06, f1 = fl + br * 0.012 + r1 * 0.06, f2 = fl + Math.sin(t.p - 0.5) * 0.01 + r2 * 0.06;
    b.shellF.scale.set(f0, f0, f0); b.shell.scale.set(f1, f1, f1); b.shellB.scale.set(f2, f2, f2);
    // saw teeth: the crest plates on the spine and the tail rise with the wave of the scales. In the ultimate they stand up tall and lean into the cut.
    const up = us + (slam ? s * 0.35 : 0) + h * 0.15 + t.gl * 0.06 * (1 + Math.sin(tm * 8));
    for (let i = 0; i < NCR; i++) { const m = P['cr' + i], w = Math.max(0, Math.sin(tm * 21 - i * 0.75)) * rip * 0.35; m.scale.set(1 + up * 0.12, 1 + up * 1.15 + w, 1 + us * 0.5); m.rotation.z -= us * 0.42; }
    for (let i = 0; i < NTT; i++) { const m = P['tt' + i], w = Math.max(0, Math.sin(tm * 21 - 4.5 - i * 0.75)) * rip * 0.35; m.scale.set(1 + up * 0.2, 1 + up * 1.5 + w, 1 + us * 0.5); m.rotation.z -= us * 0.42; }
    // neck and head: they look around and sniff, stay level over the steps, lead a turn, tuck in for the curl
    b.neck.rotation.z = br * 0.03 + hop * 0.15 + dipF * 0.04 - curl * 0.7 - h * t.hx * 0.2 * nc - a * (melee ? 0.14 : 0) * nc + over * 0.12 + (slam ? s * 0.2 : 0) + spin * 0.15;
    b.neck.rotation.y = (-yawF * 0.03 * mq - tn * 0.1 * nw - look * 0.12 - h * t.hz * 0.2) * nc;
    b.head.rotation.z = br * 0.02 + hop * 0.1 + sniff * 0.05 - curl * 0.65 + (slam ? s * 0.1 : 0) + spin * 0.1 + spd * 0.05 * nc;
    b.head.rotation.y = (t.lk * 0.35 - look * 0.22) * nc;
    b.head.rotation.x = (Math.sin(t.p * 0.6) * 0.05 + look * 0.06) * nc;
    // tail: a heavy counter-weight on spring bones. Here: a slow wave, it swings against the hips, lifts off the ground at speed, curves into a turn,
    // wraps below the body for the curl, hits the ground for the burst
    for (let i = 0; i < 4; i++) {
      const bn = b[TB[i]];
      bn.rotation.y = (Math.sin(t.p * 1.2 - i * 0.7) * 0.1 * (1 - spd) + Math.sin(wl - 1.2 - i * 0.8) * 0.07 * mq + tn * 0.06 * nw) * nc;
      bn.rotation.z = Math.sin(t.p * 0.8 - i * 0.6) * 0.03 + wheel * (0.86 - i * 0.03) - h * 0.06 - a * (melee ? 0.1 : 0.16) + (slam ? s * 0.14 : 0) - spin * 0.06 * (i + 1) + hop * 0.12
        + (melee ? over * 0.12 : 0) - spd * 0.06 * nw + acc * 0.03 * nw + crouch * 0.05;
    }
    // loose ends of the straps: a small flap with each step (the springs do the rest)
    P.strapL.rotation.x += Math.sin(wl * 2 + 1) * 0.08 * mq - hop * 0.3 - up * 0.3;
    P.strapC.rotation.x += Math.sin(wl * 2) * 0.1 * mq - hop * 0.25 + sniff * 0.1;
    // gyroscope: it turns all the time, faster with speed and power. For the buff it turns the other way. In the ultimate the rings spin fast.
    b.gyro.rotation.z = (buff ? tm * 5 + t.o * 6 : -(tm * 5 + t.w * 1.2 + t.o * 4)) - c.gyA;
    const gm = P.gimbal;
    gm.rotation.x = tm * 1.1 + t.o * (0.8 + t.gl) + c.gyA * 0.55;
    gm.rotation.z = Math.sin(tm * 0.7) * 0.4 * (1 - us) + us * Math.sin(tm * 9) * 0.25 + tn * 0.3 * nw;   // the ring leans when the body turns
    const cs = 1 + a * 0.3 + spin * 0.4 + t.gl * 0.2 + 0.05 * Math.sin(tm * 14) + us * (0.3 + 0.1 * Math.sin(tm * 23));
    P.core.scale.set(cs, cs, 1 + s * 0.3 + spin * 0.4 + us * 0.5);
  },
  // loose parts: the heavy tail, the loose ends of the harness straps
  dyn: [
    { b: ['tail1', 'tail2', 'tail3', 'tail4'], k: 55, d: 6.5, amt: 0.8, drag: 2 },
    { b: ['strapL'], k: 34, d: 4, drag: 4, dir: [0, -0.62, 0.78] },
    { b: ['strapC'], k: 38, d: 4.2, drag: 4, dir: [0, -0.88, 0.47] }
  ]
};
