/* Mercurystag - obsidian stag. Its antlers are drops of liquid silver that float in the shape of a crown. Shade / Iron. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { crystal, ball } from '../geo.js';
import { A } from '../rig.js';

const OBS = '#232133', OBS2 = '#353150', DEEP = '#13121b', SILVER = '#d5dbe6';
const SHARD = { col: '#242134', rough: 0.12, flat: true, env: 1.5 };
const CHROME = { col: '#e9eff6', metal: 1, rough: 0.05, env: 1.6 };
const HEART = { col: '#eaf4ff', metal: 1, rough: 0.05, env: 1.6, glow: '#8fc4ff', glowK: 0.9 };
const LEGS = ['legFL', 'legFR', 'legBL', 'legBR'];

// antler of the left side: [x, y, z, radius, bone index]. Beam, brow tine, front tine, back tine, crown fork.
const DROPS = [
  [0.83, 1.86, 0.12, 0.07, 0], [0.78, 1.95, 0.2, 0.064, 0], [0.73, 2.03, 0.29, 0.058, 0],
  [0.69, 2.11, 0.38, 0.052, 1], [0.67, 2.2, 0.455, 0.046, 1], [0.67, 2.29, 0.5, 0.04, 1],
  [0.7, 2.37, 0.515, 0.034, 2], [0.75, 2.44, 0.5, 0.028, 2], [0.81, 2.49, 0.46, 0.022, 2],
  [0.93, 1.93, 0.17, 0.048, 0], [1.02, 1.99, 0.21, 0.038, 0], [1.1, 2.06, 0.24, 0.028, 0], [1.16, 2.13, 0.25, 0.02, 0],
  [0.84, 2.08, 0.33, 0.042, 1], [0.93, 2.15, 0.36, 0.033, 1], [1.01, 2.23, 0.37, 0.024, 1],
  [0.77, 2.26, 0.47, 0.036, 1], [0.86, 2.33, 0.49, 0.028, 1], [0.94, 2.41, 0.49, 0.02, 1],
  [0.58, 2.15, 0.42, 0.04, 1], [0.48, 2.21, 0.46, 0.031, 1], [0.39, 2.28, 0.49, 0.023, 1],
  [0.6, 2.42, 0.54, 0.03, 2], [0.52, 2.48, 0.56, 0.022, 2]
];
const ANT = [[0.84, 1.8, 0.1], [0.71, 2.07, 0.335], [0.685, 2.33, 0.51]];
// free drops near the antler: [x, y, z, radius, bone index]
const SAT = [[1.23, 2.21, 0.27, 0.02, 0], [0.97, 2.1, 0.3, 0.024, 0], [0.55, 2.05, 0.3, 0.026, 1], [0.3, 2.34, 0.52, 0.018, 1], [0.87, 2.56, 0.42, 0.02, 2], [0.45, 2.55, 0.58, 0.016, 2]];

function join(list) {
  return mergeGeometries(list.map(g => { const q = g.index ? g.toNonIndexed() : g.clone(); q.deleteAttribute('uv'); if (!q.getAttribute('normal')) q.computeVertexNormals(); return q; }));
}
// obsidian shard at p that points along d
function shard(p, d, r, up, down, sides) {
  const g = crystal(r, up, down === undefined ? r * 0.8 : down, sides || 5);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]).normalize()));
  return g.translate(p[0], p[1], p[2]);
}

export default {
  id: 'mercurystag', rim: '#cfe0ff', focus: 'ant2L', top: 2.55, rough: 0.5,
  opts: { cell: 0.026, mottle: 0.12, mottleF: 7 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.92, 0]).bone('chest', 'body', [0.3, 0.95, 0])
      .bone('neck1', 'chest', [0.5, 1.06, 0]).bone('neck2', 'neck1', [0.72, 1.33, 0]).bone('head', 'neck2', [0.83, 1.56, 0])
      .bone('earL', 'head', [0.83, 1.7, 0.09], { m: 1 })
      .bone('ant1L', 'head', ANT[0], { m: 1 }).bone('ant2L', 'ant1L', ANT[1], { m: 1 }).bone('ant3L', 'ant2L', ANT[2], { m: 1 })
      .bone('legFL', 'body', [0.4, 0.82, 0.16], { m: 1 }).bone('legBL', 'body', [-0.5, 0.88, 0.17], { m: 1 })
      .bone('tail', 'body', [-0.78, 1.08, 0]);

    const G = { gloss: 0.3 }, GM = { m: 1, gloss: 0.3 }, FAC = { col: OBS2, gloss: 0.9, k: 0.018 }, O = (a, b) => Object.assign({}, a, b);
    const HOOF = { col: SILVER, metal: 1, gloss: 0.9, k: 0.02 };
    S.color(OBS);
    // torso: deep chest, lean barrel, strong rump, withers
    S.ell('chest', [0.36, 0.94, 0], [0.36, 0.31, 0.26], G);
    S.ell('body', [-0.06, 0.93, 0], [0.48, 0.26, 0.23], G);
    S.ell('body', [-0.48, 0.95, 0], [0.32, 0.3, 0.25], G);
    S.ell('chest', [0.3, 1.16, 0], [0.2, 0.11, 0.12], G);
    S.ell('chest', [0.6, 0.86, 0], [0.16, 0.2, 0.17], G);
    // cut facets: keel on the chest, flank plates, croup plate, ridge plates on the spine
    S.box('chest', [0.66, 0.9, 0], [0.1, 0.2, 0.1], 0.02, O(FAC, { rot: [0, 45, -12] }));
    S.box('body', [-0.04, 0.98, 0.215], [0.3, 0.13, 0.03], 0.02, O(FAC, { m: 1, rot: [-8, 2, 4] }));
    S.box('body', [-0.5, 1.2, 0], [0.2, 0.05, 0.13], 0.03, O(FAC, { rot: [0, 0, 8] }));
    for (const [x, y] of [[0.12, 1.185], [-0.06, 1.175], [-0.24, 1.18]]) S.box('body', [x, y, 0], [0.07, 0.035, 0.06], 0.02, O(FAC, { rot: [0, 0, 14] }));
    // the socket of the mercury heart
    S.ell('chest', [0.74, 0.93, 0], [0.09, 0.105, 0.095], { sub: 1, col: '#b8d6ff', glow: 1.5, k: 0.02 });
    S.tor('chest', [0.7, 0.93, 0], 0.1, 0.03, { rot: [0, 0, 90], col: SILVER, metal: 1, gloss: 0.9, k: 0.012 });
    // front legs: shoulder blade, forearm, knee, cannon, silver hoof
    S.ell('legFL', [0.38, 0.92, 0.19], [0.17, 0.22, 0.1], GM);
    S.box('legFL', [0.36, 0.97, 0.262], [0.11, 0.15, 0.03], 0.02, O(FAC, { m: 1, rot: [6, -10, 14] }));
    S.cap('legFL', [0.4, 0.84, 0.17], [0.44, 0.49, 0.18], 0.125, 0.066, GM);
    S.ell('legFL', [0.445, 0.48, 0.18], [0.075, 0.08, 0.07], O(FAC, { m: 1, k: 0.03 }));
    S.cap('legFL', [0.44, 0.46, 0.18], [0.42, 0.16, 0.18], 0.055, 0.047, GM);
    S.ell('legFL', [0.42, 0.17, 0.18], [0.062, 0.05, 0.062], O(HOOF, { m: 1 }));
    S.cap('legFL', [0.43, 0.1, 0.18], [0.48, 0.055, 0.18], 0.062, 0.058, O(HOOF, { m: 1 }));
    // back legs: haunch, thigh, gaskin, hock, cannon, silver hoof
    S.ell('legBL', [-0.5, 0.9, 0.19], [0.23, 0.27, 0.12], GM);
    S.box('legBL', [-0.52, 0.94, 0.285], [0.13, 0.16, 0.03], 0.02, O(FAC, { m: 1, rot: [6, 8, -16] }));
    S.cap('legBL', [-0.46, 0.8, 0.19], [-0.38, 0.58, 0.2], 0.13, 0.08, GM);
    S.cap('legBL', [-0.38, 0.58, 0.2], [-0.6, 0.42, 0.2], 0.076, 0.058, GM);
    S.ell('legBL', [-0.605, 0.42, 0.2], [0.07, 0.075, 0.066], O(FAC, { m: 1, k: 0.03 }));
    S.cap('legBL', [-0.6, 0.42, 0.2], [-0.55, 0.16, 0.2], 0.052, 0.046, GM);
    S.ell('legBL', [-0.55, 0.17, 0.2], [0.06, 0.05, 0.06], O(HOOF, { m: 1 }));
    S.cap('legBL', [-0.54, 0.1, 0.2], [-0.49, 0.055, 0.2], 0.062, 0.058, O(HOOF, { m: 1 }));
    // neck and head
    S.tube(['neck1', 'neck2', 'head'], [[0.5, 1.08, 0], [0.7, 1.3, 0], [0.8, 1.5, 0], [0.85, 1.6, 0]], [0.22, 0.16, 0.12, 0.115], { gloss: 0.3, k: 0.07 });
    S.ell('head', [0.9, 1.62, 0], [0.14, 0.125, 0.118], G);
    S.cap('head', [0.96, 1.6, 0], [1.2, 1.49, 0], 0.095, 0.055, G);
    S.cap('head', [0.9, 1.53, 0], [1.14, 1.44, 0], 0.062, 0.04, G);
    S.box('head', [0.98, 1.7, 0], [0.1, 0.03, 0.07], 0.02, O(FAC, { rot: [0, 0, -24] }));
    S.box('head', [0.95, 1.6, 0.105], [0.07, 0.05, 0.025], 0.02, O(FAC, { m: 1, rot: [0, -14, -20] }));
    S.ell('head', [1.245, 1.475, 0], [0.04, 0.04, 0.048], { col: SILVER, metal: 1, gloss: 1, k: 0.02 });
    S.cap('head', [0.855, 1.7, 0.09], [0.84, 1.8, 0.1], 0.05, 0.042, { m: 1, col: SILVER, metal: 1, gloss: 0.9, k: 0.02 });
    S.cap('earL', [0.83, 1.7, 0.1], [0.74, 1.79, 0.3], 0.052, 0.024, { m: 1, gloss: 0.3, k: 0.04 });
    S.ell('head', [1.02, 1.685, 0], [0.04, 0.03, 0.035], { col: '#cfe4ff', glow: 1.8, k: 0.012 });
    S.tor('head', [0.985, 1.66, 0], 0.118, 0.022, { rot: [0, 0, 62], col: SILVER, metal: 1, gloss: 1, k: 0.012 });
    // tail
    S.cap('tail', [-0.76, 1.08, 0], [-0.9, 1.0, 0], 0.07, 0.042, G);

    // --- paint: silver veins. Each vein is a thin sheet that cuts through the stone. ------------
    const VN = (bn, c, r, rot, o) => S.ell(bn, c, r, Object.assign({ paint: 1, col: '#e3e9f4', metal: 1, gloss: 1, glow: 0.45, cb: 0.011, rot }, o));
    VN('body', [0.1, 0.99, 0.2], [0.3, 0.011, 0.14], [0, 0, 18], { m: 1 });
    VN('body', [-0.3, 0.88, 0.2], [0.26, 0.011, 0.14], [0, 0, -14], { m: 1 });
    VN('body', [-0.07, 0.82, 0.2], [0.011, 0.13, 0.14], [0, 0, 36], { m: 1 });
    VN('body', [-0.3, 1.05, 0.2], [0.011, 0.13, 0.14], [0, 0, -42], { m: 1 });
    VN('legFL', [0.43, 0.6, 0.24], [0.012, 0.4, 0.1], [0, 0, 5], { m: 1 });
    VN('legFL', [0.34, 0.86, 0.24], [0.16, 0.012, 0.1], [0, 0, 38], { m: 1 });
    VN('legBL', [-0.5, 0.82, 0.26], [0.26, 0.012, 0.1], [0, 0, -40], { m: 1 });
    VN('legBL', [-0.57, 0.3, 0.26], [0.012, 0.18, 0.1], [0, 0, -11], { m: 1 });
    VN('legBL', [-0.6, 1.0, 0.24], [0.012, 0.16, 0.1], [0, 0, 20], { m: 1 });
    VN('neck1', [0.64, 1.3, 0.11], [0.3, 0.3, 0.012], [0, 0, 0], { m: 1 });
    VN('neck2', [0.72, 1.36, 0], [0.012, 0.14, 0.2], [0, 0, 50]);
    VN('head', [1.08, 1.6, 0], [0.19, 0.12, 0.012], [0, 0, 0]);
    VN('head', [0.94, 1.62, 0.1], [0.012, 0.1, 0.08], [0, 0, 28], { m: 1 });
    VN('chest', [0.56, 0.98, 0], [0.012, 0.3, 0.3], [0, 0, 58]);
    // pools where the veins meet, inner ear, hoof bands
    for (const [bn, x, y, r] of [['body', -0.135, 0.915, 0.036], ['body', -0.38, 0.97, 0.028], ['legFL', 0.4, 0.93, 0.04], ['legBL', -0.55, 0.9, 0.04]])
      S.cap(bn, [x, y, 0.1], [x, y, 0.4], r, r, { paint: 1, col: '#e3e9f4', metal: 1, gloss: 1, glow: 0.6, cb: 0.01, m: 1 });
    S.cap('earL', [0.8, 1.76, 0.17], [0.76, 1.8, 0.27], 0.022, 0.012, { paint: 1, col: '#aeb9cc', metal: 1, gloss: 0.8, cb: 0.012, m: 1 });
    S.ell('body', [0, 0.69, 0], [0.5, 0.06, 0.16], { paint: 1, col: DEEP, cb: 0.05 });

    // --- obsidian shards: mane, chest ruff, spine, haunch, joints, tail, beard -------------------
    S.add('neck1', join([shard([0.44, 1.24, 0], [-0.62, 0.78, 0], 0.055, 0.22), shard([0.53, 1.36, 0.02], [-0.7, 0.7, 0.1], 0.05, 0.2), shard([0.5, 1.3, -0.03], [-0.75, 0.6, -0.2], 0.04, 0.15)]), SHARD, { p: [0, 0, 0] });
    S.add('neck2', join([shard([0.62, 1.47, 0], [-0.74, 0.66, 0], 0.045, 0.18), shard([0.69, 1.58, -0.015], [-0.8, 0.6, -0.1], 0.04, 0.15), shard([0.66, 1.52, 0.03], [-0.8, 0.5, 0.3], 0.03, 0.11)]), SHARD, { p: [0, 0, 0] });
    S.add('chest', join([shard([0.68, 1.1, 0], [0.85, -0.5, 0], 0.055, 0.2), shard([0.64, 1.12, 0.09], [0.7, -0.45, 0.5], 0.045, 0.17), shard([0.64, 1.12, -0.09], [0.7, -0.45, -0.5], 0.045, 0.17), shard([0.6, 0.7, 0], [0.5, -0.85, 0], 0.045, 0.14)]), SHARD, { p: [0, 0, 0] });
    S.add('body', join([shard([-0.42, 1.22, 0], [-0.5, 0.86, 0], 0.045, 0.15), shard([-0.6, 1.2, 0], [-0.65, 0.75, 0], 0.05, 0.19), shard([-0.72, 1.14, 0], [-0.8, 0.6, 0], 0.04, 0.14)]), SHARD, { p: [0, 0, 0] });
    S.add('legBL', shard([0, 0, 0], [-0.7, 0.45, 0.55], 0.045, 0.18), SHARD, { p: [-0.66, 1.02, 0.24], m: 1 });
    S.add('legFL', shard([0, 0, 0], [-0.85, 0.5, 0.1], 0.03, 0.13), SHARD, { p: [0.39, 0.52, 0.18], m: 1 });
    S.add('legBL', shard([0, 0, 0], [-0.7, 0.7, 0.05], 0.03, 0.14), SHARD, { p: [-0.65, 0.46, 0.2], m: 1 });
    S.add('tail', join([shard([-0.9, 1.0, 0], [-0.75, -0.65, 0], 0.045, 0.2), shard([-0.86, 1.03, 0.03], [-0.9, -0.2, 0.4], 0.03, 0.12), shard([-0.86, 1.03, -0.03], [-0.9, -0.2, -0.4], 0.03, 0.12)]), SHARD, { p: [0, 0, 0] });
    S.add('head', shard([0, 0, 0], [0.15, -1, 0], 0.028, 0.13), SHARD, { p: [1.06, 1.43, 0] });

    // --- mercury: the heart in the chest, the antlers, the free drops -------------------------------
    S.add('chest', ball(0.068, 18, 12), HEART, { p: [0.72, 0.93, 0], name: 'heart' });
    S.add('body', join([ball(0.036, 12, 8).translate(-0.135, 0.915, 0.232), ball(0.028, 10, 8).translate(-0.38, 0.97, 0.245), ball(0.022, 10, 8).translate(0.02, 1.0, 0.222)]), CHROME, { p: [0, 0, 0], m: 1 });
    S.add('legFL', ball(0.04, 12, 8), CHROME, { p: [0.4, 0.93, 0.292], m: 1 });
    S.add('legBL', ball(0.04, 12, 8), CHROME, { p: [-0.55, 0.9, 0.312], m: 1 });
    for (let k = 0; k < 3; k++) {
      const grp = DROPS.filter(d => d[4] === k).map(d => ball(d[3] * 1.22 + 0.004, d[3] > 0.035 ? 16 : 12, d[3] > 0.035 ? 12 : 8).translate(d[0] - ANT[k][0], d[1] - ANT[k][1], d[2] - ANT[k][2]));
      S.add('ant' + (k + 1) + 'L', join(grp), CHROME, { p: ANT[k], m: 1 });
    }
    SAT.forEach((d, i) => S.add('ant' + (d[4] + 1) + 'L', ball(d[3] * 1.3, 12, 8), CHROME, { p: [d[0], d[1], d[2]], m: 1, name: 'sa' + i + 'L' }));
    S.eye('head', [0.965, 1.655, 0.09], 0.048, { dir: [0.5, 0.12, 0.85], sclera: '#dfe8ff', iris: '#f4f8ff', iris2: '#9fc4ff', pupil: 'none', lid: OBS2, open: 30, tilt: -14, glow: 1.6, m: 1 });
  },
  anim(b, t, c) {
    const P = c.parts, br = Math.sin(t.p), a = t.a, s = t.s, h = t.h, k = t.k, melee = k === 'melee', shot = k === 'shot', rear = k === 'buff' || k === 'slam';
    A.quad(b, LEGS, t, 0.5, 0.075);
    const gait = Math.abs(Math.sin(t.w)) * t.mv;
    // rear up on the back legs (shield and stomp): the body turns, the back hooves stay in place
    const up = rear ? a * 0.3 - s * (k === 'slam' ? 0.34 : 0.1) : 0;
    const drop = melee ? a * 0.07 : 0;
    b.body.rotation.z += up + Math.sin(t.w * 2) * 0.02 * t.mv + h * 0.07 + (melee ? -a * 0.05 + s * 0.04 : 0);
    b.body.position.y += br * 0.012 + gait * 0.04 + up * 0.5 - drop;
    b.body.position.x += (melee ? s * 0.36 - a * 0.14 : shot ? s * 0.06 - a * 0.05 : 0) - h * 0.06 - up * 0.1;
    b.legBL.rotation.z -= up; b.legBR.rotation.z -= up;
    b.legFL.rotation.z += up * 1.6 + (melee ? s * 0.5 - a * 0.15 : 0); b.legFR.rotation.z += up * 2.2 + (melee ? s * 0.4 : 0);
    if (melee) { b.legBL.rotation.z -= s * 0.45 - a * 0.15; b.legBR.rotation.z -= s * 0.38 - a * 0.1; b.legFR.rotation.z += a * Math.sin(t.tm * 20) * 0.3; b.legFR.position.y += a * Math.max(0, Math.sin(t.tm * 20)) * 0.07; }
    for (const n of LEGS) b[n].position.y += drop * 0.9;
    b.chest.scale.setScalar(1 + br * 0.016 + a * 0.03);
    // neck: proud curve. It drops for the charge, it pulls back and whips for the shot.
    const sway = Math.sin(t.p * 0.6);
    const low = Math.min(1, a + s), n1 = melee ? -low * 0.5 : shot ? a * 0.28 - s * 0.45 : rear ? a * 0.1 - s * 0.2 : 0;
    b.neck1.rotation.z = sway * 0.03 + t.sw * 0.07 + n1 + h * 0.22 + Math.sin(t.w * 2 + 0.6) * 0.03 * t.mv;
    b.neck2.rotation.z = -sway * 0.03 + n1 * 0.7 + h * 0.12;
    b.head.rotation.z = sway * 0.03 + (melee ? -low * 0.42 : shot ? a * 0.3 - s * 0.6 : rear ? -a * 0.15 : 0) - h * 0.3;
    b.head.rotation.y = t.lk * 0.35 + h * 0.3; b.neck2.rotation.y = t.lk * 0.15 + t.sl * 0.12;
    b.head.rotation.x = h * 0.2;
    // ears and tail
    const ef = Math.max(0, Math.sin(t.p * 1.7 + 1)) * 0.2;
    b.earL.rotation.y = ef + t.sw * 0.4 + a * 0.5 + h * 0.6; b.earR.rotation.y = -(Math.max(0, Math.sin(t.p * 1.3)) * 0.2 + t.sw * 0.4 + a * 0.5 + h * 0.6);
    b.earL.rotation.x = -a * 0.2; b.earR.rotation.x = a * 0.2;
    b.tail.rotation.z = Math.max(0, Math.sin(t.p * 2.3)) * 0.3 - a * 0.6 + t.sw * 0.3 + h * 0.5;
    b.tail.rotation.y = Math.sin(t.p * 2.3) * 0.2 + t.sl * 0.5;
    // antlers: 3 groups of drops on each side. They drift, they lag, they pull together for the charge, they open for the shield.
    const cz = melee ? Math.min(1, a + s * 0.6) : 0, open = (rear ? a * 0.45 + s * 0.3 : 0) + (shot ? s * 0.2 : 0) + t.gl * 0.06;
    const whip = shot ? a * 0.22 - s * 0.4 : 0;
    for (let i = 1; i <= 3; i++) {
      const L = b['ant' + i + 'L'], R = b['ant' + i + 'R'], dr = Math.sin(t.p * (0.5 + i * 0.2) + i * 1.7) * 0.02 * i, lag = t.sw * 0.07 + whip - cz * 0.2;
      L.rotation.z = dr + lag; R.rotation.z = Math.sin(t.p * (0.55 + i * 0.2) + i * 2.4) * 0.02 * i + lag;
      L.rotation.x = -cz * 0.2 + open * 0.3 + t.sl * 0.1 + dr * 0.6; R.rotation.x = cz * 0.2 - open * 0.3 + t.sl * 0.1 - dr * 0.6;
      const fl = Math.sin(t.tm * (0.9 + i * 0.25) + i) * 0.012 * i;
      L.position.y += fl + open * 0.05; R.position.y += Math.sin(t.tm * (1.0 + i * 0.22) + i * 2) * 0.012 * i + open * 0.05;
      const sc = 1 - cz * 0.1 + s * 0.08 + open * 0.08;
      L.scale.setScalar(sc); R.scale.setScalar(sc);
    }
    // free drops: slow orbit. Shot: they fly forward. Shield: they move to a dome around the body.
    const dome = rear ? Math.min(1, a + s) : 0;
    for (let i = 0; i < SAT.length; i++) {
      for (const sd of [1, -1]) {
        const p = P['sa' + i + (sd > 0 ? 'L' : 'R')], d = SAT[i], ph = t.tm * (1.1 + i * 0.17) * (1 + t.gl * 0.8) + i * 1.9 + sd;
        p.position.x += Math.cos(ph) * 0.04 - t.sw * 0.05 * (1 + i * 0.3); p.position.y += Math.sin(ph * 1.3) * 0.035; p.position.z += Math.sin(ph) * 0.04 * sd;
        if (shot) { p.position.x += s * (0.4 + i * 0.09) - a * 0.1; p.position.y += s * (0.3 + i * 0.05) + a * 0.06; p.scale.multiplyScalar(1 + a * 0.8 + s * 0.6); }
        if (dome) {
          const q = (i + 0.5) / SAT.length * Math.PI + t.tm * 0.8, tx = 0.1 + Math.cos(q) * 0.8, ty = 1.35 + Math.sin(q * 2 + i) * 0.3, tz = Math.sin(q) * 0.75;
          p.position.x += (tx - d[0]) * dome; p.position.y += (ty - d[1]) * dome; p.position.z += (tz - d[2]) * dome * sd;
          p.scale.multiplyScalar(1 + dome * 1.6);
        }
        if (melee) { p.position.x += (0.9 - d[0]) * low * 0.5; p.position.z += (0.1 - d[2]) * low * 0.6 * sd; }
      }
    }
    P.heart.scale.setScalar(1 + 0.06 * Math.sin(t.tm * 3.2) + a * 0.25 + t.gl * 0.2 + s * 0.2);
  }
};
