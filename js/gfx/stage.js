/* Arena Beasts - stage: WebGL renderer, lights, environment light and bloom. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---- graphics quality --------------------------------------------------------------
// Level 2 = High, 1 = Medium, 0 = Low. GFX.scale makes the picture smaller again when the frame rate is still low.
// Some browsers draw WebGL on the CPU (no graphics card support, or graphics acceleration is off). The full picture then
// gets only a few frames each second. Such a browser starts at Low, and the menu shows a notice (GFX.soft).
// mode: 'auto' (the game selects the level and lowers it when frames are slow) or 'high' / 'medium' / 'low' (fixed by the player).
export const LEVELS = [
  { name: 'Low', pr: 0.6, samples: 0, post: false, shadows: false, coat: false },
  { name: 'Medium', pr: 1, samples: 0, post: true, shadows: true, coat: true },
  { name: 'High', pr: 1.75, samples: 4, post: true, shadows: true, coat: true }
];
export const GFX = { level: 2, scale: 1, soft: false, gpu: '', mode: 'auto' };
const SOFT = /basic render|swiftshader|llvmpipe|softpipe|software/i;
export function gfxLevel() { return LEVELS[GFX.level]; }
export function gfxMode(mode) {
  GFX.mode = /^(auto|high|medium|low)$/.test(mode) ? mode : 'auto';
  GFX.level = GFX.mode === 'high' ? 2 : GFX.mode === 'medium' ? 1 : GFX.mode === 'low' ? 0 : GFX.soft ? 0 : 2;
  GFX.scale = 1;
}
if (typeof document !== 'undefined') {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    GFX.gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    GFX.soft = SOFT.test(GFX.gpu);
    const lose = gl && gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  } catch (e) { /* the level stays High */ }
  let saved = 'auto';
  try { saved = localStorage.getItem('ab_gfx') || 'auto'; } catch (e) { /* storage is optional */ }
  gfxMode(saved);
}

export function makeRenderer(canvas, o = {}) {
  // edge smoothing of the screen buffer: only at High. At High the composer smooths the picture; at Low it would cost too much.
  const r = new THREE.WebGLRenderer({ canvas, antialias: GFX.level === 2, alpha: !!o.alpha, powerPreference: 'high-performance' });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = o.exposure || 1.0;
  r.shadowMap.enabled = o.shadows !== false;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

// Soft studio reflections for all standard materials of a scene.
export function setEnv(renderer, scene, k) {
  const pm = new THREE.PMREMGenerator(renderer), env = new RoomEnvironment();
  scene.environment = pm.fromScene(env, 0.012).texture;   // a small blur: reflections stay sharp on glossy surfaces
  pm.dispose();
  if (k !== undefined && 'environmentIntensity' in scene) scene.environmentIntensity = k;
}

// Key light with shadow, sky/ground fill, and a back light that makes a bright edge.
export function lightRig(scene, o = {}) {
  const key = new THREE.DirectionalLight(o.key || '#fff2dc', o.keyK || 2.4);
  key.position.set(-5, 11, 7);
  key.castShadow = true;
  const s = o.area || 10;
  key.shadow.mapSize.set(o.map || 2048, o.map || 2048);
  key.shadow.camera.left = -s; key.shadow.camera.right = s; key.shadow.camera.top = s * 0.7; key.shadow.camera.bottom = -s * 0.7;
  key.shadow.camera.near = 1; key.shadow.camera.far = 40;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 3;
  const hemi = new THREE.HemisphereLight(o.sky || '#cfe0ff', o.ground || '#5a4a40', o.hemiK || 0.8);
  const back = new THREE.DirectionalLight(o.back || '#9fc0ff', o.backK || 1.5);
  back.position.set(6, 6, -9);
  scene.add(key, key.target, hemi, back);
  return { key, hemi, back };
}

// Render pipeline with bloom. The glow parts of the creatures and the move effects use it.
export function makeComposer(renderer, scene, camera, o = {}) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: o.samples === undefined ? 4 : o.samples });
  const comp = new EffectComposer(renderer, rt);
  comp.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), o.strength === undefined ? 0.42 : o.strength, o.radius === undefined ? 0.5 : o.radius, o.threshold === undefined ? 1.32 : o.threshold);
  comp.addPass(bloom);
  comp.addPass(new OutputPass());
  return { comp, bloom };
}

export { THREE };
