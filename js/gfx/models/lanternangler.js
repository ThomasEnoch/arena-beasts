/* Lanternangler (Gloomlure, the Last Light of Blackwater) - deep-sea angler of black wrought iron with rust-red edges and rivets.
   Heart piece: the pale blue-green ghost flame in the cage lantern on its lure. The lantern glass has the rings of a lighthouse lens.
   Short chains, barnacles, needle teeth. Maker's mark: a lighthouse stamped on the left hinge of the jaw. Shade / Tide. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, blade, ball, cone, torus, flame, lathe, canvasTex } from '../geo.js';
import { rgb, noise } from '../sculpt.js';
import { A } from '../rig.js';

const IRON = '#1a1c22', IRON2 = '#30333b', STEELC = '#59626e', CYAN = '#6fe6d6', DEEP = '#0d3a40', RUSTC = '#6a2416', RUST2 = '#9c4a22';
const IRONM = { col: '#24262c', metal: 0.9, rough: 0.45, env: 1.1 };
const CHAINM = { col: '#4a3028', metal: 0.8, rough: 0.5, env: 1.1 };
const SCROLL = { col: '#5c463c', metal: 1, rough: 0.36, env: 1.3 };
const RIVET = { col: '#8d98a6', metal: 1, rough: 0.25, env: 1.3 };
const TOOTH = { col: '#d6dccf', metal: 0.5, rough: 0.22, env: 1.5, flat: true };
const BARN = { col: '#8d8b7e', rough: 0.9, flat: true };
const MEMB = { col: '#2f8f96', op: 0.5, rough: 0.15, env: 1.3, glow: '#12606a', glowK: 0.25, side: 1, noOut: true };
const LENS = { col: '#a8f4e2', op: 0.42, rough: 0.04, env: 1.7, glow: '#3fd6bc', glowK: 0.7, flat: true, side: 1, noOut: true };   // the rings of a lighthouse lens
const WISP = { col: '#eafff6', glow: '#7ff2d4', glowK: 3.4, noOut: true };                           // heart piece: the ghost flame
const SOUL = { col: '#8fe6d8', glow: '#3fc8b8', glowK: 0.9, noOut: true };
const HALO = { col: '#5fe6cc', add: true, op: 0.2, noOut: true };
let markTex = null, MARK = null;

const D2R = Math.PI / 180, TAILB = ['tail1', 'tail2', 'tail3', 'tfin'];
const cl = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const BC = [-0.05, 0.98, 0], BR = [0.5, 0.43, 0.38], HC = [0.22, 1.08, 0], HR = [0.3, 0.3, 0.34];   // body and head ellipsoids
const UJ = [0.3, 0.98, 0], LJ = [0.3, 0.74, 0], UR = 0.34, LR = 0.44, UT = -12 * D2R;              // jaw arcs: upper rim, lower ring
const STK = [[0.1, 1.33, 0], [0.2, 1.62, 0], [0.45, 1.8, 0], [0.74, 1.76, 0]];                    // lure stalk
const EYE = [0.34, 1.15, 0.3];
const FWD = [0.32, 0.3, 0.22], BACK = [0.4, 0.4, 0.3], WHIP = [0.5, 0.5, 0.4], LIFT = [0.2, 0.3, 0.5];   // stalk turns for each segment
const join = list => mergeGeometries(list.map(g => { g = g.index ? g.toNonIndexed() : g.clone(); g.deleteAttribute('uv'); return g; }));
const at = (g, x, y, z) => { g.translate(x, y, z); return g; };
// z of the body surface at (x, y), with a small gap. Scrolls and rivets use it to stay on the surface.
function zOn(x, y, gap = 0.012) {
  const f = (c, r) => { const q = 1 - ((x - c[0]) / r[0]) ** 2 - ((y - c[1]) / r[1]) ** 2; return q > 0 ? r[2] * Math.sqrt(q) : 0; };
  return Math.max(f(BC, BR), f(HC, HR)) + gap;
}
// point on a jaw arc. th = angle from the front (degrees), tilt = pitch of the arc plane (radians).
const arcP = (c, R, tilt, th, dy = 0) => [c[0] + R * Math.cos(th * D2R) * Math.cos(tilt), c[1] + R * Math.cos(th * D2R) * Math.sin(tilt) + dy, R * Math.sin(th * D2R)];
// spiral on the body surface
function scroll(cx, cy, r0, r1, a0, a1, n, out) {
  for (let i = 0; i <= n; i++) { const u = i / n, an = (a0 + (a1 - a0) * u) * D2R, r = r0 + (r1 - r0) * u, x = cx + Math.cos(an) * r, y = cy + Math.sin(an) * r; out.push([x, y, zOn(x, y)]); }
  return out;
}
const _q = new THREE.Quaternion(), _eu = new THREE.Euler(), _v = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
// point on an ellipsoid and the rotation (degrees) that turns +Y to its normal. az: 0 = front, 90 = +Z side. el: up
function onE(c, r, az, el, lift = 0) {
  const d = [Math.cos(el * D2R) * Math.cos(az * D2R), Math.sin(el * D2R), Math.cos(el * D2R) * Math.sin(az * D2R)];
  _v.set(d[0] / r[0], d[1] / r[1], d[2] / r[2]).normalize(); _eu.setFromQuaternion(_q.setFromUnitVectors(UP, _v), 'XYZ');
  return { p: [c[0] + r[0] * d[0] + _v.x * lift, c[1] + r[1] * d[1] + _v.y * lift, c[2] + r[2] * d[2] + _v.z * lift], r: [_eu.x / D2R, _eu.y / D2R, _eu.z / D2R] };
}
// barnacle cluster: small cones with a crater. The cones point to +Y.
function barnacles(n, spread, seed) {
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, list = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2.4 + rnd(), d = i ? spread * (0.55 + 0.45 * rnd()) : 0, s = i ? 0.6 + rnd() * 0.5 : 1.15;
    const g = lathe([[0.056, -0.03], [0.045, 0.012], [0.03, 0.046], [0.021, 0.058], [0.013, 0.04], [0.007, 0.012]], 7);
    g.scale(s, s, s); g.rotateZ(-Math.cos(a) * d * 2.2); g.rotateX(Math.sin(a) * d * 2.2);
    list.push(at(g, Math.cos(a) * d, -d * d * 1.5, Math.sin(a) * d));
  }
  return join(list);
}
// short chain that hangs down from its first link
function chain(n, R = 0.03) {
  const list = [];
  for (let i = 0; i < n; i++) { const g = torus(R, R * 0.3, 10, 5); g.scale(0.78, 1.25, 1); if (i % 2) g.rotateY(Math.PI / 2); list.push(at(g, 0, -R * 1.1 - i * R * 1.75, 0)); }
  return join(list);
}
const yTop = x => BC[1] + BR[1] * Math.sqrt(Math.max(0, 1 - ((x - BC[0]) / BR[0]) ** 2));
const yBot = x => BC[1] - BR[1] * Math.sqrt(Math.max(0, 1 - ((x - BC[0]) / BR[0]) ** 2));

export default {
  id: 'lanternangler', rim: '#8ff0ff', focus: 'wisp', top: 1.92, rough: 0.45, opts: { cell: 0.025, mottle: 0.12, mottleF: 16 },
  // spring bones: the lure stalk from its root to the lantern, the lantern as a pendulum, the tail, the fins, the short chains
  dyn: [
    { b: ['st1', 'st2', 'st3'], k: 50, d: 4.6, amt: 0.5, drag: 1.2 }, { b: ['lamp'], k: 26, d: 2.6, amt: 1, drag: 0.8, dir: [0, -1, 0] },
    { b: ['tail1', 'tail2', 'tail3', 'tfin'], k: 42, d: 5, amt: 0.45, drag: 1.4 },
    { b: ['finL'], k: 52, d: 6, amt: 0.5, drag: 3 }, { b: ['finR'], k: 48, d: 6, amt: 0.5, drag: 3 }, { b: ['dorsal'], k: 70, d: 7, amt: 0.5, drag: 3, dir: [0, 1, 0] },
    { b: ['ch0'], k: 30, d: 3.4, amt: 1, drag: 1.5, dir: [0, -1, 0] }, { b: ['ch1'], k: 34, d: 3.8, amt: 1, drag: 1.5, dir: [0, -1, 0] },
    { b: ['ch2'], k: 32, d: 3.2, amt: 1, drag: 1.5, dir: [0, -1, 0] }, { b: ['ch3'], k: 36, d: 3.6, amt: 1, drag: 1.5, dir: [0, -1, 0] }
  ],
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.98, 0]).bone('head', 'body', [0.1, 1.02, 0]).bone('jaw', 'head', [0.0, 0.8, 0])
      .bone('st1', 'head', STK[0]).bone('st2', 'st1', STK[1]).bone('st3', 'st2', STK[2]).bone('lamp', 'st3', STK[3])
      .bone('dorsal', 'body', [-0.22, 1.36, 0]).bone('finL', 'body', [-0.08, 0.82, 0.35], { m: 1 })
      .bone('tail1', 'body', [-0.45, 0.98, 0]).bone('tail2', 'tail1', [-0.6, 0.99, 0]).bone('tail3', 'tail2', [-0.75, 1.0, 0]).bone('tfin', 'tail3', [-0.88, 1.01, 0]);
    // fe = black iron plate. fe2 = raised edges and bands: the small glow value is a mark for the rust paint, it is not visible.
    const fe = { metal: 0.75, gloss: 0.4 }, TR = { col: IRON2, metal: 0.8, gloss: 0.5, glow: 0.03 }, fe2 = Object.assign({ k: 0.015 }, TR);
    S.color(IRON);
    S.ell('body', BC, BR, fe);
    S.ell('head', HC, HR, Object.assign({ k: 0.06 }, fe));
    for (let i = 0; i < 5; i++) { const x = -0.44 + i * 0.1; S.ell('body', [x, yTop(x) - 0.01, 0], [0.045, 0.04, 0.05], fe2); }   // spine
    S.cap('body', [-0.4, yBot(-0.4) + 0.02, 0], [0.0, yBot(0.0) + 0.02, 0], 0.045, 0.045, fe2);                                   // keel
    // open rib cage: the body is hollow and has 3 windows on each side
    S.ell('body', [-0.2, 0.98, 0], [0.28, 0.3, 0.3], { sub: 1, col: DEEP, glow: 0.6, k: 0.02 });
    for (let i = 0; i < 3; i++) S.box('body', [-0.38 + i * 0.13, 0.96, 0], [0.037, 0.2, 0.6], 0.03, { sub: 1, col: IRON2, k: 0.012, rot: [0, 0, -12] });
    // tail with 2 iron bands
    S.tube(['tail1', 'tail2', 'tail3', 'tfin'], [[-0.42, 0.98, 0], [-0.6, 0.99, 0], [-0.75, 1.0, 0], [-0.88, 1.01, 0], [-0.94, 1.01, 0]], [0.22, 0.15, 0.108, 0.082, 0.07], fe);
    S.tor('tail1', [-0.55, 0.99, 0], 0.165, 0.032, Object.assign({ rot: [0, 0, 90] }, fe2));
    S.tor('tail2', [-0.74, 1.0, 0], 0.11, 0.03, Object.assign({ rot: [0, 0, 90] }, fe2));
    // mouth: cut the lower front of the body, then add the upper rim, the cheeks and the brows
    S.ell('head', [0.42, 0.78, 0], [0.4, 0.2, 0.42], { sub: 1, col: DEEP, glow: 0.5, k: 0.02 });
    const up = [], ur = [];
    for (let i = 0; i <= 10; i++) { up.push(arcP(UJ, UR, UT, -100 + i * 20)); ur.push(i === 0 || i === 10 ? 0.045 : 0.06); }
    S.tube('head', up, ur, Object.assign({ k: 0.02 }, TR));
    S.ell('head', [0.12, 0.9, 0.3], [0.14, 0.12, 0.1], { m: 1, k: 0.03, metal: 0.75, gloss: 0.4 });
    S.box('head', [0.37, 1.285, 0.25], [0.15, 0.035, 0.1], 0.025, Object.assign({ m: 1, k: 0.02, rot: [14, -18, -20] }, TR));
    S.tor('head', [0.16, 1.08, 0], 0.305, 0.034, Object.assign({ k: 0.012, rot: [0, 0, 78] }, TR));   // strap over the head
    for (let i = -2; i <= 2; i++) { const an = i * 0.42; S.ell('head', [0.16 - Math.cos(an) * 0.07, 1.08 + Math.cos(an) * 0.335, Math.sin(an) * 0.335], 0.03, { col: STEELC, metal: 1, gloss: 0.7, k: 0.008 }); }
    S.tor('head', EYE, 0.105, 0.032, Object.assign({ m: 1, k: 0.012, rot: [90, 0, -27] }, TR));
    // the hinge of the jaw: a round plate on each cheek
    S.ell('head', [0.1, 0.89, 0.39], [0.115, 0.115, 0.06], Object.assign({ m: 1, k: 0.012 }, TR));
    // lower jaw: a scoop with a heavy ring, hollow inside
    S.ell('jaw', [0.3, 0.68, 0], [0.44, 0.16, 0.42], { metal: 0.75, gloss: 0.4, k: 0.03, sb: 0.05 });
    const lo = [], lr = [];
    for (let i = 0; i <= 10; i++) { lo.push(arcP(LJ, LR, 0, -105 + i * 21)); lr.push(i === 0 || i === 10 ? 0.048 : 0.062); }
    S.tube('jaw', lo, lr, Object.assign({ k: 0.02, sb: 0.05 }, TR));
    S.ell('jaw', [0.34, 0.8, 0], [0.33, 0.12, 0.32], { sub: 1, col: DEEP, glow: 0.45, k: 0.02 });
    S.cap('jaw', [0.72, 0.62, 0], [0.4, 0.54, 0], 0.04, 0.04, fe2);
    // lure stalk with knuckles
    S.tube(['st1', 'st2', 'st3'], STK, [0.052, 0.043, 0.037, 0.033], { metal: 0.8, gloss: 0.5, k: 0.02 });
    for (let i = 0; i < 4; i++) S.ell(i < 3 ? 'st' + (i + 1) : 'st3', STK[i], 0.066 - i * 0.006, fe2);
    // fin roots
    S.ell('finL', [-0.08, 0.82, 0.35], [0.07, 0.06, 0.05], Object.assign({ m: 1 }, fe2));
    S.ell('tfin', [-0.9, 1.01, 0], [0.06, 0.09, 0.05], fe2);
    // colour: worn steel on the rims, glow in the throat and below the eyes
    S.ell('head', [0.64, 0.9, 0], [0.06, 0.07, 0.2], { paint: 1, col: STEELC, cb: 0.03, op: 0.7 });
    S.ell('jaw', [0.74, 0.76, 0], [0.06, 0.07, 0.24], { paint: 1, col: STEELC, cb: 0.03, op: 0.7 });
    S.ell('head', [0.2, 0.86, 0], [0.16, 0.1, 0.2], { paint: 1, col: CYAN, glow: 0.8, cb: 0.06 });
    S.cap('head', [0.2, 1.01, 0.34], [0.44, 0.99, 0.26], 0.018, 0.018, { paint: 1, col: CYAN, glow: 0.9, cb: 0.01, m: 1 });
    for (let i = 0; i < 4; i++) { const x = -0.445 + i * 0.13; S.cap('body', [x - 0.03, 1.15, 0.4], [x + 0.05, 0.77, 0.4], 0.016, 0.016, { paint: 1, col: STEELC, cb: 0.012, op: 0.6, m: 1 }); }
    // rust: red on the raised edges and bands, in the folds between the plates, and in a few streaks on the plates
    const RU = rgb(RUSTC), RO = rgb(RUST2);
    S.paint((p, n, c, info) => {
      if (info.glow > 0.06 || c[1] > c[0] * 2.2) return;
      const tr = Math.min(1, info.glow / 0.028); info.glow = 0;
      const n1 = noise(p.x * 7 + 3, p.y * 7, p.z * 7 + 9), n2 = noise(p.x * 23, p.y * 23 + 5, p.z * 23);
      let w = tr * (0.2 + (n1 - 0.45) * 2.6) + (1 - tr) * ((n1 - 0.66) * 3.2 + (1 - info.ao) * 1.0 - 0.3) + (n2 - 0.5) * 0.6;
      if (w <= 0) return;
      w = w > 1 ? 1 : w;
      const sh = 0.5 + 0.5 * info.ao, m = n2 * n2;
      for (let i = 0; i < 3; i++) c[i] += ((RU[i] + (RO[i] - RU[i]) * m) * sh - c[i]) * w * 0.88;
      info.metal *= 1 - 0.7 * w; info.gloss *= 1 - 0.75 * w;
    });

    // needle teeth: the upper teeth close inside the lower ring, the long lower teeth close in front of the upper rim
    const tu = [], tl = [];
    for (let i = -5; i <= 5; i++) { const th = i * 15, h = (i % 2 ? 0.13 : 0.21) - Math.abs(i) * 0.012, p = arcP(UJ, UR - 0.035, UT, th, -0.03), g = cone(0.017, h, 5); g.rotateZ(Math.PI + (i % 2 ? 0.1 : -0.04)); g.rotateX(-Math.sin(th * D2R) * 0.12); tu.push(at(g, p[0], p[1], p[2])); }
    for (let i = 0; i < 13; i++) { const th = -78 + i * 13, h = (i % 2 ? 0.17 : 0.31) - Math.abs(th) * 0.0016, p = arcP(LJ, LR, 0, th, 0.03), g = cone(0.019, h, 5); g.rotateZ(Math.cos(th * D2R) * (i % 2 ? 0.16 : 0.03)); g.rotateX(-Math.sin(th * D2R) * 0.08); tl.push(at(g, p[0], p[1], p[2])); }
    S.add('head', join(tu), TOOTH);
    S.add('jaw', join(tl), TOOTH);
    // rivets: upper rim, eye ring, lower ring, tail bands. Hinge bolts on the cheeks.
    const rh = [], rj = [];
    for (let i = 0; i < 4; i++) { const p = arcP(UJ, UR + 0.052, UT, 14 + i * 24, 0.02); rh.push(at(ball(0.019, 8, 6), p[0], p[1], p[2])); }
    for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, c = Math.cos(an) * 0.105, s = Math.sin(an) * 0.105; rh.push(at(ball(0.016, 8, 6), EYE[0] - 0.89 * c + 0.45 * 0.036, EYE[1] + s, EYE[2] + 0.45 * c + 0.89 * 0.036)); }
    for (let i = 0; i < 4; i++) { const p = arcP(LJ, LR + 0.056, 0, 12 + i * 24, 0.015); rj.push(at(ball(0.02, 8, 6), p[0], p[1], p[2])); }
    for (let i = 0; i < 3; i++) { const an = (i - 1) * 0.7; rh.push(at(ball(0.016, 8, 6), -0.55, 0.99 + Math.sin(an) * 0.19, Math.cos(an) * 0.19)); }
    S.add('head', join(rh.slice(0, 12)), RIVET, { m: 1 });
    S.add('tail1', join(rh.slice(12)), RIVET, { m: 1 });
    S.add('jaw', join(rj), RIVET, { m: 1 });
    S.add('head', new THREE.CylinderGeometry(0.08, 0.09, 0.04, 16).rotateX(Math.PI / 2), RIVET, { p: [0.1, 0.89, 0.45], m: 1 });
    // maker's mark: a lighthouse, stamped on the left hinge of the jaw
    if (!MARK) {
      markTex = canvasTex(128, 128, (g, W) => {
        g.fillStyle = '#23262c'; g.fillRect(0, 0, W, W);
        g.strokeStyle = '#b4532a'; g.lineWidth = 7; g.beginPath(); g.arc(W / 2, W / 2, 56, 0, 7); g.stroke();
        g.fillStyle = '#d9efe4';
        g.beginPath(); g.moveTo(52, 100); g.lineTo(57, 50); g.lineTo(71, 50); g.lineTo(76, 100); g.closePath(); g.fill();       // tower
        g.fillRect(52, 43, 24, 6); g.fillRect(57, 30, 14, 12);                                                                    // gallery, lamp room
        g.beginPath(); g.moveTo(53, 30); g.lineTo(64, 17); g.lineTo(75, 30); g.closePath(); g.fill();                            // roof
        g.fillRect(40, 100, 48, 7);                                                                                               // rock
        g.fillStyle = '#23262c'; g.fillRect(55, 64, 19, 7); g.fillRect(54, 82, 21, 7);                                            // bands
        g.strokeStyle = '#8ff0d8'; g.lineWidth = 4; g.lineCap = 'round';
        for (const sd of [-1, 1]) for (const dy of [-9, 0, 9]) { g.beginPath(); g.moveTo(64 + sd * 14, 36 + dy * 0.3); g.lineTo(64 + sd * 36, 36 + dy); g.stroke(); }   // rays
      });
      MARK = { col: '#ffffff', map: markTex, emap: markTex, glowK: 0.3, rough: 0.5, metal: 0.4, noOut: true };
    }
    S.add('head', new THREE.CircleGeometry(0.073, 24), MARK, { p: [0.1, 0.89, 0.4715], name: 'mark' });
    // scrollwork on each side: an S on the gill cover, a row of curls above and below the rib windows
    const sc = [];
    const s1 = scroll(0.04, 1.14, 0.014, 0.075, 450, -90, 16, []); scroll(0.03, 0.86, 0.075, 0.014, 90, 630, 16, s1);
    sc.push(tube(s1, [0.016, 0.019, 0.016], { ring: 6, seg: 64 }));
    for (let i = 0; i < 3; i++) sc.push(tube(scroll(-0.38 + i * 0.14, 1.265 - (2 - i) * 0.012, 0.012, 0.05, 360, -70, 12, []), [0.012, 0.016], { ring: 6, seg: 26 }));
    for (let i = 0; i < 3; i++) sc.push(tube(scroll(-0.36 + i * 0.14, 0.685 + (2 - i) * 0.012, 0.012, 0.045, 0, 430, 12, []), [0.012, 0.016], { ring: 6, seg: 26 }));
    const ln = (x0, y0, x1, y1) => { const q = []; for (let i = 0; i <= 6; i++) { const x = x0 + (x1 - x0) * i / 6, y = y0 + (y1 - y0) * i / 6; q.push([x, y, zOn(x, y)]); } return tube(q, [0.014, 0.014], { ring: 6, seg: 12 }); };
    sc.push(ln(-0.47, 1.17, -0.02, 1.21), ln(-0.45, 0.75, -0.04, 0.74));
    S.add('body', join(sc), SCROLL, { m: 1 });
    // loops below the keel
    const lp = [];
    for (let i = 0; i < 4; i++) { const x = -0.36 + i * 0.105; lp.push(at(torus(0.05, 0.013, 14, 6, Math.PI).rotateZ(Math.PI), x, yBot(x) + 0.0, 0)); }
    S.add('body', join(lp), SCROLL);
    // short chains: 2 below the keel, 1 below the chin, 1 on the tail band
    S.add('body', chain(4), CHAINM, { p: [-0.36, yBot(-0.36) - 0.045, 0], name: 'ch0' });
    S.add('body', chain(3), CHAINM, { p: [-0.045, yBot(-0.045) - 0.045, 0], name: 'ch1' });
    S.add('jaw', chain(3, 0.026), CHAINM, { p: [0.56, 0.55, 0], name: 'ch2' });
    S.add('tail1', chain(3, 0.026), CHAINM, { p: [-0.55, 0.82, 0], name: 'ch3' });
    // barnacles: on the back, on the head, on the jaw ring and on the tail
    const bn = (bone, o, g, s) => S.add(bone, g, BARN, { p: o.p, r: o.r, s });
    bn('body', onE(BC, BR, 118, 42), barnacles(6, 0.12, 7), 0.62);
    bn('body', onE(BC, BR, -74, -40), barnacles(5, 0.11, 19), 0.58);
    bn('head', onE(HC, HR, -62, 58), barnacles(5, 0.11, 3), 0.55);
    bn('jaw', onE([0.3, 0.68, 0], [0.44, 0.16, 0.42], 58, -42, 0.01), barnacles(5, 0.11, 41), 0.55);
    S.add('tail1', barnacles(4, 0.1, 13), BARN, { p: [-0.62, 1.14, 0.05], r: [20, 0, 8], s: 0.5 });
    // caged light in the ribs
    S.add('body', flame(0.1, 0.3, 10), SOUL, { p: [-0.2, 0.84, 0], name: 'soul' });
    // dorsal fin, tail fin, side fins: iron ribs and a glass membrane
    const fin = (bone, p, tips, edge, o) => {
      S.add(bone, join(tips.map(q => tube([[0, 0, 0], [q[0] * 0.55, q[1] * 0.55 + 0.01, 0], [q[0], q[1], 0]], [0.02, 0.016, 0.008], { ring: 5 }))), IRONM, Object.assign({ p }, o));
      S.add(bone, blade(edge, 0.012, { bevel: 0.003 }), MEMB, Object.assign({ p }, o));
    };
    const D0 = [-0.22, 1.36, 0], db = [-0.4, -0.28, -0.16, -0.04].map(x => [x - D0[0], yTop(x) - 0.03 - D0[1]]), dt = [[-0.3, 0.1], [-0.2, 0.26], [-0.04, 0.3], [0.1, 0.2]];
    S.add('dorsal', join(db.map((q, i) => tube([[q[0], q[1], 0], [dt[i][0], dt[i][1], 0]], [0.022, 0.008], { ring: 5, seg: 3 }))), IRONM, { p: D0 });
    S.add('dorsal', blade([db[0], dt[0], [-0.2, 0.15], dt[1], [-0.1, 0.22], dt[2], [0.04, 0.2], dt[3], db[3]], 0.012, { bevel: 0.003 }), MEMB, { p: D0 });
    fin('tfin', [-0.88, 1.01, 0], [[-0.36, 0.34], [-0.3, 0.15], [-0.33, 0], [-0.3, -0.15], [-0.36, -0.32]],
      [[0, 0.05], [-0.36, 0.34], [-0.26, 0.22], [-0.3, 0.15], [-0.25, 0.07], [-0.33, 0], [-0.25, -0.07], [-0.3, -0.15], [-0.26, -0.21], [-0.36, -0.32], [0, -0.05]], {});
    fin('finL', [-0.08, 0.82, 0.36], [[-0.3, 0.08], [-0.33, -0.07], [-0.27, -0.2], [-0.16, -0.27]],
      [[0, 0.03], [-0.3, 0.08], [-0.26, 0.0], [-0.33, -0.07], [-0.25, -0.12], [-0.27, -0.2], [-0.18, -0.2], [-0.16, -0.27], [0, -0.04]], { r: [0, 38, 0], m: 1 });
    // cage lantern on the lamp bone: 3 chain links, a roof like the roof of a lighthouse, a cage of 6 bowed bars and a hoop,
    // the lens (glass with the rings of a lighthouse lens), the ghost flame
    const fr = [at(torus(0.03, 0.009, 12, 6), 0, -0.035, 0), at(torus(0.028, 0.009, 12, 6).rotateY(Math.PI / 2), 0, -0.085, 0), at(torus(0.026, 0.009, 12, 6), 0, -0.132, 0),
      at(cone(0.17, 0.115, 8), 0, -0.27, 0), at(ball(0.028, 8, 6), 0, -0.155, 0),
      at(new THREE.CylinderGeometry(0.14, 0.14, 0.024, 8), 0, -0.278, 0), at(new THREE.CylinderGeometry(0.128, 0.106, 0.036, 8), 0, -0.565, 0),
      at(cone(0.06, 0.09, 6).rotateZ(Math.PI), 0, -0.58, 0), at(ball(0.022, 8, 6), 0, -0.675, 0),
      at(torus(0.139, 0.009, 20, 6).rotateX(Math.PI / 2), 0, -0.42, 0)];
    for (let i = 0; i < 6; i++) {
      const cs = Math.cos(i * Math.PI / 3), sn = Math.sin(i * Math.PI / 3);
      fr.push(tube([[cs * 0.128, -0.285, sn * 0.128], [cs * 0.144, -0.42, sn * 0.144], [cs * 0.118, -0.555, sn * 0.118]], [0.011, 0.011, 0.011], { ring: 5, seg: 6 }));
    }
    const lp2 = [];
    for (let i = 0; i < 8; i++) { const y = -0.55 + i * 0.0325, rb = 0.082 + 0.032 * Math.sin(Math.PI * (i + 0.5) / 8); lp2.push([rb, y], [rb + 0.017, y + 0.016]); }
    lp2.push([0.082, -0.29]);
    S.add('lamp', join(fr), IRONM, { p: STK[3] });
    S.add('lamp', lathe(lp2, 18), LENS, { p: STK[3] });
    S.add('lamp', flame(0.058, 0.18, 10), WISP, { p: [STK[3][0], STK[3][1] - 0.515, 0], name: 'wisp' });
    S.add('lamp', ball(0.22, 14, 10), HALO, { p: [STK[3][0], STK[3][1] - 0.42, 0], name: 'halo' });
    // eyes: pale, flat and still. Nobody can read them.
    S.eye('head', EYE, 0.1, { dir: [0.45, 0.26, 0.86], sclera: '#a9b8b2', iris: '#7fa8a2', iris2: '#cfe6de', pupil: 'round', lid: IRON2, open: 44, tilt: 0, glow: 0.12, size: 30, m: 1 });
  },
  anim(b, t, c) {
    // u = the ultimate, Lighthouse of the Lost. It takes the place of the wind-up and the strike poses.
    const u = A.ease(t.u || 0), nu = 1 - u, P = c.parts;
    const br = Math.sin(t.p * 0.9) * (1 - u * 0.85), a = t.a * nu, s = t.s * nu, h = t.h, k = t.k, fol = s * (1 - s) * 4;
    const melee = k === 'melee', shot = k === 'shot', slam = k === 'slam', flash = k === 'buff' ? Math.min(1, a + s) : 0;
    // motion of the body: speed, push (it accelerates), brake (it stops), turn, rise
    const vm = Math.hypot(t.vf || 0, t.vs || 0), tn = (t.tn || 0) * nu, known = vm > 0.05 || Math.abs(t.tn || 0) > 0.05;
    const spd = (known ? Math.min(1, vm / 2.6) : t.mv) * nu, fwd = known ? cl((t.vf || 0) / 2.6, -1, 1) : t.mv, side = cl((t.vs || 0) / 2.6, -1, 1) * nu;
    const acc = cl((t.af || 0) / 22, -1, 1) * nu, push = Math.max(0, acc), brake = Math.max(0, -acc), rise = cl((t.va || 0) / 3, -1, 1) * nu;
    const hx = (t.hx || 0) * h, hz = (t.hz || 0) * h;
    const rest = cl(1 - spd * 1.5 - a - s - u, 0, 1), dr1 = Math.sin(t.tm * 0.47) * Math.sin(t.tm * 0.17 + 1), dr2 = Math.sin(t.tm * 0.33 + 2) * Math.sin(t.tm * 0.12);
    // the swim wave: the body bends in an S. The head goes against the tail, and the wave grows to the tail fin.
    const ph = t.p * 1.6 + t.w * 0.5, amp = (0.45 + spd * 0.9 + push * 0.7 + s * 0.4 + Math.abs(tn) * 0.3) * (1 - u * 0.75);
    // ultimate: the body goes low and it does not move
    b.body.position.y += br * 0.035 + a * (melee ? 0.1 : 0.04) - u * 0.3 + rise * 0.03;
    b.body.position.x += (melee ? s * 0.24 - a * 0.14 : -a * 0.05 - s * (shot ? 0.06 : 0)) - u * 0.08 + hx * 0.05;
    b.body.rotation.z = (melee ? a * 0.14 - s * 0.12 : shot ? a * 0.12 - s * 0.14 : slam ? a * 0.2 : 0) + h * 0.1 - hx * 0.12 - u * 0.06 + rise * 0.1 + dr2 * 0.03 * rest;
    b.body.rotation.x = Math.sin(t.p * 0.45) * 0.03 * nu + dr1 * 0.04 * rest + hz * 0.15;
    b.body.rotation.y = Math.sin(ph + 0.5) * 0.045 * amp;
    // head: it goes against the wave, so the eyes stay on the prey. It leads a turn.
    // (the rig turns the head to the aim. The head of the angler is half of its body, so it takes only a part of that turn.)
    b.head.rotation.z = br * 0.015 + (melee ? a * 0.2 - s * 0.14 + fol * 0.05 : 0) + h * 0.06 - hx * 0.15 - u * 0.04;
    b.head.rotation.y = t.lk * 0.2 * nu - Math.sin(ph + 0.9) * 0.07 * amp - tn * 0.18 - side * 0.06 - hz * 0.3 + dr2 * 0.08 * rest + cl((t.hd || 0) * 0.7, -0.8, 0.8) * 0.5;
    b.head.rotation.x = -tn * 0.06 + hz * 0.1 + dr1 * 0.03 * rest;
    // bear-trap jaw: it hangs open a little, and now and then it closes with a snap. It opens wide for the lunge
    // and snaps shut at the strike. It closes when the angler accelerates. Ultimate: the jaw is closed.
    const snap = cl((Math.sin(t.tm * 1.3) * Math.sin(t.tm * 0.41 + 1) - 0.72) * 9, 0, 1) * rest;
    b.jaw.rotation.z = -(0.1 + Math.max(0, br) * 0.07 + dr1 * 0.03 + brake * 0.2 - push * 0.08 - snap * 0.2 + a * (melee ? 0.9 : 0.3) + h * 0.4 + flash * 0.25 + (shot || slam ? s * 0.45 : 0)) * nu + (melee ? s * 0.16 - fol * 0.08 : 0) + u * 0.12;
    b.jaw.rotation.y = hz * 0.1;
    // lure stalk: it whips for a throw and swings forward for the flash (the spring bones add the lag and the swing).
    // Ultimate: the stalk rises high and forward, and the lantern swings in a slow wide circle.
    const sway = t.p * 0.9, RISE = [0.3, 0.34, 0.3], circ = t.tm * 1.7;
    let bend = 0;
    for (let i = 0; i < 3; i++) {
      const r = Math.sin(sway - i * 0.7) * 0.05 * (1 - u * 0.6) + h * 0.12 - flash * FWD[i] - push * 0.06 + brake * 0.08
        + (shot ? a * BACK[i] - s * WHIP[i] + fol * 0.12 : melee ? a * 0.22 - s * 0.1 - fol * 0.1 : slam ? a * LIFT[i] - s * 0.15 : 0) + u * (RISE[i] + Math.cos(circ - 0.5) * 0.035);
      const bn = b['st' + (i + 1)];
      bn.rotation.z = r; bn.rotation.x = Math.sin(sway * 0.7 - i) * 0.03 + dr1 * 0.04 * rest + u * Math.sin(circ - 0.5) * 0.06;
      bend += r;
    }
    b.lamp.rotation.z = -bend * 0.9 - b.body.rotation.z - b.head.rotation.z + Math.sin(t.tm * 3.1) * (0.07 + spd * 0.05) * nu + (shot ? s * 0.7 - a * 0.3 : 0) + flash * 0.25 + u * (Math.cos(circ) * 0.55 - bend * 0.1);
    b.lamp.rotation.x = Math.sin(t.tm * 2.3 + 1) * 0.06 * nu - b.body.rotation.x + u * Math.sin(circ) * 0.55;
    const fl = Math.min(2.5, 1 + a * 0.6 + s * 0.5 + t.gl * 0.35 + flash * 1.1 + u * (0.75 + 0.15 * Math.sin(t.tm * 3.4))), w = P.wisp, hl = P.halo;
    w.scale.set(fl * (1 + 0.1 * Math.sin(t.tm * 23 + 1)), fl * (1 + 0.16 * Math.sin(t.tm * 17)), fl * (1 + 0.1 * Math.sin(t.tm * 19)));
    // the flame stays behind the lantern when it moves
    w.rotation.z = -b.lamp.rotation.z * 0.5 + fwd * spd * 0.35 + acc * 0.3; w.rotation.x = -b.lamp.rotation.x * 0.5 - side * 0.3 - tn * 0.2;
    hl.scale.setScalar(0.8 + (fl - 1) * 0.75 + 0.05 * Math.sin(t.tm * 6));
    // the small light in the ribs. Ultimate: it goes out, the lantern is the only light.
    const so = P.soul, sf = (1 + t.gl * 0.3 + a * 0.2 + flash * 0.3) * Math.max(0.001, nu);
    so.scale.set(sf * (1 + 0.08 * Math.sin(t.tm * 11)), sf * (1 + 0.14 * Math.sin(t.tm * 13 + 2)), sf);
    so.rotation.z = fwd * spd * 0.4 + acc * 0.3; so.rotation.x = -side * 0.3;
    // short chains: they hang plumb (the spring parts make them lag and swing), and they shake when it is hurt
    for (let i = 0; i < 4; i++) {
      const ch = P['ch' + i], par = i === 2 ? b.jaw.rotation.z + b.head.rotation.z + b.body.rotation.z : b.body.rotation.z;
      ch.rotation.z += -par + Math.sin(t.p * 1.5 + i * 1.3) * 0.05 * nu + h * Math.sin(t.tm * 31 + i) * 0.3 - s * 0.3;
      ch.rotation.x += -b.body.rotation.x + Math.sin(t.p * 1.1 + i * 2.1) * 0.04 * nu;
    }
    // tail: the S wave. The tail fin is the rudder: it leads a turn. After a bite the tail whips.
    for (let i = 0; i < 4; i++) {
      const bn = b[TAILB[i]];
      bn.rotation.y = Math.sin(ph - 0.4 - i * 0.75) * (0.1 + i * 0.055) * amp + tn * (i === 3 ? 0.4 : 0.12) + side * 0.08 - hz * 0.1 * (i + 1) + (melee ? -a * 0.08 * (i + 1) * Math.sin(t.tm * 6) + fol * 0.12 : 0);
      bn.rotation.z = -rise * 0.06 + hx * 0.06 - brake * 0.04 + (melee ? a * 0.05 : 0);
    }
    // side fins: they scull. The 2 sides are not in step. They fold back when it accelerates, they open wide to stop,
    // and the outer fin opens in a turn.
    const sc = t.p * 1.8 + t.w * 0.4, fa = (0.2 + spd * 0.14 + push * 0.2) * (1 - u * 0.8);
    for (const sd of ['L', 'R']) {
      const sg = sd === 'L' ? 1 : -1, po = sg > 0 ? 0 : 0.9, f = b['fin' + sd];
      f.rotation.y = sg * (Math.sin(sc + po) * fa + a * 0.5 - s * 0.6 + fol * 0.2 - (fwd * spd * 0.25 + push * 0.3) + brake * 0.5 - u * 0.35 + Math.max(0, -tn * sg) * 0.35 + h * 0.3);
      f.rotation.z = Math.sin(sc - 0.8 + po) * (0.12 + spd * 0.08) * nu + h * 0.3 - rise * 0.3 + tn * sg * 0.12;
      f.rotation.x = sg * Math.cos(sc + po) * fa * 0.5;
    }
    b.dorsal.rotation.x = Math.sin(t.p * 1.3) * 0.07 * nu + dr1 * 0.05 * rest;
    b.dorsal.rotation.z = -a * 0.1 + h * 0.15 - u * 0.25 + brake * 0.15 - push * 0.1;
  }
};
