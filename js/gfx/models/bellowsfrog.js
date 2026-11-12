/* Bellowsfrog (Bellowcroak) - boiler toad. Its belly is a hammered copper boiler, its throat is a leather bellows. Gale / Ember.
   Heart piece: the pressure gauge on its left side. Maker's mark: the red line on the gauge, painted by hand. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, ball, lathe, torus, rbox, canvasTex } from '../geo.js';
import { A } from '../rig.js';

// copper with a green patina on the head and the legs, bright hammered copper on the boiler, brass fittings, red-brown leather
const PATINA = '#4f8a6e', DPAT = '#2f5a4a', COPPER = '#b9683a', CUDARK = '#7a3c28', CULITE = '#dc9c6c', BRASS = '#c9a148', LEATHER = '#86522f', LDARK = '#4c2a18', IRON = '#3b393e', SOOT = '#1b191a';
const BRASSM = { col: BRASS, metal: 1, rough: 0.3, env: 1.1 };
const STEEL = { col: '#b4bac4', metal: 1, rough: 0.22, env: 1.2 };
const NEEDLE = { col: '#1d1613', rough: 0.5 };
const GLASS = { col: '#c8eef2', op: 0.13, rough: 0.04, env: 1.3, noOut: true };
const TONGUE = { col: '#d8564a', rough: 0.35 };
const STEAM = { col: '#e6e2da', rough: 1, op: 0.5, noOut: true };
const BR = { col: BRASS, metal: 1, gloss: 0.6, k: 0.012 }, FE = { col: IRON, metal: 0.8, gloss: 0.4, k: 0.02 }, CU = { col: COPPER, metal: 1, gloss: 0.5, k: 0.02 };
const PT = { gloss: 0.3, metal: 0.4 };

const D = Math.PI / 180, _e = new THREE.Euler(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
// a copy of a geometry at a place: position, rotation (degrees) or a direction for +Y, scale
function at(g, p, r, s) {
  if (r && r.isVector3) _q.setFromUnitVectors(UP, _v.copy(r).normalize()); else { r = r || [0, 0, 0]; _q.setFromEuler(_e.set(r[0] * D, r[1] * D, r[2] * D, 'XYZ')); }
  return g.clone().applyMatrix4(_m.compose(new THREE.Vector3(p[0], p[1], p[2]), _q, _s.setScalar(s || 1)));
}
function merge(list) {
  return mergeGeometries(list.map(g => { if (g.getAttribute('uv')) g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));
}
const cyl = (r, h, seg) => new THREE.CylinderGeometry(r, r, h, seg || 10);
const O = (base, extra) => Object.assign({}, base, extra);

// eye: centre and direction of the sight glass
const EC = [0.5, 0.775, 0.27], ED = new THREE.Vector3(0.72, 0.42, 0.55).normalize();
const EROT = [-Math.asin(ED.y) / D, Math.atan2(ED.x, ED.z) / D, 0];   // order YXZ: turns +Z to ED
const along = (k) => [EC[0] + ED.x * k, EC[1] + ED.y * k, EC[2] + ED.z * k];
// pressure gauge (heart piece): centre and direction of the dial. It looks out and up, so that the high camera sees it.
const GC = [-0.17, 0.95, 0.375], GN = new THREE.Vector3(0.16, 0.66, 0.73).normalize();
const GROT = [-Math.asin(GN.y) / D, Math.atan2(GN.x, GN.z) / D, 0];
// boiler: the copper belly (ellipsoid) and the drum on the back. Section of the belly at x.
const BX = [-0.53, -0.19, 0.14], bf = x => Math.sqrt(Math.max(0.02, 1 - Math.pow((x + 0.1) / 0.62, 2)));
const belly = (x, deg, k = 1) => [x, 0.42 - 0.34 * bf(x) * Math.sin(deg * D) * k, 0.5 * bf(x) * Math.cos(deg * D) * k];
let dialTex = null;
const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v;
// crawl: place of each leg in the step cycle (front L, front R, back L, back R): 4 separate beats
const CRAWL = [0.75, 0.27, 0, 0.52], ST = [{}, {}, {}, {}];
// back leg: the axes that open the knee and the ankle until the leg is straight (L side, R side)
const KNEE = [new THREE.Vector3(-0.605, 0.602, 0.521).normalize(), new THREE.Vector3(0.605, -0.602, 0.521).normalize()], ANKLE = [new THREE.Vector3(0.0125, -0.036, -0.9993).normalize(), new THREE.Vector3(-0.0125, 0.036, -0.9993).normalize()];
// One leg in the step cycle. q = place in the cycle (0..1), duty = part of the cycle with the foot on the ground.
// f = place of the foot along the step (+1 front, -1 back). l = lift (0..1): fast up, reach forward, plant.
function stride(q, duty, o) {
  q -= Math.floor(q);
  if (q < duty) { o.f = 1 - 2 * q / duty; o.l = 0; }
  else { const r = (q - duty) / (1 - duty); o.f = -1 + 2 * r * r * (3 - 2 * r); o.l = Math.sin(Math.PI * Math.pow(r, 0.72)); }
  return o;
}

export default {
  id: 'bellowsfrog', rim: '#ffd9a0', focus: 'gauge', top: 1.38, rough: 0.5, opts: { cell: 0.026, mottle: 0.07, mottleF: 15 },
  // parts that react late to a start, a stop and a turn: the belly, the throat, the chimney, the whistle valve, the eyes
  dyn: [
    { b: ['belly'], k: 85, d: 5, amt: 0.22, drag: 0, dir: [0, -1, 0] }, { b: ['sac'], k: 48, d: 5, amt: 0.6, drag: 1, dir: [1, -0.2, 0] },
    { b: ['stack'], k: 80, d: 6, amt: 0.55, drag: 1 }, { b: ['valve'], k: 60, d: 4.5, amt: 0.5, drag: 0.5, dir: [0, 1, 0] },
    { b: ['eyeL'], k: 90, d: 8, amt: 0.3, drag: 0 }, { b: ['eyeR'], k: 90, d: 8, amt: 0.3, drag: 0 }
  ],
  build(S) {
    // body = the drum on the back (rigid). belly = the copper belly below it (it wobbles). Legs: 3 parts each.
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.4, 0]).bone('belly', 'body', [-0.1, 0.42, 0]).bone('head', 'body', [0.3, 0.52, 0]).bone('jaw', 'head', [0.22, 0.45, 0])
      .bone('eyeL', 'head', along(-0.16), { m: 1 }).bone('sac', 'body', [0.36, 0.23, 0])
      .bone('stack', 'body', [-0.34, 0.98, 0]).bone('chim', 'stack', [-0.355, 1.2, 0])
      .bone('legFL', 'body', [0.16, 0.3, 0.42], { m: 1 }).bone('foreFL', 'legFL', [0.34, 0.16, 0.58], { m: 1 }).bone('handFL', 'foreFL', [0.46, 0.07, 0.6], { m: 1 })
      .bone('legBL', 'body', [-0.4, 0.36, 0.44], { m: 1 }).bone('shinBL', 'legBL', [-0.03, 0.55, 0.65], { m: 1 }).bone('footBL', 'shinBL', [-0.44, 0.13, 0.66], { m: 1 });

    S.color(PATINA);
    // the belly is a copper boiler: wide belly, drum on the back, brass bands round both
    S.ell('belly', [-0.1, 0.42, 0], [0.62, 0.34, 0.5], { col: COPPER, metal: 1, gloss: 0.5 });
    S.cap('body', [-0.36, 0.64, 0], [-0.02, 0.64, 0], 0.37, 0.37, CU);
    for (const [x, R] of [[-0.53, 0.332], [-0.19, 0.372], [0.14, 0.336]]) S.tor('body', [x, 0.64, 0], R, 0.032, O(BR, { rot: [0, 0, 90] }));
    for (const x of BX) { const pts = []; for (let a = -30; a <= 210; a += 20) pts.push(belly(x, a)); S.tube('belly', pts, pts.map(() => 0.03), BR); }
    // firebox door at the rear
    S.ell('body', [-0.72, 0.6, 0], [0.065, 0.17, 0.17], O(FE, { k: 0.012 }));
    S.tor('body', [-0.738, 0.6, 0], 0.168, 0.028, O(BR, { rot: [0, 0, 90], k: 0.01 }));
    S.ell('body', [-0.79, 0.6, 0.14], [0.03, 0.035, 0.035], O(BR, { k: 0.008 }));
    // short chimney with a hot throat
    S.cap('stack', [-0.34, 0.95, 0], [-0.355, 1.14, 0], 0.115, 0.095, O(FE, { k: 0.03 }));
    S.tor('stack', [-0.355, 1.16, 0], 0.102, 0.036, BR);
    S.tor('stack', [-0.345, 1.035, 0], 0.118, 0.026, BR);
    S.cap('stack', [-0.355, 1.02, 0], [-0.355, 1.32, 0], 0.062, 0.062, { sub: 1, col: '#ff9a40', glow: 1.3, k: 0.015 });
    // head and jaw: wide mouth with a brass lip
    S.ell('head', [0.44, 0.58, 0], [0.4, 0.21, 0.49], O(PT, { k: 0.03, sb: 0.04 }));
    S.ell('jaw', [0.44, 0.43, 0], [0.4, 0.115, 0.475], { col: CULITE, metal: 0.8, gloss: 0.4, k: 0.012, sb: 0.04 });
    const lip = [], line = [];
    for (let a = -105; a <= 105; a += 21) { lip.push([0.44 + 0.378 * Math.cos(a * D), 0.502, 0.462 * Math.sin(a * D)]); line.push([0.44 + 0.384 * Math.cos(a * D), 0.469, 0.462 * Math.sin(a * D)]); }
    S.tube('head', lip, lip.map(() => 0.032), O(BR, { sb: 0.04 }));
    S.ell('head', [0.74, 0.69, 0.075], [0.035, 0.03, 0.03], O(PT, { m: 1, k: 0.02 }));
    // housings of the sight-glass eyes
    S.cap('eyeL', along(-0.26), along(-0.105), 0.125, 0.128, O(BR, { m: 1, k: 0.015 }));
    S.tor('eyeL', along(-0.2), 0.125, 0.022, O(BR, { m: 1, k: 0.008, col: '#a07c30', rot: [-58, 0, 36] }));
    // bellows throat: dark core, five leather pleats
    S.cap('sac', [0.4, 0.22, 0], [0.74, 0.22, 0], 0.125, 0.125, { col: LDARK, k: 0.012, sb: 0.03 });
    [0.15, 0.178, 0.188, 0.178, 0.15].forEach((r, i) => S.ell('sac', [0.41 + i * 0.085, 0.22, 0], [0.046, r, r * 1.3], { col: LEATHER, k: 0.008, sb: 0.03 }));
    S.tor('belly', [0.365, 0.235, 0], 0.15, 0.04, O(BR, { rot: [0, 0, 90] }));
    // front legs: short, with copper web feet
    S.cap('legFL', [0.16, 0.3, 0.42], [0.34, 0.16, 0.58], 0.1, 0.075, O(PT, { m: 1 }));
    S.ell('foreFL', [0.34, 0.16, 0.58], 0.084, O(BR, { m: 1 }));
    S.cap('foreFL', [0.34, 0.16, 0.58], [0.46, 0.07, 0.6], 0.06, 0.055, O(FE, { m: 1 }));
    S.ell('handFL', [0.54, 0.042, 0.6], [0.15, 0.036, 0.125], O(CU, { m: 1 }));
    for (let i = -1; i <= 1; i++) S.cap('handFL', [0.5, 0.045, 0.6 + i * 0.03], [0.7 - Math.abs(i) * 0.03, 0.035, 0.6 + i * 0.1], 0.04, 0.03, O(CU, { m: 1 }));
    // back legs: folded, brass knee and ankle, iron shin
    S.cap('legBL', [-0.4, 0.36, 0.44], [-0.05, 0.54, 0.64], 0.16, 0.12, O(PT, { m: 1 }));
    S.ell('shinBL', [-0.03, 0.55, 0.65], 0.108, O(BR, { m: 1 }));
    S.cap('shinBL', [-0.03, 0.55, 0.65], [-0.44, 0.14, 0.66], 0.082, 0.068, O(FE, { m: 1 }));
    S.ell('footBL', [-0.44, 0.13, 0.66], 0.086, O(BR, { m: 1 }));
    S.cap('footBL', [-0.44, 0.1, 0.66], [-0.16, 0.05, 0.67], 0.068, 0.055, O(CU, { m: 1 }));
    S.ell('footBL', [-0.08, 0.04, 0.67], [0.18, 0.034, 0.12], O(CU, { m: 1 }));
    for (let i = -1; i <= 1; i++) S.cap('footBL', [-0.14, 0.045, 0.67 + i * 0.03], [0.12 - Math.abs(i) * 0.03, 0.035, 0.67 + i * 0.09], 0.04, 0.03, O(CU, { m: 1 }));

    // colour: heat stain below the belly, hammer marks on the copper, patina, soot, glow
    S.ell('body', [-0.14, 0.13, 0], [0.6, 0.15, 0.44], { paint: 1, col: CUDARK, cb: 0.08, op: 0.85, metal: 0.7, gloss: 0.3 });
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 46; i++) {
      const top = i % 2 === 0, x = -0.56 + rnd() * (top ? 0.56 : 0.72), dg = top ? 12 + rnd() * 156 : (rnd() < 0.5 ? -24 + rnd() * 70 : 134 + rnd() * 70), r = 0.03 + rnd() * 0.02;
      const p = top ? [x, 0.64 + 0.372 * Math.sin(dg * D), 0.372 * Math.cos(dg * D)] : belly(x, dg);
      S.ell('body', p, r, { paint: 1, col: i % 3 ? CUDARK : CULITE, cb: 0.016, op: i % 3 ? 0.34 : 0.4, metal: 1, gloss: 0.5 });
    }
    for (const [x, y, z, r] of [[0.2, 0.5, 0.43, 0.07], [0.3, 0.74, 0.22, 0.05], [0.58, 0.7, 0.2, 0.04], [0.42, 0.62, 0.44, 0.05], [0.66, 0.6, 0.3, 0.04]])
      S.ell('head', [x, y, z], r, { paint: 1, col: DPAT, cb: 0.02, m: 1 });
    for (const [bn, x, y, z, r] of [['legBL', -0.3, 0.5, 0.58, 0.06], ['legBL', -0.14, 0.46, 0.7, 0.045], ['legFL', 0.2, 0.32, 0.5, 0.04]]) S.ell(bn, [x, y, z], r, { paint: 1, col: DPAT, cb: 0.02, m: 1 });
    // worn places: the copper shows through the patina
    S.ell('head', [0.42, 0.8, 0], [0.2, 0.04, 0.12], { paint: 1, col: COPPER, cb: 0.04, op: 0.75, metal: 1, gloss: 0.5 });
    S.ell('head', [0.83, 0.6, 0], [0.05, 0.08, 0.2], { paint: 1, col: COPPER, cb: 0.04, op: 0.6, metal: 1, gloss: 0.5 });
    S.ell('legBL', [-0.2, 0.62, 0.56], [0.14, 0.04, 0.08], { paint: 1, col: COPPER, cb: 0.04, op: 0.7, metal: 1, gloss: 0.5, m: 1 });
    // patina that runs down from the bands
    S.ell('body', [-0.34, 0.6, 0.37], [0.1, 0.12, 0.06], { paint: 1, col: '#5aa890', cb: 0.05, op: 0.5, m: 1, metal: 0.3 });
    S.ell('body', [-0.02, 0.4, 0.5], [0.08, 0.14, 0.06], { paint: 1, col: '#5aa890', cb: 0.05, op: 0.45, m: 1, metal: 0.3 });
    // soot: round the chimney, down the back and round the firebox door
    S.ell('stack', [-0.355, 1.18, 0], [0.15, 0.07, 0.15], { paint: 1, col: SOOT, cb: 0.04, op: 0.85, gloss: 0, metal: 0 });
    S.ell('body', [-0.52, 0.9, 0], [0.17, 0.12, 0.24], { paint: 1, col: SOOT, cb: 0.07, op: 0.6, gloss: 0, metal: 0 });
    S.ell('body', [-0.7, 0.62, 0], [0.1, 0.3, 0.32], { paint: 1, col: SOOT, cb: 0.07, op: 0.5, gloss: 0, metal: 0 });
    for (let i = -1; i <= 1; i++) S.box('body', [-0.78, 0.6 + i * 0.078, -0.01], [0.05, 0.021, 0.105 - Math.abs(i) * 0.03], 0.01, { paint: 1, col: '#ff9a38', glow: 1.3, cb: 0.01 });
    S.tube('jaw', line, line.map(() => 0.03), { paint: 1, col: '#3a0f0a', cb: 0.012 });
    S.ell('head', [0.775, 0.7, 0.075], 0.018, { paint: 1, col: '#1c1410', cb: 0.008, m: 1 });

    // rivet rows on the boiler bands (top and belly), round the door and on the lip
    const rv = [], rvB = [], rb = ball(0.017, 6, 4);
    for (const [x, R] of [[-0.53, 0.332], [-0.19, 0.372], [0.14, 0.336]]) for (const dx of [-0.062, 0.062]) {
      for (let a = 18; a <= 162; a += 16) {
        const rr = Math.sqrt(Math.max(0.01, 0.376 * 0.376 - Math.pow(Math.max(0, Math.abs(x + dx + 0.19) - 0.17), 2)));
        rv.push(at(rb, [x + dx, 0.64 + rr * Math.sin(a * D), rr * Math.cos(a * D)]));
      }
      for (let a = -20; a <= 200; a += 20) rvB.push(at(rb, belly(x + dx, a, 1.01)));
    }
    for (let i = 0; i < 8; i++) rv.push(at(rb, [-0.775, 0.6 + 0.168 * Math.sin(i * 45 * D + 0.4), 0.168 * Math.cos(i * 45 * D + 0.4)]));
    for (let a = -84; a <= 84; a += 24) rv.push(at(rb, [0.44 + 0.392 * Math.cos(a * D), 0.56, 0.48 * Math.sin(a * D)]));
    S.add('body', merge(rv), BRASSM, {});
    S.add('belly', merge(rvB), BRASSM, {});
    // whistle valve on top: flange, pipe, slot, bell with a cap, lever with a weight
    const whistle = merge([lathe([[0.056, 0], [0.056, 0.022], [0.032, 0.036], [0.032, 0.085], [0.054, 0.095], [0.054, 0.165], [0.03, 0.172], [0.03, 0.2], [0.06, 0.206], [0.064, 0.3], [0.046, 0.33], [0.014, 0.345], [0.014, 0.372], [0.001, 0.385]], 12),
      at(cyl(0.012, 0.2, 6), [0.1, 0.19, 0], [0, 0, 80]), at(ball(0.038, 10, 8), [0.2, 0.208, 0]), at(cyl(0.02, 0.06, 6), [0.0, 0.19, 0], [90, 0, 0])]);
    S.add('body', whistle, BRASSM, { p: [-0.04, 0.995, 0], name: 'valve' });
    // steam pipe along each side
    S.add('body', tube([[0.1, 0.985, 0.14], [0.11, 0.83, 0.33], [0.0, 0.71, 0.39], [-0.3, 0.7, 0.395], [-0.52, 0.68, 0.36], [-0.63, 0.57, 0.3], [-0.68, 0.48, 0.2]], [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03], { ring: 8, seg: 40 }), BRASSM, { m: 1 });
    S.add('body', merge([at(torus(0.034, 0.015, 12, 6), [0.0, 0.71, 0.39], [0, 90, 0]), at(torus(0.034, 0.015, 12, 6), [-0.3, 0.7, 0.395], [0, 90, 0]), at(ball(0.042, 8, 6), [-0.52, 0.68, 0.36])]), STEEL, { m: 1 });
    // pressure gauge on the left side (heart piece). The left steam pipe feeds it.
    const gb = [GC[0] - GN.x * 0.07, GC[1] - GN.y * 0.07, GC[2] - GN.z * 0.07];
    S.add('body', tube([[-0.16, 0.705, 0.395], [-0.172, 0.8, 0.385], gb], [0.03, 0.03, 0.034], { ring: 8 }), BRASSM, {});
    const cup = lathe([[0.001, -0.075], [0.11, -0.075], [0.172, -0.05], [0.192, -0.012], [0.192, 0.03], [0.168, 0.038], [0.162, 0.014], [0.001, 0.014]], 24); cup.rotateX(Math.PI / 2);
    S.add('body', cup, BRASSM, { p: GC, r: GROT, order: 'YXZ', name: 'gcase' });
    dialTex = dialTex || canvasTex(256, 256, (g, W) => {
      const c = W / 2, R = 120, pt = (deg, r) => [c + Math.sin(deg * D) * r, c - Math.cos(deg * D) * r];
      g.fillStyle = '#1a1512'; g.fillRect(0, 0, W, W);
      g.fillStyle = '#d9cda6'; g.beginPath(); g.arc(c, c, R, 0, 7); g.fill();
      g.strokeStyle = '#d6341e'; g.lineWidth = 30; g.beginPath(); g.arc(c, c, R - 22, -20 * D, 45 * D); g.stroke();   // red zone
      g.strokeStyle = '#2a211a'; g.lineCap = 'butt';
      for (let d = -135; d <= 135; d += 15) { const big = d % 45 === 0, p0 = pt(d, R - 6), p1 = pt(d, R - (big ? 42 : 26)); g.lineWidth = big ? 8 : 5; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
      // maker's mark: the red line that Fitz painted by hand. It is not straight, and it runs over the rim.
      g.strokeStyle = '#a81206'; g.lineCap = 'round'; g.lineWidth = 17;
      const a0 = pt(64, 26), a1 = pt(72, 78), a2 = pt(68, R + 8);
      g.beginPath(); g.moveTo(a0[0], a0[1]); g.quadraticCurveTo(a1[0] + 6, a1[1] - 5, a2[0], a2[1]); g.stroke();
      g.lineWidth = 9; g.beginPath(); g.moveTo(a0[0] - 4, a0[1] + 5); g.lineTo(a1[0] - 3, a1[1] + 7); g.stroke();
    });
    S.add('body', new THREE.CircleGeometry(0.162, 28).translate(0, 0, 0.018), { col: '#e2e2e2', map: dialTex, emap: dialTex, glow: '#ffe0b0', glowK: 1.75, rough: 0.35, noOut: true }, { p: GC, r: GROT, order: 'YXZ', name: 'gauge' });
    S.add('body', merge([at(rbox(0.02, 0.145, 0.008), [0, 0.05, 0.034]), at(ball(0.024, 8, 6), [0, 0, 0.03]), at(rbox(0.03, 0.03, 0.008), [0, -0.03, 0.034])]), NEEDLE, { p: GC, r: GROT, order: 'YXZ', name: 'needle' });
    // sight-glass eyes: brass ring, glass dome
    S.add('eyeL', torus(0.123, 0.03, 26, 8), BRASSM, { p: along(0.012), r: EROT, order: 'YXZ', m: 1 });
    const dome = new THREE.SphereGeometry(0.133, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2); dome.rotateX(Math.PI / 2);
    S.add('eyeL', dome, GLASS, { p: along(0.004), r: EROT, order: 'YXZ', m: 1 });
    // brass end plate of the bellows, with a nozzle
    S.add('sac', lathe([[0.001, 0.105], [0.034, 0.105], [0.05, 0.09], [0.05, 0.05], [0.12, 0.042], [0.165, 0.03], [0.17, 0.012], [0.155, 0], [0.001, 0]], 20), BRASSM, { p: [0.775, 0.23, 0], r: [0, 0, -90], s: [1, 1, 1.3] });
    // pistons on the back shins
    const K = new THREE.Vector3(-0.03, 0.55, 0.705), dir = new THREE.Vector3(-0.41, -0.41, 0.01).normalize(), nn = new THREE.Vector3(-0.7, 0.71, 0).multiplyScalar(0.075);
    const pp = k => [K.x + dir.x * k + nn.x, K.y + dir.y * k + nn.y, K.z + dir.z * k + nn.z];
    S.add('shinBL', merge([at(cyl(0.036, 0.25), pp(0.2), dir), at(cyl(0.042, 0.03), pp(0.085), dir), at(cyl(0.042, 0.03), pp(0.32), dir), at(ball(0.03, 8, 6), pp(0.055)), at(ball(0.03, 8, 6), pp(0.53))]), BRASSM, { m: 1 });
    S.add('shinBL', at(cyl(0.016, 0.24, 8), pp(0.42), dir), STEEL, { m: 1 });
    // tongue (hidden until the shot), steam puffs from the chimney and from the whistle
    const rod = cyl(0.028, 1, 8); rod.rotateZ(-Math.PI / 2); rod.translate(0.5, 0, 0);
    S.add('body', rod, TONGUE, { p: [0.42, 0.47, 0], name: 'tongue' });
    S.add('body', ball(0.075, 14, 10), TONGUE, { p: [0.42, 0.47, 0], name: 'tip' });
    for (let i = 0; i < 3; i++) S.add('chim', ball(0.07, 10, 8), STEAM, { p: [-0.355, 1.22, 0], name: 'puff' + i });
    S.add('body', ball(0.07, 10, 8), STEAM, { p: [-0.04, 1.4, 0], name: 'toot' });
    // eyes: water behind glass. The flat pupil is the water line. Half-closed lids: grumpy, but kind.
    S.eye('eyeL', EC, 0.118, { dir: [ED.x, ED.y, ED.z], sclera: '#e9f1ea', iris: '#ffc24a', iris2: '#f07a1c', pupil: 'bar', size: 50, lid: '#a8843a', open: 43, tilt: -17, glow: 0.45, m: 1 });
  },
  anim(b, t, c) {
    // u: the ultimate (Overpressure Detonation). hold = the valves are closed and the body swells. rel = the blast.
    const u = A.ease(t.u || 0), nu = 1 - u, hold = u * (0.25 + 0.75 * t.a) * (1 - t.s), rel = u * t.s;
    const br = Math.sin(t.p), a = t.a * nu, s = t.s * nu, h = t.h, P = c.parts, tm = t.tm, mv = t.mv;
    const slam = t.k === 'slam' ? 1 : 0, shot = t.k === 'shot' ? 1 : 0, buff = t.k === 'buff' ? 1 : 0, mel = t.k === 'melee' ? 1 : 0;
    const shk = hold * Math.sin(tm * 53), shk2 = hold * Math.sin(tm * 47 + 1);
    // motion of the body. It hops when it goes forward at speed. It crawls with single steps when it is slow, goes to the side, goes back or turns.
    const sp = Math.hypot(t.vf, t.vs), tn = t.tn, noV = cl(1 - sp / 0.3 - Math.abs(tn) / 0.2, 0, 1), vfN = cl(t.vf / 2.6, -1, 1), vsN = cl(t.vs / 2.6, -1, 1);
    const F = cl(t.vf / 2.2, -1, 1) + noV, Sd = cl(t.vs / 2.2, -1, 1), hb0 = A.ease((F - 0.3) / 0.35), hop = mv * hb0 * nu, crawl = mv * (1 - hb0) * nu * cl(Math.abs(F) + Math.abs(Sd) + Math.abs(tn), 0.35, 1);
    const hx = t.hx || t.hz ? t.hx : -1, hb = h * -hx, hsd = h * t.hz, vu = cl(t.va / 5, -1, 1);   // hb: pushed to the rear. hsd: pushed to the L side. vu: it goes up.
    const idle = (1 - mv) * nu * (1 - a), sway = Math.sin(tm * 0.6) * Math.sin(tm * 0.21 + 1) * idle, look = Math.sin(tm * 0.33 + 2) * Math.sin(tm * 0.79) * idle;
    const croak = Math.pow(Math.max(0, Math.sin(t.p * 0.5)), 8) * nu, gulp = Math.sin(t.p * 2.3) * (0.5 + 0.5 * Math.sin(tm * 0.37)) * idle;
    // memory between frames: the belly shakes after a hit and after a landing
    const M = c.bf || (c.bf = { tm, x: 0, v: 0, va: 0, h: 0 }), dt = cl(tm - M.tm, 0, 0.05); M.tm = tm;
    if (h > M.h + 0.4) M.v -= 2.4;
    if (M.va < -1.5 && t.va > -0.3) M.v -= 3.2;
    M.h = h; M.va = t.va;
    M.v += (-Math.abs(t.af) * 0.035 - M.x * 120 - M.v * 6) * dt; M.x = cl(M.x + M.v * dt, -0.5, 0.5);

    // one hop = one turn of the walk phase: crouch, push with the back legs, flight, the front legs land first, settle
    const q = t.w / TAU - Math.floor(t.w / TAU), fly = cl((q - 0.2) / 0.45, 0, 1), ld = cl((q - 0.65) / 0.35, 0, 1);
    const crh = q >= 0.82 ? A.ease((q - 0.82) / 0.18) : q < 0.14 ? 1 - A.ease(q / 0.14) : 0;
    const ext0 = q < 0.04 ? 0 : q < 0.2 ? A.ease((q - 0.04) / 0.16) : q < 0.45 ? 1 : q < 0.72 ? 1 - A.ease((q - 0.45) / 0.27) : 0;
    const hy = 4 * fly * (1 - fly), pit = q < 0.2 ? 0.26 * A.ease(q / 0.2) : q < 0.65 ? 0.26 - 0.5 * A.ease(fly) : -0.24 * (1 - A.ease(ld * 2.6));
    const armUp = q < 0.2 ? 0 : q < 0.65 ? (fly < 0.45 ? A.ease(fly / 0.45) : 1 - 1.5 * A.ease((fly - 0.45) / 0.55)) : -0.5 * (1 - A.ease(ld * 2.5));
    const absorb = q >= 0.65 ? Math.sin(Math.PI * Math.min(1, ld * 2.2)) : 0, wob = q >= 0.65 ? Math.exp(-ld * 4.5) * Math.sin(ld * 20) : 0;
    const air = Math.max(0, vu), fall = Math.max(0, -vu);
    // ultimate: the body swells to 1.3 times its size. The legs keep their size and move apart with the belly.
    const sw = 1 + hold * (0.3 + 0.012 * Math.sin(tm * 31)) + rel * 0.06;
    b.body.scale.setScalar(sw);
    b.body.position.y += br * 0.004 + (hy * 0.3 - crh * 0.035 - absorb * 0.03) * hop - a * 0.025 * (1 - slam) + slam * a * 0.07 + mel * Math.sin(Math.min(1, s) * Math.PI) * 0.12 + hold * 0.03 + rel * 0.12 - fall * 0.02;
    b.body.position.x += mel * (s * 0.3 - a * 0.1) + shot * (s * 0.05 - a * 0.05) - slam * s * 0.08 + buff * Math.sin(tm * 50) * 0.004 * a + shk * 0.012 - rel * 0.12 - hb * 0.04;
    b.body.position.z += shk2 * 0.01;
    b.body.rotation.z += pit * hop + slam * (a * 0.2 - s * 0.12) + mel * (a * 0.14 - s * 0.3) + hb * 0.1 + shk2 * 0.014 + hold * 0.05 + rel * 0.2 + air * 0.12 - fall * 0.1;
    b.body.rotation.x = sway * 0.03 + shk * 0.012 + hsd * 0.06;
    // boiler belly: it breathes, it wobbles when the toad lands, it shakes after a hit
    const sq = wob * 0.07 * hop + M.x * 0.22 + absorb * 0.03 * hop;
    b.belly.scale.set(1 + sq * 0.5 + br * 0.006, 1 - sq + br * 0.014 + gulp * 0.004, 1 + sq * 0.6 + br * 0.008);
    b.belly.position.y -= sq * 0.05;
    // back legs (thigh, shin, foot): folded at rest, fully stretched in the push and in the flight
    const ext = cl(ext0 * hop + mel * s + air * 0.9 + rel * 0.5, 0, 1), sit = crh * hop * 0.12 + a * 0.1 * (1 - slam) + fall * 0.1 + absorb * hop * 0.08;
    // front legs (upper arm, fore-arm, hand): they tuck in the flight, reach down, land first and bend
    const au = armUp * hop + air * 0.5 - fall * 0.5, ab = absorb * hop + fall * 0.3 + a * 0.2 * (1 - slam);
    for (let i = 0; i < 4; i++) {
      const fr = i < 2, sd = i % 2 ? -1 : 1, o = stride(t.w / TAU + CRAWL[i], 0.7, ST[i]);
      const th = o.f * F * 0.3 * crawl, lat = o.f * (Sd * 0.9 + tn * (fr ? 0.6 : -0.6)) * 0.3 * crawl, lift = o.l * crawl;
      if (fr) {
        const up = b[sd > 0 ? 'legFL' : 'legFR'], fo = b[sd > 0 ? 'foreFL' : 'foreFR'], hn = b[sd > 0 ? 'handFL' : 'handFR'];
        up.rotation.z = th + lift * 0.3 + au * 0.6 + ab * 0.3 - mel * s * 0.3 - hold * 0.1 + hb * 0.15;
        up.rotation.x = -lat - sd * (mel * s * 0.5 + slam * a * 0.15 + hold * 0.3 + rel * 0.4 + h * 0.12 + ab * 0.15);
        fo.rotation.z = -lift * 0.45 - Math.max(0, au) * 0.55 - Math.min(0, au) * 0.3 - ab * 0.55;
        hn.rotation.z = -(up.rotation.z + fo.rotation.z) * (1 - 0.6 * cl(Math.abs(au), 0, 1)) - lift * 0.3;   // the hand is flat on the ground; it hangs in the air
        up.scale.setScalar(1 / sw);
      } else {
        const up = b[sd > 0 ? 'legBL' : 'legBR'], sh = b[sd > 0 ? 'shinBL' : 'shinBR'], ft = b[sd > 0 ? 'footBL' : 'footBR'];
        // the thigh goes round to the rear in the flat plane (as on a real toad); the knee and the ankle open until the leg is straight
        up.rotation.z = -ext * 0.75 - th * 0.5 + sit - hb * 0.25;
        up.rotation.y = sd * (hold * 0.25 - ext * 2.6 + lift * 0.15);
        up.rotation.x = -lat * 0.6 - sd * (hold * 0.22 + rel * 0.3 + Math.max(0, hsd * sd) * 0.25);
        sh.quaternion.setFromAxisAngle(KNEE[sd > 0 ? 0 : 1], ext * 2.57); sh.rotation.z += lift * 0.3 - sit * 1.2;
        ft.quaternion.setFromAxisAngle(ANKLE[sd > 0 ? 0 : 1], ext * 2.18); ft.rotation.z += lift * 0.4 + sit * 0.2;
        up.scale.setScalar(1 / sw);
      }
    }
    // bellows throat (spring bone): it pumps fast at rest; it fills for the blast and folds flat when it fires. Ultimate: the folds stretch far.
    const pump = buff * a * Math.sin(tm * 14) * 0.16 + t.gl * Math.sin(tm * 9) * 0.05 + gulp * 0.07;
    b.sac.scale.set(1 + br * 0.07 + croak * 0.28 + slam * (a * 0.8 - s * 0.5) + shot * a * 0.2 + pump - h * 0.2 + hold * (0.6 + 0.05 * Math.sin(tm * 23)) - rel * 0.4 - absorb * 0.12 * hop,
      1 + br * 0.03 + croak * 0.14 + slam * (a * 0.62 - s * 0.2) + pump * 0.6 + hold * 0.22 + absorb * 0.08 * hop, 1 + br * 0.035 + croak * 0.18 + slam * (a * 0.85 - s * 0.25) + pump * 0.6 + hold * 0.26 + absorb * 0.08 * hop);
    b.sac.rotation.z = -pit * 0.4 * hop + slam * a * 0.06 + hold * 0.1 + wob * 0.08 * hop;
    // head, jaw, sight-glass eyes. The wide head turns only a little: the eyes turn to the aim first.
    const hy0 = cl(t.hd * 0.7, -0.8, 0.8);
    b.head.rotation.z = br * 0.015 + croak * 0.05 - pit * 0.45 * hop + absorb * 0.07 * hop + slam * (a * 0.2 - s * 0.05) + shot * (-a * 0.08 + s * 0.28) + hb * 0.2 + h * 0.04 + mel * (a * 0.1 - s * 0.1) + hold * 0.1 + rel * 0.3;
    b.head.rotation.y = t.lk * 0.18 * nu + look * 0.1 + hy0 * 0.6 - hsd * 0.2 + shk * 0.02 - tn * 0.08;
    b.head.rotation.x = -sway * 0.03 - hy0 * 0.08;
    b.head.position.x += shot * (s * 0.12 - a * 0.06);
    b.head.scale.setScalar(1 - hold * 0.07);
    b.jaw.rotation.z = -(croak * 0.06 + slam * s * 0.45 + shot * s * 0.4 + h * 0.3 * nu + mel * s * 0.2 + buff * a * 0.1 + rel * 0.6 + Math.max(0, gulp) * 0.02);
    const press = Math.min(1.6, a * (slam || buff ? 1 : 0.5) + t.gl * 0.5 + slam * s * 0.6 + croak * 0.3 + u * 1.6 + hop * 0.25);
    const es = 1 + slam * a * 0.2 + h * 0.12 + croak * 0.04 + hold * 0.22 + rel * 0.1 + absorb * 0.05 * hop;
    b.eyeL.scale.setScalar(es); b.eyeR.scale.setScalar(es);
    const ey = -cl(t.hd, -1, 1) * 0.3 - look * 0.25 - t.lk * 0.1;
    b.eyeL.rotation.y = Math.sin(t.p * 0.7) * 0.05 + ey + shk * 0.05; b.eyeR.rotation.y = Math.sin(t.p * 0.7 + 1) * 0.05 + ey - shk2 * 0.05;
    // pressure gauge: the needle stays in the red zone and shakes. It hits the stop when the pressure is at its maximum. It jumps with a start and a stop.
    P.needle.rotation.z += -1.42 - press * 0.56 + Math.sin(tm * 33) * (0.035 + 0.05 * press) + Math.sin(tm * 2.1) * 0.05 * nu + M.x * 1.2 - cl(t.af / 40, -1, 1) * 0.25;
    const gs = 1 + 0.02 * Math.sin(tm * 4) + t.gl * 0.05 + hold * 0.12 + rel * 0.2;
    P.gauge.scale.setScalar(gs); P.gcase.scale.setScalar(gs); P.needle.scale.setScalar(gs);
    // whistle valve (spring part): it lifts and blows with the croak, with a start and with a stop; it rattles hard when all valves are closed
    const jolt = cl(Math.abs(t.af) / 40, 0, 1) * nu, rat = hold + press * 0.12 * nu + jolt * 0.5;
    P.valve.rotation.z += Math.sin(tm * 67) * 0.2 * rat + croak * 0.1; P.valve.rotation.x += Math.sin(tm * 59 + 2) * 0.17 * rat;
    P.valve.position.y += Math.abs(Math.sin(tm * 43)) * 0.035 * rat + croak * 0.03 + rel * 0.08 + Math.max(0, wob) * 0.03 * hop;
    const tt = P.toot, tq = croak + rel + jolt * 0.7 + absorb * 0.35 * hop;
    tt.visible = tq > 0.03;
    tt.position.y += tq * 0.16; tt.position.x -= tq * 0.05 + vfN * 0.2; tt.position.z -= vsN * 0.15;
    tt.scale.setScalar(Math.max(0.001, croak * 1.1 + rel * 2.6 + jolt * 0.9 + absorb * 0.5 * hop));
    // boiler: chimney (spring bone) and its puffs. The steam trails behind the motion; more steam at a start. No steam while the valves are closed.
    b.stack.rotation.z = Math.sin(t.p * 2) * 0.01 + shk * 0.03 + wob * 0.05 * hop; b.stack.rotation.x = shk2 * 0.03;
    b.stack.scale.y = 1 - slam * a * 0.08 + slam * s * 0.12 - hold * 0.1 + rel * 0.2 - absorb * 0.06 * hop;
    const smoke = (0.55 + press * 0.8 * nu + mv * 0.2 + slam * s + jolt * 0.8) * (1 - Math.min(1, hold * 1.3)) + rel * 2.2;
    for (let i = 0; i < 3; i++) {
      const pq = (tm * (0.55 + press * 0.5) + i / 3) % 1, pf = P['puff' + i];
      pf.position.y += pq * (0.3 + press * 0.2); pf.position.x -= pq * (0.06 + vfN * 0.5); pf.position.z += Math.sin(pq * 5 + i * 2) * 0.03 - vsN * pq * 0.4;
      pf.scale.setScalar(Math.max(0.001, Math.sin(pq * Math.PI) * (0.45 + pq * 0.9) * smoke));
    }
    // tongue
    const L = shot * s * 0.95, tg = P.tongue;
    tg.visible = P.tip.visible = L > 0.02;
    tg.scale.x = Math.max(0.001, L); P.tip.position.x += L;
  }
};
