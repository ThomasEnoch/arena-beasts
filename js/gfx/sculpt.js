/* Arena Beasts - sculpt: creature bodies made from smooth-blended volumes.
   A creature is a list of volumes (ellipsoids, capsules, boxes, rings). Each volume has a bone and a colour.
   build() changes the volumes into one skinned mesh with baked colour, glow, gloss and soft contact shadow.
   Model space: +X = forward, +Y = up, Z = side. A name that ends in "L" has a mirror twin that ends in "R". */
import * as THREE from 'three';

const D2R = Math.PI / 180, BIG = 1e3;
const _c = new THREE.Color(), _e = new THREE.Euler(), _m = new THREE.Matrix4();
export function rgb(h) { _c.set(h); return [_c.r, _c.g, _c.b]; }
export function mir(n) { return n.endsWith('L') ? n.slice(0, -1) + 'R' : n; }
function smin(a, b, k) {
  const m = a < b ? a : b;
  if (k <= 0) return m;
  const h = k - Math.abs(a - b);
  return h <= 0 ? m : m - h * h / (4 * k);
}
function rotE(r, s) { _e.set(r[0] * s * D2R, r[1] * s * D2R, r[2] * D2R, 'XYZ'); return Array.from(_m.makeRotationFromEuler(_e).elements); }

function hash(i, j, k) {
  let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1274126177) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function noise(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  let u = x - i, v = y - j, w = z - k;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); w = w * w * (3 - 2 * w);
  const a = hash(i, j, k), b = hash(i + 1, j, k), c = hash(i, j + 1, k), d = hash(i + 1, j + 1, k);
  const e = hash(i, j, k + 1), f = hash(i + 1, j, k + 1), g = hash(i, j + 1, k + 1), h = hash(i + 1, j + 1, k + 1);
  const x0 = a + (b - a) * u, x1 = c + (d - c) * u, x2 = e + (f - e) * u, x3 = g + (h - g) * u;
  const y0 = x0 + (x1 - x0) * v, y1 = x2 + (x3 - x2) * v;
  return y0 + (y1 - y0) * w;
}

export class Sculpt {
  constructor(o = {}) {
    this.cell = o.cell || 0.028;
    this.k = o.k === undefined ? 0.06 : o.k;     // default blend radius between volumes
    this.cb = o.cb || 0.022;                     // colour blend width
    this.sb = o.sb || 0.1;                       // skin blend width
    this.c = '#ffffff';
    this.prims = []; this.bones = []; this.bix = {}; this.atts = []; this.eyes = []; this.paints = [];
    this.mottleAmt = o.mottle === undefined ? 0.1 : o.mottle; this.mottleF = o.mottleF || 9;
    this.shade = o.shade || [0.14, 0.24];        // lighter on top, darker below
  }
  color(h) { this.c = h; return this; }
  bone(name, parent, p, o) {
    const add = (n, par, q) => { this.bix[n] = this.bones.length; this.bones.push({ name: n, parent: par, p: q }); };
    add(name, parent, p);
    if (o && o.m) add(mir(name), parent && this.bix[mir(parent)] !== undefined ? mir(parent) : parent, [p[0], p[1], -p[2]]);
    return this;
  }
  _p(bone, mk, o) {
    const one = s => {
      const g = mk(s), bn = s < 0 ? mir(bone) : bone;
      if (this.bix[bn] === undefined) throw new Error('Unknown bone: ' + bn);
      this.prims.push({
        f: g.f, lo: g.lo, hi: g.hi, k: o.k === undefined ? this.k : o.k, sub: !!o.sub, paint: !!o.paint, bone: this.bix[bn],
        col: rgb(o.col || this.c), glow: o.glow || 0, gloss: o.gloss || 0, metal: o.metal || 0, cb: o.cb || this.cb, sb: o.sb || this.sb,
        w: o.w === undefined ? 1 : o.w, op: o.op === undefined ? 1 : o.op, keep: !!o.keep
      });
    };
    one(1); if (o.m) one(-1);
    return this;
  }
  // ellipsoid
  ell(bone, c, r, o = {}) {
    if (typeof r === 'number') r = [r, r, r];
    return this._p(bone, s => {
      const cx = c[0], cy = c[1], cz = c[2] * s, rx = r[0], ry = r[1], rz = r[2], R = o.rot ? rotE(o.rot, s) : null;
      const ix = 1 / rx, iy = 1 / ry, iz = 1 / rz, ix2 = ix * ix, iy2 = iy * iy, iz2 = iz * iz, mn = Math.min(rx, ry, rz), rm = Math.max(rx, ry, rz);
      const f = (x, y, z) => {
        let px = x - cx, py = y - cy, pz = z - cz;
        if (R) { const qx = R[0] * px + R[1] * py + R[2] * pz, qy = R[4] * px + R[5] * py + R[6] * pz; pz = R[8] * px + R[9] * py + R[10] * pz; px = qx; py = qy; }
        const ax = px * ix, ay = py * iy, az = pz * iz, k0 = Math.sqrt(ax * ax + ay * ay + az * az);
        if (k0 < 1e-6) return -mn;
        const bx = px * ix2, by = py * iy2, bz = pz * iz2;
        return k0 * (k0 - 1) / Math.sqrt(bx * bx + by * by + bz * bz);
      };
      const e = R ? [rm, rm, rm] : r;
      return { f, lo: [cx - e[0], cy - e[1], cz - e[2]], hi: [cx + e[0], cy + e[1], cz + e[2]] };
    }, o);
  }
  // capsule with a different radius at each end
  cap(bone, a, b, ra, rb, o = {}) {
    if (rb === undefined) rb = ra;
    return this._p(bone, s => {
      const ax = a[0], ay = a[1], az = a[2] * s, bx = b[0] - ax, by = b[1] - ay, bz = b[2] * s - az, bb = bx * bx + by * by + bz * bz || 1e-9, dr = rb - ra;
      const f = (x, y, z) => {
        const px = x - ax, py = y - ay, pz = z - az;
        let h = (px * bx + py * by + pz * bz) / bb; h = h < 0 ? 0 : h > 1 ? 1 : h;
        const dx = px - bx * h, dy = py - by * h, dz = pz - bz * h;
        return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + dr * h);
      };
      const ex = ax + bx, ey = ay + by, ez = az + bz;
      return {
        f, lo: [Math.min(ax - ra, ex - rb), Math.min(ay - ra, ey - rb), Math.min(az - ra, ez - rb)],
        hi: [Math.max(ax + ra, ex + rb), Math.max(ay + ra, ey + rb), Math.max(az + ra, ez + rb)]
      };
    }, o);
  }
  // box with round edges
  box(bone, c, b, rr, o = {}) {
    return this._p(bone, s => {
      const cx = c[0], cy = c[1], cz = c[2] * s, hx = b[0] - rr, hy = b[1] - rr, hz = b[2] - rr, R = o.rot ? rotE(o.rot, s) : null;
      const f = (x, y, z) => {
        let px = x - cx, py = y - cy, pz = z - cz;
        if (R) { const qx = R[0] * px + R[1] * py + R[2] * pz, qy = R[4] * px + R[5] * py + R[6] * pz; pz = R[8] * px + R[9] * py + R[10] * pz; px = qx; py = qy; }
        const qx = Math.abs(px) - hx, qy = Math.abs(py) - hy, qz = Math.abs(pz) - hz;
        const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0, oz = qz > 0 ? qz : 0, m = Math.max(qx, qy, qz);
        return Math.sqrt(ox * ox + oy * oy + oz * oz) + (m < 0 ? m : 0) - rr;
      };
      const e = R ? Math.sqrt(b[0] * b[0] + b[1] * b[1] + b[2] * b[2]) : 0, ex = R ? e : b[0], ey = R ? e : b[1], ez = R ? e : b[2];
      return { f, lo: [cx - ex, cy - ey, cz - ez], hi: [cx + ex, cy + ey, cz + ez] };
    }, o);
  }
  // ring (torus). The ring lies flat (axis = Y) before the rotation.
  tor(bone, c, R0, r, o = {}) {
    return this._p(bone, s => {
      const cx = c[0], cy = c[1], cz = c[2] * s, R = o.rot ? rotE(o.rot, s) : null, e = R0 + r;
      const f = (x, y, z) => {
        let px = x - cx, py = y - cy, pz = z - cz;
        if (R) { const qx = R[0] * px + R[1] * py + R[2] * pz, qy = R[4] * px + R[5] * py + R[6] * pz; pz = R[8] * px + R[9] * py + R[10] * pz; px = qx; py = qy; }
        const q = Math.sqrt(px * px + pz * pz) - R0;
        return Math.sqrt(q * q + py * py) - r;
      };
      return { f, lo: [cx - e, cy - e, cz - e], hi: [cx + e, cy + e, cz + e] };
    }, o);
  }
  // chain of capsules through points. bones: one name, or one name for each segment.
  tube(bones, pts, radii, o = {}) {
    for (let i = 0; i < pts.length - 1; i++) this.cap(Array.isArray(bones) ? bones[Math.min(i, bones.length - 1)] : bones, pts[i], pts[i + 1], radii[i], radii[i + 1], o);
    return this;
  }
  // fn(p, n, c, info): change the colour c = [r, g, b] (linear) of one vertex. info = { glow, gloss }.
  paint(fn) { this.paints.push(fn); return this; }
  // rigid part on a bone. o: { p, r (degrees), s, m (mirror), name, outline }
  add(bone, geo, mat, o = {}) {
    if (o.s) { geo = geo.clone(); geo.userData = {}; const s = typeof o.s === 'number' ? [o.s, o.s, o.s] : o.s; geo.scale(s[0], s[1], s[2]); }
    const p = o.p || [0, 0, 0], r = o.r || [0, 0, 0];
    this.atts.push({ bone, geo, mat, p, r, name: o.name, flip: false, outline: o.outline !== false, order: o.order });
    if (o.m) this.atts.push({ bone: mir(bone), geo, mat, p: [p[0], p[1], -p[2]], r: [-r[0], -r[1], r[2]], name: o.name ? mir(o.name) : undefined, flip: true, outline: o.outline !== false, order: o.order });
    return this;
  }
  // eye on a bone. o: { dir, iris, iris2, pupil, sclera, lid, open, tilt, glow, sy, m }
  eye(bone, p, r, o = {}) {
    const d = o.dir || [1, 0, 0];
    this.eyes.push(Object.assign({}, o, { bone, p, r, dir: d, side: 1 }));
    if (o.m) this.eyes.push(Object.assign({}, o, { bone: mir(bone), p: [p[0], p[1], -p[2]], r, dir: [d[0], d[1], -d[2]], side: -1 }));
    return this;
  }

  build() {
    const h = this.cell, P = this.prims, lo = [BIG, BIG, BIG], hi = [-BIG, -BIG, -BIG];
    let a, i, j, k, ix;
    for (const p of P) if (!p.sub && !p.paint) for (a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p.lo[a]); hi[a] = Math.max(hi[a], p.hi[a]); }
    for (a = 0; a < 3; a++) { lo[a] -= 3 * h; hi[a] += 3 * h; }
    const nx = Math.ceil((hi[0] - lo[0]) / h) + 1, ny = Math.ceil((hi[1] - lo[1]) / h) + 1, nz = Math.ceil((hi[2] - lo[2]) / h) + 1, nxy = nx * ny;
    const lx = lo[0], ly = lo[1], lz = lo[2], D = new Float32Array(nxy * nz).fill(BIG);

    // 1. Put each volume into the grid, in the order of the definition.
    for (const p of P) {
      if (p.paint) continue;
      const m = p.k + 0.1, f = p.f, kk = p.k, sub = p.sub;
      const i0 = Math.max(0, Math.floor((p.lo[0] - m - lx) / h)), i1 = Math.min(nx - 1, Math.ceil((p.hi[0] + m - lx) / h));
      const j0 = Math.max(0, Math.floor((p.lo[1] - m - ly) / h)), j1 = Math.min(ny - 1, Math.ceil((p.hi[1] + m - ly) / h));
      const k0 = Math.max(0, Math.floor((p.lo[2] - m - lz) / h)), k1 = Math.min(nz - 1, Math.ceil((p.hi[2] + m - lz) / h));
      for (k = k0; k <= k1; k++) {
        const z = lz + k * h;
        for (j = j0; j <= j1; j++) {
          const y = ly + j * h;
          ix = k * nxy + j * nx + i0;
          for (i = i0; i <= i1; i++, ix++) {
            const d = f(lx + i * h, y, z), v = D[ix];
            D[ix] = sub ? -smin(-v, d, kk) : smin(v, d, kk);
          }
        }
      }
    }
    for (i = 0; i < D.length; i++) if (D[i] > 0.5) D[i] = 0.5;

    // 2. Surface nets: one vertex in each grid cell that the surface crosses.
    const cv = new Int32Array(nxy * nz).fill(-1), pos = [], g = new Float32Array(8);
    const off = [0, 1, nx, nx + 1, nxy, nxy + 1, nxy + nx, nxy + nx + 1];
    const EA = [0, 2, 4, 6, 0, 1, 4, 5, 0, 1, 2, 3], EB = [1, 3, 5, 7, 2, 3, 6, 7, 4, 5, 6, 7];
    let nv = 0, c, e, mask;
    for (k = 0; k < nz - 1; k++) for (j = 0; j < ny - 1; j++) {
      ix = k * nxy + j * nx;
      for (i = 0; i < nx - 1; i++, ix++) {
        mask = 0;
        for (c = 0; c < 8; c++) { g[c] = D[ix + off[c]]; if (g[c] < 0) mask |= 1 << c; }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (e = 0; e < 12; e++) {
          const ea = EA[e], eb = EB[e];
          if (((mask >> ea) & 1) === ((mask >> eb) & 1)) continue;
          const t = g[ea] / (g[ea] - g[eb]);
          const ax = ea & 1, ay = (ea >> 1) & 1, az = ea >> 2;
          sx += ax + ((eb & 1) - ax) * t; sy += ay + (((eb >> 1) & 1) - ay) * t; sz += az + ((eb >> 2) - az) * t; n++;
        }
        pos.push(lx + (i + sx / n) * h, ly + (j + sy / n) * h, lz + (k + sz / n) * h);
        cv[ix] = nv++;
      }
    }
    const idx = [];
    const quad = (A, B, C, Dd, flip) => {
      if (A < 0 || B < 0 || C < 0 || Dd < 0) return;
      if (flip) idx.push(A, Dd, C, A, C, B); else idx.push(A, B, C, A, C, Dd);
    };
    for (k = 1; k < nz - 1; k++) for (j = 1; j < ny - 1; j++) {
      ix = k * nxy + j * nx + 1;
      for (i = 1; i < nx - 1; i++, ix++) {
        const d0 = D[ix] < 0;
        if ((D[ix + 1] < 0) !== d0) quad(cv[ix - nx - nxy], cv[ix - nxy], cv[ix], cv[ix - nx], !d0);
        if ((D[ix + nx] < 0) !== d0) quad(cv[ix - 1 - nxy], cv[ix - 1], cv[ix], cv[ix - nxy], !d0);
        if ((D[ix + nxy] < 0) !== d0) quad(cv[ix - 1 - nx], cv[ix - nx], cv[ix], cv[ix - 1], !d0);
      }
    }

    // 3. Normals and contact shadow from the grid. Colour, glow, gloss and bone weights from the volumes.
    const samp = (x, y, z) => {
      let fx = (x - lx) / h, fy = (y - ly) / h, fz = (z - lz) / h;
      fx = fx < 0 ? 0 : fx > nx - 1.001 ? nx - 1.001 : fx; fy = fy < 0 ? 0 : fy > ny - 1.001 ? ny - 1.001 : fy; fz = fz < 0 ? 0 : fz > nz - 1.001 ? nz - 1.001 : fz;
      const i0 = fx | 0, j0 = fy | 0, k0 = fz | 0, tx = fx - i0, ty = fy - j0, tz = fz - k0, q = k0 * nxy + j0 * nx + i0;
      const a0 = D[q] + (D[q + 1] - D[q]) * tx, a1 = D[q + nx] + (D[q + nx + 1] - D[q + nx]) * tx;
      const a2 = D[q + nxy] + (D[q + nxy + 1] - D[q + nxy]) * tx, a3 = D[q + nxy + nx] + (D[q + nxy + nx + 1] - D[q + nxy + nx]) * tx;
      const b0 = a0 + (a1 - a0) * ty, b1 = a2 + (a3 - a2) * ty;
      return b0 + (b1 - b0) * tz;
    };
    const nb = this.bones.length, NP = P.length, dd = new Float32Array(NP), bw = new Float32Array(nb);
    const position = new Float32Array(pos), normal = new Float32Array(nv * 3), color = new Float32Array(nv * 3), fx = new Float32Array(nv * 3);
    const skinIndex = new Uint16Array(nv * 4), skinWeight = new Float32Array(nv * 4);
    const pt = { x: 0, y: 0, z: 0 }, nn = { x: 0, y: 0, z: 0 }, col = [0, 0, 0], info = { glow: 0, gloss: 0, metal: 0, ao: 1 }, sT = this.shade[0], sB = this.shade[1];
    const mA = this.mottleAmt, mF = this.mottleF;
    for (let v = 0; v < nv; v++) {
      const x = position[v * 3], y = position[v * 3 + 1], z = position[v * 3 + 2];
      let gx = samp(x + h, y, z) - samp(x - h, y, z), gy = samp(x, y + h, z) - samp(x, y - h, z), gz = samp(x, y, z + h) - samp(x, y, z - h);
      const gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1; gx /= gl; gy /= gl; gz /= gl;
      normal[v * 3] = gx; normal[v * 3 + 1] = gy; normal[v * 3 + 2] = gz;
      // shape volumes near this vertex
      let amin = BIG;
      for (i = 0; i < NP; i++) {
        const p = P[i];
        if (p.sub || p.paint) continue;
        const mg = Math.max(p.cb, p.sb) + 0.03;
        if (x < p.lo[0] - mg || x > p.hi[0] + mg || y < p.lo[1] - mg || y > p.hi[1] + mg || z < p.lo[2] - mg || z > p.hi[2] + mg) { dd[i] = BIG; continue; }
        const d = p.f(x, y, z); dd[i] = d; if (d < amin) amin = d;
      }
      let r = 0, gg = 0, b = 0, glow = 0, gloss = 0, metal = 0, ws = 0, t;
      bw.fill(0);
      for (i = 0; i < NP; i++) {
        const p = P[i];
        if (p.sub || p.paint || dd[i] === BIG) continue;
        t = 1 - (dd[i] - amin) / p.cb;
        if (t > 0) { t *= t; r += p.col[0] * t; gg += p.col[1] * t; b += p.col[2] * t; glow += p.glow * t; gloss += p.gloss * t; metal += p.metal * t; ws += t; }
        t = 1 - (dd[i] - amin) / p.sb;
        if (t > 0) bw[p.bone] += t * t * t * p.w;
      }
      if (ws > 0) { r /= ws; gg /= ws; b /= ws; glow /= ws; gloss /= ws; metal /= ws; }
      // inside of a cut (mouth, nostril, socket)
      if (amin < -h * 0.4) {
        const deep = Math.min(1, (-amin - h * 0.4) / h);
        for (i = 0; i < NP; i++) {
          const p = P[i];
          if (!p.sub || p.keep) continue;
          const mg = h * 2;
          if (x < p.lo[0] - mg || x > p.hi[0] + mg || y < p.lo[1] - mg || y > p.hi[1] + mg || z < p.lo[2] - mg || z > p.hi[2] + mg) continue;
          t = (1 - Math.abs(p.f(x, y, z)) / (h * 1.8)) * deep;
          if (t > 0) { t = Math.min(1, t * 1.6); r += (p.col[0] - r) * t; gg += (p.col[1] - gg) * t; b += (p.col[2] - b) * t; glow += (p.glow - glow) * t; gloss += (p.gloss - gloss) * t; metal += (p.metal - metal) * t; }
        }
      }
      // paint volumes: colour only
      for (i = 0; i < NP; i++) {
        const p = P[i];
        if (!p.paint) continue;
        const mg = p.cb;
        if (x < p.lo[0] - mg || x > p.hi[0] + mg || y < p.lo[1] - mg || y > p.hi[1] + mg || z < p.lo[2] - mg || z > p.hi[2] + mg) continue;
        t = 0.5 - p.f(x, y, z) / (2 * p.cb);
        if (t <= 0) continue;
        if (t > 1) t = 1;
        t = t * t * (3 - 2 * t) * p.op;
        r += (p.col[0] - r) * t; gg += (p.col[1] - gg) * t; b += (p.col[2] - b) * t; glow += (p.glow - glow) * t; gloss += (p.gloss - gloss) * t; metal += (p.metal - metal) * t;
      }
      // contact shadow in the folds
      let ao = 0.5 * Math.min(1, Math.max(0, samp(x + gx * 0.05, y + gy * 0.05, z + gz * 0.05) / 0.05)) + 0.5 * Math.min(1, Math.max(0, samp(x + gx * 0.16, y + gy * 0.16, z + gz * 0.16) / 0.16));
      pt.x = x; pt.y = y; pt.z = z; nn.x = gx; nn.y = gy; nn.z = gz; col[0] = r; col[1] = gg; col[2] = b; info.glow = glow; info.gloss = gloss; info.metal = metal; info.ao = ao;
      { const ks = gy > 0 ? 1 + gy * sT : 1 + gy * sB; col[0] *= ks; col[1] *= ks; col[2] *= ks; }
      for (const fn of this.paints) fn(pt, nn, col, info);
      const mt = 1 + mA * (noise(x * mF, y * mF, z * mF) * 0.65 + noise(x * mF * 2.7, y * mF * 2.7, z * mF * 2.7) * 0.35 - 0.5) * 2;
      const sh = (0.42 + 0.58 * info.ao) * mt;
      color[v * 3] = col[0] * sh; color[v * 3 + 1] = col[1] * sh; color[v * 3 + 2] = col[2] * sh;
      fx[v * 3] = info.glow; fx[v * 3 + 1] = info.gloss; fx[v * 3 + 2] = info.metal;
      // the 4 strongest bones
      let tot = 0;
      for (c = 0; c < 4; c++) {
        let best = -1, bv = 0;
        for (i = 0; i < nb; i++) if (bw[i] > bv) { bv = bw[i]; best = i; }
        if (best < 0) break;
        skinIndex[v * 4 + c] = best; skinWeight[v * 4 + c] = bv; tot += bv; bw[best] = 0;
      }
      if (tot > 0) for (c = 0; c < 4; c++) skinWeight[v * 4 + c] /= tot; else skinWeight[v * 4] = 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
    geo.setAttribute('aFx', new THREE.BufferAttribute(fx, 3));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    return { geo, bones: this.bones, atts: this.atts, eyes: this.eyes, verts: nv, tris: idx.length / 3 };
  }
}
