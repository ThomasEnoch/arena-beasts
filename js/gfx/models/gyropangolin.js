/* Gyropangolin - small pangolin of bronze plates with a brass gyroscope in a hole through its body. Iron / Volt. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, blade, ball, torus } from '../geo.js';
import { A } from '../rig.js';

const BRONZE = '#b47a3e', BRONZE2 = '#96602e', UNDER = '#3e2c22', DARK = '#241a16', GOLD = '#e6c052', DBRASS = '#8a6a28', TEAL = '#5ff0d8', VERD = '#4fa890';
const GOLDM = { col: '#f0c850', metal: 1, rough: 0.18, env: 1.6 };
const DSTEEL = { col: '#3a4048', metal: 0.9, rough: 0.4, env: 1 };
const STEEL = { col: '#aab4c0', metal: 1, rough: 0.25, env: 1.3 };
const CRESTM = { col: '#c98c4a', metal: 1, rough: 0.3, env: 1.2, flat: true };
const CLAW = { col: '#d8d2c4', rough: 0.25, metal: 0.4, env: 1 };
const CORE = { col: '#d8fff6', glow: '#3fe8c8', glowK: 3.4, noOut: true };

const D2R = Math.PI / 180, TAU = Math.PI * 2;
const C = [-0.02, 0.57, 0], R = [0.54, 0.47, 0.37], HOLE = 0.28;   // torso ellipsoid, radius of the hole through it
const TAIL = [[-0.47, 0.52, 0], [-0.67, 0.4, 0], [-0.86, 0.28, 0], [-1.02, 0.19, 0], [-1.15, 0.13, 0]], TR = [0.27, 0.2, 0.15, 0.105, 0.05], TB = ['tail1', 'tail2', 'tail3', 'tail4'];
const join = list => mergeGeometries(list.map(g => { g = g.index ? g.toNonIndexed() : g.clone(); g.deleteAttribute('uv'); return g; }));
const at = (g, x, y, z) => { g.translate(x, y, z); return g; };
const YAX = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion().setFromAxisAngle(YAX, Math.PI / 4), _e = new THREE.Euler(), _v = new THREE.Vector3();
// Armour plate: a flat diamond with centre P and normal n; one corner points along the body. A plate near the gyro hole becomes smaller so that it does not cover the hole.
function plate(S, bone, P, n, r, o) {
  if (o.guard) { const d = Math.hypot(P[0] - C[0], P[1] - C[1]) - HOLE - 0.03; if (Math.abs(P[2]) > 0.16) { if (d < 0.055) return; r = Math.min(r, d); } }
  _e.setFromQuaternion(_q.setFromUnitVectors(YAX, _v.set(n[0], n[1], n[2]).normalize()).multiply(_q2), 'XYZ');
  S.box(bone, P, [r * 0.84, 0.03, r * 0.84], 0.022, Object.assign({ rot: [_e.x / D2R, _e.y / D2R, _e.z / D2R], metal: 1, gloss: 0.55, k: 0.01 }, o));
}

export default {
  id: 'gyropangolin', rim: '#ffd890', focus: 'gyro', top: 1.25, rough: 0.5, opts: { cell: 0.024, mottle: 0.1, mottleF: 15 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', C).bone('shell', 'body', C).bone('gyro', 'body', C).bone('head', 'body', [0.46, 0.52, 0])
      .bone('legFL', 'body', [0.37, 0.42, 0.27], { m: 1 }).bone('legBL', 'body', [-0.43, 0.42, 0.27], { m: 1 })
      .bone('tail1', 'body', TAIL[0]).bone('tail2', 'tail1', TAIL[1]).bone('tail3', 'tail2', TAIL[2]).bone('tail4', 'tail3', TAIL[3]);
    S.color(UNDER);
    S.ell('body', C, R, { metal: 0.5, gloss: 0.3 });
    // the hole for the gyroscope, from side to side
    S.cap('body', [C[0], C[1], -0.7], [C[0], C[1], 0.7], HOLE, HOLE, { sub: 1, col: DARK, k: 0.012 });
    // brass bezel around the hole with a bearing bridge on each side
    S.tor('body', [C[0], C[1], 0.33], HOLE + 0.02, 0.043, { m: 1, rot: [90, 0, 0], col: GOLD, metal: 1, gloss: 0.7, k: 0.012 });
    S.cap('body', [C[0] - 0.3, C[1], 0.335], [C[0] + 0.3, C[1], 0.335], 0.034, 0.034, { m: 1, col: DBRASS, metal: 1, gloss: 0.6, k: 0.012 });
    S.ell('body', [C[0], C[1], 0.34], [0.065, 0.065, 0.04], { m: 1, col: GOLD, metal: 1, gloss: 0.7, k: 0.012 });
    // head: small and pointed
    S.cap('head', [0.42, 0.53, 0], [0.64, 0.45, 0], 0.21, 0.15, { metal: 0.5, gloss: 0.3 });
    S.ell('head', [0.69, 0.43, 0], [0.17, 0.125, 0.13], { metal: 0.5, gloss: 0.3 });
    S.cap('head', [0.75, 0.41, 0], [0.92, 0.345, 0], 0.085, 0.042, { col: '#57402e', k: 0.05 });
    S.ell('head', [0.945, 0.34, 0], 0.042, { col: DARK, gloss: 0.8, k: 0.02 });
    S.ell('head', [0.6, 0.53, 0.115], [0.04, 0.05, 0.028], { m: 1, col: '#57402e', k: 0.03 });
    // legs, feet
    for (const [bn, x] of [['legFL', 0.37], ['legBL', -0.43]]) {
      S.cap(bn, [x, 0.42, 0.27], [x + 0.02, 0.15, 0.3], 0.135, 0.105, { m: 1 });
      S.ell(bn, [x + 0.07, 0.065, 0.3], [0.15, 0.065, 0.115], { m: 1, col: DARK, k: 0.03, gloss: 0.4 });
      S.tor(bn, [x + 0.02, 0.17, 0.3], 0.105, 0.03, { m: 1, col: GOLD, metal: 1, gloss: 0.7, k: 0.01 });
    }
    // tail
    S.tube(TB, TAIL, TR, { metal: 0.5, gloss: 0.3, k: 0.06 });
    // plates on the back: 7 rows on the shell bone. Rows above the hole are narrow.
    const pl = (i, col) => ({ col: col || (i % 2 ? BRONZE2 : BRONZE), guard: 1 });
    [26, 48, 72, 96, 120, 143, 165].forEach((phi, i) => {
      const over = phi > 58 && phi < 132, set = i % 2 ? (over ? [-13, 13] : [-36, -12, 12, 36]) : (over ? [-27, 0, 27] : [-46, -23, 0, 23, 46]);
      for (const psi of set) {
        const cp = Math.cos(phi * D2R), sp = Math.sin(phi * D2R), cs = Math.cos(psi * D2R), ss = Math.sin(psi * D2R);
        const n = [cp * cs / R[0], sp * cs / R[1], ss / R[2]], nl = Math.hypot(n[0], n[1], n[2]);
        plate(S, 'shell', [C[0] + R[0] * cp * cs + n[0] / nl * 0.012, C[1] + R[1] * sp * cs + n[1] / nl * 0.012, R[2] * ss], [n[0] / nl + sp * 0.34, n[1] / nl - cp * 0.34, n[2] / nl], 0.112, pl(i));
      }
    });
    // plates on the shoulders and the hips, on the head, on the tail
    for (const [bn, x] of [['legFL', 0.37], ['legBL', -0.43]]) {
      plate(S, bn, [x + 0.01, 0.45, 0.385], [0.1, 0.25, 1], 0.125, { m: 1, col: BRONZE });
      plate(S, bn, [x + 0.03, 0.31, 0.405], [0.1, 0.1, 1], 0.095, { m: 1, col: BRONZE2 });
    }
    plate(S, 'head', [0.52, 0.71, 0], [0.5, 1, 0], 0.1, { col: BRONZE }); plate(S, 'head', [0.6, 0.6, 0.1], [0.55, 1, 0.5], 0.085, { col: BRONZE2, m: 1 });
    plate(S, 'head', [0.69, 0.565, 0], [0.5, 1, 0], 0.085, { col: BRONZE }); plate(S, 'head', [0.79, 0.49, 0], [0.45, 1, 0], 0.06, { col: BRONZE2 });
    for (let j = 0; j < 4; j++) {
      const A0 = TAIL[j], B0 = TAIL[j + 1], dx = B0[0] - A0[0], dy = B0[1] - A0[1], dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl, nx = uy, ny = -ux;
      for (const [u, set] of [[0.12, [0]], [0.12, [62]], [0.6, [32]], [0.6, [-32]]]) for (const psi of set) {
        const rr = TR[j] + (TR[j + 1] - TR[j]) * u, cs = Math.cos(psi * D2R), ss = Math.sin(psi * D2R), mm = u < 0.5 && psi !== 0;
        plate(S, TB[j], [A0[0] + dx * u + nx * cs * rr, A0[1] + dy * u + ny * cs * rr, ss * rr], [nx * cs - ux * 0.34, ny * cs - uy * 0.34, ss], Math.max(0.06, rr * 0.66 + 0.02), { col: (j + (u < 0.5 ? 0 : 1)) % 2 ? BRONZE2 : BRONZE, m: mm ? 1 : 0 });
      }
    }
    S.ell('tail4', [-1.16, 0.125, 0], [0.075, 0.035, 0.055], { col: BRONZE, metal: 1, gloss: 0.55, k: 0.012, rot: [0, 0, 20] });
    // colour: glow band inside the hole, light belly, verdigris on some plates, dark seams around the bezel
    S.tor('body', C, HOLE, 0.035, { paint: 1, rot: [90, 0, 0], col: TEAL, glow: 2.4, cb: 0.014 });
    S.ell('body', [0.0, 0.14, 0], [0.4, 0.07, 0.24], { paint: 1, col: '#6a5038', cb: 0.06 });
    for (const [x, y, z, r] of [[-0.2, 1.02, 0.1, 0.07], [0.22, 0.95, -0.14, 0.06], [-0.42, 0.78, 0.2, 0.06], [0.36, 0.72, 0.22, 0.05], [-0.8, 0.52, 0.06, 0.05], [0.1, 1.03, 0.16, 0.04], [-0.38, 0.86, -0.18, 0.05]])
      S.ell('shell', [x, y, z], r, { paint: 1, col: VERD, cb: 0.03, op: 0.7 });
    S.tor('body', [C[0], C[1], 0.3], HOLE + 0.075, 0.016, { paint: 1, rot: [90, 0, 0], col: DARK, cb: 0.01, m: 1 });
    // darker edges where the plates overlap
    S.paint((p, n, col, info) => { if (info.metal > 0.6 && info.glow < 0.1) { const e = 0.5 + 0.5 * info.ao * info.ao; col[0] *= e; col[1] *= e * 0.97; col[2] *= e * 0.94; } });

    // gyroscope rotor on its own bone: heavy rim, 6 spokes, hub, 3 dark balance weights
    const rot = [torus(0.185, 0.042, 36, 10), torus(0.1, 0.014, 24, 6), new THREE.CylinderGeometry(0.06, 0.06, 0.13, 12).rotateX(Math.PI / 2)], wt = [];
    for (let i = 0; i < 6; i++) rot.push(new THREE.CylinderGeometry(0.014, 0.018, 0.15, 6).translate(0, 0.105, 0).rotateZ(i * TAU / 6));
    for (let i = 0; i < 3; i++) wt.push(new THREE.CylinderGeometry(0.034, 0.034, 0.1, 8).rotateX(Math.PI / 2).translate(0.185, 0, 0).rotateZ(i * TAU / 3 + 0.3));
    S.add('gyro', join(rot), GOLDM, { p: C });
    S.add('gyro', join(wt), DSTEEL, { p: C });
    S.add('gyro', new THREE.CylinderGeometry(0.036, 0.036, 0.19, 10).rotateX(Math.PI / 2), CORE, { p: C, name: 'core' });
    // fixed axle, gimbal ring that tumbles in the hole
    S.add('body', join([new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8).rotateX(Math.PI / 2), at(new THREE.CylinderGeometry(0.04, 0.05, 0.03, 10).rotateX(Math.PI / 2), 0, 0, 0.375), at(new THREE.CylinderGeometry(0.05, 0.04, 0.03, 10).rotateX(Math.PI / 2), 0, 0, -0.375)]), STEEL, { p: C });
    S.add('body', join([torus(0.252, 0.014, 44, 6).rotateX(Math.PI / 2), at(ball(0.026, 8, 6), 0.252, 0, 0), at(ball(0.026, 8, 6), -0.252, 0, 0)]), STEEL, { p: C, name: 'gimbal' });
    // rivets on the bezel
    const rv = [];
    for (let i = 0; i < 10; i++) { const an = (i + 0.5) * TAU / 10; rv.push(at(ball(0.02, 8, 6), C[0] + Math.cos(an) * (HOLE + 0.02), C[1] + Math.sin(an) * (HOLE + 0.02), 0.372)); }
    S.add('body', join(rv), STEEL, { m: 1 });
    // crest: a row of scalloped plates on the spine
    const cr = [];
    [34, 58, 82, 106, 130, 154].forEach((phi, i) => {
      const g = blade([[-0.075, -0.02], [0.07, -0.02], [0.06, 0.05], [-0.03, 0.12], [-0.11, 0.1]], 0.036, { bevel: 0.012, bevelSeg: 1 }), s = 1.3 - Math.abs(i - 2.5) * 0.1;
      g.scale(s, s, 1); g.rotateZ((phi - 90) * D2R);
      cr.push(at(g, C[0] + R[0] * Math.cos(phi * D2R) * 1.03, C[1] + R[1] * Math.sin(phi * D2R) * 1.03, 0));
    });
    S.add('shell', join(cr), CRESTM);
    // digging claws: long at the front, short at the back
    const claw = (len, x, z, yaw) => at(tube([[0, 0, 0], [len * 0.55, 0.035, 0], [len, -0.04, 0]], [0.036, 0.03, 0.005], { ring: 7 }).rotateY(-yaw * D2R), x, 0.07, z);
    S.add('legFL', join([claw(0.19, 0.5, 0.23, -12), claw(0.21, 0.52, 0.3, 0), claw(0.19, 0.5, 0.37, 12)]), CLAW, { m: 1 });
    S.add('legBL', join([claw(0.1, -0.24, 0.24, -12), claw(0.11, -0.22, 0.3, 0), claw(0.1, -0.24, 0.36, 12)]), CLAW, { m: 1 });
    S.eye('head', [0.765, 0.475, 0.092], 0.036, { dir: [0.5, 0.28, 0.82], sclera: '#0e201c', iris: '#3fe8c8', iris2: '#d8fff4', pupil: 'bar', lid: BRONZE2, open: 44, tilt: -8, glow: 1.4, size: 50, m: 1 });
  },
  anim(b, t, c) {
    const br = Math.sin(t.p), a = t.a, s = t.s, h = t.h, k = t.k;
    const melee = k === 'melee', slam = k === 'slam', buff = k === 'buff', spin = buff ? Math.min(1, a + s) : 0;
    // curl: 0 = walk, 1 = closed wheel. It rolls for a melee strike.
    const roll = melee ? s : 0, curl = Math.min(1, roll + (melee ? a * 0.35 : slam ? a * 0.3 : 0) + h * 0.2);
    A.quad(b, ['legFL', 'legFR', 'legBL', 'legBR'], t, 0.55 * (1 - curl), 0.05 * (1 - curl));
    b.body.position.y += br * 0.01 + Math.abs(Math.sin(t.w)) * 0.03 * t.mv * (1 - roll) - a * 0.05 + (slam ? s * 0.1 : 0) + spin * 0.03;
    b.body.position.x += (melee ? 0 : s * 0.1) - a * 0.06;
    b.body.rotation.z = Math.sin(t.w * 2) * 0.03 * t.mv * (1 - roll) - ((t.w * 0.8 + t.tm * 11) % TAU) * roll + h * 0.1 + spin * 0.1 - (slam ? a * 0.08 : 0);
    b.body.rotation.x = Math.sin(t.w) * 0.04 * t.mv * (1 - roll) + t.sl * 0.1;
    // plates: they flare for the burst
    const fl = 1 + br * 0.012 + (slam ? -a * 0.06 + s * 0.24 : 0) + roll * 0.04 - h * 0.04 + spin * 0.05 + t.gl * 0.012 * Math.sin(t.tm * 17);
    b.shell.scale.set(fl, fl, fl);
    // head: it looks around, it tucks in for the curl
    b.head.rotation.z = br * 0.04 + Math.sin(t.w) * 0.06 * t.mv - curl * 1.35 - t.sw * 0.06 + (slam ? s * 0.3 : 0) + spin * 0.25;
    b.head.rotation.y = t.lk * 0.35 * (1 - curl);
    b.head.rotation.x = Math.sin(t.p * 0.6) * 0.05 * (1 - curl);
    // legs fold in when it curls
    b.legFL.rotation.z -= curl * 1.0; b.legFR.rotation.z -= curl * 1.0; b.legBL.rotation.z += curl * 1.0; b.legBR.rotation.z += curl * 1.0;
    const ls = 1 - curl * 0.3;
    b.legFL.scale.setScalar(ls); b.legFR.scale.setScalar(ls); b.legBL.scale.setScalar(ls); b.legBR.scale.setScalar(ls);
    // tail: slow wave, it wraps below the body for the curl, it hits the ground for the burst
    for (let i = 0; i < 4; i++) {
      const bn = b[TB[i]];
      bn.rotation.y = Math.sin(t.p * 1.2 - i * 0.7) * (0.1 + t.mv * 0.06) * (1 - curl) + t.sl * 0.22;
      bn.rotation.z = Math.sin(t.p * 0.8 - i * 0.6) * 0.03 + roll * (0.86 - i * 0.03) - h * 0.06 - t.sw * 0.05 - a * (melee ? 0.1 : 0.16) + (slam ? s * 0.14 : 0) - spin * 0.06 * (i + 1);
    }
    // gyroscope: it turns all the time, faster with speed and power. For the buff it turns the other way.
    b.gyro.rotation.z = buff ? t.tm * 5 + t.o * 6 : -(t.tm * 5 + t.w * 1.2 + t.o * 4);
    const gm = c.parts.gimbal;
    gm.rotation.x = t.tm * 1.1 + t.o * (0.8 + t.gl);
    gm.rotation.z = Math.sin(t.tm * 0.7) * 0.4;
    c.parts.core.scale.set(1 + a * 0.5 + spin * 0.6 + t.gl * 0.3 + 0.08 * Math.sin(t.tm * 14), 1 + a * 0.5 + spin * 0.6 + t.gl * 0.3 + 0.08 * Math.sin(t.tm * 14), 1 + s * 0.3 + spin * 0.4);
  }
};
