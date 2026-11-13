/* Arena Beasts - 3D start-up. Builds the creature models, makes the portraits, gives the game its renderer (G.R),
   then loads the game files (js/state.js has the list). The classic scripts (data, engine, ai, audio, net, ui) are loaded before this module. */
import * as THREE from 'three';
import { makeRenderer, setEnv, lightRig, GFX, LEVELS, gfxLevel } from './stage.js';
import { Creature, newPose, blueprint, hasDef, register, FINISH } from './rig.js';
import { HUD } from './hud.js';
import { World } from './world.js';

const G = window.G;
const R = G.R = { W: 960, H: 540, theme: '', buttons: HUD.buttons };
Object.defineProperty(R, 'hitstop', { get: () => World.hitstop, set: v => { World.hitstop = v; } });
R.init = cv => { HUD.init(cv); World.init(document.getElementById('gl')); window.addEventListener('resize', R.resize); };
R.resize = () => { HUD.resize(); World.resize(); };
R.toLogical = HUD.toLogical; R.toArena = World.toArena; R.hitButton = HUD.hitButton;
// graphics quality for the menu: { mode, level name, soft (no graphics card support), gpu }
R.gfx = () => ({ mode: GFX.mode, level: LEVELS[GFX.level].name, soft: GFX.soft, gpu: GFX.gpu });
R.setGfx = mode => {
  World.setGfx(mode);
  // the menu preview uses the same clear coat setting: build its creatures again
  for (const k in pv.cre) { pv.scene.remove(pv.cre[k].root); pv.cre[k].dispose(); delete pv.cre[k]; }
  pv.cur = null; pv.w = 0;
};
R.buildArena = () => {};
R.reset = (seed) => { R.theme = World.reset(seed); };
R.banner = HUD.banner; R.consume = World.consume; R.draw = World.draw;

// ---- small second renderer: portraits and the live menu preview ----------------------------
const pv = { canvas: document.getElementById('stagecv') || document.createElement('canvas'), cre: {}, size: 0, pose: newPose(), t: 0, cur: null };
function initPreview() {
  FINISH.on = gfxLevel().coat;
  pv.r = makeRenderer(pv.canvas, { alpha: true, exposure: 1.05, shadows: !GFX.soft });
  pv.r.setClearColor(0x000000, 0); pv.r.setPixelRatio(1);
  pv.scene = new THREE.Scene(); setEnv(pv.r, pv.scene);
  lightRig(pv.scene, { keyK: 2.7, hemiK: 0.9, area: 4, map: 1024 });
  pv.cam = new THREE.PerspectiveCamera(24, 1, 0.1, 60);
  // pedestal of the stage
  pv.ped = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.07, 0.14, 64), new THREE.MeshStandardMaterial({ color: '#14213a', roughness: 0.4, metalness: 0.4 }));
  top.position.y = -0.07; top.receiveShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.028, 10, 72), new THREE.MeshStandardMaterial({ color: '#ffc83d', roughness: 0.3, metalness: 0.7, emissive: '#ffc83d', emissiveIntensity: 0.3 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.004;
  pv.ped.add(top, rim); pv.ped.visible = false; pv.scene.add(pv.ped);
}
function pvCreature(id) {
  let c = pv.cre[id];
  if (!c) {
    c = pv.cre[id] = new Creature(id); pv.scene.add(c.root);
    c.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(c.root), sz = box.getSize(new THREE.Vector3()), ce = box.getCenter(new THREE.Vector3());
    c.view = { cx: ce.x, cy: ce.y, cz: ce.z, r: Math.max(0.6, sz.length() * 0.5), hy: box.max.y, fr: Math.hypot(Math.max(-box.min.x, box.max.x), Math.max(-box.min.z, box.max.z)) };
  }
  return c;
}
function pvRender(c, yaw, w, h, zoom, pitch, stage) {
  if (pv.w !== w || pv.h !== h) { pv.r.setSize(w, h, false); pv.w = w; pv.h = h; pv.cam.aspect = w / h; pv.cam.updateProjectionMatrix(); }
  for (const k in pv.cre) pv.cre[k].root.visible = pv.cre[k] === c;
  c.root.rotation.y = yaw;
  const v = c.view, cs = Math.cos(yaw), sn = Math.sin(yaw), half = Math.tan(pv.cam.fov * Math.PI / 360), fit = Math.min(half, half * pv.cam.aspect);
  pv.ped.visible = !!stage;
  if (stage) {   // the creature turns on the pedestal; the camera stays on the centre line
    const fr = Math.max(0.7, v.fr * 0.82), r = Math.max(v.fr * 0.92, v.hy * 0.6), d = r / fit / zoom, ty = v.hy * 0.5 + r * 0.06;
    pv.ped.scale.set(fr, 1, fr);
    pv.cam.position.set(0, ty + Math.sin(pitch) * d, Math.cos(pitch) * d); pv.cam.lookAt(0, ty, 0);
  } else {
    const tx = v.cx * cs + v.cz * sn, tz = -v.cx * sn + v.cz * cs, d = v.r / fit / zoom;
    pv.cam.position.set(tx, v.cy + Math.sin(pitch) * d, tz + Math.cos(pitch) * d); pv.cam.lookAt(tx, v.cy, tz);
  }
  pv.r.render(pv.scene, pv.cam);
}
// Simple stand-in for a creature whose model file is not there.
function standIn(id) {
  const col = G.TCOL[G.DEX[id].types[0]], hov = G.DEX[id].hover ? 0.5 : 0;
  return {
    id, focus: 'body', top: 1.2 + hov,
    build(S) {
      S.bone('root', null, [0, 0, 0]).bone('body', 'root', [0, 0.55 + hov, 0]);
      S.color(col); S.ell('body', [0, 0.55 + hov, 0], [0.5, 0.5, 0.45]); S.ell('body', [0.1, 0.3 + hov, 0], [0.36, 0.2, 0.34], { paint: 1, col: '#f0ead8', cb: 0.08 });
      S.eye('body', [0.38, 0.68 + hov, 0.2], 0.1, { dir: [0.8, 0.1, 0.55], iris: '#2a2a3a', lid: col, m: 1 });
    },
    anim(b, t) { b.body.position.y += Math.sin(t.p) * 0.03 + Math.abs(Math.sin(t.w)) * 0.08 * t.mv; b.body.position.x += t.s * 0.25 - t.a * 0.15; b.body.rotation.z = t.h * 0.3 - t.a * 0.2; }
  };
}
const PORT = 256;
function portrait(id) {
  const c = pvCreature(id), t = newPose(); t.p = 0.9; t.tm = 0.4; t.lk = -0.3;
  c.update(t);
  pvRender(c, -0.72, PORT, PORT, 1.12, 0.2, false);
  const out = document.createElement('canvas'); out.width = out.height = PORT;
  out.getContext('2d').drawImage(pv.canvas, 0, 0);
  return out;
}
// Live preview in the menu: idle, walk, wind-up, strike, on a slow turn.
R.preview = function (id, dt) {
  if (!hasDef(id)) return;
  // the box on the screen: it includes the CSS zoom of the menu on a large window
  const bx = pv.canvas.getBoundingClientRect(), dp = Math.min(2, window.devicePixelRatio || 1) * (GFX.level === 0 ? 0.6 : 1), w = Math.min(2400, Math.round(bx.width * dp)), h = Math.min(2000, Math.round(bx.height * dp));
  if (w < 8 || h < 8) return;
  const c = pvCreature(id), t = pv.pose;
  if (pv.cur !== id) { pv.cur = id; pv.t = 0; t.mv = t.a = t.s = t.h = 0; }
  pv.t += dt;
  const ph = pv.t % 6.4;
  t.tm = pv.t; t.p = pv.t * 2.6; t.o = pv.t * 1.3; t.w = pv.t * 8;
  t.mv += ((ph > 1.6 && ph < 3.2 ? 1 : 0) - t.mv) * Math.min(1, dt * 8); t.sw = t.mv * 0.6;
  t.k = Math.floor(pv.t / 6.4) % 2 ? 'slam' : 'melee';
  t.a = ph > 4.2 && ph < 4.8 ? (ph - 4.2) / 0.6 : 0; t.s = ph >= 4.8 && ph < 5.3 ? 1 - (ph - 4.8) / 0.5 : 0;
  t.bl = pv.t % 2.9 > 2.78 ? 1 : 0; t.gl = ph > 3.8 && ph < 5.3 ? 1 : 0;
  c.update(t);
  pvRender(c, -0.85 + Math.sin(pv.t * 0.4) * 0.6, w, h, 1.0, 0.17, true);
};

// ---- start ---------------------------------------------------------------------------------
const loadEl = document.getElementById('loading'), barEl = document.getElementById('loadbar'), txtEl = document.getElementById('loadtxt');
const pause = () => new Promise(r => setTimeout(r, 0));
async function boot() {
  try {
    initPreview();
    G.SPR = {};
    const ids = G.ROSTER;
    for (let i = 0; i < ids.length; i++) {
      if (txtEl) txtEl.textContent = 'Building ' + G.DEX[ids[i]].name + '…';
      if (barEl) barEl.style.width = Math.round(i / ids.length * 100) + '%';
      await pause();
      try { register((await import('./models/' + ids[i] + '.js')).default); }
      catch (e) { console.warn('No model for ' + ids[i] + ': ' + e.message); register(standIn(ids[i])); }
      blueprint(ids[i]);
      G.SPR[ids[i]] = { idle: [portrait(ids[i])] };
    }
    if (barEl) barEl.style.width = '100%';
    try { await Promise.race([document.fonts.load('600 16px Fredoka'), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* the fallback font is fine */ }
    // The game files (the list is in js/state.js). They download together and run in this sequence.
    await Promise.all(['state', 'team', 'lobby', 'input', 'main'].map(n => new Promise((ok, bad) => {
      const s = document.createElement('script');
      s.async = false; s.src = 'js/' + n + '.js' + (window.AB_V ? '?v=' + window.AB_V : '');
      s.onload = ok; s.onerror = () => bad(new Error('js/' + n + '.js did not load'));
      document.body.appendChild(s);
    })));
    World.warm();
    if (loadEl) loadEl.classList.add('hidden');
  } catch (e) {
    console.error(e);
    if (txtEl) txtEl.textContent = 'The game could not start: ' + (e && e.message ? e.message : e);
  }
}
boot();
