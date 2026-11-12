/* Origamicrane - heron folded from anodized titanium sheet, with fibre-optic ribbons on the wing tips. Gale / Iron. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, wing, ball } from '../geo.js';
import { rgb } from '../sculpt.js';

const PUR = '#6a3fd0', GOLD = '#e8b84a', DPUR = '#3d2490', VIO = '#8a48e0', BLU = '#5350e2', PALE = '#f4d47c', AMB = '#d89c34', PINK = '#ff5ad0';
// one material for all folded panels: the colour of each facet is in the geometry
const TI = { col: '#ffffff', vc: true, metal: 0.9, rough: 0.2, flat: true, env: 1.5 };
const FIBRE = { col: '#ffc0f0', glow: PINK, glowK: 2.6, noOut: true };
const RIB1 = { col: '#ff9ae8', glow: PINK, glowK: 1.7, rough: 0.4, noOut: true };
const RIB2 = { col: '#a8dcff', glow: '#6ac8ff', glowK: 1.9, rough: 0.4, noOut: true };
const BEAD = { col: '#eafaff', glow: '#8fe0ff', glowK: 3.6, noOut: true };

// Low-poly solid through cross-sections (lists of [x, y, z], all with the same length). Flat faces, one colour from pal for each face.
function loft(secs, pal, shift = 0) {
  const pos = [], col = [], n = secs[0].length;
  const C = secs.map(s => { const q = [0, 0, 0]; for (const p of s) { q[0] += p[0] / n; q[1] += p[1] / n; q[2] += p[2] / n; } return q; });
  const tri = (a, b, c, ref, k) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * nx + ny * ny + nz * nz < 1e-14) return;
    // the face must look away from the reference point
    if (nx * ((a[0] + b[0] + c[0]) / 3 - ref[0]) + ny * ((a[1] + b[1] + c[1]) / 3 - ref[1]) + nz * ((a[2] + b[2] + c[2]) / 3 - ref[2]) < 0) { const q = b; b = c; c = q; }
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    const q = rgb(pal[(k + shift) % pal.length]);
    col.push(q[0], q[1], q[2], q[0], q[1], q[2], q[0], q[1], q[2]);
  };
  for (let s = 0; s < secs.length - 1; s++) {
    const ref = [(C[s][0] + C[s + 1][0]) / 2, (C[s][1] + C[s + 1][1]) / 2, (C[s][2] + C[s + 1][2]) / 2];
    for (let i = 0; i < n; i++) {
      const a = secs[s][i], b = secs[s][(i + 1) % n], c = secs[s + 1][(i + 1) % n], d = secs[s + 1][i];
      tri(a, b, c, ref, i + s); tri(a, c, d, ref, i + s);
    }
  }
  for (const [s, o] of [[0, 1], [secs.length - 1, secs.length - 2]]) for (let i = 1; i < n - 1; i++) tri(secs[s][0], secs[s][i], secs[s][i + 1], C[o], n + s);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
// Folded spike from A to B: width w across, thickness d along nrm, the widest place at u.
function kite(A, B, w, d, nrm, pal, u = 0.4, shift = 0) {
  const D = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
  let sx = D[1] * nrm[2] - D[2] * nrm[1], sy = D[2] * nrm[0] - D[0] * nrm[2], sz = D[0] * nrm[1] - D[1] * nrm[0];
  const l = Math.hypot(sx, sy, sz) || 1, M = [A[0] + D[0] * u, A[1] + D[1] * u, A[2] + D[2] * u];
  sx *= w / l; sy *= w / l; sz *= w / l;
  return loft([[A, A, A, A], [[M[0] + sx, M[1] + sy, M[2] + sz], [M[0] + nrm[0] * d, M[1] + nrm[1] * d, M[2] + nrm[2] * d], [M[0] - sx, M[1] - sy, M[2] - sz], [M[0] - nrm[0] * d, M[1] - nrm[1] * d, M[2] - nrm[2] * d]], [B, B, B, B]], pal, shift);
}
const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
const NECK = [[0.32, 1.03, 0], [0.5, 1.2, 0], [0.57, 1.42, 0], [0.52, 1.6, 0]];
const TIP = [-0.2, 1.1, 1.3], RB = [-0.99, 0, 0.139], RL = 0.42;   // wing tip, ribbon direction, ribbon length

export default {
  id: 'origamicrane', rim: '#d8c0ff', focus: 'head', top: 1.8, rough: 0.3, opts: { cell: 0.024, mottle: 0.04, mottleF: 12 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.98, 0])
      .bone('neck1', 'body', NECK[0]).bone('neck2', 'neck1', NECK[1]).bone('neck3', 'neck2', NECK[2]).bone('head', 'neck3', NECK[3])
      .bone('wingL', 'body', [0.04, 1.06, 0.12], { m: 1 }).bone('tipL', 'wingL', [0.07, 1.1, 0.68], { m: 1 })
      .bone('ribL', 'tipL', TIP, { m: 1 }).bone('rib2L', 'ribL', [TIP[0] + RB[0] * RL, TIP[1], TIP[2] + RB[2] * RL], { m: 1 })
      .bone('tail', 'body', [-0.34, 1.0, 0]).bone('legL', 'body', [-0.1, 0.9, 0.08], { m: 1 }).bone('shinL', 'legL', [-0.4, 0.76, 0.09], { m: 1 });
    const met = { metal: 0.9, gloss: 0.7, k: 0.012 }, gold = Object.assign({ col: GOLD }, met);
    S.color(DPUR);
    // core: small skinned frame below the folded panels
    S.box('body', [0.03, 1.0, 0], [0.22, 0.06, 0.065], 0.02, met);
    S.ell('body', [0.25, 0.905, 0], [0.06, 0.05, 0.05], { col: '#ff8ae0', glow: 2.4, k: 0.012 });
    S.tube(['neck1', 'neck2', 'neck3'], NECK, [0.04, 0.036, 0.034, 0.036], met);
    S.ell('head', [0.57, 1.635, 0], [0.08, 0.045, 0.04], met);
    S.cap('wingL', [0.14, 1.005, 0.12], [0.21, 1.045, 0.68], 0.04, 0.036, Object.assign({ m: 1 }, met));
    S.cap('tipL', [0.21, 1.045, 0.68], [-0.16, 1.075, 1.24], 0.036, 0.03, Object.assign({ m: 1 }, met));
    S.ell('wingL', [0.1, 1.01, 0.13], 0.072, Object.assign({ m: 1 }, gold));
    S.ell('tipL', [0.21, 1.045, 0.68], 0.056, Object.assign({ m: 1 }, gold));
    S.ell('tipL', [-0.18, 1.085, 1.27], 0.045, { m: 1, col: '#ff9ae8', glow: 2.6, k: 0.012 });
    S.cap('tail', [-0.3, 1.0, 0], [-0.52, 1.11, 0], 0.05, 0.036, met);
    S.ell('legL', [-0.1, 0.9, 0.08], 0.06, Object.assign({ m: 1 }, gold));
    S.cap('legL', [-0.1, 0.9, 0.08], [-0.4, 0.76, 0.09], 0.042, 0.032, Object.assign({ m: 1 }, met));
    S.ell('shinL', [-0.4, 0.76, 0.09], 0.046, Object.assign({ m: 1 }, gold));
    // colour: fibre lines in the wing spars, rings on the neck
    const fib = { paint: 1, col: '#ff8ae0', glow: 2.2, cb: 0.01, m: 1 };
    S.cap('wingL', [0.18, 1.0, 0.2], [0.245, 1.04, 0.62], 0.02, 0.02, fib);
    S.cap('tipL', [0.2, 1.045, 0.76], [-0.1, 1.07, 1.16], 0.02, 0.018, fib);
    for (let i = 0; i < 3; i++) { const u = 0.5; S.ell('neck' + (i + 1), [NECK[i][0] + (NECK[i + 1][0] - NECK[i][0]) * u, NECK[i][1] + (NECK[i + 1][1] - NECK[i][1]) * u, 0], [0.02, 0.02, 0.07], { paint: 1, col: VIO, cb: 0.01 }); }

    // body: a gem of 12 facets
    S.add('body', loft([
      [[0.46, 1.0, 0], [0.46, 1.0, 0], [0.46, 1.0, 0], [0.46, 1.0, 0]],
      [[0.2, 1.15, 0], [0.2, 1.0, 0.155], [0.2, 0.855, 0], [0.2, 1.0, -0.155]],
      [[-0.12, 1.17, 0], [-0.12, 0.99, 0.185], [-0.1, 0.835, 0], [-0.12, 0.99, -0.185]],
      [[-0.5, 1.0, 0], [-0.5, 1.0, 0], [-0.5, 1.0, 0], [-0.5, 1.0, 0]]
    ], [PUR, GOLD, VIO, PALE, BLU, AMB]), TI);
    // neck, head, beak
    const NP = [[PUR, VIO], [GOLD, PALE], [BLU, PUR]];
    for (let i = 0; i < 3; i++) {
      const A = NECK[i], pin = kite([A[0], A[1], -0.075 + i * 0.008], [A[0], A[1], 0.075 - i * 0.008], 0.042, 0.042, X, [GOLD, AMB, PALE, GOLD], 0.5);   // hinge pin
      S.add('neck' + (i + 1), mergeGeometries([kite(A, NECK[i + 1], 0.072 - i * 0.008, 0.05 - i * 0.005, Z, NP[i], 0.38), pin]), TI);
    }
    S.add('head', mergeGeometries([
      kite([0.41, 1.67, 0], [0.76, 1.6, 0], 0.092, 0.078, Z, [PUR, GOLD, VIO, AMB], 0.45),
      kite([0.67, 1.617, 0], [1.16, 1.535, 0], 0.036, 0.03, Z, [GOLD, PALE], 0.12),
      kite([0.7, 1.585, 0], [1.02, 1.535, 0], 0.02, 0.022, Z, [AMB, DPUR], 0.15)
    ]), TI);
    const plume = kite([0, 0, 0], [-0.4, 0.07, 0], 0.03, 0.012, Z, [GOLD, PALE], 0.3);
    S.add('head', plume, TI, { p: [0.47, 1.68, 0.012], name: 'cr0' });
    S.add('head', kite([0, 0, 0], [-0.3, -0.01, 0], 0.026, 0.012, Z, [VIO, PUR], 0.3), TI, { p: [0.46, 1.655, -0.012], name: 'cr1' });
    // wings: 2 folded panels with a ridge, dagger feathers on the back edge
    const W0 = [[0.24, 1.04, 0.1], [0.06, 1.1, 0.1], [-0.26, 1.03, 0.1]], W1 = [[0.275, 1.055, 0.39], [0.065, 1.13, 0.39], [-0.33, 1.045, 0.39]], J = [[0.26, 1.08, 0.68], [0.07, 1.13, 0.68], [-0.36, 1.07, 0.68]];
    const W3 = [[0.07, 1.09, 1.0], [-0.07, 1.135, 1.0], [-0.31, 1.085, 1.0]];
    const inner = [loft([W0, W1], [GOLD, PUR, DPUR]), loft([W1, J], [VIO, PALE, DPUR])];
    for (let i = 0; i < 3; i++) { const z = 0.2 + i * 0.19; inner.push(kite([-0.2 - i * 0.03, 1.04 + i * 0.012, z], [-0.58 - i * 0.05, 1.01 + i * 0.012, z + 0.07], 0.075, 0.014, Y, i % 2 ? [GOLD, AMB] : [VIO, PUR], 0.3)); }
    S.add('wingL', mergeGeometries(inner), TI, { m: 1 });
    const outer = [loft([J, W3], [AMB, BLU, DPUR]), loft([W3, [TIP, TIP, TIP]], [PUR, GOLD, DPUR])];
    for (let i = 0; i < 3; i++) { const u = 0.16 + i * 0.27; outer.push(kite([-0.3 + (TIP[0] + 0.3) * u, 1.075 + 0.03 * u, 0.68 + (TIP[2] - 0.68) * u], [-0.72 + i * 0.07, 1.06 + 0.03 * u, 0.8 + (TIP[2] - 0.68) * u + i * 0.02], 0.07 - i * 0.008, 0.014, Y, i % 2 ? [VIO, BLU] : [GOLD, PALE], 0.3)); }
    S.add('tipL', mergeGeometries(outer), TI, { m: 1 });
    // glowing fibre on the ridge of the wing
    S.add('wingL', tube([[0.06, 1.106, 0.1], [0.07, 1.136, 0.68]], [0.009, 0.009], { ring: 5, seg: 2 }), FIBRE, { m: 1 });
    S.add('tipL', tube([[0.07, 1.136, 0.68], [TIP[0], TIP[1] + 0.006, TIP[2]]], [0.009, 0.006], { ring: 5, seg: 2 }), FIBRE, { m: 1 });
    // ribbons of fibre-optic silk: 2 strips for each wing tip and a light at the end
    S.add('ribL', wing([[0, -0.036], [RL, -0.02], [RL, 0.02], [0, 0.036]], 0.008, { smooth: false }), RIB1, { p: TIP, r: [0, -82, 28], order: 'YXZ', name: 'rbL', m: 1 });
    const P2 = [TIP[0] + RB[0] * RL, TIP[1], TIP[2] + RB[2] * RL];
    S.add('rib2L', wing([[0, -0.026], [RL, -0.01], [RL, 0.01], [0, 0.026]], 0.008, { smooth: false }), RIB2, { p: P2, r: [0, -82, -24], order: 'YXZ', name: 'rcL', m: 1 });
    S.add('rib2L', ball(0.03, 10, 8), BEAD, { p: [P2[0] + RB[0] * RL, P2[1], P2[2] + RB[2] * RL], m: 1 });
    // tail: one tall fold and 2 side blades
    S.add('tail', mergeGeometries([
      kite([-0.28, 0.98, 0], [-0.88, 1.32, 0], 0.1, 0.05, Z, [PUR, GOLD, VIO, PALE], 0.3),
      kite([-0.3, 1.0, 0.04], [-0.8, 1.1, 0.24], 0.07, 0.016, Y, [GOLD, AMB], 0.35),
      kite([-0.3, 1.0, -0.04], [-0.8, 1.1, -0.24], 0.07, 0.016, Y, [GOLD, AMB], 0.35)
    ]), TI);
    // legs: they trail behind the body
    S.add('shinL', mergeGeometries([
      kite([-0.4, 0.76, 0.09], [-0.86, 0.68, 0.09], 0.024, 0.02, Z, [GOLD, PALE], 0.2),
      kite([-0.85, 0.68, 0.09], [-1.0, 0.71, 0.09], 0.014, 0.012, Y, [PUR, VIO], 0.3),
      kite([-0.85, 0.68, 0.09], [-0.99, 0.63, 0.14], 0.014, 0.012, Y, [PUR, VIO], 0.3),
      kite([-0.85, 0.68, 0.09], [-0.99, 0.63, 0.04], 0.014, 0.012, Y, [PUR, VIO], 0.3)
    ]), TI, { m: 1 });
    S.eye('head', [0.6, 1.65, 0.052], 0.036, { dir: [0.25, 0.1, 0.96], sclera: '#1a1030', iris: '#ffc23a', iris2: '#fff2b8', pupil: 'slit', lid: PUR, open: 34, tilt: -16, glow: 1.2, m: 1 });
  },
  anim(b, t, c) {
    const f = Math.sin(t.p * 1.2), f2 = Math.sin(t.p * 1.2 - 0.9), a = t.a, s = t.s, h = t.h, k = t.k;
    const melee = k === 'melee', shot = k === 'shot', slam = k === 'slam', flat = k === 'buff' ? Math.min(1, a + s) : 0;
    const glide = melee ? s : 0, amp = (0.32 + t.mv * 0.12 + t.gl * 0.06) * (1 - glide) * (1 - flat);
    // wings. Left wing: rotation.x - = up, rotation.y - = swept back.
    let up = -0.08 - f * amp, tipUp = -f2 * amp * 1.25, sweep = -t.sw * 0.2, tipSweep = -t.sw * 0.1;
    if (melee) { up += -a * 0.55 + s * 0.2; tipUp += -a * 0.3 + s * 0.12; sweep += a * 0.3 - s * 0.95; tipSweep -= s * 0.55; }      // razor glide: the wings sweep back
    else if (shot) { up += -a * 0.6 + s * 0.35; tipUp += -a * 0.3 + s * 0.3; sweep += -a * 0.55 + s * 0.95; tipSweep += -a * 0.3 + s * 0.5; }   // darts: the wings snap forward
    else if (slam) { up += -a * 1.05 + s * 0.85; tipUp += -a * 0.4 + s * 0.5; }
    else { up += flat * 0.08; }
    up -= h * 0.4; tipUp += h * 0.5;
    b.wingL.rotation.x = up; b.wingR.rotation.x = -up; b.tipL.rotation.x = tipUp; b.tipR.rotation.x = -tipUp;
    b.wingL.rotation.y = sweep; b.wingR.rotation.y = -sweep; b.tipL.rotation.y = tipSweep; b.tipR.rotation.y = -tipSweep;
    // body: it becomes flat for the glide and becomes a sheet for the parry
    b.body.position.y += f * 0.045 * (1 - glide) + a * 0.06 - glide * 0.1 + (slam ? a * 0.16 - s * 0.2 : 0);
    b.body.position.x += (melee ? s * 0.16 : shot ? -s * 0.08 : 0) - a * 0.08;
    b.body.rotation.z = 0.08 - t.sw * 0.16 + a * 0.16 - s * (melee ? 0.2 : 0.1) + h * 0.25;
    b.body.rotation.x = t.sl * 0.3;
    b.body.scale.set(1 - flat * 0.86, (1 - glide * 0.3) * (1 + flat * 0.22), 1 + glide * 0.08 + flat * 0.12);
    // neck: an S curve. It coils for the wind-up and becomes a spear at the strike.
    const sway = Math.sin(t.p * 0.8), spear = melee ? s : shot ? s * 0.45 : slam ? s * 0.25 : 0, coil = a * (1 - flat);
    b.neck1.rotation.z = sway * 0.04 + t.sw * 0.12 + coil * 0.32 - spear * 0.4 + h * 0.3 + flat * 0.3;
    b.neck2.rotation.z = -sway * 0.05 + coil * 0.3 - spear * 0.6 + flat * 0.2;
    b.neck3.rotation.z = sway * 0.04 - coil * 0.5 - spear * 0.66 + flat * 0.1;
    b.head.rotation.z = -sway * 0.03 - coil * 0.12 + spear * 1.7 - h * 0.4 - flat * 0.5 + t.sw * 0.06;
    b.head.rotation.y = t.lk * 0.35; b.neck2.rotation.y = t.lk * 0.15 + t.sl * 0.15;
    c.parts.cr0.rotation.z = f * 0.06 + t.sw * 0.3 - a * 0.5 - t.gl * (0.25 + 0.08 * Math.sin(t.tm * 9)) + h * 0.4 + glide * 0.3;
    c.parts.cr1.rotation.z = -f * 0.05 + t.sw * 0.25 - a * 0.3 - t.gl * 0.12 + h * 0.3 + glide * 0.2;
    b.tail.rotation.z = f * 0.05 + t.sw * 0.14 - a * 0.25 + s * 0.2 + glide * 0.2;
    b.tail.rotation.y = t.sl * 0.3;
    // legs trail; they reach down for a slam
    const reach = slam ? a * 0.5 + s * 0.9 : a * 0.2;
    b.legL.rotation.z = f * 0.04 - t.sw * 0.25 - glide * 0.2 + reach; b.legR.rotation.z = -f * 0.04 - t.sw * 0.25 - glide * 0.2 + reach * 0.9;
    b.shinL.rotation.z = -0.05 - t.sw * 0.15 + reach * 0.6 + f2 * 0.04; b.shinR.rotation.z = -0.05 - t.sw * 0.15 + reach * 0.5 - f2 * 0.04;
    // ribbons: a wave goes along each chain
    const wv = 0.22 + t.gl * 0.2 + t.mv * 0.1, w1 = Math.sin(t.tm * 4.2), w2 = Math.sin(t.tm * 4.2 - 1.1), v1 = Math.sin(t.tm * 3.1 + 1), v2 = Math.sin(t.tm * 3.1 - 0.3);
    b.ribL.rotation.y = w1 * wv + t.sl * 0.5 - sweep * 0.7; b.ribR.rotation.y = -w1 * wv + t.sl * 0.5 + sweep * 0.7;
    b.rib2L.rotation.y = w2 * wv * 1.4 + t.sl * 0.4; b.rib2R.rotation.y = -w2 * wv * 1.4 + t.sl * 0.4;
    b.ribL.rotation.z = v1 * wv - t.sw * 0.2 - f * amp * 0.6; b.ribR.rotation.z = -v1 * wv - t.sw * 0.2 - f * amp * 0.6;
    b.rib2L.rotation.z = v2 * wv * 1.3 - f2 * amp * 0.5; b.rib2R.rotation.z = -v2 * wv * 1.3 - f2 * amp * 0.5;
    b.ribL.rotation.x = -up * 0.8; b.ribR.rotation.x = up * 0.8;
    c.parts.rbL.rotation.z += Math.sin(t.tm * 5.3) * 0.5; c.parts.rbR.rotation.z += Math.sin(t.tm * 5.3 + 2) * 0.5;
    c.parts.rcL.rotation.z += Math.sin(t.tm * 6.1 + 1) * 0.7; c.parts.rcR.rotation.z += Math.sin(t.tm * 6.1 + 3) * 0.7;
  }
};
