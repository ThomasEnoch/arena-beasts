/* Censerserpent - cobra of carved jade beads on gold rings, with a perforated bronze censer hood. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, cone, ball, torus, lathe } from '../geo.js';

const JADE0 = '#3f9a6a', JADE1 = '#7fd0a0', DJADE = '#2a7450', CREAM = '#c4ecd0', GOLD = '#e6b840', BRONZE = '#8c5c2e', BRONZE2 = '#b07a3c', PATINA = '#5a4a2c';
const GOLDM = { col: '#f0c44c', metal: 0.9, rough: 0.22, env: 1.2 };
const BRZM = { col: '#a06c34', metal: 1, rough: 0.32, env: 1.1 };
const EMBER = { col: '#ffb060', glow: '#ff7a1a', glowK: 3, noOut: true };
const TONGUE = { col: '#ff7a50', glow: '#ff4a1c', glowK: 1.8, noOut: true };
const R2D = 180 / Math.PI;
// path of the body. Coil ring on the ground (centre CX, radius RC), then the riser, then the raised neck.
const CX = -0.03, RC = 0.4, GY = 0.16;
const J = d => [CX + RC * Math.cos(d / R2D), GY, RC * Math.sin(d / R2D)];
const T0 = J(180), TA = [-0.7, 0.125, 0.26], TB = [-0.58, 0.095, 0.57], TC = [-0.3, 0.075, 0.7];
const N0 = [-0.36, 0.45, 0.04], N1 = [-0.48, 0.72, 0], N2 = [-0.47, 1.0, 0], N3 = [-0.31, 1.27, 0], N4 = [-0.07, 1.47, 0];
// beads from the tail to the head: [bone, start, end, radius]
const SEG = [
  ['tail3', TC, TB, 0.065], ['tail2', TB, TA, 0.09], ['tail1', TA, T0, 0.12],
  ['coil1', T0, J(252), 0.16], ['coil1', J(252), J(324), 0.16], ['coil2', J(324), J(36), 0.16], ['coil2', J(36), J(108), 0.16],
  ['coil3', J(108), N0, 0.155], ['n1', N0, N1, 0.15], ['n2', N1, N2, 0.14], ['n3', N2, N3, 0.125], ['n4', N3, N4, 0.115]
];
// hood frame: HD = along the neck, HN = front normal, HC = centre, HR = radii [thickness, along, side]
const HL = Math.hypot(N4[0] - N2[0], N4[1] - N2[1]), HD = [(N4[0] - N2[0]) / HL, (N4[1] - N2[1]) / HL], HN = [HD[1], -HD[0]];
const HC = [N3[0] - HN[0] * 0.09, N3[1] - HN[1] * 0.09], HR = [0.11, 0.34, 0.46], HROT = [0, 0, -Math.atan2(HD[0], HD[1]) * 180 / Math.PI];
const HX = N4[0] + 0.17, HY = N4[1] - 1.46;   // offset of the head
const hp = (x, a, l) => [HC[0] + HN[0] * x + HD[0] * a, HC[1] + HN[1] * x + HD[1] * a, l];
const NECK = ['n1', 'n2', 'n3', 'n4'];
function aimX(d) { const l = Math.hypot(d[0], d[1], d[2]); return [0, Math.atan2(-d[2], d[0]) * R2D, Math.asin(d[1] / l) * R2D]; }
function aimY(d) { const l = Math.hypot(d[0], d[1], d[2]); return [0, Math.atan2(-d[2], d[0]) * R2D, -Math.acos(d[1] / l) * R2D]; }
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const unit = d => { const l = Math.hypot(d[0], d[1], d[2]) || 1; return [d[0] / l, d[1] / l, d[2] / l]; };
function join(gs) {
  return mergeGeometries(gs.map(g => {
    g = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    return g;
  }));
}
// chain of oval links along a curve through pts
function chainGeo(pts, step) {
  const cv = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2]))), n = Math.max(2, Math.round(cv.getLength() / step)), out = [];
  const t = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), ref = new THREE.Vector3(0.3, 0.2, 0.93).normalize();
  for (let i = 0; i <= n; i++) {
    const g = torus(0.024, 0.008, 10, 6), p = cv.getPointAt(i / n);
    g.scale(1.4, 1, 1);
    cv.getTangentAt(i / n, t); u.crossVectors(t, ref).normalize(); v.crossVectors(t, u).normalize();
    if (i % 2) m.makeBasis(t, u, v); else m.makeBasis(t, v, u.clone().negate());
    m.setPosition(p); g.applyMatrix4(m); out.push(g);
  }
  return join(out);
}

export default {
  id: 'censerserpent', rim: '#c8ffd8', focus: 'hood', top: 1.8, rough: 0.4,
  opts: { cell: 0.026, mottle: 0.1, mottleF: 7 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('coil1', 'root', [CX, GY, 0]).bone('coil2', 'coil1', J(324)).bone('coil3', 'coil2', J(108))
      .bone('n1', 'coil3', N0).bone('n2', 'n1', N1).bone('n3', 'n2', N2).bone('n4', 'n3', N3)
      .bone('hood', 'n4', [HC[0], HC[1], 0]).bone('head', 'n4', N4).bone('jaw', 'head', [HX - 0.04, HY + 1.47, 0])
      .bone('tail1', 'coil1', T0).bone('tail2', 'tail1', TA).bone('tail3', 'tail2', TB);
    const gd = { col: GOLD, metal: 1, gloss: 0.7 }, c0 = new THREE.Color(JADE0), c1 = new THREE.Color(JADE1), cc = new THREE.Color();
    S.color(JADE0);
    // 12 jade beads, each with a carved line around its middle
    SEG.forEach(([bn, a, e, r], i) => {
      const d = sub3(e, a), hl = Math.hypot(d[0], d[1], d[2]) / 2 + 0.02, u = i / (SEG.length - 1), col = '#' + cc.copy(c0).lerp(c1, u * 0.85 + (i % 2) * 0.15).getHexString();
      S.ell(bn, mid(a, e), [hl, r, r], { rot: aimX(d), k: 0.012, col, gloss: 0.85 });
    });
    // head: flat cobra skull, snout, gold brow ridges, jaw
    S.ell('head', [HX + 0.03, HY + 1.52, 0], [0.22, 0.105, 0.165], { k: 0.03, col: JADE1, gloss: 0.85 });
    S.ell('head', [HX + 0.19, HY + 1.5, 0], [0.12, 0.075, 0.105], { k: 0.04, col: JADE1, gloss: 0.85 });
    S.cap('head', [HX, HY + 1.595, 0.105], [HX + 0.17, HY + 1.565, 0.075], 0.036, 0.028, Object.assign({ m: 1, k: 0.012 }, gd));
    S.ell('head', [HX - 0.06, HY + 1.49, 0.14], 0.045, Object.assign({ m: 1, k: 0.012 }, gd));
    S.ell('jaw', [HX + 0.08, HY + 1.447, 0], [0.21, 0.045, 0.125], { k: 0.012, col: CREAM, gloss: 0.8 });
    // bronze censer hood behind the neck: shell, lower taper, lid with a knob, chain eyes at the sides
    const bz = { col: BRONZE, metal: 1, gloss: 0.45 };
    S.ell('hood', hp(0, 0, 0), HR, Object.assign({ rot: HROT, k: 0.02 }, bz));
    S.ell('hood', hp(0, -0.24, 0), [0.085, 0.2, 0.25], Object.assign({ rot: HROT, k: 0.03 }, bz));
    S.ell('hood', hp(-0.012, 0.19, 0), [0.114, 0.17, 0.37], { rot: HROT, k: 0.012, col: BRONZE2, metal: 1, gloss: 0.55 });
    const K0 = hp(-0.03, 0.33, 0), K1 = [K0[0] - 0.02, K0[1] + 0.1, 0];
    S.cap('hood', K0, K1, 0.045, 0.032, Object.assign({ k: 0.02 }, bz));
    S.ell('hood', [K1[0], K1[1] + 0.045, 0], 0.055, Object.assign({ k: 0.01 }, gd));
    S.tor('hood', [K0[0] - 0.004, K0[1] + 0.02, 0], 0.062, 0.022, Object.assign({ k: 0.008 }, gd));
    S.ell('hood', hp(-0.03, 0, 0.47), 0.046, Object.assign({ m: 1, k: 0.01 }, gd));
    // rows of holes; the incense glows inside
    const hole = (a, l, side) => {
      const q = 1 - Math.pow(a / HR[1], 2) - Math.pow(l / HR[2], 2);
      S.ell('hood', hp(side * HR[0] * Math.sqrt(Math.max(0.03, q)), a, l), 0.042, { sub: 1, col: '#ffac3c', glow: 3.2, k: 0.008, m: l > 0 ? 1 : 0 });
    };
    for (const [a, ls] of [[0.2, [0.1, 0.25]], [0.05, [0, 0.14, 0.28, 0.4]], [-0.1, [0.07, 0.21, 0.34]], [-0.24, [0, 0.14]]]) for (const l of ls) hole(a, l, -1);
    for (const [a, ls] of [[0.13, [0.24, 0.37]], [-0.03, [0.22, 0.35]], [-0.18, [0.2]]]) for (const l of ls) hole(a, l, 1);
    // gold rings between the beads
    for (let i = 1; i <= SEG.length; i++) {
      const prev = SEG[i - 1], next = SEG[i], d0 = unit(sub3(prev[2], prev[1])), d1 = next ? unit(sub3(next[2], next[1])) : [0.8, 0.3, 0], r = Math.min(prev[3], next ? next[3] : 1);
      S.tor(next ? next[0] : 'head', prev[2], Math.max(0.045, r * 0.55), Math.max(0.027, r * 0.27), Object.assign({ k: 0.008, rot: aimY([d0[0] + d1[0], d0[1] + d1[1], d0[2] + d1[2]]) }, gd));
    }
    S.ell('tail3', TC, 0.05, Object.assign({ k: 0.01 }, gd));
    // colour: carved lines, pale belly on the neck, gold line on the skull, dark nostrils, patina in the lower hood
    SEG.forEach(([bn, a, e, r]) => S.tor(bn, mid(a, e), r, 0.02, { paint: 1, col: DJADE, cb: 0.01, rot: aimY(sub3(e, a)) }));
    S.tube(NECK, [N0, N1, N2, N3, N4].map(p => [p[0] + 0.09, p[1] - 0.03, p[2]]), [0.11, 0.11, 0.1, 0.09, 0.085], { paint: 1, col: CREAM, gloss: 0.85, cb: 0.014 });
    S.ell('head', [HX + 0.06, HY + 1.625, 0], [0.16, 0.03, 0.022], { paint: 1, col: GOLD, metal: 1, gloss: 0.7, cb: 0.01 });
    S.ell('head', [HX + 0.295, HY + 1.52, 0.04], 0.018, { paint: 1, col: '#123a26', cb: 0.008, m: 1 });
    S.ell('hood', hp(-0.06, -0.3, 0), [0.1, 0.16, 0.3], { paint: 1, col: PATINA, metal: 1, gloss: 0.3, cb: 0.05, rot: HROT });
    S.ell('hood', hp(0, 0.105, 0), [0.2, 0.016, 0.5], { paint: 1, col: PATINA, metal: 1, gloss: 0.3, cb: 0.008, rot: HROT });

    // chains from the lid knob to the sides of the hood
    const KB = [K1[0], K1[1] + 0.05, 0], E = hp(-0.05, 0, 0.47);
    S.add('hood', chainGeo([[KB[0] - 0.02, KB[1], 0.03], [(KB[0] + E[0]) / 2 - HN[0] * 0.1, (KB[1] + E[1]) / 2 - HN[1] * 0.1 - 0.06, 0.25], [E[0] - 0.01, E[1] + 0.02, E[2]]], 0.058), GOLDM, { m: 1 });
    // gold fangs, forked tongue
    S.add('head', cone(0.022, 0.13, 8), GOLDM, { p: [HX + 0.21, HY + 1.475, 0.1], r: [0, 0, 172], m: 1 });
    S.add('head', join([tube([[0, 0, 0], [0.09, -0.01, 0], [0.16, -0.03, 0]], [0.013, 0.012, 0.011], { ring: 5 }),
      tube([[0.16, -0.03, 0], [0.21, -0.03, 0.02], [0.26, -0.015, 0.05]], [0.011, 0.008, 0.003], { ring: 5 }), tube([[0.16, -0.03, 0], [0.21, -0.03, -0.02], [0.26, -0.015, -0.05]], [0.011, 0.008, 0.003], { ring: 5 })]), TONGUE, { p: [HX + 0.27, HY + 1.468, 0], name: 'tongue' });
    // censer bell at the tail tip with an ember inside
    const td = unit(sub3(TC, TB));
    S.add('tail3', lathe([[0.001, 0], [0.03, 0.006], [0.05, 0.03], [0.062, 0.07], [0.07, 0.115], [0.088, 0.14], [0.08, 0.142], [0.06, 0.11]], 14), BRZM, { p: [TC[0] + td[0] * 0.03, TC[1] + td[1] * 0.03, TC[2] + td[2] * 0.03], r: aimY(td), name: 'bell' });
    S.add('tail3', ball(0.036, 10, 8), EMBER, { p: [TC[0] + td[0] * 0.14, TC[1] + td[1] * 0.14, TC[2] + td[2] * 0.14], name: 'ember' });
    S.eye('head', [HX + 0.1, HY + 1.555, 0.124], 0.048, { dir: [0.45, 0.2, 0.87], sclera: '#2a1408', iris: '#ff8a1e', iris2: '#ffe27a', pupil: 'slit', lid: JADE1, open: 22, tilt: -24, glow: 1.4, m: 1 });
  },
  anim(b, t, c) {
    const br = Math.sin(t.p), a = t.a, s = t.s, h = t.h, k = t.k;
    const melee = k === 'melee' ? 1 : 0, buff = k === 'buff' ? 1 : 0, cloud = melee || buff ? 0 : 1, slam = k === 'slam' ? 1 : 0;
    // coil on the ground: slow breathing, slither when it moves, tighten for the constrict
    const tight = buff * Math.min(1, a + s);
    b.coil1.scale.set(1 + br * 0.012 - tight * 0.1, 1 + tight * 0.12, 1 + br * 0.012 - tight * 0.1);
    b.coil1.rotation.y = Math.sin(t.w) * 0.1 * t.mv + tight * 0.45 + slam * s * Math.sin(t.tm * 30) * 0.04;
    b.coil2.rotation.y = Math.sin(t.w - 1.2) * 0.08 * t.mv;
    b.coil1.position.y += Math.abs(Math.sin(t.w)) * 0.015 * t.mv;
    b.coil3.rotation.x = Math.sin(t.p * 0.7 + 0.8) * 0.02;
    // raised neck: slow sway all the time
    // melee: the S coils back, then the head shoots forward. cloud: the neck stands tall and the hood flares.
    const AM = [0.22, 0.26, -0.16, -0.26], SM = [-0.5, -0.48, 0.16, 0.36], AC = [-0.12, -0.04, 0.12, 0.2], BF = [0.1, 0.2, -0.2, -0.25];
    let lean = 0;
    for (let i = 0; i < 4; i++) {
      const n = b[NECK[i]], sx = Math.sin(t.p * 0.7 - i * 0.6) * 0.055 * (1 - melee * s);
      n.rotation.x = sx + t.sl * 0.1; lean += sx;
      n.rotation.z = Math.cos(t.p * 0.7 - i * 0.6) * 0.02 + t.sw * 0.07 + melee * (a * AM[i] + s * SM[i]) + cloud * (a * AC[i] - s * AC[i] * 0.5) + tight * BF[i] + h * (i < 2 ? 0.14 : -0.08);
      n.rotation.y = Math.sin(t.p * 0.35 - i * 0.4) * 0.03 + t.lk * 0.08;
    }
    b.head.rotation.x = -lean * 0.8;
    b.head.rotation.y = t.lk * 0.3;
    b.head.rotation.z = -br * 0.03 + melee * (a * 0.3 - s * 0.1) - cloud * (a * 0.3 - s * 0.15) + tight * 0.2 - h * 0.3;
    b.head.position.x += melee * s * 0.1;
    b.jaw.rotation.z = -(0.03 + melee * (a * 0.2 + s * 0.75) + cloud * s * 0.5 + h * 0.4 + tight * 0.15);
    // hood: breathes, flares wide for the smoke cloud, folds for the strike
    const flare = 1 + br * 0.03 + cloud * (a * 0.28 + s * 0.42) + t.gl * 0.08 * (1 + Math.sin(t.tm * 5)) - melee * (a * 0.1 + s * 0.22) - tight * 0.12 - h * 0.12;
    b.hood.scale.set(1 + cloud * s * 0.25, 1 + (flare - 1) * 0.35, flare);
    b.hood.rotation.z = t.sw * 0.08 + cloud * a * 0.1 + Math.sin(t.tm * 34) * 0.03 * cloud * s;
    // tongue flicks out now and then
    const fl = Math.max(0, Math.sin(t.p * 1.9)) * Math.max(0, Math.sin(t.p * 0.37 + 1));
    c.parts.tongue.scale.set(0.15 + fl * 1.0 + (a + s) * 0.9 + t.gl * 0.3, 1, 1 + fl * 0.5);
    c.parts.tongue.rotation.z = Math.sin(t.tm * 26) * 0.2 * (fl + a);
    // tail: the tip waves and the bell rattles
    b.tail1.rotation.y = Math.sin(t.p * 0.9) * 0.05 + t.sl * 0.2 + Math.sin(t.w - 2) * 0.12 * t.mv;
    b.tail2.rotation.y = Math.sin(t.p * 0.9 - 0.7) * 0.1 + t.sl * 0.25 + Math.sin(t.w - 2.8) * 0.15 * t.mv - tight * 0.3;
    b.tail3.rotation.y = Math.sin(t.p * 0.9 - 1.4) * 0.16 + Math.sin(t.tm * 30) * 0.12 * (a + h * 0.5 + t.gl * 0.3);
    b.tail3.rotation.x = -0.1 - Math.max(0, Math.sin(t.p * 0.9 - 1.4)) * 0.25 - a * 0.5 - t.gl * 0.2;
    c.parts.bell.rotation.x += Math.sin(t.tm * 30 + 1) * 0.15 * (a + t.gl * 0.3);
    c.parts.ember.scale.setScalar(1 + 0.15 * Math.sin(t.tm * 7) + a * 0.5 + t.gl * 0.4);
  }
};
