/* Hourglasswasp (Chronovesp) - the dose glass of the Plague Night. A brass thorax with hour marks, an hourglass abdomen
   in a cage of brass rods (heart piece: dark violet sand with bright magenta grains), a black steel stinger,
   wings like thin watch glass. Maker's mark: a broken minute hand fixed to its back. Venom / Shade. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, blade, wing, lathe, ball, cone, torus, rbox, canvasTex } from '../geo.js';

const BRASS = '#b88a2c', PALE = '#dcb85a', DBRASS = '#7a5618', BLACK = '#17141c', VIO = '#9a4dff', LILAC = '#d9b8ff';
const GLASS = { col: '#b9a6ea', op: 0.15, rough: 0.05, env: 1.15, side: 1, noOut: true };
const SAND = { col: '#35126a', glow: '#5a1cb4', glowK: 0.4, rough: 0.9, noOut: true };          // dark violet sand
const STREAM = { col: '#ff6ad8', glow: '#ff1cb8', glowK: 3.3, noOut: true };                     // magenta grains: the brightest glow
const HALO = { col: '#a030d8', add: true, op: 0.07, noOut: true };
const GLOWV = { col: '#e6d0ff', glow: '#a050ff', glowK: 1.8, noOut: true };
const ETCH = { col: '#ddd0ff', rough: 0.5, noOut: true };
const BRASSM = { col: '#c9a040', metal: 1, rough: 0.3, env: 1.2 };
const STINGM = { col: '#262430', metal: 1, rough: 0.2, env: 1.5 };          // black steel
const BLKM = { col: '#1d1922', metal: 0.4, rough: 0.35, env: 0.9 };
const STEEL = { col: '#4a4460', metal: 1, rough: 0.2, env: 1.3 };
const RIVET = { col: '#f0dc9a', metal: 1, rough: 0.2, env: 1.3 };
let wingMap = null;
const ez = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
const _qf = new THREE.Quaternion(), _zAx = new THREE.Vector3(0, 0, 1);

/* Hourglass frame: h = distance along the abdomen axis from the neck of the glass (h < 0 = waist side, h > 0 = stinger side).
   A part with the rotation AR has its local +Y on this axis and its local +X on the back (dorsal) side. */
const D2R = Math.PI / 180, TILT = 118, AR = [0, 0, TILT], DX = -Math.sin(TILT * D2R), DY = Math.cos(TILT * D2R), GX = -0.447, GY = 0.689;
const hp = h => [GX + DX * h, GY + DY * h, 0];
const bulbR = u => 0.03 + 0.15 * Math.pow(Math.max(0, Math.sin(Math.PI * (0.18 + 0.82 * u))), 0.8);   // u: 0 = brass cap, 1 = neck
const RX = 0.09, RZ = 0.196, SLEN = 0.42, GSTEP = 0.042;     // cage rods (dorsal offset, side offset), stinger length, grain spacing
const LEGS = ['legFL', 'legML', 'legHL', 'legFR', 'legMR', 'legHR'], SHINS = ['shFL', 'shML', 'shHL', 'shFR', 'shMR', 'shHR'];
// legs: hip, then the points of the leg relative to the hip. Point 2 is the knee, point 4 is the foot hook.
const HIP = { F: [0.52, 0.8, 0.1], M: [0.38, 0.77, 0.12], H: [0.23, 0.81, 0.11] };
const LP = {
  F: [[0, 0, 0], [0.05, -0.09, 0.06], [0.12, -0.13, 0.1], [0.17, -0.27, 0.1], [0.21, -0.35, 0.08]],
  M: [[0, 0, 0], [0, -0.09, 0.09], [0.02, -0.15, 0.16], [-0.02, -0.33, 0.17], [-0.03, -0.43, 0.15]],
  H: [[0, 0, 0], [-0.05, -0.07, 0.08], [-0.12, -0.1, 0.14], [-0.2, -0.32, 0.15], [-0.25, -0.45, 0.13]]
};
// spring bones. The abdomen hangs and swings below the thorax. The 12 leg parts hang and trail (high drag). The antennas whip.
const DYN = [{ b: ['waist', 'abd'], k: 46, d: 5, amt: 0.75, drag: 1.2 },
  { b: ['antL'], k: 80, d: 6, amt: 1, drag: 3, dir: [0.6, 0.7, 0.2] }, { b: ['antR'], k: 80, d: 6, amt: 1, drag: 3, dir: [0.6, 0.7, -0.2] }];
for (const key of ['F', 'M', 'H']) for (const sg of [1, -1]) {
  const p = LP[key], e = sg > 0 ? 'L' : 'R';
  DYN.push({ b: ['leg' + key + e], k: 48, d: 5.5, amt: 0.8, drag: 4.5, dir: [p[2][0], p[2][1], p[2][2] * sg] });
  DYN.push({ b: ['sh' + key + e], k: 34, d: 4.5, amt: 0.9, drag: 5, dir: [p[4][0] - p[2][0], p[4][1] - p[2][1], (p[4][2] - p[2][2]) * sg] });
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

function join(list) {
  return mergeGeometries(list.map(g => { const q = g.index ? g.toNonIndexed() : g.clone(); q.deleteAttribute('uv'); if (!q.getAttribute('normal')) q.computeVertexNormals(); return q; }));
}
const at = (g, p) => g.clone().translate(p[0], p[1], p[2]);
function aim(geo, d) {
  const g = geo.clone();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]).normalize()));
  return g;
}
const ringY = (R, r, seg) => { const g = torus(R, r, seg || 20, 6); g.rotateX(Math.PI / 2); return g; };
// wing = a thin watch glass: clear crystal with a violet tint at the tip, two light streaks, an etched seconds dial.
// u = root to tip, top of the canvas = leading edge
function membraneTex() {
  return canvasTex(256, 128, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, 'rgba(236,240,255,0.5)'); gr.addColorStop(0.55, 'rgba(214,214,255,0.3)'); gr.addColorStop(1, 'rgba(176,120,255,0.55)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.lineCap = 'round';
    const line = (w, p) => { g.lineWidth = w; g.beginPath(); g.moveTo(p[0] * W, p[1] * H); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i] * W, p[i + 1] * H); g.stroke(); };
    g.strokeStyle = 'rgba(255,255,255,0.55)'; line(9, [0.12, 0.72, 0.4, 0.2]); line(4, [0.24, 0.78, 0.5, 0.26]);
    g.strokeStyle = 'rgba(86,58,24,0.8)'; line(3, [0, 0.42, 0.3, 0.4, 0.62, 0.44, 0.98, 0.52]); line(2, [0, 0.52, 0.26, 0.62, 0.5, 0.72]);
    // etched seconds dial near the tip
    const cx = W * 0.72, cy = H * 0.46, R = H * 0.3;
    g.strokeStyle = 'rgba(52,26,84,0.9)'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R * 0.8, 0, 7); g.stroke();
    for (let i = 0; i < 12; i++) { const q = i * Math.PI / 6; g.lineWidth = i % 3 ? 2 : 4; g.beginPath(); g.moveTo(cx + Math.cos(q) * R * 0.8, cy + Math.sin(q) * R * 0.8); g.lineTo(cx + Math.cos(q) * R, cy + Math.sin(q) * R); g.stroke(); }
    g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + R * 0.5, cy - R * 0.45); g.stroke();
    g.fillStyle = 'rgba(52,26,84,0.9)'; g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill();
  });
}

export default {
  id: 'hourglasswasp', rim: '#c9a0ff', focus: 'glass', top: 1.6, rough: 0.45,
  opts: { cell: 0.024, mottle: 0.05, mottleF: 14 },
  dyn: DYN,
  rig: { head: 'head', neck: [] },
  build(S) {
    const O = (a, b) => Object.assign({}, a, b);
    const WF = [0.42, 1.15, 0.1], WH = [0.28, 1.13, 0.1], ANT = [0.87, 1.11, 0.07];
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0.35, 0.95, 0])
      .bone('head', 'body', [0.66, 0.98, 0]).bone('antL', 'head', ANT, { m: 1 })
      .bone('waist', 'body', [0.09, 0.93, 0]).bone('abd', 'waist', hp(-0.45)).bone('glass', 'abd', hp(0))
      .bone('wingFL', 'body', WF, { m: 1 }).bone('wingHL', 'body', WH, { m: 1 })
      .bone('legFL', 'body', HIP.F, { m: 1 }).bone('legML', 'body', HIP.M, { m: 1 }).bone('legHL', 'body', HIP.H, { m: 1 });
    for (const key of ['F', 'M', 'H']) S.bone('sh' + key + 'L', 'leg' + key + 'L', [HIP[key][0] + LP[key][2][0], HIP[key][1] + LP[key][2][1], HIP[key][2] + LP[key][2][2]], { m: 1 });

    const M = { metal: 1, gloss: 0.55, k: 0.02 }, Bk = { col: BLACK, gloss: 0.6, metal: 0.25, k: 0.018 };
    const Dk = { col: DBRASS, metal: 1, gloss: 0.45, k: 0.014 }, Pl = { col: PALE, metal: 1, gloss: 0.7, k: 0.012 };
    S.color(BRASS);
    // --- thorax: brass drum between two black shells, pale seam rings ---------------------------
    S.ell('body', [0.37, 0.97, 0], [0.2, 0.22, 0.21], M);
    S.ell('body', [0.54, 0.96, 0], [0.13, 0.17, 0.17], Bk);
    S.ell('body', [0.18, 0.94, 0], [0.14, 0.17, 0.16], Bk);
    S.tor('body', [0.5, 0.965, 0], 0.165, 0.024, O(Pl, { rot: [0, 0, 90] }));
    S.tor('body', [0.22, 0.945, 0], 0.158, 0.024, O(Pl, { rot: [0, 0, 90] }));
    S.box('body', [0.36, 1.165, 0], [0.14, 0.035, 0.1], 0.03, Pl);                 // back plate: the broken minute hand lies on it
    S.ell('body', [0.21, 1.1, 0], [0.07, 0.05, 0.09], Pl);                         // socket of the wind-up key
    S.box('body', [0.37, 0.765, 0], [0.12, 0.03, 0.07], 0.025, Dk);                // belly plate
    S.ell('body', WF, 0.05, O(Dk, { m: 1 }));
    S.ell('body', WH, 0.045, O(Dk, { m: 1 }));
    S.ell('body', HIP.F, 0.055, O(Dk, { m: 1 }));
    S.ell('body', HIP.M, 0.055, O(Dk, { m: 1 }));
    S.ell('body', HIP.H, 0.05, O(Dk, { m: 1 }));
    S.ell('body', [0.37, 0.99, 0.196], [0.082, 0.082, 0.032], { m: 1, col: '#cbb4ee', glow: 0.75, k: 0.01 });  // clock dial on each side
    S.tor('body', [0.37, 0.99, 0.194], 0.09, 0.021, O(Dk, { m: 1, rot: [90, 0, 0] }));
    // --- narrow waist ---------------------------------------------------------------------------
    S.ell('waist', [0.07, 0.93, 0], 0.07, M);
    S.cap('waist', [0.07, 0.93, 0], hp(-0.45), 0.05, 0.042, Bk);
    S.tor('waist', [0.01, 0.917, 0], 0.048, 0.02, O(Pl, { rot: [0, 0, 102] }));
    S.ell('abd', hp(-0.45), 0.062, M);
    S.cap('abd', hp(-0.45), hp(-0.395), 0.045, 0.06, Dk);
    // --- hourglass: brass end caps and tail housing. They are the fixed frame (bone abd): the glass turns inside it (bone glass).
    for (const sg of [-1, 1]) {
      S.tor('abd', hp(sg * 0.35), 0.172, 0.042, O(M, { rot: AR, k: 0.012 }));
      S.ell('abd', hp(sg * 0.35), [0.18, 0.036, 0.18], O(Dk, { rot: AR }));
      S.ell('abd', hp(sg * 0.385), [0.1, 0.04, 0.1], O(Pl, { rot: AR }));
    }
    S.cap('abd', hp(0.38), hp(0.47), 0.085, 0.045, Bk);
    S.tor('abd', hp(0.41), 0.07, 0.022, O(Pl, { rot: AR }));
    // --- head: wide skull, narrow face, brass face plate ----------------------------------------
    S.cap('head', [0.63, 0.98, 0], [0.7, 0.98, 0], 0.07, 0.07, Dk);
    S.ell('head', [0.8, 0.99, 0], [0.13, 0.16, 0.185], O(Bk, { k: 0.03 }));
    S.cap('head', [0.83, 0.95, 0], [0.885, 0.83, 0], 0.1, 0.055, Bk);
    S.ell('head', [0.915, 0.93, 0], [0.035, 0.075, 0.075], M);
    S.box('head', [0.78, 1.14, 0], [0.08, 0.025, 0.04], 0.02, Pl);
    S.ell('head', [0.87, 1.1, 0.07], 0.04, O(Dk, { m: 1 }));
    S.ell('head', [0.9, 0.84, 0.05], 0.038, O(Dk, { m: 1 }));
    // --- paint: stripes, vents, small lamps -------------------------------------------------------
    const stripe = { paint: 1, col: PALE, metal: 1, gloss: 0.7, cb: 0.008 }, lamp = { paint: 1, col: LILAC, glow: 1.4, cb: 0.008 };
    S.box('body', [0.6, 0.96, 0], [0.016, 0.3, 0.3], 0.008, stripe);
    S.box('body', [0.115, 0.94, 0], [0.016, 0.3, 0.3], 0.008, stripe);
    S.cap('body', [0.3, 0.735, 0], [0.44, 0.735, 0], 0.022, 0.022, { paint: 1, col: VIO, glow: 1.3, cb: 0.01 });
    for (const sg of [-1, 1]) S.tor('abd', hp(sg * 0.35), 0.214, 0.018, { paint: 1, col: BLACK, gloss: 0.6, cb: 0.008, rot: AR });
    S.tor('abd', hp(0.45), 0.048, 0.016, { paint: 1, col: VIO, glow: 1.4, cb: 0.008, rot: AR });
    // soot of the night watch on the shells, a worn edge on the drum
    S.ell('body', [0.56, 1.08, 0], [0.09, 0.05, 0.12], { paint: 1, col: '#3a3344', op: 0.5, cb: 0.03 });
    S.ell('body', [0.14, 1.04, 0], [0.09, 0.05, 0.11], { paint: 1, col: '#3a3344', op: 0.5, cb: 0.03 });
    S.tor('body', [0.37, 0.97, 0], 0.215, 0.012, { paint: 1, col: DBRASS, metal: 1, gloss: 0.4, cb: 0.008, op: 0.8, rot: [0, 0, 90] });
    S.ell('head', [0.918, 1.04, 0], 0.026, lamp);
    S.ell('head', [0.905, 1.078, 0.032], 0.022, O(lamp, { m: 1 }));
    S.cap('head', [0.8, 0.875, 0.135], [0.87, 0.835, 0.085], 0.015, 0.015, O(stripe, { m: 1 }));

    // --- glass bulbs, sand, falling stream ------------------------------------------------------
    const pa = [], pb = [];
    for (let i = 0; i <= 14; i++) { const u = i / 14; pa.push([bulbR(u), -0.32 + 0.3 * u]); pb.push([bulbR(1 - u), 0.02 + 0.3 * u]); }
    S.add('glass', lathe(pa, 28), GLASS, { p: hp(0), r: AR, name: 'bulbA' });
    S.add('glass', lathe(pb, 28), GLASS, { p: hp(0), r: AR, name: 'bulbB' });
    const IN = 0.014, CA = -0.09, CB = 0.22;      // gap between sand and glass; centres of the two sand parts
    const sa = [[0.001, -0.105 - CA], [bulbR(0.6) - IN, -0.14 - CA]];
    for (const u of [0.7, 0.8, 0.9, 0.96, 1]) sa.push([bulbR(u) - IN, -0.32 + 0.3 * u - CA]);
    sa.push([0.001, -0.015 - CA]);
    const sb = [[0.001, 0.1 - CB], [0.07, 0.158 - CB]];
    for (const u of [0.4, 0.3, 0.2, 0.1, 0]) sb.push([bulbR(u) - IN, 0.32 - 0.3 * u - CB]);
    sb.push([0.001, 0.32 - CB]);
    S.add('glass', lathe(sa, 24), SAND, { p: hp(CA), r: AR, name: 'sandA' });
    S.add('glass', lathe(sb, 24), SAND, { p: hp(CB), r: AR, name: 'sandB' });
    // magenta grains in the dark sand. They lie on the sand where it touches the glass.
    const glit = (prof, n, seed) => { const g = []; for (let i = 0; i < n; i++) { const q = prof[1 + (i * 3 + seed) % (prof.length - 2)], an = i * 2.4 + seed, rr = Math.max(0.01, q[0] - 0.004); g.push(at(ball(0.009 + (i % 3) * 0.003, 6, 5), [Math.cos(an) * rr, q[1], Math.sin(an) * rr])); } return join(g); };
    S.add('glass', glit(sa, 16, 1), STREAM, { p: hp(CA), r: AR, name: 'glitA' });
    S.add('glass', glit(sb, 16, 2), STREAM, { p: hp(CB), r: AR, name: 'glitB' });
    // the stream in the neck: a thin core and a string of grains that moves. Grains that fly in the top bulb when it is excited.
    S.add('glass', tube([[0, 0, 0], [0, 0.075, 0], [0, 0.15, 0]], [0.009, 0.007, 0.006], { ring: 6 }), STREAM, { p: hp(-0.03), r: AR, name: 'stream' });
    const gs = []; for (let i = -3; i <= 4; i++) gs.push(at(ball(0.0125, 6, 5), [Math.sin(i * 2.1) * 0.006, i * GSTEP, Math.cos(i * 1.7) * 0.006]));
    S.add('glass', join(gs), STREAM, { p: hp(0), r: AR, name: 'grains' });
    const fo = []; for (let i = 0; i < 12; i++) { const an = i * 2.4, rr = 0.02 + (i % 4) * 0.018; fo.push(at(ball(0.01 + (i % 3) * 0.003, 6, 5), [Math.cos(an) * rr, -0.135 - i * 0.012, Math.sin(an) * rr])); }
    S.add('glass', join(fo), STREAM, { p: hp(0), r: AR, name: 'fount' });
    S.add('glass', ball(0.11, 16, 10), HALO, { p: hp(-0.15), name: 'haloA' });
    S.add('glass', ball(0.11, 16, 10), HALO, { p: hp(0.2), name: 'haloB' });
    // dose marks etched into the glass (it was a dose glass). Neck collar with the axle that the glass turns on.
    S.add('glass', join([at(ringY(0.181, 0.005, 28), [0, -0.2, 0]), at(ringY(0.151, 0.005, 28), [0, -0.12, 0]), at(ringY(0.181, 0.005, 28), [0, 0.2, 0]), at(ringY(0.151, 0.005, 28), [0, 0.12, 0])]), ETCH, { p: hp(0), r: AR });
    const collar = lathe([[0.034, -0.035], [0.052, -0.026], [0.058, 0], [0.052, 0.026], [0.034, 0.035]], 16);
    S.add('glass', join([collar, tube([[0, 0, -RZ], [0, 0, 0], [0, 0, RZ]], [0.013, 0.013, 0.013], { ring: 6, seg: 2 })]), BRASSM, { p: hp(0), r: AR, name: 'axle' });
    // fixed cage: 4 rods with nuts, 2 on each side. The glass turns over between them. A bearing bar on each side holds the axle.
    const fr = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * RX, z = sz * RZ;
      fr.push(tube([[x, -0.39, z], [x, 0, z], [x, 0.39, z]], [0.013, 0.013, 0.013], { ring: 6, seg: 4 }));
      fr.push(at(ball(0.026, 8, 6), [x, -0.4, z]), at(ball(0.026, 8, 6), [x, 0.4, z]), at(ball(0.019, 8, 6), [x, 0, z]));
    }
    for (const sz of [-1, 1]) fr.push(at(rbox(RX * 2, 0.036, 0.022), [0, 0, sz * RZ]), at(ball(0.03, 10, 8), [0, 0, sz * (RZ + 0.008)]));
    S.add('abd', join(fr), BRASSM, { p: hp(0), r: AR, name: 'frame' });
    // black steel stinger with a cup guard, venom drop on the point
    const sting = join([cone(0.032, SLEN, 10), lathe([[0.03, -0.012], [0.062, 0], [0.072, 0.02], [0.052, 0.036], [0.032, 0.05]], 14), at(ringY(0.04, 0.009, 16), [0, 0.085, 0])]);
    S.add('abd', sting, STINGM, { p: hp(0.45), r: AR, name: 'sting' });
    S.add('abd', at(ringY(0.05, 0.011, 16), [0, 0.024, 0]), BRASSM, { p: hp(0.45), r: AR });
    S.add('abd', ball(0.024, 10, 8), GLOWV, { p: hp(0.455 + SLEN), name: 'venom' });

    // --- wings: 4 membranes in brass frames -----------------------------------------------------
    if (!wingMap) wingMap = membraneTex();
    const WINGM = { map: wingMap, emap: wingMap, glow: '#b090ff', glowK: 0.3, col: '#ffffff', op: 0.9, rough: 0.08, env: 1.6, noOut: true };
    const m3 = q => [q[1], 0, q[0]];
    const wingSet = (bone, p, r, out, nLead, struts) => {
      const lead = out.slice(out.length - nLead).reverse(), trail = out.slice(0, out.length - nLead + 1).reverse();
      S.add(bone, wing(out, 0.008), WINGM, { p, r, m: 1 });
      const g = [tube(lead.map(m3), lead.map((q, i) => 0.016 - i * 0.011 / (lead.length - 1)), { ring: 6, seg: 20 }), tube(trail.map(m3), trail.map(() => 0.006), { ring: 5, seg: 24 }), ball(0.03, 10, 8)];
      for (const [i0, i1] of struts) { const q0 = out[i0], q1 = out[i1]; g.push(tube([m3(q0), m3([(q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2]), m3(q1)], [0.005, 0.005, 0.005], { ring: 4, seg: 2 })); }
      S.add(bone, join(g), BRASSM, { p, r, m: 1 });
    };
    // outline [span, chord]: trailing edge from the root to the tip, then the leading edge back to the root
    wingSet('wingFL', WF, [-22, -18, 8], [[0, -0.015], [0.2, -0.08], [0.5, -0.15], [0.78, -0.145], [0.93, -0.06], [0.94, 0.035], [0.75, 0.095], [0.44, 0.09], [0.18, 0.06], [0, 0.025]], 5, [[8, 2], [7, 3]]);
    wingSet('wingHL', WH, [-10, -40, 6], [[0, -0.012], [0.15, -0.065], [0.37, -0.11], [0.57, -0.09], [0.66, -0.01], [0.62, 0.05], [0.4, 0.065], [0.15, 0.05], [0, 0.02]], 4, [[7, 2]]);

    // --- 6 thin legs that hang: black tubes, brass joints, a hook at the end ----------------------
    // Each leg has 2 parts (hip to knee, knee to hook) on 2 bones: the knee bends, and both parts are spring bones.
    for (const [key, fx] of [['F', 0.8], ['M', 0.3], ['H', -0.5]]) {
      const pts = LP[key], hip = HIP[key];
      S.add('leg' + key + 'L', tube(pts.slice(0, 3), [0.026, 0.022, 0.024], { ring: 6 }), BLKM, { p: hip, m: 1 });
      S.add('leg' + key + 'L', join([at(ball(0.027, 8, 6), pts[1]), at(ball(0.033, 10, 8), pts[2])]), BRASSM, { p: hip, m: 1 });
      S.add('sh' + key + 'L', join([tube(pts.slice(2), [0.022, 0.014, 0.007], { ring: 6 }), at(aim(cone(0.012, 0.06, 5), [fx, -0.6, -0.3]), pts[4])]), BLKM, { p: hip, m: 1 });
      S.add('sh' + key + 'L', at(ball(0.02, 8, 6), pts[3]), BRASSM, { p: hip, m: 1 });
    }

    // --- head parts: elbowed antennae with a glow bead, sickle mandibles ---------------------------
    const AP = [[0, 0, 0], [0.03, 0.12, 0.03], [0.1, 0.22, 0.06], [0.2, 0.26, 0.09], [0.3, 0.22, 0.11]];
    S.add('antL', tube(AP, [0.015, 0.013, 0.012, 0.01, 0.007], { ring: 6 }), BLKM, { p: ANT, m: 1 });
    S.add('antL', join([at(ball(0.022, 8, 6), AP[1]), at(ball(0.016, 8, 6), AP[2]), at(ball(0.014, 8, 6), AP[3])]), BRASSM, { p: ANT, m: 1 });
    S.add('antL', ball(0.021, 8, 6), GLOWV, { p: [ANT[0] + AP[4][0], ANT[1] + AP[4][1], ANT[2] + AP[4][2]], m: 1 });
    const jaw = join([tube([[0, 0, 0], [0.06, -0.035, 0.025], [0.105, -0.085, 0], [0.115, -0.14, -0.04]], [0.03, 0.026, 0.016, 0.003], { ring: 6 }), at(aim(cone(0.012, 0.05, 5), [0.3, -1, -0.7]), [0.07, -0.055, 0.005])]);
    S.add('head', jaw, STEEL, { p: [0.9, 0.84, 0.05], m: 1, name: 'jawL' });
    // rivets on the back plate, wind-up key
    const rv = [];
    for (const x of [0.25, 0.36, 0.47]) for (const z of [-0.075, 0.075]) rv.push(at(ball(0.017, 8, 6), [x, 1.198, z]));
    // 12 hour studs round the front seam ring
    for (let i = 0; i < 12; i++) { const q = (i + 0.5) * Math.PI / 6; rv.push(at(ball(i % 3 === 0 ? 0.02 : 0.014, 8, 6), [0.5, 0.965 + Math.cos(q) * 0.19, Math.sin(q) * 0.19])); }
    S.add('body', join(rv), RIVET);
    // maker's mark: a broken minute hand of black steel, fixed to the back plate with two brass straps
    const mh = blade([[-0.125, -0.017], [-0.105, -0.005], [-0.118, 0.006], [-0.1, 0.017], [0.0, 0.014], [0.03, 0.034], [0.075, 0.02], [0.15, 0], [0.075, -0.02], [0.03, -0.034], [0.0, -0.014]], 0.016, { bevel: 0.005 });
    mh.rotateX(-Math.PI / 2);
    S.add('body', mh, STINGM, { p: [0.355, 1.208, 0], r: [0, 14, 0] });
    S.add('body', join([at(rbox(0.022, 0.014, 0.062), [-0.07, 0.004, 0.017]), at(rbox(0.022, 0.014, 0.062), [0.0, 0.004, 0]), at(torus(0.02, 0.007, 12, 5).rotateX(Math.PI / 2), [0.035, 0.008, -0.008])]), BRASSM, { p: [0.355, 1.208, 0] });
    // hour marks and one hand on each side dial
    const tk = [];
    for (let i = 0; i < 12; i++) { const q = i * Math.PI / 6, L = i % 3 ? 0.018 : 0.03, r0 = 0.07 - L / 2; tk.push(at(rbox(L, i % 3 ? 0.008 : 0.012, 0.008).rotateZ(q), [Math.cos(q) * r0, Math.sin(q) * r0, 0])); }
    S.add('body', join(tk), BLKM, { p: [0.37, 0.99, 0.229], m: 1 });
    S.add('body', join([at(rbox(0.058, 0.011, 0.008), [0.02, 0, 0]), ball(0.014, 8, 6)]), BLKM, { p: [0.37, 0.99, 0.236], m: 1, name: 'dhL' });
    const key = join([tube([[0, 0, 0], [0, 0.07, 0], [0, 0.14, 0]], [0.016, 0.013, 0.013], { ring: 6, seg: 4 }), ball(0.028, 8, 6), at(torus(0.042, 0.012, 18, 6), [0.047, 0.185, 0]), at(torus(0.042, 0.012, 18, 6), [-0.047, 0.185, 0]), at(ball(0.02, 8, 6), [0, 0.15, 0])]);
    S.add('body', key, BRASSM, { p: [0.19, 1.12, 0], r: [0, 0, 24], order: 'ZYX', name: 'key' });
    // compound eyes: dark glass with a violet glow
    S.eye('head', [0.84, 1.0, 0.125], 0.105, { dir: [0.45, 0.12, 0.88], sclera: '#0d0816', iris: '#4a1890', iris2: '#f08cf0', pupil: 'slit', size: 64, lid: DBRASS, open: 47, tilt: -21, glow: 1.1, sy: 1.3, m: 1 });
  },
  anim(b, t, c) {
    const P = c.parts, st = c.st || (c.st = { tm: t.tm, wp: t.tm * 78, gr: t.tm * 0.1 });
    let dt = t.tm - st.tm; if (!(dt > 0 && dt < 0.1)) dt = 0; st.tm = t.tm;
    const u = ez(t.u || 0), a = t.a * (1 - u), s = t.s, h = t.h, k = t.k, mv = t.mv, va = t.va || 0;
    const melee = k === 'melee', shot = k === 'shot', buff = k === 'buff', slam = k === 'slam';
    const spd = Math.min(1, Math.hypot(t.vf, t.vs) / 2.6), acc = Math.min(1, Math.hypot(t.af, t.as) / 30), hx = (t.hx || 0) * h, hz = (t.hz || 0) * h;
    // strike wave: the power goes from the thorax to the waist, the abdomen and the stinger. Each part comes later and swings past.
    const s1 = spr(st, 's1', s, 900, 36, dt), s2 = spr(st, 's2', s1, 700, 27, dt), s3 = spr(st, 's3', s2, 600, 21, dt);
    const br = Math.sin(t.p * 1.5), cock = a * (1 - s), aimK = shot ? Math.min(1, a + s1) : 0, sip = buff ? Math.min(1, a + s) : 0;
    // it cannot stay still: a short dart to the side now and then, and a constant correction of the height.
    // In the ultimate the whole body shakes with stolen time.
    const dart = Math.pow(Math.max(0, Math.sin(t.tm * 1.9)), 24) - Math.pow(Math.max(0, Math.sin(t.tm * 1.3 + 2)), 24);
    const hgt = Math.sin(t.tm * 2.3) * Math.sin(t.tm * 0.9 + 1) * 0.032 + Math.sin(t.tm * 5.1 + 2) * 0.009;
    const shx = Math.sin(t.tm * 97) * u, shy = Math.sin(t.tm * 113 + 1) * u, shz = Math.sin(t.tm * 89 + 2) * u;
    // what the game does to the whole body of a hover creature: bank in a turn and a side step, dip with the acceleration and the speed
    const bank = t.tn * 0.3 * (0.3 + 0.7 * spd) + cl1(t.vs / 2.6) * 0.16, dip = cl1(t.af / 45) * 0.15 + cl1(t.vf / 2.6) * 0.07;
    // thorax: hover bob, weave from side to side when it moves. It rears up to bring the stinger forward. A hit throws it back.
    b.body.position.y += br * 0.03 + hgt + Math.sin(t.w * 1.1) * 0.025 * mv + Math.sin(t.tm * 41) * 0.004 - h * 0.04 + u * 0.1 + shy * 0.013 - cl1(va / 8) * 0.03
      + (melee ? cock * 0.07 + s * 0.24 : shot ? aimK * 0.19 : slam ? cock * 0.16 + s * 0.08 : sip * 0.1);
    b.body.position.x += (melee ? -cock * 0.14 + s * 0.3 : shot ? -cock * 0.05 - s * 0.14 : slam ? s * 0.08 : 0) + hx * 0.11 + shx * 0.012;
    b.body.position.z += Math.sin(t.w * 0.7) * 0.04 * mv + dart * 0.03 * (1 - u) + hz * 0.11 + shz * 0.012;
    b.body.rotation.z = br * 0.02 - hx * 0.22 + u * 0.2 + shx * 0.025
      + (melee ? cock * 0.2 + s * 0.6 : shot ? aimK * 0.6 + s * 0.1 : slam ? -cock * 0.2 : sip * 0.15);
    b.body.rotation.x = Math.sin(t.w * 0.7) * 0.08 * mv + dart * 0.1 * (1 - u) + shz * 0.045 + hz * 0.22;
    b.body.rotation.y = t.lk * 0.1 + dart * 0.12 * (1 - u) - t.tn * 0.1;
    // abdomen: it hangs below the thorax (spring bones give the swing and the trail). curl > 0 brings the hourglass down and forward
    // under the body: first the waist, then the abdomen. The waist becomes longer to clear the thorax.
    const base = Math.sin(t.p * 1.1) * 0.06 * (1 - u) + h * 0.25 + Math.sin(t.w * 1.1 - 1) * 0.04 * mv - t.gl * 0.05 - u * 0.55 - hx * 0.2;
    let cw = base, ca = base, ext = 0;
    if (melee) { cw += -cock * 0.42 + s1 * 1.6; ca += -cock * 0.5 + s2 * 1.7; ext = s1; }
    else if (shot) { cw += aimK * 1.65 - s1 * 0.2; ca += aimK * 1.65 - s2 * 0.25; ext = aimK; }
    else if (slam) { cw += -cock * 0.5 + s1 * 0.25; ca += -cock * 0.5 + s2 * 0.3; }     // stab down at the ground. A larger angle puts the stinger below the ground.
    else { cw -= sip * 0.3; ca -= sip * 0.3; }
    b.waist.rotation.z = cw * 0.45; b.abd.rotation.z = ca * 0.55;
    b.abd.position.x -= ext * 0.11; b.abd.position.y -= ext * 0.03;
    const yaw = Math.sin(t.p * 0.8) * 0.09 * (1 - ext) * (1 - u) + Math.sin(t.tm * 0.6) * Math.sin(t.tm * 0.27 + 2) * 0.1 * (1 - ext) * (1 - u);
    b.waist.rotation.y = yaw * 0.5; b.abd.rotation.y = yaw;
    b.waist.rotation.x = -b.body.rotation.x * 0.5; b.abd.rotation.x = -bank * 0.4;       // the heavy glass hangs: it does not bank with the body
    // siphon: the glass and its cage turn on the long axis and swell, the sand burns bright.
    // Stolen Hour: the glass turns over by 180 degrees on its axle between the cage rods. The top bulb becomes the bottom bulb.
    const spin = sip * sip * 4.19, hs = Math.sin(spin / 2), flip = Math.PI * u + Math.sin(t.tm * 9) * 0.05 * u * (1 - u) * 4;
    b.glass.quaternion.set(DX * hs, DY * hs, 0, Math.cos(spin / 2)).multiply(_qf.setFromAxisAngle(_zAx, flip));
    P.frame.rotateY(spin);
    b.glass.scale.setScalar(1 + sip * 0.05 + Math.sin(t.tm * 9) * 0.012 * (sip + t.gl) + Math.sin(t.tm * 14) * 0.02 * u);
    const hot = Math.min(1.3, sip + t.gl * 0.4 + a * 0.2 + s * (slam ? 0.8 : 0.25) + u * 0.9), fl = Math.sin(t.tm * 33);
    P.sandA.scale.setScalar(1 + Math.sin(t.tm * 4.5) * 0.012 + hot * 0.05);
    P.sandB.scale.setScalar(1 + Math.sin(t.tm * 4.5 + 2) * 0.012 + hot * 0.05);
    P.haloA.scale.setScalar(1 + Math.sin(t.tm * 6) * 0.07 + hot * 0.6);
    P.haloB.scale.setScalar(1 + Math.sin(t.tm * 6 + 1.6) * 0.07 + hot * 0.6);
    const sw = 1 + fl * 0.22 + hot * 1.4;
    P.stream.scale.set(sw, 1, sw);
    // grains: they fall through the neck when it is calm. When it is excited, the sand flows upward (to the waist side).
    const ex = Math.min(1, a + t.gl * 0.8 + sip + u + s * 0.5);
    st.gr = (st.gr + dt * (0.1 - ex * 0.55) + GSTEP * 64) % GSTEP;
    P.grains.position.x += DX * st.gr; P.grains.position.y += DY * st.gr;
    P.grains.scale.set(1 + ex * 0.5, 1, 1 + ex * 0.5);
    P.fount.visible = ex > 0.03;
    P.fount.scale.set(0.5 + ex * 0.6, 0.35 + ex * 0.75, 0.5 + ex * 0.6); P.fount.rotateY(t.tm * 5);
    P.fount.position.x -= DX * (Math.sin(t.tm * 7) * 0.012 + 0.03 * (1 - ex)); P.fount.position.y -= DY * (Math.sin(t.tm * 7) * 0.012 + 0.03 * (1 - ex));
    const gk = 1 + Math.sin(t.tm * 5.5) * 0.12 + hot * 0.5;
    P.glitA.scale.setScalar(1 + hot * 0.03); P.glitB.scale.setScalar(1 + hot * 0.03); P.glitA.rotateY(Math.sin(t.tm * 0.9) * 0.06 * gk); P.glitB.rotateY(-Math.sin(t.tm * 0.9) * 0.06 * gk);
    // stinger: it pulls in for the wind-up, thrusts out last in the lunge (and goes past), kicks back after the dart
    const thrust = melee ? s3 * 0.14 - cock * 0.05 : shot ? cock * 0.03 - s3 * 0.09 : slam ? s3 * 0.04 : 0, len = 1 + (melee ? Math.max(0, s3) * 0.3 : 0), tip = thrust + SLEN * (len - 1);
    P.sting.position.x += DX * thrust; P.sting.position.y += DY * thrust; P.sting.scale.y = len;
    P.venom.position.x += DX * tip; P.venom.position.y += DY * tip;
    P.venom.scale.setScalar(Math.max(0.05, 0.8 + Math.sin(t.tm * 7) * 0.15 + (shot ? cock * 1.8 - s * 0.7 : a * 0.5) + t.gl * 0.5 + sip * 0.6 + u * 0.5));
    // wings: very fast buzz. The beat is faster and wider when it accelerates or climbs. The wing on the outer side of a turn beats wider.
    // They stall when it is hurt, sweep back at speed and in the lunge, rise for the siphon. Fastest and widest in the ultimate.
    const rate = 78 + acc * 26 + Math.max(0, va) * 3 + a * 10 + u * 64 - h * 22;
    st.wp = dt > 0 ? st.wp + dt * rate : t.tm * rate;
    const amp = (0.44 + 0.06 * mv + 0.2 * acc + Math.max(0, va) * 0.02 + 0.12 * a + 0.1 * t.gl + sip * 0.15 + u * 0.3) * (1 - h * 0.55);
    const aL = amp * (1 - t.tn * 0.32), aR = amp * (1 + t.tn * 0.32), w1 = Math.sin(st.wp), w2 = Math.sin(st.wp - 0.8) * 0.85;
    const lift = a * 0.15 + sip * 0.3 + u * 0.28 + (slam ? -s1 * 0.3 : s1 * 0.1) + Math.sin(t.tm * 23) * 0.2 * h - cl1(va / 8) * 0.12;
    const sweep = -cl1(t.vf / 2.6) * 0.2 - cl1(t.af / 40) * 0.14 - (melee ? s1 * 0.45 : 0) + a * 0.12 + u * 0.2, tw = -cl1(t.af / 40) * 0.12 + a * 0.12 - (melee ? s1 * 0.2 : 0) + shy * 0.05, wy = t.tn * 0.14;
    b.wingFL.rotation.set(-(w1 * aL + lift + bank * 0.3), sweep + wy, tw); b.wingFR.rotation.set(w1 * aR + lift - bank * 0.3, -sweep + wy, tw);
    b.wingHL.rotation.set(-(w2 * aL + lift * 0.7 + bank * 0.3), sweep * 1.2 + wy, tw); b.wingHR.rotation.set(w2 * aR + lift * 0.7 - bank * 0.3, -sweep * 1.2 + wy, tw);
    // legs: 2 parts each. They hang, dangle and trail (spring bones). They fold under the body at speed.
    // They reach forward and open before a strike or a landing. They open wide to let the abdomen through. They pull up and shake in the ultimate.
    const splay = melee ? s1 : shot ? aimK : slam ? s1 * 0.4 : 0, reach = Math.max(a * (shot || buff ? 0.4 : 1), Math.max(0, Math.min(1, -va / 5))) * (1 - splay);
    for (let i = 0; i < 6; i++) {
      const bn = b[LEGS[i]], sh = b[SHINS[i]], j = i % 3, sg = i < 3 ? 1 : -1;
      const idle = Math.sin(t.p * 1.3 + i * 1.7) * 0.06 + Math.sin(t.tm * 0.9 + i * 2.3) * Math.sin(t.tm * 0.31 + i) * 0.09;
      bn.rotation.z = idle + reach * (0.6 - 0.2 * j) - spd * 0.08 + splay * (j === 0 ? 0.7 : j === 1 ? 0.1 : -0.5) - h * 0.3 * (1 - j) + hx * 0.3 + u * (0.35 - 0.3 * j) + Math.sin(t.tm * 61 + i * 2) * 0.05 * u;
      bn.rotation.x = -sg * (splay * 0.75 + h * 0.3 + sip * 0.25 + u * 0.4 + reach * 0.22 + Math.sin(t.p * 0.9 + i) * 0.04) + hz * 0.3;
      const flex = spd * 0.4 + Math.sin(t.p * 0.8 + i * 1.3) * 0.09 + Math.sin(t.tm * 0.7 + i) * Math.sin(t.tm * 0.23 + i * 2) * 0.1 - reach * 0.4 + h * 0.45 + u * 0.3 + sip * 0.2;
      sh.rotation.x = sg * flex; sh.rotation.z = reach * 0.35 - spd * 0.25 + splay * 0.2;
    }
    // head: it stays level when the body banks and dips, and it keeps its eyes on the target when the body rears up. A hit whips it.
    b.head.rotation.y = t.lk * 0.3 - dart * 0.2 * (1 - u) + b.body.rotation.y * -0.6;
    b.head.rotation.z = -br * 0.03 + dip * 0.8 + h * 0.2 - hx * 0.25 - u * 0.24 + (melee ? -cock * 0.1 - s1 * 0.3 : shot ? -aimK * 0.35 : -a * 0.12);
    b.head.rotation.x = Math.sin(t.p * 0.6) * 0.07 * (1 - u) - bank * 0.75 - b.body.rotation.x * 0.6 + shz * 0.05 + hz * 0.2;
    // antennae (spring bones): slow wave with sudden twitches. They lie back in the wind-up and snap forward in the strike.
    for (let i = 0; i < 2; i++) {
      const bn = i ? b.antR : b.antL, sg = i ? -1 : 1, ph = i * 1.9, tq = Math.pow(Math.max(0, Math.sin(t.tm * 2.9 + ph)), 14) * 0.4;
      bn.rotation.z = Math.sin(t.p * 2.1 + ph) * 0.07 + tq + a * 0.35 - s2 * 0.45 + h * 0.3 + u * 0.5 + Math.sin(t.tm * 70 + ph) * 0.06 * u;
      bn.rotation.x = sg * (Math.sin(t.p * 1.3 + ph) * 0.08 + a * 0.25 + tq * 0.5 + u * 0.2);
    }
    const open = Math.max(-0.08, 0.12 + Math.sin(t.p * 2.2) * 0.07 + a * 0.5 - s * 0.45 + h * 0.3 + Math.max(0, Math.sin(t.tm * 13)) * 0.12 * t.gl + u * 0.4);
    P.jawL.rotation.y -= open; P.jawR.rotation.y += open;
    P.key.rotation.y = t.tm * 1.6 + a * 5 + sip * 6 + u * t.tm * 14;
    // the hands of the side dials run too fast. In the ultimate they run backward: the hour is stolen.
    const dh = -t.tm * (2.2 + a * 6 + t.gl * 3) * (1 - u) + t.tm * 16 * u;
    P.dhL.rotation.z = dh; P.dhR.rotation.z = dh;
  }
};
