/* Lenschameleon - a brass chameleon made of telescoping lens barrels. Aperture eyes on turrets,
   a viewfinder casque, a zoom snout with a glass front lens and a coiled film-strip tail. */
import * as THREE from 'three';
import { lathe, blade, ball, cone, rbox, canvasTex } from '../geo.js';
import { A } from '../rig.js';

const D2R = Math.PI / 180;
const BRASS = '#c79a3c', LBR = '#e3bf62', DBR = '#7a5524', DARK = '#3a2c20', LEATHER = '#2b2724', TEAL = '#2fa392', CYAN = '#58c8ff', AMBER = '#ffb040';
const BRM = { col: '#d0a445', metal: 1, rough: 0.28, env: 1.25 };
const KNM = { col: '#3a3028', metal: 0.85, rough: 0.45, flat: true, env: 0.9 };
const STEELM = { col: '#2c3038', metal: 0.9, rough: 0.26, env: 1.3, noOut: true };
const CLAWM = { col: '#30333c', metal: 0.9, rough: 0.3, env: 1.1 };
const GLASS = { col: '#8fd0ff', op: 0.45, rough: 0.05, env: 1.5, noOut: true };
const GLINT = { col: '#bfe6ff', glow: '#8fd0ff', glowK: 3, noOut: true };
let filmTex = null, FILM = null;

const LEGS = ['legFL', 'legFR', 'legBL', 'legBR'], TB = ['tail1', 'tail2', 'tail3', 'tail4'];
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
function layFilm(b, P, cs) {
  for (let k = 0; k < 4; k++) {
    const c = cs[k];
    let x = k ? 0 : T0[0] - TAILP[0], y = k ? 0 : T0[1] - TAILP[1], hd = TH[k], bend = 0;
    for (let j = 0; j < PER; j++) {
      const i = k * PER + j, pt = P[FMN[i]];
      hd += SB[i] * c; bend += SB[i];
      const dx = Math.cos(hd) * SL[i], dy = Math.sin(hd) * SL[i];
      pt.position.set(x + dx / 2, y + dy / 2, 0); pt.rotation.set(0, 0, hd);
      x += dx; y += dy;
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
const mix = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];

export default {
  id: 'lenschameleon', rim: '#ffd890', focus: 'sn3', top: 1.18, rough: 0.36,
  opts: { cell: 0.025, mottle: 0.04, mottleF: 12 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, AX, 0]).bone('head', 'body', [0.38, 0.64, 0])
      .bone('hood', 'head', [0.46, 0.86, 0]).bone('eyeL', 'head', EB, { m: 1 })
      .bone('sn1', 'head', [0.68, HY, 0]).bone('sn2', 'sn1', [0.82, HY, 0]).bone('sn3', 'sn2', [1.02, HY, 0])
      .bone('legFL', 'body', [0.2, 0.5, 0.22], { m: 1 }).bone('legBL', 'body', [-0.34, 0.5, 0.22], { m: 1 })
      .bone('tail1', 'body', [TAILP[0], TAILP[1], 0]).bone('tail2', 'tail1', [TJ[1][0], TJ[1][1], 0])
      .bone('tail3', 'tail2', [TJ[2][0], TJ[2][1], 0]).bone('tail4', 'tail3', [TJ[3][0], TJ[3][1], 0]);

    const M = { k: 0.012, metal: 1, gloss: 0.55 };
    const FACE = { sub: 1, col: DBR, metal: 1, gloss: 0.4, k: 0.006 };                     // a flat cut: the step face of a barrel
    const RING = { col: LBR, metal: 1, gloss: 0.7, k: 0.008, rot: [0, 0, 90] };            // bead ring around the X axis
    const DK = { col: DARK, metal: 0.7, gloss: 0.3, k: 0.012 };
    S.color(BRASS);
    // --- trunk: mid barrel with two flat faces, chest cone, hip barrel, two film canister barrels ---
    S.cap('body', [-0.24, AX, 0], [0.08, AX, 0], 0.3, 0.3, M);
    S.box('body', [0.4, AX, 0], [0.3, 0.45, 0.45], 0.004, FACE);
    S.box('body', [-0.56, AX, 0], [0.3, 0.45, 0.45], 0.004, FACE);
    S.cap('body', [0.06, AX, 0], [0.28, 0.615, 0], 0.25, 0.21, M);
    S.cap('body', [-0.22, AX, 0], [-0.42, AX, 0], 0.25, 0.24, M);
    S.box('body', [-0.74, AX, 0], [0.3, 0.4, 0.4], 0.004, FACE);
    S.cap('body', [-0.4, AX, 0], [-0.56, AX, 0], 0.175, 0.175, M);
    S.box('body', [-0.88, AX, 0], [0.3, 0.3, 0.3], 0.004, FACE);
    S.cap('body', [-0.54, AX, 0], [-0.66, AX, 0], 0.12, 0.12, M);
    S.box('body', [-0.98, AX, 0], [0.3, 0.3, 0.3], 0.004, FACE);
    S.box('body', [-0.675, 0.586, 0], [0.03, 0.022, 0.09], 0.008, { sub: 1, col: AMBER, glow: 2, k: 0.006 });   // film slot
    // bead rings on the barrel edges, dark collar around the neck joint
    S.tor('body', [0.083, AX, 0], 0.292, 0.022, RING);
    S.tor('body', [-0.243, AX, 0], 0.292, 0.022, RING);
    S.tor('body', [-0.425, AX, 0], 0.236, 0.02, RING);
    S.tor('body', [-0.566, AX, 0], 0.168, 0.018, RING);
    S.tor('body', [-0.668, AX, 0], 0.112, 0.016, RING);
    S.tor('body', [0.36, 0.637, 0], 0.19, 0.03, Object.assign({}, DK, { rot: [0, 0, 106] }));
    // dorsal ridge: 4 diamond teeth
    for (const [x, y] of [[0.2, 0.846], [0.04, 0.912], [-0.2, 0.912], [-0.35, 0.856]]) {
      S.box('body', [x, y, 0], [0.042, 0.042, 0.03], 0.012, Object.assign({ rot: [0, 0, 45] }, DK));
      S.box('body', [x, y, 0], [0.05, 0.05, 0.038], 0.012, { rot: [0, 0, 45], paint: 1, col: DARK, metal: 0.7, gloss: 0.3, cb: 0.008 });
    }
    // --- head: a cone barrel, a bead ring where the snout comes out, a mouth seam ---
    S.cap('head', [0.44, HY, 0], [0.6, HY, 0], 0.21, 0.175, { k: 0.015, metal: 1, gloss: 0.55 });
    S.tor('head', [0.683, HY, 0], 0.158, 0.028, RING);
    // eye turrets: each turret has its own bone
    const TA = Math.atan2(ED[2], ED[1]) / D2R, TG = -Math.asin(ED[0]) / D2R;
    S.cap('eyeL', EB, along(0.09), 0.14, 0.122, { m: 1, k: 0.02, metal: 1, gloss: 0.55 });
    S.tor('eyeL', along(0.1), 0.118, 0.024, { m: 1, col: LBR, metal: 1, gloss: 0.7, k: 0.008, rot: [TA, 0, TG] });
    // casque: a viewfinder hood in black leather with a brass rim; the inside glows
    const cq = (lx, ly) => [0.42 + lx * 0.883 - ly * 0.469, 0.95 + lx * 0.469 + ly * 0.883, 0];
    S.box('hood', cq(0, 0), [0.125, 0.17, 0.095], 0.03, { rot: [0, 0, 28], col: LEATHER, gloss: 0.1, k: 0.02 });
    S.box('hood', cq(0, 0.09), [0.08, 0.11, 0.05], 0.012, { rot: [0, 0, 28], sub: 1, col: AMBER, glow: 1.7, k: 0.008 });
    S.box('hood', cq(0, 0.15), [0.14, 0.028, 0.11], 0.004, { rot: [0, 0, 28], paint: 1, col: LBR, metal: 1, gloss: 0.7, cb: 0.01 });
    // --- snout: 3 nested barrels. The back end of each barrel stays inside the barrel before it. ---
    const SN = { k: 0.01, metal: 1, gloss: 0.6, sb: 0.03, w: 6 };
    S.cap('sn1', [0.56, HY, 0], [0.72, HY, 0], 0.15, 0.15, SN);
    S.cap('sn2', [0.7, HY, 0], [0.848, HY, 0], 0.115, 0.115, SN);
    S.cap('sn3', [0.82, HY, 0], [1.01, HY, 0], 0.086, 0.086, SN);
    S.box('sn3', [1.17, HY, 0], [0.15, 0.15, 0.15], 0.004, FACE);
    S.ell('sn3', [1.032, HY, 0], [0.04, 0.066, 0.066], { sub: 1, col: CYAN, glow: 2.4, k: 0.006 });   // lens dish
    // --- legs: ball joint, upper leg, dark knee, lower leg with a piston sleeve, two gripping toes ---
    const LM = { m: 1, k: 0.015, metal: 1, gloss: 0.55 }, LJ = { m: 1, col: DARK, metal: 0.7, gloss: 0.3, k: 0.012 }, LS = { m: 1, col: LBR, metal: 1, gloss: 0.7, k: 0.01 };
    const leg = (bn, hip, knee, foot, toe) => {
      const h = [hip[0], hip[1], hip[2] + 0.03], w = [foot[0], foot[1] - 0.015, foot[2]];
      S.ell(bn, h, [0.085, 0.085, 0.07], LM);
      S.cap(bn, h, knee, 0.062, 0.052, LM);
      S.ell(bn, knee, 0.066, LJ);
      S.cap(bn, knee, foot, 0.047, 0.04, LM);
      S.cap(bn, mix(knee, foot, 0.14), mix(knee, foot, 0.5), 0.058, 0.058, LS);
      S.ell(bn, foot, [0.056, 0.05, 0.056], LJ);
      S.cap(bn, w, [foot[0] + toe, 0.04, foot[2] + 0.066], 0.044, 0.034, LM);
      S.cap(bn, w, [foot[0] + toe, 0.04, foot[2] - 0.066], 0.044, 0.034, LM);
    };
    leg('legFL', [0.2, 0.5, 0.22], [0.13, 0.44, 0.4], [0.25, 0.1, 0.4], 0.12);
    leg('legBL', [-0.34, 0.5, 0.22], [-0.24, 0.44, 0.4], [-0.36, 0.1, 0.4], 0.12);
    // --- paint: enamel rings, belly, mouth seam, index window, counter lamps ---
    const EN = { paint: 1, col: TEAL, metal: 0, gloss: 0.85, cb: 0.008, rot: [0, 0, 90] };
    S.tor('body', [-0.2, AX, 0], 0.3, 0.024, EN);
    S.tor('body', [0.125, 0.604, 0], 0.244, 0.022, EN);
    S.tor('body', [-0.5, AX, 0], 0.175, 0.022, EN);
    S.tor('sn2', [0.85, HY, 0], 0.115, 0.017, EN);
    S.ell('body', [-0.08, 0.3, 0], [0.5, 0.09, 0.2], { paint: 1, col: DBR, metal: 1, gloss: 0.3, cb: 0.05 });
    S.box('head', [0.6, 0.565, 0], [0.13, 0.014, 0.3], 0.004, { paint: 1, col: DARK, metal: 0.3, gloss: 0.2, cb: 0.01 });
    S.box('body', [0.03, 0.793, 0.23], [0.036, 0.04, 0.04], 0.012, { paint: 1, m: 1, col: CYAN, glow: 1.6, cb: 0.008 });
    for (const x of [-0.3, -0.35, -0.4]) S.ell('body', [x, 0.788, 0.157], 0.024, { paint: 1, m: 1, col: AMBER, glow: 2.2, cb: 0.006 });

    // --- rigid parts ---------------------------------------------------------------------------------
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
    S.eye('eyeL', E, 0.1, { dir: ED, sclera: '#141820', iris: '#2ab8ff', iris2: '#c8f4ff', pupil: 'round', lid: DARK, open: 80, glow: 1.4, size: 44, m: 1 });
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
    S.add('legFL', claws, CLAWM, { p: [0.375, 0.042, 0.4], m: 1 });
    S.add('legBL', claws, CLAWM, { p: [-0.235, 0.042, 0.4], m: 1 });
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
    let x = T0[0], y = T0[1], hd = Math.PI;
    for (let i = 0; i < NS; i++) {
      hd += SB[i];
      const dx = Math.cos(hd) * SL[i], dy = Math.sin(hd) * SL[i];
      S.add(TB[i / PER | 0], seg, FILM, { p: [x + dx / 2, y + dy / 2, 0], r: [0, 0, hd / D2R], s: [SL[i] + 0.016, 1, 1], name: FMN[i] });
      x += dx; y += dy;
    }
  },
  anim(b, t, c) {
    const P = c.parts, a = t.a, s = t.s, h = t.h, k = t.k;
    const melee = k === 'melee' ? 1 : 0, shot = k === 'shot' ? 1 : 0, slam = k === 'slam' ? 1 : 0, buff = k === 'buff' ? 1 : 0;
    const br = Math.sin(t.p), gait = Math.abs(Math.sin(t.w)) * t.mv, lock = Math.max(a, s), free = 1 - lock;
    const cam = buff * Math.min(1, a + s), sway = cam * Math.sin(t.tm * 1.7);        // camouflage: slow sway
    // slow rocking: the body moves forward and back above the feet
    const rock = (Math.sin(t.p * 0.6) * 0.03 + Math.sin(t.p * 1.9) * 0.008) * (1 - t.mv * 0.6) * free + Math.sin(t.w * 2) * 0.02 * t.mv;
    const rear = slam * (a * 0.2 + s * 0.42);                                         // flash: the body rears up
    const spin = melee * (s * 0.85 - a * 0.35);                                       // tail whip: the body turns
    const drop = shot * a * 0.03 + cam * 0.03;
    A.quad(b, LEGS, t, 0.4, 0.05);
    for (const n of LEGS) { b[n].rotation.z -= rock * 2.2; b[n].position.y += drop * 0.9; }
    b.legBL.rotation.z -= rear; b.legBR.rotation.z -= rear;
    b.legFL.rotation.z += rear * 0.6; b.legFR.rotation.z += rear * 0.45;
    b.legFL.rotation.x -= rear * 0.5; b.legFR.rotation.x += rear * 0.5;
    b.body.position.x += rock + melee * s * 0.08 - shot * (a * 0.05 + s * 0.06) - h * 0.07;
    b.body.position.y += br * 0.01 + gait * 0.018 + rear * 0.31 - drop + t.gl * 0.003 * Math.sin(t.tm * 31);
    b.body.position.z += sway * 0.03;
    b.body.rotation.z += rear + rock * 0.5 + h * 0.1 - t.sw * 0.03 + shot * s * 0.06;
    b.body.rotation.x += Math.sin(t.w) * 0.05 * t.mv + sway * 0.14 + t.sl * 0.06;
    b.body.rotation.y += spin + Math.sin(t.w) * 0.04 * t.mv;
    // head and casque
    b.head.rotation.y += t.lk * 0.3 - spin * 0.6 + h * 0.15;
    b.head.rotation.z += br * 0.02 - rock * 1.2 + h * 0.14 - t.sw * 0.04 - rear * 0.45 + shot * (a * 0.03 + s * 0.05);
    b.head.rotation.x += t.sl * 0.08 - sway * 0.1;
    b.hood.rotation.z += Math.sin(t.p * 0.9 + 1) * 0.025 + t.sw * 0.14 + h * 0.3 + slam * (a * 0.25 - s * 0.35) + cam * 0.3 - shot * a * 0.12;
    b.hood.rotation.x += t.sl * 0.15;
    // eye turrets: each eye looks around by itself; for an attack the two eyes lock on the target
    const fwd = shot * lock * 0.5 + slam * lock * 0.35 + melee * (s * 0.3 - a * 0.4) - h * 0.25;
    b.eyeL.rotation.y += (Math.sin(t.p * 0.9) * 0.32 + Math.sin(t.p * 0.37 + 1) * 0.18) * free + t.lk * 0.2 + fwd + cam * Math.sin(t.tm * 1.1) * 0.4;
    b.eyeR.rotation.y += (Math.sin(t.p * 0.7 + 2.4) * 0.32 + Math.sin(t.p * 0.43 + 4) * 0.18) * free + t.lk * 0.2 - fwd + cam * Math.sin(t.tm * 0.8 + 2) * 0.4;
    b.eyeL.rotation.x += Math.sin(t.p * 0.63 + 2) * 0.22 * free;
    b.eyeR.rotation.x += Math.sin(t.p * 0.51 + 0.5) * 0.22 * free;
    const pop = 1 + slam * s * 0.2 + h * 0.08 + t.gl * 0.04 * (1 + Math.sin(t.tm * 7));
    b.eyeL.scale.setScalar(pop); b.eyeR.scale.setScalar(pop);
    // aperture blades: + opens, - closes. Wide for the flash, almost shut to aim, to hide and to blink.
    const wide = Math.min(1, slam * (a * 0.45 + s) + shot * s * 0.8 + melee * s * 0.4 + h * 0.5 + t.gl * 0.2);
    const tight = Math.min(1, shot * a * 0.85 + cam * 0.7 + t.bl) * (1 - wide);
    const apL = wide * 0.48 - tight * 0.52 + Math.sin(t.p * 1.3) * 0.07 * free, apR = wide * 0.48 - tight * 0.52 + Math.sin(t.p * 1.1 + 1.7) * 0.07 * free;
    for (let i = 0; i < 6; i++) { P[APL[i]].rotation.z += apL; P[APR[i]].rotation.z += apR; }
    // snout: the barrels extend for the wind-up of the zoom snipe and snap back in the strike
    const ext = Math.max(-0.4, shot * (a * (1 - s) - s * 0.35) - slam * a * 0.25 - cam * 0.35 - h * 0.3 + br * 0.03 + t.gl * 0.08 * Math.sin(t.tm * 5));
    b.sn1.position.x += ext * 0.06; b.sn2.position.x += ext * 0.065; b.sn3.position.x += ext * 0.07;
    P.zoom.rotation.x += ext * 2.6;
    P.ring.rotation.x += Math.sin(t.p * 0.45) * 0.5 + ext * 1.5 + cam * t.tm * 0.8;
    P.glint.scale.setScalar(Math.max(0.2, 1 + 0.15 * Math.sin(t.tm * 5) + shot * (a * 1.3 + s * 2.2) + slam * s * 1.5 + t.gl * 0.5));
    // film tail: tighter coil for the wind-up; it uncoils, lifts and sweeps around for the whip
    const whip = melee * s, coil = melee * a;
    const cb = 1 + Math.sin(t.p * 0.8) * 0.025 + Math.sin(t.w) * 0.02 * t.mv + coil * 0.1 + cam * 0.06 - h * 0.16 - t.sw * 0.06 - (slam + shot * 0.6) * s * 0.14 + t.gl * 0.015 * Math.sin(t.tm * 6);
    for (let i = 0; i < 4; i++) CS[i] = Math.min(1.14, cb - whip * (1.04 - i * 0.07));
    layFilm(b, P, CS);
    b.tail1.rotation.y += t.sl * 0.45 + Math.sin(t.p * 0.6) * 0.05 - coil * 0.5 + whip * 1.9;
    b.tail1.rotation.z += h * 0.12 - t.sw * 0.05 - coil * 0.12 - whip * 0.32 - rear * 0.8;
    for (let i = 1; i < 4; i++) b[TB[i]].rotation.y += t.sl * 0.18 + whip * 0.2 + Math.sin(t.p * 0.6 - i * 0.6) * 0.03;
  }
};
