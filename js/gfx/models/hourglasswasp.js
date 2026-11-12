/* Hourglasswasp - wasp automaton. Its abdomen is a glass hourglass with glowing violet sand, the stinger is a brass rapier. Iron / Venom. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, wing, lathe, ball, cone, torus, canvasTex } from '../geo.js';

const BRASS = '#b88a2c', PALE = '#dcb85a', DBRASS = '#7a5618', BLACK = '#17141c', VIO = '#9a4dff', LILAC = '#d9b8ff';
const GLASS = { col: '#cdb8ff', op: 0.3, rough: 0.04, env: 1.7, side: 1, noOut: true };
const SAND = { col: '#b98cff', glow: '#8a3dff', glowK: 2.4, rough: 0.9, noOut: true };
const STREAM = { col: '#f0e0ff', glow: '#b070ff', glowK: 3.6, noOut: true };
const HALO = { col: '#8a40ff', add: true, op: 0.2, noOut: true };
const GLOWV = { col: '#e6d0ff', glow: '#a050ff', glowK: 3.2, noOut: true };
const BRASSM = { col: '#c9a040', metal: 1, rough: 0.3, env: 1.2 };
const STINGM = { col: '#ecd080', metal: 1, rough: 0.16, env: 1.5 };
const BLKM = { col: '#1d1922', metal: 0.4, rough: 0.35, env: 0.9 };
const STEEL = { col: '#4a4460', metal: 1, rough: 0.2, env: 1.3 };
const RIVET = { col: '#f0dc9a', metal: 1, rough: 0.2, env: 1.3 };
let wingMap = null;

/* Hourglass frame: h = distance along the abdomen axis from the neck of the glass (h < 0 = waist side, h > 0 = stinger side).
   A part with the rotation AR has its local +Y on this axis and its local +X on the back (dorsal) side. */
const D2R = Math.PI / 180, TILT = 118, AR = [0, 0, TILT], DX = -Math.sin(TILT * D2R), DY = Math.cos(TILT * D2R), GX = -0.447, GY = 0.689;
const hp = h => [GX + DX * h, GY + DY * h, 0];
const bulbR = u => 0.03 + 0.15 * Math.pow(Math.max(0, Math.sin(Math.PI * (0.18 + 0.82 * u))), 0.8);   // u: 0 = brass cap, 1 = neck
const LEGS = ['legFL', 'legML', 'legHL', 'legFR', 'legMR', 'legHR'];

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
// wing membrane: u = root to tip, top of the canvas = leading edge
function membraneTex() {
  return canvasTex(256, 128, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, 'rgba(255,232,180,0.66)'); gr.addColorStop(0.5, 'rgba(208,188,255,0.42)'); gr.addColorStop(1, 'rgba(150,92,255,0.62)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(74,48,18,0.95)'; g.lineCap = 'round';
    const line = (w, p) => { g.lineWidth = w; g.beginPath(); g.moveTo(p[0] * W, p[1] * H); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i] * W, p[i + 1] * H); g.stroke(); };
    line(5, [0, 0.3, 0.3, 0.2, 0.7, 0.16, 1, 0.3]);
    line(3.5, [0, 0.42, 0.3, 0.4, 0.62, 0.44, 0.98, 0.52]);
    line(3, [0, 0.52, 0.26, 0.62, 0.56, 0.74, 0.9, 0.8]);
    line(2.5, [0.3, 0.4, 0.44, 0.9]);
    line(2.5, [0.3, 0.2, 0.36, 0.4]); line(2.5, [0.52, 0.18, 0.56, 0.74]); line(2.5, [0.72, 0.16, 0.76, 0.78]); line(2, [0.86, 0.22, 0.9, 0.8]);
    line(2, [0.62, 0.44, 0.76, 0.62]); line(2, [0.14, 0.28, 0.16, 0.56]);
    g.fillStyle = 'rgba(64,30,96,0.92)'; g.beginPath(); g.ellipse(W * 0.75, H * 0.14, W * 0.055, H * 0.06, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(W * 0.45, H * 0.3, W * 0.12, H * 0.05, 0, 0, 7); g.fill();
  });
}

export default {
  id: 'hourglasswasp', rim: '#c9a0ff', focus: 'glass', top: 1.6, rough: 0.45,
  opts: { cell: 0.024, mottle: 0.05, mottleF: 14 },
  build(S) {
    const O = (a, b) => Object.assign({}, a, b);
    const HIP = { F: [0.52, 0.8, 0.1], M: [0.38, 0.77, 0.12], H: [0.23, 0.81, 0.11] }, WF = [0.42, 1.15, 0.1], WH = [0.28, 1.13, 0.1], ANT = [0.87, 1.11, 0.07];
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0.35, 0.95, 0])
      .bone('head', 'body', [0.66, 0.98, 0]).bone('antL', 'head', ANT, { m: 1 })
      .bone('waist', 'body', [0.09, 0.93, 0]).bone('abd', 'waist', hp(-0.45)).bone('glass', 'abd', hp(0))
      .bone('wingFL', 'body', WF, { m: 1 }).bone('wingHL', 'body', WH, { m: 1 })
      .bone('legFL', 'body', HIP.F, { m: 1 }).bone('legML', 'body', HIP.M, { m: 1 }).bone('legHL', 'body', HIP.H, { m: 1 });

    const M = { metal: 1, gloss: 0.55, k: 0.02 }, Bk = { col: BLACK, gloss: 0.6, metal: 0.25, k: 0.018 };
    const Dk = { col: DBRASS, metal: 1, gloss: 0.45, k: 0.014 }, Pl = { col: PALE, metal: 1, gloss: 0.7, k: 0.012 };
    S.color(BRASS);
    // --- thorax: brass drum between two black shells, pale seam rings ---------------------------
    S.ell('body', [0.37, 0.97, 0], [0.2, 0.22, 0.21], M);
    S.ell('body', [0.54, 0.96, 0], [0.13, 0.17, 0.17], Bk);
    S.ell('body', [0.18, 0.94, 0], [0.14, 0.17, 0.16], Bk);
    S.tor('body', [0.5, 0.965, 0], 0.165, 0.024, O(Pl, { rot: [0, 0, 90] }));
    S.tor('body', [0.22, 0.945, 0], 0.158, 0.024, O(Pl, { rot: [0, 0, 90] }));
    S.box('body', [0.36, 1.165, 0], [0.13, 0.035, 0.1], 0.03, Bk);                 // back plate
    S.ell('body', [0.21, 1.1, 0], [0.07, 0.05, 0.09], Pl);                         // socket of the wind-up key
    S.box('body', [0.37, 0.765, 0], [0.12, 0.03, 0.07], 0.025, Dk);                // belly plate
    S.ell('body', WF, 0.05, O(Dk, { m: 1 }));
    S.ell('body', WH, 0.045, O(Dk, { m: 1 }));
    S.ell('body', HIP.F, 0.055, O(Dk, { m: 1 }));
    S.ell('body', HIP.M, 0.055, O(Dk, { m: 1 }));
    S.ell('body', HIP.H, 0.05, O(Dk, { m: 1 }));
    S.ell('body', [0.37, 0.99, 0.2], [0.06, 0.06, 0.035], { m: 1, col: VIO, glow: 2.4, k: 0.01 });        // sand gauge on each side
    S.tor('body', [0.37, 0.99, 0.2], 0.068, 0.022, O(Dk, { m: 1, rot: [90, 0, 0] }));
    // --- narrow waist ---------------------------------------------------------------------------
    S.ell('waist', [0.07, 0.93, 0], 0.07, M);
    S.cap('waist', [0.07, 0.93, 0], hp(-0.45), 0.05, 0.042, Bk);
    S.tor('waist', [0.01, 0.917, 0], 0.048, 0.02, O(Pl, { rot: [0, 0, 102] }));
    S.ell('abd', hp(-0.45), 0.062, M);
    S.cap('abd', hp(-0.45), hp(-0.395), 0.045, 0.06, Dk);
    // --- hourglass: brass end caps, tail housing ------------------------------------------------
    for (const sg of [-1, 1]) {
      S.tor('glass', hp(sg * 0.35), 0.172, 0.042, O(M, { rot: AR, k: 0.012 }));
      S.ell('glass', hp(sg * 0.35), [0.18, 0.036, 0.18], O(Dk, { rot: AR }));
      S.ell('glass', hp(sg * 0.385), [0.1, 0.04, 0.1], O(Pl, { rot: AR }));
    }
    S.cap('glass', hp(0.38), hp(0.47), 0.085, 0.045, Bk);
    S.tor('glass', hp(0.41), 0.07, 0.022, O(Pl, { rot: AR }));
    // --- head: wide skull, narrow face, brass face plate ----------------------------------------
    S.cap('head', [0.63, 0.98, 0], [0.7, 0.98, 0], 0.07, 0.07, Dk);
    S.ell('head', [0.8, 0.99, 0], [0.13, 0.16, 0.185], O(Bk, { k: 0.03 }));
    S.cap('head', [0.83, 0.95, 0], [0.885, 0.83, 0], 0.1, 0.055, Bk);
    S.ell('head', [0.915, 0.93, 0], [0.035, 0.075, 0.075], M);
    S.box('head', [0.78, 1.14, 0], [0.08, 0.025, 0.04], 0.02, Pl);
    S.ell('head', [0.87, 1.1, 0.07], 0.04, O(Dk, { m: 1 }));
    S.ell('head', [0.9, 0.84, 0.05], 0.038, O(Dk, { m: 1 }));
    // --- paint: stripes, vents, small lamps -------------------------------------------------------
    const stripe = { paint: 1, col: PALE, metal: 1, gloss: 0.7, cb: 0.008 }, lamp = { paint: 1, col: LILAC, glow: 2.6, cb: 0.008 };
    S.box('body', [0.6, 0.96, 0], [0.016, 0.3, 0.3], 0.008, stripe);
    S.box('body', [0.115, 0.94, 0], [0.016, 0.3, 0.3], 0.008, stripe);
    for (const x of [0.3, 0.37, 0.44]) S.cap('body', [x, 1.2, -0.05], [x, 1.2, 0.05], 0.015, 0.015, { paint: 1, col: VIO, glow: 2.2, cb: 0.008 });
    S.cap('body', [0.3, 0.735, 0], [0.44, 0.735, 0], 0.022, 0.022, { paint: 1, col: VIO, glow: 2.4, cb: 0.01 });
    for (const sg of [-1, 1]) S.tor('glass', hp(sg * 0.35), 0.214, 0.018, { paint: 1, col: BLACK, gloss: 0.6, cb: 0.008, rot: AR });
    S.tor('glass', hp(0.45), 0.048, 0.016, { paint: 1, col: VIO, glow: 2.4, cb: 0.008, rot: AR });
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
    S.add('glass', tube([[0, 0, 0], [0, 0.075, 0], [0, 0.15, 0]], [0.011, 0.008, 0.007], { ring: 6 }), STREAM, { p: hp(-0.03), r: AR, name: 'stream' });
    S.add('glass', ball(0.11, 16, 10), HALO, { p: hp(-0.15), name: 'haloA' });
    S.add('glass', ball(0.11, 16, 10), HALO, { p: hp(0.2), name: 'haloB' });
    // frame: 3 support rods with nuts, neck collar with 3 spokes
    const fr = [lathe([[0.034, -0.035], [0.052, -0.026], [0.058, 0], [0.052, 0.026], [0.034, 0.035]], 16)];
    for (let i = 0; i < 3; i++) {
      const q = i * 120 * D2R, cx = Math.cos(q), sz = Math.sin(q), R = 0.2;
      fr.push(tube([[cx * R, -0.39, sz * R], [cx * R, 0, sz * R], [cx * R, 0.39, sz * R]], [0.012, 0.012, 0.012], { ring: 6, seg: 4 }));
      fr.push(at(ball(0.025, 8, 6), [cx * R, -0.398, sz * R]), at(ball(0.025, 8, 6), [cx * R, 0.398, sz * R]), at(ball(0.02, 8, 6), [cx * R, 0, sz * R]));
      fr.push(tube([[cx * 0.05, 0, sz * 0.05], [cx * 0.125, 0, sz * 0.125], [cx * R, 0, sz * R]], [0.009, 0.008, 0.009], { ring: 5, seg: 4 }));
    }
    S.add('glass', join(fr), BRASSM, { p: hp(0), r: AR, name: 'frame' });
    // rapier stinger with a cup guard, venom drop on the point
    const sting = join([cone(0.03, 0.36, 10), lathe([[0.03, -0.012], [0.062, 0], [0.072, 0.02], [0.052, 0.036], [0.032, 0.05]], 14), at(ringY(0.04, 0.009, 16), [0, 0.085, 0])]);
    S.add('glass', sting, STINGM, { p: hp(0.45), r: AR, name: 'sting' });
    S.add('glass', ball(0.022, 10, 8), GLOWV, { p: hp(0.815), name: 'venom' });

    // --- wings: 4 membranes in brass frames -----------------------------------------------------
    if (!wingMap) wingMap = membraneTex();
    const WINGM = { map: wingMap, emap: wingMap, glow: '#b090ff', glowK: 0.35, col: '#ffffff', op: 0.85, rough: 0.15, env: 1.4, noOut: true };
    const m3 = q => [q[1], 0, q[0]];
    const wingSet = (bone, p, r, out, nLead, struts) => {
      const lead = out.slice(out.length - nLead).reverse(), trail = out.slice(0, out.length - nLead + 1).reverse();
      S.add(bone, wing(out, 0.008), WINGM, { p, r, m: 1 });
      const g = [tube(lead.map(m3), lead.map((q, i) => 0.016 - i * 0.011 / (lead.length - 1)), { ring: 6, seg: 20 }), tube(trail.map(m3), trail.map(() => 0.006), { ring: 5, seg: 24 }), ball(0.03, 10, 8)];
      for (const [i0, i1] of struts) { const q0 = out[i0], q1 = out[i1]; g.push(tube([m3(q0), m3([(q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2]), m3(q1)], [0.005, 0.005, 0.005], { ring: 4, seg: 2 })); }
      S.add(bone, join(g), BRASSM, { p, r, m: 1 });
    };
    // outline [span, chord]: trailing edge from the root to the tip, then the leading edge back to the root
    wingSet('wingFL', WF, [-22, -18, 8], [[0, -0.015], [0.18, -0.07], [0.45, -0.13], [0.7, -0.125], [0.84, -0.05], [0.85, 0.03], [0.68, 0.085], [0.4, 0.08], [0.16, 0.055], [0, 0.025]], 5, [[8, 2], [7, 3]]);
    wingSet('wingHL', WH, [-10, -40, 6], [[0, -0.012], [0.14, -0.06], [0.34, -0.1], [0.52, -0.08], [0.6, -0.01], [0.56, 0.045], [0.36, 0.06], [0.14, 0.045], [0, 0.02]], 4, [[7, 2]]);

    // --- 6 thin legs that hang: black tubes, brass joints, a hook at the end ----------------------
    const rr = [0.026, 0.022, 0.024, 0.014, 0.007];
    const leg = (bone, hip, pts, fx) => {
      S.add(bone, join([tube(pts, rr, { ring: 6 }), at(aim(cone(0.012, 0.06, 5), [fx, -0.6, -0.3]), pts[4])]), BLKM, { p: hip, m: 1 });
      S.add(bone, join([at(ball(0.027, 8, 6), pts[1]), at(ball(0.033, 10, 8), pts[2]), at(ball(0.02, 8, 6), pts[3])]), BRASSM, { p: hip, m: 1 });
    };
    leg('legFL', HIP.F, [[0, 0, 0], [0.05, -0.09, 0.06], [0.12, -0.13, 0.1], [0.17, -0.27, 0.1], [0.21, -0.35, 0.08]], 0.8);
    leg('legML', HIP.M, [[0, 0, 0], [0, -0.09, 0.09], [0.02, -0.15, 0.16], [-0.02, -0.33, 0.17], [-0.03, -0.43, 0.15]], 0.3);
    leg('legHL', HIP.H, [[0, 0, 0], [-0.05, -0.07, 0.08], [-0.12, -0.1, 0.14], [-0.2, -0.32, 0.15], [-0.25, -0.45, 0.13]], -0.5);

    // --- head parts: elbowed antennae with a glow bead, sickle mandibles ---------------------------
    const AP = [[0, 0, 0], [0.03, 0.12, 0.03], [0.1, 0.22, 0.06], [0.2, 0.26, 0.09], [0.3, 0.22, 0.11]];
    S.add('antL', tube(AP, [0.015, 0.013, 0.012, 0.01, 0.007], { ring: 6 }), BLKM, { p: ANT, m: 1 });
    S.add('antL', join([at(ball(0.022, 8, 6), AP[1]), at(ball(0.016, 8, 6), AP[2]), at(ball(0.014, 8, 6), AP[3])]), BRASSM, { p: ANT, m: 1 });
    S.add('antL', ball(0.021, 8, 6), GLOWV, { p: [ANT[0] + AP[4][0], ANT[1] + AP[4][1], ANT[2] + AP[4][2]], m: 1 });
    const jaw = join([tube([[0, 0, 0], [0.06, -0.035, 0.025], [0.105, -0.085, 0], [0.115, -0.14, -0.04]], [0.03, 0.026, 0.016, 0.003], { ring: 6 }), at(aim(cone(0.012, 0.05, 5), [0.3, -1, -0.7]), [0.07, -0.055, 0.005])]);
    S.add('head', jaw, STEEL, { p: [0.9, 0.84, 0.05], m: 1, name: 'jawL' });
    // rivets on the back plate, wind-up key
    const rv = [];
    for (const x of [0.27, 0.36, 0.45]) for (const z of [-0.07, 0.07]) rv.push(at(ball(0.017, 8, 6), [x, 1.198, z]));
    S.add('body', join(rv), RIVET);
    const key = join([tube([[0, 0, 0], [0, 0.07, 0], [0, 0.14, 0]], [0.016, 0.013, 0.013], { ring: 6, seg: 4 }), ball(0.028, 8, 6), at(torus(0.042, 0.012, 18, 6), [0.047, 0.185, 0]), at(torus(0.042, 0.012, 18, 6), [-0.047, 0.185, 0]), at(ball(0.02, 8, 6), [0, 0.15, 0])]);
    S.add('body', key, BRASSM, { p: [0.19, 1.12, 0], r: [0, 0, 24], order: 'ZYX', name: 'key' });
    // compound eyes: dark glass with a violet glow
    S.eye('head', [0.84, 1.0, 0.125], 0.105, { dir: [0.45, 0.12, 0.88], sclera: '#0d0816', iris: '#3a1486', iris2: '#c58cff', pupil: 'none', size: 66, lid: BLACK, open: 64, tilt: -14, glow: 1.5, sy: 1.3, m: 1 });
  },
  anim(b, t, c) {
    const P = c.parts, a = t.a, s = t.s, h = t.h, k = t.k, mv = t.mv;
    const melee = k === 'melee', shot = k === 'shot', buff = k === 'buff', slam = k === 'slam';
    const br = Math.sin(t.p * 1.5), cock = a * (1 - s), aimK = shot ? Math.min(1, a + s) : 0, sip = buff ? Math.min(1, a + s) : 0;
    // body: hover bob, weave from side to side when it moves. It rears up to bring the stinger forward.
    b.body.position.y += br * 0.035 + Math.sin(t.w * 1.1) * 0.03 * mv + Math.sin(t.tm * 41) * 0.004 - h * 0.04
      + (melee ? cock * 0.07 + s * 0.24 : shot ? aimK * 0.19 : slam ? cock * 0.16 + s * 0.08 : sip * 0.1);
    b.body.position.x += (melee ? -cock * 0.14 + s * 0.3 : shot ? -cock * 0.05 - s * 0.14 : slam ? s * 0.08 : 0) - h * 0.1;
    b.body.position.z += Math.sin(t.w * 0.7) * 0.05 * mv;
    b.body.rotation.z = -t.sw * 0.22 - mv * 0.06 + br * 0.02 + h * 0.3
      + (melee ? cock * 0.2 + s * 0.6 : shot ? aimK * 0.6 + s * 0.1 : slam ? -cock * 0.2 : sip * 0.15);
    b.body.rotation.x = t.sl * 0.55 + Math.sin(t.w * 0.7) * 0.14 * mv;
    b.body.rotation.y = t.sl * 0.18 + t.lk * 0.12;
    // abdomen: slow sway. curl > 0 brings the hourglass down and forward under the body. The waist becomes longer to clear the thorax.
    let curl = Math.sin(t.p * 1.1) * 0.06 - t.sw * 0.14 + h * 0.25 + Math.sin(t.w * 1.1 - 1) * 0.05 * mv - t.gl * 0.05, ext = 0;
    if (melee) { curl += -cock * 0.42 + s * 1.6; ext = s; }
    else if (shot) { curl += aimK * 1.65 - s * 0.2; ext = aimK; }
    else if (slam) curl += -cock * 0.5 + s * 0.25;     // stab down at the ground. A larger angle puts the stinger below the ground.
    else curl -= sip * 0.3;
    b.waist.rotation.z = curl * 0.45; b.abd.rotation.z = curl * 0.55;
    b.abd.position.x -= ext * 0.11; b.abd.position.y -= ext * 0.03;
    const yaw = Math.sin(t.p * 0.8) * 0.09 * (1 - ext) + t.sl * 0.3;
    b.waist.rotation.y = yaw * 0.5; b.abd.rotation.y = yaw;
    // siphon: the hourglass turns on its own axis and swells, the sand burns bright
    const spin = sip * sip * 4.19, hs = Math.sin(spin / 2);
    b.glass.quaternion.set(DX * hs, DY * hs, 0, Math.cos(spin / 2));
    b.glass.scale.setScalar(1 + sip * 0.05 + Math.sin(t.tm * 9) * 0.012 * (sip + t.gl));
    const hot = Math.min(1.3, sip + t.gl * 0.4 + a * 0.2 + s * (slam ? 0.8 : 0.25)), fl = Math.sin(t.tm * 33);
    P.sandA.scale.setScalar(1 + Math.sin(t.tm * 4.5) * 0.012 + hot * 0.05);
    P.sandB.scale.setScalar(1 + Math.sin(t.tm * 4.5 + 2) * 0.012 + hot * 0.05);
    P.haloA.scale.setScalar(1 + Math.sin(t.tm * 6) * 0.07 + hot * 0.6);
    P.haloB.scale.setScalar(1 + Math.sin(t.tm * 6 + 1.6) * 0.07 + hot * 0.6);
    const sw = 1 + fl * 0.22 + hot * 1.4;
    P.stream.scale.set(sw, 1, sw);
    // stinger: it pulls in for the wind-up, thrusts out for the lunge, kicks back after the dart
    const thrust = melee ? s * 0.13 - cock * 0.05 : shot ? cock * 0.03 - s * 0.09 : slam ? s * 0.04 : 0, len = 1 + (melee ? s * 0.3 : 0), tip = thrust + 0.36 * (len - 1);
    P.sting.position.x += DX * thrust; P.sting.position.y += DY * thrust; P.sting.scale.y = len;
    P.venom.position.x += DX * tip; P.venom.position.y += DY * tip;
    P.venom.scale.setScalar(Math.max(0.05, 0.8 + Math.sin(t.tm * 7) * 0.15 + (shot ? cock * 1.8 - s * 0.7 : a * 0.5) + t.gl * 0.5 + sip * 0.6));
    // wings: very fast buzz. They stall when it is hurt, sweep back in the lunge, rise for the siphon.
    const amp = (0.5 + 0.1 * mv + 0.12 * a + 0.1 * t.gl + sip * 0.15) * (1 - h * 0.55), f1 = Math.sin(t.tm * 78) * amp, f2 = Math.sin(t.tm * 78 - 0.8) * amp * 0.85;
    const lift = a * 0.15 + sip * 0.3 + (slam ? -s * 0.3 : s * 0.1) + Math.sin(t.tm * 23) * 0.2 * h;
    const sweep = -t.sw * 0.2 - (melee ? s * 0.45 : 0) + a * 0.12 - mv * 0.08, tw = -t.sw * 0.12 + a * 0.12 - (melee ? s * 0.2 : 0);
    b.wingFL.rotation.set(-(f1 + lift), sweep + t.sl * 0.15, tw); b.wingFR.rotation.set(f1 + lift, -sweep + t.sl * 0.15, tw);
    b.wingHL.rotation.set(-(f2 + lift * 0.7), sweep * 1.2 + t.sl * 0.2, tw); b.wingHR.rotation.set(f2 + lift * 0.7, -sweep * 1.2 + t.sl * 0.2, tw);
    // legs: they dangle and trail. They open wide to let the abdomen through.
    const splay = melee ? s : shot ? aimK : slam ? s * 0.4 : 0;
    for (let i = 0; i < 6; i++) {
      const bn = b[LEGS[i]], j = i % 3, sg = i < 3 ? 1 : -1;
      bn.rotation.z = Math.sin(t.p * 1.3 + i * 1.7) * 0.07 - t.sw * (0.3 + 0.08 * j) - mv * 0.18 + Math.sin(t.w * 1.1 + i) * 0.08 * mv
        + a * (0.3 - 0.25 * j) + splay * (j === 0 ? 0.7 : j === 1 ? 0.1 : -0.5) - h * 0.3 * (1 - j);
      bn.rotation.x = -sg * (splay * 0.75 + h * 0.3 + sip * 0.25 + Math.sin(t.p * 0.9 + i) * 0.04) - t.sl * 0.3;
    }
    // head keeps its eyes on the target when the body rears up
    b.head.rotation.y = t.lk * 0.45 + t.sl * 0.1;
    b.head.rotation.z = -br * 0.03 - t.sw * 0.08 + h * 0.25 + (melee ? -cock * 0.1 - s * 0.3 : shot ? -aimK * 0.35 : -a * 0.12);
    b.head.rotation.x = Math.sin(t.p * 0.6) * 0.07 + t.sl * 0.12;
    // antennae: slow wave with sudden twitches. They lie back in the wind-up and snap forward in the strike.
    for (let i = 0; i < 2; i++) {
      const bn = i ? b.antR : b.antL, sg = i ? -1 : 1, ph = i * 1.9, tq = Math.pow(Math.max(0, Math.sin(t.tm * 2.9 + ph)), 14) * 0.4;
      bn.rotation.z = Math.sin(t.p * 2.1 + ph) * 0.07 + tq + t.sw * 0.3 + a * 0.35 - s * 0.45 + h * 0.3;
      bn.rotation.x = sg * (Math.sin(t.p * 1.3 + ph) * 0.08 + a * 0.25 + tq * 0.5) + t.sl * 0.3;
    }
    const open = Math.max(-0.08, 0.12 + Math.sin(t.p * 2.2) * 0.07 + a * 0.5 - s * 0.45 + h * 0.3 + Math.max(0, Math.sin(t.tm * 13)) * 0.12 * t.gl);
    P.jawL.rotation.y -= open; P.jawR.rotation.y += open;
    P.key.rotation.y = t.tm * 1.6 + a * 5 + sip * 6;
  }
};
