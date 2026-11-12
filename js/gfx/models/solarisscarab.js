/* Solarisscarab - golden astrolabe scarab. Three engraved rings turn around a quartz dome full of floating sun-sand.
   A sundial gnomon stands on the dome frame. Ember / Iron. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, blade, lathe, ball, cone, rbox, canvasTex } from '../geo.js';

const GOLD = '#c2952f', PALE = '#dcb856', BRONZE = '#3b2a1b', LAPIS = '#1b3d9c', AMBER = '#ffae2a', SAND = '#f0b030';
const GOLDM = { col: '#d2a840', metal: 1, rough: 0.28, env: 1.2 };
const SHINE = { col: '#ecd68c', metal: 1, rough: 0.16, env: 1.4, flat: true };
const BRONZM = { col: '#4a3724', metal: 0.85, rough: 0.42, env: 0.9 };
const MAND = { col: '#2c2622', metal: 0.9, rough: 0.3, env: 1.1 };
const GLASS = { col: '#a8cfe4', op: 0.16, rough: 0.04, env: 1.0, side: 1, noOut: true };
const SANDM = { col: '#fff0b4', glow: '#ffb020', glowK: 3.4, noOut: true };
const GEM = { col: '#ffd890', glow: '#ff9a20', glowK: 2.8, noOut: true };
const HALO = { col: '#ff9420', add: true, op: 0.05, noOut: true };
let tickT = null, RINGM = null;

const D2R = Math.PI / 180, TAU = Math.PI * 2;
const DC = [-0.14, 0.93, 0], RD = 0.4, DH = 0.43;      // dome: centre of the base, radius, height
const RC = [-0.14, 1.01, 0];                           // centre of the 3 rings
// rings: radius, half width, tilt (degrees). Each ring turns around its own axis, so it never leaves its path.
const RINGS = [{ R: 0.47, w: 0.034, r: [0, 0, 0] }, { R: 0.65, w: 0.036, r: [0, 0, -12] }, { R: 0.55, w: 0.03, r: [55, 0, 0] }];
const AX = RINGS.map(q => new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(q.r[0] * D2R, q.r[1] * D2R, q.r[2] * D2R)));
const RATE = [0.45, -0.28, 0.7], BOOST = [1, -0.75, 1.35];
// legs: bone, gait phase (tripod), side, x of the foot, yaw when it tucks
const LEGS = [['legFL', 0, 1, 0.73, -0.5], ['legFR', Math.PI, -1, 0.73, -0.5], ['legML', Math.PI, 1, 0.08, 0], ['legMR', 0, -1, 0.08, 0], ['legBL', 0, 1, -0.8, 0.5], ['legBR', Math.PI, -1, -0.8, 0.5]];
const HIPF = [0.36, 0.4, 0.36], HIPM = [0.04, 0.38, 0.42], HIPB = [-0.38, 0.4, 0.38];

const join = list => mergeGeometries(list.map(g => { const q = g.index ? g.toNonIndexed() : g.clone(); q.deleteAttribute('uv'); if (!q.getAttribute('normal')) q.computeVertexNormals(); return q; }));
const at = (g, p) => g.clone().translate(p[0], p[1], p[2]);
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
// hour bars across the ring (not at 0 and 180 degrees: a gem and a bead sit there)
function bars(R, w, t) {
  const list = [];
  for (let i = 0; i < 12; i++) {
    if (i % 6 === 0) continue;
    const a = i / 12 * TAU, g = rbox(w * 2 + 0.01, t * 2 + 0.018, 0.024);
    g.rotateY(-a); g.translate(Math.cos(a) * R, 0, Math.sin(a) * R); list.push(g);
  }
  list.push(at(ball(0.03, 10, 8), [-R, 0, 0]));
  return list;
}
// leg: gold thigh, bronze knee and shin with thorns, 2 gold claws. Points are relative to the hip.
function leg(p, fx) {
  const mid = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  const gold = join([tube([p[0], p[1], p[2]], [0.05, 0.058, 0.044], { ring: 8 }), at(ball(0.04, 10, 8), p[3]),
    at(aim(cone(0.02, 0.1, 6), [fx, -0.35, 0.3]), p[4]), at(aim(cone(0.017, 0.08, 6), [-fx * 0.3, -0.3, 0.7]), p[4])]);
  const dark = join([at(ball(0.062, 12, 8), p[2]), tube([p[2], p[3], p[4]], [0.042, 0.036, 0.024], { ring: 7 }), at(ball(0.032, 8, 6), p[4]),
    at(aim(cone(0.022, 0.085, 6), [0, 0.35, 1]), mid(p[2], p[3], 0.45)), at(aim(cone(0.02, 0.07, 6), [0, 0.25, 1]), mid(p[3], p[4], 0.35))]);
  return [gold, dark];
}

export default {
  id: 'solarisscarab', rim: '#ffd890', focus: 'sand', top: 1.72, rough: 0.38,
  opts: { cell: 0.024, mottle: 0.05, mottleF: 14 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.62, 0]).bone('head', 'body', [0.62, 0.52, 0])
      .bone('ring1', 'body', RC).bone('ring2', 'body', RC).bone('ring3', 'body', RC)
      .bone('sand', 'body', [-0.14, 1.12, 0]).bone('swirl', 'sand', [-0.14, 1.14, 0])
      .bone('legFL', 'body', HIPF, { m: 1 }).bone('legML', 'body', HIPM, { m: 1 }).bone('legBL', 'body', HIPB, { m: 1 });

    const M = { metal: 1, gloss: 0.6, k: 0.02 }, Dk = { col: BRONZE, metal: 0.85, gloss: 0.4, k: 0.016 }, O = (a, b) => Object.assign({}, a, b);
    S.color(GOLD);
    // dark underside, gold shell, pale pronotum with shoulder bosses, dark breast plate, tail plate
    S.ell('body', [-0.06, 0.44, 0], [0.64, 0.2, 0.44], Dk);
    S.ell('body', [-0.14, 0.66, 0], [0.66, 0.32, 0.54], M);
    S.ell('body', [0.4, 0.56, 0], [0.32, 0.28, 0.46], O(M, { col: PALE }));
    S.ell('body', [0.5, 0.6, 0.4], [0.13, 0.11, 0.09], O(M, { col: PALE, m: 1 }));
    S.ell('body', [0.42, 0.4, 0], [0.3, 0.14, 0.38], Dk);
    S.ell('body', [-0.74, 0.52, 0], [0.1, 0.1, 0.18], Dk);
    for (const hp of [HIPF, HIPM, HIPB]) S.ell('body', hp, 0.08, O(M, { col: PALE, m: 1, k: 0.014 }));
    // dome seat with a dark rim, sand mound on the seat, sand spout that rises against gravity
    S.ell('body', [-0.14, 0.88, 0], [0.48, 0.12, 0.48], O(M, { col: PALE, k: 0.016 }));
    S.tor('body', [-0.14, 0.94, 0], 0.415, 0.04, O(Dk, { k: 0.012 }));
    S.ell('body', [-0.14, 0.99, 0], [0.33, 0.1, 0.33], { col: SAND, glow: 1.15, k: 0.03 });
    S.ell('body', [-0.3, 1.03, -0.1], [0.1, 0.06, 0.1], { col: SAND, glow: 1.3, k: 0.04 });
    S.cap('sand', [-0.14, 1.07, 0], [-0.12, 1.2, 0.02], 0.1, 0.045, { col: '#ffc040', glow: 1.9, k: 0.06 });
    // yokes that carry the large ring, bearings where the steep ring goes into the shell
    S.cap('body', [-0.22, 0.74, 0.5], [-0.22, 0.93, 0.63], 0.055, 0.04, O(Dk, { m: 1 }));
    S.ell('body', [-0.22, 0.95, 0.64], [0.05, 0.035, 0.05], O(M, { col: PALE, m: 1, k: 0.012 }));
    S.ell('body', [0.36, 0.835, 0.125], [0.07, 0.05, 0.06], Dk);
    S.ell('body', [-0.65, 0.855, 0.11], [0.08, 0.05, 0.06], Dk);
    // amber cabochons: one on each wing case, one on the neck
    S.ell('body', [-0.5, 0.87, 0.27], 0.05, { col: AMBER, glow: 2.2, k: 0.01, m: 1 });
    S.ell('body', [0.655, 0.725, 0], [0.05, 0.05, 0.07], { col: AMBER, glow: 2.2, k: 0.01 });
    // head: skull, dark face, rake plate with teeth, brows, forked horn with a bronze band
    S.ell('head', [0.78, 0.5, 0], [0.2, 0.17, 0.24], M);
    S.ell('head', [0.8, 0.41, 0], [0.17, 0.1, 0.2], Dk);
    S.box('head', [0.95, 0.44, 0], [0.09, 0.036, 0.19], 0.03, O(M, { col: PALE }));
    for (const [x, z] of [[1.035, 0.05], [1.02, 0.135]]) S.ell('head', [x, 0.44, z], [0.04, 0.032, 0.04], O(M, { col: PALE, m: 1, k: 0.014 }));
    S.cap('head', [0.82, 0.66, 0.08], [0.88, 0.63, 0.17], 0.036, 0.034, O(Dk, { m: 1 }));
    S.cap('head', [0.8, 0.6, 0], [0.9, 0.84, 0], 0.085, 0.06, M);
    S.cap('head', [0.9, 0.84, 0], [1.0, 0.98, 0.12], 0.056, 0.032, O(M, { col: PALE, m: 1 }));
    S.tor('head', [0.86, 0.745, 0], 0.07, 0.028, O(Dk, { rot: [0, 0, -22.6], k: 0.012 }));

    // --- paint: lapis enamel, engraved scale, contour lines, glowing seam -------------------------
    const PD = { paint: 1, col: BRONZE, cb: 0.012, metal: 0.6, gloss: 0.3 }, PL = { paint: 1, col: LAPIS, cb: 0.016, metal: 0, gloss: 0.85 }, PG = { paint: 1, col: PALE, cb: 0.011, metal: 1, gloss: 0.7 };
    // lapis band around the skirt of the shell, with a gold scale of 24 marks (each third mark is long)
    S.box('body', [-0.15, 0.54, 0], [0.72, 0.036, 0.7], 0.005, PL);
    for (let i = 0; i < 24; i++) {
      const an = i / 24 * TAU;
      S.box('body', [-0.14 + Math.cos(an) * 0.48, 0.54, Math.sin(an) * 0.48], [0.26, i % 3 ? 0.022 : 0.036, 0.013], 0.004, O(PG, { rot: [0, -an / D2R, 0] }));
    }
    S.box('body', [-0.3, 0.795, 0], [0.52, 0.011, 0.7], 0.004, PD);
    S.box('body', [-0.3, 0.68, 0], [0.56, 0.011, 0.7], 0.004, PD);
    S.box('body', [-0.7, 0.75, 0], [0.14, 0.26, 0.013], 0.005, { paint: 1, col: AMBER, glow: 2.0, cb: 0.01 });
    S.tor('body', [-0.5, 0.875, 0.27], 0.095, 0.035, O(PL, { m: 1, rot: [24, 0, 21] }));
    S.tor('body', [0.655, 0.725, 0], 0.09, 0.03, O(PL, { rot: [0, 0, -50] }));
    S.ell('body', [0.42, 0.78, 0.26], [0.1, 0.08, 0.1], O(PL, { m: 1 }));
    S.ell('head', [0.93, 0.6, 0], [0.06, 0.07, 0.08], PL);

    // --- astrolabe rings: engraved gold band, bronze hour bars, a sun gem ---------------------------
    if (!tickT) {
      tickT = canvasTex(1024, 64, (g, W, H) => {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#b89a5a'; g.fillRect(0, H * 0.4, W, H * 0.07); g.fillRect(0, H * 0.9, W, H * 0.07);
        for (let i = 0; i < 72; i++) { const x = i / 72 * W, big = i % 6 === 3; g.fillStyle = big ? '#2a1c10' : '#5a4222'; g.fillRect(x - (big ? 4 : 1.5), 0, big ? 8 : 3, H); }
      });
      RINGM = { col: '#e6c260', metal: 1, rough: 0.22, env: 1.3, flat: true, map: tickT };
    }
    RINGS.forEach((q, i) => {
      const bn = 'ring' + (i + 1);
      S.add(bn, band(q.R, q.w, 0.02), RINGM, { p: RC, r: q.r });
      S.add(bn, join(bars(q.R, q.w, 0.02)), BRONZM, { p: RC, r: q.r });
      S.add(bn, at(ball(i === 1 ? 0.05 : 0.038, 12, 10), [q.R, 0, 0]), GEM, { p: RC, r: q.r });
    });

    // --- quartz dome, dome frame (4 ribs and a cap), gnomon ----------------------------------------
    const prof = [];
    for (let i = 0; i <= 16; i++) { const th = i / 16 * Math.PI / 2; prof.push([domeR(th), DH * Math.sin(th)]); }
    S.add('body', lathe(prof, 40), GLASS, { p: DC, name: 'dome' });
    const frame = [];
    for (let i = 0; i < 4; i++) {
      const an = (i + 0.5) * TAU / 4, pts = [];
      for (let j = 0; j <= 8; j++) { const th = j / 8 * Math.PI / 2 * 0.96, r = domeR(th) * 1.01; pts.push([Math.cos(an) * r, DH * Math.sin(th) * 1.01, Math.sin(an) * r]); }
      frame.push(tube(pts, [0.016, 0.013, 0.011], { ring: 5, seg: 16 }));
    }
    frame.push(at(lathe([[0.11, -0.01], [0.115, 0.004], [0.09, 0.018], [0.05, 0.026], [0.036, 0.04], [0, 0.042]], 16), [0, DH, 0]));
    S.add('body', join(frame), GOLDM, { p: DC });
    const gn = join([blade([[-0.15, 0], [0.14, 0], [0.11, 0.035], [-0.09, 0.27], [-0.13, 0.25]], 0.034, { bevel: 0.01 }), at(rbox(0.34, 0.03, 0.07), [0, -0.005, 0]), at(ball(0.024, 8, 6), [-0.105, 0.275, 0])]);
    S.add('body', gn, SHINE, { p: [DC[0], DC[1] + DH + 0.04, 0], name: 'gnomon' });

    // --- sand: glow in the dome, 2 groups of grains that turn in opposite directions ----------------
    S.add('sand', ball(0.3, 18, 12), HALO, { p: [-0.14, 1.1, 0], name: 'halo' });
    const GR = [[0.26, -0.03, 0, 0.03], [0.2, 0.05, 2.1, 0.024], [0.14, 0.1, 1.0, 0.028], [0.1, 0.14, 5.2, 0.02], [0.27, 0, 4.2, 0.02], [0.18, -0.05, 3.3, 0.024], [0.24, 0.06, 5.6, 0.018]];
    const grain = q => at(ball(q[3], 8, 6), [Math.cos(q[2]) * q[0], q[1], Math.sin(q[2]) * q[0]]);
    S.add('swirl', join(GR.slice(0, 4).map(grain)), SANDM, { p: [-0.14, 1.14, 0], name: 'grA' });
    S.add('swirl', join(GR.slice(4).map(grain)), SANDM, { p: [-0.14, 1.14, 0], name: 'grB' });

    // --- legs ------------------------------------------------------------------------------------
    const LF = leg([[0, 0, 0], [0.1, 0.12, 0.14], [0.2, 0.2, 0.27], [0.31, -0.1, 0.37], [0.37, -0.36, 0.41]], 1);
    const LM = leg([[0, 0, 0], [0, 0.12, 0.13], [0.01, 0.2, 0.25], [0.03, -0.1, 0.33], [0.04, -0.34, 0.36]], 0.4);
    const LB = leg([[0, 0, 0], [-0.09, 0.12, 0.13], [-0.2, 0.2, 0.24], [-0.34, -0.1, 0.32], [-0.42, -0.36, 0.36]], -1);
    for (const [bn, hp, g] of [['legFL', HIPF, LF], ['legML', HIPM, LM], ['legBL', HIPB, LB]]) {
      S.add(bn, g[0], GOLDM, { p: hp, m: 1 });
      S.add(bn, g[1], BRONZM, { p: hp, m: 1 });
    }

    // --- head parts: horn tips, mandibles, fan antennas. Rivets along the shell. ------------------
    S.add('head', aim(cone(0.034, 0.11, 8), [0.1, 0.14, 0.12]), SHINE, { p: [0.995, 0.975, 0.115], m: 1 });
    const man = join([tube([[0, 0, 0], [0.09, -0.01, 0.05], [0.16, -0.02, 0.03], [0.2, -0.02, -0.04]], [0.036, 0.03, 0.02, 0.006], { ring: 6 }), at(aim(cone(0.016, 0.05, 5), [0.2, 0, -1]), [0.1, -0.012, 0.03])]);
    S.add('head', man, MAND, { p: [0.97, 0.4, 0.09], m: 1, name: 'manL' });
    const club = [0, 1, 2].map(i => { const g = ball(0.034, 10, 6); g.scale(1.3, 0.3, 0.9); g.rotateX(-0.5); g.translate(0.08 + i * 0.004, 0.1 + i * 0.022, 0.13 + i * 0.006); return g; });
    S.add('head', join([tube([[0, 0, 0], [0.05, 0.04, 0.06], [0.08, 0.1, 0.13]], [0.016, 0.013, 0.012], { ring: 5 })].concat(club)), GOLDM, { p: [0.96, 0.47, 0.18], m: 1, name: 'antL' });
    const rv = [];
    for (let i = 0; i < 18; i++) { const an = i / 18 * TAU, cx = Math.cos(an); if (cx < 0.45) rv.push(at(ball(0.022, 8, 6), [-0.14 + cx * 0.645, 0.61, Math.sin(an) * 0.528])); }
    S.add('body', join(rv), SHINE);
    S.eye('head', [0.9, 0.56, 0.17], 0.05, { dir: [0.7, 0.25, 0.65], sclera: '#2a1606', iris: '#ffb020', iris2: '#ffe890', pupil: 'none', lid: BRONZE, open: 60, tilt: -14, size: 56, glow: 1.6, m: 1 });
  },
  anim(b, t, c) {
    const P = c.parts, a = t.a, s = t.s, h = t.h, k = t.k, br = Math.sin(t.p);
    const melee = k === 'melee', shot = k === 'shot', slam = k === 'slam', buff = k === 'buff';
    // memory for this creature: ring spin and roll angle are sums over time
    const st = c.sol || (c.sol = { tm: t.tm, w: t.w, spin: 0, roll: 0 });
    let dt = t.tm - st.tm, dw = t.w - st.w;
    if (!(dt > 0 && dt < 0.1)) dt = 0;
    if (!(dw > 0 && dw < 0.8)) dw = 0;
    st.tm = t.tm; st.w = t.w;
    const ward = buff ? Math.min(1, a + s) : 0, aimK = shot ? Math.max(a * 0.8, s) : 0;
    st.spin += dt * (a * (slam ? 16 : buff ? 7 : 3) + s * (slam ? 12 : 2) + t.gl * 1.2);
    // wheel roll: it follows the distance in a dash, then one more turn while the strike value falls
    if (melee && s > 0.02) st.roll += dw * 0.9 + dt * (s < 0.999 ? 21.4 : 5);
    else if (st.roll > 0) { st.roll %= TAU; st.roll = st.roll < 0.02 ? 0 : st.roll + dt * 20; if (st.roll >= TAU) st.roll = 0; }
    const up = Math.abs(Math.sin(st.roll / 2)), tuck = Math.max(melee ? Math.max(a * 0.5, Math.min(1, s * 3.5)) : 0, Math.min(1, up * 3)), free = 1 - tuck;
    const w = t.w * 1.5, gait = Math.abs(Math.sin(w)) * t.mv * free;

    // body: crouch then roll (melee), handstand that points the dome forward (shot), rise then drop (slam), low guard (buff)
    const pitch = -t.sw * 0.04 + h * 0.12 + Math.sin(w * 2) * 0.015 * t.mv * free + (melee ? -a * 0.22 : shot ? -aimK * 0.6 : slam ? a * 0.06 - s * 0.05 : -ward * 0.05);
    const lift = br * 0.012 - gait * 0.02 - h * 0.03 - tuck * 0.08 + Math.pow(up, 0.7) * 0.42 + (shot ? aimK * 0.24 : slam ? a * 0.15 - s * 0.14 : buff ? -ward * 0.09 : melee ? -a * 0.03 : 0);
    b.body.position.y += lift;
    b.body.position.x += (melee ? s * 0.26 - a * 0.12 : shot ? -aimK * 0.08 - s * 0.06 : 0) - h * 0.06;
    b.body.rotation.z = pitch - st.roll;
    b.body.rotation.x = t.sl * 0.08 + Math.sin(w) * 0.025 * t.mv * free;

    // 6 legs: tripod gait. The hips turn to keep the feet on the ground when the body rises or tilts.
    const sp = Math.sin(pitch), cp = 0.58 * (1 - Math.cos(pitch));
    for (let i = 0; i < 6; i++) {
      const L = LEGS[i], bn = b[L[0]], sg = L[2], q = w + L[1];
      const comp = Math.max(-0.5, Math.min(0.8, 2.3 * (lift + L[3] * sp + cp)));
      bn.rotation.x = sg * (comp * free - Math.max(0, Math.cos(q)) * 0.24 * t.mv * free + tuck * 0.7 + Math.sin(t.p * 0.5 + i * 1.9) * 0.025 - (slam ? s * 0.15 : 0));
      bn.rotation.y = sg * (Math.sin(q) * 0.34 * t.mv * free + L[4] * tuck + Math.sin(t.p * 0.37 + i * 2.3) * 0.03 - L[4] * (aimK * 0.3 + h * 0.3));
      if (tuck > 0) bn.scale.setScalar(1 - tuck * 0.45);
    }

    // head: it goes into the collar for the roll and the guard
    b.head.rotation.z = br * 0.03 + Math.sin(w * 2) * 0.03 * t.mv * free + h * 0.25 - tuck * 0.35 + (melee ? -a * 0.15 : shot ? aimK * 0.4 : slam ? a * 0.3 - s * 0.4 : -ward * 0.3);
    b.head.rotation.y = t.lk * 0.3 * free;
    b.head.rotation.x = t.sl * 0.1 + Math.sin(t.p * 0.5) * 0.05 * free * (1 - a);
    b.head.position.x -= tuck * 0.2 + ward * 0.06 + h * 0.03;
    if (tuck > 0) b.head.scale.setScalar(1 - tuck * 0.2);
    const bite = 0.12 + Math.max(0, br) * 0.1 + a * (melee ? 0.2 : 0.5) + h * 0.35 + (slam ? s * 0.4 : 0);
    P.manL.rotation.y -= bite; P.manR.rotation.y += bite;
    const an = t.sw * 0.3 + a * 0.25 - h * 0.3;
    P.antL.rotation.z += an + Math.sin(t.p * 1.3) * 0.12; P.antR.rotation.z += an + Math.sin(t.p * 1.3 + 1.2) * 0.12;
    P.antL.rotation.x += t.sl * 0.3 + Math.sin(t.p * 0.7) * 0.08; P.antR.rotation.x += t.sl * 0.3 - Math.sin(t.p * 0.7) * 0.08;

    // rings: slow turn at 3 speeds, fast spin in the wind-up, a wide pulse for the vortex
    const rs = 1 + (slam ? s * 0.22 + a * 0.02 * Math.sin(t.tm * 40) : ward * 0.08) + h * 0.04 * Math.sin(t.tm * 38) + t.gl * 0.02 * Math.sin(t.tm * 6);
    for (let i = 0; i < 3; i++) {
      const bn = b['ring' + (i + 1)];
      bn.quaternion.setFromAxisAngle(AX[i], t.o * RATE[i] + st.spin * BOOST[i] + h * 0.3 * Math.sin(t.tm * 30 + i * 2));
      bn.scale.setScalar(rs);
      bn.position.x -= t.sw * 0.015 * (i + 1); bn.position.z -= t.sl * 0.012 * (i + 1);
      bn.position.y += Math.sin(t.p * 0.8 + i * 2.1) * 0.006 + ward * 0.03 * i;
    }

    // sand: the spout bobs and leans, the grains orbit. They go to the axis for the laser and spread for the vortex.
    const pw = (shot ? aimK : slam ? a * 0.6 + s : buff ? ward * 0.7 : a * 0.3) + t.gl * 0.35;
    b.sand.position.y += Math.sin(t.p * 1.1) * 0.022 + pw * 0.025 + h * 0.012 * Math.sin(t.tm * 43);
    b.sand.rotation.z = t.sw * 0.16; b.sand.rotation.x = t.sl * 0.16;
    b.sand.scale.setScalar(1 + Math.min(0.2, pw * 0.18) + 0.02 * Math.sin(t.tm * 5));
    const sa = t.o * 1.7 + st.spin * 1.6, g = 1 + (slam ? Math.min(0.05, (a + s) * 0.05) : 0) - aimK * 0.45;
    b.swirl.rotation.y = sa; b.swirl.position.y += Math.sin(t.p * 1.7) * 0.018;
    b.swirl.scale.set(g, 1 + t.gl * 0.1, g);
    P.grB.rotation.y = -sa * 1.8; P.grB.position.y += Math.sin(t.p * 2.3 + 1) * 0.02;
    P.halo.scale.setScalar(1 + 0.06 * Math.sin(t.tm * 6) + (shot ? aimK * 0.45 : slam ? a * 0.3 + s * 0.9 : buff ? ward * 1.7 : a * 0.2) + t.gl * 0.3);
    P.dome.scale.setScalar(1 + (shot ? s * 0.05 : 0) + ward * 0.02);
    // gnomon: it turns like a compass needle, it goes flat for the roll
    const gn = P.gnomon;
    gn.rotation.y = Math.sin(t.p * 0.4) * 0.5 + t.lk * 0.4 + ward * TAU + (slam ? st.spin * 0.5 : 0);
    gn.rotation.z += h * 0.12 * Math.sin(t.tm * 35) + t.sw * 0.04;
    gn.scale.y = 1 - tuck * 0.8;
  }
};
