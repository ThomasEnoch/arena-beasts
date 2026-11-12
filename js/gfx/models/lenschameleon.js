/* Lenschameleon (Shutterscale) - a brass chameleon made of telescoping lens barrels with knurled focus rings.
   Two aperture eyes on turrets (heart piece: the glow in the lenses), a neck of black leather bellows,
   a flash lamp for a crest, enamel scales that change colour, and a film-reel tail. */
import * as THREE from 'three';
import { lathe, blade, ball, cone, rbox, torus, tube, canvasTex } from '../geo.js';
import { A } from '../rig.js';

const D2R = Math.PI / 180;
const BRASS = '#c79a3c', LBR = '#e3bf62', DBR = '#7a5524', DARK = '#3a2c20', LEATHER = '#2b2724', TEAL = '#2fa392', CYAN = '#58c8ff', AMBER = '#ffb040';
const BRM = { col: '#d0a445', metal: 1, rough: 0.28, env: 1.25 };
const KNM = { col: '#3a3028', metal: 0.85, rough: 0.45, flat: true, env: 0.9 };
const STEELM = { col: '#2c3038', metal: 0.9, rough: 0.26, env: 1.3, noOut: true };
const CLAWM = { col: '#30333c', metal: 0.9, rough: 0.3, env: 1.1 };
const GLASS = { col: '#8fd0ff', op: 0.45, rough: 0.05, env: 1.5, noOut: true };
const GLINT = { col: '#bfe6ff', glow: '#8fd0ff', glowK: 1.5, noOut: true };
const BELL = { col: '#141214', rough: 0.95, metal: 0, flat: true, env: 0.12 };                                  // black leather bellows
const ENAM = { col: TEAL, rough: 0.3, metal: 0.15, env: 0.7, glow: TEAL, glowK: 0, noOut: true };               // enamel scales: the colour changes in anim
const REFL = { col: '#b89c60', metal: 0.8, rough: 0.42, env: 0.8, glow: '#ffd890', glowK: 0.06, side: 1, noOut: true };
const BULBG = { col: '#ffe8c0', op: 0.35, rough: 0.12, env: 0.9, noOut: true };
const FLASHM = { col: '#d8c8a0', glow: '#ffc870', glowK: 0.8, noOut: true };
const ENGR = { col: '#2a2018', metal: 0.6, rough: 0.5, env: 0.6 };                                              // engraved lines
const BELL_L = 0.15, BELL_A = 14 * D2R, NECK = 0.16;                 // bellows: rest length, slope, extra length in the ultimate
const CONV = 1.22;                                                    // turn of each eye turret that makes the two eyes look at one point ahead
let filmTex = null, FILM = null;

const LEG = ['FL', 'FR', 'BL', 'BR'], TB = ['tail1', 'tail2', 'tail3', 'tail4'];
const cl = (v, a, b) => v < a ? a : v > b ? b : v, fr01 = x => x - Math.floor(x), TAU = Math.PI * 2;
// One leg of a walk. ph = 0..1 of the cycle, air = the part of the cycle that the foot is in the air.
// G[0] swing: +1 = the foot is in front, -1 = behind (fast forward in the air, slow back on the ground).
// G[1] lift 0..1. G[2] 0..1 in the air (0 on the ground). G[3] pulse right after the foot lands (the grip).
const G = [0, 0, 0, 0];
function gait(ph, air) {
  if (ph < air) { const q = ph / air; G[0] = -1 + 2 * A.ease(q); G[1] = Math.pow(Math.sin(Math.PI * Math.pow(q, 0.8)), 0.75); G[2] = q; G[3] = 0; }
  else { const q = (ph - air) / (1 - air); G[0] = 1 - 2 * q; G[1] = 0; G[2] = 0; G[3] = q < 0.25 ? 1 - q / 0.25 : 0; }
  return G;
}
const AX = 0.6, HY = 0.66;                 // axis height of the trunk barrels and of the head barrels

// ---- eye turret frame: the eye looks along +Z of this frame ------------------------------------
const EYAW = 24, EPIT = 10, AP0 = 34, EB = [0.5, 0.74, 0.13], RR = 0.103;
const EQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-EPIT * D2R, EYAW * D2R, 0, 'YXZ'));
const EDIR = new THREE.Vector3(0, 0, 1).applyQuaternion(EQ), ED = [EDIR.x, EDIR.y, EDIR.z];
// a point in the eye frame: x, y across the lens, d along the axis from the centre of the eye ball
function eyeAt(x, y, d) { const v = new THREE.Vector3(x, y, d + 0.17).applyQuaternion(EQ); return [EB[0] + v.x, EB[1] + v.y, EB[2] + v.z]; }
const along = d => [EB[0] + ED[0] * d, EB[1] + ED[1] * d, EB[2] + ED[2] * d];
const APL = [], APR = [];
for (let i = 0; i < 6; i++) { APL.push('ap' + i + 'L'); APR.push('ap' + i + 'R'); }

// ---- film tail: a chain of flat segments in a spiral, 4 segments on each of the 4 tail bones -----
const NS = 16, PER = 4, TAILP = [-0.66, 0.6], T0 = [-0.665, 0.586];
const SL = [], SB = [], TJ = [], TH = [], FMN = [], CS = [1, 1, 1, 1];
for (let i = 0; i < NS; i++) { SL.push(0.125 - i * 0.0053); SB.push((i === 0 ? 8 : i === 1 ? 20 : 38) * D2R); FMN.push('fm' + i); }
{
  let x = T0[0], y = T0[1], hd = Math.PI;
  for (let i = 0; i < NS; i++) {
    if (i % PER === 0) { TJ.push([x, y]); TH.push(hd); }      // start point and start heading of each piece
    hd += SB[i]; x += Math.cos(hd) * SL[i]; y += Math.sin(hd) * SL[i];
  }
}
// Put the segments again with a curl factor for each piece (1 = rest coil, 0 = straight).
// The next tail bone moves to the end of the piece and turns, thus the chain stays in one piece.
// ph (0..1): each segment moves this part of the way to the place of the next one (the film runs into the reel).
function layFilm(b, P, cs, ph) {
  for (let k = 0; k < 4; k++) {
    const c = cs[k];
    let x = k ? 0 : T0[0] - TAILP[0], y = k ? 0 : T0[1] - TAILP[1], hd = TH[k], bend = 0;
    for (let j = 0; j < PER; j++) {
      const i = k * PER + j, pt = P[FMN[i]];
      hd += SB[i] * c; bend += SB[i];
      const dx = Math.cos(hd) * SL[i], dy = Math.sin(hd) * SL[i];
      let cx = x + dx / 2, cy = y + dy / 2, ch = hd;
      if (ph > 0 && i === 0) { const pi = P.fmIn; pi.position.set(x - SL[0] / 2 * Math.cos(TH[0]) * (1 - ph) + (cx - x) * ph, y + (cy - y) * ph, 0); pi.rotation.set(0, 0, TH[0] + (hd - TH[0]) * ph); }
      x += dx; y += dy;
      if (ph > 0) {
        if (i < NS - 1) {
          const h2 = hd + SB[i + 1] * (j < PER - 1 ? c : cs[k + 1]);
          cx += (x + Math.cos(h2) * SL[i + 1] / 2 - cx) * ph; cy += (y + Math.sin(h2) * SL[i + 1] / 2 - cy) * ph; ch += (h2 - hd) * ph;
        } else pt.scale.x *= 1 - ph;                              // the last segment goes into the hub
      }
      pt.position.set(cx, cy, 0); pt.rotation.set(0, 0, ch);
    }
    if (k < 3) { const nb = b[TB[k + 1]]; nb.position.set(x, y, 0); nb.rotation.z += (c - 1) * bend; }
  }
}

// ---- geometry helpers ------------------------------------------------------------------------------
// knurled ring: a short cylinder along Y, each second column of the side is higher
function knurl(r, len, n, d) {
  const g = new THREE.CylinderGeometry(r, r, len, n * 2, 1), P = g.getAttribute('position');
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), q = Math.hypot(x, z);
    if (q < 1e-5) continue;
    if (Math.round(Math.atan2(z, x) / (Math.PI / n)) & 1) { const f = (r + d) / q; P.setX(i, x * f); P.setZ(i, z * f); }
  }
  g.computeVertexNormals();
  return g;
}
const alongX = g => { g.rotateZ(-Math.PI / 2); return g; };    // axis Y -> +X
const alongZ = g => { g.rotateX(Math.PI / 2); return g; };     // axis Y -> +Z
function aim(geo, d) {      // a copy of the geometry that points along d (the geometry points to +Y)
  const g = geo.clone();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]).normalize()));
  return g;
}
function join(list) {       // one geometry from many (position and normal only)
  let pos = [], nor = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    pos = pos.concat(Array.from(g.getAttribute('position').array)); nor = nor.concat(Array.from(g.getAttribute('normal').array));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}
// The field of the sculpted body (the same blend that Sculpt.build() makes). It lets a rigid detail lie on the surface.
function fieldOf(S) {
  const P = S.prims.filter(p => !p.paint);
  const smin = (a, b, k) => { const m = a < b ? a : b, h = k - Math.abs(a - b); return k <= 0 || h <= 0 ? m : m - h * h / (4 * k); };
  return (x, y, z) => { let v = 1e3; for (const p of P) { const d = p.f(x, y, z); v = p.sub ? -smin(-v, d, p.k) : smin(v, d, p.k); } return v; };
}
// first point of the surface on the way from a (outside) to b (inside)
function hit(F, a, b, n = 48) {
  const at = t => F(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  let t0 = 0, t1 = 1;
  for (let i = 1; i <= n; i++) { if (at(i / n) < 0) { t1 = i / n; t0 = (i - 1) / n; break; } if (i === n) return null; }
  for (let i = 0; i < 12; i++) { const m = (t0 + t1) / 2; if (at(m) < 0) t1 = m; else t0 = m; }
  return [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, a[2] + (b[2] - a[2]) * t1];
}
const mix = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];

export default {
  id: 'lenschameleon', rim: '#ffd890', focus: 'gaze', top: 1.22, rough: 0.36,
  opts: { cell: 0.025, mottle: 0.04, mottleF: 12 },
  // loose parts: the film tail (the tip is the softest part) and the stalk of the flash lamp
  dyn: [{ b: ['tail1', 'tail2', 'tail3', 'tail4'], k: 46, d: 5.2, amt: 0.6, drag: 2.5 }, { b: ['hood'], k: 85, d: 5.5, amt: 0.5, drag: 1, dir: [-0.2, 1, 0] }],
  rig: { head: 'head', neck: [] },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, AX, 0]).bone('chest', 'body', [0.08, AX, 0]).bone('hip', 'body', [-0.24, AX, 0]).bone('head', 'chest', [0.38, 0.64, 0])
      .bone('hood', 'head', [0.46, 0.86, 0]).bone('eyeL', 'head', EB, { m: 1 }).bone('gaze', 'head', [0.66, 0.79, 0])   // gaze: between the two lenses (heart piece)
      .bone('sn1', 'head', [0.68, HY, 0]).bone('sn2', 'sn1', [0.82, HY, 0]).bone('sn3', 'sn2', [1.02, HY, 0])
      .bone('legFL', 'chest', [0.2, 0.5, 0.22], { m: 1 }).bone('shinFL', 'legFL', [0.13, 0.44, 0.4], { m: 1 }).bone('footFL', 'shinFL', [0.25, 0.1, 0.4], { m: 1 })
      .bone('legBL', 'hip', [-0.34, 0.5, 0.22], { m: 1 }).bone('shinBL', 'legBL', [-0.24, 0.44, 0.4], { m: 1 }).bone('footBL', 'shinBL', [-0.36, 0.1, 0.4], { m: 1 })
      .bone('tail1', 'hip', [TAILP[0], TAILP[1], 0]).bone('tail2', 'tail1', [TJ[1][0], TJ[1][1], 0])
      .bone('tail3', 'tail2', [TJ[2][0], TJ[2][1], 0]).bone('tail4', 'tail3', [TJ[3][0], TJ[3][1], 0]);

    const M = { k: 0.012, metal: 1, gloss: 0.55, sb: 0.05 };       // sb: a narrow blend of the skin, so the barrels turn against each other as rigid pieces
    const FACE = { sub: 1, col: DBR, metal: 1, gloss: 0.4, k: 0.006 };                     // a flat cut: the step face of a barrel
    const RING = { col: LBR, metal: 1, gloss: 0.7, k: 0.008, rot: [0, 0, 90] };            // bead ring around the X axis
    const DK = { col: DARK, metal: 0.7, gloss: 0.3, k: 0.012 };
    S.color(BRASS);
    // --- trunk: mid barrel with two flat faces, chest cone, hip barrel, two film canister barrels ---
    S.cap('body', [-0.24, AX, 0], [0.08, AX, 0], 0.3, 0.3, M);
    S.box('body', [0.4, AX, 0], [0.3, 0.45, 0.45], 0.004, FACE);
    S.box('body', [-0.56, AX, 0], [0.3, 0.45, 0.45], 0.004, FACE);
    S.cap('chest', [0.06, AX, 0], [0.28, 0.615, 0], 0.25, 0.21, M);
    S.cap('hip', [-0.22, AX, 0], [-0.42, AX, 0], 0.25, 0.24, M);
    S.box('body', [-0.74, AX, 0], [0.3, 0.4, 0.4], 0.004, FACE);
    S.cap('hip', [-0.4, AX, 0], [-0.56, AX, 0], 0.175, 0.175, M);
    S.box('body', [-0.88, AX, 0], [0.3, 0.3, 0.3], 0.004, FACE);
    S.cap('hip', [-0.54, AX, 0], [-0.66, AX, 0], 0.12, 0.12, M);
    S.box('body', [-0.98, AX, 0], [0.3, 0.3, 0.3], 0.004, FACE);
    S.box('body', [-0.675, 0.586, 0], [0.03, 0.022, 0.09], 0.008, { sub: 1, col: AMBER, glow: 1.2, k: 0.006 });   // film slot
    // bead rings on the barrel edges, brass frames at the two ends of the bellows neck
    S.tor('body', [0.083, AX, 0], 0.292, 0.022, RING);
    S.tor('body', [-0.243, AX, 0], 0.292, 0.022, RING);
    S.tor('hip', [-0.425, AX, 0], 0.236, 0.02, RING);
    S.tor('hip', [-0.566, AX, 0], 0.168, 0.018, RING);
    S.tor('hip', [-0.668, AX, 0], 0.112, 0.016, RING);
    S.tor('chest', [0.28, 0.617, 0], 0.224, 0.024, Object.assign({}, RING, { rot: [0, 0, 104] }));
    // dorsal ridge: 4 diamond teeth
    for (const [x, y] of [[0.2, 0.846], [0.04, 0.912], [-0.2, 0.912], [-0.35, 0.856]]) {
      S.box(x > 0.1 ? 'chest' : x < -0.3 ? 'hip' : 'body', [x, y, 0], [0.042, 0.042, 0.03], 0.012, Object.assign({ rot: [0, 0, 45] }, DK));
      S.box('body', [x, y, 0], [0.05, 0.05, 0.038], 0.012, { rot: [0, 0, 45], paint: 1, col: DARK, metal: 0.7, gloss: 0.3, cb: 0.008 });
    }
    // --- head: a cone barrel, a bead ring where the snout comes out, a mouth seam ---
    S.cap('head', [0.44, HY, 0], [0.6, HY, 0], 0.21, 0.175, { k: 0.015, metal: 1, gloss: 0.55 });
    S.tor('head', [0.44, 0.657, 0], 0.212, 0.022, Object.assign({}, RING, { rot: [0, 0, 104] }));
    S.tor('head', [0.683, HY, 0], 0.158, 0.028, RING);
    // eye turrets: each turret has its own bone
    const TA = Math.atan2(ED[2], ED[1]) / D2R, TG = -Math.asin(ED[0]) / D2R;
    S.cap('eyeL', EB, along(0.09), 0.14, 0.122, { m: 1, k: 0.02, metal: 1, gloss: 0.55 });
    S.tor('eyeL', along(0.1), 0.118, 0.024, { m: 1, col: LBR, metal: 1, gloss: 0.7, k: 0.008, rot: [TA, 0, TG] });
    // crest: the shoe of the flash lamp (the lamp itself is a rigid part on the bone 'hood')
    S.box('head', [0.45, 0.852, 0], [0.06, 0.034, 0.052], 0.01, DK);
    S.box('head', [0.45, 0.872, 0], [0.066, 0.012, 0.058], 0.004, { paint: 1, col: LBR, metal: 1, gloss: 0.7, cb: 0.008 });
    // --- snout: 3 nested barrels. The back end of each barrel stays inside the barrel before it. ---
    const SN = { k: 0.01, metal: 1, gloss: 0.6, sb: 0.03, w: 6 };
    S.cap('sn1', [0.56, HY, 0], [0.72, HY, 0], 0.15, 0.15, SN);
    S.cap('sn2', [0.7, HY, 0], [0.848, HY, 0], 0.115, 0.115, SN);
    S.cap('sn3', [0.82, HY, 0], [1.01, HY, 0], 0.086, 0.086, SN);
    S.box('sn3', [1.17, HY, 0], [0.15, 0.15, 0.15], 0.004, FACE);
    S.ell('sn3', [1.032, HY, 0], [0.04, 0.066, 0.066], { sub: 1, col: CYAN, glow: 1.2, k: 0.006 });   // lens dish
    // --- legs: ball joint, upper leg, dark knee, lower leg with a piston sleeve, two gripping toes ---
    const LM = { m: 1, k: 0.015, metal: 1, gloss: 0.55, sb: 0.06 }, LJ = { m: 1, col: DARK, metal: 0.7, gloss: 0.3, k: 0.012, sb: 0.06 }, LS = { m: 1, col: LBR, metal: 1, gloss: 0.7, k: 0.01, sb: 0.06 };
    // each leg has 3 bones: upper leg (hip joint), lower leg (knee), foot (2 toes that grip)
    const leg = (tag, hip, knee, foot, toe) => {
      const h = [hip[0], hip[1], hip[2] + 0.03], w = [foot[0], foot[1] - 0.015, foot[2]], up = 'leg' + tag, lo = 'shin' + tag, ft = 'foot' + tag;
      S.ell(up, h, [0.085, 0.085, 0.07], LM);
      S.cap(up, h, knee, 0.062, 0.052, LM);
      S.ell(lo, knee, 0.066, LJ);
      S.cap(lo, knee, foot, 0.047, 0.04, LM);
      S.cap(lo, mix(knee, foot, 0.14), mix(knee, foot, 0.5), 0.058, 0.058, LS);
      S.ell(ft, foot, [0.056, 0.05, 0.056], LJ);
      S.cap(ft, w, [foot[0] + toe, 0.04, foot[2] + 0.066], 0.044, 0.034, LM);
      S.cap(ft, w, [foot[0] + toe, 0.04, foot[2] - 0.066], 0.044, 0.034, LM);
    };
    leg('FL', [0.2, 0.5, 0.22], [0.13, 0.44, 0.4], [0.25, 0.1, 0.4], 0.12);
    leg('BL', [-0.34, 0.5, 0.22], [-0.24, 0.44, 0.4], [-0.36, 0.1, 0.4], 0.12);
    // --- paint: leather inside the bellows neck, belly, mouth seam, index window, counter lamps ---
    S.cap('body', [0.33, 0.628, 0], [0.39, 0.643, 0], 0.222, 0.222, { paint: 1, col: '#100e10', metal: 0, gloss: 0, cb: 0.008 });
    S.ell('body', [-0.08, 0.3, 0], [0.5, 0.09, 0.2], { paint: 1, col: DBR, metal: 1, gloss: 0.3, cb: 0.05 });
    S.box('head', [0.6, 0.565, 0], [0.13, 0.014, 0.3], 0.004, { paint: 1, col: DARK, metal: 0.3, gloss: 0.2, cb: 0.01 });
    S.box('body', [0.03, 0.793, 0.23], [0.036, 0.04, 0.04], 0.012, { paint: 1, m: 1, col: CYAN, glow: 1, cb: 0.008 });
    for (const x of [-0.3, -0.35, -0.4]) S.ell('body', [x, 0.788, 0.157], 0.024, { paint: 1, m: 1, col: AMBER, glow: 1.3, cb: 0.006 });

    // --- rigid parts ---------------------------------------------------------------------------------
    const F = fieldOf(S);
    // neck: black leather camera bellows (8 sides, 3 folds). It gets longer in the ultimate.
    const bpr = [];
    for (let i = 0; i <= 6; i++) bpr.push([i % 2 ? 0.224 : 0.264, i * BELL_L / 6]);
    S.add('chest', alongX(lathe(bpr, 8).rotateY(Math.PI / 8)), BELL, { p: [0.283, 0.617, 0], r: [0, 0, BELL_A / D2R], name: 'bellows' });
    // enamel scales in rows on the barrels. They lie on the surface; the back end of each scale is a little higher.
    let sc = [];
    const unit = ball(1, 10, 6);
    const row = (x, ay, rad, size, step, half, skip) => {
      for (let i = -12; i <= 12; i++) {
        const th = (i + (half ? 0.5 : 0)) * step * D2R;
        if (Math.abs(th) > 112 * D2R || Math.abs(th) < 5 * D2R || (skip && skip(Math.abs(th) / D2R))) continue;
        const q = hit(F, [x, ay + Math.cos(th) * (rad + 0.08), Math.sin(th) * (rad + 0.08)], [x, ay + Math.cos(th) * (rad - 0.08), Math.sin(th) * (rad - 0.08)], 14);
        if (q && Math.abs(Math.hypot(q[1] - ay, q[2]) - rad) < 0.022) sc.push(unit.clone().scale(size * 1.15, size * 0.2, size * 0.86).rotateZ(-0.2).rotateX(th).translate(q[0], q[1], q[2]));
      }
    };
    const lamps = a => Math.abs(a - 40) < 9, knob = a => Math.abs(a - 90) < 16;
    row(0.118, 0.603, 0.24, 0.046, 15, 0); row(0.17, 0.607, 0.23, 0.044, 15, 1); row(0.222, 0.611, 0.22, 0.042, 15, 0);   // chest cone
    S.add('chest', join(sc), ENAM); sc = [];
    row(-0.182, AX, 0.3, 0.048, 12, 1);                                                                      // mid barrel, behind the focus ring
    S.add('body', join(sc), ENAM, { name: 'scales' }); sc = [];
    row(-0.292, AX, 0.248, 0.044, 14.5, 0, a => lamps(a) || knob(a)); row(-0.346, AX, 0.245, 0.044, 14.5, 1, a => lamps(a) || knob(a)); row(-0.398, AX, 0.241, 0.038, 14.5, 0, lamps);   // hip barrel
    row(-0.498, AX, 0.175, 0.04, 20, 1);                                                                           // film canister
    S.add('hip', join(sc), ENAM);
    S.add('sn2', alongX(torus(0.117, 0.012, 28, 6).rotateX(Math.PI / 2)), ENAM, { p: [0.852, HY, 0] });
    // distance scale: engraved marks in front of the focus ring
    const tk = [];
    for (let i = -15; i <= 15; i++) {
      const a = i * 7.5, th = a * D2R, big = i % 4 === 0, r0 = 0.3005;
      if (Math.abs(a) < 8 || (Math.abs(a) > 39 && Math.abs(a) < 61)) continue;
      tk.push(rbox(big ? 0.05 : 0.028, 0.006, 0.006).rotateX(th).translate(big ? -0.001 : -0.012, AX + Math.cos(th) * r0, Math.sin(th) * r0));
    }
    S.add('body', join(tk), ENGR);
    // film advance knobs on the two sides of the hip barrel
    S.add('hip', join([alongZ(knurl(0.05, 0.034, 10, 0.007)), alongZ(new THREE.CylinderGeometry(0.03, 0.036, 0.018, 12)).translate(0, 0, 0.024)]), KNM, { p: [-0.322, AX, 0.262], name: 'knobL', m: 1 });
    // maker's mark: four small frame corners engraved on the forehead
    const mk = [], fc = (x, z, dx, dz) => {
      const P3 = (px, pz) => { const q = hit(F, [px, 0.98, pz], [px, 0.7, pz], 24) || [px, 0.84, pz]; return [q[0], q[1] + 0.001, q[2]]; };
      mk.push(tube([P3(x + dx, z), P3(x + dx * 0.5, z), P3(x, z)], [0.0065, 0.0065, 0.0065], { ring: 5, seg: 4 }), tube([P3(x, z), P3(x, z + dz * 0.5), P3(x, z + dz)], [0.0065, 0.0065, 0.0065], { ring: 5, seg: 4 }), ball(0.0065, 6, 4).translate(...P3(x, z)));
    };
    fc(0.545, 0.05, 0.034, -0.03); fc(0.545, -0.05, 0.034, 0.03); fc(0.64, 0.056, -0.034, -0.03); fc(0.64, -0.056, -0.034, 0.03);
    S.add('head', join(mk), ENGR, { name: 'mark' });
    // crest: a flash lamp. Stalk, reflector dish, glass bulb with a bright core. It rises in the ultimate.
    const FA = [0.365, 1.0, 0], FT = 25, fax = [Math.cos(FT * D2R), Math.sin(FT * D2R)];
    S.add('hood', tube([[0.452, 0.73, 0], [0.452, 0.88, 0], [0.415, 0.955, 0], [FA[0] - fax[0] * 0.005, FA[1] - fax[1] * 0.005, 0]], [0.026, 0.026, 0.022, 0.03], { ring: 8 }), BRM);
    S.add('hood', alongX(lathe([[0.002, -0.014], [0.06, -0.008], [0.11, 0.016], [0.15, 0.052], [0.17, 0.1], [0.178, 0.104], [0.178, 0.114], [0.16, 0.114], [0.14, 0.07], [0.1, 0.036], [0.05, 0.014], [0.002, 0.008]], 26)), BRM, { p: FA, r: [0, 0, FT] });
    S.add('hood', alongX(lathe([[0.002, 0.012], [0.05, 0.018], [0.1, 0.04], [0.139, 0.073], [0.158, 0.112]], 26)), REFL, { p: FA, r: [0, 0, FT], name: 'refl' });
    S.add('hood', alongX(knurl(0.05, 0.02, 12, 0.005)), KNM, { p: [FA[0] - fax[0] * 0.02, FA[1] - fax[1] * 0.02, 0], r: [0, 0, FT] });
    S.add('hood', ball(0.052, 14, 10), BULBG, { p: [FA[0] + fax[0] * 0.066, FA[1] + fax[1] * 0.066, 0] });
    S.add('hood', ball(0.03, 12, 8), FLASHM, { p: [FA[0] + fax[0] * 0.066, FA[1] + fax[1] * 0.066, 0], name: 'bulb' });
    // knurled focus ring on the mid barrel
    S.add('body', alongX(knurl(0.303, 0.1, 34, 0.011)), KNM, { p: [-0.085, AX, 0], name: 'ring' });
    // eyes: lens hood, knurled ring (its front disc is the dark plate behind the blades), 6 aperture blades
    const E = eyeAt(0, 0, 0), er = [-EPIT, EYAW, 0];
    S.add('eyeL', alongZ(lathe([[0.119, -0.065], [0.128, -0.058], [0.128, 0.116], [0.135, 0.122], [0.135, 0.134], [0.113, 0.134], [0.113, -0.01]], 24)), BRM, { p: E, r: er, order: 'YXZ', m: 1 });
    const ek = alongZ(knurl(0.13, 0.05, 20, 0.008)); ek.translate(0, 0, 0.05);
    S.add('eyeL', ek, KNM, { p: E, r: er, order: 'YXZ', m: 1 });
    // one blade: the pivot is the origin, the tip points to -X, the edge on +Y makes the opening
    const bl = blade([[0.014, 0.006], [0.014, -0.02], [-0.04, -0.034], [-0.085, -0.02], [-0.108, 0.004], [-0.05, 0.009]], 0.007, { bevel: 0.0015 });
    for (let i = 0; i < 6; i++) {
      const f = i * 60 * D2R;
      S.add('eyeL', bl, STEELM, { p: eyeAt(Math.cos(f) * RR, Math.sin(f) * RR, 0.105 + i * 0.003), r: [-EPIT, EYAW, i * 60 + AP0], order: 'YXZ', name: APL[i], m: 1 });
    }
    S.eye('eyeL', E, 0.1, { dir: ED, sclera: '#141820', iris: '#2ab8ff', iris2: '#c8f4ff', pupil: 'round', lid: DARK, open: 80, glow: 2.6, size: 44, m: 1 });
    // snout: front collars with a flat face, zoom ring, front rim, glass lens with a bright reflection
    S.add('sn1', alongX(knurl(0.153, 0.048, 24, 0.008)), KNM, { p: [0.722, HY, 0], name: 'zoom' });
    S.add('sn1', alongX(lathe([[0.151, 0], [0.164, 0.006], [0.164, 0.064], [0.158, 0.07], [0.119, 0.07]], 28)), BRM, { p: [0.75, HY, 0] });
    S.add('sn2', alongX(lathe([[0.116, 0], [0.128, 0.005], [0.128, 0.05], [0.123, 0.055], [0.09, 0.055]], 26)), BRM, { p: [0.875, HY, 0] });
    S.add('sn3', alongX(lathe([[0.087, 0], [0.098, 0.005], [0.098, 0.058], [0.093, 0.064], [0.072, 0.064], [0.067, 0.05]], 24)), BRM, { p: [0.965, HY, 0] });
    S.add('sn3', ball(0.07, 18, 12), GLASS, { p: [1.014, HY, 0], s: [0.32, 1, 1] });
    S.add('sn3', ball(0.015, 8, 6), GLINT, { p: [1.036, HY + 0.03, 0.022], name: 'glint' });
    // claws: two on each foot
    const c1 = aim(cone(0.022, 0.085, 8), [1, -0.38, 0.18]), c2 = aim(cone(0.022, 0.085, 8), [1, -0.38, -0.18]);
    c1.translate(0, 0, 0.066); c2.translate(0, 0, -0.066);
    const claws = join([c1, c2]);
    S.add('footFL', claws, CLAWM, { p: [0.375, 0.042, 0.4], m: 1 });
    S.add('footBL', claws, CLAWM, { p: [-0.235, 0.042, 0.4], m: 1 });
    // film tail: each segment shows one frame and two rows of sprocket holes
    if (!filmTex) {
      filmTex = canvasTex(128, 64, (g, W, H) => {
        g.fillStyle = '#17141c'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#6a3c1a'; g.fillRect(10, 17, W - 20, H - 34);
        g.fillStyle = '#b06a28'; g.fillRect(16, 22, W - 32, H - 44);
        g.fillStyle = '#ffe2b0';
        for (let i = 0; i < 4; i++) { g.fillRect(9 + i * 32, 4, 14, 8); g.fillRect(9 + i * 32, H - 12, 14, 8); }
      });
      FILM = { col: '#dcdcdc', map: filmTex, emap: filmTex, glow: '#ffa040', glowK: 0.9, rough: 0.3, metal: 0.3, env: 1, noOut: true };
    }
    const seg = rbox(1, 0.012, 0.15);
    S.add('tail1', seg, FILM, { p: [T0[0] + SL[0] / 2, T0[1], 0], r: [0, 0, 180], s: [SL[0] + 0.016, 1, 1], name: 'fmIn' });   // hidden in the body; it comes out when the film runs
    // reel: hub and two flanges with spokes at the centre of the coil
    const fl = z => { const g = [torus(0.112, 0.009, 24, 6).translate(0, 0, z), new THREE.CylinderGeometry(0.034, 0.034, 0.012, 12).rotateX(Math.PI / 2).translate(0, 0, z)]; for (let q = 0; q < 3; q++) g.push(rbox(0.22, 0.02, 0.008).rotateZ(q * Math.PI / 3).translate(0, 0, z)); return g; };
    S.add('tail4', join([new THREE.CylinderGeometry(0.03, 0.03, 0.17, 10).rotateX(Math.PI / 2)].concat(fl(0.088), fl(-0.088))), BRM, { p: [-0.79, 0.386, 0], name: 'reel' });
    let x = T0[0], y = T0[1], hd = Math.PI;
    for (let i = 0; i < NS; i++) {
      hd += SB[i];
      const dx = Math.cos(hd) * SL[i], dy = Math.sin(hd) * SL[i];
      S.add(TB[i / PER | 0], seg, FILM, { p: [x + dx / 2, y + dy / 2, 0], r: [0, 0, hd / D2R], s: [SL[i] + 0.016, 1, 1], name: FMN[i] });
      x += dx; y += dy;
    }
  },
  anim(b, t, c) {
    const P = c.parts, a = t.a, s = t.s, h = t.h, k = t.k, tm = t.tm;
    const melee = k === 'melee' ? 1 : 0, shot = k === 'shot' ? 1 : 0, slam = k === 'slam' ? 1 : 0, buff = k === 'buff' ? 1 : 0;
    const s2 = 4 * s * (1 - s);                 // the late part of a strike: parts that follow use it
    // ultimate "Freeze Frame": feet planted, the two eyes look at one point, the bellows neck long, the flash lamp up, the film runs.
    // uo = stance, eyes and neck (first half), uf = flash and film (second half), nu = how much of the other poses stays
    const u = t.u || 0, uo = A.ease(u * 1.7), uf = A.ease(u * 2 - 0.8), nu = 1 - uo, stomp = Math.sin(Math.PI * Math.min(1, u * 2.2));
    // --- how the body moves. mvR: how much it moves (it also counts the speed and the turn). dF, dS: part of the full speed forward / to the L side.
    const mvR = Math.max(t.mv, Math.min(1, Math.hypot(t.vf, t.vs) / 1.2), Math.min(0.5, Math.abs(t.tn) * 0.7));
    const noV = Math.abs(t.vf) + Math.abs(t.vs) < 0.02 && Math.abs(t.tn) < 0.02;
    const dF = cl(t.vf / 2.6 + (noV ? t.sw * 1.4 : 0), -1, 1), dS = cl(t.vs / 2.6, -1, 1), sp = Math.min(1, Math.hypot(dF, dS)), mv = mvR * nu;
    const br = Math.sin(t.p), lock = Math.max(a, s) * nu, free = (1 - Math.max(a, s)) * nu, rest = (1 - mvR) * free;
    const cam = buff * Math.min(1, a + s) * nu, sway = cam * Math.sin(tm * 1.7);        // camouflage: slow sway
    const hitB = -t.hx * h, hitS = t.hz * h, hit0 = h * (1 - Math.min(1, Math.abs(t.hx) + Math.abs(t.hz)));   // push to the back / to the L; hit0: a hit with no direction
    const land = cl(-t.va * 0.07, 0, 0.6);
    // a small spring keeps the sway of the body above its feet: after a stop the body goes on, comes back and settles
    const st = c._sway || (c._sway = { x: 0, vx: 0, z: 0, vz: 0, tm });
    let dt = tm - st.tm; st.tm = tm;
    if (dt > 0 && dt < 0.2) {
      dt = Math.min(dt, 0.034);
      st.vx += (-cl(t.af, -45, 45) * 0.12 - 70 * st.x - 4.2 * st.vx) * dt; st.x = cl(st.x + st.vx * dt, -0.07, 0.07);
      st.vz += (-cl(t.as, -45, 45) * 0.12 - 70 * st.z - 4.2 * st.vz) * dt; st.z = cl(st.z + st.vz * dt, -0.07, 0.07);
    }
    // the rocking of a chameleon: at rest the body moves slowly forward and back above its feet; in a walk it goes forward, back a little, forward
    const rockW = (Math.sin(t.w * 2 + 0.4) * 0.042 + Math.sin(t.w * 4 + 1.2) * 0.018) * mv * (0.45 + 0.55 * sp);
    const rock = (Math.sin(t.p * 0.6) * 0.03 + Math.sin(t.p * 1.9) * 0.008) * rest + rockW;
    const rear = slam * (a * 0.2 + s * 0.42) * nu;                                    // flash: the body rears up
    const spin = melee * (s * 0.85 - a * 0.35) * nu;                                  // tail whip: the body turns
    const drop = shot * a * 0.03 * nu + cam * 0.03 + uo * 0.05 + land * 0.08 + melee * a * 0.025 * nu;
    const back = a * 0.03 * (1 - slam) * nu;                                          // before a strike the weight goes to the back legs
    // bx, bz: how far the body is from the place above its feet. The legs turn the other way, so the feet stay where they are.
    const bx = rock + st.x - back + (melee * s * 0.08 - shot * (a * 0.04 + s * 0.06)) * nu - (hitB + hit0) * 0.07 - uo * 0.03;
    const bz = Math.sin(tm * 0.6) * Math.sin(tm * 0.21 + 1) * 0.024 * rest + st.z + sway * 0.03 + hitS * 0.05;
    b.body.position.x += bx; b.body.position.z += bz;
    b.body.position.y += br * 0.006 + rear * 0.31 - drop + t.gl * 0.003 * Math.sin(tm * 31) + (0.5 - 0.5 * Math.cos(t.w * 2)) * 0.012 * mv;
    b.body.rotation.z += rear + rock * 0.5 + (hitB + hit0) * 0.1 + shot * s * 0.06 * nu - uo * 0.03 + st.x * 0.8;
    b.body.rotation.x += sway * 0.14 + hitS * 0.1 - bz * 0.8;
    b.body.rotation.y += spin;
    // --- legs: 4 beats in a slow walk (back L, front L, back R, front R); the diagonal pairs come together at speed.
    // Each foot lifts, reaches forward, grips, and then pushes back slowly.
    const cyc = t.w / TAU, trot = 0.2 * sp, lifts = mv * (0.55 + 0.45 * Math.max(sp, Math.abs(t.tn))), air = 0.3 + 0.1 * sp, tnS = t.tn * (1 - sp) * nu;   // tnS: a turn on the spot. The front feet step to the side of the turn, the back feet to the other side.
    let swF = 0, swB = 0, plF = 0;
    for (let i = 0; i < 4; i++) {
      const tag = LEG[i], sd = i % 2 ? -1 : 1, front = i < 2, g = gait(fr01(cyc + (i === 0 ? 0 : i === 1 ? 0.52 : i === 2 ? 0.27 + trot : 0.75 + trot)), air);
      const sw = g[0], lf = g[1] * lifts, au = g[2], pl = g[3] * mv, inner = 1 - 0.35 * t.tn * sd;
      const up = b['leg' + tag], lo = b['shin' + tag], ft = b['foot' + tag];
      if (i === 0) { swF = sw; plF += pl; } else if (i === 1) plF += pl; else if (i === 2) swB = sw;
      up.rotation.z += sw * 0.36 * (dF * mv * inner - sd * tnS * 0.6) - bx * 2.3 + lf * 0.12;
      up.rotation.y += sd * sw * 0.22 * dF * mv * inner;
      up.rotation.x += -sw * 0.3 * dS * mv - sw * 0.34 * tnS * (front ? 1 : -1) + bz * 2.3 - sd * lf * 0.34 - Math.max(0, hitS * sd) * 0.3 * sd;
      lo.rotation.z += lf * (-0.55 + 1.2 * au);                  // the lower leg stays behind, then it reaches forward
      lo.rotation.x += sd * lf * 0.28;
      up.position.y += lf * 0.02 + drop * 0.9;
      // the foot: the toes open and point down in the air; they close when the foot lands (the grip)
      ft.scale.z = 1 + g[1] * lifts * 0.45 - pl * 0.3 - uo * 0.2;
      ft.userData.lf = lf * (0.35 - au * 0.8);
    }
    b.legBL.rotation.z -= rear; b.legBR.rotation.z -= rear;
    b.legFL.rotation.z += rear * 0.6; b.legFR.rotation.z += rear * 0.45;
    b.legFL.rotation.x -= rear * 0.5; b.legFR.rotation.x += rear * 0.5;
    b.shinFL.rotation.z -= rear * 0.5; b.shinFR.rotation.z -= rear * 0.7;         // the front feet hang in the air when it rears up
    // planted stance: the legs go wide, front legs forward, back legs back. One front foot stamps when the pose starts.
    b.legFL.rotation.x -= uo * 0.16; b.legFR.rotation.x += uo * 0.16; b.legBL.rotation.x -= uo * 0.2; b.legBR.rotation.x += uo * 0.2;
    b.legFL.rotation.z += uo * 0.12 + stomp * 0.3; b.legFR.rotation.z += uo * 0.12; b.legBL.rotation.z -= uo * 0.12; b.legBR.rotation.z -= uo * 0.12;
    b.shinFL.rotation.z -= stomp * 0.4; b.legFL.position.y += stomp * 0.05;
    // --- spine: chest and hip turn with their legs (the body bends from side to side as on a lizard) and bend into a turn
    b.chest.rotation.y += swF * 0.1 * mv * sp - t.tn * 0.14 * mvR - hitS * 0.2;
    b.hip.rotation.y += swB * 0.1 * mv * sp + t.tn * 0.12 * mvR + hitS * 0.12;
    b.chest.rotation.z += -plF * 0.03 + br * 0.008 - back * 1.2 + (hitB + hit0) * 0.1 + rear * 0.12 + s2 * shot * 0.05 * nu;   // the chest drops when a front foot lands
    b.hip.rotation.z += back * 1.6 - rear * 0.1 + uo * 0.04;
    b.chest.rotation.x += Math.sin(t.w + 1) * 0.03 * mv;
    b.hip.rotation.x -= Math.sin(t.w + 1) * 0.03 * mv;
    // the feet stay flat on the ground
    for (let i = 0; i < 4; i++) {
      const tag = LEG[i], up = b['leg' + tag], lo = b['shin' + tag], ft = b['foot' + tag], sp2 = i < 2 ? b.chest : b.hip;
      ft.rotation.z = -(b.body.rotation.z + sp2.rotation.z + up.rotation.z + lo.rotation.z) * (1 - rear * (i < 2 ? 1 : 0)) - ft.userData.lf;
      ft.rotation.x = -(b.body.rotation.x + sp2.rotation.x + up.rotation.x + lo.rotation.x);
      ft.rotation.y = -(sp2.rotation.y + up.rotation.y);
    }
    // --- head and bellows neck: the neck breathes a little, it stretches before a strike and snaps back; in the ultimate it extends
    const look = Math.sin(tm * 0.8) * Math.sin(tm * 0.27 + 2) * rest;
    const neck = uo * NECK + (br * 0.006 + a * 0.045 + shot * a * 0.02 - s * 0.03 + s2 * 0.02 - (hitB + hit0) * 0.02) * nu;
    b.head.position.x += neck * Math.cos(BELL_A); b.head.position.y += neck * Math.sin(BELL_A);
    b.head.rotation.y += (t.lk * 0.3 - spin * 0.6 + hit0 * 0.15 + hitS * 0.25 + look * 0.2) * (1 - uo * 0.7) - b.chest.rotation.y * 0.8;
    b.head.rotation.z += br * 0.02 - rock * 1.2 + (hitB + hit0) * 0.2 - rear * 0.45 + shot * (a * 0.03 + s * 0.05) * nu - uo * 0.04 - b.chest.rotation.z * 0.7 - melee * a * 0.06 * nu;
    b.head.rotation.x += -sway * 0.1 - b.chest.rotation.x - t.tn * 0.06;
    P.bellows.scale.x = 1 + neck / BELL_L;
    P.bellows.rotation.y += b.head.rotation.y * 0.5; P.bellows.rotation.z += b.head.rotation.z * 0.5; P.bellows.rotation.x += b.head.rotation.x * 0.5;
    // flash lamp crest: a spring moves the stalk (dyn). Here: it snaps forward for the flash burst, and it rises in the ultimate
    b.hood.rotation.z += Math.sin(t.p * 0.9 + 1) * 0.025 + h * 0.3 + (slam * (a * 0.25 - s * 0.35 + s2 * 0.1) + cam * 0.3 - shot * a * 0.12) * nu - uf * 0.3;
    b.hood.position.y += uf * 0.1 - cam * 0.03;
    const fl = Math.min(1.6, slam * (a * 0.5 + s * 1.2) * nu + t.gl * 0.25 + uf * (0.9 + 0.35 * Math.sin(tm * 13)));
    P.bulb.scale.setScalar(1 + fl * 0.75 + 0.05 * Math.sin(tm * 4));
    P.refl.material.emissiveIntensity = 0.06 + fl * 0.9;
    // --- eye turrets: the two eyes do not agree. One eye follows the opponent, the other eye looks around; after some seconds they change.
    // For an attack one eye aims. Only in the ultimate do the two eyes look at the same point.
    const wL = A.ease(0.5 + Math.sin(tm * 0.23 + 1) * 1.6 + t.hd * 0.8) * (1 - cam), wR = (1 - A.ease(0.5 + Math.sin(tm * 0.23 + 1) * 1.6 + t.hd * 0.8)) * (1 - cam);
    const fwd = (shot * lock * 0.5 + slam * lock * 0.35 + melee * (s * 0.3 - a * 0.4)) - (hit0 + hitB) * 0.25 * nu, TRK = 0.8;
    b.eyeL.rotation.y += (Math.sin(t.p * 0.9) * 0.32 + Math.sin(t.p * 0.37 + 1) * 0.18) * free * (1 - wL * 0.85) + t.lk * 0.2 * nu + fwd * (1 - wL * 0.6) + cam * Math.sin(tm * 1.1) * 0.4 + uo * CONV
      + wL * (TRK - t.hd * 0.6) * nu;
    b.eyeR.rotation.y += (Math.sin(t.p * 0.7 + 2.4) * 0.32 + Math.sin(t.p * 0.43 + 4) * 0.18) * (free + lock * 0.6) * (1 - wR * 0.85) + t.lk * 0.2 * nu - fwd * 0.4 + cam * Math.sin(tm * 0.8 + 2) * 0.4 - uo * CONV
      - wR * (TRK + t.hd * 0.6) * nu;
    b.eyeL.rotation.x += Math.sin(t.p * 0.63 + 2) * 0.22 * free * (1 - wL * 0.8);
    b.eyeR.rotation.x += Math.sin(t.p * 0.51 + 0.5) * 0.22 * (free + lock * 0.5) * (1 - wR * 0.8);
    b.eyeL.position.y += uo * 0.075; b.eyeR.position.y += uo * 0.075; b.eyeL.position.z += uo * 0.04; b.eyeR.position.z -= uo * 0.04;
    const pop = 1 + slam * s * 0.2 * nu + h * 0.08 + t.gl * 0.04 * (1 + Math.sin(tm * 7)) + uo * 0.06;
    b.eyeL.scale.setScalar(pop); b.eyeR.scale.setScalar(pop);
    // aperture blades: + opens, - closes. Wide for the flash, almost shut to aim, to hide and to blink.
    // In the ultimate the two apertures are wide and they close together for a moment: the shutter.
    const click = uf * Math.pow(Math.max(0, Math.sin(tm * 4.2)), 24);
    const wide = Math.min(1, (slam * (a * 0.45 + s) + shot * s * 0.8 + melee * s * 0.4) * nu + h * 0.5 + t.gl * 0.2 + uo) * (1 - click);
    const tight = Math.min(1, shot * a * 0.85 * nu + cam * 0.7 + t.bl + click) * (1 - wide);
    const apL = wide * 0.48 - tight * 0.52 + Math.sin(t.p * 1.3) * 0.07 * free - wL * 0.1 * nu, apR = wide * 0.48 - tight * 0.52 + Math.sin(t.p * 1.1 + 1.7) * 0.07 * free - wR * 0.1 * nu;
    for (let i = 0; i < 6; i++) { P[APL[i]].rotation.z += apL; P[APR[i]].rotation.z += apR; }
    // snout: the barrels extend for the wind-up of the zoom snipe and snap back in the strike; fully out in the ultimate
    const ext = Math.max(-0.4, (shot * (a * (1 - s) - s * 0.35) - slam * a * 0.25) * nu - cam * 0.35 - h * 0.3 + br * 0.03 + t.gl * 0.08 * Math.sin(tm * 5) + uo * (0.9 + 0.08 * Math.sin(tm * 3)));
    b.sn1.position.x += ext * 0.06; b.sn2.position.x += ext * 0.065; b.sn3.position.x += ext * 0.07;
    P.zoom.rotation.x += ext * 2.6;
    P.ring.rotation.x += Math.sin(t.p * 0.45) * 0.5 + ext * 1.5 + cam * tm * 0.8 + uf * Math.sin(tm * 2.1) * 0.8;
    P.glint.scale.setScalar(Math.max(0.2, 1 + 0.15 * Math.sin(tm * 5) + (shot * (a * 1.3 + s * 2.2) + slam * s * 1.5) * nu + t.gl * 0.5 + uo * 0.6));
    // --- film tail: a spring moves it (dyn). The coil opens a little when the body moves fast and closes again at rest.
    // Tighter coil for the wind-up; it uncoils, lifts and sweeps around for the whip. In the ultimate the reel turns and the film runs into the coil.
    const whip = melee * s * nu, coil = melee * a * nu;
    const cb = 1 + Math.sin(t.p * 0.8) * 0.025 + Math.sin(t.w) * 0.02 * mv - sp * mv * 0.2 + coil * 0.1 + cam * 0.06 - h * 0.16 - (slam + shot * 0.6) * s * 0.14 * nu + t.gl * 0.015 * Math.sin(tm * 6) + uf * 0.03;
    for (let i = 0; i < 4; i++) CS[i] = Math.min(1.14, cb - whip * (1.04 - i * 0.07) - sp * mv * 0.05 * i);
    const run = uf > 0.02 ? tm * 5.5 : 0, ph = run - Math.floor(run);
    P.fmIn.visible = ph > 0;
    layFilm(b, P, CS, ph);
    P.reel.rotation.z += Math.sin(t.p * 0.5) * 0.15 + run * 0.66 + coil * 1.2 - whip * 2 + t.w * 0.3;
    P.knobL.rotation.z -= run * 1.3 + Math.sin(t.p * 0.45) * 0.3; P.knobR.rotation.z -= run * 1.3;
    b.tail1.rotation.y += Math.sin(t.p * 0.6) * 0.05 - coil * 0.5 + whip * 1.9 - b.hip.rotation.y * 0.5;
    b.tail1.rotation.z += h * 0.12 - coil * 0.12 - whip * 0.32 - rear * 0.8 - uo * 0.3 - sp * mv * 0.1 - b.hip.rotation.z * 0.6;
    for (let i = 1; i < 4; i++) b[TB[i]].rotation.y += whip * 0.2 + melee * s2 * 0.22 * i * nu + Math.sin(t.p * 0.6 - i * 0.6) * 0.03;
    // enamel scales: slow drift of the colour; pink when it is hurt (embarrassed), the colour of its brass when it hides, bright cyan in the ultimate
    const en = P.scales.material, blush = Math.min(1, h * 1.3), hide = cam * 0.9;
    let hue = 0.47 + Math.sin(t.p * 0.23) * 0.03 + t.gl * 0.04, sat = 0.78, lum = 0.33;
    hue += (0.95 - hue) * blush; sat += (0.8 - sat) * blush; lum += (0.56 - lum) * blush;
    hue += (0.11 - hue) * hide; sat += (0.5 - sat) * hide; lum += (0.33 - lum) * hide;
    hue += (0.53 - hue) * uo; sat += (0.95 - sat) * uo; lum += (0.46 + 0.05 * Math.sin(tm * 9) - lum) * uo;
    en.color.setHSL(hue, sat, lum); en.emissive.copy(en.color); en.emissiveIntensity = blush * 0.3 + uo * 0.22 + t.gl * 0.1;
  }
};
