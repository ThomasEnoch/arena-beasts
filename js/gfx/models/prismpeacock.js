/* Prismpeacock - silver filigree peacock with a fan of 15 dichroic glass feathers. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, cone, ball, crystal, wing, canvasTex } from '../geo.js';

const SILVER = '#bcc4d0', DARK = '#566078', GOLD = '#e8bc48', BLUE = '#1c4fb4', PALE = '#dfe3ea';
const SILV = { col: '#c8d0da', metal: 1, rough: 0.2, env: 1.3 };
const GOLDM = { col: '#f0c44c', metal: 0.9, rough: 0.22, env: 1.2 };
const STEELF = { col: '#aeb8c8', metal: 1, rough: 0.16, env: 1.5 };
const GEM = { col: '#bff4ff', glow: '#5fe0ff', glowK: 2.6, noOut: true };
const PRISM = { col: '#dfe6f6', rough: 0.05, glow: '#c8dcff', glowK: 1.5, flat: true, env: 1.5 };
const R2D = 180 / Math.PI, LEAN = 20, FA = 12 / R2D, GA = 36 / R2D, ROOT = [-0.4, 0.93, 0];
const FN = new THREE.Vector3(Math.cos(LEAN / R2D), Math.sin(LEAN / R2D), 0);   // normal of the fan plane
// 15 glass materials: the glow goes from magenta (f0, right side) to cyan (f14, left side); the glass tint is shifted (dichroic)
const FEA = [];
for (let i = 0; i < 15; i++) {
  const hue = 0.87 - i / 14 * 0.37, c = new THREE.Color();
  FEA.push({ col: '#' + c.setHSL((hue + 0.1) % 1, 0.85, 0.66).getHexString(), glow: '#' + c.setHSL(hue, 1, 0.52).getHexString(), glowK: 1.7, op: 0.62, rough: 0.06, env: 1.6, noOut: true });
}
let texA = null, texB = null;
function featherTex(em) {
  return canvasTex(256, 64, (g, W, H) => {
    g.fillStyle = em ? '#4a4a4a' : '#d6d6d6'; g.fillRect(0, 0, W, H);
    g.strokeStyle = em ? '#8c8c8c' : '#f4f4f4'; g.lineWidth = 2;
    for (let k = 0; k < 24; k++) { const x = k * W / 22; g.beginPath(); g.moveTo(x + W * 0.07, 0); g.lineTo(x, H / 2); g.lineTo(x + W * 0.07, H); g.stroke(); }
    g.strokeStyle = em ? '#c8c8c8' : '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    const ex = W * 0.8, ey = H / 2;
    g.fillStyle = em ? '#101010' : '#3a3a48'; g.beginPath(); g.ellipse(ex, ey, W * 0.088, H * 0.38, 0, 0, 7); g.fill();
    g.fillStyle = em ? '#9a9a9a' : '#e8e8e8'; g.beginPath(); g.ellipse(ex, ey, W * 0.06, H * 0.26, 0, 0, 7); g.fill();
    g.fillStyle = em ? '#181818' : '#50506a'; g.beginPath(); g.ellipse(ex + W * 0.006, ey, W * 0.04, H * 0.17, 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ex, ey, W * 0.022, H * 0.1, 0, 0, 7); g.fill();
  });
}
// one geometry from several (same material)
function join(gs, uv) {
  return mergeGeometries(gs.map(g => {
    g = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && !(uv && k === 'uv')) g.deleteAttribute(k);
    return g;
  }));
}
// glass feather: long axis +Y, width Z, thin X; with the eye-spot ball near the tip
function featherGeo(L, off) {
  const s0 = 0.08, l = L - s0;
  const g = wing([[s0, -0.01], [s0 + 0.3 * l, -0.028], [s0 + 0.6 * l, -0.075], [s0 + 0.8 * l, -0.082], [s0 + 0.94 * l, -0.05], [L, 0], [s0 + 0.94 * l, 0.05], [s0 + 0.8 * l, 0.082], [s0 + 0.6 * l, 0.075], [s0 + 0.3 * l, 0.028], [s0, 0.01]], 0.014);
  g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2);
  const eb = ball(0.05, 12, 8), U = eb.getAttribute('uv');
  for (let i = 0; i < U.count; i++) U.setXY(i, 0.8, 0.5);
  eb.scale(0.55, 1.25, 1); eb.translate(0, s0 + 0.8 * l, 0);
  const m = join([g, eb], true);
  m.translate(off, 0, 0);
  return m;
}
function aimY(dx, dy, dz) { const l = Math.hypot(dx, dy, dz); return [0, Math.atan2(-dz, dx) * R2D, -Math.acos(dy / l) * R2D]; }
// wing plate: [cx, cy, cz, rx, ry, rz]
const WG = [-0.04, 0.86, 0.2, 0.27, 0.115, 0.05];
function wingZ(x, y) { const q = 1 - Math.pow((x - WG[0]) / WG[3], 2) - Math.pow((y - WG[1]) / WG[4], 2); return WG[2] + WG[5] * Math.sqrt(Math.max(0, q)) + 0.004; }
function sScroll(ax, ay, bx, by, ra, rb) {
  const pts = [], n = 14, turns = 1.35, add = (x, y) => pts.push([x, y, wingZ(x, y)]);
  for (let i = 0; i <= n; i++) { const u = i / n, a = -Math.PI / 2 + (1 - u) * turns * 6.2832, r = 0.01 + (ra - 0.01) * u; add(ax + Math.cos(a) * r, ay + Math.sin(a) * r); }
  for (let i = 0; i <= n; i++) { const u = i / n, a = Math.PI / 2 + u * turns * 6.2832, r = rb + (0.01 - rb) * u; add(bx + Math.cos(a) * r, by + Math.sin(a) * r); }
  return tube(pts, pts.map(() => 0.01), { ring: 5, seg: pts.length * 3 });
}

export default {
  id: 'prismpeacock', rim: '#d0e8ff', focus: 'fan', top: 2.05, rough: 0.36,
  opts: { cell: 0.025, mottle: 0.04, mottleF: 16 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.8, 0])
      .bone('neck1', 'body', [0.3, 0.92, 0]).bone('neck2', 'neck1', [0.5, 1.16, 0]).bone('neck3', 'neck2', [0.42, 1.42, 0]).bone('head', 'neck3', [0.48, 1.6, 0])
      .bone('wingL', 'body', [0.14, 0.93, 0.17], { m: 1 })
      .bone('legL', 'body', [0, 0.66, 0.11], { m: 1 }).bone('shinL', 'legL', [-0.06, 0.4, 0.12], { m: 1 })
      .bone('fan', 'body', ROOT);
    for (let j = 0; j < 5; j++) S.bone('fa' + j, 'fan', ROOT);
    S.color(SILVER);
    const mt = { metal: 1, gloss: 0.6 }, gd = { col: GOLD, metal: 1, gloss: 0.7 };
    // body: slender silver egg, chest, rump and a short tail cover under the fan
    S.ell('body', [-0.02, 0.8, 0], [0.36, 0.2, 0.2], Object.assign({ k: 0.04 }, mt));
    S.ell('body', [0.22, 0.86, 0], [0.2, 0.2, 0.18], Object.assign({ k: 0.05 }, mt));
    S.cap('body', [-0.3, 0.86, 0], [-0.42, 0.94, 0], 0.13, 0.1, Object.assign({ k: 0.04 }, mt));
    S.ell('body', [-0.52, 0.84, 0], [0.16, 0.055, 0.14], Object.assign({ k: 0.02, col: DARK }, mt));
    S.ell('body', [-0.46, 0.8, 0], [0.13, 0.06, 0.12], Object.assign({ k: 0.02 }, mt));
    // fan hub: gold ring, dark disc
    S.tor('fan', [-0.42, 0.94, 0], 0.1, 0.03, Object.assign({ k: 0.01, rot: [0, 0, -70] }, gd));
    S.ell('fan', [-0.43, 0.935, 0], [0.045, 0.1, 0.1], { k: 0.01, col: DARK, metal: 1, gloss: 0.6, rot: [0, 0, 20] });
    // neck with gold collars, small head, gold beak base
    S.tube(['neck1', 'neck2', 'neck3'], [[0.3, 0.92, 0], [0.5, 1.16, 0], [0.42, 1.42, 0], [0.48, 1.6, 0]], [0.1, 0.064, 0.056, 0.06], Object.assign({ k: 0.05 }, mt));
    S.tor('neck1', [0.325, 0.95, 0], 0.096, 0.028, Object.assign({ k: 0.01, rot: aimY(0.2, 0.24, 0) }, gd));
    S.tor('neck2', [0.5, 1.16, 0], 0.064, 0.024, Object.assign({ k: 0.01, rot: aimY(0.06, 0.25, 0) }, gd));
    S.tor('neck3', [0.42, 1.42, 0], 0.057, 0.022, Object.assign({ k: 0.01, rot: aimY(-0.01, 0.22, 0) }, gd));
    S.ell('head', [0.5, 1.62, 0], [0.115, 0.1, 0.095], Object.assign({ k: 0.03 }, mt));
    S.cap('head', [0.58, 1.61, 0], [0.66, 1.59, 0], 0.05, 0.036, Object.assign({ k: 0.012 }, gd));
    S.ell('head', [0.47, 1.71, 0], [0.05, 0.03, 0.045], Object.assign({ k: 0.012 }, gd));
    // folded wings, thighs
    S.ell('wingL', [WG[0], WG[1], WG[2]], [WG[3], WG[4], WG[5]], Object.assign({ m: 1, k: 0.02 }, mt));
    S.ell('wingL', [0.13, 0.9, 0.2], [0.075, 0.07, 0.05], Object.assign({ m: 1, k: 0.012 }, gd));
    S.cap('legL', [0, 0.7, 0.11], [-0.04, 0.52, 0.12], 0.095, 0.05, Object.assign({ m: 1, k: 0.04 }, mt));
    S.tor('legL', [-0.035, 0.535, 0.12], 0.05, 0.022, Object.assign({ m: 1, k: 0.01, rot: aimY(-0.04, -0.18, 0.01) }, gd));
    // chest medallion and rivets on the back
    S.tor('body', [0.4, 0.86, 0], 0.052, 0.024, Object.assign({ k: 0.01, rot: [0, 0, 78] }, gd));
    S.ell('body', [0.412, 0.862, 0], 0.046, { col: '#8ff0ff', glow: 2.6, k: 0.01 });
    for (const x of [-0.26, -0.14, -0.02, 0.1]) S.ell('body', [x, 0.8 + 0.2 * Math.sqrt(1 - Math.pow((x + 0.02) / 0.36, 2)) + 0.004, 0], 0.03, Object.assign({ k: 0.008 }, gd));
    // colour: engraved bands, blue enamel on chest, neck and wings, pale cheek, dark belly
    for (const x of [-0.2, -0.08, 0.04]) S.ell('body', [x, 0.8, 0], [0.02, 0.3, 0.3], { paint: 1, col: DARK, metal: 1, gloss: 0.5, cb: 0.01 });
    S.ell('body', [0.3, 0.8, 0], [0.12, 0.2, 0.2], { paint: 1, col: BLUE, gloss: 0.9, cb: 0.02 });
    S.tube(['neck1', 'neck2', 'neck3'], [[0.36, 0.93, 0], [0.56, 1.15, 0], [0.48, 1.42, 0], [0.53, 1.56, 0]], [0.085, 0.062, 0.054, 0.05], { paint: 1, col: BLUE, gloss: 0.9, cb: 0.012 });
    S.ell('head', [0.47, 1.68, 0], [0.1, 0.05, 0.08], { paint: 1, col: BLUE, gloss: 0.9, cb: 0.014 });
    S.ell('head', [0.53, 1.605, 0.08], [0.06, 0.022, 0.03], { paint: 1, col: PALE, cb: 0.01, m: 1 });
    S.ell('body', [0, 0.62, 0], [0.34, 0.07, 0.16], { paint: 1, col: DARK, metal: 1, gloss: 0.5, cb: 0.04 });
    S.ell('wingL', [-0.16, 0.84, 0.25], [0.11, 0.1, 0.05], { paint: 1, col: BLUE, gloss: 0.9, cb: 0.012, m: 1 });
    for (let i = 0; i < 4; i++) S.ell('body', [-0.28 + i * 0.1, 0.7, 0.16], 0.017, { paint: 1, col: GOLD, metal: 1, gloss: 0.7, cb: 0.008, m: 1 });

    // fan: 15 glass feathers on 5 fan bones, silver spokes, a prism at the hub
    if (!texA) { texA = featherTex(false); texB = featherTex(true); for (const m of FEA) { m.map = texA; m.emap = texB; } }
    for (let i = 0; i < 15; i++)
      S.add('fa' + ((i / 3) | 0), featherGeo(1.15 - 0.004 * (i - 7) * (i - 7), i % 2 ? 0.016 : 0), FEA[i], { p: ROOT, r: [(i - 7) * 12, 0, LEAN], order: 'ZXY', name: 'f' + i });
    const spoke = tube([[0.034, 0.03, 0], [0.034, 0.25, 0], [0.034, 0.46, 0]], [0.018, 0.013, 0.006], { ring: 6 });
    for (let j = 0; j < 5; j++) S.add('fa' + j, spoke, SILV, { p: ROOT, r: [(j - 2) * 36, 0, LEAN], order: 'ZXY' });
    S.add('fan', crystal(0.055, 0.18, 0.05, 6), PRISM, { p: [-0.34, 0.955, 0], r: [0, 0, LEAN], name: 'prism' });
    // crest: 5 pins with glowing gems
    const pins = [], gems = [];
    for (let k = 0; k < 5; k++) {
      const al = (-15 + k * 17) / R2D, d = [-Math.sin(al) * 0.2, Math.cos(al) * 0.2, (k - 2) * 0.012];
      pins.push(tube([[0, 0, 0], [d[0] * 0.5, d[1] * 0.5, d[2] * 0.5], d], [0.011, 0.009, 0.007], { ring: 5 }));
      gems.push(ball(0.028, 10, 8).translate(d[0], d[1], d[2]));
    }
    S.add('head', join(pins), SILV, { p: [0.47, 1.72, 0], name: 'crest' });
    S.add('head', join(gems), GEM, { p: [0.47, 1.72, 0], name: 'gems' });
    S.add('head', cone(0.037, 0.17, 10), GOLDM, { p: [0.65, 1.593, 0], r: [0, 0, -104] });
    // wing feathers (3 steel blades) and a gold scroll on each wing
    const wf = [];
    for (let i = 0; i < 3; i++) {
      const L = 0.4 - i * 0.045, g = wing([[0, -0.03], [L * 0.5, -0.048], [L, 0], [L * 0.5, 0.048], [0, 0.03]], 0.016);
      g.rotateY(-Math.PI / 2); g.rotateX(Math.PI / 2); g.rotateZ((4 + i * 13) / R2D); g.translate(i * 0.035, -i * 0.02, i * 0.006);
      wf.push(g);
    }
    S.add('wingL', join(wf), STEELF, { p: [-0.2, 0.88, 0.236], m: 1 });
    S.add('wingL', sScroll(0.03, 0.87, -0.09, 0.9, 0.04, 0.034), GOLDM, { m: 1 });
    // legs: gold rods with a knee ball; 3 front toes and 1 back toe
    const up = join([tube([[0, 0, 0], [-0.03, -0.13, 0.005], [-0.06, -0.26, 0.01]], [0.032, 0.027, 0.024], { ring: 7 }), ball(0.04, 10, 8).translate(-0.06, -0.26, 0.01)]);
    const F = [0.06, -0.365, 0], toe = (x, z) => tube([F, [F[0] + x * 0.55, -0.375, z * 0.55], [F[0] + x, -0.385, z]], [0.02, 0.016, 0.006], { ring: 5 });
    const low = join([tube([[0, 0, 0], [0.02, -0.2, 0], F], [0.024, 0.02, 0.02], { ring: 7 }), ball(0.03, 10, 8).translate(F[0], F[1], 0), toe(0.15, 0), toe(0.12, 0.09), toe(0.12, -0.09), toe(-0.1, 0)]);
    S.add('legL', up, GOLDM, { p: [0, 0.66, 0.11], m: 1 });
    S.add('shinL', low, GOLDM, { p: [-0.06, 0.4, 0.12], m: 1 });
    S.eye('head', [0.55, 1.635, 0.07], 0.036, { dir: [0.5, 0.1, 0.85], sclera: '#14203a', iris: '#30d8ff', iris2: '#c8f8ff', lid: SILVER, open: 40, tilt: -10, glow: 1.2, m: 1 });
  },
  anim(b, t, c) {
    const br = Math.sin(t.p), a = t.a, s = t.s, h = t.h, k = t.k, st = Math.sin(t.w), sway = Math.sin(t.p * 0.6);
    const shot = k === 'shot' ? 1 : 0, slam = k === 'slam' ? 1 : 0, buff = k === 'buff' ? 1 : 0, melee = k === 'melee' ? 1 : 0, show = shot + slam;
    // fan: 0 = closed, 1 = fully open
    let f = 0.7 + sway * 0.03 + t.gl * 0.1 + show * 0.3 * Math.max(a, s) + buff * (s * 0.3 - a * 0.5) - melee * a * 0.25 - h * 0.3 - Math.abs(t.sw) * 0.1;
    f = f < 0.08 ? 0.08 : f > 1 ? 1 : f;
    const quiver = (s * show + buff * s + h * 0.6 + t.gl * 0.3) * Math.sin(t.tm * 38) * 0.02;
    for (let j = 0; j < 5; j++) b['fa' + j].quaternion.setFromAxisAngle(FN, (j - 2) * GA * (f - 1));
    for (let i = 0; i < 15; i++) {
      const p = c.parts['f' + i], j = (i / 3) | 0;
      p.rotation.x = (i - 7) * FA + ((i - 7) * FA - (j - 2) * GA) * (f - 1) + Math.sin(t.p * 1.4 + i * 0.7) * 0.02 + quiver * (i % 2 ? 1 : -1);
      p.rotation.y = Math.sin(t.p * 1.1 + i * 0.9) * (0.2 + t.gl * 0.15) + s * show * 0.5 * (i % 2 ? 1 : -1);
    }
    b.fan.rotation.z = sway * 0.03 + t.sw * 0.25 + show * (a * 0.12 - s * 0.3) + buff * (a * 0.2 - s * 0.15) + h * 0.2 + melee * a * 0.15;
    b.fan.rotation.x = t.sl * 0.2;
    c.parts.prism.scale.setScalar(1 + show * a * 0.5 + s * 0.4 + t.gl * 0.2 + 0.05 * Math.sin(t.tm * 5));
    // body, legs
    b.body.position.y += br * 0.01 + Math.abs(st) * 0.03 * t.mv + slam * (a * 0.05 + s * 0.03) - buff * a * 0.05 - melee * a * 0.03;
    b.body.position.x += melee * (s * 0.14 - a * 0.08) - shot * s * 0.05;
    b.body.rotation.z = -t.sw * 0.06 + h * 0.14 + show * a * 0.08 - shot * s * 0.1 - buff * a * 0.16 + melee * (a * 0.1 - s * 0.16);
    b.body.rotation.x = t.sl * 0.1 + st * 0.03 * t.mv;
    b.legL.rotation.z = st * 0.5 * t.mv - b.body.rotation.z; b.legR.rotation.z = -st * 0.5 * t.mv - b.body.rotation.z;
    b.shinL.rotation.z = -Math.max(0, Math.cos(t.w)) * 0.7 * t.mv; b.shinR.rotation.z = -Math.max(0, -Math.cos(t.w)) * 0.7 * t.mv;
    b.legL.position.y += Math.max(0, Math.cos(t.w)) * 0.03 * t.mv; b.legR.position.y += Math.max(0, -Math.cos(t.w)) * 0.03 * t.mv;
    // neck: proud arch for the show, coil and dart for the peck, bow for the decoy
    const bobw = Math.sin(t.w * 2) * 0.06 * t.mv;
    b.neck1.rotation.z = sway * 0.04 + t.sw * 0.12 + bobw + show * (a * 0.12 - s * 0.35) + melee * (a * 0.5 - s * 0.7) - buff * a * 0.3 + h * 0.3;
    b.neck2.rotation.z = -sway * 0.05 - bobw + show * (a * 0.1 - s * 0.2) + melee * (-a * 0.55 + s * 0.3) - buff * a * 0.25 + h * 0.15;
    b.neck3.rotation.z = sway * 0.03 + melee * (-a * 0.3 + s * 0.3) + buff * a * 0.2;
    b.head.rotation.z = -sway * 0.04 - show * a * 0.2 + shot * s * 0.4 + melee * (a * 0.3 + s * 0.15) + buff * a * 0.3 - h * 0.3;
    b.head.rotation.y = t.lk * 0.4; b.neck2.rotation.y = t.lk * 0.15 + t.sl * 0.15;
    c.parts.crest.rotation.z = c.parts.gems.rotation.z = Math.sin(t.p * 1.7) * 0.06 + t.sw * 0.4 + show * a * 0.25 - h * 0.4;
    c.parts.crest.rotation.x = c.parts.gems.rotation.x = t.sl * 0.4;
    // wings: lifted for the pirouette, a small shrug in other moves
    const lift = slam * Math.max(a, s * 0.8) + shot * a * 0.25 + buff * s * 0.5 + h * 0.3 + Math.max(0, br) * 0.03;
    b.wingL.rotation.y = lift * 1.1; b.wingR.rotation.y = -lift * 1.1;
    b.wingL.rotation.x = -lift * 0.8 - slam * s * Math.sin(t.tm * 30) * 0.2; b.wingR.rotation.x = -b.wingL.rotation.x;
    b.wingL.rotation.z = b.wingR.rotation.z = lift * 0.35 - t.sw * 0.1;
  }
};
