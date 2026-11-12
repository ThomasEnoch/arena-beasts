/* Resonancewhale - floating humpback of riveted copper plates with organ pipes on its back. Tide / Gale. */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lathe, ball, rbox } from '../geo.js';

const VERD = '#3f9c8a', LIGHT = '#74c8ae', DEEPV = '#2a6f66', PALE = '#a4dac3', COPPER = '#c8703a', BRASS = '#c9a04a';
const BRASSM = { col: '#d0a850', metal: 1, rough: 0.28, env: 1.2 };
const COPM = { col: '#c97a44', metal: 1, rough: 0.35, env: 1 };
const DARKM = { col: '#0c0a08', rough: 0.95, noOut: true };
const BALEEN = { col: '#e2cf9a', metal: 0.4, rough: 0.4 };
const STEAM = { col: '#eef5f7', op: 0.42, rough: 1, noOut: true };
const TAIL = ['tail1', 'tail2', 'tail3', 'fluke'];
// organ pipes on the back: [x, z, height above the rail]
const PIPES = [[0.43, 0.05, 0.17], [0.33, -0.055, 0.25], [0.225, 0.055, 0.34], [0.115, -0.055, 0.43], [0.0, 0.055, 0.5], [-0.115, -0.055, 0.46], [-0.225, 0.055, 0.38], [-0.33, -0.055, 0.3], [-0.43, 0.055, 0.22], [-0.52, -0.045, 0.15]];
const RAIL = 1.43, BASE = 1.15;

function join(list) {
  return mergeGeometries(list.map(g => { const q = g.index ? g.toNonIndexed() : g.clone(); q.deleteAttribute('uv'); if (!q.getAttribute('normal')) q.computeVertexNormals(); return q; }));
}

export default {
  id: 'resonancewhale', rim: '#bff2e0', focus: 'pipes', top: 1.98, rough: 0.58,
  opts: { cell: 0.028, mottle: 0.16, mottleF: 8 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 1.0, 0]).bone('head', 'body', [0.3, 1.05, 0]).bone('jaw', 'body', [0.36, 0.9, 0])
      .bone('finL', 'body', [0.3, 0.8, 0.36], { m: 1 }).bone('fin2L', 'finL', [0.18, 0.62, 0.68], { m: 1 })
      .bone('tail1', 'body', [-0.45, 1.0, 0]).bone('tail2', 'tail1', [-0.78, 1.02, 0]).bone('tail3', 'tail2', [-1.03, 1.05, 0]).bone('fluke', 'tail3', [-1.22, 1.08, 0])
      .bone('pipes', 'body', [-0.04, 1.4, 0]);

    const O = (a, b) => Object.assign({}, a, b), PL = { k: 0.035, gloss: 0.12 };
    const CU = { col: COPPER, metal: 1, gloss: 0.55, k: 0.014 }, BR = { col: BRASS, metal: 1, gloss: 0.6, k: 0.014 };
    S.color(VERD);
    // hull, tail stock, head, wide lower jaw. The mouth is a cut with a warm glow inside.
    S.ell('body', [0.05, 1.0, 0], [0.78, 0.42, 0.42], PL);
    S.tube(['tail1', 'tail2', 'tail3'], [[-0.45, 1.0, 0], [-0.78, 1.02, 0], [-1.03, 1.05, 0], [-1.23, 1.08, 0]], [0.36, 0.25, 0.155, 0.09], { k: 0.05, gloss: 0.12 });
    S.ell('head', [0.58, 1.06, 0], [0.56, 0.3, 0.39], O(PL, { k: 0.04 }));
    S.ell('jaw', [0.56, 0.82, 0], [0.6, 0.25, 0.4], { col: PALE, k: 0.03, gloss: 0.12 });
    S.box('jaw', [0.8, 0.93, 0], [0.42, 0.03, 0.5], 0.02, { sub: 1, col: '#ff9a3a', glow: 2.3, rot: [0, 0, 6], k: 0.014 });
    S.cap('jaw', [1.02, 0.78, 0], [1.14, 0.84, 0], 0.07, 0.05, CU);
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
    S.ell('fluke', [-1.33, 1.08, 0.22], [0.17, 0.045, 0.3], { m: 1, rot: [0, -28, 0], k: 0.04, gloss: 0.12 });
    S.ell('fluke', [-1.26, 1.08, 0], [0.1, 0.06, 0.1], CU);
    // pectoral fins: 2 sections, copper knobs on the front edge
    S.ell('finL', [0.25, 0.72, 0.5], [0.15, 0.05, 0.22], { m: 1, rot: [28, -16, 0], k: 0.05, gloss: 0.12 });
    S.ell('fin2L', [0.12, 0.52, 0.88], [0.115, 0.046, 0.3], { m: 1, rot: [30, -20, 0], k: 0.04, gloss: 0.12 });
    S.ell('finL', [0.3, 0.8, 0.38], [0.11, 0.09, 0.08], O(CU, { m: 1 }));
    for (const [bn, x, y, z] of [['finL', 0.385, 0.7, 0.52], ['fin2L', 0.3, 0.61, 0.7], ['fin2L', 0.235, 0.5, 0.9], ['fin2L', 0.15, 0.41, 1.06]]) S.ell(bn, [x, y, z], 0.04, O(CU, { m: 1, k: 0.01 }));
    // portholes: brass ring, warm glass. Brass ring around each eye.
    for (const x of [-0.27, -0.02, 0.23]) {
      const z = 0.42 * Math.sqrt(1 - Math.pow((x - 0.05) / 0.78, 2) - 0.0036);
      S.tor('body', [x, 0.975, z], 0.07, 0.028, O(BR, { m: 1, rot: [90, 0, 0] }));
      S.ell('body', [x, 0.975, z - 0.005], [0.06, 0.06, 0.025], { m: 1, col: '#ffd890', glow: 1.9, k: 0.008 });
    }
    S.tor('head', [0.5, 0.99, 0.365], 0.066, 0.022, O(BR, { m: 1, rot: [90, 12, 0] }));

    // --- paint: plate seams in bare copper, throat pleats, patina --------------------------------
    const SE = { paint: 1, col: '#d68246', metal: 1, gloss: 0.7, cb: 0.011 };
    for (const x of [-0.2, 0.12]) S.ell('body', [x, 1.0, 0], [0.011, 0.5, 0.5], SE);
    S.ell('head', [0.48, 1.2, 0], [0.011, 0.22, 0.5], SE);
    S.ell('head', [0.84, 1.16, 0], [0.011, 0.2, 0.5], SE);
    S.ell('body', [-0.1, 1.16, 0], [0.62, 0.011, 0.5], SE);
    S.ell('body', [-0.2, 0.82, 0], [0.5, 0.011, 0.5], SE);
    S.ell('tail1', [-0.62, 1.01, 0], [0.011, 0.4, 0.4], O(SE, { rot: [0, 0, 4] }));
    S.ell('tail2', [-0.91, 1.035, 0], [0.011, 0.3, 0.3], O(SE, { rot: [0, 0, 7] }));
    for (const z of [0, 0.1, 0.2, 0.3]) {
      S.ell('jaw', [0.55, 0.67, z], [0.56, 0.11, 0.011], O(SE, { m: z ? 1 : 0, col: '#7fb9a4', metal: 0.2, gloss: 0.2 }));
      S.ell('body', [-0.12, 0.64, z * 0.9], [0.42, 0.08, 0.011], O(SE, { m: z ? 1 : 0, col: '#7fb9a4', metal: 0.2, gloss: 0.2 }));
    }
    S.ell('body', [0, 1.42, 0], [0.95, 0.14, 0.3], { paint: 1, col: LIGHT, cb: 0.08, op: 0.55 });
    S.ell('body', [-0.3, 0.6, 0], [0.7, 0.1, 0.4], { paint: 1, col: DEEPV, cb: 0.08, op: 0.6 });
    S.ell('head', [1.14, 1.04, 0], [0.1, 0.16, 0.26], { paint: 1, col: COPPER, metal: 1, gloss: 0.55, cb: 0.04, op: 0.8 });
    S.ell('fluke', [-1.5, 1.08, 0.3], [0.08, 0.08, 0.3], { paint: 1, col: COPPER, metal: 1, gloss: 0.55, cb: 0.03, op: 0.8, m: 1, rot: [0, -28, 0] });
    S.ell('fin2L', [0.02, 0.38, 1.12], [0.1, 0.08, 0.1], { paint: 1, col: COPPER, metal: 1, gloss: 0.55, cb: 0.04, op: 0.8, m: 1 });
    for (const [x, y, z, r] of [[-0.36, 1.1, 0.33, 0.07], [0.36, 1.22, 0.3, 0.06], [-0.05, 0.8, 0.41, 0.05], [0.78, 1.2, 0.3, 0.06], [-0.62, 0.9, 0.3, 0.06]])
      S.ell('body', [x, y, z], r, { paint: 1, col: LIGHT, cb: 0.04, op: 0.6, m: 1 });

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
      const hole = join([lathe([[r * 0.83, H - 0.05], [0, H - 0.05]], 12), rbox(r * 1.3, 0.03 + hgt * 0.03, r * 0.5).translate(0, c0 + 0.1 + hgt * 0.1, (z > 0 ? 1 : -1) * r * 0.82)]);
      S.add('pipes', hole, DARKM, { p: [x, BASE, z], name: 'o' + i });
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
    S.eye('head', [0.5, 0.99, 0.36], 0.05, { dir: [0.28, 0.04, 0.96], sclera: '#3a2410', iris: '#ffb040', iris2: '#ffe9a0', pupil: 'round', size: 52, lid: DEEPV, open: 42, tilt: 6, glow: 1.5, m: 1 });
  },
  anim(b, t, c) {
    const P = c.parts, a = t.a, s = t.s, h = t.h, k = t.k, shot = k === 'shot', slam = k === 'slam', buff = k === 'buff', melee = k === 'melee';
    const bob = Math.sin(t.p * 0.8), as = Math.min(1, a + s);
    // float, recoil and lunge
    b.body.position.y += bob * 0.045 + (slam ? -a * 0.06 + s * 0.1 : 0) + h * 0.03;
    b.body.position.x += (melee ? s * 0.3 - a * 0.14 : shot ? a * 0.05 - s * 0.1 : 0) - h * 0.07;
    b.body.rotation.z = Math.sin(t.p * 0.8 - 1) * 0.03 - t.sw * 0.06 + (shot ? a * 0.1 - s * 0.03 : melee ? a * 0.08 - s * 0.12 : slam ? -a * 0.05 : 0) + h * 0.08;
    b.body.rotation.x = t.sl * 0.2 + h * 0.12 * Math.sin(t.tm * 19);
    // the hull swells: deep breath for the bellow, a large bulge before the steam burst
    const bulge = (slam ? a * 0.11 - s * 0.05 : shot ? a * 0.06 - s * 0.03 : buff ? Math.sin(t.tm * 9) * 0.015 * as : 0) + Math.sin(t.p * 0.8 + 0.5) * 0.012;
    b.body.scale.set(1 + bulge * 0.4, 1 + bulge, 1 + bulge);
    // head and jaw: the jaw opens wide for the bellow, it snaps for the bite
    b.head.rotation.z = bob * 0.015 + (shot ? a * 0.08 + s * 0.16 : melee ? -a * 0.08 + s * 0.1 : 0) + h * 0.1;
    b.head.rotation.y = t.lk * 0.12;
    b.jaw.rotation.z = -Math.min(0.9, 0.03 + Math.max(0, Math.sin(t.p * 0.4)) * 0.05 + (shot ? a * 0.06 + s * 0.64 : melee ? a * 0.5 + s * 0.08 : slam ? s * 0.25 : buff ? as * 0.14 + Math.sin(t.tm * 9) * 0.03 * as : 0) + h * 0.25);
    b.jaw.rotation.y = t.lk * 0.12;
    // pectoral fins: slow strokes. Up in the wind-up, down in the strike, wide for the chord.
    const fl = Math.sin(t.p * 0.8 + 0.6), fl2 = Math.sin(t.p * 0.8 - 0.3), fa = 0.14 + t.mv * 0.12;
    const fx = -fl * fa - a * 0.4 + s * 0.45 - (buff ? as * 0.35 : 0) - h * 0.3, fx2 = -fl2 * fa * 1.3 - a * 0.3 + s * 0.35 - (buff ? as * 0.25 : 0);
    b.finL.rotation.x = fx + t.sl * 0.15; b.finR.rotation.x = -fx + t.sl * 0.15;
    b.fin2L.rotation.x = fx2; b.fin2R.rotation.x = -fx2;
    b.finL.rotation.y = -t.sw * 0.3 + a * 0.15 - s * 0.25; b.finR.rotation.y = -b.finL.rotation.y;
    // tail: a wave that moves to the flukes
    const ph = t.p * 0.9 + t.w * 0.7, amp = 0.55 + t.mv * 0.7 + a * 0.3;
    for (let i = 0; i < 4; i++) {
      const bn = b[TAIL[i]];
      bn.rotation.z = Math.sin(ph - i * 0.8) * (0.06 + i * 0.04) * amp + (melee || shot ? -a * 0.07 + s * 0.1 : slam ? a * 0.06 - s * 0.08 : 0) + h * 0.06;
      bn.rotation.y = t.sl * 0.18 + Math.sin(t.p * 0.45 - i * 0.6) * 0.03;
    }
    // organ pipes: slow breath, a chord wave, a jump for the steam burst
    b.pipes.position.y += slam ? -a * 0.02 : 0;
    for (let i = 0; i < PIPES.length; i++) {
      let e = Math.sin(t.p * 1.6 + i * 0.9) * 0.012 + t.gl * 0.03 * (1 + Math.sin(t.tm * 5 + i * 1.7));
      if (buff) e += as * (0.05 + Math.sin(t.tm * 7 + i * 1.3) * 0.05);
      if (slam) e += -a * 0.06 + s * (0.14 + (i % 3) * 0.05);
      if (shot) e += s * 0.025 * Math.sin(t.tm * 42 + i * 2) + a * 0.02;
      P['p' + i].position.y += e; P['o' + i].position.y += e;
    }
    // steam: each puff rises, grows and fades in a loop. The burst makes all puffs large.
    for (let i = 0; i < 4; i++) {
      const p = P['st' + i], f = (t.tm * (0.42 + t.gl * 0.3) + i * 0.27) % 1, burst = slam ? s : 0;
      p.position.y += f * 0.42 + burst * 0.3 + (slam ? -a * 0.05 : 0); p.position.x -= f * (0.06 + t.sw * 0.4); p.position.z += f * t.sl * 0.25;
      p.scale.setScalar(Math.max(0.001, Math.pow(Math.sin(Math.PI * f), 0.6) * (0.45 + f * 0.9) * (1 + t.gl * 0.5 + a * 0.3 + (buff ? as * 0.4 : 0)) * (slam ? 1 - a * 0.7 : 1) + burst * 2.4));
    }
  }
};
