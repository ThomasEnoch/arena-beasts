/* Arena Beasts - rig: makes a live creature from a sculpt blueprint.
   One Creature = skinned body + rigid parts + eyes + outline. Its pose comes from a small record of numbers. */
import * as THREE from 'three';
import { Sculpt } from './sculpt.js';
import { smoothCopy, canvasTex } from './geo.js';

const D2R = Math.PI / 180;

/* Pose record. The renderer fills it from the battle state. Each creature's anim() reads it.
   p idle phase · w walk phase · o orbit phase · tm time · mv 0..1 moving · a wind-up · s strike · h hurt
   sw forward lag · sl side lag · sv vertical lag · bl blink · lk look side · gl power glow · k strike style */
// Pose record. The game fills it each frame; a model reads it in anim(b, t, c).
// Motion of the body (all in model units and model axes: +X forward, +Z = the L side):
//   vf, vs  speed forward and to the L side         af, as  acceleration forward and to the L side      va  speed upward
//   tn      turn rate -1..1 (+ = it turns to its L)  yr      turn rate in rad/s (three.js sign)
//   hd      angle from the nose to the aim direction, in rad (+ = the aim is on the L side): the head turns first
//   hx, hz  direction of the last hit that pushed the body (unit vector; multiply with h)
export function newPose() {
  return { p: 0.6, w: 0, o: 0.5, tm: 0, mv: 0, a: 0, s: 0, h: 0, sw: 0, sl: 0, sv: 0, bl: 0, lk: 0, gl: 0, u: 0,
    vf: 0, vs: 0, af: 0, as: 0, va: 0, tn: 0, yr: 0, hd: 0, hx: 0, hz: 0, k: 'melee', zz: 0 };
}

// ---- materials ------------------------------------------------------------
const RIM = `
{ float rimV = 1.0 - saturate( dot( normalize( normal ), normalize( vViewPosition ) ) );
  outgoingLight += uRim.rgb * pow( rimV, uRim.w ) * ( 0.35 + 0.65 * saturate( normal.y + 0.35 ) );
  outgoingLight = mix( outgoingLight, uFlash.rgb, uFlash.a ); }
`;
const FADE = `
if ( uFade < 0.999 ) { float ign = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) ); if ( ign >= uFade ) discard; }
`;
function patch(sh, uni) {
  sh.uniforms.uFlash = uni.uFlash; sh.uniforms.uRim = uni.uRim; sh.uniforms.uGlowK = uni.uGlowK; sh.uniforms.uFade = uni.uFade;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\n#ifdef USE_FX\nattribute vec3 aFx;\nvarying vec3 vFx;\n#endif')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_FX\nvFx = aFx;\n#endif');
  let f = sh.fragmentShader;
  const std = f.indexOf('#include <lights_physical_fragment>') >= 0;
  f = f.replace('#include <common>', '#include <common>\nuniform vec4 uFlash;\nuniform vec4 uRim;\nuniform float uGlowK;\nuniform float uFade;\n#ifdef USE_FX\nvarying vec3 vFx;\n#endif');
  f = f.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>' + FADE);
  const out = f.indexOf('#include <opaque_fragment>') >= 0 ? '#include <opaque_fragment>' : '#include <output_fragment>';
  if (std) {
    f = f.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n#ifdef USE_FX\nroughnessFactor = mix( roughnessFactor, 0.16, vFx.y );\n#endif');
    f = f.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n#ifdef USE_FX\nmetalnessFactor = mix( metalnessFactor, 1.0, vFx.z );\n#endif');
    f = f.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_FX\ntotalEmissiveRadiance += diffuseColor.rgb * vFx.x;\n#endif\ntotalEmissiveRadiance *= uGlowK;');
    // the clear coat is weaker on bright colours: a white surface with a full coat goes past the bloom limit
    f = f.replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= 1.0 - 0.62 * smoothstep( 0.3, 0.85, dot( diffuseColor.rgb, vec3( 0.299, 0.587, 0.114 ) ) );\n#endif');
    f = f.replace(out, RIM + out);
  } else f = f.replace(out, 'outgoingLight = mix( outgoingLight * uGlowK, uFlash.rgb, uFlash.a );\n' + out);
  sh.fragmentShader = f;
}
/* Material from a short description:
   col, rough, metal, glow (emissive colour), glowK, flat, side, vc (vertex colours), fx (sculpt attributes),
   map, emap, op (opacity), add (additive), basic (no lights), env, coat (clear coat 0..1), coatRough.
   Finish: each solid surface has a clear coat, as lacquer on a model figure. It gives a sharp highlight and a reflection
   on top of the base colour, so that no surface looks flat or unfinished. Glass, flames and glow parts have no coat. */
export const FINISH = { coat: 0.85, coatRough: 0.14, skinRough: 0.8, skinEnv: 0.6, env: 0.62 };
export function fxMat(d, uni) {
  const coated = !d.basic && !d.add && d.op === undefined && !d.noOut && d.coat !== 0;
  const m = d.basic ? new THREE.MeshBasicMaterial() : coated ? new THREE.MeshPhysicalMaterial() : new THREE.MeshStandardMaterial();
  m.color.set(d.col || '#ffffff');
  if (!d.basic) {
    m.roughness = d.rough === undefined ? 0.6 : d.rough; m.metalness = d.metal || 0; m.envMapIntensity = d.env === undefined ? FINISH.env : d.env;
    if (d.fx) { m.roughness *= FINISH.skinRough; m.envMapIntensity = FINISH.skinEnv; }
    if (coated) { m.clearcoat = d.coat === undefined ? FINISH.coat : d.coat; m.clearcoatRoughness = d.coatRough === undefined ? FINISH.coatRough : d.coatRough; }
    if (d.glow) { m.emissive.set(d.glow); m.emissiveIntensity = d.glowK === undefined ? 1.6 : d.glowK; }
    if (d.emap) { m.emissiveMap = d.emap; m.emissive.set(d.glow || '#ffffff'); m.emissiveIntensity = d.glowK === undefined ? 1 : d.glowK; }
    m.flatShading = !!d.flat;
  }
  if (d.vc) m.vertexColors = true;
  if (d.map) m.map = d.map;
  if (d.side) m.side = THREE.DoubleSide;
  if (d.op !== undefined) { m.transparent = true; m.opacity = d.op; m.depthWrite = false; }
  if (d.add) { m.blending = THREE.AdditiveBlending; m.transparent = true; m.depthWrite = false; }
  if (d.fx) m.defines = Object.assign(m.defines || {}, { USE_FX: '' });
  m.onBeforeCompile = function (sh) { patch(sh, uni); };
  m.customProgramCacheKey = function () { return 'abfx5' + (coated ? 'c' : ''); };
  return m;
}
export function outlineMat(uni, col) {
  const m = new THREE.MeshBasicMaterial({ color: col || '#160f1c', side: THREE.BackSide });
  m.onBeforeCompile = function (sh) {
    sh.uniforms.uOut = uni.uOut; sh.uniforms.uFade = uni.uFade;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uOut;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize( normal ) * uOut;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFade;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>' + FADE);
  };
  m.customProgramCacheKey = function () { return 'abol2'; };
  return m;
}

// ---- eyes -----------------------------------------------------------------
const eyeTexCache = {}, eyeGeoCache = {}, lidGeoCache = {};
function eyeTex(o) {
  const key = [o.iris, o.iris2, o.pupil, o.sclera, o.size].join('|');
  if (eyeTexCache[key]) return eyeTexCache[key];
  return (eyeTexCache[key] = canvasTex(512, 256, (g, W, H) => {
    const cx = W / 2, cy = H / 2, R = (o.size || 46) * 1.42;   // iris radius in pixels (size = half angle in degrees)
    g.fillStyle = o.sclera || '#f6f3ea'; g.fillRect(0, 0, W, H);
    let gr = g.createRadialGradient(cx, cy, R * 1.0, cx, cy, R * 2.4);
    gr.addColorStop(0, 'rgba(60,30,50,0.28)'); gr.addColorStop(1, 'rgba(60,30,50,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#14101a'; g.beginPath(); g.arc(cx, cy, R * 1.06, 0, 7); g.fill();
    gr = g.createLinearGradient(0, cy - R, 0, cy + R);
    gr.addColorStop(0, o.iris || '#3a6fd8'); gr.addColorStop(1, o.iris2 || o.iris || '#8fd0ff');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * 0.94, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = R * 0.1; g.beginPath(); g.arc(cx, cy, R * 0.88, 0, 7); g.stroke();
    g.fillStyle = '#0b0810'; g.beginPath();
    if (o.pupil === 'slit') g.ellipse(cx, cy, R * 0.16, R * 0.74, 0, 0, 7);
    else if (o.pupil === 'bar') g.ellipse(cx, cy, R * 0.7, R * 0.2, 0, 0, 7);
    else if (o.pupil === 'none') g.ellipse(cx, cy, 0.01, 0.01, 0, 0, 7);
    else g.arc(cx, cy, R * 0.5, 0, 7);
    g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx + R * 0.36, cy - R * 0.4, R * 0.27, R * 0.21, -0.5, 0, 7); g.fill();
    g.globalAlpha = 0.75; g.beginPath(); g.arc(cx - R * 0.42, cy + R * 0.42, R * 0.1, 0, 7); g.fill(); g.globalAlpha = 1;
  }));
}
function makeEye(e, uni, mats) {
  const grp = new THREE.Group(), r = e.r, sy = e.sy || 1;
  const kg = r.toFixed(4);
  const geo = eyeGeoCache[kg] || (eyeGeoCache[kg] = new THREE.SphereGeometry(r, 28, 18));
  const tex = eyeTex(e);
  const bm = fxMat({ col: '#ffffff', rough: 0.12, map: tex, emap: e.glow ? tex : null, glow: e.glow ? '#ffffff' : null, glowK: e.glow || 0, env: 1.1 }, uni);
  const ball = new THREE.Mesh(geo, bm);
  mats.push(bm);
  grp.add(ball);
  // eyelid: the top half of a larger sphere. It turns forward to close.
  const lg = lidGeoCache[kg] || (lidGeoCache[kg] = new THREE.SphereGeometry(r * 1.07, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2));
  const lm = fxMat({ col: e.lid || '#555555', rough: 0.7 }, uni);
  const tilt = new THREE.Group(), lid = new THREE.Mesh(lg, lm);
  mats.push(lm);
  tilt.rotation.x = (e.tilt || 0) * D2R * e.side;
  tilt.add(lid); grp.add(tilt);
  grp.scale.set(1, sy, e.sz || 1);
  grp.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(e.dir[0], e.dir[1], e.dir[2]).normalize());
  const open = (e.open === undefined ? 48 : e.open) * D2R;
  lid.rotation.z = open;
  return { grp, ball, lid, open, side: e.side, look: e.look === undefined ? 1 : e.look };
}

// ---- creature ---------------------------------------------------------------
const blueprints = {}, defs = {};
export function register(def) { defs[def.id] = def; }
export function hasDef(id) { return !!defs[id]; }
export function blueprint(id) {
  if (blueprints[id]) return blueprints[id];
  const def = defs[id], S = new Sculpt(def.opts || {});
  def.build(S);
  const bp = S.build();
  bp.def = def; bp.pos = {};
  for (const b of bp.bones) bp.pos[b.name] = b.p;
  return (blueprints[id] = bp);
}

const _v = new THREE.Vector3(), IDENT = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
// Bones with these names get spring motion when the model has no 'dyn' list.
const DYN_AUTO = /^(tail|ant|ear|lure|chain|whisk|tent|wire|plume|tassel|cord|crest|frill|kelp|drop|beard|ribbon|fringe)/i;
const cl = (v, a, b) => v < a ? a : v > b ? b : v;
// Mean thickness of a part (3 x volume / area). The ink outline of a very thin part would be thicker than the part.
function thickness(geo) {
  if (geo.userData.thick !== undefined) return geo.userData.thick;
  const P = geo.getAttribute('position'), I = geo.index, n = I ? I.count : P.count, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  let vol = 0, area = 0;
  for (let i = 0; i + 2 < n; i += 3) {
    a.fromBufferAttribute(P, I ? I.getX(i) : i); b.fromBufferAttribute(P, I ? I.getX(i + 1) : i + 1); c.fromBufferAttribute(P, I ? I.getX(i + 2) : i + 2);
    ab.subVectors(b, a); ac.subVectors(c, a); ab.cross(ac);
    area += ab.length() * 0.5; vol += a.dot(ab) / 6;
  }
  return (geo.userData.thick = area > 0 ? Math.abs(vol) * 3 / area : 0);
}
export class Creature {
  constructor(id, o = {}) {
    const bp = this.bp = blueprint(id), def = this.def = bp.def;
    this.id = id;
    this.root = new THREE.Group();      // world placement (the renderer moves it)
    this.model = new THREE.Group();     // squash, lean and other whole-body motion
    this.root.add(this.model);
    this.uni = {
      uFlash: { value: new THREE.Vector4(1, 1, 1, 0) }, uRim: { value: new THREE.Vector4(0.2, 0.25, 0.34, 3) },
      uGlowK: { value: 1 }, uFade: { value: 1 }, uOut: { value: def.outline === undefined ? 0.011 : def.outline }
    };
    if (def.rim) { const c = new THREE.Color(def.rim); this.uni.uRim.value.set(c.r * 0.38, c.g * 0.38, c.b * 0.38, 3); }
    this.mats = []; this.b = {}; this.parts = {}; this.eyes = []; this.meshes = [];
    const bones = [], roots = [];
    for (const d of bp.bones) { const bn = new THREE.Bone(); bn.name = d.name; this.b[d.name] = bn; bones.push(bn); }
    for (const d of bp.bones) {
      const bn = this.b[d.name], pp = d.parent ? bp.pos[d.parent] : [0, 0, 0];
      bn.position.set(d.p[0] - pp[0], d.p[1] - pp[1], d.p[2] - pp[2]);
      bn.userData.rest = bn.position.clone();
      if (d.parent) this.b[d.parent].add(bn); else roots.push(bn);
    }
    this.boneList = bones;
    const skin = fxMat({ vc: true, fx: true, rough: def.rough === undefined ? 0.62 : def.rough, env: 0.5 }, this.uni);
    this.mats.push(skin);
    const mesh = this.mesh = new THREE.SkinnedMesh(bp.geo, skin);
    for (const r of roots) mesh.add(r);
    mesh.updateMatrixWorld(true);
    const skel = this.skeleton = new THREE.Skeleton(bones);
    mesh.bind(skel, IDENT);
    mesh.frustumCulled = false; mesh.castShadow = true;
    this.model.add(mesh); this.meshes.push(mesh);
    const noOut = o.outline === false || def.outline === 0;
    this.outMat = noOut ? null : outlineMat(this.uni, def.ink);
    if (!noOut) {
      const om = new THREE.SkinnedMesh(bp.geo, this.outMat);
      om.bind(skel, IDENT); om.frustumCulled = false;
      this.model.add(om); this.outlines = [om];
    } else this.outlines = [];
    // rigid parts
    const matCache = new Map();
    for (const a of bp.atts) {
      let m = matCache.get(a.mat);
      if (!m) { m = fxMat(a.mat, this.uni); matCache.set(a.mat, m); this.mats.push(m); }
      const part = new THREE.Mesh(a.geo, m), bp0 = bp.pos[a.bone];
      if (!bp0) throw new Error('Unknown bone for part: ' + a.bone);
      part.position.set(a.p[0] - bp0[0], a.p[1] - bp0[1], a.p[2] - bp0[2]);
      if (a.order) part.rotation.order = a.order;
      part.rotation.set(a.r[0] * D2R, a.r[1] * D2R, a.r[2] * D2R);
      if (a.flip) part.scale.z = -1;
      part.castShadow = !a.mat.add && a.mat.op === undefined;
      part.userData.rest = { p: part.position.clone(), q: part.quaternion.clone(), s: part.scale.clone() };
      this.b[a.bone].add(part); this.meshes.push(part);
      if (a.name) this.parts[a.name] = part;
      if (!noOut && a.outline && !a.mat.add && a.mat.op === undefined && !a.mat.noOut && thickness(a.geo) > 0.03) {
        const ol = new THREE.Mesh(smoothCopy(a.geo), this.outMat);
        part.add(ol); this.outlines.push(ol);
      }
    }
    // eyes
    for (const e of bp.eyes) {
      const ey = makeEye(e, this.uni, this.mats), bp0 = bp.pos[e.bone];
      ey.grp.position.set(e.p[0] - bp0[0], e.p[1] - bp0[1], e.p[2] - bp0[2]);
      this.b[e.bone].add(ey.grp); this.eyes.push(ey);
      if (!noOut) { const ol = new THREE.Mesh(ey.ball.geometry, this.outMat); ol.scale.setScalar(1.02); ey.grp.add(ol); this.outlines.push(ol); }
    }
    this.initDyn();
    this.pose = newPose();
    this.update(this.pose);
  }
  // Spring bones: tails, antennas, chains and other loose parts follow the body with a delay (follow-through).
  // def.dyn = [{ b: ['tail1', 'tail2', 'tail3'], k: 55, d: 6.5, amt: 1, drag: 3, dir: [x, y, z] }, ...]
  //   b: bones or named parts from the root of the chain to its tip. k: stiffness. d: damping. amt: strength.
  //   drag: how much the part trails in the air when the body moves. dir: where the part points (default: found from the bones).
  // def.rig = { head: 'head', neck: ['neck1', 'neck2'] }: the head turns to the aim direction before the body (default: found by name).
  initDyn() {
    const def = this.def, bp = this.bp, kids = {};
    for (const d of bp.bones) if (d.parent) (kids[d.parent] = kids[d.parent] || []).push(d);
    const spec = def.dyn || bp.bones.filter(d => DYN_AUTO.test(d.name)).map(d => {
      let n = 0, p = d.parent;
      while (p && DYN_AUTO.test(p)) { n++; p = (bp.bones.find(x => x.name === p) || {}).parent; }
      return { b: [d.name], amt: 0.55, depth: n };
    });
    this.dyn = [];
    for (const sp of spec) {
      (sp.b || []).forEach((name, j) => {
        const bone = this.b[name], part = this.parts[name], o = bone || part;
        if (!o) return;
        let pos, dirv;
        if (bone) {
          pos = bp.pos[name];
          const kid = kids[name] && kids[name][0], bd = bp.bones.find(x => x.name === name), pp = bd && bd.parent ? bp.pos[bd.parent] : null;
          dirv = kid ? [kid.p[0] - pos[0], kid.p[1] - pos[1], kid.p[2] - pos[2]] : pp ? [pos[0] - pp[0], pos[1] - pp[1], pos[2] - pp[2]] : [0, 1, 0];
        } else {
          const r = part.userData.rest.p, par = part.parent, pb = par && bp.pos[par.name] ? bp.pos[par.name] : [0, 0, 0];
          pos = [pb[0] + r.x, pb[1] + r.y, pb[2] + r.z];
          dirv = r.length() > 0.05 ? [r.x, r.y, r.z] : [0, -1, 0];
        }
        if (sp.dir) dirv = sp.dir;
        const L = Math.hypot(dirv[0], dirv[1], dirv[2]) || 1, dep = j + (sp.depth || 0);
        this.dyn.push({
          o, part: !bone, px: pos[0], pz: pos[2], dx: dirv[0] / L, dy: dirv[1] / L, dz: dirv[2] / L,
          k: (sp.k || 55) * Math.max(0.4, 1 - 0.17 * dep), d: sp.d || 6.5, amt: sp.amt === undefined ? 1 : sp.amt, drag: sp.drag === undefined ? 3 : sp.drag,
          x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0
        });
      });
    }
    const rg = def.rig || {};
    this.headB = this.b[rg.head || 'head'] || null;
    this.neckB = (rg.neck || bp.bones.filter(d => /^neck\d*$/i.test(d.name)).map(d => d.name)).map(n => this.b[n]).filter(Boolean);
    this.lastTm = -1;
  }
  // One step of the spring bones. The force on each part comes from the acceleration, the speed and the turn of the body.
  stepDyn(t, dt) {
    const fx0 = -t.af, fz0 = -t.as, fy0 = -(t.va || 0) * 2, yr = t.yr || 0;
    for (const s of this.dyn) {
      // drag: the part trails behind the motion. The turn of the body moves the part sideways through the air.
      const Fx = fx0 - (t.vf + yr * s.pz) * s.drag, Fy = fy0, Fz = fz0 - (t.vs - yr * s.px) * s.drag;
      // torque = direction of the part x force
      const tx = s.dy * Fz - s.dz * Fy, ty = s.dz * Fx - s.dx * Fz, tz = s.dx * Fy - s.dy * Fx, g = 1.1;
      s.vx += (g * tx - s.k * s.x - s.d * s.vx) * dt; s.vy += (g * ty - s.k * s.y - s.d * s.vy) * dt; s.vz += (g * tz - s.k * s.z - s.d * s.vz) * dt;
      s.x = cl(s.x + s.vx * dt, -0.9, 0.9); s.y = cl(s.y + s.vy * dt, -0.9, 0.9); s.z = cl(s.z + s.vz * dt, -0.9, 0.9);
    }
  }
  // Put the bones in the rest position, then let the creature's own animation move them.
  update(t) {
    let i, bn, r;
    for (i = 0; i < this.boneList.length; i++) { bn = this.boneList[i]; bn.position.copy(bn.userData.rest); bn.rotation.set(0, 0, 0); bn.scale.set(1, 1, 1); }
    for (const k in this.parts) { bn = this.parts[k]; r = bn.userData.rest; bn.position.copy(r.p); bn.quaternion.copy(r.q); bn.scale.copy(r.s); bn.visible = true; }
    this.def.anim(this.b, t, this);
    // layers that are the same for all creatures: the head leads a turn, loose parts follow with a delay
    let dt = this.lastTm < 0 ? 0 : t.tm - this.lastTm;
    this.lastTm = t.tm;
    if (dt < 0 || dt > 0.25) dt = 0;
    if (dt > 0 && this.dyn.length) { const n = dt > 0.02 ? 2 : 1; for (i = 0; i < n; i++) this.stepDyn(t, Math.min(0.033, dt) / n); }
    for (i = 0; i < this.dyn.length; i++) {
      const s = this.dyn[i];
      if (s.part) s.o.quaternion.premultiply(_q.setFromEuler(_e.set(s.x * s.amt, s.y * s.amt, s.z * s.amt)));
      else { s.o.rotation.x += s.x * s.amt; s.o.rotation.y += s.y * s.amt; s.o.rotation.z += s.z * s.amt; }
    }
    if (this.headB && t.hd) {
      const hy = cl(t.hd * 0.7, -0.8, 0.8), nn = this.neckB.length, hs = nn ? 0.55 : 1;
      this.headB.rotation.y -= hy * hs; this.headB.rotation.x += hy * 0.12;
      for (i = 0; i < nn; i++) this.neckB[i].rotation.y -= hy * (1 - hs) / nn;
    }
    for (i = 0; i < this.eyes.length; i++) {
      const e = this.eyes[i];
      e.lid.rotation.z = e.open + (-Math.PI / 2 - e.open) * Math.min(1, t.bl + t.h * 0.55);
      e.ball.rotation.y = -(t.lk * 0.3 + cl(t.hd || 0, -1, 1) * 0.22) * e.look;
    }
    this.uni.uGlowK.value = 1 + t.gl * (0.5 + 0.35 * Math.sin(t.tm * 7)) + t.a * 0.6 + t.s * 0.5 + (t.u || 0) * (0.9 + 0.25 * Math.sin(t.tm * 11));
  }
  flash(r, g, b, a) { this.uni.uFlash.value.set(r, g, b, a); }
  fade(a) { this.uni.uFade.value = a; }
  setShadow(on) { for (const m of this.meshes) if (m.castShadow !== undefined && !m.material.transparent) m.castShadow = on; }
  // world position of a bone or part (for effects)
  worldOf(name, out) { const o = this.parts[name] || this.b[name]; return o ? o.getWorldPosition(out || _v) : null; }
  dispose() { for (const m of this.mats) m.dispose(); if (this.outMat) this.outMat.dispose(); this.skeleton.dispose(); }
}

// ---- animation helpers ------------------------------------------------------
export const A = {
  // 4 legs. order: front-left, front-right, back-left, back-right. Diagonal pairs move together.
  quad(b, L, t, swing, lift) {
    const ph = [0, Math.PI, Math.PI, 0];
    for (let i = 0; i < 4; i++) {
      const bn = b[L[i]], a = t.w + ph[i];
      bn.rotation.z += Math.sin(a) * swing * t.mv;
      bn.position.y += Math.max(0, Math.cos(a)) * lift * t.mv;
    }
  },
  // Chain of bones that bends: yaw and pitch for each segment, with a wave that moves along the chain.
  chain(b, names, yaw, pitch, wave, ph, lag) {
    for (let i = 0; i < names.length; i++) {
      const bn = b[names[i]];
      bn.rotation.y += yaw + Math.sin(ph - i * (lag || 0.7)) * wave;
      bn.rotation.z += pitch;
    }
  },
  ease(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
};
