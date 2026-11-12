/* Arena Beasts - effects: particles, ground marks, beams, shields. All objects come from fixed pools. */
import * as THREE from 'three';

export const S = 0.02;                       // world units for each game pixel
export const wx = x => (x - 480) * S;
export const wz = y => (y - 276) * S;
const TAU = Math.PI * 2;
const colCache = {};
export function lin(hex) { return colCache[hex] || (colCache[hex] = new THREE.Color(hex)); }
// colours of the element types: a = main, b = light, c = dark or second colour
const PALHEX = { Ember: '#ff7a1a', Tide: '#3d9cf0', Bloom: '#57b84a', Volt: '#f2c81e', Frost: '#6fd0e6', Stone: '#b08a52', Gale: '#9fb4f0', Venom: '#a653c9', Mind: '#f065a8', Shade: '#7a66b8', Iron: '#9aa7b5', Brawl: '#d2553f' };
const PAL3 = { Ember: ['#ffe08a', '#5a2a18'], Tide: ['#d0f0ff', '#1a4a8a'], Bloom: ['#d8f08a', '#f58fc0'], Volt: ['#fffbd0', '#8a6a00'], Frost: ['#f0fcff', '#3a7a9a'], Stone: ['#e0c89a', '#5a4630'], Gale: ['#ffffff', '#5a6aa8'], Venom: ['#c8f07a', '#4a1a6a'], Mind: ['#ffd0ea', '#8a2a6a'], Shade: ['#c8b8ff', '#1a1230'], Iron: ['#ffffff', '#ff9a3a'], Brawl: ['#ffe0c0', '#ffffff'] };
const PAL = {}; for (const k in PALHEX) PAL[k] = { a: new THREE.Color(PALHEX[k]), b: new THREE.Color(PAL3[k][0]), c: new THREE.Color(PAL3[k][1]) };
const CWHEX = { white: '#ffffff', hot: '#ffc452', smoke: '#4a3e3c', soot: '#161212', mist: '#e8f6ff', mist2: '#b8dcf4', leaf: '#d8f08a', petal: '#ffd0e6', pollen: '#fff08a', dust: '#c8b494', dust2: '#8a7a66', shade: '#3a2a6a', night: '#0c0818', heal: '#4fe07a', heal2: '#d8ffd0', up: '#6fd0ff', down: '#ff7070', incense: '#9a6ac0', incense2: '#3a2a4a', gold: '#c8a860' };
const CW = {}; for (const k in CWHEX) CW[k] = new THREE.Color(CWHEX[k]);
const STAIN = { Ember: ['#1a0d08', 0.6], Volt: ['#1a1608', 0.5], Frost: ['#d8f4ff', 0.45], Tide: ['#1a3a66', 0.4], Venom: ['#3a1458', 0.5], Shade: ['#0a0616', 0.6], Stone: ['#3a2e20', 0.5], Bloom: ['#1e4a1e', 0.4], Iron: ['#22242a', 0.45], Mind: ['#5a1a48', 0.35], Brawl: ['#2a1a14', 0.4] };

// ---- particles ------------------------------------------------------------
// Each particle is a sprite from a 4 x 4 atlas of shapes. It can turn, grow, change colour and point along its path.
export const CELL = { glow: 0, star: 1, streak: 2, smoke: 3, ring: 4, shard: 5, flake: 6, leaf: 7, drop: 8, bubble: 9, petal: 10, star5: 11, rock: 12, zig: 13, flame: 14, curl: 15 };
let atlasTex = null;
function atlas() {
  if (atlasTex) return atlasTex;
  const N = 4, C = 128, c = document.createElement('canvas'); c.width = c.height = N * C;
  const g = c.getContext('2d'), W = a => 'rgba(255,255,255,' + a + ')';
  const cell = (i, fn) => { g.save(); g.translate((i % N) * C + C / 2, Math.floor(i / N) * C + C / 2); g.beginPath(); g.rect(-C / 2 + 2, -C / 2 + 2, C - 4, C - 4); g.clip(); fn(); g.restore(); };
  const rad = (r, stops) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); for (const s of stops) gr.addColorStop(s[0], W(s[1])); return gr; };
  const blob = (r, stops) => { g.fillStyle = rad(r, stops); g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); };
  cell(0, () => blob(60, [[0, 1], [0.25, 0.7], [0.6, 0.16], [1, 0]]));
  cell(1, () => { blob(26, [[0, 1], [0.4, 0.6], [1, 0]]); for (const a of [0, Math.PI / 2]) { g.save(); g.rotate(a); g.scale(1, 0.09); blob(60, [[0, 1], [0.3, 0.7], [1, 0]]); g.restore(); } });
  cell(2, () => { g.scale(1, 0.14); blob(60, [[0, 1], [0.35, 0.75], [1, 0]]); });
  cell(3, () => { for (let i = 0; i < 9; i++) { g.save(); g.translate(Math.cos(i * 2.4) * 22 * (i ? 1 : 0), Math.sin(i * 2.4) * 22 * (i ? 1 : 0)); blob(26 + (i * 7) % 12, [[0, 0.55], [0.6, 0.3], [1, 0]]); g.restore(); } });
  cell(4, () => { g.strokeStyle = W(1); g.lineWidth = 7; g.shadowColor = W(1); g.shadowBlur = 10; g.beginPath(); g.arc(0, 0, 46, 0, 7); g.stroke(); });
  cell(5, () => { const gr = g.createLinearGradient(-30, -40, 30, 40); gr.addColorStop(0, W(1)); gr.addColorStop(1, 'rgba(170,190,210,1)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-8, -52); g.lineTo(26, 6); g.lineTo(6, 50); g.lineTo(-24, 14); g.closePath(); g.fill(); g.strokeStyle = W(0.9); g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -52); g.lineTo(2, 12); g.lineTo(6, 50); g.stroke(); });
  cell(6, () => { g.strokeStyle = W(1); g.lineCap = 'round'; g.shadowColor = W(1); g.shadowBlur = 6; for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * Math.PI / 3); g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -50); g.stroke(); g.lineWidth = 3.5; g.beginPath(); g.moveTo(0, -30); g.lineTo(13, -42); g.moveTo(0, -30); g.lineTo(-13, -42); g.stroke(); g.restore(); } });
  cell(7, () => { g.fillStyle = W(1); g.beginPath(); g.moveTo(-52, 0); g.quadraticCurveTo(-6, -34, 52, 0); g.quadraticCurveTo(-6, 34, -52, 0); g.fill(); g.strokeStyle = 'rgba(120,120,120,1)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-46, 0); g.lineTo(46, 0); g.stroke(); });
  cell(8, () => { const gr = g.createLinearGradient(0, -20, 0, 20); gr.addColorStop(0, W(1)); gr.addColorStop(1, 'rgba(150,170,200,1)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-52, 0); g.quadraticCurveTo(0, -22, 30, -20); g.arc(30, 0, 20, -Math.PI / 2, Math.PI / 2); g.quadraticCurveTo(0, 22, -52, 0); g.fill(); g.fillStyle = W(1); g.beginPath(); g.arc(34, -7, 5, 0, 7); g.fill(); });
  cell(9, () => { g.strokeStyle = W(1); g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 46, 0, 7); g.stroke(); blob(46, [[0, 0.05], [0.8, 0.14], [1, 0.3]]); g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, 34, -2.4, -1.5); g.stroke(); });
  cell(10, () => { const gr = g.createLinearGradient(-50, 0, 50, 0); gr.addColorStop(0, 'rgba(200,200,200,1)'); gr.addColorStop(1, W(1)); g.fillStyle = gr; g.beginPath(); g.moveTo(-50, 0); g.bezierCurveTo(-20, -44, 40, -40, 50, 0); g.bezierCurveTo(40, 40, -20, 44, -50, 0); g.fill(); });
  cell(11, () => { g.fillStyle = W(1); g.shadowColor = W(1); g.shadowBlur = 8; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i & 1 ? 20 : 50; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); });
  cell(12, () => { g.fillStyle = W(1); g.beginPath(); g.moveTo(-40, -22); g.lineTo(-6, -48); g.lineTo(38, -28); g.lineTo(48, 14); g.lineTo(14, 46); g.lineTo(-34, 34); g.closePath(); g.fill(); g.fillStyle = 'rgba(120,120,120,1)'; g.beginPath(); g.moveTo(-6, -48); g.lineTo(4, 2); g.lineTo(14, 46); g.lineTo(-34, 34); g.lineTo(-40, -22); g.closePath(); g.fill(); g.fillStyle = 'rgba(180,180,180,1)'; g.beginPath(); g.moveTo(4, 2); g.lineTo(48, 14); g.lineTo(14, 46); g.closePath(); g.fill(); });
  cell(13, () => { g.strokeStyle = W(1); g.lineWidth = 7; g.lineJoin = 'miter'; g.shadowColor = W(1); g.shadowBlur = 10; g.beginPath(); g.moveTo(-56, 6); g.lineTo(-30, -16); g.lineTo(-12, 12); g.lineTo(10, -14); g.lineTo(28, 10); g.lineTo(56, -8); g.stroke(); });
  cell(14, () => { const gr = g.createLinearGradient(0, 50, 0, -56); gr.addColorStop(0, W(1)); gr.addColorStop(0.5, W(0.85)); gr.addColorStop(1, W(0.1)); g.fillStyle = gr; g.shadowColor = W(0.8); g.shadowBlur = 8; g.beginPath(); g.moveTo(0, -56); g.bezierCurveTo(8, -24, 34, -4, 28, 24); g.arc(0, 24, 28, 0, Math.PI); g.bezierCurveTo(-34, -4, -14, -20, 0, -56); g.fill(); });
  cell(15, () => { g.strokeStyle = W(1); g.lineCap = 'round'; for (let i = 0; i < 16; i++) { const a0 = -2.6 + i * 0.26; g.lineWidth = 1.5 + i * 0.6; g.globalAlpha = 0.25 + i * 0.05; g.beginPath(); g.arc(0, 0, 44, a0, a0 + 0.3); g.stroke(); } });
  atlasTex = new THREE.CanvasTexture(c); atlasTex.generateMipmaps = false; atlasTex.minFilter = THREE.LinearFilter;
  return atlasTex;
}
const PV = 'attribute vec4 aCol; attribute vec4 aData; attribute vec3 aVel; varying vec4 vCol; varying vec2 vCell; varying float vRot; uniform float uScale; uniform float uAspect;\nvoid main(){ vCol = aCol; vCell = vec2(mod(aData.z, 4.0), floor(aData.z / 4.0)); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aData.x * uScale / -mv.z; vRot = aData.y;\n  if (aData.w > 0.5) { vec4 p2 = projectionMatrix * modelViewMatrix * vec4(position + aVel * 0.03, 1.0); vec2 d = (p2.xy / p2.w - gl_Position.xy / gl_Position.w) * vec2(uAspect, 1.0); vRot = atan(d.y, d.x) + aData.y; } }';
const PF = 'uniform sampler2D uTex; varying vec4 vCol; varying vec2 vCell; varying float vRot;\nvoid main(){ vec2 p = gl_PointCoord - 0.5; p.y = -p.y; float c = cos(vRot), s = sin(vRot); vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y); if (abs(q.x) > 0.49 || abs(q.y) > 0.49) discard;\n  vec2 uv = (vCell + vec2(q.x + 0.5, 0.5 - q.y)) / 4.0; uv.y = 1.0 - uv.y; vec4 t = texture2D(uTex, uv);\n';
class Particles {
  constructor(max, additive) {
    this.max = max; this.n = 0; this.add = additive;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.data = new Float32Array(max * 4); this.vel = new Float32Array(max * 3);
    // state for each particle: life, span, gravity, drag, size, grow, spin, alpha, bounce, then 2 colours
    this.st = new Float32Array(max * 16);
    const g = this.geo = new THREE.BufferGeometry(), dyn = (a, n) => new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', dyn(this.pos, 3)); g.setAttribute('aCol', dyn(this.col, 4)); g.setAttribute('aData', dyn(this.data, 4)); g.setAttribute('aVel', dyn(this.vel, 3));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 }, uAspect: { value: 1.78 }, uTex: { value: atlas() } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: PV,
      fragmentShader: PF + (additive ? '  gl_FragColor = vec4(vCol.rgb * t.rgb * 1.75, t.a * vCol.a); }' : '  gl_FragColor = vec4(vCol.rgb * (0.5 + 0.5 * t.r), t.a * vCol.a); }')
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = additive ? 6 : 5;
  }
  // c0 -> c1: colour from start to end of life. grow: size change over life (1 = double, -1 = to zero). orient: point along the path.
  put(cell, x, y, z, vx, vy, vz, life, size, c0, c1, grav, drag, grow, spin, orient, alpha, bounce, rot) {
    if (this.n >= this.max) return;
    const i = this.n++, j = i * 3, k = i * 4, s = i * 16, S = this.st;
    this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z; this.vel[j] = vx; this.vel[j + 1] = vy; this.vel[j + 2] = vz;
    this.data[k] = size; this.data[k + 1] = rot === undefined ? (orient ? 0 : Math.random() * 6.28) : rot; this.data[k + 2] = cell; this.data[k + 3] = orient ? 1 : 0;
    S[s] = S[s + 1] = life; S[s + 2] = grav || 0; S[s + 3] = drag || 0; S[s + 4] = size; S[s + 5] = grow || 0; S[s + 6] = spin || 0; S[s + 7] = alpha === undefined ? 1 : alpha; S[s + 8] = bounce ? 1 : 0;
    c1 = c1 || c0;
    S[s + 9] = c0.r; S[s + 10] = c0.g; S[s + 11] = c0.b; S[s + 12] = c1.r; S[s + 13] = c1.g; S[s + 14] = c1.b;
    this.col[k] = c0.r; this.col[k + 1] = c0.g; this.col[k + 2] = c0.b; this.col[k + 3] = 0;
  }
  // old form: round glow (additive layer) or smoke puff (solid layer)
  emit(x, y, z, vx, vy, vz, life, size, c, grav, drag, grow) {
    if (this.add) this.put(0, x, y, z, vx, vy, vz, life, size * 1.6, c, null, grav, drag, grow === undefined || grow === 0 ? -0.5 : grow, 0, 0, 1);
    else this.put(3, x, y, z, vx, vy, vz, life, size * 1.7, c, null, grav, drag, grow, (Math.random() - 0.5) * 2, 0, 0.6);
  }
  update(dt) {
    let i = 0, j, k, s, q, m, f;
    const P = this.pos, V = this.vel, S = this.st, D = this.data, C = this.col;
    while (i < this.n) {
      s = i * 16; S[s] -= dt;
      if (S[s] <= 0) {   // move the last one into this place
        m = --this.n;
        if (m !== i) {
          j = i * 3; q = m * 3; P[j] = P[q]; P[j + 1] = P[q + 1]; P[j + 2] = P[q + 2]; V[j] = V[q]; V[j + 1] = V[q + 1]; V[j + 2] = V[q + 2];
          k = i * 4; q = m * 4; D[k] = D[q]; D[k + 1] = D[q + 1]; D[k + 2] = D[q + 2]; D[k + 3] = D[q + 3];
          q = m * 16; for (k = 0; k < 15; k++) S[s + k] = S[q + k];
        }
        continue;
      }
      j = i * 3; k = i * 4;
      if (S[s + 3]) { f = Math.exp(-S[s + 3] * dt); V[j] *= f; V[j + 1] *= f; V[j + 2] *= f; }
      V[j + 1] -= S[s + 2] * dt;
      P[j] += V[j] * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += V[j + 2] * dt;
      if (P[j + 1] < 0.03 && S[s + 2] > 0) { P[j + 1] = 0.03; if (S[s + 8]) { V[j + 1] *= -0.45; V[j] *= 0.7; V[j + 2] *= 0.7; } else { V[j + 1] = 0; V[j] *= 0.5; V[j + 2] *= 0.5; } }
      f = 1 - S[s] / S[s + 1];
      D[k] = S[s + 4] * Math.max(0.02, 1 + S[s + 5] * f); D[k + 1] += S[s + 6] * dt;
      C[k] = S[s + 9] + (S[s + 12] - S[s + 9]) * f; C[k + 1] = S[s + 10] + (S[s + 13] - S[s + 10]) * f; C[k + 2] = S[s + 11] + (S[s + 14] - S[s + 11]) * f;
      C[k + 3] = S[s + 7] * Math.min(1, f * 10) * (f > 0.55 ? (1 - f) / 0.45 : 1);
      i++;
    }
    const g = this.geo;
    g.setDrawRange(0, this.n);
    g.attributes.position.needsUpdate = true; g.attributes.aCol.needsUpdate = true; g.attributes.aData.needsUpdate = true; g.attributes.aVel.needsUpdate = true;
  }
}

// ---- ground marks -------------------------------------------------------------
const GV = 'varying vec2 vP;\nvoid main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const GF = `
uniform int uKind; uniform vec3 uCol; uniform vec3 uEdge; uniform float uFill; uniform float uQ; uniform float uA; uniform float uArc; uniform float uW; uniform float uAsp; uniform float uHdr;
varying vec2 vP;
void main(){
  vec2 p = vP; float a = 0.0; vec3 c = uCol;
  if (uKind == 2) {
    vec2 e = 1.0 - abs(p); float edge = min(e.x * uAsp, e.y);
    a = uFill * (1.0 + step(p.x * 0.5 + 0.5, uQ) * 1.5);
    float ln = 1.0 - smoothstep(0.0, uW, edge); c = mix(c, uEdge, ln); a = max(a, ln * 0.9);
  } else {
    float r = length(p); if (r > 1.0) discard;
    float ang = abs(atan(p.y, p.x));
    if (uKind == 1 && ang > uArc) discard;
    if (uKind == 3) { float d = abs(r - (1.0 - uW)) / uW; a = 1.0 - smoothstep(0.0, 1.0, d); a *= a; }
    else if (uKind == 4) { a = uFill * (1.0 - smoothstep(0.15, 1.0, r)); }
    else {
      a = uFill * (1.0 + step(r, uQ) * 1.5);
      float edge = 1.0 - r; if (uKind == 1) edge = min(edge, (uArc - ang) * r);
      float ln = 1.0 - smoothstep(0.0, uW, edge); c = mix(c, uEdge, ln); a = max(a, ln * 0.9);
    }
  }
  gl_FragColor = vec4(c * uHdr, a * uA);
}`;
const ZF = `
uniform int uKind; uniform vec3 uCol; uniform vec3 uEdge; uniform float uA; uniform float uTime;
varying vec2 vP;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ return n2(p) * 0.55 + n2(p * 2.1 + 3.7) * 0.3 + n2(p * 4.3 + 9.1) * 0.15; }
void main(){
  float r = length(vP); if (r > 1.0) discard;
  float ang = atan(vP.y, vP.x), n = fbm(vP * 4.0 + vec2(0.0, uTime * 0.25)), a = 0.6; vec3 c = uCol;
  if (uKind == 0) { float cr = abs(fbm(vP * 3.0 - vec2(uTime * 0.12, 0.0)) - 0.5) * 2.0; c = mix(vec3(2.4, 1.0, 0.16), vec3(0.16, 0.035, 0.02), smoothstep(0.02, 0.26, cr)); c += vec3(0.7, 0.14, 0.02) * n * n; a = 0.92; }
  else if (uKind == 1) { vec2 g = fract(vP * 5.0 + vec2(n, uTime * 0.2)) - 0.5; float bub = smoothstep(0.3, 0.22, length(g)) * step(0.55, h2(floor(vP * 5.0 + vec2(n, uTime * 0.2)))); c = mix(uCol * 0.35, uCol * 0.9, n) + uCol * bub * 1.2; a = 0.78; }
  else if (uKind == 2) { c = mix(vec3(0.16, 0.17, 0.2), vec3(0.4, 0.44, 0.5), n); a = 0.4; }
  else if (uKind == 3) { float w = sin(r * 22.0 - uTime * 3.0) * 0.5 + 0.5; c = mix(uCol * 0.6, vec3(0.75, 0.92, 1.0), w * 0.4 + n * 0.3); a = 0.5; }
  else if (uKind == 4) { float cr = abs(fbm(vP * 6.0) - 0.5) * 2.0; c = mix(vec3(1.5, 1.7, 1.9), vec3(0.55, 0.82, 0.95), smoothstep(0.0, 0.25, cr)); c += step(0.985, h2(floor(vP * 40.0) + floor(uTime * 6.0))) * 1.5; a = 0.8; }
  else if (uKind == 5) { float s = sin(ang * 6.0 + r * 10.0 - uTime * 0.8 + n * 4.0); c = mix(vec3(0.05, 0.2, 0.06), uCol * 1.15, smoothstep(-0.3, 0.6, s)); a = 0.8; }
  else if (uKind == 7) { float cr = abs(fbm(vP * 5.0 + vec2(uTime * 1.7, -uTime * 1.3)) - 0.5) * 2.0; float bolt = 1.0 - smoothstep(0.0, 0.1, cr); c = mix(vec3(0.12, 0.1, 0.02), vec3(2.6, 2.3, 0.7), bolt); a = 0.35 + 0.6 * bolt; }
  else if (uKind == 8) { float sm = fbm(vP * 2.6 + vec2(uTime * 0.12, uTime * 0.08)); float sw = sin(ang * 2.0 + r * 6.0 - uTime * 0.6 + sm * 5.0); c = mix(vec3(0.42, 0.26, 0.55), vec3(0.9, 0.72, 0.36), smoothstep(-0.4, 0.8, sw)) * (0.7 + 0.6 * sm); a = 0.78; }
  else { float s = sin(ang * 3.0 + r * 15.0 + uTime * 3.5); c = mix(vec3(0.12, 0.02, 0.16), uCol * 1.8, smoothstep(0.2, 0.95, s)); c += uCol * (1.0 - smoothstep(0.0, 0.25, r)) * 1.5; a = 0.72; }
  float rim = smoothstep(0.9, 0.96, r);
  c = mix(c, uEdge * 1.6, rim);
  a = mix(a * (1.0 - smoothstep(0.75, 0.94, r) * 0.25), 0.95, rim);
  gl_FragColor = vec4(c, a * uA);
}`;
function gMat(additive) {
  return new THREE.ShaderMaterial({
    uniforms: { uKind: { value: 0 }, uCol: { value: new THREE.Color() }, uEdge: { value: new THREE.Color() }, uFill: { value: 0.2 }, uQ: { value: 0 }, uA: { value: 1 }, uArc: { value: 1 }, uW: { value: 0.05 }, uAsp: { value: 1 }, uHdr: { value: 1 } },
    vertexShader: GV, fragmentShader: GF, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide
  });
}
const QUAD = new THREE.PlaneGeometry(2, 2);
class MarkPool {
  constructor(scene, n, additive, order) {
    this.list = []; this.cur = 0;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(QUAD, gMat(additive));
      m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = order; m.frustumCulled = false;
      scene.add(m); this.list.push(m);
    }
  }
  begin() { this.cur = 0; }
  end() { for (let i = this.cur; i < this.list.length; i++) this.list[i].visible = false; }
  // kind: 0 disc, 1 sector, 2 rectangle, 3 ring. For a rectangle (x, z) is the start; len and wid are its sizes.
  put(kind, x, z, y, r, ang, o) {
    if (this.cur >= this.list.length) return null;
    const m = this.list[this.cur++], u = m.material.uniforms;
    m.visible = true; u.uKind.value = kind;
    u.uCol.value.copy(o.col); u.uEdge.value.copy(o.edge || o.col);
    u.uFill.value = o.fill === undefined ? 0.2 : o.fill; u.uQ.value = o.q || 0; u.uA.value = o.a === undefined ? 1 : o.a;
    u.uArc.value = o.arc === undefined ? Math.PI : o.arc; u.uHdr.value = o.hdr || 1;
    if (kind === 2) {
      const len = r, wid = o.wid;
      m.position.set(x + Math.cos(ang) * len / 2, y, z + Math.sin(ang) * len / 2);
      m.scale.set(len / 2, wid / 2, 1); u.uAsp.value = len / wid; u.uW.value = (o.w || 0.05) / (wid / 2);
    } else {
      m.position.set(x, y, z); m.scale.set(r, r, 1); u.uW.value = kind === 3 ? Math.min(0.9, (o.w || 0.1) / r) : (o.w || 0.05) / r;
    }
    m.rotation.z = -ang;
    return m;
  }
}

// ---- main effect set ----------------------------------------------------------
const _c = new THREE.Color();
export class FX {
  constructor(scene) {
    this.scene = scene; this.time = 0;
    this.glow = new Particles(4200, true); this.dust = new Particles(2200, false);
    scene.add(this.dust.points, this.glow.points);
    this.tele = new MarkPool(scene, 14, false, 2);       // telegraphs: drawn again each frame
    this.marks = new MarkPool(scene, 28, true, 3);       // timed flashes: rings, cones
    this.timed = [];
    this.stainPool = new MarkPool(scene, 12, false, 1); this.stains = [];
    this.lights = [];
    for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffffff, 0, 9, 2); l.userData = { t: 1, max: 1, k: 0 }; scene.add(l); this.lights.push(l); }
    // zones
    this.zones = []; this.zcur = 0;
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(QUAD, new THREE.ShaderMaterial({
        uniforms: { uKind: { value: 0 }, uCol: { value: new THREE.Color() }, uEdge: { value: new THREE.Color() }, uA: { value: 1 }, uTime: { value: 0 } },
        vertexShader: GV, fragmentShader: ZF, transparent: true, depthWrite: false
      }));
      m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 1; m.frustumCulled = false; scene.add(m); this.zones.push(m);
    }
    // beams: a white core in a coloured shell
    this.beams = [];
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 14, 1, true); cyl.rotateZ(-Math.PI / 2); cyl.translate(0.5, 0, 0);
    for (let i = 0; i < 48; i++) {
      const g = new THREE.Group();
      const outer = new THREE.Mesh(cyl, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 }));
      const inner = new THREE.Mesh(cyl, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      inner.scale.set(1, 0.42, 0.42); g.add(outer, inner); g.visible = false; g.userData = { outer, inner, t: 0, max: 1, w: 1 };
      outer.renderOrder = inner.renderOrder = 7; scene.add(g); this.beams.push(g);
    }
  }
  setView(pxHeight, fovDeg, aspect) { const s = pxHeight / (2 * Math.tan(fovDeg * Math.PI / 360)); for (const L of [this.glow, this.dust]) { L.mat.uniforms.uScale.value = s; L.mat.uniforms.uAspect.value = aspect || 1.78; } }
  clear() {
    this.glow.n = 0; this.dust.n = 0; this.timed.length = 0; this.stains.length = 0;
    for (const l of this.lights) { l.intensity = 0; l.userData.t = l.userData.max; }
    this.stainPool.begin(); this.stainPool.end();
    for (const b of this.beams) b.visible = false;
    this.marks.begin(); this.marks.end(); this.tele.begin(); this.tele.end(); this.zcur = 0; this.zoneEnd();
  }
  // glowing particle
  spark(x, y, z, vx, vy, vz, life, size, col, grav, drag, grow) { this.glow.emit(x, y, z, vx, vy, vz, life, size, lin(col), grav, drag, grow); }
  // solid particle: dust, smoke, leaves, splinters
  puff(x, y, z, vx, vy, vz, life, size, col, grav, drag, grow) { this.dust.emit(x, y, z, vx, vy, vz, life, size, lin(col), grav, drag, grow); }
  // n particles in all directions. o: { up, grav, drag, solid, flat, grow }
  burst(x, y, z, n, col, speed, life, size, o) {
    o = o || {};
    const c = lin(col), g = o.grav === undefined ? 0 : o.grav, dr = o.drag === undefined ? 3 : o.drag;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, e = o.flat ? 0 : (Math.random() - 0.3) * 1.6, s = speed * (0.35 + Math.random() * 0.65), ce = Math.cos(e), l = life * (0.5 + Math.random() * 0.5), z0 = size * (0.6 + Math.random() * 0.8);
      const vx = Math.cos(a) * ce * s, vy = Math.sin(e) * s + (o.up || 0), vz = Math.sin(a) * ce * s;
      if (o.solid) this.dust.put(3, x, y, z, vx, vy, vz, l, z0 * 1.8, c, null, g, dr, o.grow || 0.8, (Math.random() - 0.5) * 2, 0, 0.55, g > 0);
      else if (i & 1) this.glow.put(2, x, y, z, vx, vy, vz, l * 0.7, z0 * 2.6, CW.white, c, g, dr, -0.4, 0, 1, 1);
      else this.glow.put(0, x, y, z, vx, vy, vz, l, z0 * 1.6, c, null, g, dr, -0.6, 0, 0, 1);
    }
  }
  // timed ground marks
  ring(x, z, r0, r1, dur, col, w, y) { this.timed.push({ k: 3, x, z, y: y || 0.05, r0, r1, t: 0, max: dur, col: lin(col), w: w || 0.2 }); }
  cone(x, z, ang, range, arc, dur, col) { this.timed.push({ k: 1, x, z, y: 0.06, r0: range * 0.5, r1: range, ang, arc, t: 0, max: dur, col: lin(col) }); }
  disc(x, z, r, dur, col) { this.timed.push({ k: 0, x, z, y: 0.05, r0: r, r1: r, t: 0, max: dur, col: lin(col) }); }
  beam(x0, y0, z0, x1, y1, z1, width, dur, col) {
    for (const b of this.beams) {
      if (b.visible) continue;
      const u = b.userData, dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
      b.visible = true; b.position.set(x0, y0, z0); u.t = 0; u.max = dur; u.w = width; u.len = len;
      b.rotation.set(0, Math.atan2(-dz, dx), Math.asin(dy / len), 'YZX');
      u.outer.material.color.copy(lin(col)).multiplyScalar(1.6);
      return;
    }
  }
  // ---- shaped effects ------------------------------------------------------------
  // short flash of real light on the floor and the creatures
  light(x, y, z, col, k, dur) {
    let best = this.lights[0];
    for (const l of this.lights) if (l.userData.max - l.userData.t < best.userData.max - best.userData.t) best = l;
    best.position.set(x, y, z); best.color.copy(lin(col)); best.userData.t = 0; best.userData.max = dur; best.userData.k = k; best.intensity = k;
  }
  // soft mark on the floor that fades: scorch, frost, wet, slime
  stain(x, z, r, type, dur) {
    const s = STAIN[type];
    if (s && this.stains.length < 12) this.stains.push({ x, z, r, col: lin(s[0]), a: s[1], t: 0, max: dur || 4 });
  }
  // jagged lightning between 2 points
  bolt(x0, y0, z0, x1, y1, z1, col, w) {
    const n = 5, len = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0) + (z1 - z0) * (z1 - z0)), j = len * 0.18;
    let px = x0, py = y0, pz = z0;
    for (let i = 1; i <= n; i++) {
      const t = i / n, e = i === n ? 0 : j;
      const qx = x0 + (x1 - x0) * t + (Math.random() - 0.5) * e, qy = y0 + (y1 - y0) * t + (Math.random() - 0.5) * e, qz = z0 + (z1 - z0) * t + (Math.random() - 0.5) * e;
      this.beam(px, py, pz, qx, qy, qz, w || 0.035, 0.09 + Math.random() * 0.09, col);
      px = qx; py = qy; pz = qz;
    }
  }
  // n particles in the style of one element type. sp = speed outward, up = speed upward.
  bits(type, x, y, z, n, sp, up) {
    const A = this.glow, D = this.dust, P = PAL[type] || PAL.Brawl, r = Math.random;
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, dx = Math.cos(a), dz = Math.sin(a), hv = sp * (0.35 + 0.65 * r()), uy = up * (0.4 + 0.8 * r()), m = i % 3, sn = (r() - 0.5) * 12;
      switch (type) {
        case 'Ember':
          if (m === 0) A.put(14, x + dx * 0.1, y, z + dz * 0.1, dx * hv * 0.3, 1.2 + uy, dz * hv * 0.3, 0.35 + r() * 0.3, 0.5 + r() * 0.4, CW.hot, P.a, -1.5, 1.2, -0.3, 0, 0, 1, 0, 0);
          else if (m === 1) A.put(0, x, y, z, dx * hv, 1 + uy * 1.5, dz * hv, 0.6 + r() * 0.5, 0.12 + r() * 0.1, P.b, P.a, 4, 0.6, -0.5, 0, 0, 1, 1);
          else D.put(3, x, y, z, dx * hv * 0.3, 0.6 + uy * 0.4, dz * hv * 0.3, 0.8 + r() * 0.5, 0.5 + r() * 0.4, CW.smoke, CW.soot, -0.4, 1.2, 1.3, sn * 0.2, 0, 0.5);
          break;
        case 'Tide':
          if (m === 0) D.put(8, x, y, z, dx * hv, 2 + uy * 2, dz * hv, 0.5 + r() * 0.3, 0.22 + r() * 0.16, P.b, P.a, 9, 0.4, 0, 0, 1, 0.95);
          else if (m === 1) D.put(3, x, y, z, dx * hv * 0.4, 0.3, dz * hv * 0.4, 0.5 + r() * 0.3, 0.6 + r() * 0.4, CW.mist, CW.mist2, 0, 2, 1.4, sn * 0.2, 0, 0.32);
          else A.put(9, x, y, z, dx * hv * 0.5, 0.8 + uy, dz * hv * 0.5, 0.5 + r() * 0.4, 0.16 + r() * 0.14, P.b, P.a, -0.6, 1.5, 0.5, 0, 0, 0.8);
          break;
        case 'Bloom':
          if (m === 0) D.put(7, x, y, z, dx * hv, 1.5 + uy * 1.5, dz * hv, 0.8 + r() * 0.5, 0.3 + r() * 0.2, P.a, CW.leaf, 2.5, 1.6, 0, sn, 0, 1);
          else if (m === 1) D.put(10, x, y, z, dx * hv, 1.5 + uy * 1.5, dz * hv, 0.9 + r() * 0.5, 0.24 + r() * 0.16, P.c, CW.petal, 2, 1.8, 0, sn, 0, 1);
          else A.put(0, x, y, z, dx * hv * 0.5, 0.4 + uy * 0.5, dz * hv * 0.5, 0.8 + r() * 0.5, 0.09 + r() * 0.06, CW.pollen, P.b, -0.2, 1.5, 0, 0, 0, 0.9);
          break;
        case 'Volt':
          if (m === 0) A.put(2, x, y, z, dx * hv * 2.2, uy * 2, dz * hv * 2.2, 0.1 + r() * 0.1, 0.5 + r() * 0.3, CW.white, P.a, 0, 2, -0.3, 0, 1, 1);
          else if (m === 1) A.put(13, x + dx * 0.3 * r(), y + (r() - 0.3) * 0.5, z + dz * 0.3 * r(), 0, 0, 0, 0.08 + r() * 0.07, 0.5 + r() * 0.5, CW.white, P.a, 0, 0, 0.3, 0, 0, 1);
          else A.put(1, x, y, z, dx * hv, uy, dz * hv, 0.2 + r() * 0.2, 0.2 + r() * 0.2, CW.white, P.a, 0, 3, -0.5, sn, 0, 1);
          break;
        case 'Frost':
          if (m === 0) D.put(5, x, y, z, dx * hv, 2 + uy * 2, dz * hv, 0.6 + r() * 0.3, 0.25 + r() * 0.2, CW.white, P.a, 9, 0.4, 0, sn, 0, 1, 1);
          else if (m === 1) A.put(6, x, y, z, dx * hv * 0.4, 0.3 + uy * 0.3, dz * hv * 0.4, 0.8 + r() * 0.4, 0.25 + r() * 0.15, CW.white, P.a, 0.5, 2, 0, sn * 0.3, 0, 0.9);
          else D.put(3, x, y, z, dx * hv * 0.4, 0.2, dz * hv * 0.4, 0.6 + r() * 0.3, 0.6 + r() * 0.4, CW.white, CW.mist2, 0, 2, 1.3, sn * 0.2, 0, 0.3);
          break;
        case 'Stone':
          if (m === 0) D.put(12, x, y, z, dx * hv, 2.5 + uy * 2.5, dz * hv, 0.7 + r() * 0.4, 0.25 + r() * 0.25, P.b, P.c, 12, 0.3, 0, sn, 0, 1, 1);
          else D.put(3, x, y, z, dx * hv * 0.6, 0.4, dz * hv * 0.6, 0.7 + r() * 0.3, 0.6 + r() * 0.4, CW.dust, CW.dust2, 0, 2.5, 1.4, sn * 0.2, 0, 0.5);
          break;
        case 'Gale':
          if (m === 0) A.put(15, x, y, z, dx * hv * 0.5, uy * 0.5, dz * hv * 0.5, 0.3 + r() * 0.2, 0.7 + r() * 0.5, CW.white, P.a, 0, 1.5, 0.6, sn, 0, 0.7);
          else if (m === 1) A.put(2, x, y, z, -dz * hv * 1.5, uy, dx * hv * 1.5, 0.2 + r() * 0.15, 0.5 + r() * 0.3, CW.white, P.a, 0, 1, -0.3, 0, 1, 0.8);
          else D.put(3, x, y, z, dx * hv * 0.5, 0.3, dz * hv * 0.5, 0.4 + r() * 0.3, 0.5 + r() * 0.4, CW.white, CW.mist, 0, 2, 1.2, sn * 0.3, 0, 0.22);
          break;
        case 'Venom':
          if (m === 0) A.put(9, x, y, z, dx * hv * 0.4, 0.6 + uy, dz * hv * 0.4, 0.6 + r() * 0.4, 0.2 + r() * 0.2, P.b, P.a, -0.8, 1.5, 0.5, 0, 0, 0.9);
          else if (m === 1) D.put(8, x, y, z, dx * hv, 2 + uy, dz * hv, 0.5 + r() * 0.3, 0.2 + r() * 0.12, P.b, P.a, 9, 0.4, 0, 0, 1, 0.95);
          else D.put(3, x, y, z, dx * hv * 0.4, 0.4 + uy * 0.3, dz * hv * 0.4, 0.7 + r() * 0.4, 0.5 + r() * 0.4, P.a, P.c, -0.3, 1.5, 1.4, sn * 0.2, 0, 0.45);
          break;
        case 'Mind':
          if (m === 0) A.put(11, x, y, z, dx * hv, uy * 1.2, dz * hv, 0.5 + r() * 0.3, 0.28 + r() * 0.17, CW.white, P.a, 0, 2.5, -0.4, sn * 0.5, 0, 1);
          else if (m === 1) A.put(4, x, y, z, 0, 0, 0, 0.35 + r() * 0.15, 0.3, P.b, P.a, 0, 0, 3 + r() * 3, 0, 0, 0.9);
          else A.put(0, x, y, z, dx * hv * 0.7, uy, dz * hv * 0.7, 0.5 + r() * 0.3, 0.12, P.b, P.a, 0, 2, -0.5, 0, 0, 1);
          break;
        case 'Shade':
          if (m === 0) D.put(3, x, y, z, dx * hv * 0.5, 0.5 + uy * 0.5, dz * hv * 0.5, 0.7 + r() * 0.4, 0.6 + r() * 0.4, CW.shade, CW.night, -0.3, 1.5, 1.4, sn * 0.2, 0, 0.7);
          else if (m === 1) A.put(2, x, y, z, dx * hv * 1.5, uy, dz * hv * 1.5, 0.25 + r() * 0.15, 0.5 + r() * 0.3, P.b, P.a, 0, 2, -0.4, 0, 1, 0.9);
          else A.put(0, x, y, z, dx * hv * 0.6, uy, dz * hv * 0.6, 0.5 + r() * 0.3, 0.16, P.a, P.c, 0, 2, -0.5, 0, 0, 1);
          break;
        case 'Iron':
          if (m < 2) A.put(2, x, y, z, dx * hv * 1.6, 2 + uy * 2.5, dz * hv * 1.6, 0.35 + r() * 0.25, 0.3 + r() * 0.2, CW.white, P.c, 10, 0.5, -0.4, 0, 1, 1, 1);
          else A.put(1, x + dx * 0.2, y + r() * 0.3, z + dz * 0.2, 0, 0, 0, 0.15 + r() * 0.1, 0.4 + r() * 0.3, CW.white, P.a, 0, 0, 0.3, sn, 0, 1);
          break;
        default:
          if (m === 0) A.put(1, x + dx * 0.3, y + r() * 0.4, z + dz * 0.3, 0, 0, 0, 0.2 + r() * 0.1, 0.6 + r() * 0.4, CW.white, P.a, 0, 0, 0.4, sn, 0, 1);
          else if (m === 1) A.put(2, x, y, z, dx * hv * 2, uy, dz * hv * 2, 0.15 + r() * 0.1, 0.6 + r() * 0.4, CW.white, P.b, 0, 3, -0.3, 0, 1, 1);
          else D.put(3, x, y, z, dx * hv * 0.5, 0.4, dz * hv * 0.5, 0.5 + r() * 0.3, 0.5 + r() * 0.3, CW.dust, CW.dust2, 0, 2.5, 1.3, sn * 0.2, 0, 0.4);
      }
    }
  }
  // hit on a body. pow = damage as a share of maximum HP.
  impact(type, x, y, z, pow) {
    const P = PAL[type] || PAL.Brawl, A = this.glow;
    A.put(0, x, y, z, 0, 0, 0, 0.14, 1.3 + pow * 3, CW.white, P.a, 0, 0, 1.5, 0, 0, 0.9);
    A.put(1, x, y, z, 0, 0, 0, 0.24, 1.3 + pow * 3.5, CW.white, P.b, 0, 0, 0.5, (Math.random() - 0.5) * 4, 0, 1);
    for (let i = 0; i < 6 + pow * 20; i++) { const a = Math.random() * TAU, e = (Math.random() - 0.2) * 1.4, s = 4 + pow * 9 + Math.random() * 3; A.put(2, x, y, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s, Math.sin(a) * Math.cos(e) * s, 0.14 + Math.random() * 0.14, 0.45 + Math.random() * 0.4, CW.white, P.a, 0, 3, -0.4, 0, 1, 1); }
    this.bits(type, x, y, z, Math.min(30, 6 + pow * 70 | 0), 2.2 + pow * 7, 1 + pow * 3);
    if (type === 'Volt') for (let i = 0; i < 2 + pow * 6; i++) this.bolt(x, y + 0.3, z, x + (Math.random() - 0.5) * 2, 0.02, z + (Math.random() - 0.5) * 2, PAL.Volt.b);
    this.light(x, y + 0.4, z, PALHEX[type] || '#ffffff', 8 + pow * 90, 0.28);
  }
  // large burst on the floor with radius R
  explode(type, x, z, R) {
    const P = PAL[type] || PAL.Brawl, A = this.glow;
    A.put(0, x, 0.4, z, 0, 0, 0, 0.2, R * 2.2, CW.white, P.a, 0, 0, 1.2, 0, 0, 0.9);
    A.put(1, x, 0.5, z, 0, 0, 0, 0.3, R * 2.4, CW.white, P.b, 0, 0, 0.4, 1.5, 0, 1);
    A.put(4, x, 0.3, z, 0, 0, 0, 0.4, R * 0.5, CW.white, P.a, 0, 0, 3.5, 0, 0, 0.8);
    this.bits(type, x, 0.3, z, Math.min(64, 22 + R * 12 | 0), R * 2.3, 3);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.random() * 0.4, rr = R * (0.55 + Math.random() * 0.35); this.bits(type, x + Math.cos(a) * rr, 0.15, z + Math.sin(a) * rr, 3, 1.2, 2.6); }
    if (type === 'Volt') for (let i = 0; i < 5; i++) { const a = Math.random() * TAU, rr = Math.random() * R * 0.8; this.bolt(x + Math.cos(a) * rr * 0.5, 7, z + Math.sin(a) * rr * 0.5, x + Math.cos(a) * rr, 0.02, z + Math.sin(a) * rr, PAL.Volt.b, 0.05); }
    this.light(x, 1.2, z, PALHEX[type] || '#ffffff', 60 + R * 30, 0.45);
    this.stain(x, z, R * 0.95, type, 4.5);
  }
  // a move leaves the creature in direction a
  muzzle(type, x, y, z, a) {
    const P = PAL[type] || PAL.Brawl, A = this.glow, cx = Math.cos(a), cz = Math.sin(a);
    A.put(1, x, y, z, 0, 0, 0, 0.16, 1.1, CW.white, P.a, 0, 0, 0.5, 2, 0, 1);
    for (let i = 0; i < 7; i++) { const s = 3 + Math.random() * 4, w = (Math.random() - 0.5) * 1.1; A.put(2, x, y, z, (cx - cz * w) * s, (Math.random() - 0.3) * 2, (cz + cx * w) * s, 0.14 + Math.random() * 0.1, 0.5, CW.white, P.a, 0, 3, -0.4, 0, 1, 1); }
    this.bits(type, x, y, z, 5, 1.5, 0.8);
  }
  // effects along an arc (cone moves) and along a line (beam moves)
  sweep(type, x, z, a, range, half) { for (let i = 0; i < 12; i++) { const an = a + (i / 11 - 0.5) * 2 * half, rr = range * (0.45 + Math.random() * 0.55); this.bits(type, x + Math.cos(an) * rr, 0.35 + Math.random() * 0.4, z + Math.sin(an) * rr, 2, 2, 1); } }
  lineFx(type, x, z, a, len) {
    const cx = Math.cos(a), cz = Math.sin(a);
    for (let i = 0; i < 12; i++) { const d = len * (i + Math.random()) / 12; this.bits(type, x + cx * d, 0.55, z + cz * d, 2, 1.4, 1); }
    if (type === 'Volt') this.bolt(x, 0.55, z, x + cx * len, 0.55, z + cz * len, PAL.Volt.b, 0.05);
    this.light(x + cx * len * 0.4, 0.8, z + cz * len * 0.4, PALHEX[type] || '#ffffff', 30, 0.3);
  }
  // self move: energy rises around the creature
  buff(type, x, z) {
    const P = PAL[type] || PAL.Brawl, A = this.glow;
    for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, rr = 0.35 + Math.random() * 0.35; A.put(2, x + Math.cos(a) * rr, 0.05, z + Math.sin(a) * rr, 0, 2.4 + Math.random() * 2.2, 0, 0.5 + Math.random() * 0.3, 0.5 + Math.random() * 0.4, P.b, P.a, 0, 0.5, -0.3, 0, 1, 1); }
    for (let i = 0; i < 3; i++) A.put(4, x, 0.2 + i * 0.35, z, 0, 0.9, 0, 0.5 + i * 0.08, 0.7, P.b, P.a, 0, 0, 1.6, 0, 0, 0.8);
    this.bits(type, x, 0.4, z, 8, 1, 1.6);
  }
  heal(x, z) {
    const A = this.glow, g = CW.heal, g2 = CW.heal2;
    for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, rr = 0.2 + Math.random() * 0.45; A.put(1, x + Math.cos(a) * rr, 0.1 + Math.random() * 0.5, z + Math.sin(a) * rr, 0, 1.2 + Math.random(), 0, 0.6 + Math.random() * 0.4, 0.3 + Math.random() * 0.2, g2, g, 0, 0.5, -0.3, 0, 0, 1, 0, 0); }
    A.put(4, x, 0.5, z, 0, 0.5, 0, 0.5, 0.8, g2, g, 0, 0, 1.4, 0, 0, 0.7);
  }
  stage(x, z, up) {
    const A = this.glow, c = up ? CW.up : CW.down;
    for (let i = 0; i < 12; i++) { const a = Math.random() * TAU, rr = 0.3 + Math.random() * 0.3; A.put(2, x + Math.cos(a) * rr, up ? 0.1 : 1.6, z + Math.sin(a) * rr, 0, up ? 2.6 : -2.6, 0, 0.5 + Math.random() * 0.2, 0.55, CW.white, c, 0, 0, -0.3, 0, 1, 1); }
    A.put(4, x, up ? 0.3 : 1.2, z, 0, up ? 1.2 : -1.2, 0, 0.5, 0.8, CW.white, c, 0, 0, 1.2, 0, 0, 0.7);
  }
  statusFx(s, x, y, z) {
    const A = this.glow, r = Math.random;
    if (s === 'burn') { A.put(14, x, y, z, 0, 1.3, 0, 0.4 + r() * 0.2, 0.35 + r() * 0.2, CW.hot, PAL.Ember.a, -1, 1, -0.3, 0, 0, 1, 0, 0); if (r() < 0.4) this.dust.put(3, x, y + 0.2, z, 0, 0.7, 0, 0.8, 0.35, CW.smoke, CW.soot, -0.3, 1, 1.2, 1, 0, 0.4); }
    else if (s === 'poison' || s === 'toxic') A.put(9, x, y, z, (r() - 0.5) * 0.4, 0.7, (r() - 0.5) * 0.4, 0.7, 0.2 + r() * 0.14, PAL.Venom.b, PAL.Venom.a, -0.5, 1.5, 0.5, 0, 0, 0.9);
    else if (s === 'para') { A.put(13, x, y, z, 0, 0, 0, 0.1, 0.5 + r() * 0.4, CW.white, PAL.Volt.a, 0, 0, 0.3, 0, 0, 1); A.put(2, x, y, z, (r() - 0.5) * 5, (r() - 0.5) * 5, (r() - 0.5) * 5, 0.12, 0.4, CW.white, PAL.Volt.a, 0, 2, -0.3, 0, 1, 1); }
    else if (s === 'chill') A.put(6, x, y, z, (r() - 0.5) * 0.3, -0.5, (r() - 0.5) * 0.3, 0.7, 0.22 + r() * 0.1, CW.white, PAL.Frost.a, 0.3, 1, 0, (r() - 0.5) * 3, 0, 0.9);
  }
  summon(x, z, col) {
    const A = this.glow, c = lin(col);
    A.put(0, x, 0.5, z, 0, 0, 0, 0.25, 2.6, CW.white, c, 0, 0, 1, 0, 0, 0.9);
    for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, rr = Math.random() * 0.6; A.put(2, x + Math.cos(a) * rr, Math.random() * 0.5, z + Math.sin(a) * rr, 0, 3 + Math.random() * 4, 0, 0.4 + Math.random() * 0.4, 0.6 + Math.random() * 0.4, CW.white, c, 0, 0.6, -0.3, 0, 1, 1); }
    for (let i = 0; i < 2; i++) A.put(4, x, 0.2 + i * 0.5, z, 0, 0, 0, 0.45 + i * 0.1, 0.5, CW.white, c, 0, 0, 3.5, 0, 0, 0.8);
    for (let i = 0; i < 10; i++) { const a = Math.random() * TAU; this.dust.put(3, x, 0.08, z, Math.cos(a) * 2.2, 0.3, Math.sin(a) * 2.2, 0.6, 0.6, CW.dust, CW.dust2, 0, 2.5, 1.3, 1, 0, 0.45); }
    this.light(x, 1, z, col, 50, 0.4);
  }
  faint(x, z, type) {
    const A = this.glow, P = PAL[type] || PAL.Brawl;
    A.put(0, x, 0.5, z, 0, 0, 0, 0.3, 2.4, CW.white, P.a, 0, 0, 1, 0, 0, 0.9);
    for (let i = 0; i < 34; i++) { const a = Math.random() * TAU, rr = Math.random() * 0.6; A.put(i & 1 ? 11 : 0, x + Math.cos(a) * rr, Math.random() * 0.9, z + Math.sin(a) * rr, Math.cos(a) * 0.6, 1 + Math.random() * 2.2, Math.sin(a) * 0.6, 0.7 + Math.random() * 0.6, 0.16 + Math.random() * 0.2, CW.white, P.a, -0.3, 0.8, -0.4, (Math.random() - 0.5) * 5, 0, 1); }
    this.bits(type, x, 0.4, z, 12, 2, 2);
  }
  warp(x, z, type) {
    const A = this.glow, P = PAL[type] || PAL.Brawl;
    for (let i = 0; i < 3; i++) A.put(4, x, 0.3 + i * 0.4, z, 0, 0, 0, 0.3 + i * 0.06, 2.4, P.b, P.a, 0, 0, -0.85, 0, 0, 0.9);
    for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, rr = 0.2 + Math.random() * 0.4; A.put(2, x + Math.cos(a) * rr, 1.6, z + Math.sin(a) * rr, 0, -3 - Math.random() * 2, 0, 0.3 + Math.random() * 0.15, 0.6, CW.white, P.a, 0, 0, -0.3, 0, 1, 1); }
    this.bits(type, x, 0.5, z, 9, 2, 1);
  }
  dashFx(type, x, z, dx, dz, R) {
    const P = PAL[type] || PAL.Brawl, r = Math.random;
    for (let i = 0; i < 2; i++) this.glow.put(2, x - dx * R + (r() - 0.5) * R * 1.4, 0.2 + r() * 0.9, z - dz * R + (r() - 0.5) * R * 1.4, -dx * 3, 0, -dz * 3, 0.22 + r() * 0.1, 0.7 + r() * 0.5, CW.white, P.a, 0, 1, -0.3, 0, 1, 0.85);
    if (r() < 0.5) this.bits(type, x - dx * R, 0.3, z - dz * R, 1, 0.8, 0.6);
    if (r() < 0.6) this.dust.put(3, x - dx * R, 0.06, z - dz * R, -dx, 0.3, -dz, 0.4, 0.45, CW.dust, CW.dust2, 0, 2, 1.3, 1, 0, 0.4);
  }
  starAt(x, y, z, col) { this.glow.put(11, x, y, z, 0, 0, 0, 0.12, 0.26, lin(col), null, 0, 0, 0, 0, 0, 1, 0, this.time * 4); }
  // trail of a shot. Call it each frame.
  trail(type, x, y, z, vx, vz, r) {
    const A = this.glow, D = this.dust, P = PAL[type] || PAL.Brawl, q = Math.random, j = () => (q() - 0.5) * r * 1.6;
    switch (type) {
      case 'Ember': A.put(0, x + j(), y + j(), z + j(), j() * 2, 0.4 + q() * 0.6, j() * 2, 0.3 + q() * 0.15, r * 4.2, CW.hot, P.a, -1, 1, -0.7, 0, 0, 1); if (q() < 0.35) D.put(3, x, y + r, z, 0, 0.5, 0, 0.6, r * 3.5, CW.smoke, CW.soot, -0.3, 1, 1.2, 1, 0, 0.4); break;
      case 'Tide': D.put(8, x + j(), y + j(), z + j(), j(), 0.6, j(), 0.4, r * 2.4, P.b, P.a, 7, 0.5, 0, 0, 1, 0.9); if (q() < 0.5) A.put(9, x + j(), y + j(), z + j(), 0, 0.4, 0, 0.4, r * 1.8, P.b, P.a, -0.3, 1, 0.4, 0, 0, 0.7); break;
      case 'Bloom': D.put(q() < 0.6 ? 7 : 10, x + j(), y + j(), z + j(), j() * 3, 0.5, j() * 3, 0.6, r * 2.6, q() < 0.6 ? P.a : P.c, CW.leaf, 2, 1.5, 0, (q() - 0.5) * 14, 0, 1); break;
      case 'Volt': A.put(13, x + j(), y + j(), z + j(), 0, 0, 0, 0.08, r * 6, CW.white, P.a, 0, 0, 0.2, 0, 0, 1); A.put(2, x, y, z, (q() - 0.5) * 6, (q() - 0.5) * 6, (q() - 0.5) * 6, 0.1, r * 3.5, CW.white, P.a, 0, 2, -0.3, 0, 1, 1); break;
      case 'Frost': A.put(6, x + j(), y + j(), z + j(), j() * 2, -0.2, j() * 2, 0.5, r * 2.8, CW.white, P.a, 0.5, 1, 0, (q() - 0.5) * 6, 0, 0.9); if (q() < 0.3) D.put(3, x, y, z, 0, 0.1, 0, 0.4, r * 3.5, CW.white, CW.mist2, 0, 1, 1, 1, 0, 0.25); break;
      case 'Stone': if (q() < 0.5) D.put(3, x + j(), y + j(), z + j(), 0, 0.2, 0, 0.45, r * 3.6, CW.dust, CW.dust2, 0, 1.5, 1.1, 1, 0, 0.4); if (q() < 0.2) D.put(12, x, y, z, j() * 3, 1, j() * 3, 0.5, r * 1.6, P.b, P.c, 10, 0.3, 0, (q() - 0.5) * 12, 0, 1, 1); break;
      case 'Gale': A.put(15, x + j(), y + j(), z + j(), 0, 0, 0, 0.28, r * 4.5, CW.white, P.a, 0, 1, 0.5, (q() - 0.5) * 24, 0, 0.6); break;
      case 'Venom': D.put(8, x + j(), y, z + j(), j(), -0.6, j(), 0.45, r * 2, P.b, P.a, 7, 0.5, 0, 0, 1, 0.9); if (q() < 0.5) A.put(9, x + j(), y + j(), z + j(), 0, 0.5, 0, 0.45, r * 2, P.b, P.a, -0.4, 1, 0.5, 0, 0, 0.8); break;
      case 'Mind': A.put(11, x + j(), y + j(), z + j(), j() * 2, j() * 2, j() * 2, 0.4, r * 2.4, CW.white, P.a, 0, 2, -0.5, (q() - 0.5) * 8, 0, 1); break;
      case 'Shade': D.put(3, x + j(), y + j(), z + j(), 0, 0.2, 0, 0.5, r * 4, CW.shade, CW.night, -0.2, 1, 1, 1, 0, 0.6); A.put(0, x, y, z, j(), j(), j(), 0.3, r * 2.2, P.a, P.c, 0, 1, -0.6, 0, 0, 1); break;
      case 'Iron': A.put(2, x, y, z, -vx * 0.2 + j() * 4, 0.6, -vz * 0.2 + j() * 4, 0.22, r * 2.6, CW.white, P.c, 6, 0.5, -0.4, 0, 1, 1); break;
      default: A.put(2, x, y, z, -vx * 0.1, 0, -vz * 0.1, 0.15, r * 4.2, CW.white, P.a, 0, 0, -0.3, 0, 1, 0.8);
    }
  }
  // small element particles around a creature. f = its glow point, (x, y, z) = its place, R = its radius.
  ambient(type, fx_, fy, fz, x, y, z, R) {
    const A = this.glow, D = this.dust, P = PAL[type] || PAL.Brawl, r = Math.random, t = this.time;
    switch (type) {
      case 'Ember': A.put(0, fx_ + (r() - 0.5) * 0.14, fy + 0.1, fz + (r() - 0.5) * 0.14, (r() - 0.5) * 0.5, 1.2 + r(), (r() - 0.5) * 0.5, 0.7, 0.1 + r() * 0.08, P.b, P.a, -0.3, 0.5, -0.5, 0, 0, 1); if (r() < 0.4) D.put(3, fx_, fy + 0.3, fz, (r() - 0.5) * 0.3, 0.9, (r() - 0.5) * 0.3, 1.1, 0.35, CW.smoke, CW.soot, -0.2, 0.6, 1.5, 1, 0, 0.35); break;
      case 'Tide': if (r() < 0.6) D.put(8, x + (r() - 0.5) * R * 1.8, y + 0.4 + r() * 0.6, z + (r() - 0.5) * R * 1.8, 0, 0.2, 0, 0.6, 0.14 + r() * 0.08, P.b, P.a, 5, 0, 0, 0, 1, 0.9); break;
      case 'Bloom': if (r() < 0.5) D.put(r() < 0.5 ? 7 : 10, fx_ + (r() - 0.5) * 0.5, fy, fz + (r() - 0.5) * 0.5, (r() - 0.5) * 0.9, 0.6, (r() - 0.5) * 0.9, 1.4, 0.2 + r() * 0.1, r() < 0.5 ? P.a : P.c, CW.leaf, 0.7, 1, 0, (r() - 0.5) * 8, 0, 1); break;
      case 'Volt': A.put(13, fx_ + (r() - 0.5) * 0.4, fy + (r() - 0.5) * 0.4, fz + (r() - 0.5) * 0.4, 0, 0, 0, 0.08, 0.3 + r() * 0.3, CW.white, P.a, 0, 0, 0.3, 0, 0, 1); break;
      case 'Frost': A.put(6, x + (r() - 0.5) * R * 2.4, y + 0.3 + r() * 1.2, z + (r() - 0.5) * R * 2.4, (r() - 0.5) * 0.3, -0.4, (r() - 0.5) * 0.3, 1.1, 0.16 + r() * 0.08, CW.white, P.a, 0, 0, 0, (r() - 0.5) * 3, 0, 0.9); break;
      case 'Gale': if (r() < 0.7) { const a = r() * TAU; A.put(15, x + Math.cos(a) * R * 1.3, y + 0.2 + r(), z + Math.sin(a) * R * 1.3, -Math.sin(a) * 1.6, 0.2, Math.cos(a) * 1.6, 0.45, 0.4 + r() * 0.3, CW.white, P.a, 0, 0, 0.4, 8, 0, 0.5); } break;
      case 'Venom': if (r() < 0.7) A.put(9, fx_ + (r() - 0.5) * 0.25, fy, fz + (r() - 0.5) * 0.25, (r() - 0.5) * 0.3, 0.7, (r() - 0.5) * 0.3, 0.8, 0.14 + r() * 0.1, P.b, P.a, -0.3, 1, 0.5, 0, 0, 0.9); break;
      case 'Mind': A.put(11, fx_ + Math.cos(t * 3) * 0.32, fy + Math.sin(t * 2) * 0.1, fz + Math.sin(t * 3) * 0.32, 0, 0.3, 0, 0.6, 0.16, CW.white, P.a, 0, 0, -0.5, 4, 0, 1); break;
      case 'Shade': D.put(3, x + (r() - 0.5) * R * 1.6, y + 0.1, z + (r() - 0.5) * R * 1.6, (r() - 0.5) * 0.3, 0.7, (r() - 0.5) * 0.3, 0.9, 0.35, CW.shade, CW.night, -0.2, 0.5, 1.2, 1, 0, 0.5); break;
      case 'Stone': if (r() < 0.2) D.put(3, x + (r() - 0.5) * R * 1.6, 0.05, z + (r() - 0.5) * R * 1.6, 0, 0.3, 0, 0.8, 0.3, CW.dust, CW.dust2, 0, 1, 1.5, 1, 0, 0.35); break;
      case 'Iron': if (r() < 0.25) A.put(1, fx_ + (r() - 0.5) * 0.5, fy + (r() - 0.5) * 0.5, fz + (r() - 0.5) * 0.5, 0, 0, 0, 0.25, 0.3 + r() * 0.2, CW.white, P.a, 0, 0, 0.3, 3, 0, 1); break;
      case 'Brawl': if (r() < 0.25) A.put(2, fx_, fy, fz, (r() - 0.5) * 2, 1.5, (r() - 0.5) * 2, 0.3, 0.3, CW.white, P.a, 0, 1, -0.3, 0, 1, 0.9); break;
    }
  }
  // particles of a floor zone. (px, pz) = a random place in it, (cx, cz) = its centre.
  zoneFx(kind, px, pz, cx, cz) {
    const A = this.glow, D = this.dust, r = Math.random;
    switch (kind) {
      case 'lava': A.put(14, px, 0.05, pz, 0, 1.2 + r(), 0, 0.5 + r() * 0.3, 0.35 + r() * 0.3, CW.hot, PAL.Ember.a, -1, 1, -0.3, 0, 0, 1, 0, 0); if (r() < 0.5) A.put(0, px, 0.1, pz, (r() - 0.5), 2 + r() * 2, (r() - 0.5), 0.8, 0.1, PAL.Ember.b, PAL.Ember.a, 3, 0.5, -0.5, 0, 0, 1, 1); break;
      case 'toxic': A.put(9, px, 0.05, pz, 0, 0.5 + r() * 0.4, 0, 0.9, 0.2 + r() * 0.2, PAL.Venom.b, PAL.Venom.a, -0.2, 1, 0.6, 0, 0, 0.9); break;
      case 'bubbles': A.put(9, px, 0.1, pz, 0, 0.4 + r() * 0.3, 0, 1.2, 0.25 + r() * 0.25, CW.white, PAL.Tide.a, -0.1, 0.5, 0.4, 0, 0, 0.8); break;
      case 'ice': A.put(6, px, 0.1 + r() * 0.4, pz, 0, 0.15, 0, 0.6, 0.18 + r() * 0.1, CW.white, PAL.Frost.a, 0, 0, 0, (r() - 0.5) * 3, 0, 0.9); break;
      case 'vines': D.put(7, px, 0.1, pz, (r() - 0.5) * 0.6, 0.9, (r() - 0.5) * 0.6, 1, 0.2 + r() * 0.12, PAL.Bloom.a, CW.leaf, 1.5, 1, 0, (r() - 0.5) * 8, 0, 1); break;
      case 'gravity': A.put(11, px, 0.9 + r() * 0.6, pz, (cx - px) * 1.5, -1.2, (cz - pz) * 1.5, 0.6, 0.2, CW.white, PAL.Mind.a, 0, 0, -0.6, 5, 0, 1); break;
      case 'volt': A.put(13, px, 0.2 + r() * 0.5, pz, 0, 0, 0, 0.1, 0.6 + r() * 0.5, CW.white, PAL.Volt.a, 0, 0, 0.3, 0, 0, 1, 0, 1.57); if (r() < 0.4) this.bolt(px, 0.05, pz, px + (r() - 0.5) * 0.8, 0.8 + r() * 0.6, pz + (r() - 0.5) * 0.8, PAL.Volt.b, 0.03); break;
      case 'smoke': D.put(3, px, 0.15, pz, (r() - 0.5) * 0.4, 0.45, (r() - 0.5) * 0.4, 1.7, 0.7 + r() * 0.4, r() < 0.5 ? CW.incense : CW.gold, CW.incense2, 0, 0.4, 1.4, (r() - 0.5), 0, 0.5); break;
      case 'spikes': if (r() < 0.3) A.put(1, px, 0.2, pz, 0, 0, 0, 0.3, 0.3, CW.white, PAL.Iron.a, 0, 0, 0.3, 2, 0, 0.9); break;
    }
  }
  begin() { this.tele.begin(); this.zcur = 0; }
  end() { this.tele.end(); this.zoneEnd(); }
  zoneEnd() { for (let i = this.zcur; i < this.zones.length; i++) this.zones[i].visible = false; }
  zone(kind, x, z, r, alpha, col, edge) {
    if (this.zcur >= this.zones.length) return;
    const m = this.zones[this.zcur++], u = m.material.uniforms;
    m.visible = true; m.position.set(x, 0.03 + this.zcur * 0.002, z); m.scale.set(r, r, 1);
    u.uKind.value = kind; u.uCol.value.copy(lin(col)); u.uEdge.value.copy(lin(edge)); u.uA.value = alpha; u.uTime.value = this.time;
  }
  update(dt) {
    this.time += dt;
    this.glow.update(dt); this.dust.update(dt);
    this.marks.begin();
    let i = this.timed.length;
    while (i--) {
      const s = this.timed[i]; s.t += dt;
      const q = s.t / s.max;
      if (q >= 1) { this.timed.splice(i, 1); continue; }
      const e = 1 - (1 - q) * (1 - q), a = 1 - q;
      if (s.k === 3) this.marks.put(3, s.x, s.z, s.y, s.r0 + (s.r1 - s.r0) * e, 0, { col: s.col, w: s.w * (0.4 + 0.6 * a), a: a, hdr: 2.2 });
      else if (s.k === 1) this.marks.put(1, s.x, s.z, s.y, s.r0 + (s.r1 - s.r0) * e, s.ang, { col: s.col, edge: _c.set(0xffffff), arc: s.arc, fill: 0.5, q: 0, a: a, w: 0.12, hdr: 1.8 });
      else this.marks.put(0, s.x, s.z, s.y, s.r1, 0, { col: s.col, fill: 0.45, a: a * a, w: 0.08, hdr: 1.8 });
    }
    this.marks.end();
    this.stainPool.begin();
    for (i = this.stains.length - 1; i >= 0; i--) {
      const st = this.stains[i]; st.t += dt;
      if (st.t >= st.max) { this.stains.splice(i, 1); continue; }
      const q = st.t / st.max;
      this.stainPool.put(4, st.x, st.z, 0.02, st.r, 0, { col: st.col, fill: st.a * Math.min(1, st.t * 6) * (q > 0.6 ? (1 - q) / 0.4 : 1) });
    }
    this.stainPool.end();
    for (const l of this.lights) { const u = l.userData; if (u.t >= u.max) { l.intensity = 0; continue; } u.t += dt; const q = Math.max(0, 1 - u.t / u.max); l.intensity = u.k * q * q; }
    for (const b of this.beams) {
      if (!b.visible) continue;
      const u = b.userData; u.t += dt;
      const q = u.t / u.max;
      if (q >= 1) { b.visible = false; continue; }
      const w = u.w * (1 - q) * (1 + 0.15 * Math.sin(this.time * 60));
      b.scale.set(u.len, w, w); u.outer.material.opacity = 0.75 * (1 - q); u.inner.material.opacity = 1 - q * q;
    }
  }
}

// Soft round glow picture for sprites.
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
