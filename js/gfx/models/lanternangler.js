/* Lanternangler - deep-sea angler of black wrought iron with a stained-glass lantern on its lure. Shade / Tide. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, blade, ball, cone, torus, flame } from '../geo.js';
import { A } from '../rig.js';

const IRON = '#1c1f26', IRON2 = '#30353f', STEELC = '#59626e', CYAN = '#5fe8ff', DEEP = '#0d3a44';
const IRONM = { col: '#262a32', metal: 0.9, rough: 0.42, env: 1.1 };
const SCROLL = { col: '#444e5c', metal: 1, rough: 0.32, env: 1.3 };
const RIVET = { col: '#8d98a6', metal: 1, rough: 0.25, env: 1.3 };
const TOOTH = { col: '#c3ccd6', metal: 1, rough: 0.2, env: 1.5, flat: true };
const MEMB = { col: '#4fd2dc', op: 0.4, rough: 0.1, env: 1.4, glow: '#1a8a9a', glowK: 0.5, side: 1, noOut: true };
const GLASS1 = { col: '#7ff0f4', op: 0.45, rough: 0.05, env: 1.6, glow: '#2ac8d8', glowK: 0.6, flat: true, side: 1, noOut: true };
const GLASS2 = { col: '#4a7cf0', op: 0.5, rough: 0.05, env: 1.6, glow: '#2a50d8', glowK: 0.6, flat: true, side: 1, noOut: true };
const WISP = { col: '#e4ffff', glow: '#5fe8ff', glowK: 3.8, noOut: true };
const SOUL = { col: '#9ff4ff', glow: '#3fd8f0', glowK: 2.2, noOut: true };
const HALO = { col: '#3fd8f0', add: true, op: 0.18, noOut: true };

const D2R = Math.PI / 180;
const BC = [-0.05, 0.98, 0], BR = [0.5, 0.43, 0.38], HC = [0.22, 1.08, 0], HR = [0.3, 0.3, 0.34];   // body and head ellipsoids
const UJ = [0.3, 0.98, 0], LJ = [0.3, 0.74, 0], UR = 0.34, LR = 0.44, UT = -12 * D2R;              // jaw arcs: upper rim, lower ring
const STK = [[0.1, 1.33, 0], [0.2, 1.62, 0], [0.45, 1.8, 0], [0.74, 1.76, 0]];                    // lure stalk
const EYE = [0.34, 1.15, 0.3];
const FWD = [0.32, 0.3, 0.22], BACK = [0.4, 0.4, 0.3], WHIP = [0.5, 0.5, 0.4], LIFT = [0.2, 0.3, 0.5];   // stalk turns for each segment
const join = list => mergeGeometries(list.map(g => { g = g.index ? g.toNonIndexed() : g.clone(); g.deleteAttribute('uv'); return g; }));
const at = (g, x, y, z) => { g.translate(x, y, z); return g; };
// z of the body surface at (x, y), with a small gap. Scrolls and rivets use it to stay on the surface.
function zOn(x, y, gap = 0.012) {
  const f = (c, r) => { const q = 1 - ((x - c[0]) / r[0]) ** 2 - ((y - c[1]) / r[1]) ** 2; return q > 0 ? r[2] * Math.sqrt(q) : 0; };
  return Math.max(f(BC, BR), f(HC, HR)) + gap;
}
// point on a jaw arc. th = angle from the front (degrees), tilt = pitch of the arc plane (radians).
const arcP = (c, R, tilt, th, dy = 0) => [c[0] + R * Math.cos(th * D2R) * Math.cos(tilt), c[1] + R * Math.cos(th * D2R) * Math.sin(tilt) + dy, R * Math.sin(th * D2R)];
// spiral on the body surface
function scroll(cx, cy, r0, r1, a0, a1, n, out) {
  for (let i = 0; i <= n; i++) { const u = i / n, an = (a0 + (a1 - a0) * u) * D2R, r = r0 + (r1 - r0) * u, x = cx + Math.cos(an) * r, y = cy + Math.sin(an) * r; out.push([x, y, zOn(x, y)]); }
  return out;
}
const yTop = x => BC[1] + BR[1] * Math.sqrt(Math.max(0, 1 - ((x - BC[0]) / BR[0]) ** 2));
const yBot = x => BC[1] - BR[1] * Math.sqrt(Math.max(0, 1 - ((x - BC[0]) / BR[0]) ** 2));

export default {
  id: 'lanternangler', rim: '#8ff0ff', focus: 'wisp', top: 1.92, rough: 0.45, opts: { cell: 0.025, mottle: 0.12, mottleF: 16 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.98, 0]).bone('head', 'body', [0.1, 1.02, 0]).bone('jaw', 'head', [0.0, 0.8, 0])
      .bone('st1', 'head', STK[0]).bone('st2', 'st1', STK[1]).bone('st3', 'st2', STK[2]).bone('lamp', 'st3', STK[3])
      .bone('dorsal', 'body', [-0.22, 1.36, 0]).bone('finL', 'body', [-0.08, 0.82, 0.35], { m: 1 })
      .bone('tail1', 'body', [-0.45, 0.98, 0]).bone('tail2', 'tail1', [-0.68, 1.0, 0]).bone('tfin', 'tail2', [-0.86, 1.01, 0]);
    const fe = { metal: 0.75, gloss: 0.4 }, fe2 = { col: IRON2, metal: 0.8, gloss: 0.5, k: 0.015 };
    S.color(IRON);
    S.ell('body', BC, BR, fe);
    S.ell('head', HC, HR, Object.assign({ k: 0.06 }, fe));
    for (let i = 0; i < 5; i++) { const x = -0.44 + i * 0.1; S.ell('body', [x, yTop(x) - 0.01, 0], [0.045, 0.04, 0.05], fe2); }   // spine
    S.cap('body', [-0.4, yBot(-0.4) + 0.02, 0], [0.0, yBot(0.0) + 0.02, 0], 0.045, 0.045, fe2);                                   // keel
    // open rib cage: the body is hollow and has 3 windows on each side
    S.ell('body', [-0.2, 0.98, 0], [0.28, 0.3, 0.3], { sub: 1, col: DEEP, glow: 1.0, k: 0.02 });
    for (let i = 0; i < 3; i++) S.box('body', [-0.38 + i * 0.13, 0.96, 0], [0.037, 0.2, 0.6], 0.03, { sub: 1, col: IRON2, k: 0.012, rot: [0, 0, -12] });
    // tail with 2 iron bands
    S.tube(['tail1', 'tail2', 'tfin'], [[-0.42, 0.98, 0], [-0.68, 1.0, 0], [-0.86, 1.01, 0], [-0.93, 1.01, 0]], [0.22, 0.125, 0.085, 0.07], fe);
    S.tor('tail1', [-0.55, 0.99, 0], 0.165, 0.032, Object.assign({ rot: [0, 0, 90] }, fe2));
    S.tor('tail2', [-0.74, 1.0, 0], 0.105, 0.03, Object.assign({ rot: [0, 0, 90] }, fe2));
    // mouth: cut the lower front of the body, then add the upper rim, the cheeks and the brows
    S.ell('head', [0.42, 0.78, 0], [0.4, 0.2, 0.42], { sub: 1, col: DEEP, glow: 0.5, k: 0.02 });
    const up = [], ur = [];
    for (let i = 0; i <= 10; i++) { up.push(arcP(UJ, UR, UT, -100 + i * 20)); ur.push(i === 0 || i === 10 ? 0.045 : 0.06); }
    S.tube('head', up, ur, { col: IRON2, metal: 0.8, gloss: 0.5, k: 0.02 });
    S.ell('head', [0.12, 0.9, 0.3], [0.14, 0.12, 0.1], { m: 1, k: 0.03, metal: 0.75, gloss: 0.4 });
    S.box('head', [0.37, 1.285, 0.25], [0.15, 0.035, 0.1], 0.025, { m: 1, k: 0.02, rot: [14, -18, -20], col: IRON2, metal: 0.8, gloss: 0.5 });
    S.tor('head', [0.16, 1.08, 0], 0.305, 0.034, { k: 0.012, rot: [0, 0, 78], col: IRON2, metal: 0.8, gloss: 0.5 });   // strap over the head
    for (let i = -2; i <= 2; i++) { const an = i * 0.42; S.ell('head', [0.16 - Math.cos(an) * 0.07, 1.08 + Math.cos(an) * 0.335, Math.sin(an) * 0.335], 0.03, { col: STEELC, metal: 1, gloss: 0.7, k: 0.008 }); }
    S.tor('head', EYE, 0.105, 0.032, { m: 1, k: 0.012, rot: [90, 0, -27], col: IRON2, metal: 0.8, gloss: 0.6 });
    // lower jaw: a scoop with a heavy ring, hollow inside
    S.ell('jaw', [0.3, 0.68, 0], [0.44, 0.16, 0.42], { metal: 0.75, gloss: 0.4, k: 0.03, sb: 0.05 });
    const lo = [], lr = [];
    for (let i = 0; i <= 10; i++) { lo.push(arcP(LJ, LR, 0, -105 + i * 21)); lr.push(i === 0 || i === 10 ? 0.048 : 0.062); }
    S.tube('jaw', lo, lr, { col: IRON2, metal: 0.8, gloss: 0.5, k: 0.02, sb: 0.05 });
    S.ell('jaw', [0.34, 0.8, 0], [0.33, 0.12, 0.32], { sub: 1, col: DEEP, glow: 0.7, k: 0.02 });
    S.cap('jaw', [0.72, 0.62, 0], [0.4, 0.54, 0], 0.04, 0.04, fe2);
    // lure stalk with knuckles
    S.tube(['st1', 'st2', 'st3'], STK, [0.052, 0.043, 0.037, 0.033], { metal: 0.8, gloss: 0.5, k: 0.02 });
    for (let i = 0; i < 4; i++) S.ell(i < 3 ? 'st' + (i + 1) : 'st3', STK[i], 0.066 - i * 0.006, fe2);
    // fin roots
    S.ell('finL', [-0.08, 0.82, 0.35], [0.07, 0.06, 0.05], Object.assign({ m: 1 }, fe2));
    S.ell('tfin', [-0.9, 1.01, 0], [0.06, 0.09, 0.05], fe2);
    // colour: worn steel on the rims, glow in the throat and below the eyes
    S.ell('head', [0.64, 0.9, 0], [0.06, 0.07, 0.2], { paint: 1, col: STEELC, cb: 0.03, op: 0.7 });
    S.ell('jaw', [0.74, 0.76, 0], [0.06, 0.07, 0.24], { paint: 1, col: STEELC, cb: 0.03, op: 0.7 });
    S.ell('head', [0.2, 0.86, 0], [0.16, 0.1, 0.2], { paint: 1, col: CYAN, glow: 1.6, cb: 0.06 });
    S.cap('head', [0.2, 1.01, 0.34], [0.44, 0.99, 0.26], 0.018, 0.018, { paint: 1, col: CYAN, glow: 2.2, cb: 0.01, m: 1 });
    for (let i = 0; i < 4; i++) { const x = -0.445 + i * 0.13; S.cap('body', [x - 0.03, 1.15, 0.4], [x + 0.05, 0.77, 0.4], 0.016, 0.016, { paint: 1, col: STEELC, cb: 0.012, op: 0.6, m: 1 }); }

    // teeth: the upper teeth close inside the lower ring, the long lower teeth close in front of the upper rim
    const tu = [], tl = [];
    for (let i = -3; i <= 3; i++) { const th = i * 23, h = 0.19 - Math.abs(i) * 0.022, p = arcP(UJ, UR - 0.035, UT, th, -0.03), g = cone(0.03, h, 5); g.rotateZ(Math.PI); g.rotateX(-Math.sin(th * D2R) * 0.12); tu.push(at(g, p[0], p[1], p[2])); }
    for (let i = 0; i < 8; i++) { const th = -77 + i * 22, h = 0.28 - Math.abs(th) * 0.0017, p = arcP(LJ, LR, 0, th, 0.03), g = cone(0.034, h, 5); g.rotateZ(Math.cos(th * D2R) * 0.06); g.rotateX(-Math.sin(th * D2R) * 0.06); tl.push(at(g, p[0], p[1], p[2])); }
    S.add('head', join(tu), TOOTH);
    S.add('jaw', join(tl), TOOTH);
    // rivets: upper rim, eye ring, lower ring, tail bands. Hinge bolts on the cheeks.
    const rh = [], rj = [];
    for (let i = 0; i < 4; i++) { const p = arcP(UJ, UR + 0.052, UT, 14 + i * 24, 0.02); rh.push(at(ball(0.019, 8, 6), p[0], p[1], p[2])); }
    for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, c = Math.cos(an) * 0.105, s = Math.sin(an) * 0.105; rh.push(at(ball(0.016, 8, 6), EYE[0] - 0.89 * c + 0.45 * 0.036, EYE[1] + s, EYE[2] + 0.45 * c + 0.89 * 0.036)); }
    for (let i = 0; i < 4; i++) { const p = arcP(LJ, LR + 0.056, 0, 12 + i * 24, 0.015); rj.push(at(ball(0.02, 8, 6), p[0], p[1], p[2])); }
    for (let i = 0; i < 3; i++) { const an = (i - 1) * 0.7; rh.push(at(ball(0.016, 8, 6), -0.55, 0.99 + Math.sin(an) * 0.19, Math.cos(an) * 0.19)); }
    S.add('head', join(rh.slice(0, 12)), RIVET, { m: 1 });
    S.add('tail1', join(rh.slice(12)), RIVET, { m: 1 });
    S.add('jaw', join(rj), RIVET, { m: 1 });
    S.add('head', new THREE.CylinderGeometry(0.055, 0.065, 0.05, 8).rotateX(Math.PI / 2), RIVET, { p: [0.1, 0.89, 0.4], m: 1 });
    // scrollwork on each side: an S on the gill cover, a row of curls above and below the rib windows
    const sc = [];
    const s1 = scroll(0.04, 1.14, 0.014, 0.075, 450, -90, 16, []); scroll(0.03, 0.86, 0.075, 0.014, 90, 630, 16, s1);
    sc.push(tube(s1, [0.016, 0.019, 0.016], { ring: 6, seg: 64 }));
    for (let i = 0; i < 3; i++) sc.push(tube(scroll(-0.38 + i * 0.14, 1.265 - (2 - i) * 0.012, 0.012, 0.05, 360, -70, 12, []), [0.012, 0.016], { ring: 6, seg: 26 }));
    for (let i = 0; i < 3; i++) sc.push(tube(scroll(-0.36 + i * 0.14, 0.685 + (2 - i) * 0.012, 0.012, 0.045, 0, 430, 12, []), [0.012, 0.016], { ring: 6, seg: 26 }));
    const ln = (x0, y0, x1, y1) => { const q = []; for (let i = 0; i <= 6; i++) { const x = x0 + (x1 - x0) * i / 6, y = y0 + (y1 - y0) * i / 6; q.push([x, y, zOn(x, y)]); } return tube(q, [0.014, 0.014], { ring: 6, seg: 12 }); };
    sc.push(ln(-0.47, 1.17, -0.02, 1.21), ln(-0.45, 0.75, -0.04, 0.74));
    S.add('body', join(sc), SCROLL, { m: 1 });
    // loops below the keel
    const lp = [];
    for (let i = 0; i < 4; i++) { const x = -0.36 + i * 0.105; lp.push(at(torus(0.05, 0.013, 14, 6, Math.PI).rotateZ(Math.PI), x, yBot(x) + 0.0, 0)); }
    S.add('body', join(lp), SCROLL);
    // caged light in the ribs
    S.add('body', flame(0.1, 0.3, 10), SOUL, { p: [-0.2, 0.84, 0], name: 'soul' });
    // dorsal fin, tail fin, side fins: iron ribs and a glass membrane
    const fin = (bone, p, tips, edge, o) => {
      S.add(bone, join(tips.map(q => tube([[0, 0, 0], [q[0] * 0.55, q[1] * 0.55 + 0.01, 0], [q[0], q[1], 0]], [0.02, 0.016, 0.008], { ring: 5 }))), IRONM, Object.assign({ p }, o));
      S.add(bone, blade(edge, 0.012, { bevel: 0.003 }), MEMB, Object.assign({ p }, o));
    };
    const D0 = [-0.22, 1.36, 0], db = [-0.4, -0.28, -0.16, -0.04].map(x => [x - D0[0], yTop(x) - 0.03 - D0[1]]), dt = [[-0.3, 0.1], [-0.2, 0.26], [-0.04, 0.3], [0.1, 0.2]];
    S.add('dorsal', join(db.map((q, i) => tube([[q[0], q[1], 0], [dt[i][0], dt[i][1], 0]], [0.022, 0.008], { ring: 5, seg: 3 }))), IRONM, { p: D0 });
    S.add('dorsal', blade([db[0], dt[0], [-0.2, 0.15], dt[1], [-0.1, 0.22], dt[2], [0.04, 0.2], dt[3], db[3]], 0.012, { bevel: 0.003 }), MEMB, { p: D0 });
    fin('tfin', [-0.88, 1.01, 0], [[-0.36, 0.34], [-0.3, 0.15], [-0.33, 0], [-0.3, -0.15], [-0.36, -0.32]],
      [[0, 0.05], [-0.36, 0.34], [-0.26, 0.22], [-0.3, 0.15], [-0.25, 0.07], [-0.33, 0], [-0.25, -0.07], [-0.3, -0.15], [-0.26, -0.21], [-0.36, -0.32], [0, -0.05]], {});
    fin('finL', [-0.08, 0.82, 0.36], [[-0.3, 0.08], [-0.33, -0.07], [-0.27, -0.2], [-0.16, -0.27]],
      [[0, 0.03], [-0.3, 0.08], [-0.26, 0.0], [-0.33, -0.07], [-0.25, -0.12], [-0.27, -0.2], [-0.18, -0.2], [-0.16, -0.27], [0, -0.04]], { r: [0, 38, 0], m: 1 });
    // lantern on the lamp bone: iron frame, 6 panes of stained glass, the wisp
    const fr = [at(torus(0.03, 0.009, 12, 6), 0, -0.035, 0), at(torus(0.028, 0.009, 12, 6).rotateY(Math.PI / 2), 0, -0.085, 0), at(cone(0.125, 0.1, 6), 0, -0.21, 0), at(ball(0.022, 8, 6), 0, -0.11, 0),
      at(new THREE.CylinderGeometry(0.12, 0.12, 0.022, 6), 0, -0.215, 0), at(new THREE.CylinderGeometry(0.12, 0.1, 0.03, 6), 0, -0.445, 0), at(cone(0.055, 0.08, 6).rotateZ(Math.PI), 0, -0.455, 0), at(ball(0.02, 8, 6), 0, -0.54, 0)];
    const g1 = [], g2 = [];
    for (let i = 0; i < 6; i++) {
      const a0 = i * Math.PI / 3, a1 = a0 + Math.PI / 3, r = 0.1;
      fr.push(at(new THREE.CylinderGeometry(0.011, 0.011, 0.23, 5), Math.cos(a0) * r, -0.33, Math.sin(a0) * r));
      const pane = new THREE.PlaneGeometry(2 * r * Math.sin(Math.PI / 6) - 0.006, 0.21); pane.rotateY(Math.PI / 2 - (a0 + a1) / 2); pane.translate(Math.cos((a0 + a1) / 2) * r * 0.85, -0.33, Math.sin((a0 + a1) / 2) * r * 0.85);
      (i % 2 ? g2 : g1).push(pane);
    }
    S.add('lamp', join(fr), IRONM, { p: STK[3] });
    S.add('lamp', join(g1), GLASS1, { p: STK[3] });
    S.add('lamp', join(g2), GLASS2, { p: STK[3] });
    S.add('lamp', flame(0.05, 0.16, 10), WISP, { p: [STK[3][0], STK[3][1] - 0.42, 0], name: 'wisp' });
    S.add('lamp', ball(0.2, 14, 10), HALO, { p: [STK[3][0], STK[3][1] - 0.33, 0], name: 'halo' });
    S.eye('head', EYE, 0.1, { dir: [0.45, 0.26, 0.86], sclera: '#dcebe6', iris: '#a8d8d4', iris2: '#e6fbf6', pupil: 'round', lid: IRON2, open: 58, tilt: -10, glow: 0.35, size: 34, m: 1 });
  },
  anim(b, t, c) {
    const br = Math.sin(t.p * 0.9), a = t.a, s = t.s, h = t.h, k = t.k;
    const melee = k === 'melee', shot = k === 'shot', slam = k === 'slam', flash = k === 'buff' ? Math.min(1, a + s) : 0;
    b.body.position.y += br * 0.035 + a * (melee ? 0.1 : 0.04);
    b.body.position.x += melee ? s * 0.24 - a * 0.14 : -a * 0.05 - s * (shot ? 0.06 : 0);
    b.body.rotation.z = -t.sw * 0.1 + (melee ? a * 0.14 - s * 0.12 : shot ? a * 0.12 - s * 0.14 : slam ? a * 0.2 : 0) + h * 0.22;
    b.body.rotation.x = t.sl * 0.2 + Math.sin(t.p * 0.45) * 0.03;
    b.body.rotation.y = Math.sin(t.p * 1.6) * 0.035 * (1 + t.mv);
    // bear-trap jaw: it opens wide for the lunge and snaps shut at the strike
    b.head.rotation.z = br * 0.015 + (melee ? a * 0.2 - s * 0.14 : 0) + h * 0.12;
    b.head.rotation.y = t.lk * 0.2;
    b.jaw.rotation.z = -(0.07 + Math.max(0, br) * 0.06 + a * (melee ? 0.9 : 0.3) + h * 0.4 + flash * 0.25 + (shot || slam ? s * 0.45 : 0)) + (melee ? s * 0.13 : 0);
    // lure stalk: it whips for a throw and swings forward for the flash. The lantern hangs like a pendulum.
    const sway = t.p * 0.9;
    let bend = 0;
    for (let i = 0; i < 3; i++) {
      const r = Math.sin(sway - i * 0.7) * 0.05 + t.sw * 0.14 + h * 0.2 - flash * FWD[i]
        + (shot ? a * BACK[i] - s * WHIP[i] : melee ? a * 0.22 - s * 0.1 : slam ? a * LIFT[i] - s * 0.15 : 0);
      const bn = b['st' + (i + 1)];
      bn.rotation.z = r; bn.rotation.x = t.sl * 0.18 + Math.sin(sway * 0.7 - i) * 0.03;
      bend += r;
    }
    b.lamp.rotation.z = -bend * 0.9 - b.body.rotation.z + Math.sin(t.tm * 3.1) * (0.1 + t.mv * 0.06) - t.sw * 0.45 + (shot ? s * 0.7 - a * 0.3 : 0) + flash * 0.25;
    b.lamp.rotation.x = Math.sin(t.tm * 2.3 + 1) * 0.08 - t.sl * 0.4;
    const fl = Math.min(2.3, 1 + a * 0.6 + s * 0.5 + t.gl * 0.35 + flash * 1.1), w = c.parts.wisp, hl = c.parts.halo;
    w.scale.set(fl * (1 + 0.1 * Math.sin(t.tm * 23 + 1)), fl * (1 + 0.16 * Math.sin(t.tm * 17)), fl * (1 + 0.1 * Math.sin(t.tm * 19)));
    w.rotation.z = -b.lamp.rotation.z * 0.5;
    hl.scale.setScalar(0.8 + (fl - 1) * 0.75 + 0.05 * Math.sin(t.tm * 6));
    const so = c.parts.soul, sf = 1 + t.gl * 0.3 + a * 0.2 + flash * 0.3;
    so.scale.set(sf * (1 + 0.08 * Math.sin(t.tm * 11)), sf * (1 + 0.14 * Math.sin(t.tm * 13 + 2)), sf);
    so.rotation.z = t.sw * 0.5;
    // tail and fins
    A.chain(b, ['tail1', 'tail2', 'tfin'], t.sl * 0.3, -t.sw * 0.03, 0.14 + t.mv * 0.12 + s * 0.1, t.p * 1.6, 0.9);
    const fp = Math.sin(t.p * 1.8) * (0.22 + t.mv * 0.15);
    b.finL.rotation.y = fp + a * 0.5 - s * 0.6 - t.sw * 0.2; b.finR.rotation.y = -(fp + a * 0.5 - s * 0.6 - t.sw * 0.2);
    b.finL.rotation.z = Math.sin(t.p * 1.8 - 0.8) * 0.12 + h * 0.4; b.finR.rotation.z = b.finL.rotation.z;
    b.dorsal.rotation.x = Math.sin(t.p * 1.3) * 0.07 + t.sl * 0.3;
    b.dorsal.rotation.z = t.sw * 0.12 - a * 0.1 + h * 0.15;
  }
};
