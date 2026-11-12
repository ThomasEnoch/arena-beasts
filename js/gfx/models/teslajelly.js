/* Teslajelly - blown-glass jellyfish bulb with a filament coil and braided copper tentacles. Volt / Tide. */
import { tube, lathe, ball } from '../geo.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const COBALT = '#1c389c', LOBE = '#2a4cc0', NAVY = '#0f1840', BRASS = '#c99a3c', DBRASS = '#9a6f24', COPPER = '#c9703a', DCOP = '#8c4424', CYAN = '#7fe0ff';
const GLASS = { col: '#3a6cf0', op: 0.4, rough: 0.05, env: 1.6, side: 1, noOut: true };
const RIB = { col: '#1a2f8a', rough: 0.2, glow: '#2f58ff', glowK: 0.7, noOut: true };
const STEM = { col: '#a8c8ff', op: 0.5, rough: 0.08, env: 1.4, noOut: true };
const FIL = { col: '#ffe6b0', glow: '#ffb040', glowK: 4.2, noOut: true };
const HALO = { col: '#ff9a30', add: true, op: 0.2, noOut: true };
const BRASSM = { col: BRASS, metal: 1, rough: 0.28, env: 1.2 };
const RIVET = { col: '#f0dc9a', metal: 1, rough: 0.2, env: 1.3 };
const SPARK = { col: '#dcf8ff', glow: '#5ad0ff', glowK: 3.4, noOut: true };
const ORB = { col: '#c8f0ff', glow: '#7fd8ff', glowK: 3, add: true, op: 0.85, noOut: true };

const N = 8, TAU = Math.PI * 2, SEG = 'abc';
const TP = [[0.4, 0.88], [0.49, 0.68], [0.5, 0.49], [0.45, 0.33]];   // tentacle line: [distance from the axis, y]
// tentacle turns for each segment: lash, aim at the plasma ball, open, lift, drop, cage (lower hoops and upper hoops)
const LASH = [1.1, 0.42, 0.32], AIM = [0.2, -0.5, -0.6], OPEN = [0.55, 0.15, 0.1], LIFT = [1.15, 0.3, 0.25], DROP = [0.3, 0.2, 0.2], CAGE_DN = [1.0, -0.85, -0.95], CAGE_UP = [1.47, 1.5, 1.0];
const join = list => mergeGeometries(list.map(g => { g = g.index ? g.toNonIndexed() : g.clone(); g.deleteAttribute('uv'); return g; }));
// Turn a bone by a rotation vector (axis x angle). The tentacles need turns around slanted axes.
function turn(bn, x, y, z) {
  const an = Math.sqrt(x * x + y * y + z * z);
  if (an < 1e-6) return;
  const q = Math.sin(an / 2) / an;
  bn.quaternion.set(x * q, y * q, z * q, Math.cos(an / 2));
}

export default {
  id: 'teslajelly', rim: '#8fc0ff', focus: 'coil', top: 1.78, rough: 0.4, opts: { cell: 0.024, mottle: 0.05, mottleF: 14 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.95, 0]).bone('bell', 'body', [0, 1.03, 0]);
    for (let i = 0; i < N; i++) {
      const a = (i + 0.5) * TAU / N, cx = Math.cos(a), sz = Math.sin(a);
      for (let j = 0; j < 3; j++) S.bone('t' + i + SEG[j], j ? 't' + i + SEG[j - 1] : 'body', [cx * TP[j][0], TP[j][1], sz * TP[j][0]]);
    }
    S.color(COBALT);
    // thick lip of dark glass with 8 lobes, floor of the bell
    S.tor('bell', [0, 1.03, 0], 0.47, 0.068, { gloss: 0.85, k: 0.03 });
    for (let i = 0; i < N; i++) { const a = (i + 0.5) * TAU / N; S.ell('bell', [Math.cos(a) * 0.5, 0.995, Math.sin(a) * 0.5], [0.095, 0.075, 0.095], { col: LOBE, gloss: 0.85, k: 0.035, cb: 0.04 }); }
    S.ell('bell', [0, 1.01, 0], [0.45, 0.065, 0.45], { col: NAVY, k: 0.02, gloss: 0.5 });
    S.cap('bell', [0, 1.04, 0], [0, 1.1, 0], 0.15, 0.115, { col: BRASS, metal: 1, gloss: 0.6, k: 0.012 });
    S.tor('bell', [0, 1.075, 0], 0.15, 0.026, { col: DBRASS, metal: 1, gloss: 0.6, k: 0.008 });
    // eye housings on the front of the lip
    S.ell('bell', [0.4745, 1.035, 0.1727], 0.082, { m: 1, col: NAVY, gloss: 0.6, k: 0.02 });
    S.tor('bell', [0.515, 1.037, 0.1875], 0.062, 0.022, { m: 1, col: BRASS, metal: 1, gloss: 0.7, k: 0.008, rot: [0, -20, 90] });
    // brass collar, dark underside, screw base with a glowing contact
    S.tor('bell', [0, 0.94, 0], 0.41, 0.048, { col: BRASS, metal: 1, gloss: 0.6, k: 0.012, sb: 0.05 });
    S.ell('body', [0, 0.95, 0], [0.38, 0.11, 0.38], { col: NAVY, k: 0.03 });
    S.cap('body', [0, 0.88, 0], [0, 0.71, 0], 0.19, 0.145, { col: BRASS, metal: 1, gloss: 0.55, k: 0.015 });
    for (let i = 0; i < 3; i++) S.tor('body', [0, 0.86 - i * 0.06, 0], 0.178 - i * 0.014, 0.03, { col: DBRASS, metal: 1, gloss: 0.65, k: 0.008 });
    S.ell('body', [0, 0.645, 0], [0.12, 0.065, 0.12], { col: '#1c2028', k: 0.012, gloss: 0.6 });
    S.ell('body', [0, 0.585, 0], [0.065, 0.05, 0.065], { col: CYAN, glow: 2.8, k: 0.01 });
    // tentacles: copper cable with wound bands, a brass socket at the top and a brass ferrule at the end
    for (let i = 0; i < N; i++) {
      const a = (i + 0.5) * TAU / N, cx = Math.cos(a), sz = Math.sin(a), P = TP.map(q => [cx * q[0], q[1], sz * q[0]]), bn = [0, 1, 2].map(j => 't' + i + SEG[j]);
      S.tube(bn, P, [0.055, 0.049, 0.043, 0.038], { col: COPPER, metal: 1, gloss: 0.5, k: 0.02, sb: 0.05 });
      S.ell(bn[0], P[0], 0.075, { col: BRASS, metal: 1, gloss: 0.6, k: 0.015, sb: 0.05 });
      for (let j = 0; j < 3; j++) for (const u of [0.32, 0.72]) {
        const r = 0.068 - j * 0.007;
        S.ell(bn[j], [P[j][0] + (P[j + 1][0] - P[j][0]) * u, P[j][1] + (P[j + 1][1] - P[j][1]) * u, P[j][2] + (P[j + 1][2] - P[j][2]) * u], [r, 0.03, r], { col: u < 0.5 ? DCOP : '#e89a5a', metal: 1, gloss: 0.6, k: 0.008, sb: 0.05 });
      }
      S.ell(bn[2], P[3], [0.06, 0.052, 0.06], { col: BRASS, metal: 1, gloss: 0.7, k: 0.012, sb: 0.05 });
      S.add(bn[2], ball(0.052, 12, 8), SPARK, { p: [P[3][0], P[3][1] - 0.055, P[3][2]], name: 'e' + i });
    }
    // colour: glow ring on the floor, light band on the lip, marks on the lobes
    S.tor('bell', [0, 1.05, 0], 0.3, 0.03, { paint: 1, col: CYAN, glow: 2.4, cb: 0.012 });
    S.tor('bell', [0, 1.03, 0], 0.536, 0.02, { paint: 1, col: '#7aa4ff', glow: 0.9, cb: 0.012 });
    for (let i = 0; i < N; i++) { const a = (i + 0.5) * TAU / N; S.ell('bell', [Math.cos(a) * 0.59, 0.985, Math.sin(a) * 0.59], 0.03, { paint: 1, col: CYAN, glow: 2.2, cb: 0.01 }); }

    // glass dome with ribs and a brass knob
    const prof = [], H = 0.62, R = 0.485;
    for (let i = 0; i <= 16; i++) { const th = i / 16 * Math.PI / 2; prof.push([R * Math.pow(Math.cos(th), 0.7), H * Math.sin(th)]); }
    S.add('bell', lathe(prof, 32), GLASS, { p: [0, 1.03, 0], name: 'dome' });
    const ribs = [];
    for (let i = 0; i < N; i++) {
      const a = (i + 0.5) * TAU / N, pts = [];
      for (let j = 0; j <= 8; j++) { const th = j / 8 * Math.PI / 2 * 0.96, r = R * Math.pow(Math.cos(th), 0.7) * 1.006; pts.push([Math.cos(a) * r, H * Math.sin(th) * 1.006, Math.sin(a) * r]); }
      ribs.push(tube(pts, [0.013, 0.011, 0.007], { ring: 5, seg: 16 }));
    }
    S.add('bell', join(ribs), RIB, { p: [0, 1.03, 0], name: 'ribs' });
    S.add('bell', lathe([[0.085, -0.035], [0.08, 0], [0.04, 0.018], [0.032, 0.045], [0.05, 0.068], [0.035, 0.095], [0, 0.1]], 14), BRASSM, { p: [0, 1.645, 0], name: 'knob' });
    // filament: a helix between two brass posts on a glass stem
    const hx = [];
    for (let i = 0; i <= 44; i++) { const u = i / 44, an = u * 5.5 * TAU; hx.push([Math.cos(an) * 0.095, -0.13 + u * 0.26, Math.sin(an) * 0.095]); }
    S.add('bell', tube(hx, [0.016, 0.016], { ring: 6, seg: 176 }), FIL, { p: [0, 1.3, 0], name: 'coil' });
    S.add('bell', join([
      tube([[0.07, 1.09, 0], [0.12, 1.13, 0], [0.095, 1.17, 0]], [0.012, 0.012], { ring: 5 }),
      tube([[-0.07, 1.09, 0], [-0.16, 1.2, 0], [-0.15, 1.38, 0], [-0.095, 1.43, 0]], [0.012, 0.012], { ring: 5 })
    ]), BRASSM);
    S.add('bell', lathe([[0.075, 0], [0.05, 0.04], [0.03, 0.12], [0.022, 0.2], [0, 0.21]], 12), STEM, { p: [0, 1.09, 0] });
    S.add('bell', ball(0.22, 16, 10), HALO, { p: [0, 1.3, 0], name: 'halo' });
    // rivets on the collar
    const rv = [];
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16, g = ball(0.021, 8, 6); g.translate(Math.cos(a) * 0.458, 0.94, Math.sin(a) * 0.458); rv.push(g); }
    S.add('bell', join(rv), RIVET);
    // plasma ball: it grows between the electrodes for a shot or a cage
    S.add('body', ball(0.13, 16, 10), ORB, { p: [0, 0.45, 0], name: 'orb' });
    S.eye('bell', [0.54, 1.04, 0.1967], 0.055, { dir: [0.94, 0.05, 0.34], sclera: '#0c1230', iris: '#58c8ff', iris2: '#e8fbff', pupil: 'none', lid: NAVY, open: 62, glow: 1.6, size: 52, m: 1 });
  },
  anim(b, t, c) {
    const a = t.a, s = t.s, h = t.h, k = t.k, pulse = Math.sin(t.p * 1.4), sw = Math.sin(t.w * 0.9);
    const melee = k === 'melee', shot = k === 'shot', buff = k === 'buff', slam = k === 'slam', cage = buff ? Math.min(1, a + s) : 0;
    // bell: slow pulse, squash and stretch when it moves, it contracts for a shot and then opens fast. sq > 0 = narrow and tall.
    const sq = pulse * 0.035 + sw * 0.11 * t.mv + (shot || slam ? a * 0.17 - s * 0.26 : a * 0.06 - s * 0.1) - h * 0.1;
    b.bell.scale.set(1 - sq, 1 + sq * 1.15, 1 - sq);
    b.body.position.y += pulse * 0.03 + sw * 0.035 * t.mv + a * 0.05 - s * 0.05 + cage * 0.06;
    b.body.position.x += (melee ? s * 0.14 : shot ? -s * 0.1 : 0) - a * 0.05;
    b.body.rotation.z = -t.sw * 0.22 + (melee ? a * 0.32 - s * 0.34 : shot ? a * 0.14 - s * 0.22 : 0) + h * 0.3;
    b.body.rotation.x = t.sl * 0.25;
    b.body.rotation.y = t.lk * 0.2;
    for (let i = 0; i < N; i++) {
      const ang = (i + 0.5) * TAU / N, cx = Math.cos(ang), sz = Math.sin(ang), front = Math.max(0, cx), r0 = b['t' + i + 'a'];
      r0.position.x *= 1 - sq; r0.position.z *= 1 - sq;
      for (let j = 0; j < 3; j++) {
        // out: the segment swings away from the centre line. fwd: it swings to the front.
        let out = Math.sin(t.p * 1.4 - 1.1 - j * 0.9 + i * 0.35) * (0.1 + 0.05 * j) * (1 + t.gl * 0.5) - t.mv * 0.1 - h * (0.2 + 0.15 * j) + Math.sin(t.tm * 30 + i * 2 + j) * 0.04 * (h + t.gl * 0.4);
        let fwd = -t.sw * (0.26 + 0.12 * j) + sw * 0.08 * t.mv * (j + 1);
        if (melee) {          // the front tentacles curl back, then lash forward
          fwd += front * (-a * (0.45 + 0.1 * j) + s * LASH[j]) - (1 - front) * s * 0.25;
          out += front * s * 0.15;
        } else if (shot) {    // the electrodes point at the plasma ball, then open
          out += a * AIM[j] + s * OPEN[j];
        } else if (slam) {    // all tentacles lift, then hit down
          out += a * LIFT[j] - s * DROP[j];
        } else out += cage * (i % 2 ? CAGE_UP : CAGE_DN)[j];   // wire cage: 4 hoops go down, 4 hoops go up around the bell
        turn(b['t' + i + SEG[j]], -sz * out - t.sl * (0.18 + 0.08 * j), 0, cx * out + fwd);
      }
      c.parts['e' + i].scale.setScalar(1 + Math.sin(t.tm * 31 + i * 2.4) * (0.12 + 0.2 * t.gl + 0.2 * a) + Math.min(0.8, a * 0.45 + s * 0.6 + cage * 0.3));
    }
    // filament and plasma ball
    const hot = a * 0.25 + s * 0.3 + t.gl * 0.12;
    c.parts.coil.scale.setScalar(1 + Math.sin(t.tm * 9) * 0.03 + Math.min(0.35, hot));
    c.parts.coil.rotation.y = Math.sin(t.tm * 43) * 0.06 * (a + t.gl + h);
    c.parts.halo.scale.setScalar(1 + Math.sin(t.tm * 6) * 0.06 + Math.min(0.42, hot * 1.4));
    const orb = c.parts.orb, grow = shot ? a * (1 - s) : cage * 0.75;
    orb.visible = grow > 0.02;
    orb.scale.setScalar(Math.max(0.01, grow * (1 + Math.sin(t.tm * 27) * 0.1)));
    orb.position.y += cage * 0.16;
  }
};
