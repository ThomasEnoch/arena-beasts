/* Chandeliermoth - gothic wrought-iron moth. Its wings are iron frames with amber membranes and cut-crystal drops.
   Candle antennae, a tier of 6 candles below the thorax, a hanging chain on top. Ember / Iron. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, wing, lathe, crystal, ball, cone, torus, flame, canvasTex } from '../geo.js';

const IRON = '#2c2a34', IRON2 = '#45424f', GOLD = '#c8a048', AMBER = '#ffb347';
const IRONM = { col: '#33313b', metal: 0.9, rough: 0.42, env: 0.9 };
const GOLDM = { col: '#dcb658', metal: 1, rough: 0.22, env: 1.3 };
const WAXM = { col: '#e2d6b4', rough: 0.5, glow: '#ff9840', glowK: 0.18 };
const FLAME = { col: '#ffc060', glow: '#ff8a1c', glowK: 3.4, noOut: true };
const HALO = { col: '#ff9a30', add: true, op: 0.2, noOut: true };
const CRYS = { col: '#ffe9c8', op: 0.66, rough: 0.04, env: 1.8, glow: '#ffb45a', glowK: 0.5, flat: true, noOut: true };
const D2R = Math.PI / 180, X = [1, 0, 0], Y = [0, 1, 0];
let texF = null, texH = null;

// one geometry from many (no uv)
function join(list) {
  return mergeGeometries(list.map(g => { const q = g.index ? g.toNonIndexed() : g.clone(); q.deleteAttribute('uv'); if (!q.getAttribute('normal')) q.computeVertexNormals(); return q; }));
}
const at = (g, p) => g.clone().translate(p[0], p[1], p[2]);
function aim(geo, d) {
  const g = geo.clone();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]).normalize()));
  return g;
}
// scroll: points of a spiral around c in the plane (ex, ey). Radius r0 -> r1, angle a0 -> a1 in degrees.
function spiral(c, ex, ey, r0, r1, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, q = (a0 + (a1 - a0) * f) * D2R, r = r0 + (r1 - r0) * f, cs = Math.cos(q) * r, sn = Math.sin(q) * r;
    out.push([c[0] + ex[0] * cs + ey[0] * sn, c[1] + ex[1] * cs + ey[1] * sn, c[2] + ex[2] * cs + ey[2] * sn]);
  }
  return out;
}
const sp2 = (cu, cv, r0, r1, a0, a1, n) => spiral([cu, cv, 0], X, Y, r0, r1, a0, a1, n);
// n points of a quadratic curve from p0 to p2 (p2 is not included: the next curve starts there)
function bez(p0, p1, p2, n) {
  const out = [];
  for (let i = 0; i < n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; out.push(p0.map((v, j) => v * a + p1[j] * b + p2[j] * c)); }
  return out;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

// --- wing layout. A wing is a flat plane: base point, span direction, chord direction. Points are [span, chord].
function plane(p, span, chord) {
  const z = new THREE.Vector3(span[0], span[1], span[2]).normalize(), x = new THREE.Vector3(chord[0], chord[1], chord[2]);
  x.addScaledVector(z, -x.dot(z)).normalize();
  return { p, m: new THREE.Matrix4().makeBasis(x, new THREE.Vector3().crossVectors(z, x), z), at: (u, v) => [p[0] + z.x * u + x.x * v, p[1] + z.y * u + x.y * v, p[2] + z.z * u + x.z * v] };
}
const FW = plane([0.08, 1.07, 0.15], [0.16, 0.42, 0.89], [1, 0.12, -0.1]);     // forewing
const HW = plane([-0.14, 1.0, 0.15], [-0.38, 0.2, 0.9], [1, 0.05, 0.4]);       // hindwing
const FC = [[0, -0.05], [0.14, -0.13], [0.4, -0.2], [0.53, -0.23], [0.66, -0.25], [0.86, -0.12], [0.93, -0.02], [1.0, 0.1], [1.08, 0.32], [0.8, 0.31], [0.45, 0.24], [0.15, 0.13], [0, 0.06]];
const HC = [[0, -0.05], [0.1, -0.2], [0.28, -0.36], [0.5, -0.42], [0.7, -0.3], [0.8, -0.08], [0.74, 0.1], [0.5, 0.14], [0.22, 0.11], [0, 0.05]];
// the crystal hangers hang from these points of the frames
const DA = FW.at(0.93, -0.02), DB = FW.at(0.53, -0.23), DC = HW.at(0.5, -0.42);
const A0 = [0.43, 1.15, 0.1], TIP = [0.18, 0.3, 0.13];      // antenna root, candle cup (relative to the root)
const T0 = [0.02, 0.76, 0], C0 = [0.02, 1.2, 0];            // candle tier, chain
const DN = [['dAL', 'wingL', 1, 0], ['dAR', 'wingR', -1, 1.3], ['dBL', 'wingL', 1, 2.1], ['dBR', 'wingR', -1, 3.4], ['dCL', 'hindL', 1, 4.2], ['dCR', 'hindR', -1, 5.5]];
const FL = ['c0L', 'c0R', 'c1L', 'c1R', 'c2L', 'c2R'];

// frame + scroll ribs + gold bosses + membrane of one wing
function wingGeo(W, ctrl, ribs, bars, beads) {
  const cv = new THREE.CatmullRomCurve3(ctrl.map(q => new THREE.Vector3(q[0], q[1], 0)), true, 'centripetal');
  const out = cv.getSpacedPoints(64).slice(0, 64).map(q => [q.x, q.y]), L = q => [q[1], 0, q[0]];
  const iron = [tube(out.concat([out[0], out[1], out[2]]).map(L), [0.019, 0.019], { ring: 6, seg: 134 })];
  for (const r of ribs) iron.push(tube(r.map(L), [0.014, 0.007], { ring: 5, seg: r.length * 3 }));
  for (const [p, q] of bars) iron.push(tube([p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], q].map(L), [0.008, 0.008], { ring: 4, seg: 4 }));
  return {
    memb: wing(out, 0.012, { smooth: false, bevel: 0.003 }).applyMatrix4(W.m),
    iron: join(iron).applyMatrix4(W.m),
    gold: join(beads.map(q => at(ball(q[2], 10, 8), L(q)))).applyMatrix4(W.m)
  };
}
// crystal hanger: a ring on the frame, an arched gold yoke, crystal drops on fine chains. drops: [place, chain length, size]
function hanger(dir, L, drops) {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize(), bar = [], cry = [];
  const bp = s => [d.x * s, -0.056 + d.y * s - 0.036 * (s / L) * (s / L), d.z * s];
  for (let i = 0; i <= 8; i++) bar.push(bp(-L + 2 * L * i / 8));
  const gold = [tube(bar, [0.008, 0.012, 0.008], { ring: 5, seg: 16 }), at(torus(0.02, 0.006, 12, 5), [0, -0.03, 0]), at(ball(0.015, 8, 6), bp(-L)), at(ball(0.015, 8, 6), bp(L))];
  for (const [s, len, r] of drops) {
    const q = bp(s);
    gold.push(tube([q, [q[0], q[1] - len / 2, q[2]], [q[0], q[1] - len, q[2]]], [0.004, 0.004], { ring: 4, seg: 2 }));
    cry.push(at(crystal(0.012, 0.013, 0.013, 4), [q[0], q[1] - len * 0.5, q[2]]));
    cry.push(at(crystal(r, r * 2.5, r * 1.3, 6), [q[0], q[1] - len - r * 2.5, q[2]]));
  }
  return { gold: join(gold), cry: join(cry) };
}
// candle parts: a dish, a wax stub with a melted top and drips
const cup = r => lathe([[0, 0], [r * 0.5, 0.004], [r * 0.9, 0.018], [r, 0.03], [r * 0.82, 0.03], [r * 0.45, 0.02], [0, 0.018]], 12);
function candle(r, h, turn) {
  const g = [lathe([[0, 0], [r, 0], [r * 1.04, h * 0.2], [r * 0.96, h * 0.9], [r * 1.06, h], [r * 0.7, h * 1.03], [r * 0.3, h * 0.95], [0, h * 0.94]], 10)];
  [[0.6, 0.42], [2.9, 0.55], [4.6, 0.3]].forEach(([q, f]) => g.push(at(flame(r * 0.42, h * (0.98 - f), 6), [Math.cos(q + turn) * r, h * f, Math.sin(q + turn) * r])));
  g.push(at(ball(r * 0.5, 7, 5), [Math.cos(2.9 + turn) * r * 1.15, 0.004, Math.sin(2.9 + turn) * r * 1.15]));
  return join(g);
}
// membrane texture: amber scales, dark veins from the root, tracery bands, a rose-window eye spot
function wingTex(ry, sx, sy) {
  return canvasTex(256, 256, (g, W, H) => {
    let gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, '#4a1c06'); gr.addColorStop(0.4, '#b85f14'); gr.addColorStop(1, '#ffbe4c');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,214,130,0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) for (let j = 0; j < 12; j++) { g.beginPath(); g.arc((i + (j % 2) * 0.5) * W / 13, (j + 0.5) * H / 12, W / 26, -1.2, 1.2); g.stroke(); }
    g.strokeStyle = 'rgba(52,18,4,0.8)'; g.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const y = H * (i + 0.5) / 9; g.beginPath(); g.moveTo(0, H * ry); g.quadraticCurveTo(W * 0.45, H * ry + (y - H * ry) * 0.35, W, y); g.stroke(); }
    g.strokeStyle = 'rgba(40,14,4,0.7)'; g.lineWidth = 2.5;
    for (const fx of [0.34, 0.88]) for (let j = 0; j < 7; j++) {
      const y0 = H * j / 7, y1 = H * (j + 1) / 7, x = W * fx;
      g.beginPath(); g.moveTo(x - 16, y0); g.quadraticCurveTo(x + 6, y0 + 4, x + 16, (y0 + y1) / 2); g.quadraticCurveTo(x + 6, y1 - 4, x - 16, y1); g.stroke();
    }
    const cx = W * sx, cy = H * sy, R = W * 0.14;
    gr = g.createRadialGradient(cx, cy, 2, cx, cy, R * 1.5);
    gr.addColorStop(0, 'rgba(255,244,200,1)'); gr.addColorStop(0.5, 'rgba(255,170,60,0.8)'); gr.addColorStop(1, 'rgba(255,150,40,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * 1.5, 0, 7); g.fill();
    g.strokeStyle = 'rgba(46,16,4,0.85)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) { const q = i * Math.PI / 4; g.beginPath(); g.moveTo(cx + Math.cos(q) * R * 0.3, cy + Math.sin(q) * R * 0.3); g.lineTo(cx + Math.cos(q) * R, cy + Math.sin(q) * R); g.stroke(); }
    g.fillStyle = '#3a1204'; g.beginPath(); g.arc(cx, cy, R * 0.3, 0, 7); g.fill();
  });
}

export default {
  id: 'chandeliermoth', rim: '#ffc27a', focus: 'flameL', top: 1.84, rough: 0.45,
  opts: { cell: 0.024, mottle: 0.06, mottleF: 14 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.95, 0]).bone('head', 'body', [0.3, 1.0, 0])
      .bone('antL', 'head', A0, { m: 1 })
      .bone('abd1', 'body', [-0.2, 0.94, 0]).bone('abd2', 'abd1', [-0.5, 0.87, 0]).bone('abd3', 'abd2', [-0.7, 0.8, 0])
      .bone('wingL', 'body', FW.p, { m: 1 }).bone('hindL', 'body', HW.p, { m: 1 })
      .bone('dAL', 'wingL', DA, { m: 1 }).bone('dBL', 'wingL', DB, { m: 1 }).bone('dCL', 'hindL', DC, { m: 1 })
      .bone('tier', 'body', T0).bone('chain', 'body', C0);

    const O = (a, b) => Object.assign({}, a, b);
    const Fe = { col: IRON, metal: 0.9, gloss: 0.4, k: 0.016 }, Fe2 = { col: IRON2, metal: 0.9, gloss: 0.5, k: 0.012 }, Au = { col: GOLD, metal: 1, gloss: 0.7, k: 0.012 };
    S.color(IRON);
    // thorax: an iron barrel with 4 ribbed bands. Candle light shows in the seams between the bands.
    S.ell('body', [0.04, 0.97, 0], [0.28, 0.21, 0.21], Fe);
    for (const [x, R] of [[-0.15, 0.155], [-0.02, 0.2], [0.11, 0.2], [0.23, 0.155]]) S.tor('body', [x, 0.97, 0], R, 0.034, O(Fe2, { rot: [0, 0, 90] }));
    S.cap('body', [0.24, 0.98, 0], [0.34, 1.0, 0], 0.1, 0.1, Fe);
    S.tor('body', [0.29, 0.99, 0], 0.12, 0.045, O(Au, { rot: [0, 0, 90] }));
    S.ell('body', [0.02, 1.185, 0], [0.055, 0.04, 0.055], Au);
    S.ell('body', [0.02, 0.765, 0], [0.09, 0.05, 0.09], Au);
    S.ell('body', [0.08, 1.07, 0.14], 0.075, O(Au, { m: 1 }));
    S.ell('body', [-0.14, 1.0, 0.14], 0.065, O(Au, { m: 1 }));
    // wing arms: the thick root of each leading edge
    S.cap('wingL', FW.at(0.02, 0.04), FW.at(0.3, 0.17), 0.05, 0.03, O(Fe, { m: 1, k: 0.02 }));
    S.cap('hindL', HW.at(0.02, 0.03), HW.at(0.25, 0.1), 0.042, 0.028, O(Fe, { m: 1, k: 0.02 }));
    // head: iron skull, snout, gold eye rings, gold sockets for the antennae
    S.ell('head', [0.44, 1.02, 0], [0.17, 0.16, 0.18], Fe);
    S.ell('head', [0.59, 0.985, 0], [0.06, 0.055, 0.07], Fe2);
    S.tor('head', [0.528, 1.052, 0.137], 0.1, 0.026, O(Au, { m: 1, rot: [0, -56, 90], k: 0.01 }));
    S.ell('head', [A0[0], A0[1], A0[2]], 0.048, O(Au, { m: 1 }));
    S.box('head', [0.52, 1.15, 0], [0.05, 0.03, 0.09], 0.025, Au);
    // abdomen: a turned iron spindle of 5 beads with gold collars, gold tail cap
    const segs = [['abd1', -0.29, 0.925, 0.135], ['abd1', -0.43, 0.89, 0.128], ['abd2', -0.57, 0.85, 0.114], ['abd3', -0.7, 0.8, 0.096], ['abd3', -0.81, 0.75, 0.076]];
    segs.forEach(([bn, x, y, r], i) => S.ell(bn, [x, y, 0], [r * 1.1, r, r], i % 2 ? Fe2 : Fe));
    for (const [bn, x, y, r] of [['abd1', -0.36, 0.908, 0.122], ['abd2', -0.5, 0.87, 0.112], ['abd2', -0.635, 0.826, 0.097], ['abd3', -0.755, 0.776, 0.078]])
      S.tor(bn, [x, y, 0], r, 0.026, O(Au, { rot: [0, 0, 110] }));
    S.cap('abd3', [-0.86, 0.73, 0], [-0.95, 0.69, 0], 0.05, 0.03, Au);
    // --- paint: glowing seams, lantern windows, gold rivets, soot
    for (const [x, R] of [[-0.085, 0.188], [0.045, 0.21], [0.17, 0.186]]) S.tor('body', [x, 0.97, 0], R, 0.022, { paint: 1, col: AMBER, glow: 2.2, cb: 0.01, rot: [0, 0, 90] });
    segs.slice(0, 4).forEach(([bn, x, y, r], i) => {
      S.ell(bn, [x, y + 0.01, r * 0.95], [0.05 - i * 0.006, 0.066 - i * 0.008, 0.05], { paint: 1, col: AMBER, glow: 2.4, cb: 0.012, m: 1 });
      S.ell(bn, [x, y + r, 0], [0.035, 0.03, 0.035], { paint: 1, col: '#f2d27a', metal: 1, gloss: 0.8, cb: 0.01 });
    });
    for (const x of [-0.02, 0.11]) for (const deg of [25, 65, 105, 145])
      S.ell('body', [x, 0.97 + Math.cos(deg * D2R) * 0.234, Math.sin(deg * D2R) * 0.234], 0.021, { paint: 1, col: '#f2d27a', metal: 1, gloss: 0.8, cb: 0.008, m: 1 });
    S.ell('head', [0.4, 1.12, 0], [0.12, 0.06, 0.1], { paint: 1, col: '#17161c', op: 0.6, cb: 0.04 });
    S.ell('head', [0.6, 1.0, 0.06], [0.03, 0.03, 0.03], { paint: 1, col: AMBER, glow: 1.8, cb: 0.01, m: 1 });

    // --- wings: iron frames with scroll ribs, gold bosses, amber membranes ---------------------
    if (!texF) { texF = wingTex(0.56, 0.667, 0.3); texH = wingTex(0.25, 0.59, 0.5); }
    const MF = { map: texF, emap: texF, glow: '#ffffff', glowK: 0.4, col: '#ffffff', op: 0.55, rough: 0.3, env: 0.8, noOut: true };
    const MH = { map: texH, emap: texH, glow: '#ffffff', glowK: 0.4, col: '#ffffff', op: 0.55, rough: 0.3, env: 0.8, noOut: true };
    const fw = wingGeo(FW, FC, [
      bez([0.03, 0], [0.4, -0.02], [0.72, 0.05], 10).concat(sp2(0.72, 0.15, 0.1, 0.022, 270, 740, 18)),
      bez([0.03, -0.02], [0.3, -0.02], [0.56, -0.055], 8).concat(sp2(0.56, -0.125, 0.07, 0.018, 90, -380, 16)),
      bez([0.87, -0.1], [0.9, 0.05], [0.905, 0.19], 5).concat(sp2(0.955, 0.19, 0.05, 0.015, 180, -270, 14)),
      bez([0.03, 0.03], [0.2, 0.11], [0.4, 0.129], 6).concat(sp2(0.4, 0.165, 0.036, 0.012, 270, 690, 12))
    ], [[[0.25, 0.165], [0.26, -0.005]], [[0.55, 0.265], [0.57, 0.035]], [[0.3, -0.175], [0.3, -0.03]], [[0.78, -0.17], [0.8, 0.07]]],
    [[0.72, 0.15, 0.03], [0.56, -0.125, 0.024], [0.955, 0.19, 0.02], [0.4, 0.165, 0.018], [0.02, 0, 0.036]]);
    const hw = wingGeo(HW, HC, [
      bez([0.03, 0], [0.25, 0.02], [0.47, -0.01], 8).concat(sp2(0.47, -0.14, 0.13, 0.025, 90, -470, 22)),
      bez([0.03, -0.03], [0.14, -0.22], [0.39, -0.385], 8).concat([[0.39, -0.385]]),
      bez([0.63, -0.33], [0.7, -0.22], [0.695, -0.07], 5).concat(sp2(0.64, -0.07, 0.055, 0.016, 0, 450, 14))
    ], [[[0.2, 0.105], [0.2, 0.012]], [[0.6, 0.125], [0.6, -0.02]], [[0.47, -0.27], [0.47, -0.41]]],
    [[0.47, -0.14, 0.036], [0.64, -0.07, 0.02], [0.02, 0, 0.03]]);
    S.add('hindL', hw.memb, MH, { p: HW.p, m: 1 });
    S.add('hindL', hw.iron, IRONM, { p: HW.p, m: 1 });
    S.add('hindL', hw.gold, GOLDM, { p: HW.p, m: 1 });
    S.add('wingL', fw.memb, MF, { p: FW.p, m: 1 });
    S.add('wingL', fw.iron, IRONM, { p: FW.p, m: 1 });
    S.add('wingL', fw.gold, GOLDM, { p: FW.p, m: 1 });
    // --- crystal hangers: 11 cut drops below each pair of wings ------------------------------
    const hA = hanger(sub(FW.at(1.0, 0.1), FW.at(0.86, -0.12)), 0.15, [[-0.15, 0.05, 0.034], [-0.05, 0.11, 0.04], [0.05, 0.07, 0.03], [0.15, 0.13, 0.036]]);
    const hB = hanger(sub(FW.at(0.66, -0.25), FW.at(0.4, -0.2)), 0.13, [[-0.13, 0.1, 0.036], [0, 0.05, 0.042], [0.13, 0.12, 0.032]]);
    const hC = hanger(sub(HW.at(0.7, -0.3), HW.at(0.28, -0.36)), 0.16, [[-0.16, 0.06, 0.032], [-0.055, 0.12, 0.04], [0.055, 0.08, 0.036], [0.16, 0.05, 0.03]]);
    for (const [bn, g, p] of [['dAL', hA, DA], ['dBL', hB, DB], ['dCL', hC, DC]]) {
      S.add(bn, g.gold, GOLDM, { p, m: 1 });
      S.add(bn, g.cry, CRYS, { p, m: 1 });
    }

    // --- antennae: a thorny iron stalk that ends in a scroll, a gold dish, a candle stub with a flame
    const ex = [0.811, 0, 0.585];
    const stalk = bez([0, 0, 0], [-0.03, 0.2, 0.02], TIP, 8), thorn = cone(0.011, 0.07, 5);
    const ant = [tube(stalk.concat(spiral([TIP[0], TIP[1] - 0.05, TIP[2]], ex, Y, 0.05, 0.014, 90, -360, 14)), [0.019, 0.014, 0.008], { ring: 6, seg: 60 })];
    for (const i of [2, 4, 6]) { ant.push(at(aim(thorn, [-0.4, 0.5, 1]), stalk[i])); ant.push(at(aim(thorn, [-0.4, 0.5, -1]), stalk[i])); }
    S.add('antL', join(ant), IRONM, { p: A0, m: 1 });
    S.add('antL', cup(0.055), GOLDM, { p: [A0[0] + TIP[0], A0[1] + TIP[1] + 0.008, A0[2] + TIP[2]], m: 1 });
    S.add('antL', candle(0.032, 0.11, 0), WAXM, { p: [A0[0] + TIP[0], A0[1] + TIP[1] + 0.03, A0[2] + TIP[2]], m: 1 });
    S.add('antL', flame(0.045, 0.2), FLAME, { p: [A0[0] + TIP[0], A0[1] + TIP[1] + 0.135, A0[2] + TIP[2]], m: 1, name: 'flameL' });
    S.add('antL', ball(0.1, 12, 8), HALO, { p: [A0[0] + TIP[0], A0[1] + TIP[1] + 0.21, A0[2] + TIP[2]], m: 1, name: 'haloL' });

    // --- candle tier: a spindle below the thorax, 6 scroll arms, a ring, 6 candles, crystal drops
    const stem = lathe([[0, -0.305], [0.022, -0.3], [0.036, -0.27], [0.018, -0.24], [0.03, -0.19], [0.058, -0.155], [0.03, -0.12], [0.022, -0.06], [0.042, -0.02], [0.03, 0]], 12);
    const ring = torus(0.36, 0.014, 40, 6); ring.rotateX(Math.PI / 2); ring.translate(0, -0.14, 0);
    const tIron = [stem, ring], tGold = [], tWax = [], tCry = [at(crystal(0.055, 0.05, 0.12, 6), [0, -0.355, 0])];
    for (let i = 0; i < 6; i++) {
      const q = (30 + i * 60) * D2R, e = [Math.cos(q), 0, Math.sin(q)], R3 = (r, y) => [e[0] * r, y, e[2] * r];
      tIron.push(tube(bez(R3(0.03, -0.15), R3(0.2, -0.33), R3(0.36, -0.155), 8).concat([R3(0.36, -0.155)]), [0.016, 0.011], { ring: 5, seg: 16 }));
      tIron.push(tube(spiral(R3(0.125, -0.165), e, Y, 0.05, 0.012, 250, -180, 12), [0.011, 0.006], { ring: 5, seg: 30 }));
      tGold.push(at(cup(0.055), R3(0.36, -0.14)));
      tWax.push(at(candle(0.028, 0.1, q), R3(0.36, -0.115)));
      const q2 = i * 60 * D2R;
      tCry.push(at(crystal(0.024, 0.05, 0.034, 6), [Math.cos(q2) * 0.36, -0.205, Math.sin(q2) * 0.36]));
    }
    S.add('tier', join(tIron), IRONM, { p: T0 });
    S.add('tier', join(tGold), GOLDM, { p: T0 });
    S.add('tier', join(tWax), WAXM, { p: T0 });
    S.add('tier', join(tCry), CRYS, { p: T0 });
    [30, 90, 150].forEach((deg, i) => S.add('tier', flame(0.032, 0.13), FLAME, { p: [T0[0] + Math.cos(deg * D2R) * 0.36, T0[1] - 0.015, Math.sin(deg * D2R) * 0.36], m: 1, name: 'c' + i + 'L' }));

    // --- chain loop on top: 3 links and a large ring -------------------------------------------
    const link = torus(0.03, 0.009, 14, 6), link2 = link.clone().rotateY(Math.PI / 2), top = torus(0.055, 0.012, 22, 6).rotateY(Math.PI / 2);
    S.add('chain', join([at(link, [0, 0.03, 0]), at(link2, [0, 0.07, 0]), at(link, [0, 0.11, 0]), at(top, [0, 0.175, 0])]), GOLDM, { p: C0 });

    // --- gold ornaments: 2 scrolls on the back, a spiked collar, a crown, a coiled tongue --------
    const orn = [tube(spiral([0.17, 1.24, 0], X, Y, 0.07, 0.018, 230, 650, 16), [0.017, 0.009], { ring: 6, seg: 48 }), tube(spiral([-0.13, 1.225, 0], X, Y, 0.07, 0.018, 310, -110, 16), [0.017, 0.009], { ring: 6, seg: 48 })];
    for (const deg of [25, 60, 95]) for (const sg of [1, -1]) {
      const cs = Math.cos(deg * D2R), sn = Math.sin(deg * D2R) * sg;
      orn.push(at(aim(cone(0.028, 0.13, 6), [-0.5, cs, sn]), [0.27, 0.99 + cs * 0.15, sn * 0.15]));
    }
    S.add('body', join(orn), GOLDM);
    const hg = [tube(spiral([0.61, 0.9, 0], X, Y, 0.06, 0.014, 120, 620, 18), [0.014, 0.007], { ring: 5, seg: 54 })];
    for (const [z, hh] of [[0, 0.12], [0.055, 0.085], [-0.055, 0.085]]) hg.push(at(aim(cone(0.024, hh, 6), [0.25, 1, z * 3]), [0.53, 1.155 - Math.abs(z) * 0.2, z]));
    S.add('head', join(hg), GOLDM);
    // tail: an iron scroll with a crystal drop
    S.add('abd3', tube([[-0.93, 0.7, 0]].concat(spiral([-1.0, 0.745, 0], X, Y, 0.09, 0.02, 285, -185, 18)), [0.022, 0.01], { ring: 6, seg: 57 }), IRONM);
    S.add('abd3', crystal(0.038, 0.085, 0.05, 6), CRYS, { p: [-1.0, 0.55, 0] });

    S.eye('head', [0.52, 1.05, 0.125], 0.1, { dir: [0.55, 0.15, 0.82], sclera: '#0d0809', iris: '#3a1404', iris2: '#ff9a2a', pupil: 'round', size: 62, lid: IRON2, open: 66, glow: 0.9, m: 1 });
  },
  anim(b, t, c) {
    const P = c.parts, a = t.a, s = t.s, h = t.h, k = t.k, melee = k === 'melee', shot = k === 'shot', slam = k === 'slam', buff = k === 'buff';
    const br = Math.sin(t.p), ph = t.tm * 12.6, pw = buff ? Math.min(1, a + s) : 0;      // ph: 2 wing beats each second
    // the beat stops when the wings hold a pose
    const still = Math.min(1, melee ? a * 0.4 + s : slam ? a * 0.5 + s : shot ? a * 0.3 + s * 0.6 : pw * 0.5);
    const amp = (0.3 + t.mv * 0.1 + t.gl * 0.06) * (1 - still * 0.85);
    // body: each down stroke lifts it. Drop from above: it rises, falls on the target, rises again.
    b.body.position.y += br * 0.02 - Math.sin(ph - 0.9) * 0.07 * amp + Math.sin(t.w) * 0.03 * t.mv + (melee ? a * 0.2 - s * 0.3 : slam ? a * 0.14 - s * 0.12 : shot ? a * 0.05 : pw * 0.1) - h * 0.04;
    b.body.position.x += (melee ? s * 0.3 - a * 0.1 : shot ? -a * 0.06 - s * 0.08 : 0) - h * 0.08;
    b.body.rotation.z = -t.sw * 0.14 + h * 0.16 + Math.sin(t.w) * 0.02 * t.mv + (melee ? a * 0.25 - s * 0.42 : shot ? a * 0.14 - s * 0.12 : slam ? s * 0.06 - a * 0.08 : pw * 0.08);
    b.body.rotation.x = t.sl * 0.18;
    b.body.rotation.y = t.lk * 0.1;
    // wings. lift > 0 = up. Crystal rain: sweep forward. Dust burst: flat, wide, shiver. Drop: folded up.
    const pose = melee ? s * 0.95 - a * 0.22 : shot ? a * 0.45 - s * 0.35 : slam ? a * 0.55 - s * 0.5 : pw * 0.3;
    const shiver = (slam ? Math.sin(t.tm * 47) * (0.07 * s + 0.025 * a) : 0) + h * Math.sin(t.tm * 38) * 0.06 + t.gl * Math.sin(t.tm * 9) * 0.03;
    const liftF = Math.sin(ph) * amp + pose + h * 0.3 + shiver, liftH = Math.sin(ph - 0.7) * amp * 0.85 + pose * 0.8 + h * 0.22 - shiver;
    const sweep = (shot ? s * 0.62 - a * 0.4 : melee ? -s * 0.3 : slam ? s * 0.1 : pw * 0.12) - t.sw * 0.1 - h * 0.1;
    const sweepH = sweep * 0.6 - (slam ? s * 0.28 : 0) - pw * 0.1;
    const twist = Math.cos(ph) * 0.3 * amp + (shot ? a * 0.15 - s * 0.28 : 0) + t.sw * 0.05;
    b.wingL.rotation.set(-liftF, sweep + t.sl * 0.12, twist); b.wingR.rotation.set(liftF, -sweep + t.sl * 0.12, twist);
    b.hindL.rotation.set(-liftH, sweepH + t.sl * 0.12, twist * 0.7); b.hindR.rotation.set(liftH, -sweepH + t.sl * 0.12, twist * 0.7);
    if (slam) { const g = 1 + s * 0.12; b.wingL.scale.setScalar(g); b.wingR.scale.setScalar(g); b.hindL.scale.setScalar(g); b.hindR.scale.setScalar(g); }
    // crystal hangers: they stay level when the wing turns, swing with each beat, trail behind the motion
    const jit = h * 0.3 + (slam ? s * 0.25 + a * 0.05 : 0) + t.gl * 0.05;
    for (const [n, w, sg, q] of DN) {
      const d = b[n], wb = b[w];
      d.rotation.x = -wb.rotation.x * 0.85 - t.sl * 0.4 + Math.sin(t.p * 1.7 + q) * 0.07 * (1 + t.gl) - sg * (melee ? s * 0.45 : slam ? s * 0.3 : 0) + jit * Math.cos(t.tm * 33 + q * 2);
      d.rotation.z = -wb.rotation.z - t.sw * 0.55 + Math.sin(ph - 1.1 + q * 0.3) * 0.5 * amp + (shot ? s * 0.9 - a * 0.45 : 0) + jit * Math.sin(t.tm * 41 + q);
    }
    // head and antennae
    b.head.rotation.z = br * 0.03 - h * 0.25 + (melee ? s * 0.2 - a * 0.15 : shot ? a * 0.15 - s * 0.2 : pw * 0.15);
    b.head.rotation.y = t.lk * 0.45;
    b.head.rotation.x = Math.sin(t.p * 0.6) * 0.05 + t.sl * 0.08;
    const az = Math.sin(t.p * 1.3) * 0.05 + t.sw * 0.25 - h * 0.35 + (melee ? a * 0.15 + s * 0.3 : shot ? a * 0.2 - s * 0.45 : slam ? a * 0.25 - s * 0.2 : pw * 0.18);
    const ax = Math.sin(t.p * 0.9) * 0.05 + pw * 0.25 + (slam ? s * 0.35 : 0) + h * 0.15;
    b.antL.rotation.z = az; b.antR.rotation.z = az + Math.sin(t.p * 1.3 + 1.2) * 0.03;
    b.antL.rotation.x = ax + t.sl * 0.25; b.antR.rotation.x = -ax + t.sl * 0.25;
    // abdomen: breath wave, it curls in the wind-up
    const curl = br * 0.04 + (melee ? a * 0.2 - s * 0.3 : shot ? a * 0.12 : slam ? s * 0.15 - a * 0.1 : -pw * 0.1) - t.sw * 0.05 + h * 0.12;
    ['abd1', 'abd2', 'abd3'].forEach((n, i) => { b[n].rotation.z = curl * (0.6 + 0.3 * i); b[n].rotation.y = t.sl * 0.2 + Math.sin(t.p * 0.9 - i * 0.7) * 0.04 + Math.sin(t.w - i * 0.8) * 0.05 * t.mv; });
    // candle tier and chain: they hang and swing. The tier turns for the buff (60 degrees = the same picture).
    b.tier.rotation.z = -b.body.rotation.z * 0.65 - t.sw * 0.2 + Math.sin(t.p * 1.1) * 0.03 + h * 0.2 * Math.sin(t.tm * 19);   // it hangs: it stays almost level when the body pitches
    b.tier.rotation.x = -t.sl * 0.3 + Math.cos(t.p * 0.9) * 0.03;
    b.tier.rotation.y = Math.sin(t.p * 0.5) * 0.15 + (buff ? a * 1.047 + s * 2.094 : 0) + t.gl * Math.sin(t.tm * 1.5) * 0.2;
    b.tier.position.y += melee ? s * 0.12 : 0;
    b.chain.rotation.z = t.sw * 0.35 + Math.sin(t.p * 1.2) * 0.05 + h * 0.3 + (melee ? s * 0.25 : 0);
    b.chain.rotation.x = t.sl * 0.35 + Math.cos(t.p) * 0.04;
    // flames: flicker, lean back in the wind of the motion, grow with power
    const grow = Math.max(0.3, 1 + a * 0.3 + t.gl * 0.4 + (buff ? pw * 0.9 : s * 0.3) - h * 0.35), lean = t.sw * 0.5 + (melee ? s * 0.5 : 0);
    const fla = (f, sp, q, g) => {
      const wd = (1 + (g - 1) * 0.45) * (1 + 0.06 * Math.sin(t.tm * (sp + 6) + q));
      f.scale.y *= g * (1 + 0.13 * Math.sin(t.tm * sp + q) + 0.07 * Math.sin(t.tm * sp * 1.9 + q * 3)); f.scale.x *= wd; f.scale.z *= wd;
      f.rotation.z += lean + 0.07 * Math.sin(t.tm * 7.3 + q); f.rotation.x += t.sl * 0.4 + 0.05 * Math.sin(t.tm * 5.1 + q * 2);
    };
    fla(P.flameL, 17, 0, grow); fla(P.flameR, 19, 2.3, grow);
    for (let i = 0; i < 6; i++) fla(P[FL[i]], 15 + i * 2.3, i * 1.7, grow * (1 + pw * 0.3));
    P.haloL.scale.multiplyScalar(1 + (grow - 1) * 0.6 + 0.08 * Math.sin(t.tm * 6));
    P.haloR.scale.multiplyScalar(1 + (grow - 1) * 0.6 + 0.08 * Math.sin(t.tm * 6 + 2));
  }
};
