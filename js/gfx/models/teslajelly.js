/* Teslajelly (Coilbell) - the first filament lamp, thrown into a tide pool. A clear glass bell with a coiled filament
   (heart piece), a brass screw cap on top like the base of a lamp, copper-wire arms with frayed ends and white ceramic
   beads, drops of sea water on the glass. Maker's mark: a star scratched on the brass cap. Volt / Tide. */
import * as THREE from 'three';
import { tube, lathe, ball, flame } from '../geo.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SEAGL = '#86b4cc', LOBE = '#a2cbe0', NAVY = '#0f1840', BRASS = '#c99a3c', DBRASS = '#9a6f24', COPPER = '#e28e52', DCOP = '#9c562c', CERAM = '#e6e3da', CYAN = '#7fe0ff';
const GLASS = { col: '#d4eeff', op: 0.26, rough: 0.03, env: 1.9, side: 1, noOut: true };
const RIB = { col: '#e0f4ff', op: 0.42, rough: 0.08, env: 1.6, noOut: true };
const STEM = { col: '#c8e0ff', op: 0.5, rough: 0.08, env: 1.4, noOut: true };
const WATER = { col: '#c4e8ff', op: 0.72, rough: 0.02, env: 2.4, noOut: true };
const FIL = { col: '#ffd890', glow: '#ff9c30', glowK: 3.3, noOut: true };
const HALO = { col: '#ff9a30', add: true, op: 0.1, noOut: true };
const BRASSM = { col: BRASS, metal: 1, rough: 0.28, env: 1.2 };
const THREADM = { col: '#b98a30', metal: 1, rough: 0.3, env: 1.2 };
const COPM = { col: '#e39a5c', metal: 1, rough: 0.3, env: 1.2 };
const RIVET = { col: '#f0dc9a', metal: 1, rough: 0.2, env: 1.3 };
const SCRATCH = { col: '#fff2c0', metal: 0.5, rough: 0.55, env: 0.8 };
const SPARK = { col: '#dcf8ff', glow: '#5ad0ff', glowK: 1.8, noOut: true };
const ORB = { col: '#c8f0ff', glow: '#7fd8ff', glowK: 2.2, add: true, op: 0.85, noOut: true };

const N = 8, TAU = Math.PI * 2, SEG = 'abcd', NS = 4;
const TP = [[0.4, 0.88], [0.475, 0.735], [0.5, 0.59], [0.49, 0.45], [0.45, 0.33]];   // arm line: [distance from the axis, y]. Each arm is a chain of 4 bones.
// arm turns for each segment: lash, aim at the plasma ball, open, lift, drop, cage (lower hoops and upper hoops)
const four = r => [r[0], r[1] * 0.7, r[1] * 0.3 + r[2] * 0.4, r[2] * 0.6];      // the bend of 3 joints on 4 joints
const LASH = four([1.1, 0.42, 0.32]), AIM = four([0.2, -0.5, -0.6]), OPEN = four([0.55, 0.15, 0.1]), LIFT = four([1.15, 0.3, 0.25]), DROP = four([0.3, 0.2, 0.2]), CAGE_DN = four([1.0, -0.85, -0.95]), CAGE_UP = four([1.47, 1.5, 1.0]);
// ultimate: turns that make each arm one straight line down (they cancel the bow of the rest shape); and the stretch of the arm
const DOWN = [0, 1, 2, 3].map(j => Math.atan2(TP[j + 1][0] - TP[j][0], TP[j][1] - TP[j + 1][1]));
const STRAIGHT = DOWN.map((d, j) => (j ? DOWN[j - 1] : 0) - d), REACH = 1.42;
const cl = (v, a, b) => v < a ? a : v > b ? b : v, fr01 = x => x - Math.floor(x);
// the pulse of the bell: it contracts fast (the first part of the cycle) and opens slowly. u = 0..1 of the cycle, result 0..1.
const squeeze = u => u < 0.22 ? ease(u / 0.22) : 1 - ease((u - 0.22) / 0.78);
// loose parts: each wire arm is a chain with high drag and low stiffness. It trails far behind the motion and swings through at a stop.
const DYN = [];
for (let i = 0; i < N; i++) DYN.push({ b: [0, 1, 2, 3].map(j => 't' + i + SEG[j]), k: 21 + (i * 3 % 5) * 1.2, d: 2.9 + (i % 3) * 0.35, amt: 0.3, drag: 5 });
// glass bell: a lamp bulb upside down. th = 0 at the lip, 90 degrees at the neck below the screw cap.
const LIP = 1.03, GR = 0.485, GN = 0.168, GH = 0.52;
const bellR = th => GN + (GR - GN) * Math.pow(Math.cos(th), 1.2), bellY = th => GH * Math.sin(th);
const join = list => mergeGeometries(list.map(g => { g = g.index ? g.toNonIndexed() : g.clone(); g.deleteAttribute('uv'); return g; }));
const ease = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
// Turn a bone by a rotation vector (axis x angle). The arms need turns around slanted axes.
function turn(bn, x, y, z) {
  const an = Math.sqrt(x * x + y * y + z * z);
  if (an < 1e-6) return;
  const q = Math.sin(an / 2) / an;
  bn.quaternion.set(x * q, y * q, z * q, Math.cos(an / 2));
}
// The field of the sculpted body (the same blend that Sculpt.build() makes). It lets a rigid detail lie on the surface.
function fieldOf(S) {
  const P = S.prims.filter(p => !p.paint);
  const smin = (a, b, k) => { const m = a < b ? a : b, h = k - Math.abs(a - b); return k <= 0 || h <= 0 ? m : m - h * h / (4 * k); };
  return (x, y, z) => { let v = 1e3; for (const p of P) { const d = p.f(x, y, z); v = p.sub ? -smin(-v, d, p.k) : smin(v, d, p.k); } return v; };
}
// first point of the surface on the way from a (outside) to b (inside)
function hit(F, a, b) {
  const at = t => F(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  let t0 = 0, t1 = 1;
  for (let i = 1; i <= 40; i++) { if (at(i / 40) < 0) { t1 = i / 40; t0 = (i - 1) / 40; break; } if (i === 40) return null; }
  for (let i = 0; i < 12; i++) { const m = (t0 + t1) / 2; if (at(m) < 0) t1 = m; else t0 = m; }
  return [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, a[2] + (b[2] - a[2]) * t1];
}

export default {
  id: 'teslajelly', rim: '#8fc0ff', focus: 'coil', top: 1.9, rough: 0.4, opts: { cell: 0.024, mottle: 0.05, mottleF: 14 },
  dyn: DYN,
  rig: { head: 'bell', neck: [] },          // the bell with the eyes turns to the aim before the body
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.95, 0]).bone('bell', 'body', [0, LIP, 0]);
    for (let i = 0; i < N; i++) {
      const a = (i + 0.5) * TAU / N, cx = Math.cos(a), sz = Math.sin(a);
      for (let j = 0; j < NS; j++) S.bone('t' + i + SEG[j], j ? 't' + i + SEG[j - 1] : 'body', [cx * TP[j][0], TP[j][1], sz * TP[j][0]]);
    }
    S.color(SEAGL);
    const Br = { col: BRASS, metal: 1, gloss: 0.6 }, Db = { col: DBRASS, metal: 1, gloss: 0.6, k: 0.008 };
    // thick rolled lip of sea-worn glass with 8 lobes, dark floor of the bell with the lamp mount
    S.tor('bell', [0, LIP, 0], 0.47, 0.068, { gloss: 0.9, k: 0.03 });
    for (let i = 0; i < N; i++) { const a = (i + 0.5) * TAU / N; S.ell('bell', [Math.cos(a) * 0.5, 0.995, Math.sin(a) * 0.5], [0.095, 0.075, 0.095], { col: LOBE, gloss: 0.9, k: 0.035, cb: 0.04 }); }
    S.ell('bell', [0, 1.01, 0], [0.45, 0.065, 0.45], { col: NAVY, k: 0.02, gloss: 0.5 });
    S.cap('bell', [0, 1.04, 0], [0, 1.1, 0], 0.15, 0.115, Object.assign({ k: 0.012 }, Br));
    S.tor('bell', [0, 1.075, 0], 0.15, 0.026, Db);
    // eye housings on the front of the lip
    S.ell('bell', [0.4745, 1.04, 0.1727], 0.09, { m: 1, col: NAVY, gloss: 0.6, k: 0.02 });
    S.tor('bell', [0.52, 1.043, 0.1895], 0.07, 0.023, Object.assign({ m: 1, k: 0.008, rot: [0, -20, 90] }, Br));
    // brass screw cap on top, like the base of a lamp: collar, 3 turns of thread, dark insulator, contact
    // (a cylinder for the thread, a smooth round shoulder, a flat top of dark insulator, the contact. The thread is a rigid part.)
    S.cap('bell', [0, 1.585, 0], [0, 1.7, 0], 0.165, 0.165, Object.assign({ k: 0.012 }, Br));
    S.box('bell', [0, 2.002, 0], [0.3, 0.2, 0.3], 0.004, { sub: 1, col: '#1c2028', gloss: 0.7, k: 0.006 });
    S.tor('bell', [0, 1.562, 0], 0.172, 0.03, Object.assign({ k: 0.01 }, Br));
    S.ell('bell', [0, 1.808, 0], [0.052, 0.034, 0.052], Object.assign({ k: 0.01 }, Br));
    // brass collar below the lip, dark underside, the hub where the 8 wires are bound: copper turns, a ceramic knob
    S.tor('bell', [0, 0.94, 0], 0.41, 0.048, Object.assign({ k: 0.012, sb: 0.05 }, Br));
    S.ell('body', [0, 0.95, 0], [0.38, 0.11, 0.38], { col: NAVY, k: 0.03 });
    S.cap('body', [0, 0.88, 0], [0, 0.77, 0], 0.17, 0.125, { col: COPPER, metal: 0.8, gloss: 0.5, k: 0.015 });
    for (let i = 0; i < 4; i++) S.tor('body', [0, 0.875 - i * 0.042, 0], 0.166 - i * 0.012, 0.025, { col: i % 2 ? COPPER : DCOP, metal: 0.8, gloss: 0.55, k: 0.008 });
    S.ell('body', [0, 0.69, 0], [0.105, 0.07, 0.105], { col: CERAM, k: 0.012, gloss: 0.85 });
    S.ell('body', [0, 0.625, 0], [0.05, 0.04, 0.05], Object.assign({ k: 0.01 }, Br));
    // arms: copper wire with a brass socket at the top, white ceramic beads, a dark winding, a brass crimp at the end
    const frays = [];
    for (let s = 0; s < 6; s++) {
      const q = s * TAU / 6 + (s % 2) * 0.4, sp = 0.04 + (s * 7 % 4) * 0.012, len = 0.085 + (s * 5 % 3) * 0.022, cq = Math.cos(q), sq = Math.sin(q);
      frays.push(tube([[cq * 0.012, 0, sq * 0.012], [cq * sp * 0.45, -len * 0.45, sq * sp * 0.45], [cq * sp, -len * 0.85, sq * sp], [cq * sp * 1.35, -len, sq * sp * 1.35]], [0.011, 0.009, 0.007, 0.004], { ring: 5, seg: 6 }));
    }
    const fray = join(frays);
    for (let i = 0; i < N; i++) {
      const a = (i + 0.5) * TAU / N, cx = Math.cos(a), sz = Math.sin(a), P = TP.map(q => [cx * q[0], q[1], sz * q[0]]), bn = [0, 1, 2, 3].map(j => 't' + i + SEG[j]);
      const on = (j, u) => [P[j][0] + (P[j + 1][0] - P[j][0]) * u, P[j][1] + (P[j + 1][1] - P[j][1]) * u, P[j][2] + (P[j + 1][2] - P[j][2]) * u];
      S.tube(bn, P, [0.055, 0.051, 0.047, 0.042, 0.038], { col: COPPER, metal: 0.62, gloss: 0.45, k: 0.02, sb: 0.05 });
      S.ell(bn[0], P[0], 0.075, Object.assign({ k: 0.015, sb: 0.05 }, Br));
      S.ell(bn[0], on(0, 0.62), [0.074, 0.04, 0.074], { col: CERAM, gloss: 0.85, k: 0.008, sb: 0.05 });
      S.ell(bn[1], on(1, 0.5), [0.064, 0.026, 0.064], { col: DCOP, metal: 0.8, gloss: 0.5, k: 0.008, sb: 0.05 });
      S.ell(bn[2], on(2, 0.35), [0.068, 0.038, 0.068], { col: CERAM, gloss: 0.85, k: 0.008, sb: 0.05 });
      S.ell(bn[3], on(3, 0.3), [0.058, 0.024, 0.058], { col: DCOP, metal: 0.8, gloss: 0.5, k: 0.008, sb: 0.05 });
      S.ell(bn[3], P[4], [0.054, 0.042, 0.054], Object.assign({ k: 0.012, sb: 0.05 }, Br));
      // frayed end: the strands of the wire come apart; a small spark sits between them
      S.add(bn[3], fray, COPM, { p: [P[4][0], P[4][1] - 0.03, P[4][2]], r: [0, i * 47, 0] });
      S.add(bn[3], ball(0.03, 10, 8), SPARK, { p: [P[4][0], P[4][1] - 0.075, P[4][2]], name: 'e' + i });
    }
    // colour: soft ring on the floor, light band on the lip, marks on the lobes, verdigris in the folds of the cap
    S.tor('bell', [0, 1.05, 0], 0.3, 0.03, { paint: 1, col: CYAN, glow: 0.9, cb: 0.012 });
    S.tor('bell', [0, LIP, 0], 0.536, 0.02, { paint: 1, col: '#c8e6f4', glow: 0.3, gloss: 1, cb: 0.012 });
    for (let i = 0; i < N; i++) { const a = (i + 0.5) * TAU / N; S.ell('bell', [Math.cos(a) * 0.59, 0.985, Math.sin(a) * 0.59], 0.03, { paint: 1, col: CYAN, glow: 0.9, cb: 0.01 }); }
    for (let i = 0; i < 5; i++) { const a = i * 1.9 + 0.7; S.ell('bell', [Math.cos(a) * 0.17, 1.6 + (i % 3) * 0.04, Math.sin(a) * 0.17], [0.05, 0.03, 0.05], { paint: 1, col: '#5fae98', metal: 0.2, gloss: 0.1, op: 0.6, cb: 0.02 }); }

    // clear glass bell with thin glass ribs
    const prof = [];
    for (let i = 0; i <= 18; i++) { const th = i / 18 * Math.PI / 2; prof.push([bellR(th), bellY(th)]); }
    prof.push([GN - 0.004, GH + 0.05]);
    S.add('bell', lathe(prof, 32), GLASS, { p: [0, LIP, 0], name: 'dome' });
    const ribs = [];
    for (let i = 0; i < N; i++) {
      const a = (i + 0.5) * TAU / N, pts = [];
      for (let j = 0; j <= 9; j++) { const th = j / 9 * Math.PI / 2, r = bellR(th) * 1.005; pts.push([Math.cos(a) * r, bellY(th) * 1.003, Math.sin(a) * r]); }
      ribs.push(tube(pts, [0.012, 0.01, 0.007], { ring: 5, seg: 18 }));
    }
    S.add('bell', join(ribs), RIB, { p: [0, LIP, 0], name: 'ribs' });
    // drops of sea water on the glass: round drops, drops that run down, and 3 drops that hang from the lip
    const wet = [], m4 = new THREE.Matrix4(), vx = new THREE.Vector3(), vy = new THREE.Vector3(), vz = new THREE.Vector3();
    const drop = (az, thd, r, run) => {
      const th = thd * Math.PI / 180, d = 0.02, dr = bellR(th + d) - bellR(th - d), dy = bellY(th + d) - bellY(th - d), l = Math.hypot(dr, dy), ca = Math.cos(az), sa = Math.sin(az);
      vz.set(dy / l * ca, -dr / l, dy / l * sa); vy.set(dr / l * ca, dy / l, dr / l * sa); vx.crossVectors(vy, vz);
      const g = run ? flame(r, r * run, 8).translate(0, -r * 0.5, 0) : ball(r, 9, 7);
      g.scale(1, 1, 0.5).applyMatrix4(m4.makeBasis(vx, vy, vz)).translate(ca * bellR(th), LIP + bellY(th), sa * bellR(th));
      wet.push(g);
    };
    [[0.3, 22, 0.034, 0], [0.9, 48, 0.026, 3.4], [1.5, 30, 0.03, 0], [2.1, 60, 0.022, 0], [2.6, 18, 0.03, 3], [3.2, 40, 0.036, 0], [3.7, 66, 0.02, 3.6], [4.3, 26, 0.028, 0], [4.9, 52, 0.03, 0], [5.4, 14, 0.026, 2.8], [5.9, 44, 0.024, 0], [0.6, 70, 0.018, 0], [1.9, 12, 0.022, 0], [3.5, 10, 0.02, 0], [5.0, 74, 0.02, 0], [4.55, 8, 0.024, 0], [2.85, 46, 0.018, 0], [0.05, 56, 0.02, 0]]
      .forEach(([az, th, r, run]) => drop(az, th, r, run));
    for (const az of [0.95, 3.0, 4.8]) wet.push(flame(0.026, 0.085, 8).translate(Math.cos(az) * 0.555, 0.905, Math.sin(az) * 0.555));
    S.add('bell', join(wet), WATER, { name: 'drops' });
    // filament: a helix between two brass posts on a glass stem
    const hx = [];
    for (let i = 0; i <= 44; i++) { const u = i / 44, an = u * 5.5 * TAU; hx.push([Math.cos(an) * 0.095, -0.12 + u * 0.24, Math.sin(an) * 0.095]); }
    S.add('bell', tube(hx, [0.017, 0.017], { ring: 6, seg: 176 }), FIL, { p: [0, 1.28, 0], name: 'coil' });
    S.add('bell', join([
      tube([[0.07, 1.09, 0], [0.12, 1.12, 0], [0.095, 1.16, 0]], [0.012, 0.012], { ring: 5 }),
      tube([[-0.07, 1.09, 0], [-0.16, 1.2, 0], [-0.15, 1.36, 0], [-0.095, 1.4, 0]], [0.012, 0.012], { ring: 5 }),
      tube([[0, 1.3, 0], [0, 1.42, 0], [0, 1.5, 0]], [0.008, 0.008], { ring: 5 })
    ]), BRASSM);
    S.add('bell', lathe([[0.075, 0], [0.05, 0.04], [0.03, 0.12], [0.022, 0.2], [0, 0.21]], 12), STEM, { p: [0, 1.09, 0] });
    S.add('bell', ball(0.19, 16, 10), HALO, { p: [0, 1.28, 0], name: 'halo' });
    // the thread of the screw cap: 4 sharp turns
    const thr = [[0.166, 0]];
    for (let i = 0; i < 4; i++) thr.push([0.172, 0.004 + i * 0.028], [0.191, 0.014 + i * 0.028], [0.191, 0.02 + i * 0.028], [0.172, 0.03 + i * 0.028]);
    thr.push([0.164, 0.122]);
    S.add('bell', lathe(thr, 28), THREADM, { p: [0, 1.578, 0], name: 'thread' });
    // rivets on the collar
    const rv = [];
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16, g = ball(0.021, 8, 6); g.translate(Math.cos(a) * 0.458, 0.94, Math.sin(a) * 0.458); rv.push(g); }
    S.add('bell', join(rv), RIVET);
    // maker's mark: a star that Pim scratched on the brass cap with a nail. 5 lines, not very straight, on the front of the cap.
    const F = fieldOf(S), el = 19 * Math.PI / 180, S0 = [Math.cos(el) * 0.165, 1.7 + Math.sin(el) * 0.165, 0], nn = [Math.cos(el), Math.sin(el), 0], V = [-Math.sin(el), Math.cos(el), 0];
    const onCap = (u, v) => { const o = [S0[0] + V[0] * v, S0[1] + V[1] * v, S0[2] + u]; return hit(F, [o[0] + nn[0] * 0.07, o[1] + nn[1] * 0.07, o[2]], [o[0] - nn[0] * 0.07, o[1] - nn[1] * 0.07, o[2]]) || o; };
    const star = [], sp = [];
    for (let i = 0; i < 5; i++) { const q = Math.PI / 2 + i * TAU * 2 / 5, r = 0.04 + (i % 2) * 0.005; sp.push([Math.cos(q) * r, Math.sin(q) * r * 0.9 + 0.006]); }
    for (let i = 0; i < 5; i++) {
      const p = sp[i], q = sp[(i + 1) % 5], pts = [];
      for (let j = -1; j <= 7; j++) { const f = j / 6; pts.push(onCap(p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f)); }      // each line goes a little too far: a nail slips
      star.push(tube(pts, [0.0055, 0.0065, 0.0045], { ring: 4, seg: 10 }));
    }
    S.add('bell', join(star), SCRATCH, { name: 'mark' });
    // plasma ball: it grows between the wire ends for a shot or a cage
    S.add('body', ball(0.13, 16, 10), ORB, { p: [0, 0.45, 0], name: 'orb' });
    // large curious eyes
    S.eye('bell', [0.546, 1.046, 0.199], 0.064, { dir: [0.94, 0.08, 0.34], sclera: '#0c1230', iris: '#58c8ff', iris2: '#e8fbff', pupil: 'round', lid: NAVY, open: 72, tilt: 8, glow: 1.3, size: 56, m: 1 });
  },
  anim(b, t, c) {
    const a = t.a, s = t.s, h = t.h, k = t.k, tm = t.tm;
    const melee = k === 'melee', shot = k === 'shot', buff = k === 'buff', slam = k === 'slam';
    const s2 = 4 * s * (1 - s);                 // the late part of a strike: parts that follow use it
    // ultimate "Brainstorm": the arms go straight down, rigid, as if into the floor; the bell lifts and pulses; the filament is at maximum
    const u = t.u || 0, uo = ease(u * 1.6), nu = 1 - uo, zap = Math.sin(tm * 7.5);
    const cage = buff ? Math.min(1, a + s) * nu : 0;
    // --- how the body moves. mvR: how much it moves. dF, dS: part of the full speed forward / to the L side. push: how hard it accelerates.
    const mvR = Math.max(t.mv, Math.min(1, Math.hypot(t.vf, t.vs) / 1.2), Math.min(0.5, Math.abs(t.tn) * 0.7)) * nu;
    const noV = Math.abs(t.vf) + Math.abs(t.vs) < 0.02 && Math.abs(t.tn) < 0.02;
    const dF = cl(t.vf / 2.6 + (noV ? t.sw * 1.4 : 0), -1, 1), dS = cl(t.vs / 2.6, -1, 1), sp = Math.min(1, Math.hypot(dF, dS));
    const push = cl(Math.hypot(t.af, t.as) / 30, 0, 1) + cl(t.va * 0.25, 0, 0.6);
    const hitB = -t.hx * h, hitS = t.hz * h, hit0 = h * (1 - Math.min(1, Math.abs(t.hx) + Math.abs(t.hz)));   // push to the back / to the L; hit0: a hit with no direction
    const rest = (1 - mvR) * (1 - Math.max(a, s)) * nu;
    // --- the pulse. A jellyfish moves by pulses: the bell contracts fast and opens slowly. The pulse comes faster when it moves and when it accelerates.
    const ps = c._pulse || (c._pulse = { acc: 0, tm });
    let dt = tm - ps.tm; ps.tm = tm; if (!(dt > 0) || dt > 0.2) dt = 0;
    ps.acc += Math.min(dt, 0.034) * push * 7; if (ps.acc > 1e4) ps.acc -= 1e4;
    const pu = fr01((t.p * 1.4 + t.w * 0.3 + ps.acc) / TAU), pAmp = (0.045 + 0.085 * mvR + push * 0.05) * (1 - Math.max(a, s) * 0.7);
    const pc = squeeze(pu), thrust = squeeze(fr01(pu - 0.1)) - 0.42;           // thrust: the body goes up and forward a moment after the bell closes
    // bell: sq > 0 = narrow and tall. It contracts for a shot and then opens fast.
    const sq = (pc - 0.42) * pAmp * nu + (shot || slam ? a * 0.17 - s * 0.26 + s2 * 0.08 : a * 0.06 - s * 0.1) * nu - h * 0.1 + uo * (0.03 + zap * 0.07);
    b.bell.scale.set(1 - sq, 1 + sq * 1.15, 1 - sq);
    b.bell.position.y += uo * (0.05 + zap * 0.012);
    // at rest it drifts a little; in motion each pulse lifts it and pushes it on
    const dx = Math.sin(tm * 0.5) * Math.sin(tm * 0.19 + 1) * 0.05 * rest, dz = Math.sin(tm * 0.43 + 2) * Math.sin(tm * 0.17) * 0.05 * rest;
    b.body.position.y += thrust * (0.035 + 0.06 * mvR) * nu + (a * 0.05 - s * 0.05) * nu + cage * 0.06 + uo * 0.1;
    b.body.position.x += dx + thrust * 0.07 * dF * mvR + ((melee ? s * 0.14 : shot ? -s * 0.1 : 0) - a * 0.05) * nu - (hitB + hit0) * 0.08;
    b.body.position.z += dz + thrust * 0.07 * dS * mvR + hitS * 0.08;
    // the bell tilts into the direction of the motion (the top leads); it rocks back from a hit
    b.body.rotation.z = -dF * 0.26 * mvR - thrust * 0.05 * dF * mvR + dx * 1.5 + (melee ? a * 0.32 - s * 0.34 : shot ? a * 0.14 - s * 0.22 : 0) * nu + (hitB + hit0) * 0.3;
    b.body.rotation.x = dS * 0.26 * mvR - dz * 1.5 + t.tn * 0.1 * sp + hitS * 0.3;
    b.body.rotation.y = t.lk * 0.2 + Math.sin(tm * 0.33) * Math.sin(tm * 0.13 + 2) * 0.25 * rest;
    // the springs of the arms are off in the ultimate: the arms are rigid then
    if (c.dyn) for (const d of c.dyn) { if (d.amt0 === undefined) d.amt0 = d.amt; d.amt = d.amt0 * nu; }
    // curiosity: now and then one front arm reaches out to touch something
    const pk = Math.max(0, Math.sin(t.p * 0.31) - 0.72) * 3.5 * rest, pkArm = Math.sin(t.p * 0.155) > 0 ? 0 : 7;
    for (let i = 0; i < N; i++) {
      const ang = (i + 0.5) * TAU / N, cx = Math.cos(ang), sz = Math.sin(ang), front = Math.max(0, cx), r0 = b['t' + i + 'a'];
      r0.position.x *= 1 - sq * nu; r0.position.z *= 1 - sq * nu;
      for (let j = 0; j < NS; j++) {
        // out: the segment swings away from the centre line. fwd: it swings to the front. tg: it swings round the bell.
        // At rest each arm drifts on its own slow phase. Each pulse pulls the arms in, joint after joint, and they open again slowly.
        const pj = squeeze(fr01(pu - 0.07 * (j + 1))) - 0.42;
        let out = Math.sin(tm * (0.55 + 0.07 * i) + i * 1.3 - j * 0.8) * (0.07 + 0.035 * j) * (1 + t.gl * 0.5) * (1 - mvR * 0.6)
          - pj * (0.1 + 0.05 * j) * (0.5 + mvR) * (1 - Math.max(a, s)) - mvR * 0.06 - h * (0.2 + 0.12 * j) + Math.sin(tm * 30 + i * 2 + j) * 0.04 * (h + t.gl * 0.4);
        let fwd = -(hitB + hit0) * 0.25 * (j + 1) * 0.5;
        let tg = Math.sin(tm * (0.4 + 0.05 * i) + i * 2.1 - j * 0.6) * 0.045 * (1 + j * 0.5) * (1 - mvR * 0.5) + t.tn * 0.08 * (j + 1) * mvR;
        if (i === pkArm) { fwd += pk * (0.5 - j * 0.1 + Math.sin(t.p * 2.5) * 0.08); out += pk * 0.25; }
        if (melee) {          // the front arms curl back, then lash forward: the tip comes last
          fwd += front * (-a * (0.45 + 0.08 * j) + (j < 2 ? s : s * 0.5 + s2 * 0.6) * LASH[j]) - (1 - front) * s * 0.25;
          out += front * s * 0.15;
        } else if (shot) {    // the wire ends point at the plasma ball, then open
          out += a * AIM[j] + s * OPEN[j];
        } else if (slam) {    // all arms lift, then hit down
          out += a * LIFT[j] - (j < 2 ? s : s * 0.5 + s2 * 0.6) * DROP[j];
        } else out += cage * (i % 2 ? CAGE_UP : CAGE_DN)[j];   // wire cage: 4 hoops go down, 4 hoops go up around the bell
        // ultimate: a straight line down. Only a small shake from the current stays.
        out = out * nu + uo * (STRAIGHT[j] + Math.sin(tm * 43 + i * 1.7 + j) * 0.008);
        fwd *= nu; tg *= nu;
        const bn = b['t' + i + SEG[j]];
        turn(bn, -sz * out + cx * tg, 0, cx * out + sz * tg + fwd);
        if (j) bn.position.multiplyScalar(1 + (REACH * 0.985 - 1) * uo);      // the arm gets longer: it reaches the floor
        if (j === NS - 1) bn.scale.setScalar(1 + uo * 0.25);
      }
      // sparks at the frayed ends; in the ultimate they fire one after the other, round the ring
      const fire = uo * (0.9 + 1.1 * Math.pow(Math.max(0, Math.sin(tm * 11 - i * TAU / N * 3)), 4));
      c.parts['e' + i].scale.setScalar(1 + Math.sin(tm * 31 + i * 2.4) * (0.12 + 0.2 * t.gl + 0.2 * a) + Math.min(0.8, a * 0.45 + s * 0.6 + cage * 0.3) + fire + pc * 0.25 * mvR);
    }
    // filament and plasma ball: the filament is brighter for a moment with each pulse
    const hot = a * 0.25 + s * 0.3 + t.gl * 0.12 + uo * (0.42 + zap * 0.08) + pc * 0.06 * (0.4 + mvR);
    c.parts.coil.scale.setScalar(1 + Math.sin(tm * 9) * 0.03 + Math.min(0.55, hot));
    c.parts.coil.rotation.y = Math.sin(tm * 43) * 0.06 * (a + t.gl + h) + uo * tm * 5;
    c.parts.halo.scale.setScalar(1 + Math.sin(tm * 6) * 0.06 + Math.min(0.75, hot * 1.4));
    const orb = c.parts.orb, grow = shot ? a * (1 - s) * nu : cage * 0.75;
    orb.visible = grow > 0.02;
    orb.scale.setScalar(Math.max(0.01, grow * (1 + Math.sin(tm * 27) * 0.1)));
    orb.position.y += cage * 0.16;
  }
};
