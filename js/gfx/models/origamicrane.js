/* Origamicrane (Pleatheron) - crane folded from one sheet of brushed titanium. Heat colours on the edges, paper-white inner faces,
   a red silk cord round the neck, a pale blue glow in the crease at the breast. Gale / Iron. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { torus, ball } from '../geo.js';
import { rgb } from '../sculpt.js';

const T0 = '#9da5b0', T1 = '#858e9b', T2 = '#6e7886', T3 = '#566070', GOLD = '#d9a035', VIO = '#7c3ed6', BLU = '#2c66ea', PA = '#cdcbc3', RED = '#cc1f2c', DRED = '#8e1420';
// titanium: the colour of each corner is in the geometry. Paper: the inner faces of the folds.
const TI = { col: '#ffffff', vc: true, metal: 0.62, rough: 0.46, flat: true, env: 0.95 };
const PAPER = { col: '#ffffff', vc: true, metal: 0, rough: 0.88, flat: true, env: 0.35, noOut: true };
const SILK = { col: RED, rough: 0.42, env: 0.9 };
const SILKT = { col: '#ffffff', vc: true, rough: 0.5, env: 0.7, noOut: true };
const HEART = { col: '#a4d0ee', glow: '#74c0ff', glowK: 3.1, noOut: true };

const CC = {}, col3 = h => CC[h] || (CC[h] = rgb(h));
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const neg = v => [-v[0], -v[1], -v[2]];
const SH = [1, 0.84, 1.08, 0.9, 1.03, 0.8];
const mk = () => ({ pos: [], col: [] });
function toGeo(m, p) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(m.pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(m.col, 3));
  if (p) g.translate(-p[0], -p[1], -p[2]);
  g.computeVertexNormals();
  return g;
}
// One triangle with a colour at each corner. o = the direction that the face must look at, or a point [x, y, z, 1] that it must look away from.
function tri(m, a, b, c, ca, cb, cc, o, k = 1) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  if (nx * nx + ny * ny + nz * nz < 1e-14) return;
  const d = o[3] ? nx * ((a[0] + b[0] + c[0]) / 3 - o[0]) + ny * ((a[1] + b[1] + c[1]) / 3 - o[1]) + nz * ((a[2] + b[2] + c[2]) / 3 - o[2]) : nx * o[0] + ny * o[1] + nz * o[2];
  if (d < 0) { let q = b; b = c; c = q; q = cb; cb = cc; cc = q; }
  m.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  for (const q of [ca, cb, cc]) { const e = col3(q); m.col.push(e[0] * k, e[1] * k, e[2] * k); }
}
// Sheet: titanium on the side that looks at `up`, paper on the other side.
function quad(T, P, a, b, c, d, ca, cb, cc, cd, up, k = 1) {
  tri(T, a, b, c, ca, cb, cc, up, k); tri(T, a, c, d, ca, cc, cd, up, k);
  if (P) { const dn = neg(up), kp = k > 0.95 ? 1 : 0.88; tri(P, a, b, c, PA, PA, PA, dn, kp); tri(P, a, c, d, PA, PA, PA, dn, kp); }
}
// Sheet between an inner edge (a0 -> a1) and an outer edge (b0 -> b1). The outer edge has the heat colours gold, violet, blue. hw = width of the colour band (0..1).
function heat(T, P, a0, a1, b0, b1, base, up, k = 1, hw = 0.3) {
  const st = [0, 1 - hw, 1 - hw * 0.62, 1 - hw * 0.27, 1], cl = [base, base, GOLD, VIO, BLU];
  for (let i = 0; i < 4; i++) quad(T, P, lerp(a0, b0, st[i]), lerp(a1, b1, st[i]), lerp(a1, b1, st[i + 1]), lerp(a0, b0, st[i + 1]), cl[i], cl[i], cl[i + 1], cl[i + 1], up, k);
}
function sideOf(A, B, nrm, w) {
  const D = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], s = [D[1] * nrm[2] - D[2] * nrm[1], D[2] * nrm[0] - D[0] * nrm[2], D[0] * nrm[1] - D[1] * nrm[0]], l = Math.hypot(s[0], s[1], s[2]) || 1;
  return [s[0] * w / l, s[1] * w / l, s[2] * w / l];
}
// Folded dagger sheet from A to B: half-width w, the crease is raised by d along nrm, the widest place is at u. Heat colours at the point.
function dagger(T, P, A, B, w, d, nrm, base, u = 0.35, k = 1, hot = 1) {
  const s = sideOf(A, B, nrm, w), v = 1 - u, ts = [0, u, u + v * (1 - 0.5 * hot), u + v * (1 - 0.22 * hot), 1], cl = hot ? [base, base, GOLD, VIO, BLU] : [base, base, base, base, base];
  let pl, pk, pr;
  for (let i = 0; i < 5; i++) {
    const q = lerp(A, B, ts[i]), f = i ? (1 - ts[i]) / v : 0.14;
    const L = [q[0] + s[0] * f, q[1] + s[1] * f, q[2] + s[2] * f], R = [q[0] - s[0] * f, q[1] - s[1] * f, q[2] - s[2] * f], K = [q[0] + nrm[0] * d * f, q[1] + nrm[1] * d * f, q[2] + nrm[2] * d * f];
    if (i) { quad(T, P, pl, pk, K, L, cl[i - 1], cl[i - 1], cl[i], cl[i], nrm, k); quad(T, P, pk, pr, R, K, cl[i - 1], cl[i - 1], cl[i], cl[i], nrm, k * 0.8); }
    pl = L; pk = K; pr = R;
  }
}
// Closed solid through cross-sections (lists of points with the same length). cols = one colour for each section.
function solid(T, secs, cols) {
  const n = secs[0].length, C = secs.map(s => { const q = [0, 0, 0]; for (const p of s) { q[0] += p[0] / n; q[1] += p[1] / n; q[2] += p[2] / n; } return q; });
  for (let s = 0; s < secs.length - 1; s++) {
    const ref = [(C[s][0] + C[s + 1][0]) / 2, (C[s][1] + C[s + 1][1]) / 2, (C[s][2] + C[s + 1][2]) / 2, 1];
    for (let i = 0; i < n; i++) {
      const a = secs[s][i], b = secs[s][(i + 1) % n], c = secs[s + 1][(i + 1) % n], d = secs[s + 1][i], k = SH[(i + s * 2) % SH.length];
      tri(T, a, b, c, cols[s], cols[s], cols[s + 1], ref, k); tri(T, a, c, d, cols[s], cols[s + 1], cols[s + 1], ref, k);
    }
  }
  for (const [s, o] of [[0, 1], [secs.length - 1, secs.length - 2]]) for (let i = 1; i < n - 1; i++) tri(T, secs[s][0], secs[s][i], secs[s][i + 1], cols[s], cols[s], cols[s], [C[o][0], C[o][1], C[o][2], 1], 0.9);
}
// Closed spike with a diamond section from A to B. st = [[position 0..1, size 0..1, colour], ...]. Width w across, thickness d along nrm.
function spike(T, A, B, w, d, nrm, st) {
  const s = sideOf(A, B, nrm, w), secs = [], cols = [];
  for (const [t, f, c] of st) {
    const q = lerp(A, B, t);
    secs.push([[q[0] + s[0] * f, q[1] + s[1] * f, q[2] + s[2] * f], [q[0] + nrm[0] * d * f, q[1] + nrm[1] * d * f, q[2] + nrm[2] * d * f], [q[0] - s[0] * f, q[1] - s[1] * f, q[2] - s[2] * f], [q[0] - nrm[0] * d * f, q[1] - nrm[1] * d * f, q[2] - nrm[2] * d * f]]);
    cols.push(c);
  }
  solid(T, secs, cols);
}
const HOT = (c0, c1) => [[0, 0, c0], [0.3, 1, c1], [0.62, 0.55, GOLD], [0.82, 0.26, VIO], [1, 0, BLU]];
const Y = [0, 1, 0], Z = [0, 0, 1], TAU = Math.PI * 2;
const cl = (v, a, b) => v < a ? a : v > b ? b : v, sm = x => { x = cl(x, 0, 1); return x * x * (3 - 2 * x); };
// wing beat: 1 = wing up, -1 = wing down. The down-beat takes 36% of the cycle.
const cyc = x => ((x / TAU) % 1 + 1) % 1;
const beat = x => { const u = cyc(x); return u < 0.36 ? Math.cos(Math.PI * sm(u / 0.36)) : -Math.cos(Math.PI * sm((u - 0.36) / 0.64)); };
const fold = x => { const u = cyc(x); return u < 0.36 ? 0 : Math.sin(Math.PI * (u - 0.36) / 0.64); };   // 0..1: the wing folds in the up-beat
const NECK = [[0.32, 1.03, 0], [0.5, 1.2, 0], [0.57, 1.42, 0], [0.52, 1.6, 0]];
// wing sections: z, then leading edge, ridge, valley, trailing edge as [x, y]
const WS = [
  [0.1, [0.27, 1.035], [0.07, 1.105], [-0.1, 1.05], [-0.27, 1.068]],
  [0.4, [0.315, 1.055], [0.085, 1.142], [-0.12, 1.075], [-0.33, 1.092]],
  [0.68, [0.3, 1.08], [0.085, 1.148], [-0.13, 1.09], [-0.35, 1.102]],
  [1.0, [0.12, 1.09], [-0.03, 1.142], [-0.17, 1.1], [-0.31, 1.106]]
].map(r => r.slice(1).map(p => [p[0], p[1], r[0]]));
const TIP = [-0.13, 1.11, 1.16];
const KN = [0.375, 1.19, 0.022], RB = [-0.88, 0.18, 0.44], RL = 0.25, KN2 = [KN[0] + RB[0] * RL, KN[1] + RB[1] * RL, KN[2] + RB[2] * RL];   // knot of the cord, direction and length of one piece of its tails
const TAILP = [-0.3, 1.0, 0];

// one span of the wing between 2 sections: front face with a hot leading edge, pleat, back face with a hot trailing edge
function wingSpan(T, P, a, b, i) {
  heat(T, P, a[1], b[1], a[0], b[0], i % 2 ? T0 : T1, Y, 1, 0.34);
  quad(T, P, a[1], a[2], b[2], b[1], T2, T2, T2, T2, Y, i % 2 ? 0.86 : 0.96);
  heat(T, P, a[2], b[2], a[3], b[3], i % 2 ? T1 : T0, Y, 1.04, 0.3);
}
// tail of the red cord: a strip with a twist. Both sides are silk.
function ribbon(len, w0, w1, turn) {
  const m = mk(), n = 4, wd = [RB[2], 0, -RB[0]], wl = Math.hypot(wd[0], wd[2]);
  let pa, pb;
  for (let i = 0; i <= n; i++) {
    const u = i / n, an = turn * u, w = (w0 + (w1 - w0) * u) / 2, cs = Math.cos(an) * w / wl, sn = Math.sin(an) * w;
    const q = [RB[0] * len * u, RB[1] * len * u, RB[2] * len * u], A = [q[0] + wd[0] * cs, q[1] + sn, q[2] + wd[2] * cs], B = [q[0] - wd[0] * cs, q[1] - sn, q[2] - wd[2] * cs];
    if (i) for (const up of [Y, neg(Y)]) { tri(m, pa, pb, B, RED, DRED, DRED, up, i % 2 ? 1 : 0.8); tri(m, pa, B, A, RED, DRED, RED, up, i % 2 ? 1 : 0.8); }
    pa = A; pb = B;
  }
  return toGeo(m);
}

export default {
  id: 'origamicrane', rim: '#cfe2ff', focus: 'heart', top: 1.8, rough: 0.34, opts: { cell: 0.024, mottle: 0.04, mottleF: 12 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.98, 0])
      .bone('neck1', 'body', NECK[0]).bone('neck2', 'neck1', NECK[1]).bone('neck3', 'neck2', NECK[2]).bone('head', 'neck3', NECK[3])
      .bone('wingL', 'body', [0.04, 1.06, 0.12], { m: 1 }).bone('foreL', 'wingL', [0.085, 1.12, 0.4], { m: 1 }).bone('tipL', 'foreL', [0.07, 1.1, 0.68], { m: 1 }).bone('handL', 'tipL', [-0.03, 1.13, 1.0], { m: 1 })
      .bone('ribL', 'neck1', KN, { m: 1 }).bone('rib2L', 'ribL', KN2, { m: 1 })
      .bone('tail', 'body', [-0.34, 1.0, 0]).bone('legL', 'body', [-0.1, 0.9, 0.08], { m: 1 }).bone('shinL', 'legL', [-0.4, 0.76, 0.09], { m: 1 });
    const met = { metal: 0.9, gloss: 0.5, k: 0.012 }, gold = Object.assign({ col: GOLD }, met);
    S.color(T3);
    // core: a small skinned frame below the folded sheet, like the spars of a kite
    S.box('body', [0.03, 1.0, 0], [0.22, 0.06, 0.065], 0.02, met);
    S.ell('neck2', NECK[1], 0.04, gold); S.ell('neck3', NECK[2], 0.037, gold);
    S.ell('head', [0.58, 1.64, 0], [0.09, 0.05, 0.045], met);
    S.cap('wingL', [0.14, 1.005, 0.12], [0.17, 1.03, 0.4], 0.036, 0.034, Object.assign({ m: 1 }, met));
    S.cap('foreL', [0.17, 1.03, 0.4], [0.2, 1.05, 0.68], 0.034, 0.032, Object.assign({ m: 1 }, met));
    S.ell('foreL', [0.17, 1.03, 0.4], 0.047, Object.assign({ m: 1 }, gold));
    S.cap('tipL', [0.2, 1.05, 0.68], [-0.08, 1.075, 1.1], 0.032, 0.026, Object.assign({ m: 1 }, met));
    S.ell('wingL', [0.1, 1.01, 0.13], 0.066, Object.assign({ m: 1 }, gold));
    S.ell('tipL', [0.2, 1.05, 0.68], 0.05, Object.assign({ m: 1 }, gold));
    S.ell('tipL', [-0.09, 1.078, 1.11], 0.036, Object.assign({ m: 1, col: BLU }, met));
    S.cap('tail', [-0.3, 1.0, 0], [-0.52, 1.11, 0], 0.046, 0.032, met);
    S.ell('legL', [-0.1, 0.9, 0.08], 0.056, Object.assign({ m: 1 }, gold));
    S.cap('legL', [-0.1, 0.9, 0.08], [-0.4, 0.76, 0.09], 0.04, 0.03, Object.assign({ m: 1 }, met));
    S.ell('shinL', [-0.4, 0.76, 0.09], 0.044, Object.assign({ m: 1 }, gold));
    // heat colour on the spars near the joints
    S.ell('wingL', [0.16, 1.02, 0.3], [0.05, 0.05, 0.07], { paint: 1, col: VIO, metal: 0.9, gloss: 0.5, cb: 0.03, m: 1 });
    S.ell('tipL', [0.1, 1.06, 0.86], [0.05, 0.05, 0.07], { paint: 1, col: GOLD, metal: 0.9, gloss: 0.5, cb: 0.03, m: 1 });
    S.ell('legL', [-0.26, 0.83, 0.085], [0.06, 0.05, 0.05], { paint: 1, col: VIO, metal: 0.9, gloss: 0.5, cb: 0.03, m: 1 });

    // body: a folded gem. The point at the front is the breast. A low peak on the back, as on a paper crane.
    const N = [0.46, 1.0, 0], B1 = [[0.2, 1.145, 0], [0.2, 1.0, 0.158], [0.2, 0.852, 0], [0.2, 1.0, -0.158]], B2 = [[-0.12, 1.165, 0], [-0.12, 0.99, 0.188], [-0.1, 0.832, 0], [-0.12, 0.99, -0.188]];
    const bd = mk();
    solid(bd, [[N, N, N, N], B1, B2, [[-0.5, 1.0, 0], [-0.5, 1.0, 0], [-0.5, 1.0, 0], [-0.5, 1.0, 0]]], [T0, T1, T2, GOLD]);
    solid(bd, [[[0.15, 1.13, 0], [-0.01, 1.085, 0.07], [-0.2, 1.14, 0], [-0.01, 1.085, -0.07]], [[0.04, 1.2, 0], [-0.04, 1.19, 0.03], [-0.13, 1.21, 0], [-0.04, 1.19, -0.03]], [[-0.07, 1.285, 0], [-0.07, 1.285, 0], [-0.07, 1.285, 0], [-0.07, 1.285, 0]]], [T1, GOLD, VIO]);
    S.add('body', toGeo(bd), TI);
    // heart piece: the 4 creases that meet at the breast glow pale blue
    const hm = mk(), W = { col: '#c4e4f8' }.col;
    for (const [e, nr] of [[B1[0], Y], [B1[1], Z], [B1[2], neg(Y)], [B1[3], neg(Z)]]) {
      const on = lerp(N, e, 0.02), en = lerp(N, e, nr[1] > 0 ? 1.0 : 0.86);
      spike(hm, [on[0] + nr[0] * 0.004, on[1] + nr[1] * 0.004, on[2] + nr[2] * 0.004], [en[0] + nr[0] * 0.004, en[1] + nr[1] * 0.004, en[2] + nr[2] * 0.004], 0.032, 0.02, nr, [[0, 0.5, W], [0.2, 1, W], [1, 0.12, W]]);
    }
    spike(hm, [N[0] + 0.05, N[1], 0], [N[0] - 0.07, N[1], 0], 0.052, 0.052, Y, [[0, 0, W], [0.42, 1, W], [1, 0.4, W]]);
    spike(hm, [0.2, 1.149, 0], [-0.12, 1.169, 0], 0.016, 0.01, Y, [[0, 0.6, W], [0.5, 0.8, W], [1, 0.1, W]]);
    S.add('body', toGeo(hm, [0.4, 1.0, 0]), HEART, { p: [0.4, 1.0, 0], name: 'heart' });

    // neck: 3 folds with the crease at the front and the paper at the back
    for (let i = 0; i < 3; i++) {
      const A = NECK[i], B = NECK[i + 1], l = Math.hypot(B[0] - A[0], B[1] - A[1]), fr = [(B[1] - A[1]) / l, -(B[0] - A[0]) / l, 0], t = mk(), p = mk();
      const bk = 0.045, A2 = lerp(A, B, -0.1), B2 = lerp(A, B, 1.12), c = i % 2 ? T0 : T1;
      spike(t, A2, B2, 0.068 - i * 0.006, 0.058 - i * 0.005, Z, [[0, 0.3, T2], [0.4, 1, c], [0.78, 0.5, GOLD], [1, 0.14, VIO]]);
      // the paper shows in the open fold at the back of the neck
      dagger(p, null, [A2[0] - fr[0] * bk, A2[1] - fr[1] * bk, 0], [B2[0] - fr[0] * bk * 0.3, B2[1] - fr[1] * bk * 0.3, 0], 0.05 - i * 0.005, 0.04, neg(fr), PA, 0.4, 1, 0);
      S.add('neck' + (i + 1), toGeo(t), TI, { name: 'nk' + (i + 1) });
      S.add('neck' + (i + 1), toGeo(p), PAPER, { name: 'np' + (i + 1) });
    }
    // head: one fold, a long beak with heat colours to the point, 2 plumes
    const hd = mk();
    spike(hd, [0.39, 1.685, 0], [0.82, 1.6, 0], 0.108, 0.088, Z, [[0, 0, T2], [0.46, 1, T0], [1, 0.12, T1]]);
    spike(hd, [0.7, 1.622, 0], [1.22, 1.53, 0], 0.042, 0.036, Z, [[0, 0, T1], [0.12, 1, T1], [0.5, 0.6, GOLD], [0.76, 0.3, VIO], [1, 0, BLU]]);
    spike(hd, [0.72, 1.585, 0], [1.06, 1.533, 0], 0.022, 0.024, Z, [[0, 0, T3], [0.15, 1, T3], [1, 0, VIO]]);
    S.add('head', toGeo(hd), TI);
    const c0 = mk(), c1 = mk();
    spike(c0, [0, 0, 0], [-0.46, 0.09, 0], 0.036, 0.014, Z, HOT(T1, T0));
    spike(c1, [0, 0, 0], [-0.34, -0.01, 0], 0.03, 0.014, Z, HOT(T2, T1));
    S.add('head', toGeo(c0), TI, { p: [0.47, 1.69, 0.014], name: 'cr0' });
    S.add('head', toGeo(c1), TI, { p: [0.46, 1.66, -0.014], name: 'cr1' });

    // wings: folded panels with a ridge and a pleat, dagger feathers at the back edge and at the tip
    // 4 parts for each wing: shoulder, fore wing, tip, hand with the long feathers
    const iT = mk(), iP = mk(), fT = mk(), fP = mk(), oT = mk(), oP = mk(), hT = mk(), hP = mk();
    wingSpan(iT, iP, WS[0], WS[1], 0); wingSpan(fT, fP, WS[1], WS[2], 1);
    for (let i = 0; i < 3; i++) { const z = 0.19 + i * 0.2; dagger(i ? fT : iT, i ? fP : iP, [-0.18 - i * 0.02, 1.064 + i * 0.01, z], [-0.6 - i * 0.05, 1.04 + i * 0.014, z + 0.13], 0.105, 0.026, Y, i % 2 ? T0 : T1, 0.34, 1, 0.8); }
    wingSpan(oT, oP, WS[2], WS[3], 2);
    wingSpan(hT, hP, WS[3], [TIP, TIP, TIP, TIP], 3);
    for (let i = 0; i < 2; i++) { const z = 0.76 + i * 0.17; dagger(oT, oP, [-0.24 + i * 0.03, 1.092, z], [-0.72 + i * 0.05, 1.075 + i * 0.006, z + 0.16 + i * 0.04], 0.098 - i * 0.008, 0.024, Y, i % 2 ? T0 : T1, 0.34, 1, 0.85); }
    dagger(hT, hP, [-0.01, 1.118, 0.97], [-0.2, 1.112, 1.39], 0.086, 0.026, Y, T0, 0.32, 1, 1);
    dagger(hT, hP, [-0.12, 1.112, 0.97], [-0.44, 1.102, 1.33], 0.08, 0.024, Y, T1, 0.32, 1, 1);
    dagger(hT, hP, [-0.2, 1.106, 0.95], [-0.62, 1.092, 1.2], 0.076, 0.022, Y, T0, 0.32, 1, 1);
    S.add('wingL', toGeo(iT), TI, { m: 1 }); S.add('wingL', toGeo(iP), PAPER, { m: 1 });
    S.add('foreL', toGeo(fT), TI, { m: 1 }); S.add('foreL', toGeo(fP), PAPER, { m: 1 });
    S.add('tipL', toGeo(oT), TI, { m: 1 }); S.add('tipL', toGeo(oP), PAPER, { m: 1 });
    S.add('handL', toGeo(hT), TI, { m: 1 }); S.add('handL', toGeo(hP), PAPER, { m: 1 });
    // maker's mark: a very small kite stamped on the left wing, on the first pleat
    const mm = mk(), a = WS[0], e = WS[1], at = (u, v, lift) => { const q = lerp(lerp(a[1], a[2], u), lerp(e[1], e[2], u), v); return [q[0], q[1] + lift, q[2]]; };
    const line = (u0, v0, u1, v1, w, col) => { const du = v1 - v0, dv = -(u1 - u0), l = Math.hypot(du, dv) || 1, x = du / l * w, y = dv / l * w * 0.6; quad(mm, null, at(u0 - x, v0 - y, 0.007), at(u0 + x, v0 + y, 0.007), at(u1 + x, v1 + y, 0.007), at(u1 - x, v1 - y, 0.007), col, col, col, col, Y); };
    quad(mm, null, at(0.5, 0.76, 0.004), at(0.2, 0.62, 0.004), at(0.5, 0.36, 0.004), at(0.8, 0.62, 0.004), '#1c2f86', '#1c2f86', '#2a2470', '#1c2f86', Y);
    line(0.5, 0.76, 0.5, 0.36, 0.035, GOLD); line(0.2, 0.62, 0.8, 0.62, 0.035, GOLD); line(0.5, 0.36, 0.42, 0.14, 0.03, '#1c2f86');
    for (const [u, v] of [[0.47, 0.28], [0.44, 0.19]]) { tri(mm, at(u, v, 0.007), at(u + 0.13, v + 0.04, 0.007), at(u + 0.13, v - 0.04, 0.007), VIO, VIO, VIO, Y); tri(mm, at(u, v, 0.007), at(u - 0.13, v + 0.04, 0.007), at(u - 0.13, v - 0.04, 0.007), VIO, VIO, VIO, Y); }
    S.add('wingL', toGeo(mm), TI);

    // tail: a pleated fan and one long blade
    const tT = mk(), tP = mk(), up = [0.5, 0.87, 0];
    const E = [-2, -1, 0, 1, 2].map(i => [-0.86 + Math.abs(i) * 0.07, 1.27 - Math.abs(i) * 0.035 + (i % 2 ? -0.045 : 0.02), i * 0.078]);
    for (let i = 0; i < 4; i++) heat(tT, tP, TAILP, TAILP, E[i], E[i + 1], i % 2 ? T0 : T1, up, i % 2 ? 1 : 0.86, 0.32);
    dagger(tT, tP, [-0.34, 1.035, 0], [-1.03, 1.4, 0], 0.05, 0.03, up, T0, 0.3, 1, 0.9);
    S.add('tail', toGeo(tT, TAILP), TI, { p: TAILP, name: 'tailT' });
    S.add('tail', toGeo(tP, TAILP), PAPER, { p: TAILP, name: 'tailP' });
    // legs: they trail behind the body
    const lg = mk();
    spike(lg, [-0.4, 0.76, 0.09], [-0.88, 0.675, 0.09], 0.028, 0.022, Z, [[0, 0.3, T2], [0.2, 1, T1], [0.8, 0.5, T2], [1, 0.3, GOLD]]);
    for (const [y, z] of [[0.71, 0.09], [0.63, 0.145], [0.63, 0.035]]) spike(lg, [-0.86, 0.678, 0.09], [-1.02, y, z], 0.016, 0.013, Y, [[0, 0.3, GOLD], [0.3, 1, GOLD], [0.7, 0.5, VIO], [1, 0, BLU]]);
    S.add('shinL', toGeo(lg), TI, { m: 1 });

    // red silk cord round the neck (the promise): 2 turns, a knot with 2 loops at the nape, 2 tails
    const cp = lerp(NECK[0], NECK[1], 0.4), ang = Math.atan2(NECK[1][1] - NECK[0][1], NECK[1][0] - NECK[0][0]), cd = [];
    for (const o of [-0.016, 0.02]) cd.push(torus(0.064, 0.02, 20, 8).rotateY(Math.PI / 2).rotateZ(ang).translate(cp[0] + Math.cos(ang) * o, cp[1] + Math.sin(ang) * o, 0));
    cd.push(ball(0.036, 10, 8).translate(KN[0], KN[1], 0));
    for (const sg of [1, -1]) cd.push(torus(0.042, 0.015, 14, 6).scale(1, 1.5, 1).rotateX(sg * 1.1).rotateZ(ang + 0.5).translate(KN[0] - 0.02, KN[1] + 0.04, sg * 0.052));
    S.add('neck1', mergeGeometries(cd), SILK, { name: 'cord' });
    S.add('ribL', ribbon(RL, 0.062, 0.054, 1.2), SILKT, { p: KN, name: 'rbL', m: 1 });
    S.add('rib2L', ribbon(RL, 0.054, 0.034, -1.5), SILKT, { p: KN2, name: 'rcL', m: 1 });
    S.eye('head', [0.615, 1.657, 0.06], 0.046, { dir: [0.22, 0.12, 0.96], sclera: '#10151f', iris: '#3f9cf4', iris2: '#a8dcff', pupil: 'round', lid: T2, open: 40, tilt: -5, glow: 0.8, size: 50, m: 1 });
  },
  anim(b, t, c) {
    const us = t.u * t.u * (3 - 2 * t.u), nu = 1 - us, tm = t.tm, P = c.parts;
    const a = t.a * (1 - us * 0.9), s = t.s * (1 - us * 0.5), h = t.h, k = t.k;
    const melee = k === 'melee', shot = k === 'shot', slam = k === 'slam', flat = k === 'buff' ? Math.min(1, a + s) : 0, glide = melee ? s : 0;
    // how the body moves: speed, side speed, acceleration, climb, turn
    const spd = Math.min(1, Math.hypot(t.vf, t.vs) / 2.6), fw = cl(t.vf / 2.6, -1, 1), sd = cl(t.vs / 2.6, -1, 1), acc = cl(t.af / 30, -1, 1), rise = cl(t.va / 2, -1, 1), tn = t.tn;
    const push = Math.min(1.2, Math.max(0, acc) + Math.max(0, rise) * 0.8 + Math.max(0, -acc) * 0.5);   // it beats harder to start, to rise and to brake
    const soar = sm((spd - 0.5) / 0.4) * (1 - Math.min(1, push * 1.6));                                  // at speed it glides on flat wings
    // wing beat: a fast down-beat, then an up-beat with folded wings. The elbow, the tip and the hand follow one after the other.
    // The extra phase is kept on the creature so that the beat can become faster without a jump.
    const dt = Math.min(0.1, Math.max(0, tm - (c.flT === undefined ? tm : c.flT)));
    c.flT = tm; c.flA = ((c.flA || 0) + dt * (push * 7 + t.mv * 1.5)) % (TAU * 16);
    const ph = t.p * 1.2 + c.flA, amp = (0.36 + push * 0.34 + t.gl * 0.06) * (1 - soar * 0.82) * (1 - glide) * (1 - flat) * nu, an = Math.min(1.4, amp / 0.36);
    let up = 0, tipUp = 0, sweep = -fw * 0.1 * nu - soar * 0.14, tipSweep = -soar * 0.22 - Math.max(0, fw) * 0.06 * nu;
    if (melee) { up += -a * 0.55 + s * 0.2; tipUp += -a * 0.3 + s * 0.12; sweep += a * 0.3 - s * 0.95; tipSweep -= s * 0.55; }      // razor glide: the wings sweep back
    else if (shot) { up += -a * 0.6 + s * 0.35; tipUp += -a * 0.3 + s * 0.3; sweep += -a * 0.55 + s * 0.95; tipSweep += -a * 0.3 + s * 0.5; }   // darts: the wings snap forward
    else if (slam) { up += -a * 1.05 + s * 0.85; tipUp += -a * 0.4 + s * 0.5; }
    else { up += flat * 0.08; }
    up -= h * 0.4; tipUp += h * 0.5;
    // ultimate: all folds open. The wings become flat and wide and they shiver in the storm.
    const shv = Math.sin(tm * 17), shv2 = Math.sin(tm * 17 + 2.1);
    up += us * (-0.16 + shv * 0.03); tipUp += us * (-0.1 - shv * 0.05); sweep += us * 0.2; tipSweep += us * 0.14;
    const bank = (tn * 0.22 * (0.4 + 0.6 * spd) + sd * 0.1) * nu;   // in a turn the outer wing lifts and the inner wing drops
    for (const [sg, L, o] of [[1, 'L', 0], [-1, 'R', 0.13]]) {
      const q = ph + o, e0 = beat(q), e1 = beat(q - 0.45), e2 = beat(q - 0.9), e3 = beat(q - 1.3), fo = fold(q - 0.35) * an, am = amp * (sg > 0 ? 1 : 0.95);
      b['wing' + L].rotation.x = sg * (-0.1 * nu - soar * 0.05 - e0 * am * 0.9 + up + (sg < 0 ? us * (shv2 - shv) * 0.03 : 0)) + bank;
      b['fore' + L].rotation.x = sg * (-(e1 - e0) * am * 0.7 + fo * 0.34 + tipUp * 0.3);
      b['tip' + L].rotation.x = sg * (-(e2 - e1) * am * 0.8 + fo * 0.3 + tipUp * 0.7);
      b['hand' + L].rotation.x = sg * (-(e3 - e2) * am * 0.9 + fo * 0.22 + tipUp * 0.4);
      b['wing' + L].rotation.y = sg * (sweep - fo * 0.08);
      b['fore' + L].rotation.y = sg * (-fo * 0.2 + tipSweep * 0.3);
      b['tip' + L].rotation.y = sg * (tipSweep * 0.7 - fo * 0.3);
      b['hand' + L].rotation.y = sg * (tipSweep * 0.4 - fo * 0.25);
    }
    b.wingL.scale.set(1 + us * 0.3, 1 - us * 0.55, 1 + us * 0.1); b.wingR.scale.copy(b.wingL.scale);
    // body: each down-beat lifts it. It becomes flat for the glide and becomes a sheet for the parry. In the ultimate it banks into a spin.
    const bob = -beat(ph - 1.0) * 0.045 * an * nu * (1 - glide), slow = Math.sin(tm * 0.6) * Math.sin(tm * 0.21 + 2);
    b.body.position.y += bob + a * 0.06 - glide * 0.1 + (slam ? a * 0.16 - s * 0.2 : 0) + us * (0.1 + Math.sin(tm * 2.3) * 0.03);
    b.body.position.x += (melee ? s * 0.16 - Math.sin(s * Math.PI) * 0.05 : shot ? -s * 0.08 : 0) - a * 0.08;
    b.body.rotation.z = 0.08 - fw * 0.13 * nu + rise * 0.1 + beat(ph - 0.6) * 0.02 * an + a * 0.16 - s * (melee ? 0.2 : 0.1) + h * (0.08 - t.hx * 0.2) + us * (0.14 + Math.sin(tm * 2.3 + 1.3) * 0.06);
    b.body.rotation.x = (tn * 0.3 * (0.35 + 0.65 * spd) + sd * 0.16 + slow * 0.03) * nu + h * t.hz * 0.25 + us * (0.44 + Math.sin(tm * 2.3) * 0.08);
    b.body.rotation.y = us * Math.sin(tm * 1.5) * 0.22;
    b.body.scale.set(1 - flat * 0.86, (1 - glide * 0.3) * (1 + flat * 0.22), 1 + glide * 0.08 + flat * 0.12);
    // neck: an S curve at rest. It stretches forward at speed, curves into a turn, follows the body late.
    // It coils for the wind-up and becomes a spear at the strike. In the ultimate it opens to one long flat line.
    const sway = Math.sin(t.p * 0.8), spear = melee ? s : shot ? s * 0.45 : slam ? s * 0.25 : 0, coil = a * (1 - flat), ext = spd * (1 - coil) * (1 - spear) * nu;
    const lagN = acc * 0.1 - bob * 1.3, look = Math.sin(tm * 0.7) * Math.sin(tm * 0.23 + 1) * (1 - spd) * nu, cv = -tn * (0.1 + 0.12 * spd) * nu;
    b.neck1.rotation.z = sway * 0.04 * nu + lagN + coil * 0.32 - spear * 0.4 + h * (0.12 - t.hx * 0.22) + flat * 0.3 + us * 0.16 - ext * 0.1;
    b.neck2.rotation.z = -sway * 0.05 * nu + lagN * 0.5 + coil * 0.3 - spear * 0.6 + flat * 0.2 - us * 0.46 - ext * 0.18;
    b.neck3.rotation.z = sway * 0.04 * nu - coil * 0.5 - spear * 0.66 + flat * 0.1 - us * 0.56 - ext * 0.2;
    b.head.rotation.z = -sway * 0.03 - coil * 0.12 + spear * 1.7 - h * 0.4 - flat * 0.5 + us * 1.2 + ext * 0.46 + bob * 1.2 + Math.sin(s * Math.PI) * 0.12;
    b.neck1.rotation.y = cv * 0.6; b.neck2.rotation.y = cv + t.lk * 0.15 - look * 0.14; b.neck3.rotation.y = cv * 0.8;
    b.head.rotation.y = t.lk * 0.35 - look * 0.32;
    b.head.rotation.x = Math.sin(tm * 0.5 + 2) * Math.sin(tm * 0.17) * 0.12 * (1 - spd) * nu;
    b.neck1.rotation.x = h * t.hz * 0.3; b.neck2.rotation.x = h * t.hz * 0.2;
    const open = 1 + us * 1.5 + flat * 0.4;
    P.nk1.scale.z = P.np1.scale.z = open; P.nk2.scale.z = P.np2.scale.z = open * (1 + us * 0.1); P.nk3.scale.z = P.np3.scale.z = open;
    P.cord.scale.z = 1 + us * 1.45 + flat * 0.4;
    P.cr0.rotation.z = bob * 1.5 - a * 0.5 - t.gl * (0.25 + 0.08 * Math.sin(tm * 9)) + h * 0.4 + glide * 0.3 - us * (0.5 + shv * 0.06) - look * 0.1;
    P.cr1.rotation.z = -bob * 1.2 - a * 0.3 - t.gl * 0.12 + h * 0.3 + glide * 0.2 + us * (0.3 + shv2 * 0.06);
    P.cr0.rotation.y = us * 0.5; P.cr1.rotation.y = -us * 0.5;
    // tail: a rudder. It turns and twists in a turn and opens its fan to brake. The fan opens for the wind-up of a burst and opens fully in the ultimate.
    const fan = us + (slam ? a * 0.5 + s * 0.3 : 0) + h * 0.2 + (Math.max(0, -acc) * 0.6 + Math.abs(tn) * 0.3) * nu;
    b.tail.rotation.z = -bob * 1.1 + (Math.max(0, fw) * 0.16 + Math.max(0, -acc) * 0.25) * nu - a * 0.25 + s * 0.2 + glide * 0.2 + us * (0.36 + shv2 * 0.02);
    b.tail.rotation.y = -tn * 0.3 * nu; b.tail.rotation.x = tn * 0.3 * nu;
    P.tailT.scale.set(1 + us * 0.12, 1, 1 + fan * 2.4); P.tailP.scale.copy(P.tailT.scale);
    // legs: they hang and paddle a little when it hovers, they trail straight when it flies, they reach down when it sinks and for a slam
    const dang = (1 - spd) * (1 - glide) * nu, reach = slam ? a * 0.5 + s * 0.9 : a * 0.2, land = Math.max(0, -rise), pad = Math.sin(tm * 1.1) * Math.sin(tm * 0.37 + 0.5) * dang;
    b.legL.rotation.z = dang * 0.42 + pad * 0.08 - bob * 0.8 - glide * 0.2 + reach + land * 0.4 - us * 0.2;
    b.legR.rotation.z = dang * 0.34 - pad * 0.08 - bob * 0.6 - glide * 0.2 + reach * 0.9 + land * 0.4 - us * 0.2;
    b.shinL.rotation.z = -0.05 + dang * 0.3 + pad * 0.1 + reach * 0.6 + land * 0.3 + Math.max(0, acc) * 0.15;
    b.shinR.rotation.z = -0.05 + dang * 0.38 - pad * 0.1 + reach * 0.5 + land * 0.3 + Math.max(0, acc) * 0.15;
    b.legL.rotation.y = -us * 0.5 - tn * 0.12 * nu; b.legR.rotation.y = us * 0.5 - tn * 0.12 * nu;
    // tails of the cord: spring bones move them. Here: they hang a little at rest, a small flutter, a whip in the storm.
    const wv = 0.08 + t.gl * 0.1 + us * 0.3, sp = 3.3 + us * 6, drop = 0.34 * (1 - spd) * nu + h * 0.2;
    const w1 = Math.sin(tm * sp), w2 = Math.sin(tm * sp - 1.2), v1 = Math.sin(tm * sp * 0.8 + 1), v2 = Math.sin(tm * sp * 0.8 - 0.4);
    b.ribL.rotation.z = drop + w1 * wv; b.ribR.rotation.z = drop * 0.85 + v1 * wv;
    b.rib2L.rotation.z = drop * 0.8 + w2 * wv * 1.5; b.rib2R.rotation.z = drop * 0.9 + v2 * wv * 1.5;
    b.ribL.rotation.y = v1 * wv * 0.6 + us * 0.3; b.ribR.rotation.y = -w1 * wv * 0.6 - us * 0.3;
    b.rib2L.rotation.y = v2 * wv; b.rib2R.rotation.y = -w2 * wv;
    P.rcL.rotation.x += w2 * 0.5; P.rcR.rotation.x += v2 * 0.5;
    // heart piece: a slow pulse, strong in the ultimate
    const hp = 1 + 0.06 * Math.sin(t.p * 1.2 + 0.6) + a * 0.25 + t.gl * (0.12 + 0.06 * Math.sin(tm * 7)) + us * (0.3 + 0.1 * Math.sin(tm * 9));
    P.heart.scale.set(1, hp, hp);
  },
  // loose parts: the tails of the cord (light, they trail), the plumes, the tail fan, the long feathers of the hand
  dyn: [
    { b: ['ribL', 'rib2L'], k: 30, d: 4, drag: 5 }, { b: ['ribR', 'rib2R'], k: 30, d: 4.4, drag: 5 },
    { b: ['cr0'], k: 70, d: 6, amt: 0.8, drag: 4, dir: [-1, 0.2, 0] }, { b: ['cr1'], k: 60, d: 5.5, amt: 0.8, drag: 4, dir: [-1, 0, 0] },
    { b: ['tail'], k: 80, d: 7, amt: 0.6, drag: 2 },
    { b: ['handL'], k: 90, d: 8, amt: 0.45, drag: 2 }, { b: ['handR'], k: 90, d: 8, amt: 0.45, drag: 2 }
  ]
};
