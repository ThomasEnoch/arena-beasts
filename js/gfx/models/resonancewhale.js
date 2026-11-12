/* Resonancewhale (Brasswail, the Fog Organ) - floating humpback of riveted copper plates, green patina on the belly.
   Heart piece: the brass organ pipes on its back, they glow from inside. Steam vents behind the fins, fog-lamp eyes,
   a ship's bell under the chin. Maker's mark: a tuning fork on the left tail fluke. Gale / Tide. */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lathe, ball, rbox, torus } from '../geo.js';
import { rgb, noise } from '../sculpt.js';
import { A } from '../rig.js';

const VERD = '#3f9c8a', LIGHT = '#74c8ae', DEEPV = '#2a6f66', PALE = '#8fd0b8', COPPER = '#c46a35', BRASS = '#cfa448';
const BRASSM = { col: '#d0a850', metal: 1, rough: 0.28, env: 1.2 };
const COPM = { col: '#e0b860', metal: 1, rough: 0.3, env: 1.1 };                                   // rivets and the pipe frame
const DARKM = { col: '#0c0a08', rough: 0.95, noOut: true };
const SINGM = { col: '#ffd486', rough: 0.7, glow: '#ffb44a', glowK: 3.2, noOut: true };            // heart piece: the light inside the pipes
const IRONM = { col: '#2a2622', metal: 0.8, rough: 0.5 };
const MARKM = { col: '#f0d27a', metal: 1, rough: 0.22, env: 1.3, glow: '#ffcf70', glowK: 0.35, noOut: true };
const BALEEN = { col: '#e2cf9a', metal: 0.4, rough: 0.4 };
const STEAM = { col: '#eef5f7', op: 0.42, rough: 1, noOut: true };
const TAIL = ['tail1', 'tail2', 'tail3', 'fluke'];
const cl = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
// organ pipes on the back: [x, z, height above the rail]
const PIPES = [[0.43, 0.05, 0.17], [0.33, -0.055, 0.25], [0.225, 0.055, 0.34], [0.115, -0.055, 0.43], [0.0, 0.055, 0.5], [-0.115, -0.055, 0.46], [-0.225, 0.055, 0.38], [-0.33, -0.055, 0.3], [-0.43, 0.055, 0.22], [-0.52, -0.045, 0.15]];
const RAIL = 1.43, BASE = 1.15;

function join(list) {
  return mergeGeometries(list.map(g => { const q = g.index ? g.toNonIndexed() : g.clone(); q.deleteAttribute('uv'); if (!q.getAttribute('normal')) q.computeVertexNormals(); return q; }));
}

export default {
  id: 'resonancewhale', rim: '#bff2e0', focus: 'pipes', top: 1.98, rough: 0.58,
  opts: { cell: 0.028, mottle: 0.16, mottleF: 8 },
  // spring bones. The whale is heavy: low stiffness and low damping, so the parts answer late and swing for a long time.
  dyn: [
    { b: ['tail1', 'tail2', 'tail3', 'fluke'], k: 24, d: 3, amt: 0.42, drag: 1.2 },
    { b: ['fin2L', 'fin3L'], k: 34, d: 3.6, amt: 0.5, drag: 2.2 }, { b: ['fin2R', 'fin3R'], k: 31, d: 3.4, amt: 0.5, drag: 2.2 },
    { b: ['lobeL'], k: 40, d: 4, amt: 0.5, drag: 2.5 }, { b: ['lobeR'], k: 37, d: 4, amt: 0.5, drag: 2.5 },
    { b: ['bell'], k: 28, d: 2.4, amt: 1, drag: 0.6, dir: [0, -1, 0] }, { b: ['clap'], k: 22, d: 2, amt: 0.9, drag: 0.3, dir: [0, -1, 0] }
  ],
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 1.0, 0]).bone('head', 'body', [0.3, 1.05, 0]).bone('jaw', 'head', [0.36, 0.9, 0])
      .bone('finL', 'body', [0.3, 0.8, 0.36], { m: 1 }).bone('fin2L', 'finL', [0.18, 0.62, 0.68], { m: 1 }).bone('fin3L', 'fin2L', [0.12, 0.52, 0.88], { m: 1 })
      .bone('tail1', 'body', [-0.45, 1.0, 0]).bone('tail2', 'tail1', [-0.78, 1.02, 0]).bone('tail3', 'tail2', [-1.03, 1.05, 0]).bone('fluke', 'tail3', [-1.22, 1.08, 0])
      .bone('lobeL', 'fluke', [-1.27, 1.08, 0.07], { m: 1 })
      .bone('pipes', 'body', [-0.04, 1.4, 0]).bone('bell', 'jaw', [1.0, 0.655, 0]);

    const O = (a, b) => Object.assign({}, a, b), PL = { k: 0.035, gloss: 0.5, metal: 0.9 }, FIN = { gloss: 0.45, metal: 0.9 };
    const BR = { col: BRASS, metal: 1, gloss: 0.6, k: 0.014 }, CU = BR;
    S.color(COPPER);
    // hull, tail stock, head, wide lower jaw. The mouth is a cut with a warm glow inside.
    S.ell('body', [0.05, 1.0, 0], [0.78, 0.42, 0.42], PL);
    S.tube(['tail1', 'tail2', 'tail3'], [[-0.45, 1.0, 0], [-0.78, 1.02, 0], [-1.03, 1.05, 0], [-1.23, 1.08, 0]], [0.36, 0.25, 0.155, 0.09], { k: 0.05, gloss: 0.5, metal: 0.9 });
    S.ell('head', [0.58, 1.06, 0], [0.56, 0.3, 0.39], O(PL, { k: 0.04 }));
    S.ell('jaw', [0.56, 0.82, 0], [0.6, 0.25, 0.4], { col: PALE, k: 0.03, gloss: 0.12 });
    S.box('jaw', [0.8, 0.93, 0], [0.42, 0.03, 0.5], 0.02, { sub: 1, col: '#ff9a3a', glow: 1.3, rot: [0, 0, 6], k: 0.014 });
    S.cap('jaw', [1.02, 0.78, 0], [1.14, 0.84, 0], 0.07, 0.05, CU);
    // the hook of the ship's bell under the chin
    S.ell('jaw', [1.0, 0.685, 0], [0.06, 0.035, 0.05], BR);
    // blowhole: a brass collar on the head
    S.tor('head', [0.34, 1.335, 0], 0.06, 0.026, O(BR, { rot: [0, 0, -8] }));
    S.ell('head', [0.34, 1.35, 0], [0.045, 0.04, 0.045], { sub: 1, col: '#1a120c', k: 0.01 });
    // tubercles on the head: copper rivet heads
    for (const [x, z] of [[0.72, 0.14], [0.87, 0.13], [1.01, 0.1], [0.8, 0], [0.95, 0], [1.08, 0]]) {
      const y = 1.06 + 0.3 * Math.sqrt(1 - Math.pow((x - 0.58) / 0.56, 2) - Math.pow(z / 0.39, 2));
      S.ell('head', [x, y, z], 0.042, O(CU, { m: z ? 1 : 0, k: 0.01 }));
    }
    // brass rail for the pipes, dorsal hump, bands on the tail
    S.box('body', [-0.045, 1.385, 0], [0.54, 0.05, 0.125], 0.04, BR);
    S.ell('body', [-0.66, 1.3, 0], [0.13, 0.09, 0.045], CU);
    S.tor('tail2', [-0.78, 1.02, 0], 0.25, 0.034, O(CU, { rot: [0, 0, 94] }));
    S.tor('tail3', [-1.03, 1.05, 0], 0.155, 0.03, O(CU, { rot: [0, 0, 98] }));
    S.tor('body', [-0.45, 1.0, 0], 0.355, 0.034, O(CU, { rot: [0, 0, 90] }));
    // flukes
    S.ell('lobeL', [-1.35, 1.08, 0.25], [0.2, 0.05, 0.36], O(FIN, { m: 1, rot: [0, -28, 0], k: 0.04 }));
    S.ell('fluke', [-1.26, 1.08, 0], [0.1, 0.06, 0.1], CU);
    // pectoral fins: 2 sections, brass knobs on the front edge
    S.ell('finL', [0.25, 0.72, 0.5], [0.16, 0.052, 0.23], O(FIN, { m: 1, rot: [28, -16, 0], k: 0.05 }));
    S.ell('fin2L', [0.166, 0.598, 0.754], [0.13, 0.05, 0.19], O(FIN, { m: 1, rot: [30, -20, 0], k: 0.04 }));
    S.ell('fin3L', [0.074, 0.443, 1.006], [0.112, 0.045, 0.19], O(FIN, { m: 1, rot: [30, -20, 0], k: 0.04 }));
    S.ell('finL', [0.3, 0.8, 0.38], [0.11, 0.09, 0.08], O(CU, { m: 1 }));
    for (const [bn, x, y, z] of [['finL', 0.385, 0.7, 0.52], ['fin2L', 0.3, 0.61, 0.7], ['fin3L', 0.235, 0.5, 0.9], ['fin3L', 0.15, 0.41, 1.06]]) S.ell(bn, [x, y, z], 0.04, O(CU, { m: 1, k: 0.01 }));
    // portholes: brass ring, warm glass. Brass ring around each eye.
    for (const x of [-0.27, -0.02, 0.23]) {
      const z = 0.42 * Math.sqrt(1 - Math.pow((x - 0.05) / 0.78, 2) - 0.0036);
      S.tor('body', [x, 0.975, z], 0.07, 0.028, O(BR, { m: 1, rot: [90, 0, 0] }));
      S.ell('body', [x, 0.975, z - 0.005], [0.06, 0.06, 0.025], { m: 1, col: '#ffd890', glow: 1.2, k: 0.008 });
    }
    // fog-lamp eyes: a brass lamp housing with a bezel and a small hood
    S.ell('head', [0.51, 0.99, 0.38], [0.105, 0.105, 0.05], O(BR, { m: 1, k: 0.012 }));
    S.tor('head', [0.514, 0.99, 0.412], 0.088, 0.02, O(BR, { m: 1, rot: [90, 8, 0], k: 0.008 }));
    S.box('head', [0.514, 1.085, 0.42], [0.1, 0.016, 0.05], 0.012, O(BR, { m: 1, rot: [-8, 8, 0], k: 0.008 }));
    // steam vents behind the fins: a brass flange on the hull for each nozzle
    S.ell('body', [0.03, 0.8, 0.365], [0.085, 0.07, 0.03], O(BR, { m: 1, rot: [-28, 0, 0], k: 0.01 }));
    S.ell('body', [-0.13, 0.79, 0.35], [0.068, 0.056, 0.03], O(BR, { m: 1, rot: [-28, -6, 0], k: 0.01 }));

    // --- paint: plate seams with patina in them, throat pleats, patina --------------------------------
    const SE = { paint: 1, col: '#3f9f8a', metal: 0, gloss: 0.08, cb: 0.013 };
    for (const x of [-0.2, 0.12]) S.ell('body', [x, 1.0, 0], [0.011, 0.5, 0.5], SE);
    S.ell('head', [0.48, 1.2, 0], [0.011, 0.22, 0.5], SE);
    S.ell('head', [0.84, 1.16, 0], [0.011, 0.2, 0.5], SE);
    S.ell('body', [-0.1, 1.16, 0], [0.62, 0.011, 0.5], SE);
    S.ell('body', [-0.2, 0.82, 0], [0.5, 0.011, 0.5], SE);
    S.ell('tail1', [-0.62, 1.01, 0], [0.011, 0.4, 0.4], O(SE, { rot: [0, 0, 4] }));
    S.ell('tail2', [-0.91, 1.035, 0], [0.011, 0.3, 0.3], O(SE, { rot: [0, 0, 7] }));
    for (const z of [0, 0.1, 0.2, 0.3]) {
      S.ell('jaw', [0.55, 0.67, z], [0.56, 0.11, 0.012], O(SE, { m: z ? 1 : 0, col: '#2f7f70' }));
      S.ell('body', [-0.12, 0.64, z * 0.9], [0.42, 0.08, 0.012], O(SE, { m: z ? 1 : 0, col: '#2f7f70' }));
    }
    // patina: it covers the belly, it grows out of the seams and it runs down below the rivets
    const VL = rgb(VERD), LL = rgb(LIGHT);
    S.paint((p, n, c, info) => {
      if (info.glow > 0.05 || info.metal < 0.6 || c[1] > c[0] * 0.5) return;       // only the bare copper plates
      const n1 = noise(p.x * 3.3 + 5, p.y * 3.3, p.z * 3.3 + 2), n2 = noise(p.x * 9 + 1, p.y * 4 + 4, p.z * 9);
      let w = (0.98 - p.y) / 0.24 - n.y * 0.4 + (n1 - 0.5) * 2.6 + (n2 - 0.5) * 0.9;
      w = w < 0 ? 0 : w > 1 ? 1 : w; w = w * w * (3 - 2 * w);
      const m = 0.75 + 0.5 * n2;
      c[0] += (VL[0] + (LL[0] - VL[0]) * n2 - c[0]) * w * m; c[1] += (VL[1] + (LL[1] - VL[1]) * n2 - c[1]) * w; c[2] += (VL[2] + (LL[2] - VL[2]) * n2 - c[2]) * w;
      info.metal *= 1 - w; info.gloss *= 1 - 0.8 * w;
      // warm wear on the bare copper: darker in the folds, brighter on the back
      if (w < 0.5) { const e = 0.72 + 0.4 * info.ao * info.ao; c[0] *= e; c[1] *= e * 0.96; c[2] *= e * 0.9; }
    });
    S.ell('body', [-0.3, 0.6, 0], [0.7, 0.1, 0.4], { paint: 1, col: DEEPV, cb: 0.08, op: 0.6 });
    // maker's mark: the stamped plate for the tuning fork on the left fluke
    S.ell('fluke', [-1.36, 1.1, 0.25], [0.085, 0.06, 0.15], { paint: 1, col: '#1f5a50', gloss: 0.1, metal: 0, cb: 0.012, rot: [0, -28, 0] });

    // --- rigid parts ------------------------------------------------------------------------------
    // rivet rows beside the plate seams
    const riv = [], rb = ball(0.021, 6, 4);
    for (const x0 of [-0.2, 0.12]) for (const dx of [-0.04, 0.04]) for (let i = 0; i < 18; i++) {
      const q = (i + 0.5) / 18 * Math.PI * 2, x = x0 + dx, f = Math.sqrt(1 - Math.pow((x - 0.05) / 0.78, 2)), y = 1.0 + 0.42 * f * Math.sin(q), z = 0.42 * f * Math.cos(q);
      if (y > 1.33 || Math.abs(y - 0.975) < 0.11) continue;
      riv.push(rb.clone().translate(x, y, z));
    }
    for (let i = 0; i < 9; i++) for (const sz of [1, -1]) { const x = -0.6 + i * 0.105, f = Math.sqrt(1 - Math.pow((x - 0.05) / 0.78, 2) - 0.181); riv.push(rb.clone().translate(x, 1.2, 0.42 * f * sz)); }
    S.add('body', join(riv), COPM, { p: [0, 0, 0] });
    // organ pipes: each pipe has a dark opening and a dark mouth slot. A pipe slides up from its socket.
    PIPES.forEach(([x, z, hgt], i) => {
      const r = 0.042 + hgt * 0.062, H = RAIL - BASE + hgt, c0 = RAIL - BASE + 0.012;
      const pipe = lathe([[r, 0], [r, c0], [r * 1.28, c0 + 0.008], [r * 1.28, c0 + 0.04], [r, c0 + 0.05], [r, H - 0.035], [r * 1.16, H - 0.025], [r * 1.16, H], [r * 0.82, H], [r * 0.82, H - 0.08]], 14);
      S.add('pipes', pipe, BRASSM, { p: [x, BASE, z], name: 'p' + i });
      const hole = join([lathe([[r * 0.83, H - 0.03], [0, H - 0.03]], 12), lathe([[r * 0.8, H - 0.003], [r * 0.8, H - 0.08]], 12), rbox(r * 1.3, 0.03 + hgt * 0.03, r * 0.5).translate(0, c0 + 0.1 + hgt * 0.1, (z > 0 ? 1 : -1) * r * 0.82)]);
      S.add('pipes', hole, SINGM, { p: [x, BASE, z], name: 'o' + i });
    });
    S.add('pipes', join([rbox(1.04, 0.032, 0.19).translate(-0.045, RAIL + 0.1, 0), rbox(0.03, 0.1, 0.03).translate(0.49, RAIL + 0.05, 0), rbox(0.03, 0.1, 0.03).translate(-0.58, RAIL + 0.05, 0)]), COPM, { p: [0, 0, 0] });
    // steam puffs above 4 pipes
    [1, 3, 5, 7].forEach((pi, i) => S.add('body', ball(0.1, 12, 8), STEAM, { p: [PIPES[pi][0], RAIL + PIPES[pi][2] + 0.06, PIPES[pi][1]], name: 'st' + i }));
    // baleen: a comb of plates under the upper lip
    const comb = [];
    for (let i = 0; i < 10; i++) {
      const x = 0.5 + i * 0.062, z = 0.39 * Math.sqrt(Math.max(0.04, 0.81 - Math.pow((x - 0.58) / 0.56, 2))) - 0.035, y = 0.93 + (x - 0.8) * 0.105;
      comb.push(rbox(0.03, 0.15, 0.014).translate(x, y - 0.03, z));
    }
    S.add('head', join(comb), BALEEN, { p: [0, 0, 0], m: 1 });
    // steam vents behind the fins: 2 brass nozzles on each side that point out and back, a dark throat, a puff of steam
    const noz = (r, l) => lathe([[r * 1.25, 0], [r * 1.25, 0.012], [r, 0.02], [r, l - 0.02], [r * 1.22, l - 0.012], [r * 1.22, l], [r * 0.78, l], [r * 0.78, l - 0.05]], 12);
    const thr = (r, l) => lathe([[r * 0.8, l - 0.03], [0, l - 0.03]], 10);
    S.add('body', join([noz(0.06, 0.12), noz(0.048, 0.1).translate(-0.165, 0.02, 0)]), BRASSM, { p: [0.03, 0.8, 0.37], r: [62, 0, 24], m: 1 });
    S.add('body', join([thr(0.06, 0.12), thr(0.048, 0.1).translate(-0.165, 0.02, 0)]), DARKM, { p: [0.03, 0.8, 0.37], r: [62, 0, 24], m: 1 });
    S.add('body', ball(0.075, 10, 8), STEAM, { p: [-0.06, 0.86, 0.48], m: 1, name: 'vsL' });
    // the ship's bell under the chin, with its clapper
    S.add('bell', join([lathe([[0.058, -0.1], [0.094, -0.178], [0.112, -0.19], [0.106, -0.172], [0.08, -0.135], [0.066, -0.085], [0.054, -0.04], [0.034, -0.016], [0.0001, -0.008]], 18),
      torus(0.022, 0.008, 12, 6).translate(0, 0.008, 0), torus(0.107, 0.008, 18, 6).rotateX(Math.PI / 2).translate(0, -0.176, 0), torus(0.07, 0.005, 16, 6).rotateX(Math.PI / 2).translate(0, -0.1, 0)]), BRASSM, { p: [1.0, 0.655, 0] });
    S.add('bell', join([ball(0.03, 10, 8).translate(0, -0.185, 0), rbox(0.01, 0.16, 0.01).translate(0, -0.1, 0)]), IRONM, { p: [1.0, 0.64, 0], name: 'clap' });
    // maker's mark: a tuning fork, stamped on the left tail fluke
    S.add('lobeL', join([rbox(0.014, 0.012, 0.085).translate(0, 0, -0.07), rbox(0.064, 0.012, 0.016).translate(0, 0, -0.022), rbox(0.014, 0.012, 0.12).translate(0.025, 0, 0.038), rbox(0.014, 0.012, 0.12).translate(-0.025, 0, 0.038), ball(0.014, 8, 6).translate(0, 0, -0.115)]),
      MARKM, { p: [-1.36, 1.133, 0.25], r: [0, -28, 0] });
    S.eye('head', [0.515, 0.99, 0.408], 0.076, { dir: [0.14, 0.02, 0.99], sclera: '#2a1a0a', iris: '#ffb648', iris2: '#ffe9a8', pupil: 'round', size: 58, lid: '#8a6a2c', open: 40, tilt: 9, glow: 1.2, m: 1 });
  },
  anim(b, t, c) {
    // u = the ultimate, Symphony of the Deep. It takes the place of the wind-up and the strike poses.
    const u = A.ease(t.u || 0), nu = 1 - u, swell = 0.5 + 0.5 * Math.sin(t.tm * 2.1);
    const P = c.parts, a = t.a * nu, s = t.s * nu, h = t.h, k = t.k, shot = k === 'shot', slam = k === 'slam', buff = k === 'buff', melee = k === 'melee';
    const bob = Math.sin(t.p * 0.8), as = Math.min(1, a + s), fol = s * (1 - s) * 4;
    // motion of the body: speed, push (it accelerates), brake (it stops), turn, rise. The whale is heavy: its parts answer late.
    const vm = Math.hypot(t.vf || 0, t.vs || 0), tn = (t.tn || 0) * nu, known = vm > 0.05 || Math.abs(t.tn || 0) > 0.05;
    const spd = (known ? Math.min(1, vm / 2.6) : t.mv) * nu, fwd = known ? cl((t.vf || 0) / 2.6, -1, 1) : t.mv, side = cl((t.vs || 0) / 2.6, -1, 1) * nu;
    const acc = cl((t.af || 0) / 22, -1, 1) * nu, push = Math.max(0, acc), brake = Math.max(0, -acc), rise = cl((t.va || 0) / 3, -1, 1);
    const hx = (t.hx || 0) * h, hz = (t.hz || 0) * h;
    const rest = cl(1 - spd * 1.5 - a - s - u, 0, 1), dr1 = Math.sin(t.tm * 0.43) * Math.sin(t.tm * 0.19 + 1), dr2 = Math.sin(t.tm * 0.31 + 2) * Math.sin(t.tm * 0.13);
    // the swim wave: it starts in the head, it goes through the hull and it grows to the flukes. The beat is slow.
    // It is strong when the whale accelerates.
    const ph = t.p * 0.9 + t.w * 0.33, amp = 0.45 + spd * 0.75 + push * 0.8 + a * 0.3 + Math.abs(tn) * 0.3;
    // float, recoil and lunge. Ultimate: the body lifts and arches, the head and the flukes go up.
    b.body.position.y += bob * 0.045 + (slam ? -a * 0.06 + s * 0.1 : 0) + h * 0.03 + u * (0.1 + swell * 0.04) + Math.sin(ph + 0.9) * 0.012 * amp;
    b.body.position.x += (melee ? s * 0.3 - a * 0.14 : shot ? a * 0.05 - s * 0.1 : 0) - h * 0.03 + hx * 0.05;
    b.body.rotation.z = Math.sin(t.p * 0.8 - 1) * 0.03 + Math.sin(ph + 0.6) * 0.028 * amp + (shot ? a * 0.1 - s * 0.03 : melee ? a * 0.08 - s * 0.12 : slam ? -a * 0.05 : 0) + h * 0.04 - hx * 0.07 + u * 0.1 + rise * 0.08;
    b.body.rotation.x = dr1 * 0.035 * rest + hz * 0.12 + h * 0.08 * Math.sin(t.tm * 19);
    b.body.rotation.y = dr2 * 0.03 * rest + Math.sin(ph * 0.5 + 1) * 0.02 * amp * spd;
    // the hull swells: deep breath for the bellow, a large bulge before the steam burst, a slow full breath for the symphony
    const bulge = (slam ? a * 0.11 - s * 0.05 : shot ? a * 0.06 - s * 0.03 : buff ? Math.sin(t.tm * 9) * 0.015 * as : 0) + Math.sin(t.p * 0.8 + 0.5) * 0.012 + u * (0.04 + swell * 0.05);
    b.body.scale.set(1 + bulge * 0.4, 1 + bulge, 1 + bulge);
    // head and jaw: the head goes against the swim wave and it leads a turn. The jaw opens wide for the bellow, it snaps for the bite.
    b.head.rotation.z = bob * 0.015 + Math.sin(ph + 1.5) * 0.04 * amp + (shot ? a * 0.08 + s * 0.16 - fol * 0.06 : melee ? -a * 0.08 + s * 0.1 : 0) + h * 0.05 - hx * 0.14 + u * (0.2 + swell * 0.05) - brake * 0.05;
    // (the rig turns the head to the aim. The head of the whale is half of its hull, so it takes only a part of that turn.)
    b.head.rotation.y = t.lk * 0.12 * nu - tn * 0.16 - side * 0.05 - hz * 0.25 + dr2 * 0.07 * rest + cl((t.hd || 0) * 0.7, -0.8, 0.8) * 0.55;
    b.head.rotation.x = dr1 * 0.03 * rest - tn * 0.05 + hz * 0.08;
    b.jaw.rotation.z = -Math.min(0.9, 0.03 + Math.max(0, Math.sin(t.p * 0.4)) * 0.05 + (shot ? a * 0.06 + s * 0.64 : melee ? a * 0.5 + s * 0.08 : slam ? s * 0.25 : buff ? as * 0.14 + Math.sin(t.tm * 9) * 0.03 * as : 0) + h * 0.25 + push * 0.06 + u * (0.56 + swell * 0.1));
    b.jaw.rotation.z -= b.head.rotation.z * 0.6;
    // the ship's bell hangs plumb below the chin (the spring bones make it swing). It rings on a strike.
    const ring = Math.sin(t.tm * 26) * (s * 0.5 + h * 0.4) + Math.sin(t.tm * 6.3) * u * 0.3;
    b.bell.rotation.z = -b.jaw.rotation.z - b.head.rotation.z - b.body.rotation.z + Math.sin(t.p * 0.8 + 1.2) * 0.04 + ring;
    b.bell.rotation.x = -b.body.rotation.x + Math.sin(t.p * 0.55) * 0.03;
    P.clap.rotation.z += Math.sin(t.p * 0.8 + 2.4) * 0.08 - ring * 0.9;
    // pectoral fins: 3 sections that scull. The stroke goes from the root to the tip, and the blade turns with the stroke.
    // The 2 sides are not in step. In a turn the outer fin lifts and the inner fin goes down. Up in the wind-up, down in the strike.
    const sc = t.p * 0.8 + t.w * 0.3, fa = 0.14 + spd * 0.13 + push * 0.22 + Math.abs(rise) * 0.15, bank = tn * 0.32 + side * 0.2;
    const pose1 = -a * 0.4 + s * 0.45 - (buff ? as * 0.35 : 0) - h * 0.3 - u * (0.62 + swell * 0.12) + brake * 0.3 - push * 0.12 - rise * 0.25;
    const pose2 = -a * 0.3 + s * 0.35 + fol * 0.15 - (buff ? as * 0.25 : 0) - u * (0.3 + swell * 0.1) + brake * 0.2 - rise * 0.2;
    const sweep = -(fwd * spd * 0.22 + push * 0.25) + brake * 0.35 + a * 0.15 - s * 0.25 + u * 0.3;
    for (const sd of ['L', 'R']) {
      const sg = sd === 'L' ? 1 : -1, po = sg > 0 ? 0 : 0.55, f1 = b['fin' + sd], f2 = b['fin2' + sd], f3 = b['fin3' + sd];
      f1.rotation.x = sg * (-Math.sin(sc + 0.6 + po) * fa + pose1) + bank + hz * 0.2;
      f2.rotation.x = sg * (-Math.sin(sc - 0.3 + po) * fa * 1.2 + pose2) + bank * 0.4;
      f3.rotation.x = sg * (-Math.sin(sc - 1.2 + po) * fa * 1.3 + pose2 * 0.6);
      f1.rotation.y = sg * sweep - tn * 0.12;
      f1.rotation.z = Math.cos(sc + 0.6 + po) * fa * 0.7 + push * 0.15 - brake * 0.25;
      f3.rotation.z = Math.cos(sc - 1.2 + po) * fa * 0.5;
    }
    // tail: the wave moves to the flukes. It curves into a turn. The fluke lobes bend behind the stroke.
    for (let i = 0; i < 4; i++) {
      const bn = b[TAIL[i]];
      bn.rotation.z = Math.sin(ph - i * 0.8) * (0.06 + i * 0.045) * amp + (melee || shot ? -a * 0.07 + s * 0.1 + fol * 0.05 : slam ? a * 0.06 - s * 0.08 : 0) + h * 0.04 + hx * 0.05 - u * (0.2 + i * 0.03) - brake * 0.04 + rise * 0.05;
      bn.rotation.y = tn * 0.13 + side * 0.07 + Math.sin(t.p * 0.45 - i * 0.6) * 0.03 - hz * 0.07 * (i + 1);
    }
    const lb = Math.cos(ph - 3.1) * 0.3 * amp;
    b.lobeL.rotation.z = lb + tn * 0.18 + dr1 * 0.05 - u * 0.1; b.lobeR.rotation.z = Math.cos(ph - 3.3) * 0.3 * amp - tn * 0.18 - dr1 * 0.05 - u * 0.1;
    b.lobeL.rotation.x = -lb * 0.3; b.lobeR.rotation.x = lb * 0.3;
    // organ pipes: slow breath, a chord wave, a jump for the steam burst. Ultimate: a tall wave runs along the back.
    b.pipes.position.y += slam ? -a * 0.02 : 0;
    for (let i = 0; i < PIPES.length; i++) {
      let e = Math.sin(t.p * 1.6 + i * 0.9) * 0.012 + t.gl * 0.03 * (1 + Math.sin(t.tm * 5 + i * 1.7)) + push * 0.02 * (1 + Math.sin(t.tm * 9 + i * 2.1));
      if (buff) e += as * (0.05 + Math.sin(t.tm * 7 + i * 1.3) * 0.05);
      if (slam) e += -a * 0.06 + s * (0.14 + (i % 3) * 0.05);
      if (shot) e += s * 0.025 * Math.sin(t.tm * 42 + i * 2) + a * 0.02;
      e += u * (0.1 + 0.1 * Math.sin(t.tm * 6.5 - i * 0.75));
      P['p' + i].position.y += e; P['o' + i].position.y += e;
      const g = 1 + u * 0.25 * Math.max(0, Math.sin(t.tm * 6.5 - i * 0.75));
      P['o' + i].scale.set(g, 1, g);
    }
    // steam: each puff rises, grows and fades in a loop. It stays behind when the whale moves. The burst makes all puffs large.
    for (let i = 0; i < 4; i++) {
      const p = P['st' + i], f = (t.tm * (0.42 + t.gl * 0.3 + u * 0.5 + push * 0.4) + i * 0.27) % 1, burst = slam ? s : 0;
      p.position.y += f * (0.42 + u * 0.3) + burst * 0.3 + (slam ? -a * 0.05 : 0) + u * 0.12; p.position.x -= f * (0.06 + fwd * spd * 0.3); p.position.z -= f * (side * 0.25 + tn * 0.2);
      p.scale.setScalar(Math.max(0.001, Math.pow(Math.sin(Math.PI * f), 0.6) * (0.45 + f * 0.9) * (1 + t.gl * 0.5 + a * 0.3 + u * 0.7 + push * 0.5 + (buff ? as * 0.4 : 0)) * (slam ? 1 - a * 0.7 : 1) + burst * 2.4));
    }
    // steam vents behind the fins: short puffs that go out and back. They are strong when it accelerates or sings.
    for (const sd of [1, -1]) {
      const p = P[sd > 0 ? 'vsL' : 'vsR'], f = (t.tm * (0.55 + spd * 0.4 + push * 0.6 + u * 0.6) + (sd > 0 ? 0 : 0.5)) % 1, pw = 0.5 + spd * 0.35 + push * 0.8 + as * 0.5 + u * 0.8 + Math.max(0, -tn * sd) * 0.5;
      p.position.x -= f * (0.3 + fwd * spd * 0.3) * pw; p.position.y += f * 0.14 * pw; p.position.z += sd * f * 0.2 * pw;
      p.scale.setScalar(Math.max(0.001, Math.pow(Math.sin(Math.PI * f), 0.7) * (0.4 + f * 1.1) * pw));
    }
  }
};
