/* Bellowsfrog - tin toad with a leather bellows throat, a copper boiler on its back and pressure-gauge eyes. Steam / Gale. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, ball, lathe, torus, rbox } from '../geo.js';

const GREEN = '#5f8238', DGREEN = '#3c5a28', CREAM = '#d9cf9c', COPPER = '#b9683a', BRASS = '#c9a148', LEATHER = '#86522f', LDARK = '#4c2a18', IRON = '#3b393e';
const BRASSM = { col: BRASS, metal: 1, rough: 0.3, env: 1.1 };
const STEEL = { col: '#b4bac4', metal: 1, rough: 0.22, env: 1.2 };
const RED = { col: '#d2301e', rough: 0.4, glow: '#ff3a1e', glowK: 0.5 };
const TONGUE = { col: '#d8564a', rough: 0.35 };
const STEAM = { col: '#f1ece2', rough: 1, op: 0.5, noOut: true };
const BR = { col: BRASS, metal: 1, gloss: 0.6, k: 0.012 }, FE = { col: IRON, metal: 0.8, gloss: 0.4, k: 0.02 }, CU = { col: COPPER, metal: 1, gloss: 0.5, k: 0.02 };

const D = Math.PI / 180, _e = new THREE.Euler(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
// a copy of a geometry at a place: position, rotation (degrees) or a direction for +Y, scale
function at(g, p, r, s) {
  if (r && r.isVector3) _q.setFromUnitVectors(UP, _v.copy(r).normalize()); else { r = r || [0, 0, 0]; _q.setFromEuler(_e.set(r[0] * D, r[1] * D, r[2] * D, 'XYZ')); }
  return g.clone().applyMatrix4(_m.compose(new THREE.Vector3(p[0], p[1], p[2]), _q, _s.setScalar(s || 1)));
}
function merge(list) {
  return mergeGeometries(list.map(g => { if (g.getAttribute('uv')) g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));
}
const cyl = (r, h, seg) => new THREE.CylinderGeometry(r, r, h, seg || 10);
const O = (base, extra) => Object.assign({}, base, extra);

// eye: centre and direction of the gauge
const EC = [0.5, 0.775, 0.27], ED = new THREE.Vector3(0.72, 0.42, 0.55).normalize();
const EROT = [-Math.asin(ED.y) / D, Math.atan2(ED.x, ED.z) / D, 0];   // order YXZ: turns +Z to ED
const along = (k) => [EC[0] + ED.x * k, EC[1] + ED.y * k, EC[2] + ED.z * k];

export default {
  id: 'bellowsfrog', rim: '#ffd9a0', focus: 'chim', top: 1.36, rough: 0.5, opts: { cell: 0.026, mottle: 0.05, mottleF: 12 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.4, 0]).bone('head', 'body', [0.3, 0.52, 0]).bone('jaw', 'head', [0.22, 0.45, 0])
      .bone('eyeL', 'head', along(-0.16), { m: 1 }).bone('sac', 'body', [0.36, 0.23, 0])
      .bone('stack', 'body', [-0.34, 0.98, 0]).bone('chim', 'stack', [-0.36, 1.32, 0])
      .bone('legFL', 'body', [0.16, 0.3, 0.42], { m: 1 })
      .bone('legBL', 'body', [-0.4, 0.36, 0.44], { m: 1 }).bone('shinBL', 'legBL', [-0.03, 0.55, 0.65], { m: 1 }).bone('footBL', 'shinBL', [-0.44, 0.13, 0.66], { m: 1 });

    S.color(GREEN);
    // wide tin body, copper boiler with brass bands
    S.ell('body', [-0.1, 0.42, 0], [0.62, 0.34, 0.5], { gloss: 0.45 });
    S.cap('body', [-0.36, 0.64, 0], [-0.02, 0.64, 0], 0.37, 0.37, CU);
    for (const [x, R] of [[-0.53, 0.332], [-0.19, 0.372], [0.14, 0.336]]) S.tor('body', [x, 0.64, 0], R, 0.032, O(BR, { rot: [0, 0, 90] }));
    // firebox door at the rear
    S.ell('body', [-0.72, 0.6, 0], [0.065, 0.17, 0.17], O(FE, { k: 0.012 }));
    S.tor('body', [-0.738, 0.6, 0], 0.168, 0.028, O(BR, { rot: [0, 0, 90], k: 0.01 }));
    S.ell('body', [-0.79, 0.6, 0.14], [0.03, 0.035, 0.035], O(BR, { k: 0.008 }));
    // chimney with a hot throat
    S.cap('stack', [-0.34, 0.95, 0], [-0.36, 1.25, 0], 0.115, 0.09, O(FE, { k: 0.03 }));
    S.tor('stack', [-0.36, 1.27, 0], 0.1, 0.036, BR);
    S.tor('stack', [-0.345, 1.04, 0], 0.118, 0.026, BR);
    S.cap('stack', [-0.36, 1.1, 0], [-0.36, 1.42, 0], 0.062, 0.062, { sub: 1, col: '#ffb050', glow: 3.2, k: 0.015 });
    // sight glass on each side of the boiler
    S.tor('body', [-0.19, 0.76, 0.352], 0.07, 0.024, O(BR, { rot: [72, 0, 0], k: 0.01, m: 1 }));
    // head and jaw: wide mouth with a brass lip
    S.ell('head', [0.44, 0.58, 0], [0.4, 0.21, 0.49], { gloss: 0.45, k: 0.03, sb: 0.04 });
    S.ell('jaw', [0.44, 0.43, 0], [0.4, 0.115, 0.475], { col: CREAM, gloss: 0.4, k: 0.012, sb: 0.04 });
    const lip = [], line = [];
    for (let a = -105; a <= 105; a += 21) { lip.push([0.44 + 0.378 * Math.cos(a * D), 0.502, 0.462 * Math.sin(a * D)]); line.push([0.44 + 0.384 * Math.cos(a * D), 0.469, 0.462 * Math.sin(a * D)]); }
    S.tube('head', lip, lip.map(() => 0.03), O(BR, { sb: 0.04 }));
    S.ell('head', [0.74, 0.69, 0.075], [0.035, 0.03, 0.03], { m: 1, k: 0.02, gloss: 0.45 });
    // gauge housings
    S.cap('eyeL', along(-0.26), along(-0.105), 0.125, 0.128, O(BR, { m: 1, k: 0.015 }));
    S.tor('eyeL', along(-0.2), 0.125, 0.022, O(BR, { m: 1, k: 0.008, col: '#a07c30', rot: [-58, 0, 36] }));
    // bellows throat: dark core, five leather pleats
    S.cap('sac', [0.4, 0.22, 0], [0.74, 0.22, 0], 0.125, 0.125, { col: LDARK, k: 0.012, sb: 0.03 });
    [0.15, 0.178, 0.188, 0.178, 0.15].forEach((r, i) => S.ell('sac', [0.41 + i * 0.085, 0.22, 0], [0.046, r, r * 1.3], { col: LEATHER, k: 0.008, sb: 0.03 }));
    S.tor('body', [0.365, 0.235, 0], 0.15, 0.04, O(BR, { rot: [0, 0, 90] }));
    // front legs: short, with copper web feet
    S.cap('legFL', [0.16, 0.3, 0.42], [0.34, 0.16, 0.58], 0.1, 0.075, { m: 1, gloss: 0.45 });
    S.ell('legFL', [0.34, 0.16, 0.58], 0.084, O(BR, { m: 1 }));
    S.cap('legFL', [0.34, 0.16, 0.58], [0.46, 0.07, 0.6], 0.06, 0.055, O(FE, { m: 1 }));
    S.ell('legFL', [0.54, 0.042, 0.6], [0.15, 0.036, 0.125], O(CU, { m: 1 }));
    for (let i = -1; i <= 1; i++) S.cap('legFL', [0.5, 0.045, 0.6 + i * 0.03], [0.7 - Math.abs(i) * 0.03, 0.035, 0.6 + i * 0.1], 0.04, 0.03, O(CU, { m: 1 }));
    // back legs: folded, brass knee and ankle, iron shin
    S.cap('legBL', [-0.4, 0.36, 0.44], [-0.05, 0.54, 0.64], 0.16, 0.12, { m: 1, gloss: 0.45 });
    S.ell('shinBL', [-0.03, 0.55, 0.65], 0.108, O(BR, { m: 1 }));
    S.cap('shinBL', [-0.03, 0.55, 0.65], [-0.44, 0.14, 0.66], 0.082, 0.068, O(FE, { m: 1 }));
    S.ell('footBL', [-0.44, 0.13, 0.66], 0.086, O(BR, { m: 1 }));
    S.cap('footBL', [-0.44, 0.1, 0.66], [-0.16, 0.05, 0.67], 0.068, 0.055, O(CU, { m: 1 }));
    S.ell('footBL', [-0.08, 0.04, 0.67], [0.18, 0.034, 0.12], O(CU, { m: 1 }));
    for (let i = -1; i <= 1; i++) S.cap('footBL', [-0.14, 0.045, 0.67 + i * 0.03], [0.12 - Math.abs(i) * 0.03, 0.035, 0.67 + i * 0.09], 0.04, 0.03, O(CU, { m: 1 }));

    // colour: cream belly, dark toad spots, verdigris on the copper, glow
    S.ell('body', [0, 0.16, 0], [0.62, 0.17, 0.42], { paint: 1, col: CREAM, cb: 0.07 });
    for (const [x, y, z, r] of [[0.2, 0.5, 0.43, 0.07], [-0.05, 0.36, 0.5, 0.06], [-0.55, 0.4, 0.3, 0.07], [0.3, 0.74, 0.22, 0.05], [0.58, 0.7, 0.2, 0.04], [0.42, 0.62, 0.44, 0.05], [-0.62, 0.3, 0.16, 0.05]])
      S.ell('body', [x, y, z], r, { paint: 1, col: DGREEN, cb: 0.02, m: 1 });
    S.ell('head', [0.4, 0.8, 0], [0.2, 0.05, 0.1], { paint: 1, col: DGREEN, cb: 0.03 });
    S.ell('body', [-0.3, 0.66, 0.36], [0.2, 0.09, 0.06], { paint: 1, col: '#5aa890', cb: 0.05, op: 0.55, m: 1, metal: 0.3 });
    S.ell('body', [0.1, 0.9, 0.2], [0.1, 0.08, 0.1], { paint: 1, col: '#5aa890', cb: 0.05, op: 0.45, m: 1, metal: 0.3 });
    S.ell('body', [-0.19, 0.775, 0.37], [0.05, 0.05, 0.03], { paint: 1, col: '#ffc060', glow: 2.6, cb: 0.012, m: 1 });
    for (let i = -1; i <= 1; i++) S.box('body', [-0.78, 0.6 + i * 0.078, -0.01], [0.05, 0.021, 0.105 - Math.abs(i) * 0.03], 0.01, { paint: 1, col: '#ffb040', glow: 3.2, cb: 0.01 });
    S.tube('jaw', line, line.map(() => 0.03), { paint: 1, col: '#3a0f0a', cb: 0.012 });
    S.ell('head', [0.775, 0.7, 0.075], 0.018, { paint: 1, col: '#1c1410', cb: 0.008, m: 1 });

    // rivet rows on the boiler bands and round the door
    const rv = [], rb = ball(0.017, 6, 4);
    for (const [x, R] of [[-0.53, 0.332], [-0.19, 0.372], [0.14, 0.336]]) for (const dx of [-0.062, 0.062]) for (let a = 18; a <= 162; a += 16) {
      const rr = Math.sqrt(Math.max(0.01, 0.376 * 0.376 - Math.pow(Math.max(0, Math.abs(x + dx + 0.19) - 0.17), 2)));
      rv.push(at(rb, [x + dx, 0.64 + rr * Math.sin(a * D), rr * Math.cos(a * D)]));
    }
    for (let i = 0; i < 8; i++) rv.push(at(rb, [-0.775, 0.6 + 0.168 * Math.sin(i * 45 * D + 0.4), 0.168 * Math.cos(i * 45 * D + 0.4)]));
    for (let a = -84; a <= 84; a += 24) rv.push(at(rb, [0.44 + 0.392 * Math.cos(a * D), 0.56, 0.48 * Math.sin(a * D)]));
    S.add('body', merge(rv), BRASSM, {});
    // safety valve with a weight arm
    const valve = merge([lathe([[0.03, 0], [0.03, 0.06], [0.05, 0.075], [0.05, 0.11], [0.026, 0.125], [0.026, 0.15], [0.012, 0.17], [0.001, 0.2]], 10),
      at(cyl(0.012, 0.19, 6), [0.095, 0.1, 0], [0, 0, 82]), at(ball(0.034, 10, 8), [0.19, 0.112, 0])]);
    S.add('body', valve, BRASSM, { p: [0.02, 1.0, 0], name: 'valve' });
    // steam pipe along each side
    S.add('body', tube([[0.1, 0.985, 0.14], [0.11, 0.83, 0.33], [0.0, 0.71, 0.39], [-0.3, 0.7, 0.395], [-0.52, 0.68, 0.36], [-0.63, 0.57, 0.3], [-0.68, 0.48, 0.2]], [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03], { ring: 8, seg: 40 }), BRASSM, { m: 1 });
    S.add('body', merge([at(torus(0.034, 0.015, 12, 6), [0.0, 0.71, 0.39], [0, 90, 0]), at(torus(0.034, 0.015, 12, 6), [-0.3, 0.7, 0.395], [0, 90, 0]), at(ball(0.042, 8, 6), [-0.52, 0.68, 0.36])]), STEEL, { m: 1 });
    // gauge eyes: brass ring, red needle
    S.add('eyeL', torus(0.123, 0.03, 26, 8), BRASSM, { p: along(0.012), r: EROT, order: 'YXZ', m: 1 });
    S.add('eyeL', merge([at(rbox(0.014, 0.1, 0.007), [0, 0.032, 0.128]), at(ball(0.016, 8, 6), [0, 0, 0.126])]), RED, { p: EC, r: EROT, order: 'YXZ', m: 1, name: 'needleL' });
    // brass end plate of the bellows, with a nozzle
    S.add('sac', lathe([[0.001, 0.105], [0.034, 0.105], [0.05, 0.09], [0.05, 0.05], [0.12, 0.042], [0.165, 0.03], [0.17, 0.012], [0.155, 0], [0.001, 0]], 20), BRASSM, { p: [0.775, 0.23, 0], r: [0, 0, -90], s: [1, 1, 1.3] });
    // pistons on the back shins
    const K = new THREE.Vector3(-0.03, 0.55, 0.705), dir = new THREE.Vector3(-0.41, -0.41, 0.01).normalize(), nn = new THREE.Vector3(-0.7, 0.71, 0).multiplyScalar(0.075);
    const pp = k => [K.x + dir.x * k + nn.x, K.y + dir.y * k + nn.y, K.z + dir.z * k + nn.z];
    S.add('shinBL', merge([at(cyl(0.036, 0.25), pp(0.2), dir), at(cyl(0.042, 0.03), pp(0.085), dir), at(cyl(0.042, 0.03), pp(0.32), dir), at(ball(0.03, 8, 6), pp(0.055)), at(ball(0.03, 8, 6), pp(0.53))]), BRASSM, { m: 1 });
    S.add('shinBL', at(cyl(0.016, 0.24, 8), pp(0.42), dir), STEEL, { m: 1 });
    // tongue (hidden until the shot), steam puffs
    const rod = cyl(0.028, 1, 8); rod.rotateZ(-Math.PI / 2); rod.translate(0.5, 0, 0);
    S.add('body', rod, TONGUE, { p: [0.42, 0.47, 0], name: 'tongue' });
    S.add('body', ball(0.075, 14, 10), TONGUE, { p: [0.42, 0.47, 0], name: 'tip' });
    for (let i = 0; i < 3; i++) S.add('chim', ball(0.07, 10, 8), STEAM, { p: [-0.36, 1.34, 0], name: 'puff' + i });
    S.eye('eyeL', EC, 0.118, { dir: [ED.x, ED.y, ED.z], sclera: '#efe6c6', iris: '#f8f2dc', iris2: '#e2d6ac', pupil: 'none', size: 50, lid: '#a8843a', open: 66, glow: 0.3, m: 1 });
  },
  anim(b, t, c) {
    const br = Math.sin(t.p), a = t.a, s = t.s, h = t.h, P = c.parts;
    const slam = t.k === 'slam' ? 1 : 0, shot = t.k === 'shot' ? 1 : 0, buff = t.k === 'buff' ? 1 : 0, mel = t.k === 'melee' ? 1 : 0;
    // frog hop from the walk phase: push off, fly, land
    const u = Math.sin(t.w), air = Math.max(0, u) * t.mv + mel * s, land = Math.max(0, -u) * t.mv + mel * a * 0.8;
    const croak = Math.pow(Math.max(0, Math.sin(t.p * 0.5)), 8);
    b.body.position.y += br * 0.008 + air * 0.2 - land * 0.03 + slam * a * 0.07 + mel * Math.sin(Math.min(1, s) * Math.PI) * 0.12;
    b.body.position.x += mel * (s * 0.3 - a * 0.1) + shot * (s * 0.05 - a * 0.05) - slam * s * 0.08 + buff * Math.sin(t.tm * 50) * 0.004 * a;
    b.body.rotation.z += Math.cos(t.w) * 0.15 * t.mv + slam * (a * 0.2 - s * 0.12) + mel * (a * 0.14 - s * 0.3) + h * 0.12 - t.sw * 0.04;
    b.body.rotation.x = t.sl * 0.1;
    b.legBL.rotation.z = b.legBR.rotation.z = -air * 0.85 + land * 0.1;
    b.shinBL.rotation.z = b.shinBR.rotation.z = air * 0.62 - land * 0.06;
    b.footBL.rotation.z = b.footBR.rotation.z = air * 0.25;
    b.legFL.rotation.z = b.legFR.rotation.z = air * 0.45 + land * 0.04 - mel * s * 0.3;
    b.legFL.rotation.x = -mel * s * 0.5 - slam * a * 0.15; b.legFR.rotation.x = -b.legFL.rotation.x;
    // bellows: the pleats breathe; they fill for the blast and fold flat when it fires
    const pump = buff * a * Math.sin(t.tm * 14) * 0.16 + t.gl * Math.sin(t.tm * 9) * 0.05;
    b.sac.scale.set(1 + br * 0.09 + croak * 0.28 + slam * (a * 0.8 - s * 0.5) + shot * a * 0.2 + pump - h * 0.2,
      1 + br * 0.03 + croak * 0.14 + slam * (a * 0.62 - s * 0.2) + pump * 0.5, 1 + br * 0.035 + croak * 0.18 + slam * (a * 0.85 - s * 0.25) + pump * 0.5);
    b.sac.rotation.z = -Math.cos(t.w) * 0.08 * t.mv + slam * a * 0.06;
    // head, jaw, gauge eyes
    b.head.rotation.z = br * 0.015 + croak * 0.05 + slam * (a * 0.2 - s * 0.05) + shot * (-a * 0.08 + s * 0.28) + h * 0.2 + mel * (a * 0.1 - s * 0.1);
    b.head.rotation.y = t.lk * 0.18;
    b.head.position.x += shot * (s * 0.12 - a * 0.06);
    b.jaw.rotation.z = -(croak * 0.06 + slam * s * 0.45 + shot * s * 0.4 + h * 0.3 + mel * s * 0.2 + buff * a * 0.1);
    const press = Math.min(1.6, a * (slam || buff ? 1 : 0.5) + t.gl * 0.5 + slam * s * 0.6 + croak * 0.3);
    const es = 1 + slam * a * 0.2 + h * 0.12 + croak * 0.04;
    b.eyeL.scale.setScalar(es); b.eyeR.scale.setScalar(es);
    b.eyeL.rotation.y = Math.sin(t.p * 0.7) * 0.05; b.eyeR.rotation.y = Math.sin(t.p * 0.7 + 1) * 0.05;
    P.needleL.rotation.z += -0.9 + press * 1.7 + Math.sin(t.tm * 33) * 0.07 * press; P.needleR.rotation.z += -0.9 + press * 1.7 + Math.sin(t.tm * 29 + 1) * 0.07 * press;
    // boiler: valve spins and lifts, chimney puffs
    P.valve.rotation.y = t.tm * (1.2 + press * 16); P.valve.position.y += press * 0.03 * (1 + Math.sin(t.tm * 40));
    b.stack.rotation.z = t.sw * 0.1 + Math.sin(t.p * 2) * 0.01; b.stack.rotation.x = t.sl * 0.1;
    b.stack.scale.y = 1 - slam * a * 0.08 + slam * s * 0.12;
    const smoke = 0.55 + press * 0.8 + t.mv * 0.2 + slam * s;
    for (let i = 0; i < 3; i++) {
      const q = (t.tm * (0.55 + press * 0.5) + i / 3) % 1, pf = P['puff' + i];
      pf.position.y += q * (0.3 + press * 0.2); pf.position.x -= q * (0.08 + t.sw * 0.3 + t.mv * 0.1); pf.position.z += Math.sin(q * 5 + i * 2) * 0.03 + t.sl * q * 0.2;
      pf.scale.setScalar(Math.max(0.001, Math.sin(q * Math.PI) * (0.45 + q * 0.9) * smoke));
    }
    // tongue
    const L = shot * s * 0.95, tg = P.tongue;
    tg.visible = P.tip.visible = L > 0.02;
    tg.scale.x = Math.max(0.001, L); P.tip.position.x += L;
  }
};
