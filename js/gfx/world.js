/* Arena Beasts - world: draws one battle in 3D. It reads the battle state each frame and moves creatures, effects and the camera.
   The battle logic stays in engine.js. Positions there are game pixels (960 x 540); fx.js changes them to world units. */
import * as THREE from 'three';
import { makeRenderer, setEnv, lightRig, makeComposer, GFX, LEVELS, gfxLevel, gfxMode } from './stage.js';
import { Creature, newPose, FINISH } from './rig.js';
import { FX, S, wx, wz, lin, glowTexture } from './fx.js';
import { Arena, THEMES } from './arena.js';
import { HUD } from './hud.js';
import { crystal, flame } from './geo.js';
import { makeUlts } from './ults.js';

const G = window.G, PI = Math.PI, TAU = PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const ZK = { lava: 0, toxic: 1, spikes: 2, bubbles: 3, ice: 4, vines: 5, gravity: 6, volt: 7, smoke: 8, chrome: 2, basalt: 2, reef: 2, steam: 8, thread: 5 };
// zones that grow spikes: colour and size of the spikes. ZFX: the particle style of the new zone kinds.
const SPK = { spikes: ['#b8c4d0', 1], chrome: ['#eef4fa', 1.15], basalt: ['#5a5a66', 2.0], reef: ['#ffb4b4', 1.8] };
const ZFX = { chrome: 'spikes', basalt: 'spikes', reef: 'bubbles', thread: 'spikes' };
const ZCOL = { lava: '#f0693a', toxic: '#a653c9', spikes: '#9aa7b5', bubbles: '#3d8fe8', ice: '#6fd0e6', vines: '#57b84a', gravity: '#f065a8', volt: '#f2c81e', smoke: '#b78ad0', chrome: '#dfe8f2', basalt: '#b08a52', reef: '#ff9ab0', steam: '#e8f0f8', thread: '#c08cff' };
const STATUS_TINT = { burn: '#ff7a3a', poison: '#b866dd', toxic: '#b866dd', para: '#fff27a', chill: '#9fe6ff', sleep: '#8fa0ff' };
// natural frequency of the turn spring for each size class: a large body turns with more weight
const TURN = { S: 15, M: 12, L: 9.5 };
const STYLE = { cone: 'melee', dash: 'melee', line: 'shot', proj: 'shot', lob: 'shot', nova: 'slam', ring: 'slam', zone: 'slam', self: 'buff' };
const WHITE = new THREE.Color('#ffffff'), RED = new THREE.Color('#ff5a5a'), GOLD = new THREE.Color('#ffe27a');
const VIS = 0.62;   // creature model size for each size step
const BASE_FOV = 30, PITCH = 51 * PI / 180, DIST = 19.6, TARGET = new THREE.Vector3(0, 0, 0.42);

export const World = { hitstop: 0, theme: '' };
let renderer, scene, camera, comp, lights, arena, fx, ults, glCanvas, time = 0, shake = 0, darkK = 1, themeDef = THEMES[0];
let warmB = null; const warmQ = [];
let cine = 0, fov0 = BASE_FOV, meSide = 0;   // cine: 1 -> 0 after the start of an ultimate (dim light, small zoom)
const UPOS = [{ x: 0, z: 0 }, { x: 0, z: 0 }];
const slots = [], bars = [{ on: false }, { on: false }], _v = new THREE.Vector3(), _v2 = new THREE.Vector3();

// ---- small shared meshes --------------------------------------------------------
function fresnelMat(col, add) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(col) }, uA: { value: 1 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV;\nvoid main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uCol; uniform float uA; varying vec3 vN; varying vec3 vV;\nvoid main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0); gl_FragColor = vec4(uCol * (0.5 + 2.4 * f), (0.08 + 0.85 * f) * uA); }'
  });
}
function columnMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color() }, uA: { value: 1 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV;\nvoid main(){ vY = position.y; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uCol; uniform float uA; varying float vY; varying vec3 vN; varying vec3 vV;\nvoid main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(1.0 - vY, 1.4) * (0.25 + 0.75 * f * f); gl_FragColor = vec4(uCol * 2.2 + vec3(1.2) * f * f * (1.0 - vY), a * uA); }'
  });
}
function mkSlot(si) {
  const sl = { si, mon: null, c: null, cache: new Map(), pose: newPose(), yaw: si ? PI : 0, lx: 0, lz: 0, sq: 0, sqv: 0, swv: 0, slv: 0, st: '', blT: 2, amb: 0, stat: 0, stepN: 0, lh: 0, ghost: 0 };
  sl.shield = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), fresnelMat('#bfe0ff')); sl.shield.visible = false; sl.shield.renderOrder = 8; scene.add(sl.shield);
  const ico = new THREE.IcosahedronGeometry(1, 1);
  sl.cage = new THREE.Group(); sl.cage.visible = false;
  sl.cage.add(new THREE.LineSegments(new THREE.EdgesGeometry(ico), new THREE.LineBasicMaterial({ color: new THREE.Color('#e6eef8').multiplyScalar(2.2), transparent: true })));
  sl.cage.add(new THREE.Mesh(ico, fresnelMat('#c8d4e2'))); scene.add(sl.cage);
  const cg = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true); cg.translate(0, 0.5, 0);
  sl.beam = new THREE.Mesh(cg, columnMat()); sl.beam.visible = false; sl.beam.renderOrder = 7; scene.add(sl.beam);
  sl.cyc = new THREE.Group(); sl.cyc.visible = false; scene.add(sl.cyc);
  for (let n = 0; n < 5; n++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(3 - n * 0.5, 0.05 + n * 0.012, 6, 40, 2.0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#cfe0ff').multiplyScalar(1.5), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    t.rotation.x = PI / 2; t.position.y = 0.25 + n * 0.42; sl.cyc.add(t);
  }
  return sl;
}

// projectiles: one small model for each element type
const projPool = {}, projLive = new Map();
function em(col, k, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: col, emissive: col, emissiveIntensity: k, roughness: 0.35 }, o || {})); }
function makeProj(type) {
  const g = new THREE.Group(), col = G.TCOL[type] || '#ffffff';
  let m, m2, spin = 0, tumble = 0;
  switch (type) {
    case 'Ember':
      m = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), em('#ffd27a', 3.2));
      m2 = new THREE.Mesh(flame(0.85, 2.8, 10), em('#ff6a1a', 2.2, { transparent: true, opacity: 0.85 })); m2.rotation.z = PI / 2; m2.position.x = 0.3; g.add(m2); break;
    case 'Tide':
      m = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), em('#3d9cf0', 0.9, { roughness: 0.08 }));
      m2 = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.1, 6, 20), em('#bfe6ff', 1.4, { transparent: true, opacity: 0.7 })); m2.rotation.y = PI / 2; g.add(m2); spin = 1; break;
    case 'Bloom': m = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 6), em('#7fd85a', 0.9, { flatShading: true })); m.rotation.z = -PI / 2; spin = 9; break;
    case 'Volt': m = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), em('#fff27a', 3.6, { flatShading: true })); m.scale.set(2.3, 0.7, 0.7); spin = 14; break;
    case 'Frost': m = new THREE.Mesh(crystal(0.6, 1.9, 0.8, 6), em('#c8f4ff', 1.3, { flatShading: true, roughness: 0.1 })); m.rotation.z = -PI / 2; spin = 5; break;
    case 'Stone': m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#a08258', roughness: 0.9, flatShading: true })); tumble = 7; break;
    case 'Gale': m = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.2, 6, 16, PI), em('#e6eeff', 1.6)); m.rotation.x = PI / 2; tumble = 0; spin = 0; g.userData.yspin = 16; break;
    case 'Venom': m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), em('#b45fe0', 1.1, { roughness: 0.15 })); g.userData.wob = 1; break;
    case 'Mind':
      m = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 10), em('#ff7ac0', 2.4));
      m2 = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.07, 6, 24), em('#ffd0ea', 2)); g.add(m2); g.userData.ring = m2; break;
    case 'Shade':
      m = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), em('#7a5fd0', 1.5));
      m2 = new THREE.Mesh(flame(0.8, 2.4, 10), em('#3a2a70', 0.8, { transparent: true, opacity: 0.8 })); m2.rotation.z = PI / 2; m2.position.x = 0.2; g.add(m2); break;
    case 'Iron': m = new THREE.Mesh(crystal(0.55, 1.7, 0.9, 4), new THREE.MeshStandardMaterial({ color: '#c8d2de', metalness: 1, roughness: 0.2, flatShading: true })); m.rotation.z = -PI / 2; spin = 12; break;
    default: m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), em(col, 1.2));
  }
  g.add(m);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(col), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
  sp.scale.setScalar(5.5); g.add(sp);
  g.userData.core = m; g.userData.spin = spin; g.userData.tumble = tumble; g.userData.type = type;
  scene.add(g);
  return g;
}
const decoys = [], lobs = [];
let spikes, rain, rainPos;

// ---- setup ----------------------------------------------------------------------
World.init = function (canvas) {
  glCanvas = canvas;
  FINISH.on = gfxLevel().coat;
  renderer = World.renderer = makeRenderer(canvas);
  scene = new THREE.Scene(); scene.background = new THREE.Color('#0f0d0b'); scene.fog = new THREE.Fog('#0f0d0b', 34, 70);
  setEnv(renderer, scene);
  lights = lightRig(scene, { area: 12, map: 2048 });
  camera = new THREE.PerspectiveCamera(BASE_FOV, 16 / 9, 1, 140);
  arena = new Arena(scene); fx = new FX(scene);
  slots.push(mkSlot(0), mkSlot(1));
  ults = makeUlts({ fx, HUD, pos: si => { const p = UPOS[si], sl = slots[si]; p.x = sl.lx || 0; p.z = sl.lz || 0; return p; }, shake: v => { shake = Math.max(shake, v); }, me: () => meSide });
  spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.24, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.75, roughness: 0.35, flatShading: true }), 120);
  for (let i = 0; i < 120; i++) spikes.setColorAt(i, lin('#b8c4d0'));
  spikes.count = 0; spikes.castShadow = true; spikes.frustumCulled = false; scene.add(spikes);
  rainPos = new Float32Array(160 * 6);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rainPos, 3).setUsage(THREE.DynamicDrawUsage));
  rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: new THREE.Color('#a8d0ff').multiplyScalar(1.3), transparent: true, opacity: 0.55 })); rain.visible = false; rain.frustumCulled = false; scene.add(rain);
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(), core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), em('#ffffff', 1.6, { flatShading: true }));
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.setScalar(1.6);
    g.add(core, sp); g.visible = false; g.userData = { core, sp }; core.castShadow = true; scene.add(g); lobs.push(g);
  }
  World.resize();
  World.applyGfx();
  World.setTheme(0);
};
World.resize = function () {
  const w = glCanvas.clientWidth || window.innerWidth, h = glCanvas.clientHeight || window.innerHeight, pr = Math.min(gfxLevel().pr, window.devicePixelRatio || 1) * GFX.scale, asp = w / h;
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  camera.aspect = asp;
  camera.fov = fov0 = asp >= 16 / 9 ? BASE_FOV : 2 * Math.atan(Math.tan(BASE_FOV * PI / 360) * (16 / 9) / asp) * 180 / PI;
  camera.updateProjectionMatrix();
  if (comp) comp.setSize(Math.round(w * pr), Math.round(h * pr));
  fx.setView(h * pr, camera.fov, asp);
  placeCamera(0, 0);
};
function placeCamera(sx, sy) {
  camera.position.set(TARGET.x + sx, TARGET.y + Math.sin(PITCH) * DIST + sy, TARGET.z + Math.cos(PITCH) * DIST);
  _v.set(TARGET.x + sx, TARGET.y + sy, TARGET.z); camera.lookAt(_v); camera.updateMatrixWorld();
}
World.setTheme = function (i) {
  const th = themeDef = arena.setTheme(i);
  lights.key.color.set(th.key); lights.key.intensity = th.keyK; lights.hemi.color.set(th.sky); lights.hemi.groundColor.set(th.gnd);
  scene.background.set(th.bg); scene.fog.color.set(th.fog);
  World.theme = HUD.theme = th.name;
  return th.name;
};
// seed >= 0: a fixed arena (online play). Other values: a random arena.
// ---- graphics quality (the levels are in stage.js) ------------------------------------------
// Put the current level to work: render size, bloom pass, shadows, clear coat of new creatures.
let gAcc = 0, gN = 0, gLast = 0, gWait = 0, gTold = false, gPrev = 0, gUndo = null, gLock = false;
World.applyGfx = function () {
  const L = gfxLevel();
  if (comp) { comp.dispose(); comp = null; }
  if (L.post) comp = makeComposer(renderer, scene, camera, { samples: L.samples }).comp;
  lights.key.castShadow = L.shadows;
  if (FINISH.on !== L.coat) {
    // the clear coat is part of the material: build the creatures again with the next battle
    FINISH.on = L.coat;
    for (const sl of slots) { for (const [, c] of sl.cache) { scene.remove(c.root); c.dispose(); } sl.cache.clear(); sl.mon = null; sl.c = null; }
    for (const d of decoys) { scene.remove(d.root); d.dispose(); }
    decoys.length = 0; warmB = null;
  }
  World.resize();
  gAcc = gN = 0; gWait = 1.2;
};
// The player selects a mode in the Controls panel: 'auto', 'high', 'medium' or 'low'.
World.setGfx = function (mode) {
  gfxMode(mode);
  gUndo = null; gLock = false;
  try { localStorage.setItem('ab_gfx', GFX.mode); } catch (e) { /* storage is optional */ }
  World.applyGfx();
};
// Auto mode: when the frames are slow, go one step down. High -> Medium -> smaller picture -> Low -> smaller picture.
function lowerGfx() {
  const before = { level: GFX.level, scale: GFX.scale };
  if (GFX.level === 2) { GFX.level = 1; GFX.scale = 1; }
  else if (GFX.level === 1 && GFX.scale > 0.75) GFX.scale = 0.75;
  else if (GFX.level === 1) { GFX.level = 0; GFX.scale = 1; }
  else if (GFX.scale > 0.5) GFX.scale = Math.max(0.5, GFX.scale - 0.2);
  else { gLock = true; return; }
  gUndo = before;
  World.applyGfx();
  if (!gTold) { gTold = true; HUD.msg('Graphics quality lowered to keep the game smooth', '#cbd8ee'); }
}
// Measure the real time between frames. Below about 33 frames each second for 1.5 seconds: lower the quality.
// If a step down does not make the frames faster, the picture is not the limit (for example a 30 Hz display):
// undo that step and stop.
function governGfx(dt) {
  const now = performance.now(), d = now - gLast;
  gLast = now;
  if (dt <= 0 || d > 1000) return;            // pause, hitstop, or the tab was hidden
  if (gWait > 0) { gWait -= d / 1000; return; }   // new shaders compile after a change
  gAcc += d; gN++;
  if (gAcc < 1500 || gN < 3) return;
  const avg = gAcc / gN;
  gAcc = gN = 0;
  if (GFX.mode !== 'auto' || gLock) return;
  if (gUndo && avg > gPrev * 0.93) {
    GFX.level = gUndo.level; GFX.scale = gUndo.scale; gUndo = null; gLock = true;
    World.applyGfx();
    return;
  }
  gUndo = null;
  if (avg > 30) { gPrev = avg; lowerGfx(); }
}
World.reset = function (seed) {
  fx.clear(); ults.clear(); shake = 0; World.hitstop = 0; darkK = 1; cine = 0;
  for (const sl of slots) { if (sl.c) sl.c.root.visible = false; sl.mon = null; sl.c = null; hideAux(sl); }
  for (const [, g] of projLive) { g.visible = false; (projPool[g.userData.type] = projPool[g.userData.type] || []).push(g); }
  projLive.clear();
  for (const d of decoys) d.root.visible = false;
  for (const l of lobs) l.visible = false;
  HUD.reset();
  return World.setTheme(seed >= 0 ? seed % THEMES.length : Math.floor(Math.random() * THEMES.length));
};
// Compile all shaders now, so that the first battle has no pause.
World.warm = function () { try { renderer.compile(scene, camera); } catch (e) { /* optional */ } };

// ---- coordinates ------------------------------------------------------------------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), AP = { x: 480, y: 276 };
World.toArena = function (cx, cy) {
  const r = glCanvas.getBoundingClientRect();
  ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height * 2 - 1));
  placeCamera(0, 0); ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction, t = d.y < -1e-4 ? -o.y / d.y : 0;
  AP.x = (o.x + d.x * t) / S + 480; AP.y = (o.z + d.z * t) / S + 276;
  return AP;
};
function proj(x, y, h, out) {
  _v.set(wx(x), h * S, wz(y)).project(camera);
  out.x = ((_v.x * 0.5 + 0.5) * HUD.cw - HUD.offX) / HUD.scale; out.y = ((1 - (_v.y * 0.5 + 0.5)) * HUD.ch - HUD.offY) / HUD.scale;
}

// ---- battle events -> effects, text and sound -----------------------------------------
const H0 = 0.55;   // height of a hit on a body
World.consume = function (b, ui) {
  const E = b.ev;
  let i, e, c, n, X, Z, ty;
  for (i = 0; i < E.length; i++) {
    e = E[i]; X = wx(e.x || 0); Z = wz(e.y || 0);
    switch (e.k) {
      case 'msg': HUD.msg(e.txt, e.col); break;
      case 'cast':
        G.sfx(e.sig ? 'sig' : 'cast'); arena.command(e.side);
        if (e.sig) {
          // an ultimate starts: a name card, a short stop, dim light, and the wind-up of that Beast
          const um = b.active(e.side);
          HUD.ultCut(e.side, e.name, e.type, um.id, um.d.epithet);
          fx.ring(X, Z, 2.4, 0.2, 0.5, '#ffe27a', 0.12); fx.summon(X, Z, '#ffe27a');
          ults.cast(um.d.sig.id, e, um.d.sigMove.wind / 1000);
          cine = 1; World.hitstop = Math.max(World.hitstop, 0.14); arena.cheer = Math.max(arena.cheer, 0.9);
        } else HUD.callout(e.side, e.name, e.type, false);
        break;
      case 'ult': ults.event(e); arena.cheer = Math.max(arena.cheer, 0.8); break;
      case 'fire':
        ty = e.mv.type; c = G.TCOL[ty];
        switch (e.mv.shape) {
          case 'cone': fx.cone(X, Z, e.a, e.mv.range * S, e.mv.arc * PI / 360, 0.22, c); fx.sweep(ty, X, Z, e.a, e.mv.range * S, e.mv.arc * PI / 360); fx.muzzle(ty, X + Math.cos(e.a) * 0.4, H0, Z + Math.sin(e.a) * 0.4, e.a); break;
          case 'line':
            fx.beam(X + Math.cos(e.a) * 0.3, H0, Z + Math.sin(e.a) * 0.3, X + Math.cos(e.a) * e.mv.range * S, H0, Z + Math.sin(e.a) * e.mv.range * S, e.mv.width * S * 0.5, 0.28, c);
            fx.lineFx(ty, X, Z, e.a, e.mv.range * S); fx.muzzle(ty, X + Math.cos(e.a) * 0.4, H0, Z + Math.sin(e.a) * 0.4, e.a);
            break;
          case 'nova': fx.ring(X, Z, 0.24, e.mv.radius * S, 0.32, c, 0.5); fx.disc(X, Z, e.mv.radius * S, 0.25, c); fx.explode(ty, X, Z, e.mv.radius * S); break;
          case 'self': fx.buff(ty, X, Z); fx.ring(X, Z, 0.9, 0.2, 0.4, c, 0.12); fx.light(X, 0.8, Z, c, 25, 0.4); break;
          case 'dash': fx.muzzle(ty, X, H0, Z, e.a + PI); fx.ring(X, Z, 0.2, 0.9, 0.25, c, 0.12); break;
          default: fx.muzzle(ty, X + Math.cos(e.a) * 0.45, H0, Z + Math.sin(e.a) * 0.45, e.a);
        }
        G.sfx(e.mv.shape === 'nova' ? 'burst' : 'fire');
        break;
      case 'dmg':
        if (e.dot) {
          HUD.floatTxt(e.x, e.y, 46, '' + e.dmg, e.dot === 'recoil' ? '#ffb0a0' : (G.STATUS_COL[e.dot] || (e.type ? G.TCOL[e.type] : '#ddd')), 12, 0.7);
          if (e.dot === 'zone') G.sfx('weak');
        } else {
          c = e.eff >= 2 ? '#ffd23a' : e.eff < 1 ? '#b9bccb' : '#ffffff';
          HUD.floatTxt(e.x, e.y, 54, e.dmg + (e.crit ? '!' : ''), c, e.eff >= 2 || e.crit ? 22 : 17, 1);
          if (e.eff >= 2) HUD.floatTxt(e.x, e.y, 76, 'Super effective!', '#ffd23a', 12, 1.1);
          else if (e.eff < 1) HUD.floatTxt(e.x, e.y, 76, 'Not very effective', '#b9bccb', 11, 1.1);
          if (e.crit) HUD.floatTxt(e.x, e.y, 92, 'Critical hit!', '#ff8a5a', 12, 1.1);
          fx.impact(e.type || 'Brawl', X, H0, Z, Math.min(0.5, e.big * (e.eff >= 2 ? 1.4 : 1) + (e.crit ? 0.08 : 0)));
          fx.ring(X, Z, 0.2, 0.9 + e.big * 3, 0.25, '#ffffff', 0.14, H0);
          if (e.big > 0.1) { shake = Math.max(shake, 4 + e.big * 22); World.hitstop = Math.max(World.hitstop, e.big > 0.2 ? 0.08 : 0.045); G.sfx('big'); arena.cheer = Math.max(arena.cheer, 0.4 + e.big * 2); if (e.type) fx.stain(X, Z, 0.5 + e.big * 2, e.type, 3); }
          else G.sfx(e.eff < 1 ? 'weak' : 'hit');
        }
        break;
      case 'miss': HUD.floatTxt(e.x, e.y, 54, 'Dodged!', '#bfe9ff', 13, 0.8); break;
      case 'text': HUD.floatTxt(e.x, e.y, 64, e.txt, e.col, 13, 1.1); break;
      case 'stage':
        HUD.floatTxt(e.x, e.y, 68, G.STAT_SHORT[e.stat] + (e.n > 0 ? ' +' : ' ') + e.n, e.n > 0 ? '#8fe0ff' : '#ff9a9a', 14, 1.2);
        fx.stage(X, Z, e.n > 0); G.sfx(e.n > 0 ? 'up' : 'down');
        break;
      case 'status':
        HUD.floatTxt(e.x, e.y, 68, G.STATUS_NAME[e.s] + '!', G.STATUS_COL[e.s], 14, 1.2);
        for (n = 0; n < 10; n++) fx.statusFx(e.s, X + (Math.random() - 0.5) * 0.7, 0.2 + Math.random() * 0.9, Z + (Math.random() - 0.5) * 0.7);
        fx.ring(X, Z, 0.2, 0.9, 0.3, G.STATUS_COL[e.s], 0.12); G.sfx('status');
        break;
      case 'heal': HUD.floatTxt(e.x, e.y, 54, '+' + e.amt, '#8dff9a', 14, 0.9); fx.heal(X, Z); G.sfx('heal'); break;
      case 'faint': fx.faint(X, Z, 'Gale'); fx.ring(X, Z, 0.2, 2, 0.5, '#ffffff', 0.2); shake = Math.max(shake, 9); G.sfx('faint'); arena.cheer = 1; break;
      case 'send': fx.ring(X, Z, 0.12, 1.5, 0.45, '#ffffff', 0.22); fx.summon(X, Z, e.side ? '#ff9a8a' : '#9ad0ff'); G.sfx('send'); arena.command(e.side); break;
      case 'recall': fx.warp(X, Z, 'Gale'); break;
      case 'guard':
        fx.ring(X, Z, 0.4, e.perfect ? 1.0 : 0.75, 0.22, e.perfect ? '#fff7b0' : '#bfe0ff', 0.12, H0);
        fx.bits('Iron', X, H0, Z, e.perfect ? 9 : 4, 2, 1); if (e.perfect) fx.light(X, 0.8, Z, '#fff7b0', 30, 0.25);
        G.sfx('guard');
        break;
      case 'dodge': G.sfx('dodge'); fx.burst(X, 0.1, Z, 8, '#e8e4d0', 1.6, 0.4, 0.26, { solid: true, flat: true, up: 0.5, grow: 1 }); break;
      case 'pop': fx.bits(e.type || 'Brawl', X, H0, Z, Math.min(9, e.n), 1.6, 0.8); fx.spark(X, H0, Z, 0, 0, 0, 0.16, 0.5, G.TCOL[e.type] || '#ffffff', 0, 0); break;
      case 'burst':
        c = G.TCOL[e.type];
        fx.ring(X, Z, 0.2, e.r * S, 0.34, c, 0.55); fx.disc(X, Z, e.r * S, 0.3, c);
        fx.explode(e.type, X, Z, e.r * S);
        fx.burst(X, 0.2, Z, 12, '#8a8078', e.r * S * 1.4, 0.7, 0.3, { solid: true, up: 3, grav: 9, drag: 1 });
        G.sfx('burst'); shake = Math.max(shake, 5);
        break;
      case 'zone': fx.ring(X, Z, 0.16, e.r * S, 0.32, G.TCOL[e.type], 0.2); break;
      case 'shake': shake = Math.max(shake, e.v); break;
      case 'teleport': fx.warp(X, Z, e.type); fx.warp(wx(e.x2), wz(e.y2), e.type); fx.light(wx(e.x2), 0.8, wz(e.y2), G.TCOL[e.type], 30, 0.3); G.sfx('dodge'); break;
      case 'trail':
        c = G.TCOL[e.type];
        if (e.sky) { fx.beam(X, 9, Z, X, 0.05, Z, 0.5, 0.5, c); fx.beam(X - 2.5, 9, Z - 1, X, 0.05, Z, 0.16, 0.4, c); fx.beam(X + 2.5, 9, Z - 1, X, 0.05, Z, 0.16, 0.4, c); fx.beam(X, 9, Z - 2.5, X, 0.05, Z, 0.16, 0.4, c); }
        else { fx.beam(X, H0, Z, wx(e.x2), H0, wz(e.y2), 0.2, 0.32, c); fx.lineFx(e.type, X, Z, Math.atan2(wz(e.y2) - Z, wx(e.x2) - X), Math.sqrt((wx(e.x2) - X) * (wx(e.x2) - X) + (wz(e.y2) - Z) * (wz(e.y2) - Z))); }
        G.sfx('fire'); break;
      case 'ready': if (e.side === ui.me) { HUD.floatTxt(e.x, e.y, 90, 'Signature ready!', '#ffe27a', 14, 1.4); G.sfx('ready'); } fx.ring(X, Z, 1.4, 0.3, 0.5, '#ffe27a', 0.1); fx.stage(X, Z, true); break;
      case 'go': HUD.banner('Fight!', '#ffc83d', 1.1); G.sfx('go'); arena.cheer = 1; break;
      case 'end':
        HUD.banner(e.winner === 2 ? 'Draw' : e.winner === ui.me ? 'Victory!' : 'Defeat', e.winner === 2 ? '#ffffff' : e.winner === ui.me ? '#ffc83d' : '#ff6b5e', 3);
        G.sfx(e.winner === ui.me ? 'win' : 'lose'); arena.cheer = 2;
        if (e.winner < 2) arena.trainers[e.winner].userData.cheer = 3;
        break;
    }
  }
  E.length = 0;
};

// ---- creatures --------------------------------------------------------------------------
function hideAux(sl) { sl.shield.visible = sl.cage.visible = sl.beam.visible = sl.cyc.visible = false; }
function newMon(sl, m) {
  if (sl.c) sl.c.root.visible = false;
  sl.mon = m;
  let c = sl.cache.get(m.id);
  if (!c) { c = new Creature(m.id); sl.cache.set(m.id, c); scene.add(c.root); }
  sl.c = c; c.root.visible = true;
  const t = sl.pose; t.w = 0; t.mv = t.a = t.s = t.h = t.sw = t.sl = t.bl = t.gl = t.lk = t.u = 0;
  sl.yaw = -m.face; sl.yawV = 0; t.vf = t.vs = t.af = t.as = t.va = t.tn = t.yr = t.hd = t.hx = t.hz = 0; sl.lx = wx(m.x); sl.lz = wz(m.y); sl.sq = sl.sqv = sl.swv = sl.slv = 0; sl.st = m.state; sl.blT = 1 + Math.random() * 3; sl.amb = 0; sl.stepN = 0; sl.lh = 0;
}
function styleOf(mv) {
  if (mv.shape === 'line' && mv.range < 240) return 'melee';
  if (mv.shape === 'lob' && mv.cat === 'phys') return 'melee';
  return STYLE[mv.shape] || 'melee';
}
function ambient(sl, m, c, X, Y, Z, dt) {
  sl.amb += dt;
  if (sl.amb < 0.1) return;
  sl.amb = 0;
  const F = c.worldOf(c.def.focus || 'root', _v2) || _v2.set(X, Y + 0.6, Z);
  fx.ambient(m.d.types[0], F.x, F.y, F.z, X, Y, Z, m.r * S);
  if (Math.random() < 0.35) fx.ambient(m.d.types[1] || m.d.types[0], F.x, F.y, F.z, X, Y, Z, m.r * S);
}

function updMon(b, m, alpha, ui, dt) {
  const si = m.side, sl = slots[si], bar = bars[si];
  bar.on = false;
  if (m.state === 'bench') { if (sl.c) sl.c.root.visible = false; hideAux(sl); return; }
  if (sl.mon !== m || !sl.c) newMon(sl, m);
  const c = sl.c, d = m.d, t = sl.pose, sc = G.SIZE[d.size].sc * VIS, R = m.r * S;
  const gx = m.px + (m.x - m.px) * alpha, gy = m.py + (m.y - m.py) * alpha, X = wx(gx), Z = wz(gy), foe = b.active(1 - si);
  let q, e, n, tg;
  // turn to the aim direction
  // a spring with a top speed turns the body: it starts, swings and settles with weight
  let dy = -m.face - sl.yaw, turn = 0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  if (dt > 0) {
    const wn = TURN[d.size] * (m.state === 'idle' || m.state === 'rec' || m.state === 'stun' ? 1 : 1.6), h = Math.min(dt, 0.033);
    sl.yawV += (dy * wn * wn - sl.yawV * 1.75 * wn) * h;
    sl.yawV = clamp(sl.yawV, -wn * 0.9, wn * 0.9);
    turn = sl.yawV * h;
    if (turn * dy > 0 && Math.abs(turn) > Math.abs(dy)) { turn = dy; sl.yawV *= 0.4; }
    sl.yaw += turn; dy -= turn;
  }
  const cs = Math.cos(sl.yaw), sn = Math.sin(sl.yaw);
  const ddx = X - sl.lx, ddz = Z - sl.lz, dist = Math.sqrt(ddx * ddx + ddz * ddz), tele = dist > 1.4;
  sl.lx = X; sl.lz = Z;
  if (dt > 0) {
    const vx = tele ? 0 : ddx / dt, vz = tele ? 0 : ddz / dt, vf = vx * cs - vz * sn, vs = vx * sn + vz * cs;
    t.tm += dt; t.p += dt * (2.6 + 2.4 * t.a); t.o += dt * (1.3 + 4 * t.a + 2 * t.s);
    const moving = m.moving || m.state === 'dash' || m.state === 'dodge';
    // a turn on the spot: the legs take small steps
    const tip = (m.state === 'idle' || m.state === 'rec') ? Math.min(1, Math.abs(sl.yawV) / 5) : 0;
    t.mv += ((moving ? 1 : tip > 0.15 ? 0.5 * tip : 0) - t.mv) * Math.min(1, dt * 10);
    if (!tele) t.w += dist * 3.9 / sc;
    if (!moving) t.w += Math.abs(turn) * 2.2;
    // speed and acceleration of the body in its own axes, in model units (for lean and for the spring bones)
    const im = 1 / sc, nvf = tele ? 0 : vf * im, nvs = tele ? 0 : vs * im, kq = Math.min(1, dt * 16);
    t.af += (clamp((nvf - t.vf) / dt, -70, 70) - t.af) * kq; t.as += (clamp((nvs - t.vs) / dt, -70, 70) - t.as) * kq;
    t.vf = nvf; t.vs = nvs; t.va = clamp((m.z - sl.lh) * S * im / dt, -12, 12);
    t.yr = sl.yawV; t.tn += (clamp(-sl.yawV / 6, -1, 1) - t.tn) * Math.min(1, dt * 14);
    t.hd += (clamp(-dy, -1.3, 1.3) - t.hd) * Math.min(1, dt * 18);
    tg = m.state === 'wind' ? Math.min(1, (1 - m.st / m.stMax) * 1.6) : m.state === 'special' ? 1 : m.guarding ? 0.3 : 0;
    tg = tg * tg * (3 - 2 * tg);   // ease in and out
    t.a += (tg - t.a) * Math.min(1, dt * (tg > t.a ? 14 : 22));
    if (m.cur) t.k = m.cur.isSig ? (m.cur.shape === 'self' ? 'buff' : 'slam') : styleOf(m.cur);
    if (sl.st === 'wind' && (m.state === 'rec' || m.state === 'dash' || m.state === 'idle')) { t.s = 1; sl.sqv += 2.2; }
    if (m.state === 'dash') t.s = 1; else t.s = t.s > 0.012 ? t.s * Math.exp(-dt * 5.2) : 0;   // fast out, slow settle
    if (m.hitFlash > 0) {
      if (t.h < 0.5) {
        sl.sqv -= 2.6;
        // the direction of the push, in the axes of the body: away from the opponent
        const hxw = X - wx(foe.x), hzw = Z - wz(foe.y), hl = Math.sqrt(hxw * hxw + hzw * hzw) || 1;
        t.hx = (hxw * cs - hzw * sn) / hl; t.hz = (hxw * sn + hzw * cs) / hl;
      }
      t.h = 1;
    }
    else if (m.state === 'stun' || m.state === 'faint') t.h = 1;
    else t.h = Math.max(0, t.h - dt * 3.5);
    tg = clamp(vf / 4.8, -1, 1); sl.swv += ((tg - t.sw) * 90 - sl.swv * 9) * dt; t.sw = clamp(t.sw + sl.swv * dt, -1.5, 1.5);
    tg = clamp(-vs / 4.8 - turn / dt * 0.1, -1, 1); sl.slv += ((tg - t.sl) * 90 - sl.slv * 9) * dt; t.sl = clamp(t.sl + sl.slv * dt, -1.5, 1.5);
    if (sl.lh > 6 && m.z <= 1) { sl.sqv -= 3; fx.burst(X, 0.08, Z, 12, '#d8d0c0', 2.4, 0.5, 0.3, { solid: true, flat: true, up: 0.6, grow: 1.2 }); }
    if (sl.st === 'enter' && m.state !== 'enter') { sl.sqv -= 4; fx.ring(X, Z, 0.2, R * 3, 0.35, G.TCOL[d.types[0]], 0.2); fx.burst(X, 0.08, Z, 16, '#e8e0d0', 3, 0.5, 0.3, { solid: true, flat: true, up: 0.6, grow: 1.2 }); }
    sl.sqv += (-sl.sq * 220 - sl.sqv * 15) * dt; sl.sq = clamp(sl.sq + sl.sqv * dt, -0.35, 0.35); sl.lh = m.z;
    sl.blT -= dt;
    if (sl.blT < 0) { t.bl = 1; if (sl.blT < -0.12) { t.bl = 0; sl.blT = 1.8 + Math.random() * 3.6; } }
    if (m.status === 'sleep') t.bl = 1;
    const fxx = wx(foe.x) - X, fzz = wz(foe.y) - Z, fl = Math.sqrt(fxx * fxx + fzz * fzz) || 1;
    // the eyes follow the opponent. At rest they also look round a little.
    const glance = m.state === 'idle' && !moving ? 0.32 * Math.sin(time * 0.61 + si * 3.1) * Math.sin(time * 0.37 + si) : 0;
    t.lk += (clamp(-(fxx * sn + fzz * cs) / fl * 1.3 + glance, -1, 1) - t.lk) * Math.min(1, dt * 6);
    t.gl += ((m.charge >= 100 ? 1 : 0) - t.gl) * Math.min(1, dt * 4);
    // u: the ultimate is active (wind-up, the action, and the time that its form lasts)
    tg = (m.cur && m.cur.isSig && (m.state === 'wind' || m.state === 'special' || m.state === 'rec')) || m.bulwark > 0 || m.cyclone > 0 || m.veil > 0.05 || m.ultT > 0 ? 1 : 0;
    t.u += (tg - t.u) * Math.min(1, dt * (tg > t.u ? 7 : 3));
    sl.st = m.state;
  }
  // whole-body motion for each state
  let ox = 0, oy = 0, oz = 0, sx = 1, sy = 1, rx = 0, rz = 0, fade = 1, fa = 0, fr = 1.5, fg = 1.5, fb = 1.5;
  const Y = m.z * S + (d.hover ? Math.sin(time * 2.4 + si * 2) * 0.05 : 0), tc = G.TCOL[d.types[0]];
  sl.beam.visible = false;
  switch (m.state) {
    case 'enter':
      q = clamp(1 - m.st / m.stMax, 0, 1); e = 1 - q;
      oy = e * e * 2.6; sx = 0.72 + 0.28 * q; sy = 1.3 - 0.3 * q; fade = Math.min(1, 0.1 + q * 3.5); fa = e;
      if (e > 0.02) { n = R * (1.1 + 1.0 * e) * (0.94 + 0.06 * Math.sin(time * 16)); sl.beam.visible = true; sl.beam.position.set(X, 0, Z); sl.beam.scale.set(n, 9, n); sl.beam.material.uniforms.uCol.value.copy(lin(tc)); sl.beam.material.uniforms.uA.value = Math.min(1, e * 1.5); }
      if (dt > 0 && Math.random() < 0.6) fx.spark(X + (Math.random() - 0.5) * R * 2, Math.random() * 2.5, Z + (Math.random() - 0.5) * R * 2, 0, 2.5, 0, 0.5, 0.16, tc, 0, 0);
      break;
    case 'faint':
      q = clamp(1 - m.st / m.stMax, 0, 1);
      if (q < 0.3) { ox = Math.sin(time * 70) * 0.03; fa = Math.sin(time * 40) > 0 ? 0.8 : 0.15; }
      else {
        e = (q - 0.3) / 0.7; rx = e * 1.35; sy = 1 - 0.3 * e; sx = 1 - 0.15 * e; fade = 1 - e * e; fa = 0.3 + 0.7 * e;
        if (dt > 0 && Math.random() < 0.8) fx.spark(X + (Math.random() - 0.5) * R * 2, Math.random() * 0.8, Z + (Math.random() - 0.5) * R * 2, 0, 1.4 + Math.random() * 1.4, 0, 0.8, 0.2, Math.random() < 0.5 ? '#ffffff' : tc, 0, 0);
      }
      break;
    case 'wind': q = clamp(1 - m.st / m.stMax, 0, 1); e = q * (2 - q); sx = 1 + 0.06 * e; sy = 1 - 0.06 * e; if (q > 0.6) oz = Math.sin(time * 60) * 0.012; break;
    case 'rec':
      q = m.st / m.stMax;
      if (m.cur) { n = m.cur.shape; if (n === 'cone' || n === 'dash') ox = 0.22 * q * q; else if (n === 'nova' || n === 'ring' || n === 'self' || n === 'zone') oy = 0.2 * Math.sin(q * PI); else ox = -0.1 * q * q; }
      break;
    case 'stun': rz = Math.sin(time * 9) * 0.14; rx = Math.cos(time * 7) * 0.08; break;
    case 'dodge': {
      const dvx = m.dvx || 0, dvy = m.dvy || 0, dl = Math.sqrt(dvx * dvx + dvy * dvy) || 1, lf = (dvx * cs - dvy * sn) / dl, ls = (dvx * sn + dvy * cs) / dl;
      sx = 1.12; sy = 0.9; rz = -lf * 0.4; rx = ls * 0.4;
      if (dt > 0) fx.spark(X + (Math.random() - 0.5) * R, 0.3 + Math.random() * 0.8, Z + (Math.random() - 0.5) * R, 0, 0, 0, 0.25, 0.3, tc, 0, 0);
      break;
    }
    case 'dash':
      sx = 1.16; sy = 0.88; rz = -0.2;
      if (dt > 0) fx.dashFx(d.types[0], X, Z, cs, -sn, R);
      break;
    case 'special': oy = 0.08 + Math.sin(time * 5) * 0.04; if (dt > 0 && !(m.sp && m.sp.untarget)) fx.spark(X + (Math.random() - 0.5) * R * 2, Math.random() * 1.2, Z + (Math.random() - 0.5) * R * 2, 0, 1.5, 0, 0.4, 0.2, tc, 0, 0); break;
  }
  // the whole body: lean into a turn and into a side step, dip with the acceleration, rock with a hit, bob with each step
  if (m.state !== 'faint' && m.state !== 'enter') {
    const spd = Math.min(1, Math.sqrt(t.vf * t.vf + t.vs * t.vs) / 2.6), hov = d.hover ? 1 : 0;
    rx += t.tn * (hov ? 0.30 : 0.15) * (0.3 + 0.7 * spd) + clamp(t.vs / 2.6, -1, 1) * (hov ? 0.16 : 0.05);
    rz -= clamp(t.af / 45, -1, 1) * (hov ? 0.15 : 0.06) + clamp(t.vf / 2.6, -1, 1) * (hov ? 0.07 : 0);
    if (t.h > 0) { rz -= t.hx * 0.15 * t.h; rx += t.hz * 0.15 * t.h; }
    if (!hov && m.z < 1) oy += Math.abs(Math.sin(t.w)) * 0.045 * t.mv;
  }
  if (m.iframes > 0 && m.state !== 'enter') fade *= 0.55;
  if (m.veil > 0) fade *= si === ui.me ? 0.5 : 0.1;
  if (m.hitFlash > 0) fa = 0.85;
  else if (fa <= 0 && m.bulwark > 0) { fa = 0.3 + 0.12 * Math.sin(time * 10); }
  else if (fa <= 0 && m.status && STATUS_TINT[m.status]) { const tcn = lin(STATUS_TINT[m.status]); fr = tcn.r * 1.2; fg = tcn.g * 1.2; fb = tcn.b * 1.2; fa = 0.2 + 0.1 * Math.sin(time * 5); }
  c.root.visible = !m.hidden && fade > 0.02;
  c.root.position.set(X, Y, Z); c.root.rotation.y = sl.yaw; c.root.scale.setScalar(sc);
  c.model.position.set(ox, oy / sc, oz); c.model.rotation.set(rx, 0, rz);
  c.model.scale.set(sx * (1 - sl.sq * 0.7), sy * (1 + sl.sq), sx * (1 - sl.sq * 0.7));
  c.fade(fade); c.flash(fr, fg, fb, fa);
  c.update(t);
  // marks and auras around the creature
  sl.shield.visible = sl.cage.visible = sl.cyc.visible = false;
  if (m.hidden) { fx.tele.put(3, X, Z, 0.04, R * (0.7 + 0.4 * Math.sin(time * 14)), 0, { col: lin('#a08cff'), w: 0.05, a: 0.7, hdr: 1.6 }); return; }
  if (m.state === 'faint' || m.state === 'enter') return;
  const top = (c.def.top || (c.bp.geo.boundingBox.max.y + 0.15)) * sc;
  if (m.charge >= 100) {
    fx.tele.put(3, X, Z, 0.045, R + 0.2, 0, { col: GOLD, w: 0.06, a: 0.55 + 0.3 * Math.sin(time * 6), hdr: 2 });
    if (dt > 0 && Math.random() < 0.35) { q = Math.random() * TAU; fx.spark(X + Math.cos(q) * (R + 0.15), 0.05, Z + Math.sin(q) * (R + 0.15), 0, 1.6, 0, 0.6, 0.13, '#ffe27a', 0, 0); }
  }
  if (m.cyclone > 0) {
    sl.cyc.visible = true; sl.cyc.position.set(X, 0, Z);
    for (n = 0; n < sl.cyc.children.length; n++) sl.cyc.children[n].rotation.z = time * (5 + n * 1.3) + n * 1.6;
    if (dt > 0) { q = Math.random() * TAU; fx.spark(X + Math.cos(q) * 2.8, 0.2 + Math.random() * 2, Z + Math.sin(q) * 2.8, -Math.sin(q) * 5, 0.5, Math.cos(q) * 5, 0.4, 0.16, '#dfe6ff', 0, 0); }
  }
  if (m.guarding) {
    sl.shield.visible = true; sl.shield.position.set(X, Y + top * 0.5, Z); sl.shield.scale.setScalar(Math.max(R + 0.3, top * 0.62));
    sl.shield.material.uniforms.uCol.value.copy(lin(m.guardT < 0.18 ? '#fff7b0' : tc)); sl.shield.material.uniforms.uA.value = 0.9;
  }
  if (m.bulwark > 0) { sl.cage.visible = true; sl.cage.position.set(X, Y + top * 0.5, Z); sl.cage.scale.setScalar(Math.max(R + 0.45, top * 0.7)); sl.cage.rotation.y = time * 0.6; }
  if (dt > 0) {
    ambient(sl, m, c, X, Y, Z, dt);
    sl.stat += dt;
    if (sl.stat > 0.09) {
      sl.stat = 0;
      const px = X + (Math.random() - 0.5) * R * 2, pz = Z + (Math.random() - 0.5) * R * 2, py = Y + Math.random() * top;
      if (m.status && m.status !== 'sleep') fx.statusFx(m.status, px, py, pz);
      else if (m.status === 'sleep' && Math.random() < 0.25) HUD.floatTxt(gx + 14, gy, top / S + 6, 'z', '#ffffff', 14, 0.9);
      if (m.slowT > 0) fx.spark(px, 0.05, pz, 0, 0.5, 0, 0.4, 0.16, '#f065a8', 0, 0);
    }
    if (m.conf > 0 || m.state === 'stun') for (n = 0; n < 3; n++) { q = time * 6 + n * TAU / 3; fx.starAt(X + Math.cos(q) * 0.36, Y + top + 0.12 + Math.sin(q * 2) * 0.04, Z + Math.sin(q) * 0.36, m.conf > 0 ? '#ffd0f0' : '#fff27a'); }
    if (!d.hover && t.mv > 0.5 && m.z < 1) {
      n = Math.floor(t.w / PI);
      if (n !== sl.stepN) { sl.stepN = n; fx.puff(X - cs * 0.2, 0.06, Z + sn * 0.2, -cs * 0.6, 0.4, sn * 0.6, 0.4, 0.22, '#d8d0c0', 0, 2, 1.4); fx.puff(X - cs * 0.1, 0.06, Z + sn * 0.1, -cs * 0.3, 0.6, sn * 0.3, 0.32, 0.18, '#d8d0c0', 0, 2, 1.4); }
    }
  }
  bar.on = true; bar.x = gx; bar.y = gy; bar.h = (Y + top) / S + 12; bar.f = m.hp / m.maxHp; bar.side = si;
}

// ---- telegraphs, zones, shots ------------------------------------------------------------
function drawTele(m, alpha, me) {
  const mv = m.cur, X = wx(m.px + (m.x - m.px) * alpha), Z = wz(m.py + (m.y - m.py) * alpha), q = clamp(1 - m.st / m.stMax, 0, 1);
  const col = lin(G.TCOL[mv.type]), edge = m.side === me ? WHITE : RED;
  switch (mv.shape) {
    case 'cone': fx.tele.put(1, X, Z, 0.04, mv.range * S, m.aimA, { col, edge, arc: mv.arc * PI / 360, fill: 0.2, q, w: 0.035 }); break;
    case 'line': case 'dash': case 'proj': {
      const len = (mv.shape === 'dash' ? mv.dist + m.r : mv.range) * S, w = (mv.shape === 'proj' ? mv.pr * 2 : mv.width) * S;
      fx.tele.put(2, X, Z, 0.04, len, m.aimA, { col, edge, wid: Math.max(0.12, w), fill: 0.2, q, a: mv.shape === 'proj' ? 0.5 : 1, w: 0.03 });
      break;
    }
    case 'nova': case 'ring': fx.tele.put(0, X, Z, 0.04, mv.radius * S, 0, { col, edge, fill: 0.18, q, w: 0.04 }); break;
    case 'lob': case 'zone': fx.tele.put(0, wx(m.aimX), wz(m.aimY), 0.04, mv.radius * S, 0, { col, edge, fill: 0.18, q, w: 0.04 }); break;
  }
}
const D4 = new THREE.Object3D();
function drawZones(b, me, dt) {
  let ns = 0, i, k;
  for (i = 0; i < b.zones.length; i++) {
    const z = b.zones[i], a = Math.min(1, z.t / 0.3, (z.dur - z.t) / 0.8), col = ZCOL[z.kind] || '#ffffff', X = wx(z.x), Z = wz(z.y), R = z.radius * S;
    if (a <= 0) continue;
    fx.zone(ZK[z.kind] || 0, X, Z, R, a, col, z.side === me ? col : '#ff5a5a');
    const sk = SPK[z.kind];
    if (sk) for (k = 0; k < 14 && ns < 120; k++, ns++) {
      // reef and basalt stand in a ring. Other spikes fill the circle.
      const ringed = z.kind === 'reef' || z.kind === 'basalt', an = ringed ? k / 14 * TAU + i : k * 2.4 + i, rr = ringed ? R * (0.82 + (k % 3) * 0.06) : R * Math.sqrt((k + 0.5) / 14) * 0.9, sc = a * (0.8 + (k % 3) * 0.25) * sk[1];
      D4.position.set(X + Math.cos(an) * rr, 0.12 * sc, Z + Math.sin(an) * rr); D4.rotation.set(Math.sin(k * 7) * 0.3, k, Math.cos(k * 5) * 0.3); D4.scale.setScalar(sc); D4.updateMatrix(); spikes.setMatrixAt(ns, D4.matrix);
      spikes.setColorAt(ns, lin(z.kind === 'reef' && k % 3 === 0 ? '#f4ece4' : sk[0]));
    }
    if (dt > 0 && Math.random() < 0.3 + R * 0.12) {
      const an = Math.random() * TAU, rr = R * Math.sqrt(Math.random()), px = X + Math.cos(an) * rr, pz = Z + Math.sin(an) * rr;
      if (z.kind === 'steam') fx.puff(px, 0.15, pz, 0, 0.7, 0, 1.3, 0.55, '#ffffff', -0.2, 1, 1.4);
      else fx.zoneFx(ZFX[z.kind] || z.kind, px, pz, X, Z);
    }
  }
  spikes.count = ns; spikes.instanceMatrix.needsUpdate = true; if (spikes.instanceColor) spikes.instanceColor.needsUpdate = true;
}
function drawPend(b, me, alpha, dt) {
  let nl = 0;
  for (let i = 0; i < b.pend.length; i++) {
    const p = b.pend[i], col = lin(G.TCOL[p.type] || '#ffffff'), X = wx(p.x), Z = wz(p.y);
    if (p.k === 'blast') {
      const a = clamp(1 - p.t / p.T, 0, 1);
      fx.tele.put(0, X, Z, 0.045, p.radius * S, 0, { col, edge: p.side === me ? WHITE : RED, fill: 0.2, q: a, w: 0.045 });
      if (nl < lobs.length) {
        const L = lobs[nl++], u = L.userData, src = p.src;
        let sx = X, sz = Z, sy = 6;
        if (src) { sx = wx(src.x); sz = wz(src.y); sy = 0.8; }
        L.visible = true;
        L.position.set(sx + (X - sx) * a, src ? sy * (1 - a) + Math.sin(a * PI) * 3.2 + 0.2 : 0.3 + (1 - a) * (1 - a) * 6, sz + (Z - sz) * a);
        L.scale.setScalar(clamp(p.radius * S * 0.3, 0.6, 1.6)); u.core.rotation.x += dt * 7; u.core.rotation.z += dt * 5;
        u.core.material.color.copy(col); u.core.material.emissive.copy(col); u.sp.material.color.copy(col);
        if (dt > 0) fx.spark(L.position.x, L.position.y, L.position.z, (Math.random() - 0.5) * 0.6, 0.3, (Math.random() - 0.5) * 0.6, 0.35, 0.24, G.TCOL[p.type] || '#ffffff', 0, 0);
      }
    } else {
      fx.tele.put(3, X, Z, 0.06, Math.max(0.2, p.r * S), 0, { col, w: 0.34, a: 0.85, hdr: 1.8 });
      fx.tele.put(3, X, Z, 0.07, Math.max(0.2, p.r * S), 0, { col: WHITE, w: 0.06, a: 0.9, hdr: 2 });
      if (dt > 0) for (let n = 0; n < 2; n++) { const an = Math.random() * TAU; fx.spark(X + Math.cos(an) * p.r * S, 0.1, Z + Math.sin(an) * p.r * S, 0, 1.6, 0, 0.3, 0.2, G.TCOL[p.type] || '#ffffff', 0, 0); }
    }
  }
  for (; nl < lobs.length; nl++) lobs[nl].visible = false;
}
function drawProj(b, alpha, dt) {
  let nd = 0;
  for (const [, g] of projLive) g.userData.seen = false;
  for (let i = 0; i < b.proj.length; i++) {
    const p = b.proj[i], ppx = p.px === undefined ? p.x : p.px, ppy = p.py === undefined ? p.y : p.py;
    const X = wx(ppx + (p.x - ppx) * alpha), Z = wz(ppy + (p.y - ppy) * alpha), yaw = Math.atan2(-p.vy, p.vx), col = G.TCOL[p.type] || '#ffffff';
    if (p.decoy) {
      let dc = decoys[nd];
      if (!dc) { dc = decoys[nd] = new Creature(p.sprite); dc.pose = newPose(); scene.add(dc.root); }
      nd++;
      const t = dc.pose; t.tm = time + nd; t.p = time * 3 + nd; t.w = time * 9; t.o = time * 2; t.mv = 1; t.sw = 0.6;
      dc.root.visible = true; dc.root.position.set(X, 0.05, Z); dc.root.rotation.y = yaw; dc.root.scale.setScalar(G.SIZE[G.DEX[p.sprite].size].sc * VIS);
      dc.fade(0.6); dc.flash(1.6, 1.5, 0.6, 0.3 + 0.15 * Math.sin(time * 20)); dc.update(t);
      if (dt > 0) fx.spark(X + (Math.random() - 0.5) * 0.5, 0.4 + Math.random() * 0.6, Z + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 0.15, 0.16, '#fff7a0', 0, 0);
      continue;
    }
    let g = projLive.get(p.id);
    if (!g) { const pool = projPool[p.type]; g = pool && pool.length ? pool.pop() : makeProj(p.type); projLive.set(p.id, g); }
    const u = g.userData; u.seen = true; g.visible = true;
    g.position.set(X, H0, Z); g.rotation.y = yaw; g.scale.setScalar(p.r * S * 1.15);
    if (u.spin) u.core.rotateX(u.spin * dt); if (u.tumble) { u.core.rotation.x += u.tumble * dt; u.core.rotation.z += u.tumble * 0.7 * dt; }
    if (u.yspin) u.core.rotation.z += u.yspin * dt;
    if (u.wob) u.core.scale.set(1 + 0.15 * Math.sin(time * 14), 1 - 0.15 * Math.sin(time * 14), 1 + 0.1 * Math.cos(time * 11));
    if (u.ring) u.ring.rotation.set(time * 3, time * 2, 0);
    if (p.frozen > 0) fx.tele.put(3, X, Z, 0.05, p.r * S + 0.2, 0, { col: lin('#f065a8'), w: 0.05, a: 0.9, hdr: 1.6 });
    else if (dt > 0) fx.trail(p.type, X, H0, Z, p.vx * S, p.vy * S, p.r * S);
  }
  for (const [id, g] of projLive) if (!g.userData.seen) { g.visible = false; (projPool[g.userData.type] = projPool[g.userData.type] || []).push(g); projLive.delete(id); }
  for (; nd < decoys.length; nd++) decoys[nd].root.visible = false;
}
function drawRain(on, dt) {
  rain.visible = on;
  if (!on) return;
  for (let i = 0; i < 160; i++) {
    const x = -8 + ((i * 97.3 + time * 3) % 16), z = -3.6 + ((i * 53.7 + i * i * 0.37) % 7.2), y = 7 - ((i * 0.613 + time * 13) % 7), j = i * 6;
    rainPos[j] = x; rainPos[j + 1] = y; rainPos[j + 2] = z; rainPos[j + 3] = x - 0.06; rainPos[j + 4] = y + 0.36; rainPos[j + 5] = z;
  }
  rain.geometry.attributes.position.needsUpdate = true;
  if (dt > 0 && Math.random() < 0.5) fx.ring(-7.6 + Math.random() * 15.2, -3.3 + Math.random() * 6.6, 0.03, 0.22, 0.4, '#bfe0ff', 0.03);
}

// ---- one frame ----------------------------------------------------------------------------
World.draw = function (b, alpha, dt, ui) {
  let i, m;
  time += dt;
  const me = meSide = ui.me, a0 = b.active(0), a1 = b.active(1);
  fx.begin();
  // Build the creatures of the 2 teams before they enter, one in each frame, so that a switch has no pause.
  if (b !== warmB) { warmB = b; warmQ.length = 0; for (i = 0; i < 2; i++) for (m of b.sides[i].team) if (!slots[i].cache.has(m.id)) warmQ.push(i, m.id); }
  if (warmQ.length) {
    const wid = warmQ.pop(), wsi = warmQ.pop(), wsl = slots[wsi];
    if (!wsl.cache.has(wid)) {
      try {
        const wc = new Creature(wid);
        wsl.cache.set(wid, wc); scene.add(wc.root);
        renderer.compile(wc.root, camera, scene);
        wc.root.visible = false;
      } catch (e) { /* the creature is built when it enters */ }
    }
  }
  arena.update(dt, time);
  drawZones(b, me, dt);
  for (i = 0; i < 2; i++) { m = i ? a1 : a0; if (m.state === 'wind' && m.cur && m.cur.shape !== 'self') drawTele(m, alpha, me); }
  drawPend(b, me, alpha, dt);
  ults.update(dt);
  if (!ui.auto) {   // aim guide of the player
    m = b.active(me);
    if (!m.fainted && m.state !== 'bench' && m.state !== 'faint' && m.state !== 'enter') {
      const X = wx(m.px + (m.x - m.px) * alpha), Z = wz(m.py + (m.y - m.py) * alpha), ax = wx(ui.mx), az = wz(ui.my), len = Math.sqrt((ax - X) * (ax - X) + (az - Z) * (az - Z));
      if (len > 0.5) fx.tele.put(2, X, Z, 0.035, len, Math.atan2(az - Z, ax - X), { col: WHITE, wid: 0.045, fill: 0.5, a: 0.3, w: 0.0001 });
      fx.tele.put(3, ax, az, 0.04, 0.2, 0, { col: WHITE, w: 0.035, a: 0.85, hdr: 1.3 });
    }
  }
  updMon(b, a0, alpha, ui, dt); updMon(b, a1, alpha, ui, dt);
  drawProj(b, alpha, dt);
  drawRain(!!b.weather, dt);
  // darkness of Nightfall: the lights go down, glow parts stay bright
  // the start of an ultimate: the light goes down for a moment and the camera moves in a little
  if (cine > 0) cine = Math.max(0, cine - dt / 1.2);
  const ck = Math.min(1, cine * 3) * Math.min(1, cine * 3);
  const dk = (b.dark ? (b.dark.side === me ? 0.5 : 0.28) : 1) * (1 - 0.42 * ck);
  if (camera.fov !== fov0 * (1 - 0.045 * ck)) { camera.fov = fov0 * (1 - 0.045 * ck); camera.updateProjectionMatrix(); }
  darkK += (dk - darkK) * Math.min(1, dt * 5 + (dt === 0 ? 1 : 0));
  lights.key.intensity = themeDef.keyK * darkK * (b.weather ? 0.8 : 1); lights.hemi.intensity = 0.55 * darkK; lights.back.intensity = 1.5 * darkK;
  renderer.toneMappingExposure = 0.62 + 0.38 * darkK;
  fx.end(); fx.update(dt);
  let sx = 0, sy = 0;
  if (shake > 0.2) { sx = (Math.random() - 0.5) * shake * S * 1.3; sy = (Math.random() - 0.5) * shake * S * 1.3; shake *= Math.exp(-9 * dt); } else shake = 0;
  placeCamera(0, 0);
  HUD.draw(b, ui, dt, proj, bars);
  placeCamera(sx, sy);
  if (comp) comp.render(); else renderer.render(scene, camera);
  governGfx(dt);
};
World.scene = () => scene;
