/* Compasshawk - brass bird of prey. Compass-needle wings, 3 astrolabe rings around the chest, a lodestone core in an open rib cage. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube, blade, wing, lathe, crystal, ball, cone, rbox } from '../geo.js';

const BRASS = '#b08a38', PALE = '#d6b660', GOLD = '#e8c256', BRONZE = '#43341f', RED = '#c4201c', VIO = '#8a6cff';
const GOLDM = { col: '#e8c462', metal: 1, rough: 0.22, env: 1.4 };
const BRASSM = { col: '#c9a348', metal: 1, rough: 0.28, env: 1.2, flat: true };
const ENAMEL = { col: '#c8201c', metal: 0.2, rough: 0.16, env: 1.3, glow: '#ff2a18', glowK: 0.22, flat: true };
const BLUED = { col: '#2b3970', metal: 1, rough: 0.24, env: 1.4, flat: true };
const DARK = { col: '#1d1a24', metal: 0.6, rough: 0.3, env: 1.0 };
const CORE = { col: '#cbbcff', glow: '#6f4dff', glowK: 2.8, rough: 0.2, flat: true, noOut: true };
const HALO = { col: '#7a5cff', add: true, op: 0.22, noOut: true };
const JEWEL = { col: '#e0d6ff', glow: '#8a6cff', glowK: 3, noOut: true };

const D2R = Math.PI / 180, TAU = Math.PI * 2;
const C = [0, 0.9, 0];                                          // lodestone core = centre of the rings
const SH = [0.27, 1.0, 0.17];                                   // shoulder
const NA = [0.28, 1.0, 0.24], NY = -12, NL = 1.1, NW = 0.085;   // wing needle: root, yaw (degrees), length, half width
const ND = [Math.sin(NY * D2R), Math.cos(NY * D2R)];            // needle direction [x, z]
const along = d => [NA[0] + ND[0] * d, NA[1], NA[2] + ND[1] * d];
const NM = along(NL / 2);                                       // pivot of the needle = wing joint
// needle feathers: distance of the root along the needle, yaw (degrees), length, half width, bone
const FEATHERS = [[0.26, -70, 0.46, 0.05, 'wingL'], [0.44, -62, 0.54, 0.052, 'wingL'], [0.64, -52, 0.52, 0.048, 'tipL'], [0.82, -40, 0.42, 0.042, 'tipL']];
// rings: radius, tilt of the axis (degrees), speed, phase, number of marks
const RINGS = [[0.405, 13, 1.0, 0, 24], [0.345, -20, -1.45, 2.1, 18], [0.285, 28, 2.1, 4.2, 12]];
const RT = 0.015, RW = 0.034;                                   // ring band: half thickness, half width

const join = list => mergeGeometries(list.map(g => { const q = g.index ? g.toNonIndexed() : g.clone(); q.deleteAttribute('uv'); if (!q.getAttribute('normal')) q.computeVertexNormals(); return q; }));
const at = (g, p) => g.clone().translate(p[0], p[1], p[2]);
// flat diamond needle from the origin to +Z. u = the widest place.
const needle = (len, w, u, d) => wing([[0, 0], [len * u, w], [len, 0], [len * u, -w]], d, { smooth: false, bevel: d * 0.4 });
// the 2 halves of a compass needle: point at the origin / point at the far end
const halfIn = (len, w, d) => wing([[0, 0], [len, w], [len, -w]], d, { smooth: false, bevel: d * 0.4 });
const halfOut = (len, w, d) => wing([[0, w], [len, 0], [0, -w]], d, { smooth: false, bevel: d * 0.4 });
const boss = k => lathe([[0, -0.042 * k], [0.036 * k, -0.037 * k], [0.062 * k, -0.02 * k], [0.066 * k, 0], [0.062 * k, 0.02 * k], [0.036 * k, 0.037 * k], [0, 0.042 * k]], 16);
// astrolabe ring around the X axis: a gold band with studs, and a scale of marks with a pointer
function ringGeo(R, n) {
  const band = lathe([[R - RT, -RW], [R + RT, -RW * 0.55], [R + RT, RW * 0.55], [R - RT, RW], [R - RT, -RW]], 56);
  band.rotateZ(-Math.PI / 2);
  const gold = [band], marks = [];
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) { const g = ball(0.02, 8, 6); g.translate(sx * RW * 0.8, R, 0); g.rotateX((i + 0.5) * TAU / 4); gold.push(g); }
  for (let i = 0; i < n; i++) {
    const big = i % 3 === 0, g = rbox(big ? RW * 1.5 : RW * 0.8, 0.014, big ? 0.02 : 0.013);
    g.translate(0, R + RT, 0); g.rotateX((i + 0.5) * TAU / n); marks.push(g);
  }
  const north = cone(0.034, 0.085, 4); north.translate(0, R + RT - 0.006, 0); marks.push(north);
  const south = ball(0.027, 8, 6); south.translate(0, -(R + RT + 0.01), 0); marks.push(south);
  return [join(gold), join(marks)];
}
const ease = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();

export default {
  id: 'compasshawk', rim: '#ffe2a0', focus: 'core', top: 1.5, rough: 0.38,
  opts: { cell: 0.024, mottle: 0.05, mottleF: 14 },
  build(S) {
    S.bone('root', null, [0, 0, 0]).bone('body', 'root', C)
      .bone('ring1', 'body', C).bone('ring2', 'body', C).bone('ring3', 'body', C)
      .bone('neck', 'body', [0.36, 1.0, 0]).bone('head', 'neck', [0.5, 1.2, 0])
      .bone('wingL', 'body', SH, { m: 1 }).bone('tipL', 'wingL', NM, { m: 1 })
      .bone('tail', 'body', [-0.42, 0.9, 0]).bone('legL', 'body', [-0.24, 0.8, 0.09], { m: 1 });

    const M = { metal: 1, gloss: 0.55, k: 0.02 }, Dk = { col: BRONZE, metal: 0.9, gloss: 0.4, k: 0.014 }, G = { col: GOLD, metal: 1, gloss: 0.7, k: 0.012 };
    const O = (a, b) => Object.assign({}, a, b);
    S.color(BRASS);
    // --- body: breast and hips with an open cage between them. Only the spine and the keel cross the ring zone (|x| < 0.17).
    S.ell('body', [0.28, 0.9, 0], [0.17, 0.19, 0.17], M);
    S.ell('body', [0.33, 0.84, 0], [0.13, 0.14, 0.13], O(M, { col: PALE }));
    S.ell('body', [0.41, 0.8, 0.07], [0.05, 0.045, 0.05], O(M, { col: PALE, k: 0.012, m: 1 }));
    S.ell('body', [0.35, 0.735, 0.06], [0.05, 0.04, 0.05], O(M, { k: 0.012, m: 1 }));
    S.cap('body', [0.2, 0.74, 0], [0.42, 0.86, 0], 0.04, 0.05, Dk);
    S.ell('body', [-0.28, 0.9, 0], [0.17, 0.15, 0.14], M);
    S.ell('body', [-0.3, 0.95, 0], [0.12, 0.09, 0.11], O(M, { col: PALE }));
    S.cap('body', [-0.3, 1.05, 0], [0.3, 1.07, 0], 0.04, 0.04, Dk);
    S.cap('body', [-0.3, 0.75, 0], [0.24, 0.73, 0], 0.04, 0.04, Dk);
    // gold sockets that hold the core, tail collar
    S.tor('body', [0.13, 0.9, 0], 0.085, 0.028, O(G, { rot: [0, 0, 90] }));
    S.tor('body', [-0.13, 0.9, 0], 0.07, 0.026, O(G, { rot: [0, 0, 90] }));
    S.tor('body', [-0.41, 0.9, 0], 0.092, 0.028, O(G, { rot: [0, 0, 90] }));
    // --- neck and head
    S.cap('neck', [0.36, 0.99, 0], [0.5, 1.2, 0], 0.115, 0.095, M);
    S.ell('neck', [0.37, 1.12, 0], [0.08, 0.07, 0.09], O(M, { col: PALE }));
    S.tor('neck', [0.4, 1.05, 0], 0.118, 0.03, O(G, { rot: [0, 0, -36] }));
    S.ell('head', [0.56, 1.25, 0], [0.15, 0.115, 0.12], M);
    S.ell('head', [0.5, 1.3, 0], [0.11, 0.07, 0.09], O(M, { col: PALE }));
    S.box('head', [0.625, 1.318, 0.082], [0.085, 0.024, 0.045], 0.02, O(Dk, { m: 1, rot: [0, 0, -16] }));   // angry brow
    S.ell('head', [0.69, 1.235, 0], [0.06, 0.05, 0.055], G);                                                // cere
    S.ell('head', [0.55, 1.2, 0.105], 0.03, O(G, { m: 1 }));
    // --- wings: shoulder ball, short arm with a band. The needles are rigid parts.
    S.ell('wingL', SH, [0.075, 0.065, 0.075], O(G, { m: 1 }));
    S.cap('wingL', [0.272, 1.0, 0.2], [0.248, 1.0, 0.4], 0.05, 0.034, O(M, { m: 1 }));
    S.tor('wingL', [0.26, 1.0, 0.3], 0.046, 0.022, O(Dk, { m: 1, rot: [90, 0, 0] }));
    // --- tail root, thighs
    S.cap('tail', [-0.42, 0.9, 0], [-0.56, 0.9, 0], 0.08, 0.045, Dk);
    S.cap('legL', [-0.24, 0.8, 0.09], [-0.36, 0.71, 0.1], 0.07, 0.048, O(M, { m: 1 }));
    S.ell('legL', [-0.375, 0.7, 0.1], 0.052, O(G, { m: 1 }));
    // --- paint: glow in the sockets and seams, red enamel on the breast, scale marks on the spine, falcon stripe
    const glow = { paint: 1, col: VIO, glow: 2.2, cb: 0.012 };
    S.ell('body', [0.112, 0.9, 0], [0.03, 0.07, 0.07], glow);
    S.ell('body', [-0.112, 0.9, 0], [0.03, 0.055, 0.055], glow);
    S.cap('body', [0.2, 0.94, 0.16], [0.4, 0.97, 0.11], 0.016, 0.016, O(glow, { m: 1 }));
    S.cap('body', [-0.2, 0.92, 0.135], [-0.38, 0.92, 0.09], 0.015, 0.015, O(glow, { m: 1 }));
    S.ell('wingL', [0.255, 1.0, 0.37], [0.06, 0.06, 0.016], O(glow, { m: 1 }));
    S.ell('body', [0.45, 0.88, 0], [0.05, 0.1, 0.045], { paint: 1, col: RED, gloss: 0.9, metal: 0.1, cb: 0.01 });
    for (const x of [-0.2, -0.1, 0, 0.1, 0.2]) S.ell('body', [x, 1.09, 0], [0.011, 0.03, 0.06], { paint: 1, col: GOLD, metal: 1, gloss: 0.7, cb: 0.008 });
    for (const x of [-0.15, 0, 0.15]) S.ell('body', [x, 0.71, 0], [0.011, 0.03, 0.06], { paint: 1, col: GOLD, metal: 1, gloss: 0.7, cb: 0.008 });
    S.cap('head', [0.625, 1.25, 0.1], [0.585, 1.15, 0.09], 0.026, 0.02, { paint: 1, col: BRONZE, cb: 0.012, m: 1 });
    S.ell('head', [0.47, 1.36, 0], [0.09, 0.03, 0.03], { paint: 1, col: RED, gloss: 0.9, cb: 0.01 });

    // --- astrolabe rings: each ring on its own bone
    RINGS.forEach(([R, , , , n], i) => {
      const [gold, marks] = ringGeo(R, n);
      S.add('ring' + (i + 1), gold, GOLDM, { p: C });
      S.add('ring' + (i + 1), marks, i === 1 ? ENAMEL : BLUED, { p: C });
    });
    // --- lodestone core
    S.add('body', crystal(0.075, 0.115, 0.115, 6), CORE, { p: C, r: [0, 0, 16], name: 'core' });
    S.add('body', ball(0.13, 14, 10), HALO, { p: C, name: 'halo' });

    // --- wings: one compass needle for each wing (brass half on the arm, red half on the tip), 4 needle feathers behind it
    const NR = [0, NY, 0], H = NL / 2;
    S.add('wingL', halfIn(H, NW, 0.034), BRASSM, { p: NA, r: NR, order: 'YXZ', m: 1 });
    S.add('tipL', halfOut(H, NW, 0.034), ENAMEL, { p: NM, r: NR, order: 'YXZ', m: 1 });
    S.add('wingL', join([tube([[0, 0, 0.02], [0, 0, H]], [0.016, 0.024], { ring: 6, seg: 2 }), at(ball(0.024, 8, 6), [-0.02, 0, FEATHERS[0][0]]), at(ball(0.024, 8, 6), [-0.02, 0, FEATHERS[1][0]])]), GOLDM, { p: NA, r: NR, order: 'YXZ', m: 1 });
    S.add('tipL', join([tube([[0, 0, 0], [0, 0, H - 0.02]], [0.024, 0.006], { ring: 6, seg: 2 }), boss(1), at(ball(0.024, 8, 6), [-0.02, 0, FEATHERS[2][0] - H]), at(ball(0.024, 8, 6), [-0.02, 0, FEATHERS[3][0] - H])]), GOLDM, { p: NM, r: NR, order: 'YXZ', m: 1 });
    S.add('tipL', ball(0.024, 10, 8), JEWEL, { p: [NM[0], NM[1] + 0.046, NM[2]], name: 'gemL', m: 1 });
    FEATHERS.forEach(([d, yaw, len, w, bone], i) => {
      const q = along(d);
      S.add(bone, needle(len, w, 0.3, 0.024), BLUED, { p: [q[0] - ND[1] * 0.02, 0.984, q[2] + ND[0] * 0.02], r: [0, yaw, 0], order: 'YXZ', name: 'f' + i + 'L', m: 1 });
    });

    // --- tail: a long compass needle in the centre, a blue steel needle on each side
    S.add('tail', halfIn(0.31, 0.06, 0.03), BRASSM, { p: [-0.5, 0.9, 0], r: [0, -90, 0], order: 'YXZ' });
    S.add('tail', halfOut(0.31, 0.06, 0.03), ENAMEL, { p: [-0.81, 0.9, 0], r: [0, -90, 0], order: 'YXZ' });
    S.add('tail', join([tube([[-0.5, 0.9, 0], [-1.1, 0.9, 0]], [0.022, 0.006], { ring: 6, seg: 2 }), at(boss(0.75), [-0.81, 0.9, 0])]), GOLDM);
    S.add('tail', needle(0.5, 0.05, 0.35, 0.024), BLUED, { p: [-0.5, 0.893, 0.045], r: [0, -70, 0], order: 'YXZ', name: 'tfL', m: 1 });

    // --- head: hooked beak, lower jaw, crest of 3 blades
    S.add('head', tube([[-0.03, 0, 0], [0.06, 0.002, 0], [0.125, -0.03, 0], [0.147, -0.11, 0]], [0.05, 0.045, 0.03, 0.004], { ring: 8 }), DARK, { p: [0.72, 1.24, 0], s: [1, 1, 0.72] });
    S.add('head', tube([[-0.02, 0, 0], [0.05, -0.012, 0], [0.105, -0.01, 0]], [0.03, 0.026, 0.004], { ring: 7 }), DARK, { p: [0.7, 1.19, 0], s: [1, 1, 0.75], name: 'jaw' });
    S.add('head', blade([[0.02, -0.025], [-0.08, 0.035], [-0.34, 0.09], [-0.1, -0.03]], 0.024), ENAMEL, { p: [0.45, 1.335, 0], name: 'cr0' });
    S.add('head', blade([[0.02, -0.02], [-0.07, 0.03], [-0.27, 0.05], [-0.09, -0.03]], 0.02), BLUED, { p: [0.455, 1.315, 0.04], r: [0, 14, 0], name: 'crL', m: 1 });

    // --- talons: tucked back below the hips
    const claw = dz => tube([[-0.13, -0.03, dz * 0.4], [-0.185, -0.06, dz], [-0.165, -0.115, dz], [-0.11, -0.118, dz * 0.8]], [0.02, 0.018, 0.012, 0.002], { ring: 6 });
    S.add('legL', join([
      tube([[0, 0, 0], [-0.08, -0.02, 0], [-0.14, -0.03, 0]], [0.026, 0.022, 0.026], { ring: 6 }), claw(-0.04), claw(0), claw(0.04),
      tube([[-0.14, -0.03, 0], [-0.2, -0.012, 0], [-0.235, -0.05, 0]], [0.018, 0.014, 0.002], { ring: 6 })
    ]), DARK, { p: [-0.375, 0.7, 0.1], m: 1 });

    S.eye('head', [0.63, 1.265, 0.093], 0.045, { dir: [0.5, 0.05, 0.86], sclera: '#160f2e', iris: '#7a5cff', iris2: '#e6dcff', pupil: 'round', size: 50, lid: BRONZE, open: 24, tilt: -24, glow: 1.6, m: 1 });
  },
  anim(b, t, c) {
    const P = c.parts, a = t.a, s = t.s, h = t.h, k = t.k, melee = k === 'melee', shot = k === 'shot', slam = k === 'slam', buff = k === 'buff';
    // dive: wings fold. hov: ring hover. flat: the rings lie flat below the body.
    const dive = melee ? s : 0, hov = buff ? Math.min(1, a + s) : 0, flat = slam ? ease(a * 1.4 + s) : 0;
    // wing beat: slow in idle, fast when it moves
    const slow = 1 - 0.6 * t.mv, fast = 0.8 * t.mv, wp = t.p * 1.2, wt = t.tm * 9.5;
    const beat = Math.sin(wp) * slow + Math.sin(wt) * fast, beat2 = Math.sin(wp - 0.9) * slow + Math.sin(wt - 0.9) * fast;
    const amp = (0.26 + 0.12 * t.mv + 0.05 * t.gl) * (1 - dive) * (1 - 0.65 * hov) * (1 - 0.5 * flat);
    // wings. Left wing: rotation.x - = up, rotation.y - = swept back. Order YXZ: lift first, then sweep.
    let up = -0.14 - beat * amp, tipUp = 0.12 - beat2 * amp * 1.3, sweep = -t.sw * 0.2, tipSweep = -t.sw * 0.12;
    if (melee) { up += -a * 0.6 - s * 0.36; tipUp += -a * 0.25 + s * 0.06; sweep += a * 0.2 - s * 1.1; tipSweep -= s * 0.5; }               // dive strike: wings fold back
    else if (shot) { up += -a * 0.5 + s * 0.3; tipUp += -a * 0.3 + s * 0.25; sweep += -a * 0.6 + s * 0.9; tipSweep += -a * 0.35 + s * 0.6; }   // needle volley: wings snap forward
    else if (slam) { up += -a * 0.95 + s * 0.6; tipUp += -a * 0.45 + s * 0.4; sweep += a * 0.1; }                                               // magnetic pulse: wings high, then down
    else { up -= hov * 0.3; tipUp -= hov * 0.25; sweep += hov * 0.12; }                                                                         // ring hover: wide and steady
    up += h * 0.35; tipUp += h * 0.4; sweep -= h * 0.25;
    b.wingL.rotation.order = b.wingR.rotation.order = b.tipL.rotation.order = b.tipR.rotation.order = 'YXZ';
    b.wingL.rotation.x = up; b.wingR.rotation.x = -up; b.tipL.rotation.x = tipUp; b.tipR.rotation.x = -tipUp;
    b.wingL.rotation.y = sweep; b.wingR.rotation.y = -sweep; b.tipL.rotation.y = tipSweep; b.tipR.rotation.y = -tipSweep;
    // needle feathers: they follow the beat with a delay, open for the volley, fold along the needle for the dive
    for (let i = 0; i < 4; i++) {
      const lag = Math.sin(wp - 1.3 - i * 0.35) * slow + Math.sin(wt - 1.3 - i * 0.35) * fast;
      const fan = (shot ? s * 0.32 - a * 0.18 : 0) + hov * 0.16 + h * 0.2 + t.gl * 0.06 * Math.sin(t.tm * 11 + i) + dive * (NY - FEATHERS[i][1]) * D2R * 0.85 - t.sw * 0.08;
      const L = P['f' + i + 'L'], R = P['f' + i + 'R'], tw = lag * amp * 0.45;
      L.rotation.y += fan; R.rotation.y -= fan; L.rotation.x += tw; R.rotation.x -= tw;
    }
    // body: bob with the beat, pitch down for the dive, bank with the side lag
    const bob = -(Math.sin(wp - 0.6) * slow + Math.sin(wt - 0.6) * fast);
    b.body.position.y += bob * 0.03 * (1 - dive) + a * (slam ? 0.16 : melee ? 0.12 : 0.05) - s * (melee ? 0.2 : slam ? 0.12 : 0) + hov * 0.12 - h * 0.04;
    b.body.position.x += (melee ? s * 0.32 - a * 0.12 : shot ? -s * 0.1 - a * 0.04 : 0) - h * 0.08;
    b.body.rotation.z = 0.06 - t.sw * 0.16 + (melee ? a * 0.3 - s * 0.62 : shot ? a * 0.16 - s * 0.12 : slam ? a * 0.1 - s * 0.05 : hov * 0.14) + h * 0.26;
    b.body.rotation.x = t.sl * 0.4;
    // neck and head: the head stays level and looks at the target
    const nod = Math.sin(t.p * 0.6);
    b.neck.rotation.z = nod * 0.03 + t.sw * 0.08 + (melee ? -a * 0.2 + s * 0.2 : shot ? -a * 0.15 + s * 0.12 : slam ? a * 0.2 - s * 0.25 : hov * 0.1) + h * 0.2;
    b.head.rotation.z = -nod * 0.04 + t.sw * 0.08 + (melee ? -a * 0.1 + s * 0.38 : shot ? -a * 0.1 + s * 0.05 : slam ? a * 0.25 - s * 0.3 : hov * 0.12) - h * 0.35;
    b.head.rotation.y = t.lk * 0.45; b.neck.rotation.y = t.lk * 0.15 + t.sl * 0.12;
    b.head.rotation.x = Math.sin(t.p * 0.45) * 0.08 * (1 - a) - t.sl * 0.15;
    P.jaw.rotation.z -= a * 0.3 + s * (shot || slam ? 0.55 : 0.25) + h * 0.45 + t.gl * 0.08;
    // crest: - = up
    const cr = Math.sin(wp + 0.5) * 0.05 - a * 0.45 - t.gl * (0.2 + 0.06 * Math.sin(t.tm * 9)) - h * 0.35 + t.sw * 0.3 + dive * 0.25 - hov * 0.3;
    P.cr0.rotation.z += cr; P.crL.rotation.z += cr * 0.8; P.crR.rotation.z += cr * 0.8;
    // tail: it steers. The side needles open as a fan.
    b.tail.rotation.z = Math.sin(wp - 1.4) * 0.07 + t.sw * 0.16 + (melee ? -a * 0.3 + s * 0.35 : slam ? -a * 0.3 + s * 0.3 : shot ? a * 0.2 - s * 0.25 : -hov * 0.2) - h * 0.3;
    b.tail.rotation.y = t.sl * 0.35 + Math.sin(t.p * 0.6) * 0.04;
    b.tail.rotation.x = -t.sl * 0.25;
    const tf = beat * 0.05 + hov * 0.3 + (slam ? a * 0.3 : shot ? s * 0.35 : 0) + h * 0.25 - dive * 0.3 + t.gl * 0.08;
    P.tfL.rotation.y += tf; P.tfR.rotation.y -= tf;
    // talons: tucked. They reach down and forward in the dive.
    const grab = melee ? s * 1.0 - a * 0.15 : slam ? a * 0.35 + s * 0.2 : 0;
    b.legL.rotation.z = Math.sin(wp) * 0.04 - t.sw * 0.2 + grab + h * 0.3; b.legR.rotation.z = -Math.sin(wp) * 0.04 - t.sw * 0.2 + grab * 0.92 + h * 0.25;
    // rings: each axis leans away from the body axis and turns around it. Slam: all rings lie flat below the body, then grow as a wave.
    for (let i = 0; i < 3; i++) {
      const r = RINGS[i], bn = b['ring' + (i + 1)], sp = r[2];
      const tilt = r[1] * D2R * (1 + 0.25 * hov) * (1 - 0.8 * dive) + Math.sin(t.tm * 31 + i * 2) * 0.22 * h + Math.sin(t.tm * 6 + i * 2.1) * 0.08 * t.gl;
      _e.set(t.o * sp + r[3] + hov * 2.2 * (sp > 0 ? 1 : -1), 0, tilt, 'XYZ'); _q.setFromEuler(_e);
      if (flat > 0) { _e.set(0, t.o * sp * 0.6 + r[3], Math.PI / 2, 'XYZ'); _q2.setFromEuler(_e); _q.slerp(_q2, flat); }
      bn.quaternion.copy(_q);
      bn.position.y -= flat * 0.36;
      bn.scale.setScalar(1 + (slam ? s * (0.45 + 0.22 * i) : 0) + hov * 0.1 - dive * 0.15 + t.gl * 0.04 * Math.sin(t.tm * 8 + i * 2));
    }
    // core: slow pulse, flare for the magnetic pulse
    const pulse = 0.5 + 0.5 * Math.sin(t.p * 2.4);
    const flare = a * 0.35 + (slam ? s * 1.1 : s * 0.3) + t.gl * (0.25 + 0.1 * Math.sin(t.tm * 8)) + hov * 0.3 - h * 0.25;
    P.core.scale.setScalar(Math.max(0.6, Math.min(1.75, 1 + pulse * 0.1 + flare * 0.6)));
    P.core.rotation.y = t.tm * 0.9 + a * 3;
    P.halo.scale.setScalar(1 + pulse * 0.15 + Math.max(0, flare) * 1.5);
    const gem = 1 + pulse * 0.2 + a * 0.5 + t.gl * 0.3 + (shot ? s * 0.6 : 0);
    P.gemL.scale.setScalar(gem); P.gemR.scale.setScalar(gem);
  }
};
