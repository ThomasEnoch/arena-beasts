/* Arena Beasts - logos of the 12 element types. Each logo is a path in a 24 x 24 box.
   f: filled shape (even-odd rule, so inner shapes cut holes). s: line shape with round ends. */
(function () {
  'use strict';
  var G = window.G = window.G || {};
  function poly(pts) { return 'M' + pts.map(function (p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join('L') + 'Z'; }
  function circle(cx, cy, r) { return 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0Z'; }
  // gear: 8 teeth and a hole
  function gear() {
    var p = [], i, a, n = 8, w = Math.PI / n;
    for (i = 0; i < n; i++) {
      a = i * 2 * w;
      p.push([12 + Math.cos(a - w * 0.62) * 7, 12 + Math.sin(a - w * 0.62) * 7], [12 + Math.cos(a - w * 0.4) * 10.2, 12 + Math.sin(a - w * 0.4) * 10.2],
        [12 + Math.cos(a + w * 0.4) * 10.2, 12 + Math.sin(a + w * 0.4) * 10.2], [12 + Math.cos(a + w * 0.62) * 7, 12 + Math.sin(a + w * 0.62) * 7]);
    }
    return poly(p) + circle(12, 12, 3.1);
  }
  // impact burst: 10 uneven spikes
  function burst() {
    var p = [], i, a, r, R = [10.5, 5, 8.5, 4.6, 10.5, 5.2, 8, 4.6, 10, 5, 8.8, 4.8, 10.5, 5.2, 8.2, 4.6];
    for (i = 0; i < 16; i++) { a = i * Math.PI / 8 - Math.PI / 2; r = R[i]; p.push([12 + Math.cos(a) * r, 12 + Math.sin(a) * r]); }
    return poly(p);
  }
  var I = G.TICON = {
    Ember: { f: 'M12 1.8C12.6 6 18.2 8.2 18.2 14.2A6.2 6.2 0 0 1 5.8 14.2C5.8 11.2 7.8 10 8.6 6.8C10 8.8 11 9 11.4 7.6C11.8 6 11.4 3.8 12 1.8ZM12 12.2C13.4 14 14.6 15 14.6 16.6A2.6 2.6 0 0 1 9.4 16.6C9.4 15 10.8 14 12 12.2Z' },
    Tide: { f: 'M12 1.8C15 7 18.6 10.4 18.6 14.6A6.6 6.6 0 0 1 5.4 14.6C5.4 10.4 9 7 12 1.8ZM7.6 14C9 12.6 10.6 12.6 12 14C13.4 15.4 15 15.4 16.4 14V16.2C15 17.6 13.4 17.6 12 16.2C10.6 14.8 9 14.8 7.6 16.2Z' },
    Bloom: { f: 'M11.2 13.2C6.8 13.2 3.6 10 3.6 4.8C8.8 4.8 11.2 8 11.2 13.2ZM12.8 11C12.8 6.8 15.8 3.4 20.6 3.4C20.6 8.8 17.4 11 12.8 11ZM11.2 12H12.8V21.5H11.2Z' },
    Volt: { f: 'M13.8 1.8L4.8 13.6H10.4L8.8 22.2L19.2 9.6H13.2Z' },
    Frost: { s: 'M12 2.4V21.6M3.7 7.2L20.3 16.8M3.7 16.8L20.3 7.2M9.4 4.4L12 7L14.6 4.4M9.4 19.6L12 17L14.6 19.6M4.4 11.2L7.8 9.6L7 6M19.6 12.8L16.2 14.4L17 18M4.4 12.8L7.8 14.4L7 18M19.6 11.2L16.2 9.6L17 6', w: 1.9 },
    Stone: { f: 'M2.4 19.6L9 6.4L12.4 11.8L15 8.8L21.6 19.6ZM9 9.6L10.6 13.2L8.6 15.4L7.2 13.2Z' },
    Gale: { s: 'M3 8.8H13.4A2.9 2.9 0 1 0 10.5 5.9M3 13.4H18A3 3 0 1 1 15 16.4M3 18H9.6', w: 2.3 },
    Venom: { f: 'M4.6 3.6H11C11 10 10 15.4 7.8 20.4C5.6 15.4 4.6 10 4.6 3.6ZM13 3.6H19.4C19.4 10 18.4 15.4 16.2 20.4C14 15.4 13 10 13 3.6Z' + circle(12, 20.4, 1.5) },
    Mind: { f: 'M1.8 12C6 5.2 18 5.2 22.2 12C18 18.8 6 18.8 1.8 12Z' + circle(12, 12, 4.2) + circle(12, 12, 1.8) },
    Shade: { f: 'M15.8 2.6A9.8 9.8 0 1 0 21.4 15.6A7.8 7.8 0 0 1 15.8 2.6ZM18.4 5.2L19.2 7.4L21.4 8.2L19.2 9L18.4 11.2L17.6 9L15.4 8.2L17.6 7.4Z' },
    Iron: { f: gear() },
    Brawl: { f: burst() }
  };
  // inline SVG of one logo (white shape). Used in HTML.
  G.typeSvg = function (t) {
    var i = I[t]; if (!i) return '';
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (i.f ? '<path fill="currentColor" fill-rule="evenodd" d="' + i.f + '"/>' : '<path fill="none" stroke="currentColor" stroke-width="' + i.w + '" stroke-linecap="round" stroke-linejoin="round" d="' + i.s + '"/>') + '</svg>';
  };
  // round badge in the colour of the type. label: also show the type name.
  G.typeBadge = function (t, label) {
    return '<span class="tb' + (label ? ' wide' : '') + '" style="--c:' + G.TCOL[t] + '" title="' + t + '">' + G.typeSvg(t) + (label ? '<em>' + t + '</em>' : '') + '</span>';
  };
  // the same badge on a 2D canvas: centre (x, y), diameter size
  var P2 = {};
  G.drawTypeIcon = function (ctx, t, x, y, size, noDisc) {
    var i = I[t]; if (!i) return;
    var p = P2[t] || (P2[t] = new Path2D(i.f || i.s)), k = size * (noDisc ? 1 : 0.62) / 24;
    if (!noDisc) { ctx.fillStyle = G.TCOL[t]; ctx.beginPath(); ctx.arc(x, y, size / 2, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(x - 12 * k, y - 12 * k); ctx.scale(k, k);
    if (i.f) { ctx.fillStyle = '#ffffff'; ctx.fill(p, 'evenodd'); }
    else { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = i.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(p); }
    ctx.restore();
  };
})();
