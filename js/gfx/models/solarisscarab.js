/* Solarisscarab (Noonshell) - the sundial of the masons' courtyard: a scarab of sandstone covered with gold leaf.
   A quartz dome on its back holds sand that fell upward (heart piece). A sundial blade stands on the dome.
   Hour lines are cut into the two wing cases. Blue lapis inlay on the head.
   Maker's mark: a sun disc with one ray, on the head shield. Stone / Mind. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, blade, lathe, ball, cone, rbox, canvasTex } from '../geo.js';
import { noise, rgb } from '../sculpt.js';

const STONE = '#c4a574', DSTONE = '#6c5436', PALE = '#dcb856', LAPIS = '#1b3d9c', AMBER = '#ffae2a';
const LEAF = rgb('#d6a632');                                                    // gold leaf (linear colour) for the paint function
const GOLDM = { col: '#d2a840', metal: 1, rough: 0.28, env: 1.2 };
const SHINE = { col: '#ecd68c', metal: 1, rough: 0.16, env: 1.4, flat: true };
const STONEM = { col: '#bfa070', rough: 0.9, env: 0.25 };
const MARKM = { col: '#f2d274', metal: 0.5, rough: 0.45, glow: '#ffc850', glowK: 0.45 };      // maker's mark: it must read as gold from each side
const MAND = { col: '#3a2c20', metal: 0.5, rough: 0.4, env: 0.9 };
const GLASS = { col: '#bcd8e6', op: 0.12, rough: 0.06, env: 0.8, side: 1, noOut: true };
const SANDM = { col: '#fff0b4', glow: '#ffb020', glowK: 3.4, noOut: true };       // sand that floats: the brightest glow
const PILEM = { col: '#d9a440', glow: '#ff9a18', glowK: 0.5, rough: 0.9, noOut: true };
const GEM = { col: '#ffd890', glow: '#ff9a20', glowK: 1.5, noOut: true };
const HALO = { col: '#ff9420', add: true, op: 0.02, noOut: true };
let tickT = null, RINGM = null, caseT = null, CASEM = null;

const D2R = Math.PI / 180, TAU = Math.PI * 2;
const DC = [-0.14, 0.93, 0], RD = 0.4, DH = 0.42;      // dome: centre of the base (= pivot of the gimbal), radius, height
const RC = [-0.14, 1.0, 0];                            // centre of the hour ring
const EC = [-0.14, 0.66, 0], EX = 0.66, EY = 0.32, EZ = 0.54, RIN = 0.43;     // wing cases: an ellipsoid shell with a round notch for the dome
const YAX = new THREE.Vector3(0, 1, 0);
const HIPF = [0.36, 0.4, 0.36], HIPM = [0.04, 0.38, 0.42], HIPB = [-0.38, 0.4, 0.38];
// leg points relative to the hip. Point 2 is the knee, point 4 is the foot.
const PF = [[0, 0, 0], [0.1, 0.12, 0.14], [0.2, 0.2, 0.27], [0.31, -0.1, 0.37], [0.37, -0.36, 0.41]];
const PM = [[0, 0, 0], [0, 0.12, 0.13], [0.01, 0.2, 0.25], [0.03, -0.1, 0.33], [0.04, -0.34, 0.36]];
const PB = [[0, 0, 0], [-0.09, 0.12, 0.13], [-0.2, 0.2, 0.24], [-0.34, -0.1, 0.32], [-0.42, -0.36, 0.36]];
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
const cl1 = x => x < -1 ? -1 : x > 1 ? 1 : x;
const DUTY = 0.66, FREQ = 2, LIFT = 0.14, SMAX = 0.56, B0 = new THREE.Vector3(0, 0.62, 0);
// 6 legs in 2 tripods: (front L, middle R, back L) and (front R, middle L, back R). In each tripod the front leg goes first.
// Left and right are not exact mirrors.
const LEGS = [['legFL', 'shFL', HIPF, PF, 1, 0], ['legFR', 'shFR', HIPF, PF, -1, 0.51], ['legML', 'shML', HIPM, PM, 1, 0.545], ['legMR', 'shMR', HIPM, PM, -1, 0.035], ['legBL', 'shBL', HIPB, PB, 1, 0.075], ['legBR', 'shBR', HIPB, PB, -1, 0.58]]
  .map(([hip, shin, H, pts, sg, ph]) => ({ hip, shin, sg, ph, G: mkLeg(H, add3(H, pts[2]), add3(H, pts[4]), sg), o: [0, 0] }));

const join = list => mergeGeometries(list.map(g => { const q = g.index ? g.toNonIndexed() : g.clone(); q.deleteAttribute('uv'); if (!q.getAttribute('normal')) q.computeVertexNormals(); return q; }));
const at = (g, p) => g.clone().translate(p[0], p[1], p[2]);
const ez = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
function aim(geo, d) {
  const g = geo.clone();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]).normalize()));
  return g;
}
const domeR = th => RD * Math.pow(Math.max(0, Math.cos(th)), 0.85);
// flat ring with bevelled edges. The axis is Y. The texture goes around the ring (u) and around the section (v).
function band(R, w, t) {
  const c = 0.008;
  return lathe([[R - w + c, -t], [R + w - c, -t], [R + w, -t + c], [R + w, t - c], [R + w - c, t], [R - w + c, t], [R - w, t - c], [R - w, -t + c], [R - w + c, -t]], 72);
}
// 12 hour bars across the ring. The bar of noon is a gem (see build).
function bars(R, w, t) {
  const list = [];
  for (let i = 1; i < 12; i++) {
    const a = i / 12 * TAU, g = rbox(w * 2 + 0.012, t * 2 + (i % 3 ? 0.016 : 0.03), i % 3 ? 0.022 : 0.034);
    g.rotateY(-a); g.translate(Math.cos(a) * R, 0, Math.sin(a) * R); list.push(g);
  }
  return list;
}
// point on a wing case. fu: 0 = front edge, 1 = rear midline. fv: 0 = rim at the dome, 1 = lower edge. layer 1 = inside face.
const P0 = 48 * D2R, P1 = 178.4 * D2R, PS1 = -0.34, TH = 0.034;
function casePt(fu, fv, layer) {
  const ph = P0 + (P1 - P0) * fu, c = Math.cos(ph), s = Math.sin(ph), ro = 1 / Math.sqrt((c / EX) * (c / EX) + (s / EZ) * (s / EZ));
  const ps0 = Math.acos(Math.min(1, RIN / ro)), ps = ps0 + (PS1 - ps0) * fv, k = 1 - layer * TH / ro;
  return [EC[0] + ro * k * Math.cos(ps) * c, EC[1] + (EY - layer * TH) * Math.sin(ps), ro * k * Math.cos(ps) * s];
}
// left wing case: a closed shell with texture coordinates (u = round the dome, v = from the dome to the lower edge)
function caseGeo() {
  const NU = 34, NV = 10, pos = [], uv = [], idx = [], n1 = NV + 1, nL = (NU + 1) * n1;
  for (let L = 0; L < 2; L++) for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) { const q = casePt(i / NU, j / NV, L); pos.push(q[0], q[1], q[2]); uv.push(i / NU, j / NV); }
  const id = (L, i, j) => L * nL + i * n1 + j, V = n => new THREE.Vector3(pos[n * 3], pos[n * 3 + 1], pos[n * 3 + 2]), ctr = new THREE.Vector3(EC[0], EC[1], 0);
  const quad = (a, b, c, d, want) => { const n = V(b).sub(V(a)).cross(V(d).sub(V(a))); if (n.dot(want) < 0) idx.push(a, d, c, a, c, b); else idx.push(a, b, c, a, c, d); };
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    quad(id(0, i, j), id(0, i + 1, j), id(0, i + 1, j + 1), id(0, i, j + 1), V(id(0, i, j)).sub(ctr));
    quad(id(1, i, j), id(1, i + 1, j), id(1, i + 1, j + 1), id(1, i, j + 1), ctr.clone().sub(V(id(1, i, j))));
  }
  for (let i = 0; i < NU; i++) for (const j of [0, NV]) quad(id(0, i, j), id(0, i + 1, j), id(1, i + 1, j), id(1, i, j), V(id(0, i, j)).sub(V(id(0, i, j ? NV - 1 : 1))));
  for (let j = 0; j < NV; j++) for (const i of [0, NU]) quad(id(0, i, j), id(0, i, j + 1), id(1, i, j + 1), id(1, i, j), V(id(0, i, j)).sub(V(id(0, i ? NU - 1 : 1, j))));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// wing case surface: gold leaf in square sheets, worn places where the sandstone shows, 6 hour lines cut into the stone.
// The hour of each line is a row of drilled dots at its lower end.
function caseTex() {
  return canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = '#cda23a'; g.fillRect(0, 0, W, H);
    const tone = ['rgba(255,238,160,0.2)', 'rgba(110,72,16,0.13)', 'rgba(255,222,120,0.1)', 'rgba(84,54,10,0.09)', 'rgba(255,255,224,0.15)'];
    for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) { g.fillStyle = tone[(i * 7 + j * 13 + ((i * j) % 3)) % 5]; g.fillRect(i * 32 + 1, j * 32 + 1, 30, 30); }
    g.fillStyle = '#b6965f';
    for (let i = 0; i < 30; i++) { const x = (i * 97 + 31) % W, y = (i * 61 + 17) % H, r = 4 + (i * 37) % 11; g.beginPath(); g.ellipse(x, y, r * 1.7, r * 0.8, i * 0.7, 0, 7); g.fill(); }
    g.fillRect(0, H - 14, W, 14); g.fillRect(0, 0, W, 9); g.fillRect(0, 0, 7, H);
    g.lineCap = 'round';
    for (let i = 1; i <= 6; i++) {
      const x = W * (i - 0.5) / 6.4 + 10;
      g.strokeStyle = '#3e2a10'; g.lineWidth = 7; g.beginPath(); g.moveTo(x, H * 0.12); g.lineTo(x, H * 0.76); g.stroke();
      g.strokeStyle = 'rgba(255,244,190,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 5.5, H * 0.13); g.lineTo(x + 5.5, H * 0.75); g.stroke();
      g.fillStyle = '#3e2a10';
      for (let q = 0; q < i; q++) { g.beginPath(); g.arc(x - (i - 1) * 5.5 + q * 11, H * 0.86, 3.6, 0, 7); g.fill(); }
    }
    g.strokeStyle = '#3e2a10'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, H * 0.07); g.lineTo(W, H * 0.07); g.stroke();
    g.beginPath(); g.moveTo(0, H * 0.935); g.lineTo(W, H * 0.935); g.stroke();
  });
}
// leg in 2 parts: hip to knee, knee to foot. Sandstone tubes, gold-leaf knee, ankle, thorns and claws. Points are relative to the hip.
function leg(p, fx) {
  const mid = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  return {
    us: tube([p[0], p[1], p[2]], [0.052, 0.06, 0.046], { ring: 8 }),
    ug: at(ball(0.066, 12, 8), p[2]),
    ls: tube([p[2], p[3], p[4]], [0.044, 0.038, 0.026], { ring: 7 }),
    lg: join([at(ball(0.042, 10, 8), p[3]), at(ball(0.033, 8, 6), p[4]),
      at(aim(cone(0.022, 0.11, 6), [fx, -0.35, 0.3]), p[4]), at(aim(cone(0.018, 0.085, 6), [-fx * 0.3, -0.3, 0.7]), p[4]),
      at(aim(cone(0.022, 0.085, 6), [0, 0.35, 1]), mid(p[2], p[3], 0.45)), at(aim(cone(0.02, 0.07, 6), [0, 0.25, 1]), mid(p[3], p[4], 0.35))])
  };
}

export default {
  id: 'solarisscarab', rim: '#ffd890', focus: 'sand', top: 1.74, rough: 0.62,
  opts: { cell: 0.024, mottle: 0.1, mottleF: 13 },
  // the floating grains and the spout lag behind the motion of the body (no drag: they are in the dome). The antennas whip.
  dyn: [
    { b: ['swirl'], k: 26, d: 3, amt: 0.6, drag: 0, dir: [0, 1, 0] }, { b: ['spout'], k: 40, d: 4, amt: 0.8, drag: 0, dir: [0, 1, 0] },
    { b: ['antL'], k: 85, d: 6.5, amt: 0.9, drag: 2.5, dir: [0.4, 0.55, 0.7] }, { b: ['antR'], k: 85, d: 6.5, amt: 0.9, drag: 2.5, dir: [0.4, 0.55, -0.7] }
  ],
  rig: { head: 'head', neck: [] },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.62, 0]).bone('head', 'body', [0.62, 0.52, 0])
      .bone('gim', 'body', DC).bone('ring1', 'gim', RC)
      .bone('sand', 'gim', [-0.14, 1.12, 0]).bone('swirl', 'sand', [-0.14, 1.14, 0])
      .bone('caseL', 'body', [0.15, 0.76, 0.3], { m: 1 })
      .bone('legFL', 'body', HIPF, { m: 1 }).bone('legML', 'body', HIPM, { m: 1 }).bone('legBL', 'body', HIPB, { m: 1 })
      .bone('shFL', 'legFL', add3(HIPF, PF[2]), { m: 1 }).bone('shML', 'legML', add3(HIPM, PM[2]), { m: 1 }).bone('shBL', 'legBL', add3(HIPB, PB[2]), { m: 1 });

    const St = { col: STONE, k: 0.03 }, Sd = { col: DSTONE, k: 0.018 }, Gd = { col: PALE, metal: 1, gloss: 0.6, k: 0.012 }, O = (a, b) => Object.assign({}, a, b);
    S.color(STONE);
    // dark underside, abdomen (the wing cases lie on it), socket ring for the dome with a round hole
    S.ell('body', [-0.06, 0.44, 0], [0.64, 0.2, 0.44], Sd);
    S.ell('body', [-0.14, 0.64, 0], [0.61, 0.272, 0.492], St);
    S.ell('body', [-0.14, 0.88, 0], [0.47, 0.11, 0.47], O(St, { k: 0.016 }));
    S.tor('body', [-0.14, 0.945, 0], 0.428, 0.036, Gd);
    S.ell('body', DC, 0.392, { sub: 1, col: '#2a1e12', k: 0.008 });
    // pronotum with shoulder bosses and a raised rear edge, breast plate, tail plate, hips
    S.ell('body', [0.4, 0.56, 0], [0.32, 0.28, 0.46], St);
    S.ell('body', [0.5, 0.6, 0.4], [0.13, 0.11, 0.09], O(St, { m: 1 }));
    S.cap('body', [0.2, 0.73, 0.3], [0.31, 0.6, 0.44], 0.04, 0.04, O(St, { m: 1, k: 0.02 }));
    S.ell('body', [0.42, 0.4, 0], [0.3, 0.14, 0.38], Sd);
    S.ell('body', [-0.74, 0.52, 0], [0.1, 0.1, 0.18], Sd);
    for (const hp of [HIPF, HIPM, HIPB]) S.ell('body', hp, 0.08, O(St, { m: 1, k: 0.014 }));
    S.ell('body', [0.655, 0.725, 0], [0.05, 0.05, 0.07], { col: LAPIS, gloss: 0.9, k: 0.01 });       // lapis cabochon on the neck
    // head: skull, dark face, wide head shield with 6 teeth, brows, forked horn with a gold band
    S.ell('head', [0.78, 0.5, 0], [0.2, 0.17, 0.24], St);
    S.ell('head', [0.8, 0.41, 0], [0.17, 0.1, 0.2], Sd);
    S.ell('head', [0.965, 0.445, 0], [0.15, 0.042, 0.245], O(St, { k: 0.016 }));
    for (const [x, z] of [[1.09, 0.06], [1.055, 0.155], [0.985, 0.232]]) S.ell('head', [x, 0.44, z], [0.046, 0.03, 0.046], O(St, { m: 1, k: 0.014 }));
    S.cap('head', [0.82, 0.66, 0.08], [0.88, 0.63, 0.17], 0.036, 0.034, O(Sd, { m: 1 }));
    S.cap('head', [0.8, 0.6, 0], [0.9, 0.84, 0], 0.085, 0.06, St);
    S.cap('head', [0.9, 0.84, 0], [1.0, 0.98, 0.12], 0.056, 0.032, O(St, { m: 1 }));
    S.tor('head', [0.86, 0.745, 0], 0.07, 0.028, O(Gd, { rot: [0, 0, -22.6] }));

    // --- paint: lapis inlay on the head, glowing seams on the abdomen (they show when the wing cases open) ----------
    const PL = { paint: 1, col: LAPIS, cb: 0.014, metal: 0, gloss: 0.9 }, PD = { paint: 1, col: '#4a3418', cb: 0.012, gloss: 0.6 };      // cut line: the gloss value keeps the gold leaf off it
    S.ell('head', [1.02, 0.485, 0], [0.11, 0.05, 0.17], PL);                       // field of the maker's mark
    S.ell('head', [0.93, 0.6, 0], [0.06, 0.07, 0.08], PL);
    S.cap('head', [0.7, 0.63, 0.1], [0.74, 0.5, 0.235], 0.03, 0.03, O(PL, { m: 1 }));
    S.cap('head', [0.82, 0.39, 0.215], [0.9, 0.42, 0.2], 0.022, 0.022, O(PL, { m: 1 }));
    S.tor('body', [0.655, 0.725, 0], 0.085, 0.02, O(PD, { rot: [0, 0, -50] }));
    for (const x of [-0.22, -0.38, -0.54]) S.box('body', [x, 0.76, 0], [0.013, 0.19, 0.6], 0.004, { paint: 1, col: AMBER, glow: 1.5, cb: 0.009 });
    S.box('body', [-0.7, 0.75, 0], [0.14, 0.26, 0.013], 0.005, { paint: 1, col: AMBER, glow: 1.3, cb: 0.01 });
    S.box('body', [0.5, 0.7, 0], [0.3, 0.2, 0.018], 0.004, PD);                       // cut lines on the pronotum: midline, 2 arcs
    S.tor('body', [0.14, 0.56, 0], 0.36, 0.018, O(PD, { rot: [0, 0, -24] }));
    S.tor('body', [0.02, 0.5, 0], 0.62, 0.018, O(PD, { rot: [0, 0, -24] }));
    // gold leaf: it covers the top, it is worn on the sides and it is not on the underside. The sandstone shows in the gaps.
    S.paint((p, n, c, info) => {
      if (info.glow > 0.15 || (info.gloss > 0.25 && info.metal < 0.3)) return;
      const f = noise(p.x * 6 + 3, p.y * 6, p.z * 6) * 0.55 + noise(p.x * 15, p.y * 15 + 7, p.z * 15) * 0.3 + noise(p.x * 34, p.y * 34, p.z * 34 + 5) * 0.15;
      const cover = 0.5 + 0.26 * n.y - Math.max(0, 0.5 - p.y) * 1.5 + (info.ao - 0.8) * 0.4;
      let k = (cover - f) / 0.05 + 0.5; k = k < 0 ? 0 : k > 1 ? 1 : k;
      if (k <= 0) return;
      const sh = 0.78 + 0.3 * Math.max(0, n.y);
      c[0] += (LEAF[0] * sh - c[0]) * k; c[1] += (LEAF[1] * sh - c[1]) * k; c[2] += (LEAF[2] * sh - c[2]) * k;
      info.metal += (0.9 - info.metal) * k; info.gloss += (0.42 - info.gloss) * k;
    });

    // --- wing cases: rigid shells with hour lines. They open in the ultimate. ------------------------------
    if (!caseT) { caseT = caseTex(); CASEM = { col: '#ffffff', map: caseT, metal: 0.74, rough: 0.36, env: 1.15 }; }
    S.add('caseL', caseGeo(), CASEM, { p: [0, 0, 0], m: 1, name: 'caseL' });
    const rv = [];
    for (let i = 0; i < 9; i++) { const q = casePt(0.06 + i * 0.11, 0.9, 0); rv.push(at(ball(0.021, 8, 6), q)); }
    S.add('caseL', join(rv), SHINE, { p: [0, 0, 0], m: 1 });

    // --- hour ring round the dome: engraved gold band, 11 hour bars, the sun gem at noon -------------------
    if (!tickT) {
      tickT = canvasTex(1024, 64, (g, W, H) => {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#b89a5a'; g.fillRect(0, H * 0.4, W, H * 0.07); g.fillRect(0, H * 0.9, W, H * 0.07);
        for (let i = 0; i < 72; i++) { const x = i / 72 * W, big = i % 6 === 3; g.fillStyle = big ? '#2a1c10' : '#5a4222'; g.fillRect(x - (big ? 4 : 1.5), 0, big ? 8 : 3, H); }
      });
      RINGM = { col: '#e6c260', metal: 1, rough: 0.22, env: 1.3, flat: true, map: tickT };
    }
    S.add('ring1', band(0.47, 0.036, 0.021), RINGM, { p: RC });
    S.add('ring1', join(bars(0.47, 0.036, 0.021)), STONEM, { p: RC });
    S.add('ring1', at(ball(0.042, 12, 10), [0.47, 0, 0]), GEM, { p: RC });

    // --- gimbal: quartz dome, gold bowl below it (it turns in the socket), frame (4 ribs and a cap), sundial blade -----
    const prof = [];
    for (let i = 0; i <= 16; i++) { const th = i / 16 * Math.PI / 2; prof.push([domeR(th), DH * Math.sin(th)]); }
    S.add('gim', lathe(prof, 40), GLASS, { p: DC, name: 'dome' });
    S.add('gim', lathe([[0.001, -0.376], [0.14, -0.349], [0.265, -0.266], [0.347, -0.144], [0.376, -0.02], [0.376, 0], [0.412, 0], [0.412, 0.02], [0.385, 0.024]], 36), GOLDM, { p: DC });
    const frame = [];
    for (let i = 0; i < 4; i++) {
      const an = (i + 0.5) * TAU / 4, pts = [];
      for (let j = 0; j <= 8; j++) { const th = j / 8 * Math.PI / 2 * 0.96, r = domeR(th) * 1.01; pts.push([Math.cos(an) * r, DH * Math.sin(th) * 1.01, Math.sin(an) * r]); }
      frame.push(tube(pts, [0.017, 0.014, 0.012], { ring: 5, seg: 16 }));
      frame.push(at(ball(0.026, 8, 6), [Math.cos(an) * 0.4, 0.02, Math.sin(an) * 0.4]));
    }
    frame.push(at(lathe([[0.125, -0.012], [0.13, 0.004], [0.1, 0.018], [0.055, 0.026], [0.04, 0.04], [0, 0.042]], 16), [0, DH, 0]));
    S.add('gim', join(frame), GOLDM, { p: DC });
    const gn = join([blade([[-0.18, 0], [0.17, 0], [0.135, 0.04], [-0.105, 0.33], [-0.16, 0.305]], 0.04, { bevel: 0.012 }), at(rbox(0.4, 0.032, 0.085), [0, -0.004, 0]), at(ball(0.028, 8, 6), [-0.125, 0.335, 0])]);
    S.add('gim', gn, SHINE, { p: [DC[0], DC[1] + DH + 0.04, 0], name: 'gnomon' });

    // --- sand: a small mound on the floor, the pile that fell upward and lies under the top of the dome,
    //     a thin spout between them, grains that float (2 groups turn in opposite directions) -------------------------
    S.add('gim', lathe([[0.001, 0.085], [0.07, 0.07], [0.17, 0.04], [0.28, 0.02], [0.36, 0.006], [0.36, 0], [0.001, 0]], 24), PILEM, { p: DC });
    const top = [[0.001, 0.268], [0.1, 0.276], [0.2, 0.298]];
    for (const d of [48, 58, 68, 78, 88]) { const th = d * D2R; top.push([Math.max(0.001, domeR(th) - 0.014), DH * Math.sin(th) - 0.008]); }
    S.add('sand', lathe(top, 28), PILEM, { p: DC, name: 'pile' });
    S.add('sand', tube([[0, 0.07, 0], [0.012, 0.13, 0.006], [-0.008, 0.2, -0.008], [0, 0.275, 0]], [0.03, 0.016, 0.014, 0.026], { ring: 7 }), SANDM, { p: DC, name: 'spout' });
    S.add('sand', ball(0.3, 18, 12), HALO, { p: [-0.14, 1.12, 0], name: 'halo' });
    const gA = [], gB = [];
    for (let i = 0; i < 14; i++) {
      const fy = (i * 0.37) % 1, an = i * 2.4, rad = (0.07 + ((i * 0.618) % 1) * 0.19) * (1 - 0.45 * fy);
      (i % 2 ? gB : gA).push(at(ball(0.015 + (i % 4) * 0.0045, 8, 6), [Math.cos(an) * rad, -0.11 + fy * 0.24, Math.sin(an) * rad]));
    }
    S.add('swirl', join(gA), SANDM, { p: [-0.14, 1.14, 0], name: 'grA' });
    S.add('swirl', join(gB), SANDM, { p: [-0.14, 1.14, 0], name: 'grB' });

    // --- legs ------------------------------------------------------------------------------------
    for (const [bn, sh, hp, g] of [['legFL', 'shFL', HIPF, leg(PF, 1)], ['legML', 'shML', HIPM, leg(PM, 0.4)], ['legBL', 'shBL', HIPB, leg(PB, -1)]]) {
      S.add(bn, g.us, STONEM, { p: hp, m: 1 });
      S.add(bn, g.ug, GOLDM, { p: hp, m: 1 });
      S.add(sh, g.ls, STONEM, { p: hp, m: 1 });
      S.add(sh, g.lg, GOLDM, { p: hp, m: 1 });
    }

    // --- head parts: horn tips, mandibles, fan antennas. Maker's mark: a sun disc with one ray on the head shield. ----
    S.add('head', aim(cone(0.034, 0.11, 8), [0.1, 0.14, 0.12]), SHINE, { p: [0.995, 0.975, 0.115], m: 1 });
    const man = join([tube([[0, 0, 0], [0.09, -0.01, 0.05], [0.16, -0.02, 0.03], [0.2, -0.02, -0.04]], [0.036, 0.03, 0.02, 0.006], { ring: 6 }), at(aim(cone(0.016, 0.05, 5), [0.2, 0, -1]), [0.1, -0.012, 0.03])]);
    S.add('head', man, MAND, { p: [0.97, 0.4, 0.09], m: 1, name: 'manL' });
    const club = [0, 1, 2].map(i => { const g = ball(0.034, 10, 6); g.scale(1.3, 0.3, 0.9); g.rotateX(-0.5); g.translate(0.08 + i * 0.004, 0.1 + i * 0.022, 0.13 + i * 0.006); return g; });
    S.add('head', join([tube([[0, 0, 0], [0.05, 0.04, 0.06], [0.08, 0.1, 0.13]], [0.016, 0.013, 0.012], { ring: 5 })].concat(club)), GOLDM, { p: [0.96, 0.47, 0.18], m: 1, name: 'antL' });
    const ray = blade([[0.06, -0.015], [0.118, 0], [0.06, 0.015]], 0.014, { bevel: 0.003 }); ray.rotateX(-Math.PI / 2);
    const mark = join([lathe([[0.001, 0.03], [0.038, 0.027], [0.05, 0.016], [0.05, -0.02]], 20), at(ray, [0, 0.012, 0])]);
    S.add('head', mark, MARKM, { p: [1.035, 0.5, 0], r: [0, 0, -9] });
    S.eye('head', [0.9, 0.56, 0.17], 0.062, { dir: [0.7, 0.25, 0.65], sclera: '#2a1606', iris: '#ffb020', iris2: '#ffe890', pupil: 'bar', lid: '#a8854a', open: 37, tilt: 5, size: 58, glow: 0.9, m: 1 });
  },
  anim(b, t, c) {
    const P = c.parts, u = ez(t.u || 0), a = t.a * (1 - u), s = t.s, h = t.h, k = t.k, br = Math.sin(t.p);
    const melee = k === 'melee', shot = k === 'shot', slam = k === 'slam', buff = k === 'buff';
    // memory for this creature: ring spin, roll angle and the turn of the sundial blade are sums over time
    const st = c.sol || (c.sol = { tm: t.tm, w: t.w, spin: 0, roll: 0, gn: 0 });
    let dt = t.tm - st.tm, dw = t.w - st.w;
    if (!(dt > 0 && dt < 0.1)) dt = 0;
    if (!(dw > 0 && dw < 0.8)) dw = 0;
    st.tm = t.tm; st.w = t.w;
    const mv = t.mv, sp = Math.hypot(t.vf, t.vs), spd = Math.min(1, sp / 2.6), om = t.yr ? -t.yr : t.tn * 5, hx = (t.hx || 0) * h, hz = (t.hz || 0) * h;
    // it is heavy: the strike and a start or a stop come a little late, go past and settle
    const s1 = spr(st, 's1', s, 420, 24, dt), push = spr(st, 'ps', cl1(t.af / 40), 110, 8.5, dt);
    const ward = buff ? Math.min(1, a + s) : 0, aimK = shot ? Math.max(a * 0.8, s) : 0;
    st.spin += dt * (a * (slam ? 16 : buff ? 7 : 3) + s * (slam ? 12 : 2) + t.gl * 1.2 + u * 4);
    st.gn += dt * u * 4.4;
    // wheel roll: it follows the distance in a dash, then one more turn while the strike value falls
    if (melee && s > 0.02) st.roll += dw * 0.9 + dt * (s < 0.999 ? 21.4 : 5);
    else if (st.roll > 0) { st.roll %= TAU; st.roll = st.roll < 0.02 ? 0 : st.roll + dt * 20; if (st.roll >= TAU) st.roll = 0; }
    const up = Math.abs(Math.sin(st.roll / 2)), tuck = Math.max(melee ? Math.max(a * 0.5, Math.min(1, s * 3.5)) : 0, Math.min(1, up * 3)), free = 1 - tuck;

    // gait: 2 tripods. Each foot stands on the ground while the body goes over it, then it lifts and reaches.
    // The stride follows the speed, the direction (forward, backward, to the side) and the turn. T = time of one stance.
    let vx = t.vf, vz = t.vs, spE = sp;
    if (mv > 0.05 && sp < 0.2 && Math.abs(om) < 0.4) { vx = 2.6 * mv; vz = 0; spE = vx; }
    const g = Math.min(1, mv * 2.2) * free, T = DUTY * TAU / FREQ / Math.max(0.6, 3.9 * spE + 2.2 * Math.abs(om) * (1 - Math.min(1, spE / 0.5))), gp = t.w * FREQ / TAU;
    for (const L of LEGS) stepOf(gp + L.ph, DUTY, L.o);
    const lA = (LEGS[0].o[1] + LEGS[3].o[1] + LEGS[4].o[1]) / 3 * g, lB = (LEGS[1].o[1] + LEGS[2].o[1] + LEGS[5].o[1]) / 3 * g;
    // rest: a slow shift of the weight from side to side
    const calm = (1 - Math.min(1, mv * 2.5)) * free * (1 - a) * (1 - u);
    const shift = Math.sin(t.tm * 0.55) * Math.sin(t.tm * 0.19 + 1) * calm, land = Math.max(0, Math.min(1, -(t.va || 0) / 8));

    // body: crouch then roll (melee), handstand that points the dome forward (shot), rise then drop (slam), low guard (buff).
    // It rocks over each tripod. Zenith Inversion: it rears up on its back legs.
    const rear = u * (0.74 + Math.sin(t.tm * 1.7) * 0.02);
    const pitch = -hx * 0.1 + (lB - lA) * 0.012 - push * 0.035 + rear + (melee ? -a * 0.22 : shot ? -aimK * 0.6 : slam ? a * 0.06 - s1 * 0.06 : -ward * 0.05);
    const lift = br * 0.008 - (lA + lB) * 0.03 - h * 0.035 - land * 0.07 - tuck * 0.08 + Math.pow(up, 0.7) * 0.42 + u * 0.31 + (shot ? aimK * 0.24 : slam ? a * 0.15 - s1 * 0.17 : buff ? -ward * 0.09 : melee ? -a * 0.03 : 0);
    b.body.position.y += lift;
    b.body.position.x += (melee ? s * 0.26 - a * 0.12 : shot ? -aimK * 0.08 - s * 0.06 : 0) + hx * 0.07 - u * 0.12 - push * 0.02;
    b.body.position.z += shift * 0.04 + hz * 0.07;
    b.body.rotation.z = pitch - st.roll;
    b.body.rotation.x = (shift * 0.04 + (lA - lB) * 0.07 + hz * 0.1) * free;
    b.body.rotation.y = ((lA - lB) * 0.045 - t.tn * 0.05) * free;

    // 6 legs in 2 parts: the solver puts each foot on its place on the ground, and the knee bends as necessary.
    // For the roll the legs fold to the body. In the ultimate the back legs stand and the 4 other legs reach into the air.
    _qi.copy(b.body.quaternion).invert();
    for (let i = 0; i < 6; i++) {
      const L = LEGS[i], G = L.G, fx = G.f.x, fz = G.f.z, air = i < 4 ? u : 0, loc = Math.max(tuck, air);
      let dx = T * (vx - om * fz), dz = T * (vz + om * fx);
      const dl = Math.hypot(dx, dz);
      if (dl > SMAX) { dx *= SMAX / dl; dz *= SMAX / dl; }
      const brace = Math.max(0, hx * Math.sign(fx) + hz * Math.sign(fz)) * 0.14;      // a hit: the feet on the far side step out
      _c.set(fx + dx * L.o[0] * g + hx * brace, G.f.y + L.o[1] * g * LIFT * (0.5 + 0.5 * Math.min(1, dl / 0.3)), fz + dz * L.o[0] * g + hz * brace + L.sg * ((slam ? s1 * 0.07 : 0) + ward * 0.05))
        .sub(b.body.position).applyQuaternion(_qi).add(B0);
      if (loc > 0) {
        const fold = tuck >= air, paw = Math.sin(t.tm * 4.6 + i * 1.9) * 0.06 * air;
        const lx = fold ? G.h.x + (fx - G.h.x) * 0.3 : fx + 0.14 + paw, ly = fold ? G.h.y - 0.14 : G.f.y + (i < 2 ? 0.36 : 0.2) + paw, lz = fold ? G.h.z + (fz - G.h.z) * 0.4 : fz + L.sg * 0.13;
        _c.x += (lx - _c.x) * loc; _c.y += (ly - _c.y) * loc; _c.z += (lz - _c.z) * loc;
      }
      solveLeg(b[L.hip], b[L.shin], G, _c.x, _c.y, _c.z);
      if (tuck > 0) b[L.hip].scale.setScalar(1 - tuck * 0.45);
    }

    // head and horn: they dip when it starts and lift when it stops. A hit throws the head back. It goes into the collar for the roll and the guard.
    const look = Math.sin(t.tm * 0.41) * Math.sin(t.tm * 0.13 + 2) * calm;
    b.head.rotation.z = br * 0.03 + (lA - lB) * 0.03 - push * 0.2 + h * 0.15 - hx * 0.28 - tuck * 0.35 - u * 0.3 + (melee ? -a * 0.15 : shot ? aimK * 0.4 : slam ? a * 0.3 - s1 * 0.42 : -ward * 0.3);
    b.head.rotation.y = (t.lk * 0.2 + look * 0.3) * free - b.body.rotation.y * 0.7;
    b.head.rotation.x = Math.sin(t.p * 0.5) * 0.04 * free * (1 - a) - b.body.rotation.x * 0.7 + (t.hd || 0) * 0.12 + hz * 0.2;
    b.head.position.x -= tuck * 0.2 + ward * 0.06 + h * 0.04;
    if (tuck > 0) b.head.scale.setScalar(1 - tuck * 0.2);
    const chew = Math.pow(Math.max(0, Math.sin(t.tm * 0.83)), 18) * Math.abs(Math.sin(t.tm * 9)) * 0.2 * calm;
    const bite = 0.12 + Math.max(0, br) * 0.1 + chew + a * (melee ? 0.2 : 0.5) + h * 0.35 + (slam ? s1 * 0.4 : 0) + u * 0.45;
    P.manL.rotation.y -= bite; P.manR.rotation.y += bite;
    const an = a * 0.25 - h * 0.3 + u * 0.4 - push * 0.2, tw = Math.pow(Math.max(0, Math.sin(t.tm * 1.1 + 1)), 16) * 0.3;
    P.antL.rotation.z += an + Math.sin(t.p * 1.3) * 0.12 + tw; P.antR.rotation.z += an + Math.sin(t.p * 1.3 + 1.2) * 0.12 - tw * 0.4;
    P.antL.rotation.x += Math.sin(t.p * 0.7) * 0.08; P.antR.rotation.x += -Math.sin(t.p * 0.7) * 0.08;

    // wing cases: they breathe a little, they lift for the ward and the sinkhole, on a hard turn and on a hit. They open wide in the ultimate.
    const flare = spr(st, 'cf', Math.min(1, Math.abs(t.tn) * (0.5 + spd) + h * 1.2), 170, 10, dt);
    const open = u + (ward * 0.1 + (slam ? s1 * 0.16 + a * 0.05 : 0) + flare * 0.14) * free, fl = (br * 0.012 + 0.012) * free + Math.sin(t.tm * 3.3) * 0.035 * u;
    const oL = open * (1 + t.tn * 0.4 * (1 - u)), oR = open * (1 - t.tn * 0.4 * (1 - u));       // the case on the outer side of a turn lifts more
    b.caseL.rotation.set(-(oL * CX + fl), oL * CY, -oL * CZ); b.caseR.rotation.set(oR * CX + fl, -oR * CY, -oR * CZ);

    // gimbal: the dome stays level when the body rocks, leans in a turn, dips at a start or rears up. It swings a little and settles.
    // (Not in the roll and not in the handstand: there the dome points with the body.)
    const lev = free * (1 - aimK);
    const bankG = t.tn * 0.15 * (0.3 + 0.7 * spd) + cl1(t.vs / 2.6) * 0.05 + hz * 0.15, dipG = -cl1(t.af / 45) * 0.06 - hx * 0.15;
    const slx = spr(st, 'gx', cl1(t.as / 40) * 0.1 + t.tn * 0.07, 60, 4.2, dt), slz = spr(st, 'gz', -cl1(t.af / 40) * 0.1 + hx * 0.1, 60, 4.2, dt);
    b.gim.rotation.z = (-(pitch + dipG) + slz) * lev; b.gim.rotation.x = (-(b.body.rotation.x + bankG) + slx) * lev;
    // hour ring: slow turn, fast spin in the wind-up, a wide pulse for the sinkhole. It lags a little behind the dome.
    const rs = 1 + (slam ? s1 * 0.22 + a * 0.02 * Math.sin(t.tm * 40) : ward * 0.08) + h * 0.04 * Math.sin(t.tm * 38) + t.gl * 0.02 * Math.sin(t.tm * 6) + u * 0.14;
    b.ring1.quaternion.setFromAxisAngle(YAX, t.o * 0.45 + st.spin + h * 0.3 * Math.sin(t.tm * 30));
    b.ring1.scale.setScalar(rs);
    b.ring1.position.x += slz * 0.2; b.ring1.position.z -= slx * 0.2;
    b.ring1.position.y += Math.sin(t.p * 0.8) * 0.008 + ward * 0.05 + u * 0.2;

    // sand: the pile under the top of the dome bobs, the grains orbit (and lag: spring bones). They go to the axis for the laser and spread for the sinkhole.
    const pw = (shot ? aimK : slam ? a * 0.6 + s : buff ? ward * 0.7 : a * 0.3) + t.gl * 0.35 + u * 0.8;
    b.sand.position.y += Math.sin(t.p * 1.1) * 0.012 + h * 0.012 * Math.sin(t.tm * 43);
    P.spout.scale.set(1 + pw * 0.9 + 0.12 * Math.sin(t.tm * 9), 1, 1 + pw * 0.9 + 0.12 * Math.sin(t.tm * 9 + 1));
    P.spout.rotation.y = t.tm * 2.2;
    P.pile.scale.setScalar(1 + 0.012 * Math.sin(t.tm * 5));
    const sa = t.o * 1.7 + st.spin * 1.6, gq = 1 + (slam ? Math.min(0.05, (a + s) * 0.05) : 0) - aimK * 0.45;
    b.swirl.rotation.y = sa; b.swirl.position.y += Math.sin(t.p * 1.7) * 0.018 + u * 0.03;
    b.swirl.scale.set(gq, 1 + t.gl * 0.1 + u * 0.12, gq);
    P.grB.rotation.y = -sa * 1.8; P.grB.position.y += Math.sin(t.p * 2.3 + 1) * 0.02;
    P.halo.scale.setScalar(1 + 0.06 * Math.sin(t.tm * 6) + (shot ? aimK * 0.45 : slam ? a * 0.3 + s * 0.9 : buff ? ward * 1.7 : a * 0.2) + t.gl * 0.3 + u * 0.7);
    P.dome.scale.setScalar(1 + (shot ? s * 0.05 : 0) + ward * 0.02);
    // sundial blade: it turns like a compass needle, it goes flat for the roll. In the ultimate it turns round and round.
    const gn = P.gnomon;
    gn.rotation.y = (Math.sin(t.p * 0.4) * 0.5 + t.lk * 0.4 + (t.hd || 0) * 0.5) * (1 - u) + ward * TAU + (slam ? st.spin * 0.5 : 0) + st.gn;
    gn.rotation.z += h * 0.12 * Math.sin(t.tm * 35);
    gn.scale.y = 1 - tuck * 0.8;
  }
};
// how far the wing cases open in the ultimate: lift (x), swing out (y), tip up (z), in radians
const CX = 0.8, CY = 1.05, CZ = 0.4;
