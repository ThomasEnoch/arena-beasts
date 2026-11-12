/* Pendulummantis - brass mantis with astrolabe scythes, stained-glass wings and a clock pendulum. Iron / Mind. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, blade, wing, lathe, ball, cone, torus, rbox, canvasTex } from '../geo.js';

const BRASS = '#b08d3c', PALE = '#cdae5a', BRONZE = '#4f3d24', VERD = '#4fa08e', TEAL = '#8fffe6', RUBY = '#ff5a4a';
const BRASSM = { col: '#c2a04a', metal: 1, rough: 0.32, env: 1.1 };
const GOLDM = { col: '#e2c478', metal: 1, rough: 0.2, env: 1.3, flat: true };
const STEEL = { col: '#e4eaf0', metal: 1, rough: 0.14, env: 1.4 };
const BRONZM = { col: '#5a472c', metal: 0.8, rough: 0.45, env: 0.8 };
const GEM = { col: '#ffd890', glow: '#ffb030', glowK: 2.6, noOut: true };
const HAND = { col: '#2a2018', rough: 0.4 };
const D2R = Math.PI / 180;
let texA = null, texB = null;

// leaded glass: a fan of colour cells between dark lead lines. u = along the wing, v = across the wing.
function glassTex(pal) {
  return canvasTex(256, 128, (g, W, H) => {
    g.fillStyle = '#1b1622'; g.fillRect(0, 0, W, H);
    const nu = 7, nv = 4, lead = 3;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const x0 = W * Math.pow(i / nu, 0.85), x1 = W * Math.pow((i + 1) / nu, 0.85), y0 = H * j / nv, y1 = H * (j + 1) / nv, sk = (j - 1.5) * 9;
      g.fillStyle = pal[(i * 3 + j * 2 + ((i * j) % 3)) % pal.length];
      g.beginPath(); g.moveTo(x0 + lead + sk, y0 + lead); g.lineTo(x1 - lead + sk, y0 + lead); g.lineTo(x1 - lead + sk + 9, y1 - lead); g.lineTo(x0 + lead + sk + 9, y1 - lead); g.closePath(); g.fill();
      const gr = g.createRadialGradient((x0 + x1) / 2 + sk, y0 + (y1 - y0) * 0.35, 1, (x0 + x1) / 2 + sk, (y0 + y1) / 2, (x1 - x0) * 0.7);
      gr.addColorStop(0, 'rgba(255,255,255,0.42)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fill();
    }
    // rose window
    const cx = W * 0.6, cy = H * 0.5, R = H * 0.3;
    g.fillStyle = '#1b1622'; g.beginPath(); g.arc(cx, cy, R + 5, 0, 7); g.fill();
    for (let i = 0; i < 8; i++) { g.fillStyle = pal[i % pal.length]; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, i * Math.PI / 4 + 0.06, (i + 1) * Math.PI / 4 - 0.06); g.closePath(); g.fill(); }
    g.fillStyle = '#1b1622'; g.beginPath(); g.arc(cx, cy, R * 0.42, 0, 7); g.fill();
    g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(cx, cy, R * 0.3, 0, 7); g.fill();
    g.strokeStyle = '#1b1622'; g.lineWidth = 7; g.strokeRect(0, 0, W, H);
  });
}
// one geometry from many (no uv)
function join(list) {
  return mergeGeometries(list.map(g => { const q = g.index ? g.toNonIndexed() : g.clone(); q.deleteAttribute('uv'); if (!q.getAttribute('normal')) q.computeVertexNormals(); return q; }));
}
const at = (g, p) => g.clone().translate(p[0], p[1], p[2]);
function aim(geo, d) {
  const g = geo.clone();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]).normalize()));
  return g;
}
// put a wing() geometry (span = +Z, chord = +X) into the model: span and chord become the given directions
function panel(geo, span, chord) {
  const z = new THREE.Vector3(span[0], span[1], span[2]).normalize(), x = new THREE.Vector3(chord[0], chord[1], chord[2]);
  x.addScaledVector(z, -x.dot(z)).normalize();
  return geo.clone().applyMatrix4(new THREE.Matrix4().makeBasis(x, new THREE.Vector3().crossVectors(z, x), z));
}

export default {
  id: 'pendulummantis', rim: '#ffe0a0', focus: 'head', top: 1.9, rough: 0.42,
  opts: { cell: 0.024, mottle: 0.07, mottleF: 15 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.86, 0])
      .bone('abd1', 'body', [-0.2, 0.86, 0]).bone('abd2', 'abd1', [-0.58, 0.82, 0]).bone('abd3', 'abd2', [-0.78, 0.79, 0])
      .bone('pro', 'body', [0.16, 0.95, 0]).bone('head', 'pro', [0.46, 1.52, 0])
      .bone('armL', 'pro', [0.43, 1.41, 0.17], { m: 1 }).bone('scyL', 'armL', [0.8, 1.5, 0.25], { m: 1 })
      .bone('wingL', 'body', [-0.06, 1.05, 0.1], { m: 1 }).bone('wing2L', 'body', [-0.15, 1.02, 0.12], { m: 1 })
      .bone('legML', 'body', [0.07, 0.8, 0.15], { m: 1 }).bone('legHL', 'body', [-0.14, 0.8, 0.15], { m: 1 })
      .bone('pend', 'body', [0.04, 0.67, 0]);

    const M = { metal: 1, gloss: 0.55, k: 0.02 }, Dk = { col: BRONZE, metal: 0.9, gloss: 0.4, k: 0.014 }, O = (a, b) => Object.assign({}, a, b);
    S.color(BRASS);
    // thorax: hub for the legs, the wings and the pendulum. An escapement ring with a ruby on each side.
    S.ell('body', [0, 0.86, 0], [0.26, 0.19, 0.2], M);
    S.box('body', [-0.04, 1.0, 0], [0.17, 0.055, 0.13], 0.04, Dk);
    S.box('body', [0.04, 0.7, 0], [0.08, 0.05, 0.07], 0.03, Dk);
    S.tor('body', [0.0, 0.87, 0.185], 0.1, 0.034, O(Dk, { m: 1, rot: [90, 0, 0] }));
    S.ell('body', [0.0, 0.87, 0.2], [0.07, 0.07, 0.04], { m: 1, col: RUBY, glow: 2.2, k: 0.01 });
    S.ell('body', [0.07, 0.8, 0.16], 0.075, O(Dk, { m: 1 }));
    S.ell('body', [-0.14, 0.8, 0.16], 0.075, O(Dk, { m: 1 }));
    // abdomen: 5 brass shells with bronze bands
    const segs = [['abd1', -0.3, 0.855, 0.21, 0.2], ['abd1', -0.49, 0.84, 0.2, 0.215], ['abd2', -0.68, 0.81, 0.19, 0.19], ['abd3', -0.86, 0.775, 0.165, 0.155], ['abd3', -1.01, 0.745, 0.125, 0.11]];
    segs.forEach(([bn, x, y, rx, r], i) => S.ell(bn, [x, y, 0], [rx, r, r], { col: i % 2 ? PALE : BRASS, metal: 1, gloss: 0.55, k: 0.016 }));
    S.cap('abd3', [-1.08, 0.73, 0], [-1.2, 0.72, 0], 0.06, 0.035, Dk);
    for (const [bn, x, y, r] of [['abd1', -0.395, 0.848, 0.19], ['abd2', -0.585, 0.825, 0.19], ['abd3', -0.775, 0.792, 0.16], ['abd3', -0.94, 0.758, 0.12]])
      S.tor(bn, [x, y, 0], r, 0.027, O(Dk, { rot: [0, 0, 90] }));
    S.box('abd1', [-0.4, 1.04, 0], [0.13, 0.03, 0.05], 0.025, Dk);
    // prothorax: a tall instrument column with 3 collars and a clock dial
    S.cap('pro', [0.16, 0.95, 0], [0.44, 1.5, 0], 0.12, 0.085, M);
    for (const [f, R] of [[0.1, 0.125], [0.86, 0.1]]) S.tor('pro', [0.16 + 0.28 * f, 0.95 + 0.55 * f, 0], R, 0.03, O(Dk, { rot: [0, 0, -27] }));
    S.ell('pro', [0.43, 1.43, 0], [0.1, 0.1, 0.2], M);
    S.ell('pro', [0.375, 1.19, 0], [0.045, 0.115, 0.115], { rot: [0, 0, -27], col: '#ffe2a0', glow: 1.4, k: 0.012 });
    S.tor('pro', [0.392, 1.181, 0], 0.11, 0.03, O(Dk, { rot: [0, 0, -117] }));
    S.box('pro', [0.2, 1.24, 0], [0.04, 0.2, 0.05], 0.03, O(Dk, { rot: [0, 0, -27] }));
    // head: wide triangle, the mouth at the lower point
    S.ell('head', [0.55, 1.66, 0], [0.125, 0.1, 0.21], M);
    S.cap('head', [0.6, 1.63, 0], [0.69, 1.46, 0], 0.095, 0.04, M);
    S.ell('head', [0.49, 1.72, 0], [0.1, 0.06, 0.1], Dk);
    S.ell('head', [0.672, 1.6, 0], [0.03, 0.045, 0.03], { col: RUBY, glow: 2.4, k: 0.01 });
    // raptor arms: upper arm with a collar, bronze elbow ball
    S.cap('armL', [0.43, 1.41, 0.17], [0.8, 1.5, 0.25], 0.07, 0.058, O(M, { m: 1 }));
    S.tor('armL', [0.6, 1.452, 0.207], 0.066, 0.026, O(Dk, { m: 1, rot: [0, 0, -76] }));
    S.ell('scyL', [0.8, 1.5, 0.25], 0.088, O(Dk, { m: 1 }));
    // --- paint: verdigris, rivets, glowing portholes
    const PV = { paint: 1, col: VERD, op: 0.75, cb: 0.035, metal: 0.05, gloss: 0.05 };
    S.ell('abd1', [-0.45, 0.66, 0], [0.34, 0.08, 0.2], PV);
    S.ell('abd3', [-0.95, 0.68, 0], [0.2, 0.06, 0.14], PV);
    S.ell('body', [0.0, 0.7, 0], [0.22, 0.06, 0.2], PV);
    S.ell('pro', [0.14, 1.08, 0], [0.08, 0.16, 0.14], O(PV, { rot: [0, 0, -27] }));
    S.ell('abd2', [-0.66, 0.98, 0.08], [0.1, 0.05, 0.08], O(PV, { m: 1, op: 0.55 }));
    S.ell('head', [0.5, 1.6, 0.17], [0.07, 0.05, 0.07], O(PV, { m: 1, op: 0.55 }));
    S.ell('armL', [0.5, 1.37, 0.19], [0.08, 0.04, 0.07], O(PV, { m: 1, op: 0.6 }));
    segs.slice(0, 4).forEach(([bn, x, y], i) => S.cap(bn, [x, y + 0.03, -0.3], [x, y + 0.03, 0.3], 0.042 - i * 0.004, 0.042 - i * 0.004, { paint: 1, col: TEAL, glow: 2.4, cb: 0.01 }));
    for (const f of [0.3, 0.72]) S.cap('pro', [0.16 + 0.28 * f - 0.3, 0.95 + 0.55 * f + 0.153, 0.065], [0.16 + 0.28 * f + 0.3, 0.95 + 0.55 * f - 0.153, 0.065], 0.02, 0.02, { paint: 1, col: '#2c2318', cb: 0.008, m: 1 });

    // --- wings: 4 leaded glass panels in brass frames --------------------------------
    if (!texA) { texA = glassTex(['#d8263a', '#f09a1e', '#f4d23a', '#8a3ad0', '#e85aa0', '#3a78e0']); texB = glassTex(['#1fa8a0', '#2a6ae0', '#38c05a', '#7a48d8', '#f0c83a', '#28c8e8']); }
    const GLA = { map: texA, emap: texA, glow: '#ffffff', glowK: 0.5, col: '#ffffff', rough: 0.16, env: 1.3, noOut: true };
    const GLB = { map: texB, emap: texB, glow: '#ffffff', glowK: 0.5, col: '#ffffff', rough: 0.16, env: 1.3, noOut: true };
    const wingSet = (bone, p, out, span, chord, mat, name) => {
      const loop = out.concat([out[0], out[1]]).map(q => [q[1], 0, q[0]]);
      S.add(bone, panel(wing(out, 0.02, { smooth: false, bevel: 0.004 }), span, chord), mat, { p, m: 1, name });
      S.add(bone, panel(tube(loop, loop.map(() => 0.015), { ring: 6, seg: 44 }), span, chord), BRASSM, { p, m: 1 });
    };
    wingSet('wingL', [-0.06, 1.05, 0.1], [[0, -0.03], [0.25, -0.09], [0.62, -0.1], [0.92, -0.04], [1.04, 0.09], [0.94, 0.25], [0.62, 0.33], [0.3, 0.27], [0.07, 0.11]], [-0.86, 0.38, 0.34], [0.45, 0.72, 0.5], GLA, 'glaL');
    wingSet('wing2L', [-0.15, 1.02, 0.12], [[0, -0.02], [0.2, -0.1], [0.5, -0.14], [0.76, -0.08], [0.84, 0.05], [0.72, 0.19], [0.44, 0.23], [0.16, 0.16], [0.03, 0.06]], [-0.8, 0.1, 0.6], [0.3, 0.45, 0.8], GLB, 'glbL');

    // --- scythes: an astrolabe limb on two spokes, steel edge on the outside ---------------
    const A0 = 20, A1 = -112, N = 16, RO = 0.52, out = [];
    for (let i = 0; i <= N; i++) { const q = (A0 + (A1 - A0) * i / N) * D2R; out.push([Math.cos(q) * RO, Math.sin(q) * RO]); }
    for (let i = N - 1; i >= 0; i--) { const q = (A0 + (A1 - A0) * i / N) * D2R, r = RO - 0.125 * Math.pow(1 - i / N, 0.75); out.push([Math.cos(q) * r, Math.sin(q) * r]); }
    const studs = [8, -14, -36, -58].map(d => at(ball(0.02, 8, 6), [Math.cos(d * D2R) * 0.465, Math.sin(d * D2R) * 0.465, 0.016])).concat([8, -14, -36, -58].map(d => at(ball(0.02, 8, 6), [Math.cos(d * D2R) * 0.465, Math.sin(d * D2R) * 0.465, -0.016])));
    const limb = join([blade(out, 0.032, { bevel: 0.011 }), at(ball(0.055, 12, 8), [0, 0, 0.07]), at(ball(0.045, 12, 8), [0, 0, -0.07])].concat(studs));
    const edge = torus(RO + 0.006, 0.012, 30, 6, (A0 - A1) * D2R); edge.rotateZ(A1 * D2R);
    const scale = torus(0.3, 0.014, 18, 6, 84 * D2R); scale.rotateZ(-62 * D2R);
    const sp = d => tube([[0, 0, 0], [Math.cos(d * D2R) * 0.24, Math.sin(d * D2R) * 0.24, 0], [Math.cos(d * D2R) * 0.45, Math.sin(d * D2R) * 0.45, 0]], [0.034, 0.026, 0.022], { ring: 7 });
    const frame = join([scale, sp(14), sp(-40)]);
    const E = [0.8, 1.5, 0.25];
    S.add('scyL', limb, GOLDM, { p: E, r: [0, -8, 0], m: 1 });
    S.add('scyL', edge, STEEL, { p: E, r: [0, -8, 0], m: 1 });
    S.add('scyL', frame, BRONZM, { p: E, r: [0, -8, 0], m: 1 });
    // spines under the upper arm
    const spine = aim(cone(0.022, 0.1, 6), [0.25, -1, 0]);
    S.add('armL', join([spine, at(spine, [0.1, 0.024, 0.022]), at(spine, [0.2, 0.048, 0.044])]), BRONZM, { p: [0.5, 1.365, 0.19], m: 1 });

    // --- walking legs: bronze tubes with brass knees ------------------------------------
    const legM = [[0, 0, 0], [0.1, 0.16, 0.2], [0.2, 0.2, 0.36], [0.3, -0.3, 0.46], [0.36, -0.745, 0.5]];
    const legH = [[0, 0, 0], [-0.14, 0.2, 0.18], [-0.3, 0.26, 0.33], [-0.5, -0.3, 0.42], [-0.62, -0.745, 0.46]];
    const rr = [0.046, 0.042, 0.04, 0.03, 0.022];
    const foot = (q, fx) => [at(ball(0.036, 8, 6), [q[0], q[1] - 0.015, q[2]]), at(aim(cone(0.024, 0.11, 6), [fx, -0.12, 0.25]), [q[0], q[1] - 0.02, q[2]]), at(aim(cone(0.02, 0.08, 6), [-fx * 0.6, -0.12, -0.4]), [q[0], q[1] - 0.02, q[2]])];
    S.add('legML', join([tube(legM, rr, { ring: 7 })].concat(foot(legM[4], 1))), BRONZM, { p: [0.07, 0.8, 0.15], m: 1 });
    S.add('legHL', join([tube(legH, rr, { ring: 7 })].concat(foot(legH[4], -1))), BRONZM, { p: [-0.14, 0.8, 0.15], m: 1 });
    S.add('legML', join([at(ball(0.058, 10, 8), legM[2]), at(ball(0.04, 8, 6), legM[3])]), BRASSM, { p: [0.07, 0.8, 0.15], m: 1 });
    S.add('legHL', join([at(ball(0.058, 10, 8), legH[2]), at(ball(0.04, 8, 6), legH[3])]), BRASSM, { p: [-0.14, 0.8, 0.15], m: 1 });

    // --- pendulum: steel rod, brass lens bob with a glowing centre ---------------------------
    const bob = lathe([[0, -0.046], [0.11, -0.038], [0.175, -0.012], [0.182, 0], [0.175, 0.012], [0.11, 0.038], [0, 0.046]], 28); bob.rotateX(Math.PI / 2);
    const nut = lathe([[0, -0.03], [0.05, -0.03], [0.05, 0.03], [0, 0.03]], 8);
    S.add('pend', join([tube([[0, 0, 0], [0, -0.2, 0], [0, -0.4, 0]], [0.017, 0.017, 0.017], { ring: 6 }), at(nut, [0, -0.15, 0])]), STEEL, { p: [0.04, 0.67, 0] });
    S.add('pend', join([at(bob, [0, -0.36, 0]), at(aim(cone(0.035, 0.075, 8), [0, -1, 0]), [0, -0.535, 0]), at(torus(0.14, 0.012, 24, 6), [0, -0.36, 0.03]), at(torus(0.14, 0.012, 24, 6), [0, -0.36, -0.03]), ball(0.045, 10, 8)]), BRASSM, { p: [0.04, 0.67, 0] });
    S.add('pend', ball(0.068, 12, 10), GEM, { p: [0.04, 0.31, 0], name: 'bobGem' });

    // --- head parts: antennas, mandibles, coronet. Clock hands on the dial. -----------------
    const ant = join([tube([[0, 0, 0], [-0.04, 0.18, 0.04], [-0.16, 0.36, 0.1], [-0.34, 0.46, 0.17]], [0.014, 0.012, 0.01, 0.008], { ring: 5 }), at(ball(0.024, 8, 6), [-0.34, 0.46, 0.17])]);
    S.add('head', ant, BRONZM, { p: [0.51, 1.75, 0.07], m: 1, name: 'antL' });
    S.add('head', aim(cone(0.022, 0.1, 6), [0.3, -1, -0.25]), BRONZM, { p: [0.7, 1.45, 0.035], m: 1 });
    const crown = [[0, 0, 0, 0.13], [-0.03, -0.01, 0.07, 0.09], [-0.03, -0.01, -0.07, 0.09]].map(([x, y, z, hh]) => at(aim(cone(0.026, hh, 6), [-0.25, 1, z * 3]), [x, y, z]));
    S.add('head', join(crown), GOLDM, { p: [0.5, 1.765, 0] });
    const hand = (len) => at(rbox(0.014, len, 0.02), [0, len / 2 - 0.01, 0]);
    S.add('pro', hand(0.1), HAND, { p: [0.42, 1.167, 0], r: [0, 0, -27], order: 'ZYX', name: 'h0' });
    S.add('pro', hand(0.065), HAND, { p: [0.424, 1.165, 0], r: [0, 0, -27], order: 'ZYX', name: 'h1' });
    // high collar behind the head: 5 gold fins. A monocle with a chain on the left eye.
    const fins = [];
    for (const deg of [-75, -38, 0, 38, 75]) {
      const q = deg * D2R, rad = [-0.891 * Math.cos(q), 0.454 * Math.cos(q), Math.sin(q)];
      const d = new THREE.Vector3(0.454 + rad[0] * 0.75, 0.891 + rad[1] * 0.75, rad[2] * 0.75).normalize(), zv = new THREE.Vector3(rad[0], rad[1], rad[2]);
      zv.addScaledVector(d, -zv.dot(d)).normalize();
      const fin = blade([[-0.05, 0], [0.05, 0], [0.032, 0.16], [0, 0.26 - Math.abs(deg) * 0.0009], [-0.032, 0.16]], 0.016, { bevel: 0.005 });
      fin.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(d, zv), d, zv));
      fins.push(at(fin, [rad[0] * 0.1, rad[1] * 0.1, rad[2] * 0.13]));
    }
    S.add('pro', join(fins), GOLDM, { p: [0.42, 1.45, 0] });
    const mono = torus(0.078, 0.011, 22, 6);
    mono.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.6, 0.2, 0.78).normalize()));
    S.add('head', join([mono, tube([[0.01, -0.078, -0.01], [-0.05, -0.2, 0.0], [-0.15, -0.27, -0.04], [-0.22, -0.23, -0.08]], [0.007, 0.007, 0.007, 0.007], { ring: 5 })]), BRASSM, { p: [0.665, 1.722, 0.25] });
    // cerci at the end of the abdomen
    S.add('abd3', tube([[0, 0, 0], [-0.1, 0.02, 0.04], [-0.2, 0.08, 0.1]], [0.018, 0.012, 0.005], { ring: 5 }), BRONZM, { p: [-1.2, 0.72, 0.02], m: 1 });
    S.eye('head', [0.6, 1.7, 0.165], 0.1, { dir: [0.6, 0.2, 0.78], sclera: '#0c2a2a', iris: '#2fd8b8', iris2: '#d8fff2', pupil: 'round', size: 58, lid: BRASS, open: 64, glow: 1.2, m: 1 });
  },
  anim(b, t, c) {
    const P = c.parts, br = Math.sin(t.p), a = t.a, s = t.s, h = t.h, k = t.k, melee = k === 'melee', slam = k === 'slam', buff = k === 'buff';
    const w = t.w * 1.4, gait = Math.abs(Math.sin(w)) * t.mv;
    // body: low crouch before the slash, tall before the pendulum kick
    const drop = a * (slam ? -0.07 : 0.045) + (slam ? s * 0.03 : 0) + h * 0.02 - gait * 0.02 - br * 0.01;
    b.body.position.y -= drop;
    b.body.position.x += (melee ? s * 0.16 - a * 0.08 : slam ? s * 0.18 - a * 0.1 : -a * 0.04) - h * 0.05;
    b.body.rotation.z = -t.sw * 0.04 + h * 0.06 + (slam ? a * 0.03 + s * 0.06 : melee ? a * 0.03 - s * 0.05 : 0);
    b.body.rotation.x = t.sl * 0.08 + Math.sin(w) * 0.03 * t.mv;
    // 4 legs: diagonal pairs. The hips turn to keep the feet on the ground when the body height changes.
    for (const [n, ph, sg] of [['legML', 0, 1], ['legMR', Math.PI, -1], ['legHL', Math.PI, 1], ['legHR', 0, -1]]) {
      const q = w + ph;
      b[n].rotation.y = sg * Math.sin(q) * 0.36 * t.mv;
      b[n].rotation.x = -sg * (Math.max(0, Math.cos(q)) * 0.2 * t.mv + drop * 1.8);
    }
    // prothorax and head
    b.pro.rotation.z = br * 0.025 + t.sw * 0.06 + h * 0.3 + (melee ? a * 0.26 - s * 0.45 : slam ? -a * 0.2 + s * 0.3 : buff ? a * 0.12 + s * 0.05 : a * 0.15 - s * 0.25);
    b.pro.rotation.x = t.sl * 0.1;
    b.head.rotation.z = -br * 0.03 - h * 0.25 + (melee ? -a * 0.2 + s * 0.25 : 0);
    b.head.rotation.y = t.lk * 0.5;
    b.head.rotation.x = Math.sin(t.p * 0.5) * 0.14 * (1 - a) + t.sl * 0.1;
    // scythes: both rise in the wind-up. Twin slash: the left blade falls first, the right blade follows.
    const sL = s, sR = melee ? Math.sin(Math.min(1, (1 - s) * 1.7) * Math.PI) * (s > 0 ? 1 : 0) : s, hold = melee ? s * 0.5 : 0;
    const idle = Math.sin(t.p * 0.8) * 0.04, up = melee ? 0.8 : buff ? 0.25 : slam ? 0.45 : 0.55, dn = melee ? 0.75 : 0.45;
    b.armL.rotation.z = idle + a * up - sL * dn - h * 0.3; b.armR.rotation.z = -idle + a * up + hold - sR * (dn + hold) - h * 0.3;
    if (slam) { b.armL.rotation.z += s * 1.0; b.armR.rotation.z += s * 1.0; b.armL.rotation.y -= s * 0.5; b.armR.rotation.y += s * 0.5; }
    b.armL.rotation.y = sL * 0.4 - a * 0.25 + (buff ? (a + s) * 0.45 : 0); b.armR.rotation.y = -(sR * 0.4 - a * 0.25 + (buff ? (a + s) * 0.45 : 0));
    const cut = slam ? -0.6 : 1.1;
    b.scyL.rotation.z = idle * 2 + a * 0.9 - sL * cut + h * 0.35; b.scyR.rotation.z = -idle * 2 + a * 0.9 + hold - sR * (cut + hold) + h * 0.35;
    // glass wings: slow fan, wide spread for the guard
    const fan = Math.sin(t.p * 0.9) * 0.05 + t.gl * 0.1 * Math.sin(t.tm * 9) + h * 0.2 * Math.sin(t.tm * 30);
    const spread = (buff ? a * 0.6 + s * 0.55 : a * 0.16 + s * 0.3) + h * 0.2 + gait * 0.05 + t.gl * 0.12;
    b.wingL.rotation.y = fan + spread * 0.9; b.wingR.rotation.y = -b.wingL.rotation.y;
    b.wingL.rotation.x = spread * 0.55; b.wingR.rotation.x = -b.wingL.rotation.x;
    b.wingL.rotation.z = b.wingR.rotation.z = -a * 0.22 + t.sw * 0.12 - (buff ? s * 0.25 : 0);
    b.wing2L.rotation.y = fan * 1.4 + spread * 1.25; b.wing2R.rotation.y = -b.wing2L.rotation.y;
    b.wing2L.rotation.x = spread * 0.4; b.wing2R.rotation.x = -b.wing2L.rotation.x;
    b.wing2L.rotation.z = b.wing2R.rotation.z = -a * 0.3 + t.sw * 0.15 - (buff ? s * 0.3 : 0);
    b.wingL.rotation.y += t.sl * 0.25; b.wingR.rotation.y += t.sl * 0.25; b.wing2L.rotation.y += t.sl * 0.3; b.wing2R.rotation.y += t.sl * 0.3;
    // abdomen: breath wave, curl up when it threatens
    const curl = -br * 0.03 - a * 0.13 + s * 0.1 + t.sw * 0.06 - h * 0.12;
    ['abd1', 'abd2', 'abd3'].forEach((n, i) => { b[n].rotation.z = curl * (i ? 1 : 0.6); b[n].rotation.y = Math.sin(t.p * 0.9 - i * 0.7) * 0.05 + Math.sin(w - i * 0.8) * 0.06 * t.mv + t.sl * 0.2; });
    // pendulum: steady swing. It lags behind the motion. The kick pulls it far back, then throws it forward.
    let sw = Math.sin(t.p * 1.6) * (0.3 + t.gl * 0.25) * (1 - a * 0.8) - t.sw * 0.7 + h * 0.5 * Math.sin(t.tm * 21);
    if (slam) { sw += -a * 1.2 + s * 2.3; b.pend.scale.setScalar(1 + s * 0.5 + a * 0.1); } else sw += a * 0.25 * Math.sin(t.tm * 15) - s * 0.5;
    b.pend.rotation.z = sw; b.pend.rotation.x = t.sl * 0.5;
    P.bobGem.scale.setScalar(1 + 0.08 * Math.sin(t.tm * 6) + a * 0.35 + t.gl * 0.3 + (slam ? s * 0.6 : 0));
    // clock hands, antennas
    P.h0.rotation.x = t.tm * 2.4 + a * 9 + s * 5; P.h1.rotation.x = -t.tm * 0.5 - a * 2;
    const an = Math.sin(t.p * 1.3) * 0.1 + t.sw * 0.3 + a * 0.25 - h * 0.3;
    P.antL.rotation.z += an; P.antR.rotation.z += Math.sin(t.p * 1.3 + 1) * 0.1 + t.sw * 0.3 + a * 0.25 - h * 0.3;
    P.antL.rotation.x += Math.sin(t.p * 0.7) * 0.08 + t.sl * 0.3; P.antR.rotation.x += -Math.sin(t.p * 0.7) * 0.08 + t.sl * 0.3;
  }
};
