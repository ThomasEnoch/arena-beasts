/* Arena Beasts - procedural pixel sprites. Each creature is drawn on a 48x48 texel grid,
   then hardened to pixels (alpha threshold + 1-texel dark outline) and stored at 3x.
   Anchor texel is (24,38): that point sits on the creature's ground position. */
(function () {
  'use strict';
  var G = window.G, T = Math.PI * 2, TX = 48, UP = 3;
  var OUT = [26, 20, 32];

  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f * 0.8; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  function pal3(hex) { return [shade(hex, -0.32), hex, shade(hex, 0.34)]; }
  G.shade = shade;

  function E(g, x, y, rx, ry, c, rot) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot || 0, 0, T); g.fill(); }
  function B(g, x, y, rx, ry, P) { E(g, x, y, rx, ry, P[0]); E(g, x - rx * 0.1, y - ry * 0.14, rx * 0.86, ry * 0.82, P[1]); E(g, x - rx * 0.32, y - ry * 0.4, rx * 0.36, ry * 0.28, P[2]); }
  function Pg(g, p, c) { g.fillStyle = c; g.beginPath(); g.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fill(); }
  function Rc(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function Ln(g, x1, y1, x2, y2, c, w) { g.strokeStyle = c; g.lineWidth = w || 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function Eye(g, x, y, r) { E(g, x, y, r, r, '#ffffff'); E(g, x + r * 0.35, y, r * 0.55, r * 0.62, '#1a1420'); }
  function shift(p, dy) { var o = p.slice(); for (var i = 1; i < o.length; i += 2) o[i] += dy; return o; }

  // t = { p: phase 0..1, mv: 1 when moving }
  var DRAW = {
    kilnox: function (g, t, P) {
      var s = Math.sin(t.p * T), k = t.mv ? 2.2 : 0, by = t.mv ? -Math.abs(s) : s * 0.6;
      Rc(g, 12 + s * k, 36, 5, 8, P.a[0]); Rc(g, 28 - s * k, 36, 5, 8, P.a[0]);
      Rc(g, 17 - s * k, 37, 5, 8, P.c[1]); Rc(g, 32 + s * k, 37, 5, 8, P.c[1]);
      B(g, 22, 28 + by, 15, 11, P.a);
      E(g, 22, 33 + by, 8, 3.2, P.b[0]); E(g, 22, 33 + by, 5.5, 2, P.b[2]);
      Rc(g, 14, 12 + by, 10, 9, P.c[1]); Rc(g, 13, 11 + by, 12, 3, P.c[0]); E(g, 19, 12 + by, 4, 1.6, P.b[2]);
      Rc(g, 16, 16 + by, 2, 3, P.b[1]); Rc(g, 20, 16 + by, 2, 3, P.b[1]);
      B(g, 36, 28 + by, 8, 7.5, P.a);
      Pg(g, [38, 32 + by, 46, 26 + by, 41, 34 + by], P.b[2]);
      Pg(g, [34, 33 + by, 41, 30 + by, 37, 36 + by], P.b[1]);
      Eye(g, 38, 25 + by, 1.9);
      Rc(g, 42, 28 + by, 2, 2, P.c[0]);
    },
    lumanta: function (g, t, P) {
      var s = Math.sin(t.p * T), f = s * (t.mv ? 6 : 3);
      g.strokeStyle = P.a[0]; g.lineWidth = 2.4; g.beginPath(); g.moveTo(11, 26); g.quadraticCurveTo(5, 26 + s * 3, 2, 21 - s * 2); g.stroke();
      Pg(g, [43, 26, 24, 8 + f, 12, 15 + f * 0.6, 8, 26, 12, 37 - f * 0.6, 24, 43 - f], P.a[0]);
      Pg(g, [42, 25, 24, 10 + f, 14, 16 + f * 0.6, 10, 25, 24, 30, 36, 28], P.a[1]);
      Pg(g, [38, 24, 26, 14 + f * 0.8, 19, 19 + f * 0.5, 24, 24], P.a[2]);
      E(g, 21, 21 + f * 0.3, 2.6, 1.8, P.b[1]); E(g, 20, 33 - f * 0.4, 2.6, 1.8, P.b[1]); E(g, 15, 26, 2, 1.5, P.b[1]);
      B(g, 36, 26, 6, 5, P.a);
      Eye(g, 38, 24, 1.7);
      Ln(g, 37, 21, 42, 15, P.a[0], 1.6);
      E(g, 42, 13, 3, 3, P.b[1]); E(g, 42, 13, 1.6, 1.6, '#ffffff');
    },
    brambletoad: function (g, t, P) {
      var s = Math.sin(t.p * T), br = t.mv ? 0 : s * 0.9, hop = t.mv ? -Math.abs(s) * 3 : 0;
      E(g, 11, 38 + hop * 0.3, 6.5, 4, P.a[0]); E(g, 29, 40 + hop * 0.3, 6, 3.4, P.a[0]);
      B(g, 22, 30 + hop, 14, 10 + br * 0.5, P.a);
      E(g, 32, 35 + hop, 5 + br, 4 + br, P.c[1]); E(g, 31, 34 + hop, 2 + br * 0.5, 1.6, P.c[2]);
      Pg(g, [11, 23 + hop, 13, 13 + hop, 18, 21 + hop], P.b[1]);
      Pg(g, [17, 20 + hop, 21, 9 + hop, 25, 20 + hop], P.b[1]);
      Pg(g, [24, 21 + hop, 28, 13 + hop, 31, 22 + hop], P.b[0]);
      E(g, 21, 11 + hop, 2.2, 2.2, P.c[2]);
      B(g, 33, 23 + hop, 5, 5, P.a); Eye(g, 34, 22.5 + hop, 2.6);
      Rc(g, 34, 39 + hop * 0.5, 7, 3, P.a[0]);
      E(g, 16, 30 + hop, 2.2, 1.6, P.b[0]); E(g, 24, 34 + hop, 1.8, 1.3, P.b[0]); E(g, 12, 33 + hop, 1.5, 1.2, P.b[0]);
    },
    flickermoth: function (g, t, P) {
      var w = 0.45 + 0.55 * Math.abs(Math.sin(t.p * T)), s = Math.sin(t.p * T);
      E(g, 17, 19, 10 * w + 2, 9, P.a[0], -0.5); E(g, 17, 19, 8 * w + 1.5, 7, P.a[1], -0.5); E(g, 15, 17, 3 * w + 0.6, 2.6, P.a[2], -0.5);
      E(g, 16, 31, 8 * w + 2, 6, P.b[0], 0.4); E(g, 16, 31, 6 * w + 1.5, 4.4, P.b[1], 0.4);
      E(g, 17, 20, 2.4 * w + 0.5, 2.4, P.c[1]);
      B(g, 26, 28, 5.5, 8, P.c);
      Rc(g, 22, 26, 8, 1.6, P.a[2]); Rc(g, 22.5, 30, 7, 1.6, P.a[2]); Rc(g, 23.5, 34, 5, 1.4, P.a[2]);
      B(g, 29, 19, 5, 4.6, P.c); Eye(g, 31, 19, 2.1);
      Ln(g, 29, 15, 31, 9 + s * 0.5, P.c[0], 1.4); Ln(g, 31, 16, 36, 11 - s * 0.5, P.c[0], 1.4);
      E(g, 31, 8.5 + s * 0.5, 1.9, 1.9, P.a[2]); E(g, 36.5, 10.5 - s * 0.5, 1.9, 1.9, P.a[2]);
    },
    frostusk: function (g, t, P) {
      var s = Math.sin(t.p * T), k = t.mv ? 2 : 0, by = t.mv ? -Math.abs(s) : s * 0.6;
      E(g, 15 + s * k, 42, 6, 3, P.a[0]); E(g, 30 - s * k, 42, 6, 3, P.a[0]);
      B(g, 11 - s * k, 30 + by, 4.8, 4.8, P.b);
      B(g, 22, 29 + by, 13, 13, P.a);
      E(g, 25, 33 + by, 8, 7.5, P.c[1]);
      B(g, 31, 18 + by, 8.5, 7.5, P.a);
      Pg(g, [31, 22 + by, 35, 22 + by, 35, 35 + by], P.c[2]);
      Pg(g, [36, 21 + by, 40, 21 + by, 41, 33 + by], P.c[1]);
      E(g, 36, 21 + by, 5.5, 3.2, P.c[1]); Rc(g, 39, 19 + by, 2, 1.6, P.a[0]);
      Eye(g, 34, 15 + by, 1.9); Rc(g, 31, 11.5 + by, 7, 1.7, P.a[0]);
      B(g, 39 + s * k, 34 + by, 5.2, 5.2, P.b);
    },
    ferrock: function (g, t, P) {
      var s = Math.sin(t.p * T), k = t.mv ? 1.8 : 0, by = t.mv ? -Math.abs(s) * 0.8 : s * 0.5;
      Rc(g, 10 + s * k, 36, 5, 8, P.c[1]); Rc(g, 27 - s * k, 36, 5, 8, P.c[1]);
      Rc(g, 16 - s * k, 37, 5, 8, P.c[0]); Rc(g, 32 + s * k, 37, 5, 8, P.c[0]);
      B(g, 21, 28 + by, 16, 12, P.a);
      Rc(g, 9, 21 + by, 3, 13, P.b[1]); Rc(g, 16, 17 + by, 3, 20, P.b[1]); Rc(g, 23, 17 + by, 3, 21, P.b[1]); Rc(g, 30, 20 + by, 3, 16, P.b[1]);
      Rc(g, 16, 17 + by, 3, 2, P.b[2]); Rc(g, 23, 17 + by, 3, 2, P.b[2]);
      Rc(g, 33, 22 + by, 11, 9, P.b[0]); Rc(g, 31, 18 + by, 15, 5, P.b[1]); Rc(g, 32, 18 + by, 13, 1.6, P.b[2]);
      Rc(g, 36, 31 + by, 6, 3, P.b[0]);
      Eye(g, 39, 26 + by, 1.8);
    },
    songale: function (g, t, P) {
      var s = Math.sin(t.p * T), f = s * (t.mv ? 7 : 3), i;
      for (i = 0; i < 3; i++) { Rc(g, 6 + i * 3, 27 + i, 2, 9 + (i === 1 ? 2 : 0), P.b[1]); E(g, 7 + i * 3, 37 + i + (i === 1 ? 2 : 0), 1.9, 1.9, P.b[2]); }
      Pg(g, [20, 24, 9, 11 - f, 15, 13 - f, 27, 21], P.a[0]);
      B(g, 22, 26, 9, 6.5, P.a);
      g.strokeStyle = P.a[1]; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(28, 23); g.quadraticCurveTo(34, 21, 33.5, 14); g.stroke();
      Pg(g, [31, 10, 27, 3, 33, 8], P.b[1]);
      B(g, 34, 12, 4.4, 4.1, P.a);
      Pg(g, [37, 10.5, 46, 13, 37, 14.5], P.c[1]);
      Eye(g, 35, 11.5, 1.6);
      Pg(g, [17, 24, 6, 14 + f, 11, 27 + f * 0.4, 27, 29], P.a[2]);
      Pg(g, [17, 26, 9, 21 + f * 0.8, 13, 28 + f * 0.4, 25, 29], P.a[1]);
      Rc(g, 20, 32, 1.6, 7, P.c[0]); Rc(g, 24, 32, 1.6, 6, P.c[0]);
    },
    dusksting: function (g, t, P) {
      var s = Math.sin(t.p * T), k = t.mv ? 2.2 : 0.4, i;
      for (i = 0; i < 3; i++) Ln(g, 15 + i * 6, 35, 12 + i * 6 + s * k * (i % 2 ? 1 : -1), 43, P.c[1], 2);
      var pts = [[12, 30], [8, 23], [9, 15], [15, 9], [22, 7]];
      for (i = 0; i < pts.length; i++) B(g, pts[i][0], pts[i][1] + s * 0.25 * i, 4.2 - i * 0.3, 4.2 - i * 0.3, P.a);
      Pg(g, [25, 4 + s, 33, 8 + s, 25, 11 + s], P.b[0]);
      E(g, 31, 8.5 + s, 3, 3, P.b[1]); E(g, 31, 8.5 + s, 1.5, 1.5, '#f2ffd8');
      B(g, 22, 33, 11, 6.5, P.a);
      Rc(g, 15, 29, 1.6, 7, P.c[1]); Rc(g, 20, 28, 1.6, 9, P.c[1]); Rc(g, 25, 29, 1.6, 8, P.c[1]);
      Ln(g, 36, 31, 41, 28 + s * 0.3 * k, P.a[0], 2); Ln(g, 36, 36, 41, 39 - s * 0.3 * k, P.a[0], 2);
      B(g, 34, 33, 5.5, 5, P.a);
      E(g, 36, 32, 1.7, 1.7, P.b[2]); E(g, 36.4, 32, 0.8, 0.8, '#1a1420');
      B(g, 43, 27 + s * 0.3 * k, 4, 3, P.a); B(g, 43, 40 - s * 0.3 * k, 4, 3, P.a);
    },
    halovex: function (g, t, P) {
      var ang = t.p * T / 3, i, a, x, y;
      function shard(x, y) { Pg(g, [x, y - 6, x + 3.2, y, x, y + 6, x - 3.2, y], P.a[0]); Pg(g, [x, y - 5, x + 2.4, y, x, y + 4.4, x - 2, y], P.a[1]); Pg(g, [x, y - 5, x + 2.4, y, x, y], P.a[2]); }
      for (i = 0; i < 3; i++) { a = ang + i * T / 3; if (Math.sin(a) < 0) shard(24 + Math.cos(a) * 17, 26 + Math.sin(a) * 7); }
      g.strokeStyle = P.c[1]; g.lineWidth = 1.6; g.beginPath(); g.ellipse(24, 26, 17, 7, 0, 0, T); g.stroke();
      Pg(g, [24, 9, 33.5, 24, 24, 41, 14.5, 24], P.b[0]);
      Pg(g, [24, 11.5, 31.5, 24, 24, 38, 16.5, 24], P.b[1]);
      Pg(g, [24, 11.5, 27, 21, 19, 22], P.b[2]);
      E(g, 26, 25, 3.2, 3.6, '#ffffff'); E(g, 27, 25, 1.7, 2.1, '#1a1420');
      for (i = 0; i < 3; i++) { a = ang + i * T / 3; if (Math.sin(a) >= 0) shard(24 + Math.cos(a) * 17, 26 + Math.sin(a) * 7); }
    },
    rimewraith: function (g, t, P) {
      var s = Math.sin(t.p * T), w = s * 2;
      Pg(g, [14, 22, 34, 22, 32, 32 + w * 0.3, 28, 41 - w, 24, 34, 19, 43 + w, 15, 33], P.a[0]);
      Pg(g, [16, 22, 31, 22, 29, 31, 26, 36 - w, 23, 31, 20, 38 + w, 18, 31], P.a[1]);
      B(g, 24, 20, 10, 9.5, P.a);
      Pg(g, [23, 13, 34, 16, 36, 23, 30, 29, 24, 24], P.b[1]);
      Pg(g, [24, 14, 33, 17, 30, 20], P.b[2]);
      Pg(g, [27, 19, 32, 20, 28.5, 22], P.c[0]); Pg(g, [32.5, 22, 35, 21.5, 33, 24], P.c[0]);
      B(g, 37, 31 + s, 2.8, 2.8, P.b); B(g, 12, 29 - s, 2.6, 2.6, P.b);
    },
    jolthare: function (g, t, P) {
      var s = Math.sin(t.p * T), k = t.mv ? 3 : 0, by = t.mv ? -Math.abs(s) * 2 : s * 0.5;
      E(g, 15 - s * k, 40, 6.5, 3.4, P.a[0]); Rc(g, 11 - s * k, 37, 3.4, 4, P.b[1]);
      E(g, 28 + s * k, 41, 6.5, 3.2, P.a[0]); Rc(g, 30 + s * k, 38, 3.4, 4, P.b[1]);
      E(g, 10, 30 + by, 3.2, 3.2, '#ffffff');
      B(g, 21, 30 + by, 9.5, 8, P.a);
      E(g, 24, 33 + by, 5, 4.2, '#fff3d0');
      Pg(g, shift([31, 16, 27, 9, 29.5, 9.5, 24, 1, 27.5, 9, 25, 8.5, 28, 17], by), P.c[0]);
      Pg(g, shift([27, 16, 23, 9, 25.5, 9.5, 19, 2, 23.5, 9, 21, 8.5, 24, 17], by), P.c[1]);
      B(g, 30, 21 + by, 6.6, 6, P.a);
      Eye(g, 32.5, 20 + by, 2); Rc(g, 36, 22 + by, 1.6, 1.6, P.b[0]);
      B(g, 35 + s * k * 0.5, 31 + by, 3.2, 3.2, P.b); B(g, 17 - s * k * 0.5, 32 + by, 3, 3, P.b);
    },
    lilypadon: function (g, t, P) {
      var s = Math.sin(t.p * T), k = t.mv ? 1.6 : 0, by = t.mv ? -Math.abs(s) * 0.8 : s * 0.5;
      Rc(g, 9 + s * k, 37, 6, 7, P.a[0]); Rc(g, 26 - s * k, 37, 6, 7, P.a[0]);
      Rc(g, 15 - s * k, 38, 6, 7, P.a[0]); Rc(g, 31 + s * k, 38, 6, 7, P.a[0]);
      B(g, 21, 30 + by, 16, 11, P.a);
      E(g, 19, 20 + by, 13.5, 5.2, P.b[0]); E(g, 19, 19 + by, 12.5, 4.4, P.b[1]); E(g, 15, 18 + by, 5, 1.6, P.b[2]);
      E(g, 16, 14.5 + by, 2.6, 2.2, P.c[1]); E(g, 22, 14.5 + by, 2.6, 2.2, P.c[1]); E(g, 19, 13 + by, 2.8, 2.8, P.c[2]); E(g, 19, 13.5 + by, 1.3, 1.3, '#fff6b0');
      E(g, 32, 24 + by, 2.2, 2.2, P.a[0]);
      B(g, 37, 31 + by, 8, 7, P.a);
      E(g, 42, 33.5 + by, 4.6, 4, P.a[2]); Rc(g, 43, 32 + by, 1.5, 1.5, P.a[0]); Rc(g, 41, 31.5 + by, 1.5, 1.5, P.a[0]);
      Eye(g, 37, 27 + by, 1.9);
    }
  };

  // Harden anti-aliased shapes into pixels and add a 1-texel outline.
  function harden(c) {
    var g = c.getContext('2d'), w = c.width, h = c.height, im = g.getImageData(0, 0, w, h), d = im.data, n = w * h, i, x, y;
    var solid = new Uint8Array(n);
    for (i = 0; i < n; i++) { if (d[i * 4 + 3] >= 120) { solid[i] = 1; d[i * 4 + 3] = 255; } else d[i * 4 + 3] = 0; }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x;
      if (solid[i]) continue;
      if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
        d[i * 4] = OUT[0]; d[i * 4 + 1] = OUT[1]; d[i * 4 + 2] = OUT[2]; d[i * 4 + 3] = 255;
      }
    }
    g.putImageData(im, 0, 0);
  }
  function upscale(src, f) {
    var c = mk(src.width * f, src.height * f), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  function whiteCopy(src) {
    var c = mk(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function frame(id, P, p, mv) {
    var c = mk(TX, TX), g = c.getContext('2d');
    DRAW[id](g, { p: p, mv: mv }, P);
    harden(c);
    return upscale(c, UP);
  }

  function trainer(coat, hair, flip) {
    var c = mk(20, 28), g = c.getContext('2d');
    Rc(g, 6, 20, 3, 7, '#2b2f45'); Rc(g, 11, 20, 3, 7, '#2b2f45');
    Rc(g, 5, 11, 10, 10, coat); Rc(g, 5, 11, 10, 2, shade(coat, 0.3));
    Rc(g, 3, 12, 2, 7, coat); Rc(g, 15, 12, 2, 7, coat);
    E(g, 10, 7, 4.6, 4.6, '#f2c9a0');
    Rc(g, 5, 2, 10, 4, hair); Rc(g, flip ? 4 : 12, 4, 4, 3, hair);
    Rc(g, flip ? 7 : 11, 7, 1.5, 1.5, '#1a1420');
    harden(c);
    return upscale(c, UP);
  }
  function glow(hex) {
    var c = mk(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    var n = parseInt(hex.slice(1), 16), rgb = (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.25, 'rgba(' + rgb + ',0.75)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  }

  G.SPR = {}; G.GLOW = {}; G.TEX = TX; G.SPR_UP = UP;
  G.buildSprites = function () {
    G.ROSTER.forEach(function (id) {
      var d = G.DEX[id], P = { a: pal3(d.pal[0]), b: pal3(d.pal[1]), c: pal3(d.pal[2]) }, S = { idle: [], move: [], white: null }, i;
      for (i = 0; i < 4; i++) S.idle.push(frame(id, P, i / 4, 0));
      for (i = 0; i < 6; i++) S.move.push(frame(id, P, i / 6, 1));
      S.white = whiteCopy(S.idle[0]);
      G.SPR[id] = S;
    });
    G.TYPES.forEach(function (t) { G.GLOW[t] = glow(G.TCOL[t]); });
    G.GLOW.white = glow('#ffffff');
    G.TRAINER = [trainer('#3d6fd0', '#4a2f7a', false), trainer('#c8473c', '#e8e0d0', true)];
  };
})();
