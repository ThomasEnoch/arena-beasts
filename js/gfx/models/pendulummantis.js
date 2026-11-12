/* Pendulummantis (Mantick) - the striking figure of a tower clock: polished brass mantis, fore-arms that are the minute hand
   and the hour hand, stained-glass wings cut from the old clock face, an escapement wheel in the thorax,
   and a pendulum with a glowing bob (heart piece). Maker's mark: XII on the plate between the eyes. Iron / Mind. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, blade, wing, lathe, ball, cone, torus, rbox, canvasTex } from '../geo.js';

const BRASS = '#b08d3c', PALE = '#cdae5a', BRONZE = '#4f3d24', VERD = '#4fa08e', LAMP = '#ffc670', RUBY = '#ff5a4a';
const BRASSM = { col: '#c2a04a', metal: 1, rough: 0.32, env: 1.1 };
const GOLDM = { col: '#e2c478', metal: 1, rough: 0.2, env: 1.3, flat: true };
const STEEL = { col: '#e4eaf0', metal: 1, rough: 0.14, env: 1.4 };
const BRONZM = { col: '#5a472c', metal: 0.8, rough: 0.45, env: 0.8 };
const BLUED = { col: '#3d5cb4', metal: 0.85, rough: 0.3, env: 1.2 };
const GEM = { col: '#ffd890', glow: '#ffb030', glowK: 3.3, noOut: true };
const JEWEL = { col: '#ff5a4a', glow: '#ff3a2a', glowK: 1.1, rough: 0.1, noOut: true };
const HAND = { col: '#2a2018', rough: 0.4 };
const D2R = Math.PI / 180;
// ultimate pose of the fore-arms: upper arm lift, elbow yaw, arm roll, turn of the forearm, turn of the hand. Then the 4 wing angles.
const UA = 0.6, UY = 0.1, UX = 0.4, UF = 3.4, UH = 2.88, UW = [1.05, 0.45, 1.3, 0.15];
const TAU = Math.PI * 2;
// fore-arm: shoulder (armL), elbow E (foreL), wrist W (scyL: the clock hand). At rest it is folded: forearm down and back, hand down.
const E = [0.8, 1.5, 0.25], W = [0.7155, 1.3187, 0.262];
// walking legs: hip, then the points of the leg relative to the hip. Point 2 is the knee, point 4 is the foot.
const HM = [0.07, 0.8, 0.15], HH = [-0.14, 0.8, 0.15];
const LEGM = [[0, 0, 0], [0.1, 0.16, 0.2], [0.2, 0.2, 0.36], [0.3, -0.3, 0.46], [0.36, -0.745, 0.5]];
const LEGH = [[0, 0, 0], [-0.14, 0.2, 0.18], [-0.3, 0.26, 0.33], [-0.5, -0.3, 0.42], [-0.62, -0.745, 0.46]];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _qi = new THREE.Quaternion();
function mkLeg(H, K, F, sg) {
  const u = new THREE.Vector3(K[0] - H[0], K[1] - H[1], (K[2] - H[2]) * sg), l = new THREE.Vector3(F[0] - K[0], F[1] - K[1], (F[2] - K[2]) * sg);
  return { h: new THREE.Vector3(H[0], H[1], H[2] * sg), f: new THREE.Vector3(F[0], F[1], F[2] * sg), u, l, n: new THREE.Vector3().crossVectors(u, l).normalize(), L1: u.length(), L2: l.length(), k0: Math.PI - u.angleTo(l) };
}
// Put the foot of a 2-part leg at the point (x, y, z). The point is in the rest axes of the parent bone of the hip. The knee bends as necessary.
function solveLeg(hip, shin, G, x, y, z) {
  _a.set(x, y, z).sub(G.h);
  let d = _a.length();
  const lo = Math.abs(G.L1 - G.L2) + 0.02, hi = G.L1 + G.L2 - 0.004;
  d = d < lo ? lo : d > hi ? hi : d;
  const kn = Math.acos(Math.max(-1, Math.min(1, (G.L1 * G.L1 + G.L2 * G.L2 - d * d) / (2 * G.L1 * G.L2))));
  shin.quaternion.setFromAxisAngle(G.n, G.k0 - kn);
  _b.copy(G.l).applyQuaternion(shin.quaternion).add(G.u).normalize();
  hip.quaternion.setFromUnitVectors(_b, _a.normalize());
}
// One leg of a walk cycle. ph = phase in cycles. out[0] = place of the foot along the stride (+0.5 = front, -0.5 = back), out[1] = lift 0..1.
// Stance: the foot goes back at a constant speed. Swing: it lifts fast, reaches forward, and comes down.
function stepOf(ph, duty, out) {
  const q = ph - Math.floor(ph);
  if (q < duty) { out[0] = 0.5 - q / duty; out[1] = 0; return; }
  const w = (q - duty) / (1 - duty);
  out[0] = -0.5 + w * w * (3 - 2 * w); out[1] = Math.pow(Math.sin(Math.PI * w), 0.7);
}
// spring that follows a value: it comes late, goes past and settles. With no time step (a still pose) it is at the value.
function spr(st, key, target, k, d, dt) {
  if (!(dt > 0)) { st[key] = target; st[key + 'v'] = 0; return target; }
  let x = st[key] || 0, v = st[key + 'v'] || 0;
  const n = Math.ceil(dt / 0.012), hh = dt / n;
  for (let i = 0; i < n; i++) { v += ((target - x) * k - v * d) * hh; x += v * hh; }
  st[key] = x; st[key + 'v'] = v;
  return x;
}
const rnd = n => { const x = Math.sin(n * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); };
const cl1 = x => x < -1 ? -1 : x > 1 ? 1 : x;
const DUTY = 0.62, FREQ = 2, LIFT = 0.26, SMAX = 0.62, B0 = new THREE.Vector3(0, 0.86, 0);
// 4 walking legs. Diagonal pairs go nearly together, but each leg has its own phase, and left and right are not exact mirrors.
const LEGS = [['legML', 'shinML', HM, LEGM, 1, 0], ['legMR', 'shinMR', HM, LEGM, -1, 0.52], ['legHL', 'shinHL', HH, LEGH, 1, 0.59], ['legHR', 'shinHR', HH, LEGH, -1, 0.08]]
  .map(([hip, shin, H, pts, sg, ph]) => ({ hip, shin, sg, ph, G: mkLeg(H, add3(H, pts[2]), add3(H, pts[4]), sg), o: [0, 0] }));
let texA = null, texB = null, texM = null;
const ez = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };

// leaded glass: a fan of colour cells between dark lead lines. u = along the wing, v = across the wing.
function glassTex(pal) {
  return canvasTex(256, 128, (g, W, H) => {
    g.fillStyle = '#1b1622'; g.fillRect(0, 0, W, H);
    const nu = 7, nv = 4, lead = 3;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const x0 = W * Math.pow(i / nu, 0.85), x1 = W * Math.pow((i + 1) / nu, 0.85), y0 = H * j / nv, y1 = H * (j + 1) / nv, sk = (j - 1.5) * 9;
      g.fillStyle = pal[(i * 3 + j * 2 + ((i * j) % 3)) % pal.length];
      g.beginPath(); g.moveTo(x0 + lead + sk, y0 + lead); g.lineTo(x1 - lead + sk, y0 + lead); g.lineTo(x1 - lead + sk + 9, y1 - lead); g.lineTo(x0 + lead + sk + 9, y1 - lead); g.closePath(); g.fill();
      const gr = g.createRadialGradient((x0 + x1) / 2 + sk, y0 + (y1 - y0) * 0.35, 1, (x0 + x1) / 2 + sk, (y0 + y1) / 2, (x1 - x0) * 0.7);
      gr.addColorStop(0, 'rgba(255,255,255,0.42)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fill();
    }
    // rose window
    const cx = W * 0.6, cy = H * 0.5, R = H * 0.3;
    g.fillStyle = '#1b1622'; g.beginPath(); g.arc(cx, cy, R + 13, 0, 7); g.fill();
    // the old clock face: 12 hour marks round the rose
    g.strokeStyle = '#f2e2b0'; g.lineWidth = 3;
    for (let i = 0; i < 12; i++) { const q = i * Math.PI / 6, c0 = Math.cos(q), s0 = Math.sin(q); g.beginPath(); g.moveTo(cx + c0 * (R + 3), cy + s0 * (R + 3)); g.lineTo(cx + c0 * (R + 10), cy + s0 * (R + 10)); g.stroke(); }
    for (let i = 0; i < 8; i++) { g.fillStyle = pal[i % pal.length]; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, i * Math.PI / 4 + 0.06, (i + 1) * Math.PI / 4 - 0.06); g.closePath(); g.fill(); }
    g.fillStyle = '#1b1622'; g.beginPath(); g.arc(cx, cy, R * 0.42, 0, 7); g.fill();
    g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(cx, cy, R * 0.3, 0, 7); g.fill();
    g.strokeStyle = '#1b1622'; g.lineWidth = 7; g.strokeRect(0, 0, W, H);
  });
}
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
// put a wing() geometry (span = +Z, chord = +X) into the model: span and chord become the given directions
function panel(geo, span, chord) {
  const z = new THREE.Vector3(span[0], span[1], span[2]).normalize(), x = new THREE.Vector3(chord[0], chord[1], chord[2]);
  x.addScaledVector(z, -x.dot(z)).normalize();
  return geo.clone().applyMatrix4(new THREE.Matrix4().makeBasis(x, new THREE.Vector3().crossVectors(z, x), z));
}

export default {
  id: 'pendulummantis', rim: '#ffe0a0', focus: 'bobGem', top: 1.9, rough: 0.4,
  opts: { cell: 0.024, mottle: 0.07, mottleF: 15 },
  // the pendulum is a real pendulum: it swings from the motion of the body (low damping, no drag). The abdomen is heavy. The antennas whip.
  dyn: [
    { b: ['pend'], k: 17, d: 1.1, amt: 0.9, drag: 0, dir: [0, -1, 0] },
    { b: ['abd1', 'abd2', 'abd3'], k: 70, d: 7, amt: 0.45, drag: 0.6 },
    { b: ['antL'], k: 85, d: 6, amt: 0.9, drag: 2.5, dir: [-0.55, 0.75, 0.3] }, { b: ['antR'], k: 85, d: 6, amt: 0.9, drag: 2.5, dir: [-0.55, 0.75, -0.3] }
  ],
  rig: { head: 'head', neck: ['neck'] },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.86, 0])
      .bone('abd1', 'body', [-0.2, 0.86, 0]).bone('abd2', 'abd1', [-0.58, 0.82, 0]).bone('abd3', 'abd2', [-0.78, 0.79, 0])
      .bone('pro', 'body', [0.16, 0.95, 0]).bone('neck', 'pro', [0.45, 1.5, 0]).bone('head', 'neck', [0.5, 1.6, 0])
      .bone('armL', 'pro', [0.43, 1.41, 0.17], { m: 1 }).bone('foreL', 'armL', E, { m: 1 }).bone('scyL', 'foreL', W, { m: 1 })
      .bone('wingL', 'body', [-0.06, 1.05, 0.1], { m: 1 }).bone('wing2L', 'body', [-0.15, 1.02, 0.12], { m: 1 })
      .bone('legML', 'body', HM, { m: 1 }).bone('shinML', 'legML', add3(HM, LEGM[2]), { m: 1 })
      .bone('legHL', 'body', HH, { m: 1 }).bone('shinHL', 'legHL', add3(HH, LEGH[2]), { m: 1 })
      .bone('pend', 'body', [0.04, 0.67, 0]);

    const M = { metal: 1, gloss: 0.55, k: 0.02 }, Dk = { col: BRONZE, metal: 0.9, gloss: 0.4, k: 0.014 }, O = (a, b) => Object.assign({}, a, b);
    S.color(BRASS);
    // thorax: hub for the legs, the wings and the pendulum. An escapement ring with a ruby on each side.
    S.ell('body', [0, 0.86, 0], [0.26, 0.19, 0.2], M);
    S.box('body', [-0.04, 1.0, 0], [0.17, 0.055, 0.13], 0.04, Dk);
    S.box('body', [0.04, 0.7, 0], [0.08, 0.05, 0.07], 0.03, Dk);
    S.tor('body', [0.0, 0.9, 0.18], 0.112, 0.032, O(Dk, { m: 1, rot: [90, 0, 0] }));
    S.ell('body', [0.0, 0.9, 0.19], [0.085, 0.085, 0.03], { m: 1, col: '#241a10', k: 0.01, gloss: 0.3 });
    S.box('body', [0.19, 0.9, 0], [0.05, 0.1, 0.12], 0.03, Dk);
    S.box('body', [-0.2, 0.93, 0], [0.04, 0.09, 0.15], 0.03, Dk);
    S.ell('body', [0.07, 0.8, 0.16], 0.075, O(Dk, { m: 1 }));
    S.ell('body', [-0.14, 0.8, 0.16], 0.075, O(Dk, { m: 1 }));
    // abdomen: 5 brass shells with bronze bands
    const segs = [['abd1', -0.3, 0.855, 0.21, 0.2], ['abd1', -0.49, 0.84, 0.2, 0.215], ['abd2', -0.68, 0.81, 0.19, 0.19], ['abd3', -0.86, 0.775, 0.165, 0.155], ['abd3', -1.01, 0.745, 0.125, 0.11]];
    segs.forEach(([bn, x, y, rx, r], i) => S.ell(bn, [x, y, 0], [rx, r, r], { col: i % 2 ? PALE : BRASS, metal: 1, gloss: 0.55, k: 0.016 }));
    S.cap('abd3', [-1.08, 0.73, 0], [-1.2, 0.72, 0], 0.06, 0.035, Dk);
    for (const [bn, x, y, r] of [['abd1', -0.395, 0.848, 0.19], ['abd2', -0.585, 0.825, 0.19], ['abd3', -0.775, 0.792, 0.16], ['abd3', -0.94, 0.758, 0.12]])
      S.tor(bn, [x, y, 0], r, 0.027, O(Dk, { rot: [0, 0, 90] }));
    S.box('abd1', [-0.4, 1.04, 0], [0.13, 0.03, 0.05], 0.025, Dk);
    // prothorax: a tall instrument column with 3 collars and a clock dial
    S.cap('pro', [0.16, 0.95, 0], [0.44, 1.5, 0], 0.12, 0.085, M);
    for (const [f, R] of [[0.1, 0.125], [0.86, 0.1]]) S.tor('pro', [0.16 + 0.28 * f, 0.95 + 0.55 * f, 0], R, 0.03, O(Dk, { rot: [0, 0, -27] }));
    S.ell('pro', [0.43, 1.43, 0], [0.1, 0.1, 0.2], M);
    S.ell('pro', [0.375, 1.19, 0], [0.045, 0.115, 0.115], { rot: [0, 0, -27], col: '#f0dcae', glow: 0.8, k: 0.012 });
    S.tor('pro', [0.392, 1.181, 0], 0.11, 0.03, O(Dk, { rot: [0, 0, -117] }));
    S.box('pro', [0.2, 1.24, 0], [0.04, 0.2, 0.05], 0.03, O(Dk, { rot: [0, 0, -27] }));
    S.cap('neck', [0.45, 1.5, 0], [0.51, 1.61, 0], 0.062, 0.056, Dk);
    // head: wide triangle, the mouth at the lower point
    S.ell('head', [0.55, 1.66, 0], [0.125, 0.1, 0.21], M);
    S.cap('head', [0.6, 1.63, 0], [0.69, 1.46, 0], 0.095, 0.04, M);
    S.ell('head', [0.49, 1.72, 0], [0.1, 0.06, 0.1], Dk);
    S.ell('head', [0.662, 1.565, 0], [0.03, 0.04, 0.03], { col: RUBY, glow: 1.2, k: 0.01 });
    S.box('head', [0.655, 1.69, 0], [0.03, 0.05, 0.065], 0.012, O(Dk, { rot: [0, 0, 14] }));
    // raptor arms: upper arm with a collar, bronze elbow ball
    S.cap('armL', [0.43, 1.41, 0.17], E, 0.07, 0.058, O(M, { m: 1 }));
    S.tor('armL', [0.6, 1.452, 0.207], 0.066, 0.026, O(Dk, { m: 1, rot: [0, 0, -76] }));
    S.ell('foreL', E, 0.086, O(Dk, { m: 1 }));
    S.cap('foreL', E, W, 0.056, 0.05, O(M, { m: 1 }));
    S.tor('foreL', [(E[0] + W[0]) / 2, (E[1] + W[1]) / 2, (E[2] + W[2]) / 2], 0.052, 0.02, O(Dk, { m: 1, rot: [0, 0, -25] }));
    // --- paint: verdigris, rivets, glowing portholes
    const PV = { paint: 1, col: VERD, op: 0.5, cb: 0.035, metal: 0.05, gloss: 0.05 };
    S.ell('abd1', [-0.45, 0.66, 0], [0.34, 0.08, 0.2], PV);
    S.ell('abd3', [-0.95, 0.68, 0], [0.2, 0.06, 0.14], PV);
    S.ell('body', [0.0, 0.7, 0], [0.22, 0.06, 0.2], PV);
    S.ell('pro', [0.14, 1.08, 0], [0.08, 0.16, 0.14], O(PV, { rot: [0, 0, -27] }));
    S.ell('armL', [0.5, 1.37, 0.19], [0.08, 0.04, 0.07], O(PV, { m: 1, op: 0.4 }));
    // engraved seam on each shell, soot at the wing roots
    const SEAM = { paint: 1, col: '#3b2a12', cb: 0.007, op: 0.85, rot: [0, 0, 90] };
    segs.slice(0, 4).forEach(([bn, x, y, rx, r]) => { S.tor(bn, [x + 0.075, y, 0], r * 0.93, 0.006, SEAM); S.tor(bn, [x - 0.075, y, 0], r * 0.93, 0.006, SEAM); });
    S.ell('body', [-0.1, 1.04, 0.1], [0.07, 0.03, 0.05], { paint: 1, col: '#2a1e12', op: 0.6, cb: 0.03, m: 1 });
    S.cap('pro', [0.2, 1.0, 0.1], [0.42, 1.42, 0.075], 0.012, 0.012, { paint: 1, col: '#3b2a12', cb: 0.006, m: 1 });
    segs.slice(0, 4).forEach(([bn, x, y], i) => S.cap(bn, [x, y + 0.03, -0.3], [x, y + 0.03, 0.3], 0.042 - i * 0.004, 0.042 - i * 0.004, { paint: 1, col: LAMP, glow: 1.25, cb: 0.01 }));
    for (const f of [0.3, 0.72]) S.cap('pro', [0.16 + 0.28 * f - 0.3, 0.95 + 0.55 * f + 0.153, 0.065], [0.16 + 0.28 * f + 0.3, 0.95 + 0.55 * f - 0.153, 0.065], 0.02, 0.02, { paint: 1, col: '#2c2318', cb: 0.008, m: 1 });

    // --- wings: 4 leaded glass panels in brass frames --------------------------------
    if (!texA) { texA = glassTex(['#c8142e', '#f2a41c', '#2450cc', '#f7cf52', '#8e0c22', '#3f7fe6']); texB = glassTex(['#2450cc', '#f2a41c', '#3f7fe6', '#c8142e', '#16308c', '#f7cf52']); }
    const GLA = { map: texA, emap: texA, glow: '#ffffff', glowK: 0.36, col: '#ffffff', rough: 0.2, env: 1.0, noOut: true };
    const GLB = { map: texB, emap: texB, glow: '#ffffff', glowK: 0.36, col: '#ffffff', rough: 0.2, env: 1.0, noOut: true };
    const wingSet = (bone, p, out, span, chord, mat, name) => {
      const loop = out.concat([out[0], out[1]]).map(q => [q[1], 0, q[0]]);
      S.add(bone, panel(wing(out, 0.02, { smooth: false, bevel: 0.004 }), span, chord), mat, { p, m: 1, name });
      S.add(bone, panel(tube(loop, loop.map(() => 0.015), { ring: 6, seg: 44 }), span, chord), BRASSM, { p, m: 1 });
    };
    wingSet('wingL', [-0.06, 1.05, 0.1], [[0, -0.03], [0.26, -0.1], [0.66, -0.11], [0.99, -0.04], [1.12, 0.1], [1.01, 0.28], [0.66, 0.37], [0.32, 0.3], [0.07, 0.12]], [-0.86, 0.38, 0.34], [0.45, 0.72, 0.5], GLA, 'glaL');
    wingSet('wing2L', [-0.15, 1.02, 0.12], [[0, -0.02], [0.2, -0.1], [0.5, -0.14], [0.76, -0.08], [0.84, 0.05], [0.72, 0.19], [0.44, 0.23], [0.16, 0.16], [0.03, 0.06]], [-0.8, 0.1, 0.6], [0.3, 0.45, 0.8], GLB, 'glbL');

    // --- fore-arms: the two hands of the clock. Left = minute hand (long lance). Right = hour hand (short spade).
    // Blued steel with a ground edge, gold boss at the elbow. In the rest pose they point forward and down.
    const clockHand = (top, eyeX) => {
      const out = top.concat(top.slice(1, -1).reverse().map(q => [q[0], -q[1]])), tip = top[top.length - 1], n = top.length;
      const e = sg => tube([[top[n - 3][0], top[n - 3][1] * sg, 0], [top[n - 2][0], top[n - 2][1] * sg, 0], [tip[0], 0, 0]], [0.015, 0.014, 0.004], { ring: 6 });
      const boss = lathe([[0, -0.062], [0.05, -0.062], [0.078, -0.036], [0.078, 0.036], [0.05, 0.062], [0, 0.062]], 14); boss.rotateX(Math.PI / 2);
      const trim = [boss, at(torus(0.05, 0.013, 18, 6), [eyeX, 0, 0]), at(ball(0.03, 8, 6), [top[1][0] - 0.02, 0, 0.012]), at(ball(0.03, 8, 6), [top[1][0] - 0.02, 0, -0.012])];
      for (const f of [0.3, 0.52, 0.74]) for (const z of [0.02, -0.02]) trim.push(at(ball(0.014, 6, 5), [eyeX + (tip[0] - eyeX) * f, 0, z]));
      return [blade(out, 0.04, { bevel: 0.013 }), join([e(1), e(-1)]), join(trim)].map(g => g.rotateZ(-75 * D2R));
    };
    const minute = clockHand([[-0.2, 0], [-0.17, 0.04], [-0.12, 0.045], [-0.085, 0.022], [0, 0.036], [0.2, 0.026], [0.27, 0.04], [0.34, 0.092], [0.5, 0.062], [0.9, 0]], 0.34);
    const hour = clockHand([[-0.17, 0], [-0.14, 0.045], [-0.1, 0.045], [-0.07, 0.024], [0, 0.04], [0.13, 0.032], [0.19, 0.06], [0.25, 0.14], [0.35, 0.15], [0.45, 0.1], [0.68, 0]], 0.3);
    [BLUED, STEEL, GOLDM].forEach((m, i) => { S.add('scyL', minute[i], m, { p: W, r: [0, -8, 0] }); S.add('scyR', hour[i], m, { p: [W[0], W[1], -W[2]], r: [0, 8, 0] }); });
    // spines under the upper arm
    const spine = aim(cone(0.022, 0.1, 6), [0.25, -1, 0]);
    S.add('armL', join([spine, at(spine, [0.07, 0.017, 0.015]), at(spine, [0.14, 0.034, 0.03])]), BRONZM, { p: [0.47, 1.358, 0.185], m: 1 });

    // --- walking legs: bronze tubes with brass knees ------------------------------------
    // Each leg has 2 parts: hip to knee (the knee is high), knee to foot. The solver in anim bends the knee.
    const foot = (q, fx) => [at(ball(0.036, 8, 6), [q[0], q[1] - 0.015, q[2]]), at(aim(cone(0.024, 0.11, 6), [fx, -0.12, 0.25]), [q[0], q[1] - 0.02, q[2]]), at(aim(cone(0.02, 0.08, 6), [-fx * 0.6, -0.12, -0.4]), [q[0], q[1] - 0.02, q[2]])];
    for (const [hip, shin, H, pts, fx] of [['legML', 'shinML', HM, LEGM, 1], ['legHL', 'shinHL', HH, LEGH, -1]]) {
      S.add(hip, tube(pts.slice(0, 3), [0.046, 0.042, 0.04], { ring: 7 }), BRONZM, { p: H, m: 1 });
      S.add(hip, at(ball(0.06, 10, 8), pts[2]), BRASSM, { p: H, m: 1 });
      S.add(shin, join([tube(pts.slice(2), [0.04, 0.03, 0.022], { ring: 7 })].concat(foot(pts[4], fx))), BRONZM, { p: H, m: 1 });
      S.add(shin, at(ball(0.04, 8, 6), pts[3]), BRASSM, { p: H, m: 1 });
    }

    // --- pendulum: steel rod, brass lens bob with a glowing centre ---------------------------
    const bob = lathe([[0, -0.05], [0.12, -0.042], [0.192, -0.013], [0.2, 0], [0.192, 0.013], [0.12, 0.042], [0, 0.05]], 28); bob.rotateX(Math.PI / 2);
    const nut = lathe([[0, -0.03], [0.05, -0.03], [0.05, 0.03], [0, 0.03]], 8);
    S.add('pend', join([tube([[0, 0, 0], [0, -0.2, 0], [0, -0.4, 0]], [0.017, 0.017, 0.017], { ring: 6 }), at(nut, [0, -0.15, 0])]), STEEL, { p: [0.04, 0.67, 0] });
    S.add('pend', join([at(bob, [0, -0.36, 0]), at(aim(cone(0.035, 0.075, 8), [0, -1, 0]), [0, -0.552, 0]), at(torus(0.15, 0.012, 24, 6), [0, -0.36, 0.034]), at(torus(0.15, 0.012, 24, 6), [0, -0.36, -0.034]), at(torus(0.092, 0.01, 20, 6), [0, -0.36, 0.047]), at(torus(0.092, 0.01, 20, 6), [0, -0.36, -0.047]), ball(0.045, 10, 8)]), BRASSM, { p: [0.04, 0.67, 0] });
    S.add('pend', ball(0.086, 14, 10), GEM, { p: [0.04, 0.31, 0], s: [1, 1, 0.82], name: 'bobGem' });

    // --- escapement: a toothed wheel on each side of the thorax that turns in ticks, with its anchor above it ----
    const esc = [torus(0.062, 0.012, 20, 5), ball(0.02, 8, 6)];
    for (let i = 0; i < 12; i++) { const q = i * Math.PI / 6; esc.push(at(aim(cone(0.017, 0.05, 4), [Math.cos(q + 0.6), Math.sin(q + 0.6), 0]), [Math.cos(q) * 0.066, Math.sin(q) * 0.066, 0])); }
    for (const d of [0, 60, 120]) esc.push(rbox(0.125, 0.014, 0.012).rotateZ(d * D2R));
    S.add('body', join(esc), GOLDM, { p: [0.0, 0.9, 0.232], m: 1, name: 'escL' });
    S.add('body', ball(0.026, 10, 8), JEWEL, { p: [0.0, 0.9, 0.246], m: 1 });
    const anc = join([ball(0.022, 8, 6), at(rbox(0.016, 0.1, 0.014).rotateZ(52 * D2R), [-0.04, -0.03, 0]), at(rbox(0.016, 0.1, 0.014).rotateZ(-52 * D2R), [0.04, -0.03, 0]), at(rbox(0.03, 0.02, 0.018), [-0.085, -0.062, 0]), at(rbox(0.03, 0.02, 0.018), [0.085, -0.062, 0])]);
    S.add('body', anc, STEEL, { p: [0.0, 1.035, 0.236], m: 1, name: 'ancL' });
    // rivets on the bronze bands. A winding key between the wing roots.
    const rivets = (x, y, r) => [-96, -62, -28, 28, 62, 96].map(d => at(ball(0.017, 6, 5), [x, y + Math.cos(d * D2R) * (r + 0.03), Math.sin(d * D2R) * (r + 0.03)]));
    S.add('abd1', join(rivets(-0.395, 0.848, 0.19)), BRASSM, {});
    S.add('abd2', join(rivets(-0.585, 0.825, 0.19)), BRASSM, {});
    S.add('abd3', join(rivets(-0.775, 0.792, 0.16).concat(rivets(-0.94, 0.758, 0.12))), BRASSM, {});
    const key = join([tube([[0, 0, 0], [0, 0.05, 0], [0, 0.1, 0]], [0.016, 0.014, 0.014], { ring: 6 }), at(torus(0.042, 0.013, 14, 5), [0, 0.135, 0.046]), at(torus(0.042, 0.013, 14, 5), [0, 0.135, -0.046]), at(ball(0.022, 8, 6), [0, 0.1, 0])]);
    S.add('body', key, GOLDM, { p: [-0.13, 1.045, 0], r: [0, 0, 14], name: 'key' });
    // maker's mark: the numeral XII on the plate between the eyes
    if (!texM) texM = canvasTex(128, 80, (g, W, H) => {
      g.fillStyle = '#d8cca0'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#3a2a12'; g.lineWidth = 7; g.strokeRect(5, 5, W - 10, H - 10);
      g.fillStyle = '#1a120c'; g.font = 'bold 52px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('XII', W / 2, H / 2 + 4);
    });
    S.add('head', rbox(0.012, 0.074, 0.112), { col: '#ffffff', map: texM, emap: texM, glowK: 0.22, rough: 0.35, noOut: true }, { p: [0.692, 1.699, 0], r: [0, 0, 14] });

    // --- head parts: antennas, mandibles, coronet. Clock hands on the dial. -----------------
    const ant = join([tube([[0, 0, 0], [-0.04, 0.18, 0.04], [-0.16, 0.36, 0.1], [-0.34, 0.46, 0.17]], [0.014, 0.012, 0.01, 0.008], { ring: 5 }), at(ball(0.024, 8, 6), [-0.34, 0.46, 0.17])]);
    S.add('head', ant, BRONZM, { p: [0.51, 1.75, 0.07], m: 1, name: 'antL' });
    S.add('head', aim(cone(0.022, 0.1, 6), [0.3, -1, -0.25]), BRONZM, { p: [0.7, 1.45, 0.035], m: 1 });
    const crown = [[0, 0, 0, 0.13], [-0.03, -0.01, 0.07, 0.09], [-0.03, -0.01, -0.07, 0.09]].map(([x, y, z, hh]) => at(aim(cone(0.026, hh, 6), [-0.25, 1, z * 3]), [x, y, z]));
    S.add('head', join(crown), GOLDM, { p: [0.5, 1.765, 0] });
    const hand = (len) => at(rbox(0.014, len, 0.02), [0, len / 2 - 0.01, 0]);
    S.add('pro', hand(0.1), HAND, { p: [0.42, 1.167, 0], r: [0, 0, -27], order: 'ZYX', name: 'h0' });
    S.add('pro', hand(0.065), HAND, { p: [0.424, 1.165, 0], r: [0, 0, -27], order: 'ZYX', name: 'h1' });
    // high collar behind the head: 5 gold fins. A monocle with a chain on the left eye.
    const fins = [];
    for (const deg of [-75, -38, 0, 38, 75]) {
      const q = deg * D2R, rad = [-0.891 * Math.cos(q), 0.454 * Math.cos(q), Math.sin(q)];
      const d = new THREE.Vector3(0.454 + rad[0] * 0.75, 0.891 + rad[1] * 0.75, rad[2] * 0.75).normalize(), zv = new THREE.Vector3(rad[0], rad[1], rad[2]);
      zv.addScaledVector(d, -zv.dot(d)).normalize();
      const fin = blade([[-0.05, 0], [0.05, 0], [0.032, 0.16], [0, 0.26 - Math.abs(deg) * 0.0009], [-0.032, 0.16]], 0.016, { bevel: 0.005 });
      fin.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(d, zv), d, zv));
      fins.push(at(fin, [rad[0] * 0.1, rad[1] * 0.1, rad[2] * 0.13]));
    }
    S.add('pro', join(fins), GOLDM, { p: [0.42, 1.45, 0] });
    const mono = torus(0.078, 0.011, 22, 6);
    mono.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.6, 0.2, 0.78).normalize()));
    S.add('head', join([mono, tube([[0.01, -0.078, -0.01], [-0.05, -0.2, 0.0], [-0.15, -0.27, -0.04], [-0.22, -0.23, -0.08]], [0.007, 0.007, 0.007, 0.007], { ring: 5 })]), BRASSM, { p: [0.665, 1.722, 0.25] });
    // cerci at the end of the abdomen
    S.add('abd3', tube([[0, 0, 0], [-0.1, 0.02, 0.04], [-0.2, 0.08, 0.1]], [0.018, 0.012, 0.005], { ring: 5 }), BRONZM, { p: [-1.2, 0.72, 0.02], m: 1 });
    S.eye('head', [0.6, 1.7, 0.165], 0.1, { dir: [0.6, 0.2, 0.78], sclera: '#0b1430', iris: '#2f62e0', iris2: '#cfe6ff', pupil: 'round', size: 54, lid: BRONZE, open: 46, tilt: -15, glow: 0.8, m: 1 });
  },
  anim(b, t, c) {
    const P = c.parts, st = c.st || (c.st = { tm: t.tm, tk: t.tm * 2, fl: 0 });
    let dt = t.tm - st.tm; if (!(dt > 0 && dt < 0.1)) dt = 0; st.tm = t.tm;
    const u = ez(t.u || 0), a = t.a * (1 - u), s = t.s, h = t.h, k = t.k, melee = k === 'melee', slam = k === 'slam', buff = k === 'buff';
    const mv = t.mv, sp = Math.hypot(t.vf, t.vs), om = t.yr ? -t.yr : t.tn * 5, hx = (t.hx || 0) * h, hz = (t.hz || 0) * h, br = Math.sin(t.p);
    // the clockwork runs on its own count. It stops in the ultimate: time holds its breath.
    st.tk += dt * (2 + t.gl * 1.5 + a * 5) * (1 - u);
    const fr = st.tk % 1, tick = Math.floor(st.tk) + ez(fr * 3.5), beat = Math.max(0, 1 - fr * 5) * (1 - u);
    const toll = Math.pow(Math.max(0, Math.sin(t.tm * 5.2)), 10) * u;      // the twelve strokes of the ultimate: a short shiver on each stroke
    // strike wave: the power goes from the chest to the shoulder, the elbow and the wrist. Each joint comes later and swings past.
    // Tick: the minute hand (left). Tock: the hour hand (right) follows.
    const s1 = spr(st, 's1', s, 1100, 42, dt), s2 = spr(st, 's2', s1, 800, 30, dt), s3 = spr(st, 's3', s2, 650, 22, dt);
    const sd = melee ? Math.min(1, spr(st, 'sd', s, 260, 26, dt) * 1.5) : s1;
    const r1 = melee ? spr(st, 'r1', sd, 1100, 42, dt) : s1, r2 = melee ? spr(st, 'r2', r1, 800, 30, dt) : s2, r3 = melee ? spr(st, 'r3', r2, 650, 22, dt) : s3;
    // wings flick open on a start, a turn and a hit
    st.fl = Math.max(st.fl * Math.exp(-dt * 5), Math.min(1, Math.abs(t.af) / 24 + Math.abs(t.tn) * 0.7 + h));
    const flick = spr(st, 'fk', st.fl, 320, 15, dt);

    // rest: it sways from side to side like a leaf, but on the beat (2 ticks for each side). A slow shift of the weight goes with it.
    const calm = (1 - Math.min(1, mv * 2.5)) * (1 - a) * (1 - u) * (1 - Math.min(1, s * 2));
    const sw0 = Math.sin(Math.PI * st.tk / 2), sway = Math.sign(sw0) * Math.pow(Math.abs(sw0), 0.6) * calm;
    const drift = Math.sin(t.tm * 0.7) * Math.sin(t.tm * 0.23 + 1) * calm;

    // gait: each foot stands on the ground while the body goes over it, then it lifts and reaches. The stride follows the speed,
    // the direction (forward, backward, to the side) and the turn. T = time of one stance.
    let vx = t.vf, vz = t.vs, spE = sp;
    if (mv > 0.05 && sp < 0.2 && Math.abs(om) < 0.4) { vx = 2.6 * mv; vz = 0; spE = vx; }
    const g = Math.min(1, mv * 2.2), T = DUTY * TAU / FREQ / Math.max(0.6, 3.9 * spE + 2.2 * Math.abs(om) * (1 - Math.min(1, spE / 0.5))), gp = t.w * FREQ / TAU;
    for (const L of LEGS) stepOf(gp + L.ph, DUTY, L.o);
    const lML = LEGS[0].o[1] * g, lMR = LEGS[1].o[1] * g, lHL = LEGS[2].o[1] * g, lHR = LEGS[3].o[1] * g;

    // body (thorax): low crouch before the slash, tall before the pendulum kick, tallest for the twelfth stroke.
    // It dips to the side of the feet that are in the air and turns against the hips.
    const land = Math.max(0, Math.min(1, -(t.va || 0) / 8));
    const drop = a * (slam ? -0.07 : melee ? 0.075 : 0.045) + (slam ? s1 * 0.03 : melee ? s * 0.03 : 0) + h * 0.03 - u * 0.12 + (lML + lMR + lHL + lHR) * 0.009 + Math.abs(sway) * 0.012 + land * 0.08;
    b.body.position.y -= drop;
    b.body.position.x += (melee ? s * 0.17 - a * 0.11 : slam ? s * 0.18 - a * 0.1 : buff ? -a * 0.03 : s * 0.08 - a * 0.06) + hx * 0.07 - u * 0.05;
    b.body.position.z += sway * 0.062 + drift * 0.03 + hz * 0.07;
    b.body.rotation.x = sway * 0.09 + drift * 0.03 + (lMR + lHR - lML - lHL) * 0.035 + hz * 0.12;
    b.body.rotation.y = (lML + lHR - lMR - lHL) * 0.045 - sway * 0.035 - t.tn * 0.06;
    b.body.rotation.z = (slam ? a * 0.03 + s * 0.06 : melee ? a * 0.06 - s * 0.08 : 0) - hx * 0.09 + u * 0.07 + (lHL + lHR - lML - lMR) * 0.02;
    // 4 legs: the solver puts each foot on its place on the ground. The knees bend when the body goes down and when a foot lifts.
    _qi.copy(b.body.quaternion).invert();
    for (const L of LEGS) {
      const G = L.G, fx = G.f.x, fz = G.f.z;
      let dx = T * (vx - om * fz), dz = T * (vz + om * fx);
      const dl = Math.hypot(dx, dz);
      if (dl > SMAX) { dx *= SMAX / dl; dz *= SMAX / dl; }
      // a hit: the feet on the far side step out to brace
      const brace = Math.max(0, hx * Math.sign(fx) + hz * Math.sign(fz)) * 0.09;
      _c.set(fx + dx * L.o[0] * g + hx * brace * 2, G.f.y + L.o[1] * g * LIFT * (0.45 + 0.55 * Math.min(1, dl / 0.3)) - Math.max(0, Math.min(1, (t.va || 0) / 8)) * 0.1, fz + dz * L.o[0] * g + hz * brace * 2 + L.sg * (a * (melee ? 0.05 : 0) + u * 0.04))
        .sub(b.body.position).applyQuaternion(_qi).add(B0);
      solveLeg(b[L.hip], b[L.shin], G, _c.x, _c.y, _c.z);
    }

    // prothorax (chest), neck and head. The chest leans back on a start and whips away from a hit. The head stays level.
    // The head looks round in short, exact moves on the beat, and it tilts.
    const lean = cl1(t.af / 40) * 0.1 - hx * 0.32;
    b.pro.rotation.z = br * 0.022 + lean + u * 0.3 + (melee ? a * 0.28 - s1 * 0.48 : slam ? -a * 0.2 + s1 * 0.3 : buff ? a * 0.12 + s1 * 0.05 : a * 0.16 - s1 * 0.27);
    b.pro.rotation.x = -sway * 0.05 + hz * 0.3 + (lML + lHL - lMR - lHR) * 0.03;
    b.pro.rotation.y = -t.tn * 0.22 - b.body.rotation.y * 0.6;
    b.pro.scale.z = 1 + br * 0.03 * (1 - u);                                   // breath in the chest
    const lq = st.tk / 3, l0 = Math.floor(lq), lf = ez(Math.min(1, (lq - l0) * 7)), quiet = calm * (1 - t.gl * 0.5);
    const lookY = (rnd(l0 - 1) + (rnd(l0) - rnd(l0 - 1)) * lf - 0.5) * quiet, lookX = (rnd(l0 + 40) + (rnd(l0 + 41) - rnd(l0 + 40)) * lf - 0.5) * quiet;
    b.neck.rotation.z = -lean * 0.5 - h * 0.1 + (melee ? -a * 0.12 + s2 * 0.15 : 0) - u * 0.2;
    b.neck.rotation.x = -b.body.rotation.x * 0.6 - hz * 0.2;
    b.head.rotation.z = -br * 0.03 - lean * 0.4 - h * 0.2 - beat * 0.035 - u * 0.22 + toll * 0.05 + (melee ? -a * 0.1 + s2 * 0.12 : slam ? a * 0.1 : 0);
    b.head.rotation.y = t.lk * 0.25 * (1 - u) + lookY * 0.75 - (t.hd || 0) * 0.3 - b.body.rotation.y * 0.4;
    b.head.rotation.x = lookX * 0.5 + (t.hd || 0) * 0.28 - b.body.rotation.x * 0.4 + sway * 0.05 + hz * 0.15;

    // fore-arms: folded at rest. aZ = lift of the upper arm, dF and dH = turn of the forearm and of the hand (rad, + = up), aY = swing to the centre.
    const idle = Math.sin(t.p * 0.8) * 0.035 * (1 - u), stepArm = (lML + lMR - lHL - lHR) * 0.03;
    for (let i = 0; i < 2; i++) {
      const sg = i ? -1 : 1, w = i && melee ? Math.max(a, Math.min(1, (s - r1) * 1.6) * (1 - u)) : a, q1 = i ? r1 : s1, q2 = i ? r2 : s2, q3 = i ? r3 : s3;
      let aZ, dF, dH, aY;
      if (melee) { aZ = w * 0.8 - q1 * 0.7; dF = w * 3.0 + q2 * 1.35; dH = w * 3.0 - q3 * 0.5; aY = q1 * 0.32 - w * 0.22; }
      else if (slam) { aZ = w * 0.45 + q1 * 0.9; dF = w * 2.2 + q2 * 2.1; dH = w * 1.9 + q3 * 1.2; aY = -w * 0.2 - q1 * 0.55; }
      else if (buff) { const gd = Math.min(1, w + q1); aZ = gd * 0.28; dF = gd * 0.95; dH = gd * -0.2; aY = gd * 0.5; }
      else { aZ = w * 0.55 - q1 * 0.45; dF = w * 2.2 + q2 * 1.5; dH = w * 1.9 + q3 * 0.5; aY = q1 * 0.2 - w * 0.25; }
      aZ += sg * idle + stepArm - h * 0.25 + u * (UA + toll * 0.03) + cl1(t.af / 40) * 0.12;
      dF += sg * idle * 2 - h * 0.25 + u * UF - beat * 0.04 * sg; dH += h * 0.3 + u * UH + beat * 0.06 * sg - cl1(t.af / 40) * 0.25 - sway * 0.1;
      const arm = b[i ? 'armR' : 'armL'], fore = b[i ? 'foreR' : 'foreL'], hand = b[i ? 'scyR' : 'scyL'];
      arm.rotation.z = aZ; arm.rotation.y = sg * (aY + u * UY); arm.rotation.x = -sg * u * UX + hz * 0.2;
      fore.rotation.z = dF - aZ; hand.rotation.z = dH - dF;
    }

    // glass wings: slow fan, wide spread for the guard, full spread for the twelfth stroke. They flick open on a start, a turn and a hit.
    const gait = (lML + lMR + lHL + lHR) * 0.5;
    const fan = Math.sin(t.p * 0.9) * 0.05 * (1 - u) + t.gl * 0.1 * Math.sin(t.tm * 9) + h * 0.2 * Math.sin(t.tm * 30) + toll * 0.05 * Math.sin(t.tm * 60);
    const spread = (buff ? a * 0.6 + s1 * 0.55 : a * 0.16 + s1 * 0.3) + flick * 0.42 + gait * 0.05 + t.gl * 0.12 + beat * 0.02;
    b.wingL.rotation.y = fan + spread * 0.9 + u * UW[0] + t.tn * 0.1; b.wingR.rotation.y = -(fan + spread * 0.9 + u * UW[0] - t.tn * 0.1);
    b.wingL.rotation.x = spread * 0.55 - u * UW[1]; b.wingR.rotation.x = -b.wingL.rotation.x;
    b.wingL.rotation.z = b.wingR.rotation.z = -a * 0.22 - (buff ? s1 * 0.25 : 0) + u * 0.2 + flick * 0.1;
    b.wing2L.rotation.y = fan * 1.4 + spread * 1.25 + u * UW[2] + t.tn * 0.14; b.wing2R.rotation.y = -(fan * 1.4 + spread * 1.25 + u * UW[2] - t.tn * 0.14);
    b.wing2L.rotation.x = spread * 0.4 - u * UW[3]; b.wing2R.rotation.x = -b.wing2L.rotation.x;
    b.wing2L.rotation.z = b.wing2R.rotation.z = -a * 0.3 - (buff ? s1 * 0.3 : 0) - u * 0.1 + flick * 0.06;
    // abdomen: it breathes, it counters the steps, it curls up when it threatens. The spring bones add the swing in a turn.
    const curl = -br * 0.03 * (1 - u) - a * 0.13 + s2 * 0.1 - h * 0.12 - u * 0.05 + hx * 0.1;
    ['abd1', 'abd2', 'abd3'].forEach((n, i) => {
      b[n].rotation.z = curl * (i ? 1 : 0.6);
      b[n].rotation.y = Math.sin(t.p * 0.9 - i * 0.7) * 0.04 * (1 - u) - b.body.rotation.y * 0.7 + t.tn * 0.07 + sway * 0.03 * (i + 1);
      b[n].rotation.x = -b.body.rotation.x * 0.3;
      b[n].scale.y = b[n].scale.z = 1 + Math.sin(t.p - i * 0.6) * 0.028 * (1 - u);
    });
    // pendulum: its own steady swing, and the swing from the motion of the body (a spring bone). It hangs plumb when the body sways.
    // The kick pulls it far back, then throws it forward. In the ultimate it stops dead in the centre: the only time that it stops.
    let sw = Math.sin(t.p * 1.6) * (0.3 + t.gl * 0.25) * (1 - a * 0.8);
    if (slam) { sw += -a * 1.2 + s1 * 2.3; b.pend.scale.setScalar(1 + s1 * 0.5 + a * 0.1); } else sw += a * 0.25 * Math.sin(t.tm * 15) - s1 * 0.5;
    b.pend.rotation.z = sw * (1 - u) - b.body.rotation.z; b.pend.rotation.x = -b.body.rotation.x;
    if (u > 0 && c.dyn) for (const q of c.dyn) if (q.o === b.pend) { const kq = 1 - u; q.x *= kq; q.y *= kq; q.z *= kq; q.vx *= kq; q.vy *= kq; q.vz *= kq; }
    P.bobGem.scale.multiplyScalar(1 + 0.08 * Math.sin(t.tm * 6) * (1 - u) + a * 0.35 + t.gl * 0.3 + (slam ? s1 * 0.6 : 0) + u * 0.45 + toll * 0.35);
    // escapement wheel and anchor, winding key, clock hands on the dial (both at 12 in the ultimate), antennas (spring parts: here only the twitch)
    P.escL.rotation.z = P.escR.rotation.z = -tick * Math.PI / 6;
    P.ancL.rotation.z = P.ancR.rotation.z = (fr < 0.5 ? 1 : -1) * 0.2 * (1 - u);
    P.key.rotateY(tick * 0.26);
    P.h0.rotation.x = (t.tm * 2.4 + a * 9 + s * 5) * (1 - u); P.h1.rotation.x = (-t.tm * 0.5 - a * 2) * (1 - u);
    const an = Math.sin(t.p * 1.3) * 0.1 * (1 - u) + a * 0.25 - h * 0.3 + beat * 0.07 - u * 0.35;
    P.antL.rotation.z += an + lookY * 0.2; P.antR.rotation.z += an - lookY * 0.2 + (Math.sin(t.p * 1.3 + 1) - Math.sin(t.p * 1.3)) * 0.1 * (1 - u);
    P.antL.rotation.x += Math.sin(t.p * 0.7) * 0.08 * (1 - u); P.antR.rotation.x += -Math.sin(t.p * 0.7) * 0.08 * (1 - u);
  }
};
