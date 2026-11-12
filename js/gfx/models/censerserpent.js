/* Censerserpent (Smolderasp) - cobra of deep green jade segments with pale veins on gold bands. Its hood is a bronze censer
   with a pattern of small holes and an ember inside (heart piece). Thin censer chains hang from the hood. Venom / Mind. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, cone, ball, torus, lathe, flame } from '../geo.js';
import { noise, rgb } from '../sculpt.js';

const JADE0 = '#0f5c3a', JADE1 = '#1f8a5c', DJADE = '#083a24', CREAM = '#b4dcc0', VEIN = '#c4eed2', GOLD = '#e0b23c', BRONZE = '#8c5c2e', BRONZE2 = '#b07a3c', PATINA = '#4e4026';
const GOLDM = { col: '#eec24a', metal: 0.9, rough: 0.22, env: 1.2 };
const BRZM = { col: '#a06c34', metal: 1, rough: 0.32, env: 1.1 };
const DARKM = { col: '#2c2012', metal: 0.6, rough: 0.6 };
const EMBER = { col: '#ffb060', glow: '#ff7a1a', glowK: 1.7, noOut: true };
const TONGUE = { col: '#ff7a50', glow: '#ff4a1c', glowK: 1.1, noOut: true };
const SMOKEV = { col: '#8a58f0', glow: '#7040e0', glowK: 0.7, op: 0.34, add: true, rough: 1, noOut: true }, SMOKEG = { col: '#e8b048', glow: '#d09030', glowK: 0.6, op: 0.3, add: true, rough: 1, noOut: true };
const R2D = 180 / Math.PI;
// path of the body. Coil ring on the ground (centre CX, radius RC), then the riser, then the raised neck.
const CX = -0.03, RC = 0.4, GY = 0.16;
const J = d => [CX + RC * Math.cos(d / R2D), GY, RC * Math.sin(d / R2D)];
const T0 = J(180), TA = [-0.7, 0.125, 0.26], TB = [-0.58, 0.095, 0.57], TC = [-0.3, 0.075, 0.7];
const N0 = [-0.36, 0.45, 0.04], N1 = [-0.48, 0.72, 0], N2 = [-0.47, 1.0, 0], N3 = [-0.31, 1.27, 0], N4 = [-0.07, 1.47, 0];
// beads from the tail to the head: [bone, start, end, radius]
const SEG = [
  ['tail3', TC, TB, 0.065], ['tail2', TB, TA, 0.09], ['tail1', TA, T0, 0.12],
  ['c5', T0, J(252), 0.16], ['c4', J(252), J(324), 0.16], ['c3', J(324), J(36), 0.16], ['c2', J(36), J(108), 0.16],
  ['c1', J(108), N0, 0.155], ['n1', N0, N1, 0.15], ['n2', N1, N2, 0.14], ['n3', N2, N3, 0.125], ['n4', N3, N4, 0.115]
];
// hood frame: HD = along the neck, HN = front normal, HC = centre, HR = radii [thickness, along, side]
const HL = Math.hypot(N4[0] - N2[0], N4[1] - N2[1]), HD = [(N4[0] - N2[0]) / HL, (N4[1] - N2[1]) / HL], HN = [HD[1], -HD[0]];
const HC = [N3[0] - HN[0] * 0.09, N3[1] - HN[1] * 0.09], HR = [0.11, 0.34, 0.46], HROT = [0, 0, -Math.atan2(HD[0], HD[1]) * 180 / Math.PI];
const HX = N4[0] + 0.17, HY = N4[1] - 1.46;   // offset of the head
const hp = (x, a, l) => [HC[0] + HN[0] * x + HD[0] * a, HC[1] + HN[1] * x + HD[1] * a, l];
const NECK = ['n1', 'n2', 'n3', 'n4'], GC = ['c1', 'c2', 'c3', 'c4', 'c5', 'tail1', 'tail2', 'tail3'];   // neck bones; chain of the body on the ground, from the base of the neck to the tail tip
const cl = (v, a, b) => v < a ? a : v > b ? b : v;
const E1 = hp(-0.05, 0, 0.47), E2 = hp(-0.085, -0.2, 0.3), CL1 = 0.36, CL2 = 0.24;   // the points where the chains hang, and their lengths
const SEAL = -0.105;   // position of the maker's seal along the back of the hood
// ultimate: rotation of the neck bones for the high S shape
const US = [-0.16, -0.33, 1.3, -0.1];
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
function chainGeo(pts, step, R = 0.024, r = 0.008) {
  const cv = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2]))), n = Math.max(2, Math.round(cv.getLength() / step)), out = [];
  const t = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), ref = new THREE.Vector3(0.3, 0.2, 0.93).normalize();
  for (let i = 0; i <= n; i++) {
    const g = torus(R, r, 10, 6), p = cv.getPointAt(i / n);
    g.scale(1.4, 1, 1);
    cv.getTangentAt(i / n, t); u.crossVectors(t, ref).normalize(); v.crossVectors(t, u).normalize();
    if (i % 2) m.makeBasis(t, u, v); else m.makeBasis(t, v, u.clone().negate());
    m.setPosition(p); g.applyMatrix4(m); out.push(g);
  }
  return out;
}
// chain that hangs from point P, with a small gold weight at its end. The geometry is relative to P.
function hangGeo(len) {
  const out = chainGeo([[0, -0.01, 0], [0.004, -len * 0.5, 0.004], [0, -len, 0]], 0.052, 0.022, 0.0085);
  out.push(lathe([[0.001, -0.1], [0.022, -0.085], [0.034, -0.05], [0.026, -0.015], [0.012, 0]], 10).translate(0, -len - 0.012, 0));
  return join(out);
}

export default {
  id: 'censerserpent', rim: '#c8ffd8', focus: 'hood', top: 1.8, rough: 0.4,
  opts: { cell: 0.026, mottle: 0.08, mottleF: 7 },
  build(S) {
    // The base of the neck is the root of the body. The neck goes up from it. The coil on the ground and the tail hang behind it as one chain,
    // one bone for each bead: a wave can travel along the body and the neck stays steady above it.
    S.bone('root', null, [0, 0, 0]).bone('base', 'root', N0)
      .bone('c1', 'base', N0).bone('c2', 'c1', J(108)).bone('c3', 'c2', J(36)).bone('c4', 'c3', J(324)).bone('c5', 'c4', J(252))
      .bone('n1', 'base', N0).bone('n2', 'n1', N1).bone('n3', 'n2', N2).bone('n4', 'n3', N3)
      .bone('hood', 'n4', [HC[0], HC[1], 0]).bone('head', 'n4', N4).bone('jaw', 'head', [HX - 0.04, HY + 1.47, 0])
      .bone('chL', 'hood', E1, { m: 1 }).bone('ch2L', 'hood', E2, { m: 1 })
      .bone('tail1', 'c5', T0).bone('tail2', 'tail1', TA).bone('tail3', 'tail2', TB);
    const gd = { col: GOLD, metal: 1, gloss: 0.7 }, c0 = new THREE.Color(JADE0), c1 = new THREE.Color(JADE1), cc = new THREE.Color();
    S.color(JADE0);
    // 12 jade beads, each with a carved line around its middle
    SEG.forEach(([bn, a, e, r], i) => {
      const d = sub3(e, a), hl = Math.hypot(d[0], d[1], d[2]) / 2 + 0.02, u = i / (SEG.length - 1), col = '#' + cc.copy(c0).lerp(c1, u * 0.8 + (i % 2) * 0.2).getHexString();
      S.ell(bn, mid(a, e), [hl, r, r], { rot: aimX(d), k: 0.012, col, gloss: 0.85 });
    });
    // head: flat cobra skull, snout, gold brow ridges, jaw
    S.ell('head', [HX + 0.03, HY + 1.52, 0], [0.225, 0.108, 0.17], { k: 0.03, col: JADE1, gloss: 0.85 });
    S.ell('head', [HX + 0.19, HY + 1.5, 0], [0.125, 0.078, 0.108], { k: 0.04, col: JADE1, gloss: 0.85 });
    S.cap('head', [HX, HY + 1.6, 0.108], [HX + 0.17, HY + 1.568, 0.078], 0.038, 0.028, Object.assign({ m: 1, k: 0.012 }, gd));
    S.ell('head', [HX - 0.06, HY + 1.49, 0.145], 0.045, Object.assign({ m: 1, k: 0.012 }, gd));
    S.ell('head', [HX - 0.03, HY + 1.635, 0], [0.045, 0.026, 0.04], Object.assign({ k: 0.01 }, gd));   // gold stud on the crown
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
    S.ell('hood', hp(-0.07, -0.2, 0.295), 0.04, Object.assign({ m: 1, k: 0.01 }, gd));
    // rows of holes; the ember glows inside. A slot below the lid lets more of its light out.
    const hole = (a, l, side) => {
      const q = 1 - Math.pow(a / HR[1], 2) - Math.pow(l / HR[2], 2);
      S.ell('hood', hp(side * HR[0] * Math.sqrt(Math.max(0.03, q)), a, l), 0.042, { sub: 1, col: '#ffac3c', glow: 3.3, k: 0.008, m: l > 0 ? 1 : 0 });
    };
    for (const [a, ls] of [[0.2, [0.1, 0.25]], [0.05, [0, 0.14, 0.28, 0.4]], [-0.1, [0.2, 0.33]], [-0.25, [0, 0.13]]]) for (const l of ls) hole(a, l, -1);
    for (const [a, ls] of [[0.13, [0.24, 0.37]], [-0.03, [0.22, 0.35]], [-0.18, [0.2]]]) for (const l of ls) hole(a, l, 1);
    S.box('hood', hp(-0.075, 0.112, 0), [0.05, 0.02, 0.3], 0.012, { sub: 1, col: '#ffb040', glow: 3.4, k: 0.006, rot: HROT });
    // rivets along the rim of the hood, the gold disc of the maker's seal on its back
    for (const ph of [62, 108, 131, 154]) S.ell('hood', hp(-0.01, HR[1] * 0.96 * Math.cos(ph / R2D), HR[2] * 0.96 * Math.sin(ph / R2D)), 0.03, Object.assign({ m: 1, k: 0.008 }, gd));
    const sx = -HR[0] * Math.sqrt(1 - Math.pow(SEAL / HR[1], 2)) + 0.012;
    S.ell('hood', hp(sx, SEAL, 0), [0.03, 0.082, 0.082], Object.assign({ rot: HROT, k: 0.008 }, gd));
    // gold rings between the beads
    for (let i = 1; i <= SEG.length; i++) {
      const prev = SEG[i - 1], next = SEG[i], d0 = unit(sub3(prev[2], prev[1])), d1 = next ? unit(sub3(next[2], next[1])) : [0.8, 0.3, 0], r = Math.min(prev[3], next ? next[3] : 1);
      S.tor(next ? next[0] : 'head', prev[2], Math.max(0.045, r * 0.55), Math.max(0.027, r * 0.27), Object.assign({ k: 0.008, rot: aimY([d0[0] + d1[0], d0[1] + d1[1], d0[2] + d1[2]]) }, gd));
    }
    S.ell('tail3', TC, 0.05, Object.assign({ k: 0.01 }, gd));
    // colour: carved lines, pale belly with scutes on the neck, gold line on the skull, dark nostrils, patina and soot on the hood
    SEG.forEach(([bn, a, e, r]) => S.tor(bn, mid(a, e), r, 0.02, { paint: 1, col: DJADE, cb: 0.01, rot: aimY(sub3(e, a)) }));
    const BL = [N0, N1, N2, N3, N4].map(p => [p[0] + 0.09, p[1] - 0.03, p[2]]);
    S.tube(NECK, BL, [0.11, 0.11, 0.1, 0.09, 0.085], { paint: 1, col: CREAM, gloss: 0.85, cb: 0.014 });
    for (let i = 0; i < 4; i++) for (const u of [0.22, 0.5, 0.78]) {
      const a = BL[i], e = BL[i + 1], d = sub3(e, a), q = [a[0] + d[0] * u + 0.06, a[1] + d[1] * u - 0.02, 0];
      if (u !== 0.5) S.ell(NECK[i], q, [0.016, 0.07, 0.12], { paint: 1, col: '#6fae88', cb: 0.008, rot: [0, 0, Math.atan2(d[1], d[0]) * R2D] });
    }
    S.ell('head', [HX + 0.06, HY + 1.625, 0], [0.16, 0.03, 0.022], { paint: 1, col: GOLD, metal: 1, gloss: 0.7, cb: 0.01 });
    S.ell('head', [HX + 0.295, HY + 1.52, 0.04], 0.018, { paint: 1, col: '#062a1a', cb: 0.008, m: 1 });
    S.ell('hood', hp(-0.06, -0.39, 0), [0.1, 0.1, 0.24], { paint: 1, col: PATINA, metal: 1, gloss: 0.3, cb: 0.04, rot: HROT });
    S.ell('hood', hp(-0.11, 0.2, 0), [0.05, 0.1, 0.24], { paint: 1, col: '#3a2a1a', metal: 0.6, gloss: 0.15, cb: 0.06, op: 0.7, rot: HROT });   // soot above the slot
    S.tor('hood', hp(sx, SEAL, 0), 0.086, 0.014, { paint: 1, col: PATINA, metal: 1, gloss: 0.3, cb: 0.008, rot: [HROT[0], HROT[1], HROT[2] + 90] });
    // jade: pale veins and darker depths
    const pv = rgb(VEIN);
    S.paint((p, n, col, info) => {
      if (info.metal > 0.3 || info.glow > 0.1 || col[1] < col[0] * 1.3) return;
      const dp = 0.78 + 0.4 * noise(p.x * 3.1 + 11, p.y * 3.1, p.z * 3.1 + 4);
      col[0] *= dp; col[1] *= dp; col[2] *= dp;
      const v = noise(p.x * 4.4 + 3, p.y * 4.4, p.z * 4.4 + 7) + 0.2 * noise(p.x * 11 + 1, p.y * 11 + 5, p.z * 11) - 0.6, t = 1 - Math.abs(v) / 0.028;
      if (t > 0) { const k = Math.min(1, t * 1.5) * 0.55; col[0] += (pv[0] - col[0]) * k; col[1] += (pv[1] - col[1]) * k; col[2] += (pv[2] - col[2]) * k; }
    });

    // chains from the lid knob to the sides of the hood
    const KB = [K1[0], K1[1] + 0.05, 0], E = hp(-0.05, 0, 0.47);
    S.add('hood', join(chainGeo([[KB[0] - 0.02, KB[1], 0.03], [(KB[0] + E[0]) / 2 - HN[0] * 0.1, (KB[1] + E[1]) / 2 - HN[1] * 0.1 - 0.06, 0.25], [E[0] - 0.01, E[1] + 0.02, E[2]]], 0.058)), GOLDM, { m: 1 });
    // thin censer chains that hang from the hood, each with a small weight
    S.add('chL', hangGeo(CL1), GOLDM, { p: E1, m: 1 });
    S.add('ch2L', hangGeo(CL2), GOLDM, { p: E2, m: 1 });
    // maker's mark: a spiral seal carved on the back of the hood
    const sp = [], sc = hp(sx, SEAL, 0);
    for (let i = 0; i <= 44; i++) {
      const u = i / 44, th = u * 2.5 * 6.2832, r = 0.008 + 0.058 * u, h = -(0.03 * Math.sqrt(1 - Math.pow(r / 0.082, 2)) + 0.002), ca = Math.cos(th) * r;
      sp.push([sc[0] + HN[0] * h + HD[0] * ca, sc[1] + HN[1] * h + HD[1] * ca, Math.sin(th) * r]);
    }
    S.add('hood', tube(sp, sp.map((p, i) => i < 3 ? 0.006 : 0.0085), { ring: 5, seg: 88 }), DARKM);
    // gold fangs, forked tongue
    S.add('head', cone(0.022, 0.13, 8), GOLDM, { p: [HX + 0.21, HY + 1.475, 0.1], r: [0, 0, 172], m: 1 });
    S.add('head', join([tube([[0, 0, 0], [0.09, -0.01, 0], [0.16, -0.03, 0]], [0.013, 0.012, 0.011], { ring: 5 }),
      tube([[0.16, -0.03, 0], [0.21, -0.03, 0.02], [0.26, -0.015, 0.05]], [0.011, 0.008, 0.003], { ring: 5 }), tube([[0.16, -0.03, 0], [0.21, -0.03, -0.02], [0.26, -0.015, -0.05]], [0.011, 0.008, 0.003], { ring: 5 })]), TONGUE, { p: [HX + 0.27, HY + 1.468, 0], name: 'tongue' });
    // censer bell at the tail tip with an ember inside
    const td = unit(sub3(TC, TB));
    S.add('tail3', lathe([[0.001, 0], [0.03, 0.006], [0.05, 0.03], [0.062, 0.07], [0.07, 0.115], [0.088, 0.14], [0.08, 0.142], [0.06, 0.11]], 14), BRZM, { p: [TC[0] + td[0] * 0.03, TC[1] + td[1] * 0.03, TC[2] + td[2] * 0.03], r: aimY(td), name: 'bell' });
    S.add('tail3', ball(0.034, 10, 8), EMBER, { p: [TC[0] + td[0] * 0.14, TC[1] + td[1] * 0.14, TC[2] + td[2] * 0.14], name: 'ember' });
    // smoke from the lid: 2 violet wisps and 1 gold wisp
    const puff = flame(0.045, 0.26, 8);
    for (let i = 0; i < 3; i++) S.add('n4', puff, i === 1 ? SMOKEG : SMOKEV, { p: [KB[0], KB[1] + 0.06, 0], name: 'sm' + i });
    S.eye('head', [HX + 0.1, HY + 1.558, 0.127], 0.052, { dir: [0.45, 0.2, 0.87], sclera: '#2a1408', iris: '#ff9a1e', iris2: '#ffe27a', pupil: 'slit', lid: JADE1, open: 25, tilt: -9, glow: 1.3, m: 1 });
  },
  anim(b, t, c) {
    const us = t.u * t.u * (3 - 2 * t.u), nu = 1 - us, tm = t.tm, P = c.parts;
    const br = Math.sin(t.p), a = t.a * (1 - us * 0.9), s = t.s * (1 - us * 0.6), h = t.h, k = t.k;
    const melee = k === 'melee' ? 1 : 0, buff = k === 'buff' ? 1 : 0, cloud = melee || buff ? 0 : 1, slam = k === 'slam' ? 1 : 0;
    // how the body moves. Without a speed (turn on the spot, old tools) the wave is small or follows t.sw.
    const hasV = Math.abs(t.vf) + Math.abs(t.vs) > 0.05, fw = hasV ? cl(t.vf / 2.6, -1, 1) : t.sw * t.mv, fs = hasV ? cl(t.vs / 2.6, -1, 1) : 0;
    const spd = Math.min(1, Math.hypot(fw, fs)), acc = cl(t.af / 30, -1, 1), tn = t.tn;
    const tight = buff * Math.min(1, a + s), over = 4 * s * (1 - s);   // over: after the lunge the body goes past its rest and comes back
    // body on the ground: a wave travels from the neck to the tail tip when it moves (it travels the other way when it goes backward).
    // The coil opens a little at speed, curves into a turn, pulls tight for the wind-up and gives length to the lunge.
    const wamp = Math.max(spd, t.mv * 0.45) * nu, wph = t.w * 1.1 * (fw < -0.1 ? -1 : 1), tph = t.p * 0.9;
    const twitch = Math.pow(Math.max(0, Math.sin(tm * 0.9 + 1) * Math.sin(tm * 0.31)), 6);
    for (let i = 0; i < 8; i++) {
      const j = i - 5, mid = i > 0 && i < 6 ? 1 : 0;
      b[GC[i]].rotation.y = Math.sin(wph - i * 0.95) * (0.05 + i * 0.032) * wamp + tn * 0.085 * nu * (i ? 1 : 0.5)
        + mid * (tight * 0.09 + us * 0.04 + melee * (a * 0.07 - s * 0.11 + over * 0.04) - spd * 0.2 * nu + h * 0.05)
        + (j >= 0 ? Math.sin(tph - j * 0.7) * (0.05 + j * 0.055) * (1 - wamp) + twitch * j * 0.12 : 0);
    }
    b.tail2.rotation.y -= tight * 0.3;
    b.tail3.rotation.y += Math.sin(tm * 30) * 0.12 * (a + h * 0.5 + t.gl * 0.3 + us * 0.5);
    b.tail3.rotation.x = -0.1 - Math.max(0, Math.sin(tph - 1.4)) * 0.25 - a * 0.5 - t.gl * 0.2 - us * 0.5 - twitch * 0.3;
    b.c1.rotation.x = Math.sin(t.p * 0.7 + 0.8) * 0.02;
    // base of the neck: it breathes, rides on the wave, pulls back and lunges with the strike
    b.base.position.y += br * 0.008 + Math.abs(Math.sin(wph)) * 0.014 * wamp + tight * 0.05 + us * 0.05;
    b.base.position.x += melee * (s * 0.16 - a * 0.09 - over * 0.05) - cloud * a * 0.03;
    b.base.rotation.y = slam * s * Math.sin(tm * 30) * 0.04 + Math.sin(wph - 0.5) * 0.03 * wamp;
    // raised neck: a slow sway all the time. It leans a little into the motion, lags behind a start, and curves into a turn.
    // melee: the S coils back, then the head shoots forward in a straight line, then it recoils. cloud: the neck stands tall and the hood flares.
    // ultimate: it rears high in an S shape, and the whole neck sways slowly from side to side.
    const AM = [0.22, 0.26, -0.16, -0.26], SM = [-0.5, -0.48, 0.16, 0.36], RC = [0.14, 0.16, -0.1, -0.12], AC = [-0.12, -0.04, 0.12, 0.2], BF = [0.1, 0.2, -0.2, -0.25], LN = [-0.1, -0.07, 0.08, 0.06];
    const slow = tm * 1.25, calm = (1 - spd * 0.6) * nu, hk = h * (0.4 - 0.6 * t.hx);
    let lean = 0, nz = 0;
    for (let i = 0; i < 4; i++) {
      const n = b[NECK[i]], sx = Math.sin(t.p * 0.7 - i * 0.6) * 0.055 * (1 - melee * s) * calm + us * Math.sin(slow - i * 0.55) * 0.13;
      n.rotation.x = sx + h * t.hz * 0.12; lean += sx;
      n.rotation.z = Math.cos(t.p * 0.7 - i * 0.6) * 0.02 + (spd * LN[i] + acc * (i < 2 ? 0.05 : -0.02)) * nu + melee * (a * AM[i] + s * SM[i] + over * RC[i]) + cloud * (a * AC[i] - s * AC[i] * 0.5) + tight * BF[i] + hk * (i < 2 ? 0.14 : -0.08)
        + us * (US[i] + Math.sin(slow * 2 - i * 0.7) * 0.03);
      n.rotation.y = Math.sin(t.p * 0.35 - i * 0.4) * 0.03 * calm + t.lk * 0.08 - tn * 0.07 * nu + us * Math.sin(slow - 1.2 - i * 0.3) * 0.07;
      nz += n.rotation.z;
    }
    b.n1.scale.setScalar(1 + us * 0.1);
    b.n2.scale.set(1 + br * 0.02, 1, 1 + br * 0.025);   // it breathes in the chest
    const look = Math.sin(tm * 0.6) * Math.sin(tm * 0.22 + 2) * calm;
    b.head.rotation.x = -lean * 0.8 + look * 0.06;
    b.head.rotation.y = t.lk * 0.3 - look * 0.2 - tn * 0.06 * nu + us * Math.sin(slow - 1.9) * 0.34;
    b.head.rotation.z = -br * 0.03 - spd * 0.05 * nu + melee * (a * 0.3 - s * 0.1 - over * 0.12) - cloud * (a * 0.3 - s * 0.15) + tight * 0.2 - h * 0.3 - us * 0.95;
    b.head.position.x += melee * s * 0.1;
    b.jaw.rotation.z = -(0.03 + melee * (a * 0.2 + s * 0.75) + cloud * s * 0.5 + h * 0.4 + tight * 0.15 + us * (0.2 + 0.06 * Math.sin(slow * 2)));
    // hood: breathes, flares wide for the smoke cloud, folds for the strike, flares to its maximum in the ultimate
    const flare = 1 + br * 0.03 + cloud * (a * 0.28 + s * 0.42) + t.gl * 0.08 * (1 + Math.sin(tm * 5)) - melee * (a * 0.1 + s * 0.22 - over * 0.1) - tight * 0.12 - h * 0.12 - spd * 0.05 * nu + us * (0.52 + 0.03 * Math.sin(tm * 3.1));
    b.hood.scale.set(1 + cloud * s * 0.25 + us * 0.2, 1 + (flare - 1) * 0.35, flare);
    b.hood.rotation.z = acc * 0.05 + cloud * a * 0.1 + Math.sin(tm * 34) * 0.03 * cloud * s - us * 0.12;
    nz += b.hood.rotation.z;
    // chains: spring parts. Here only: they hang straight down when the hood tilts, a rattle in the wind-up, a wide slow swing in the ultimate.
    const ux = us * Math.sin(slow - 2.7) * 0.6, ux2 = us * Math.sin(slow - 3.3) * 0.75, cz = -nz * 0.92 + (a + s) * 0.2 * Math.sin(tm * 11);
    b.chL.rotation.z = cz; b.chR.rotation.z = cz; b.ch2L.rotation.z = cz; b.ch2R.rotation.z = cz;
    b.chL.rotation.x = -lean * 1.1 + ux; b.chR.rotation.x = -lean * 1.1 + ux;
    b.ch2L.rotation.x = -lean * 1.1 + ux2; b.ch2R.rotation.x = -lean * 1.1 + ux2;
    // smoke: wisps rise from the lid and fade. More of them, and faster, with power.
    const pw = 0.5 + t.gl * 0.3 + (a + s) * 0.4 + us * 0.7;
    for (let i = 0; i < 3; i++) {
      const f = (tm * (0.3 + pw * 0.16) + i / 3) % 1, m = P['sm' + i], g = Math.sin(f * Math.PI);
      m.position.y += f * (0.34 + pw * 0.2); m.position.x += Math.sin(f * 5 + i * 2) * 0.05 - f * 0.08 - fw * f * 0.25; m.position.z += Math.cos(f * 4 + i * 2.1) * 0.06 - fs * f * 0.25;
      const sz = g * (0.7 + pw * 0.5) + 0.001;
      m.scale.set(sz * (1.1 - f * 0.5), sz * (0.6 + f * 1.5), sz * (1.1 - f * 0.5));
      m.rotation.z = Math.sin(tm * 2.1 + i * 2 + f * 4) * 0.3; m.rotation.x = Math.cos(tm * 1.7 + i * 2.3) * 0.25;
    }
    // tongue flicks out now and then
    const fl = Math.max(0, Math.sin(t.p * 1.9)) * Math.max(0, Math.sin(t.p * 0.37 + 1));
    P.tongue.scale.set(0.15 + fl * 1.0 + (a + s) * 0.9 + t.gl * 0.3 + us * (0.5 + 0.4 * Math.sin(tm * 9)), 1, 1 + fl * 0.5);
    P.tongue.rotation.z = Math.sin(tm * 26) * 0.2 * (fl + a + us * 0.6);
    // the bell at the tail tip rattles
    P.bell.rotation.x += Math.sin(tm * 30 + 1) * 0.15 * (a + t.gl * 0.3 + us * 0.5);
    P.ember.scale.setScalar(1 + 0.15 * Math.sin(tm * 7) + a * 0.5 + t.gl * 0.4 + us * 0.4);
  },
  // loose parts: the 4 censer chains, the end of the tail, the smoke wisps
  dyn: [
    { b: ['chL'], k: 26, d: 3.2, drag: 3, dir: [0, -1, 0] }, { b: ['chR'], k: 26, d: 3.5, drag: 3, dir: [0, -1, 0] },
    { b: ['ch2L'], k: 33, d: 3.5, drag: 3, dir: [0, -1, 0] }, { b: ['ch2R'], k: 33, d: 3.1, drag: 3, dir: [0, -1, 0] },
    { b: ['tail1', 'tail2', 'tail3'], k: 60, d: 6, amt: 0.5, drag: 1.5 },
    { b: ['sm0'], k: 22, d: 4, drag: 5, dir: [0, 1, 0] }, { b: ['sm1'], k: 20, d: 4, drag: 5, dir: [0, 1, 0] }, { b: ['sm2'], k: 24, d: 4, drag: 5, dir: [0, 1, 0] }
  ],
  // the head leads a turn; the upper neck follows it
  rig: { head: 'head', neck: ['n3', 'n4'] }
};
