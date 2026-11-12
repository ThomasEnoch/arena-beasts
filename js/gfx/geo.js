/* Arena Beasts - geometry helpers for rigid creature parts: horns, claws, wings, crystals, plates. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (p) => new THREE.Vector3(p[0], p[1], p[2]);

// Tube along a smooth curve through pts. radii: one radius for each point (the tube can get thin to a point).
export function tube(pts, radii, o = {}) {
  const ring = o.ring || 8, curve = new THREE.CatmullRomCurve3(pts.map(V), false, 'catmullrom', 0.5);
  const n = o.seg || (pts.length - 1) * 6, fr = curve.computeFrenetFrames(n, false);
  const pos = [], nor = [], idx = [], c = new THREE.Vector3(), d = new THREE.Vector3();
  let i, j;
  for (i = 0; i <= n; i++) {
    const u = i / n, f = u * (radii.length - 1), i0 = Math.min(radii.length - 2, Math.floor(f));
    const r = Math.max(0.0005, radii[i0] + (radii[i0 + 1] - radii[i0]) * (f - i0)), N = fr.normals[i], B = fr.binormals[i];
    curve.getPointAt(u, c);
    for (j = 0; j < ring; j++) {
      const a = j / ring * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
      d.set(N.x * cs + B.x * sn, N.y * cs + B.y * sn, N.z * cs + B.z * sn);
      pos.push(c.x + d.x * r, c.y + d.y * r, c.z + d.z * r); nor.push(d.x, d.y, d.z);
    }
  }
  for (i = 0; i < n; i++) for (j = 0; j < ring; j++) {
    const a = i * ring + j, b = i * ring + (j + 1) % ring, e = a + ring, f2 = b + ring;
    idx.push(a, b, e, b, f2, e);
  }
  // caps
  const cap = (at, tSign) => {
    const u = at ? 1 : 0, base = at ? n * ring : 0, T = fr.tangents[at ? n : 0], ci = pos.length / 3;
    curve.getPointAt(u, c); pos.push(c.x, c.y, c.z); nor.push(T.x * tSign, T.y * tSign, T.z * tSign);
    for (j = 0; j < ring; j++) { const a = base + j, b = base + (j + 1) % ring; if (at) idx.push(ci, a, b); else idx.push(ci, b, a); }
  };
  cap(0, -1); cap(1, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

// Flat part with thickness from a 2D outline (points [x, y]). smooth: curve through the points.
export function blade(pts, depth, o = {}) {
  const sh = new THREE.Shape();
  if (o.smooth) { sh.moveTo(pts[0][0], pts[0][1]); sh.splineThru(pts.slice(1).concat([pts[0]]).map(p => new THREE.Vector2(p[0], p[1]))); }
  else { sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath(); }
  const bev = o.bevel === undefined ? depth * 0.45 : o.bevel;
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.0001, depth - bev * 2), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: o.bevelSeg || 2, curveSegments: o.curve || 10 });
  g.translate(0, 0, -(depth - bev * 2) / 2);
  return g;
}

// Body of revolution from a profile (points [radius, y]).
export function lathe(profile, seg = 20) {
  return new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(Math.max(0.0001, p[0]), p[1])), seg);
}

// Crystal: a double pyramid with flat faces. Sizes: radius, height up, height down, sides.
export function crystal(r, up, down, sides = 6) {
  const pos = [], idx = [];
  for (let i = 0; i < sides; i++) { const a = i / sides * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
  pos.push(0, up, 0, 0, -down, 0);
  for (let i = 0; i < sides; i++) { const j = (i + 1) % sides; idx.push(i, sides, j, j, sides + 1, i); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const f = g.toNonIndexed(); f.computeVertexNormals();
  return f;
}

export function ball(r, w = 20, h = 14) { return new THREE.SphereGeometry(r, w, h); }
export function cone(r, h, seg = 14) { const g = new THREE.ConeGeometry(r, h, seg, 1); g.translate(0, h / 2, 0); return g; }
export function rbox(x, y, z) { return new THREE.BoxGeometry(x, y, z); }
export function torus(R, r, seg = 28, tube_ = 10, arc = Math.PI * 2) { return new THREE.TorusGeometry(R, r, tube_, seg, arc); }

// Flame or drop shape: round at the bottom, a point at the top.
export function flame(r, h, seg = 14) {
  const pr = [], n = 12;
  for (let i = 0; i <= n; i++) { const t = i / n, w = Math.sin(Math.PI * Math.pow(t, 0.62)) * (1 - t * 0.25); pr.push([Math.max(0.0001, w * r), t * h]); }
  return lathe(pr, seg);
}

// A copy with smooth normals. The outline pass needs it for parts with hard edges.
export function smoothCopy(geo) {
  if (geo.userData.sm) return geo.userData.sm;
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.getAttribute('position').clone());
  if (geo.index) g.setIndex(geo.index.clone());
  g = mergeVertices(g, 1e-4); g.computeVertexNormals();
  geo.userData.sm = g;
  return g;
}

// Thin flat part with a texture: wing, fin, leaf. Outline points are [span, chord].
// The span goes to +Z, the chord to +X, the thickness to Y.
export function wing(pts, depth, o = {}) {
  const g = blade(pts, depth, Object.assign({ smooth: true, bevelSeg: 1 }, o)), P = g.getAttribute('position'), U = g.getAttribute('uv');
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, i;
  for (i = 0; i < P.count; i++) { x0 = Math.min(x0, P.getX(i)); x1 = Math.max(x1, P.getX(i)); y0 = Math.min(y0, P.getY(i)); y1 = Math.max(y1, P.getY(i)); }
  for (i = 0; i < P.count; i++) {
    const u = P.getX(i), v = P.getY(i), w = P.getZ(i);
    U.setXY(i, (u - x0) / (x1 - x0), (v - y0) / (y1 - y0));
    P.setXYZ(i, v, w, u);
  }
  g.computeVertexNormals();
  return g;
}

// Canvas texture helper. draw(ctx, w, h).
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
