/* Arena Beasts - the effect sequence of each ultimate (signature power).
   engine.js sends 'ult' events: { k: 'ult', id, ph, side, x, y, ... }. Each id has one function for each phase.
   The story behind each ultimate is in LORE.md. Keep the two in agreement. */
import { S, wx, wz, lin } from './fx.js';

const TAU = Math.PI * 2, rnd = Math.random, C = lin;
const RAINBOW = ['#ff4a4a', '#ff9a3a', '#ffe14a', '#5fd068', '#4aa8ff', '#6a6aff', '#c06aff'];
// the 2 colours of the wind-up of each ultimate
const CAST = {
  shatter: ['#ff7416', '#ffffff'], twelfth: ['#ffd27a', '#ff5a7a'], chrometide: ['#e8f0fa', '#58a6ff'], symphony: ['#9fb4f0', '#e0a85a'],
  zenith: ['#ffd76a', '#58a6ff'], brainstorm: ['#fff27a', '#ffffff'], thousandfolds: ['#ffffff', '#9fb4f0'], faultline: ['#ff8a3a', '#8a7a66'],
  lighthouse: ['#9fe8d8', '#3a2a6a'], sawblade: ['#ffb060', '#ffffff'], tapestry: ['#c08cff', '#ffd76a'], spectrum: ['#ff6aa8', '#6fd0e6'],
  threeserpents: ['#a653c9', '#e0b85a'], masterwork: ['#ff8a3a', '#ffffff'], truenorth: ['#ff5a4a', '#7fb8ff'], atoll: ['#ffb8c8', '#7fe0d0'],
  overpressure: ['#ffffff', '#ff9a5a'], freezeframe: ['#ffffff', '#ffd0ea'], stolenhour: ['#e060ff', '#ffd76a'], lastwaltz: ['#ffb060', '#7fe0ff']
};

// env: { fx, HUD, pos(side) -> { x, z } of the active creature, shake(v), me() -> the side of the local player }
export function makeUlts(env) {
  const fx = env.fx, HUD = env.HUD, G = window.G, A = fx.glow, D = fx.dust;
  const live = [];
  // run: fn(t, dt, q) each frame for dur seconds. at: one call after a delay. every: a call each step seconds. rate: n calls each second.
  const run = (dur, fn) => live.push({ t: 0, dur, fn });
  const at = (delay, fn) => live.push({ t: -delay, dur: -1, fn });
  const every = (dur, step, fn) => { let acc = step; run(dur, (t, dt) => { acc += dt; let n = 0; while (acc >= step && n++ < 8) { acc -= step; fn(t); } }); };
  const rate = (dur, perSec, fn) => every(dur, 1 / perSec, fn);
  // white core with a coloured glow
  const glare = (x, y, z, size, c0, c1, life) => {
    life = life || 0.18;
    A.put(0, x, y, z, 0, 0, 0, life, size * 0.7, C(c0), C(c0), 0, 0, 1.0, 0, 0, 0.5);
    A.put(1, x, y, z, 0, 0, 0, life * 1.5, size * 0.8, C('#ffffff'), C(c1 || c0), 0, 0, 0.4, 1.5, 0, 0.55);
  };
  const light = (x, y, z, col, k, dur) => fx.light(x, y, z, col, k * 0.4, dur);
  const flame = (x, z, vy, size, life) => A.put(14, x, 0.1, z, 0, vy, 0, life || 0.5, size * 0.75, C('#ffb040'), C('#ff4a08'), -2, 1, -0.3, 0, 0, 1, 0, 0);

  const U = {
    // Glazefang: the porcelain shell breaks
    shatter: {
      hit(e, X, Z) {
        const R = e.r * S;
        glare(X, 0.7, Z, R * 2.6, '#ffb060', '#ff7416');
        fx.explode('Ember', X, Z, R);
        fx.ring(X, Z, 0.3, R, 0.4, '#ffffff', 0.5); fx.ring(X, Z, 0.3, R * 1.15, 0.6, '#ff7416', 0.3);
        for (let i = 0; i < 46; i++) {   // white and blue shards of the shell
          const a = rnd() * TAU, s = 5 + rnd() * 7;
          D.put(5, X + Math.cos(a) * 0.3, 0.5 + rnd() * 0.7, Z + Math.sin(a) * 0.3, Math.cos(a) * s, 3 + rnd() * 5, Math.sin(a) * s, 0.9 + rnd() * 0.5, 0.3 + rnd() * 0.3, C('#f4f6fb'), C(i & 1 ? '#3d6fd8' : '#e8e4da'), 13, 0.3, 0, (rnd() - 0.5) * 16, 0, 1, 1);
        }
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * TAU, rr = R * (0.45 + rnd() * 0.5);
          at(0.05 + rnd() * 0.25, () => { for (let k = 0; k < 4; k++) flame(X + Math.cos(a) * rr, Z + Math.sin(a) * rr, 2.5 + rnd() * 2.5, 0.7 + rnd() * 0.5, 0.5 + rnd() * 0.3); });
        }
        light(X, 1.4, Z, '#ff8a3a', 260, 0.6);
        // the open shell burns for 5 seconds
        rate(5, 22, () => { const p = env.pos(e.side); A.put(14, p.x + (rnd() - 0.5) * 0.9, 0.3 + rnd() * 0.8, p.z + (rnd() - 0.5) * 0.9, 0, 1.6 + rnd() * 1.4, 0, 0.45, 0.4 + rnd() * 0.3, C('#ffa030'), C('#ff4a08'), -1.5, 1, -0.3, 0, 0, 1, 0, 0); });
      }
    },

    // Mantick: midnight
    twelfth: {
      chime(e, X, Z) {
        const R = e.r * S;
        for (let i = 0; i < 12; i++) {   // a clock face on the floor
          const a = i / 12 * TAU - Math.PI / 2, k = i % 3 ? 0.9 : 0.98;
          fx.beam(X + Math.cos(a) * R * 0.8, 0.07, Z + Math.sin(a) * R * 0.8, X + Math.cos(a) * R * k, 0.07, Z + Math.sin(a) * R * k, i % 3 ? 0.035 : 0.07, 1.3, '#ffd27a');
        }
        fx.beam(X, 0.08, Z, X, 0.08, Z - R * 0.72, 0.07, 1.3, '#ffffff'); fx.beam(X, 0.08, Z, X, 0.08, Z - R * 0.5, 0.11, 1.3, '#ffd27a');   // the 2 hands at 12
        fx.ring(X, Z, R * 0.99, R, 1.2, '#ffd27a', 0.08);
        for (let k = 0; k < 3; k++) at(k * 0.13, () => fx.ring(X, Z, 0.3, R * (1 + k * 0.12), 0.5, k ? '#ffd27a' : '#ffffff', 0.35 - k * 0.08));
        glare(X, 1.0, Z, 3, '#ffd27a', '#ffffff');
        for (let i = 0; i < 14; i++) A.put(11, X + (rnd() - 0.5) * R * 1.6, 0.4 + rnd() * 1.6, Z + (rnd() - 0.5) * R * 1.6, 0, 0.15, 0, 1.1, 0.3, C('#ffffff'), C('#ffd27a'), 0, 0, -0.3, 1, 0, 1);   // sparks that hang in the stopped time
        light(X, 1.5, Z, '#ffd27a', 160, 0.5);
      },
      cut(e, X, Z) {
        const X2 = wx(e.x2), Z2 = wz(e.y2), mx = (X + X2) / 2, mz = (Z + Z2) / 2, a = Math.atan2(Z - Z2, X - X2);
        fx.beam(X2, 0.6, Z2, X, 0.6, Z, 0.09, 0.3, '#ffffff'); fx.beam(X2, 0.6, Z2, X, 0.6, Z, 0.2, 0.22, '#ff5a7a');
        for (let i = 0; i < 14; i++) { const s = 6 + rnd() * 8, w = (rnd() - 0.5) * 0.9; A.put(2, mx, 0.6, mz, Math.cos(a + w) * s, (rnd() - 0.3) * 3, Math.sin(a + w) * s, 0.2, 0.6, C('#ffffff'), C('#ffd27a'), 0, 3, -0.4, 0, 1, 1); }
        fx.ring(X, Z, 0.2, 1.1, 0.25, '#ffd27a', 0.12);
        light(mx, 0.9, mz, '#ffe9a8', 90, 0.2);
        HUD.floatTxt(e.x, e.y, 96, e.n === 1 ? 'Tick' : 'Tock', '#ffe9a8', 14, 0.6);
        G.sfx('fire');
      }
    },

    // Argantler: the wave of quicksilver
    chrometide: {
      wave(e, X, Z) {
        const ca = Math.cos(e.a), sa = Math.sin(e.a), V = e.v * S;
        rate(e.dur, 420, t => {
          const d = t * V, w = (rnd() * 2 - 1) * 2.0, px = X + ca * d - sa * w, pz = Z + sa * d + ca * w, k = rnd();
          if (k < 0.55) D.put(8, px, 0.1, pz, ca * V * 0.5, 3 + rnd() * 4, sa * V * 0.5, 0.45 + rnd() * 0.3, 0.3 + rnd() * 0.25, C('#ffffff'), C('#aab8c8'), 12, 0.3, 0, 0, 1, 1);
          else if (k < 0.88) A.put(1, px, 0.3 + rnd() * 0.8, pz, ca * V * 0.3, 0, sa * V * 0.3, 0.25, 0.4 + rnd() * 0.4, C('#ffffff'), C('#9fc4ff'), 0, 1, -0.3, 3, 0, 1);
          else D.put(3, px, 0.15, pz, ca * 2, 0.5, sa * 2, 0.6, 0.9, C('#e8f0fa'), C('#8a98a8'), 0, 1.5, 1.2, 0.3, 0, 0.35);
        });
        every(e.dur, 0.045, t => { const d = t * V; fx.beam(X + ca * d + sa * 2.1, 0.28, Z + sa * d - ca * 2.1, X + ca * d - sa * 2.1, 0.28, Z + sa * d + ca * 2.1, 0.18, 0.11, '#e8f0fa'); });   // the crest
        glare(X, 0.9, Z, 2.4, '#e8f0fa', '#9fc4ff');
        light(X, 1, Z, '#cfe0ff', 120, 0.4);
      },
      crash(e, X, Z) {
        fx.explode('Iron', X, Z, 2.2); glare(X, 0.6, Z, 4, '#e8f0fa', '#9fc4ff');
        for (let i = 0; i < 24; i++) { const a = rnd() * TAU, rr = rnd() * 2.2; D.put(5, X + Math.cos(a) * rr, 0.05, Z + Math.sin(a) * rr, 0, 4 + rnd() * 5, 0, 0.5 + rnd() * 0.3, 0.35 + rnd() * 0.3, C('#ffffff'), C('#aab8c8'), 14, 0.2, 0, 0, 0, 1, 1); }
        fx.ring(X, Z, 0.3, 2.8, 0.4, '#ffffff', 0.4);
      }
    },

    // Brasswail: 3 movements
    symphony: {
      pulse(e, X, Z) {
        const ca = Math.cos(e.a), sa = Math.sin(e.a), L = e.len * S, w = e.w * S, col = ['#9fb4f0', '#7fe0e8', '#ffffff'][e.n] || '#ffffff';
        fx.beam(X + ca * 0.5, 0.9, Z + sa * 0.5, X + ca * L, 0.9, Z + sa * L, w * 0.5, 0.32, col);
        for (let i = 0; i < 9; i++) at(i * 0.022, () => { const d = 0.6 + i * 0.3; A.put(4, X + ca * d, 0.9, Z + sa * d, ca * (15 + i), 0, sa * (15 + i), 0.55, w * (0.45 + i * 0.05), C(col), C(col), 0, 0, 0.5, 0, 0, 0.45); });   // rings of sound
        for (let i = 0; i < 16 + e.n * 8; i++) {
          const d = rnd() * L, o = (rnd() - 0.5) * w;
          A.put(i % 3 ? 15 : 11, X + ca * d - sa * o, 0.4 + rnd() * 1.2, Z + sa * d + ca * o, ca * 5, 0.5, sa * 5, 0.5 + rnd() * 0.3, 0.4 + rnd() * 0.3, C('#ffffff'), C(i & 1 ? '#e0a85a' : col), 0, 1, 0.3, (rnd() - 0.5) * 6, 0, 0.85);
        }
        for (let i = 0; i < 10; i++) D.put(3, X + (rnd() - 0.5) * 0.8, 1.3, Z + (rnd() - 0.5) * 0.8, (rnd() - 0.5), 2.5 + rnd() * 2, (rnd() - 0.5), 0.8, 0.6, C('#ffffff'), C('#c8d8e8'), -0.5, 1.2, 1.4, 0.3, 0, 0.45);   // steam from the pipes
        fx.ring(X, Z, 0.4, 1.6 + e.n * 0.8, 0.35, col, 0.2);
        light(X + ca * 2, 1.2, Z + sa * 2, col, 90 + e.n * 60, 0.35);
        HUD.floatTxt(e.x, e.y, 100, ['The Call', 'The Answer', 'The Homecoming'][e.n] || '', '#e8f0ff', 13, 0.9);
        G.sfx(e.n === 2 ? 'burst' : 'fire');
      }
    },

    // Noonshell: the sky turns over
    zenith: {
      invert(e, X, Z) {
        const R = e.r * S;
        fx.ring(X, Z, R, 0.4, 0.7, '#ffd76a', 0.3); fx.disc(X, Z, R, 0.5, '#ffd76a');
        fx.beam(X, 10, Z, X, 0.05, Z, 0.5, 0.7, '#ffe9a8');
        rate(0.8, 150, () => {   // sand that falls upward
          const a = rnd() * TAU, rr = Math.sqrt(rnd()) * R, px = X + Math.cos(a) * rr, pz = Z + Math.sin(a) * rr;
          if (rnd() < 0.6) D.put(12, px, 0.05, pz, 0, 0.5, 0, 0.9, 0.12 + rnd() * 0.1, C('#f0d48a'), C('#b08a52'), -14, 0, 0, 3, 0, 1);
          else A.put(0, px, 0.05, pz, 0, 1, 0, 0.8, 0.12, C('#fff0b0'), C('#ffd76a'), -12, 0, -0.4, 0, 0, 1);
        });
        run(0.8, (t, dt, q) => { fx.tele.put(2, X, Z, 0.06, R, q * TAU - Math.PI / 2, { col: C('#2a2030'), wid: 0.24, fill: 0.9, a: 0.6 * (1 - q), w: 0.0001 }); });   // the shadow of the dial turns once
        light(X, 2, Z, '#ffd76a', 200, 0.6);
      },
      lift(e, X, Z) {
        fx.ring(X, Z, 0.3, 1.6, 0.4, '#ffd76a', 0.2);
        rate(0.8, 60, () => { const p = env.pos(e.side); A.put(2, p.x + (rnd() - 0.5) * 1.2, 0.1, p.z + (rnd() - 0.5) * 1.2, 0, 7 + rnd() * 4, 0, 0.4, 0.5, C('#ffffff'), C('#ffd76a'), 0, 0.5, -0.3, 0, 1, 1); });
      },
      slam(e, X, Z) {
        const R = e.r * S;
        fx.explode('Stone', X, Z, R); glare(X, 0.5, Z, 4, '#ffd76a', '#ffffff'); fx.ring(X, Z, 0.3, R * 1.3, 0.45, '#ffd76a', 0.4);
        for (let i = 0; i < 30; i++) { const a = rnd() * TAU, rr = rnd() * 2; D.put(12, X + Math.cos(a) * rr, 2 + rnd() * 3, Z + Math.sin(a) * rr, 0, -2, 0, 0.9, 0.14, C('#f0d48a'), C('#b08a52'), 14, 0, 0, 3, 0, 1, 1); }
        G.sfx('burst');
      }
    },

    // Coilbell: all ideas at the same time
    brainstorm: {
      start(e, X, Z) {
        glare(X, 1.2, Z, 3.4, '#fff27a', '#ffffff', 0.25);
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; fx.bolt(X, 1.1, Z, X + Math.cos(a) * e.r * S * 0.9, 0.03, Z + Math.sin(a) * e.r * S * 0.9, '#fffbd0', 0.05); }
        fx.ring(X, Z, 0.3, e.r * S, 0.4, '#fff27a', 0.3);
        for (let i = 0; i < 10; i++) A.put(11, X, 1.3, Z, (rnd() - 0.5) * 6, 3 + rnd() * 4, (rnd() - 0.5) * 6, 0.7, 0.35, C('#ffffff'), C('#fff27a'), 6, 1, -0.4, 4, 0, 1);
        light(X, 1.5, Z, '#fff27a', 220, 0.4);
      },
      strike(e, X, Z) {
        const R = e.r * S;
        for (let i = 0; i < 3; i++) fx.bolt(X + (rnd() - 0.5) * 1.5, 9, Z + (rnd() - 0.5) * 1.5, X + (rnd() - 0.5) * 0.3, 0.02, Z + (rnd() - 0.5) * 0.3, i ? '#fff27a' : '#ffffff', i ? 0.07 : 0.13);
        fx.beam(X, 9, Z, X, 0.02, Z, 0.3, 0.14, '#fffbd0');
        fx.explode('Volt', X, Z, R);
        fx.ring(X, Z, 0.2, R * 1.2, 0.3, '#ffffff', 0.3);
        env.shake(7); G.sfx('big');
      }
    },

    // Pleatheron: the 999 paper cranes
    thousandfolds: {
      open(e, X, Z) {
        const sheet = (px, pz, R, y) => {
          const a = rnd() * TAU, c = Math.cos(a), s = Math.sin(a), v = 7 + rnd() * 3;
          D.put(rnd() < 0.7 ? 5 : 10, px + c * R, y, pz + s * R, -s * v - c * 1.5, 0.6 + rnd(), c * v - s * 1.5, 0.55 + rnd() * 0.3, 0.28 + rnd() * 0.22, C('#ffffff'), C(['#9fb4f0', '#c8a8ff', '#ffd98a', '#f4f6fb'][Math.floor(rnd() * 4)]), 0.5, 0.2, 0, (rnd() - 0.5) * 14, 0, 1);
        };
        glare(X, 1, Z, 3, '#ffffff', '#9fb4f0');
        fx.ring(X, Z, 0.3, e.r * S, 0.4, '#ffffff', 0.3);
        for (let i = 0; i < 60; i++) sheet(X, Z, 0.4 + rnd() * 2.4, 0.2 + rnd() * 2);
        rate(5, 46, () => { const p = env.pos(e.side); sheet(p.x, p.z, 1.4 + rnd() * 1.6, 0.2 + rnd() * 2.2); });
      }
    },

    // Basaltback: 5 blows
    faultline: {
      pound(e, X, Z) {
        const R = e.r * S, last = e.n === 5, n = 10 + e.n * 2;
        fx.ring(X, Z, 0.4, R, 0.3, last ? '#ffffff' : '#ff8a3a', 0.4); fx.disc(X, Z, R, 0.2, '#ff8a3a');
        fx.explode('Stone', X, Z, R * 0.55);
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU + rnd() * 0.3, px = X + Math.cos(a) * R * 0.92, pz = Z + Math.sin(a) * R * 0.92;
          D.put(12, px, 0.05, pz, Math.cos(a) * 1.5, 5 + rnd() * 4, Math.sin(a) * 1.5, 0.7, 0.45 + rnd() * 0.35, C('#6a6a78'), C('#3a3a44'), 14, 0.2, 0, 4, 0, 1, 1);
          A.put(13, px, 0.3, pz, 0, 0, 0, 0.3, 1.0, C('#ffb040'), C('#ff4a08'), 0, 0, 0.3, 0, 0, 1, 0, a);   // cracks of heat
        }
        light(X, 1, Z, '#ff8a3a', 90 + e.n * 40, 0.3);
        if (last) {
          fx.explode('Ember', X, Z, R * 0.8); glare(X, 0.6, Z, R * 2, '#ffb060', '#ff7416');
          for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; at(i * 0.012, () => { for (let k = 0; k < 3; k++) D.put(12, X + Math.cos(a) * R * 0.75, 0.05, Z + Math.sin(a) * R * 0.75, 0, 7 + rnd() * 3, 0, 0.8, 0.7, C('#5a5a68'), C('#2e2e38'), 16, 0, 0, 2, 0, 1, 1); }); }
        }
        HUD.floatTxt(e.x, e.y, 112, e.n + (last ? '!' : ''), '#ffd0a0', last ? 22 : 15, 0.5);
        G.sfx(last ? 'big' : 'burst');
      }
    },

    // Gloomlure: every light goes out
    lighthouse: {
      dark(e, X, Z) {
        glare(X, 1.2, Z, 3, '#9fe8d8', '#ffffff');
        fx.ring(X, Z, 9, 0.5, 0.8, '#9fe8d8', 0.15);   // the dark closes on the lantern
        if (env.me() === e.side) {
          // the owner sees the lantern turn like a lighthouse
          every(6, 0.04, t => { const p = env.pos(e.side), a = t * 1.9; fx.beam(p.x, 1.25, p.z, p.x + Math.cos(a) * 7, 0.3, p.z + Math.sin(a) * 7, 0.13, 0.07, '#5fb8a8'); });
        } else {
          // the opponent sees 3 false lights that walk in the dark
          const ph = rnd() * TAU;
          rate(6, 30, t => {
            for (let k = 0; k < 3; k++) {
              const a = ph + k * 2.1 + t * (0.5 + k * 0.17), rr = 2.2 + k * 1.3 + Math.sin(t * 1.3 + k) * 0.8, px = Math.cos(a) * rr * 1.5, pz = 0.4 + Math.sin(a) * rr * 0.6;
              A.put(0, px, 1.1, pz, 0, 0, 0, 0.12, 0.9, C('#d8fff4'), C('#3a8a8a'), 0, 0, 0, 0, 0, 0.8);
              if (rnd() < 0.3) A.put(0, px + (rnd() - 0.5) * 0.4, 0.9, pz + (rnd() - 0.5) * 0.4, 0, -0.5, 0, 0.6, 0.14, C('#d8fff4'), C('#3a8a8a'), 0, 0, -0.4, 0, 0, 0.8);
            }
          });
        }
        rate(6, 12, () => { const a = rnd() * TAU, rr = 1 + rnd() * 6; A.put(0, Math.cos(a) * rr * 1.2, 0.3 + rnd() * 1.2, 0.4 + Math.sin(a) * rr * 0.5, 0, 0.25, 0, 1.6, 0.14, C('#d8fff4'), C('#3a8a8a'), -0.1, 0, -0.3, 0, 0, 0.7); });
      }
    },

    // Pangyre: the saw blade
    sawblade: {
      cut(e, X, Z) {
        const X2 = wx(e.x2), Z2 = wz(e.y2), a = Math.atan2(Z2 - Z, X2 - X), len = Math.hypot(X2 - X, Z2 - Z), last = e.n >= 4;
        fx.beam(X, 0.5, Z, X2, 0.5, Z2, last ? 0.3 : 0.18, 0.3, '#ffb060'); fx.beam(X, 0.5, Z, X2, 0.5, Z2, 0.07, 0.36, '#ffffff');
        for (let i = 0; i < 18; i++) {
          const d = rnd() * len, s = 4 + rnd() * 6, sd = rnd() < 0.5 ? 1 : -1;
          A.put(2, X + Math.cos(a) * d, 0.2, Z + Math.sin(a) * d, -Math.sin(a) * s * sd * 0.6 - Math.cos(a) * s * 0.5, 2 + rnd() * 5, Math.cos(a) * s * sd * 0.6 - Math.sin(a) * s * 0.5, 0.3 + rnd() * 0.2, 0.4, C('#ffffff'), C('#ff9a3a'), 12, 0.5, -0.4, 0, 1, 1, 1);
        }
        for (let i = 1; i < 4; i++) fx.stain(X + Math.cos(a) * len * i / 4, Z + Math.sin(a) * len * i / 4, 0.45, 'Ember', 3);
        fx.ring(X, Z, 0.2, 1.2, 0.2, '#ffb060', 0.14);
        if (last) { fx.explode('Iron', X2, Z2, 1.4); env.shake(9); }
        G.sfx('fire');
      }
    },

    // Seamsting: it sews the floor
    tapestry: {
      stitch(e) {
        const X = wx(e.x2), Z = wz(e.y2), R = e.r * S, P = [];
        fx.beam(X, 10, Z, X, 0.02, Z, 0.07, 0.5, '#ffd76a'); fx.beam(X, 10, Z, X, 0.02, Z, 0.22, 0.25, '#c08cff');   // the needle comes down
        glare(X, 0.3, Z, 2.5, '#ffd76a', '#c08cff');
        for (let i = 0; i < 9; i++) { const a = i * (TAU * 4 / 9) + 0.3; P.push([X + Math.cos(a) * R, Z + Math.sin(a) * R]); }   // a star of 9 points
        for (let i = 0; i < 9; i++) at(0.06 + i * 0.05, () => {
          const p = P[i], q = P[(i + 1) % 9];
          fx.beam(p[0], 0.09, p[1], q[0], 0.09, q[1], 0.05, 1.4, i & 1 ? '#ffd76a' : '#c08cff');
          A.put(1, q[0], 0.15, q[1], 0, 0, 0, 0.3, 0.7, C('#ffffff'), C('#ffd76a'), 0, 0, 0.3, 2, 0, 1);
        });
        fx.ring(X, Z, R * 0.99, R, 1.4, '#c08cff', 0.07);
        at(1.2, () => every(4.6, 0.55, () => { for (let k = 0; k < 3; k++) { const i = Math.floor(rnd() * 9), p = P[i], q = P[(i + 1 + Math.floor(rnd() * 3)) % 9]; fx.beam(p[0], 0.09, p[1], q[0], 0.09, q[1], 0.035, 0.6, k & 1 ? '#ffd76a' : '#c08cff'); } }));   // the web shows again while the zone lasts
        light(X, 1, Z, '#c08cff', 120, 0.4);
      }
    },

    // Spectrail: 7 colours, then white
    spectrum: {
      converge(e) {
        const TX = wx(e.x2), TZ = wz(e.y2), R = e.r * S;
        fx.ring(TX, TZ, R * 1.6, R, e.dur, '#ffffff', 0.1);
        for (let i = 0; i < 7; i++) at(i * 0.1, () => {
          const p = env.pos(e.side), fx0 = p.x + (i - 3) * 0.45, fy0 = 2.0 + 1.2 * Math.cos((i - 3) * 0.4), fz0 = p.z - 0.4;   // 7 feathers in a fan above the peacock
          fx.beam(fx0, fy0, fz0, TX + Math.cos(i * 0.9) * R * 0.5, 0.05, TZ + Math.sin(i * 0.9) * R * 0.5, 0.1, e.dur - i * 0.1 + 0.1, RAINBOW[i]);
          A.put(1, fx0, fy0, fz0, 0, 0, 0, 0.3, 0.9, C('#ffffff'), C(RAINBOW[i]), 0, 0, 0.3, 2, 0, 1);
          fx.ring(TX, TZ, 0.2, R, 0.3, RAINBOW[i], 0.12);
        });
      },
      tick(e) {
        const TX = wx(e.x2), TZ = wz(e.y2), R = e.r * S;
        if (e.n < 2) {
          fx.bits('Mind', TX, 0.4, TZ, 24, 3, 2);
          for (let i = 0; i < 7; i++) fx.ring(TX, TZ, 0.2, R * (0.5 + i * 0.08), 0.3, RAINBOW[i], 0.07);
          glare(TX, 0.5, TZ, 2.5, RAINBOW[e.n * 4], '#ffffff'); light(TX, 1, TZ, RAINBOW[e.n * 3], 120, 0.3);
          G.sfx('hit');
        } else {
          fx.beam(TX, 11, TZ, TX, 0.02, TZ, 1.1, 0.55, '#ffffff'); fx.beam(TX, 11, TZ, TX, 0.02, TZ, 1.7, 0.35, '#ffd0ea');   // the white pillar
          glare(TX, 0.8, TZ, R * 3, '#ffffff', '#ffd0ea', 0.3); fx.explode('Mind', TX, TZ, R);
          for (let i = 0; i < 7; i++) at(i * 0.03, () => fx.ring(TX, TZ, 0.3, R * (1 + i * 0.12), 0.5, RAINBOW[i], 0.16));
          for (let i = 0; i < 40; i++) { const a = rnd() * TAU, s = 3 + rnd() * 6; A.put(11, TX, 0.5, TZ, Math.cos(a) * s, 2 + rnd() * 5, Math.sin(a) * s, 0.8, 0.3, C('#ffffff'), C(RAINBOW[i % 7]), 7, 1, -0.4, 5, 0, 1); }
          light(TX, 2, TZ, '#ffffff', 400, 0.5);
          G.sfx('big');
        }
      }
    },

    // Smolderasp: the haze
    threeserpents: {
      haze(e, X, Z) {
        const R = e.r * S;
        for (let i = 0; i < 70; i++) { const a = rnd() * TAU, s = R * (1.2 + rnd() * 1.6); D.put(3, X, 0.2 + rnd() * 0.5, Z, Math.cos(a) * s, 0.3 + rnd(), Math.sin(a) * s, 1.4 + rnd() * 0.8, 0.9 + rnd() * 0.6, C(i & 1 ? '#9a6ac0' : '#c8a860'), C('#3a2a4a'), -0.1, 1.6, 1.5, (rnd() - 0.5), 0, 0.55); }
        for (let i = 0; i < 26; i++) { const a = rnd() * TAU, rr = rnd() * R; A.put(15, X + Math.cos(a) * rr, 0.3 + rnd(), Z + Math.sin(a) * rr, 0, 0.8, 0, 1.2, 0.8, C('#ffe9a8'), C('#a653c9'), 0, 0.5, 0.6, (rnd() - 0.5) * 4, 0, 0.7); }
        fx.ring(X, Z, 0.3, R, 0.6, '#c8a860', 0.25); fx.ring(X, Z, 0.3, R * 0.8, 0.8, '#a653c9', 0.2);
        light(X, 1, Z, '#a653c9', 120, 0.5);
      }
    },

    // Forgeshell: each blow heats the shell
    masterwork: {
      start(e, X, Z) { fx.ring(X, Z, 2.6, 0.5, 0.5, '#ff8a3a', 0.2); fx.bits('Iron', X, 1, Z, 16, 3, 3); light(X, 1, Z, '#ff8a3a', 80, 0.4); },
      temper(e, X, Z) {
        fx.bits('Iron', X, 1.2, Z, 12 + e.n * 3, 4, 4); fx.bits('Ember', X, 1.0, Z, 6, 2, 2);
        fx.ring(X, Z, 0.4, 1.4 + e.n * 0.25, 0.25, '#ffb060', 0.14, 1.0);
        glare(X, 1.2, Z, 1.2 + e.n * 0.3, '#ffb060', '#ffffff', 0.12);
        light(X, 1.4, Z, '#ff8a3a', 40 + e.n * 30, 0.25);
        HUD.floatTxt(e.x, e.y, 104, 'Tempered x' + e.n, '#ffc890', 13, 0.8);
      },
      quench(e, X, Z) {
        const R = e.r * S;
        glare(X, 0.8, Z, R * 2.6, '#ffffff', '#ff8a3a', 0.25);
        fx.explode('Ember', X, Z, R); fx.explode('Iron', X, Z, R * 0.7);
        for (let k = 0; k < 3; k++) at(k * 0.08, () => fx.ring(X, Z, 0.4, R * (1 + k * 0.1), 0.45, k ? '#ff8a3a' : '#ffffff', 0.45 - k * 0.1));
        for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; A.put(14, X + Math.cos(a) * R * 0.85, 0.1, Z + Math.sin(a) * R * 0.85, Math.cos(a) * 2, 3 + rnd() * 3, Math.sin(a) * 2, 0.6, 0.9, C('#ffb040'), C('#ff4a08'), -2, 1, -0.3, 0, 0, 1, 0, 0); }
        at(0.25, () => { for (let i = 0; i < 34; i++) D.put(3, X + (rnd() - 0.5) * 2, 0.3, Z + (rnd() - 0.5) * 2, (rnd() - 0.5) * 2, 2 + rnd() * 3, (rnd() - 0.5) * 2, 1.4, 0.9, C('#ffffff'), C('#c8d0d8'), -0.6, 1, 1.5, 0.3, 0, 0.5); });   // the steam of the quench
        light(X, 1.5, Z, '#ffb060', 300 + e.n * 60, 0.6);
        G.sfx('big');
      }
    },

    // Lodetalon: the needle swings home
    truenorth: {
      mark(e) {
        const X = wx(e.x2), Z = wz(e.y2), R = e.r * S, DIR = [[0, -1, '#ff5a4a'], [1, 0, '#cfe0ff'], [0, 1, '#cfe0ff'], [-1, 0, '#cfe0ff']];
        for (let i = 0; i < 4; i++) at(i * 0.11, () => {
          const d = DIR[i];
          fx.beam(X + d[0] * 9, 0.1, Z + d[1] * 9, X, 0.1, Z, i ? 0.07 : 0.11, e.dur - i * 0.11 + 0.15, d[2]);
          A.put(11, X + d[0] * R, 0.2, Z + d[1] * R, 0, 0, 0, 0.5, 0.5, C('#ffffff'), C(d[2]), 0, 0, 0.3, 3, 0, 1);
        });
        fx.ring(X, Z, R * 1.8, R * 0.3, e.dur, '#ff5a4a', 0.09); fx.ring(X, Z, R * 0.99, R, e.dur, '#cfe0ff', 0.06);
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, k = i % 2 ? 0.9 : 1.05; fx.beam(X + Math.cos(a) * R * 0.75, 0.08, Z + Math.sin(a) * R * 0.75, X + Math.cos(a) * R * k, 0.08, Z + Math.sin(a) * R * k, 0.04, e.dur, '#cfe0ff'); }   // the points of the compass
        G.sfx('ready');
      },
      dive(e, X, Z) {
        const R = e.r * S, DIR = [[0, -1, '#ff5a4a'], [1, 0, '#cfe0ff'], [0, 1, '#cfe0ff'], [-1, 0, '#cfe0ff']];
        fx.beam(X, 10, Z, X, 0.02, Z, 0.5, 0.3, '#ffffff');
        for (let i = 0; i < 4; i++) fx.bolt(X + (rnd() - 0.5) * 2, 9, Z + (rnd() - 0.5) * 2, X, 0.02, Z, '#fff27a', 0.08);
        glare(X, 0.6, Z, R * 2.6, '#fff27a', '#ffffff', 0.2);
        fx.explode('Volt', X, Z, R); fx.explode('Gale', X, Z, R * 0.8);
        fx.ring(X, Z, 0.3, R * 1.4, 0.4, '#ffffff', 0.4);
        for (const d of DIR) fx.beam(X, 0.12, Z, X + d[0] * R * 1.6, 0.12, Z + d[1] * R * 1.6, 0.12, 0.35, d[2]);
        light(X, 1.5, Z, '#fff27a', 380, 0.5);
        G.sfx('big');
      }
    },

    // Atollem: a reef in seconds
    atoll: {
      reef(e) {
        const X = wx(e.x2), Z = wz(e.y2), R = e.r * S, p = env.pos(e.side);
        fx.explode('Tide', X, Z, R * 0.7);
        fx.ring(X, Z, 0.3, R, 0.5, '#7fe0d0', 0.35); fx.disc(X, Z, R, 0.4, '#3d9cf0');
        for (let i = 0; i < 18; i++) {   // the reef comes up in a ring
          const a = i / 18 * TAU;
          at(i * 0.016, () => {
            const px = X + Math.cos(a) * R * 0.86, pz = Z + Math.sin(a) * R * 0.86;
            for (let k = 0; k < 4; k++) D.put(k & 1 ? 12 : 10, px + (rnd() - 0.5) * 0.3, 0.05, pz + (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 1.5, 4 + rnd() * 4, (rnd() - 0.5) * 1.5, 0.7 + rnd() * 0.3, 0.3 + rnd() * 0.3, C(k & 1 ? '#f4ece4' : '#ffb8c8'), C(k & 1 ? '#d8c8c0' : '#f58fc0'), 12, 0.3, 0, 5, 0, 1, 1);
            A.put(9, px, 0.2, pz, 0, 1.2 + rnd(), 0, 1.1, 0.3, C('#ffffff'), C('#7fe0d0'), -0.3, 0.5, 0.5, 0, 0, 0.8);
          });
        }
        for (let i = 0; i < 30; i++) { const a = rnd() * TAU, rr = Math.sqrt(rnd()) * R; A.put(9, X + Math.cos(a) * rr, 0.1, Z + Math.sin(a) * rr, 0, 0.8 + rnd() * 1.2, 0, 1 + rnd() * 0.6, 0.2 + rnd() * 0.2, C('#ffffff'), C('#3d9cf0'), -0.2, 0.4, 0.5, 0, 0, 0.8); }
        fx.beam(p.x, 1.0, p.z, X, 0.1, Z, 0.12, 0.4, '#9ff0e0'); glare(p.x, 1.0, p.z, 1.6, '#9ff0e0', '#ffffff');   // the light of the pearl
        light(X, 1, Z, '#7fe0d0', 160, 0.5);
      }
    },

    // Bellowcroak: it lets go
    overpressure: {
      boom(e, X, Z) {
        const R = e.r * S;
        glare(X, 0.8, Z, R * 3, '#ffffff', '#ffd0a0', 0.22);
        fx.explode('Gale', X, Z, R); fx.explode('Ember', X, Z, R * 0.5);
        for (let k = 0; k < 3; k++) at(k * 0.07, () => fx.ring(X, Z, 0.4, R * (1 + k * 0.15), 0.4, '#ffffff', 0.5 - k * 0.12));
        for (let i = 0; i < 80; i++) { const a = rnd() * TAU, s = R * (1.5 + rnd() * 2.5); D.put(3, X, 0.3 + rnd() * 0.8, Z, Math.cos(a) * s, 0.5 + rnd() * 2, Math.sin(a) * s, 1 + rnd() * 0.8, 1 + rnd() * 0.8, C('#ffffff'), C('#c8d0d8'), -0.3, 1.8, 1.6, (rnd() - 0.5), 0, 0.6); }
        for (let i = 0; i < 16; i++) { const a = rnd() * TAU, s = 7 + rnd() * 6; D.put(12, X, 0.8, Z, Math.cos(a) * s, 3 + rnd() * 5, Math.sin(a) * s, 1, 0.14, C('#e0a060'), C('#8a5a30'), 13, 0.2, 0, 8, 0, 1, 1); }   // rivets
        light(X, 1.5, Z, '#ffd0a0', 420, 0.6);
        env.shake(6);
      }
    },

    // Shutterscale: the picture
    freezeframe: {
      flash(e) {
        const X = wx(e.x2), Z = wz(e.y2), R = e.r * S, h = R * 0.82, L = R * 0.45, p = env.pos(e.side);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {   // the corners of a viewfinder
          const cx = X + sx * h, cz = Z + sz * h;
          fx.beam(cx, 0.09, cz, cx - sx * L, 0.09, cz, 0.06, 1.15, '#ffffff'); fx.beam(cx, 0.09, cz, cx, 0.09, cz - sz * L, 0.06, 1.15, '#ffffff');
        }
        fx.beam(X - 0.3, 0.09, Z, X + 0.3, 0.09, Z, 0.03, 1.15, '#ffffff'); fx.beam(X, 0.09, Z - 0.3, X, 0.09, Z + 0.3, 0.03, 1.15, '#ffffff');
        glare(X, 1.0, Z, R * 3, '#ffffff', '#ffffff', 0.12);
        fx.ring(X, Z, R * 1.5, 0.3, 0.22, '#ffffff', 0.5);   // the shutter closes
        light(X, 2.5, Z, '#ffffff', 420, 0.2);
        glare(p.x, 1.2, p.z, 2.2, '#ffffff', '#ffd0ea', 0.12);
        run(1.0, (t, dt, q) => { fx.tele.put(3, X, Z, 0.05, R, 0, { col: C('#ffffff'), w: 0.05, a: 0.7 * (1 - q * 0.5), hdr: 1.4 }); });   // the frame holds for one second
        G.sfx('guard');
      },
      strike(e, X, Z) {
        const R = e.r * S;
        glare(X, 0.6, Z, R * 2.4, '#ffd0ea', '#ff9a5a', 0.2);
        fx.explode('Mind', X, Z, R); fx.explode('Ember', X, Z, R * 0.6);
        fx.ring(X, Z, 0.3, R * 1.2, 0.4, '#ff9a5a', 0.4);
        for (let i = 0; i < 24; i++) { const a = rnd() * TAU, rr = Math.sqrt(rnd()) * R; flame(X + Math.cos(a) * rr, Z + Math.sin(a) * rr, 2 + rnd() * 2, 0.6); }
        env.shake(9); G.sfx('burst');
      }
    },

    // Chronovesp: it takes the time
    stolenhour: {
      steal(e, X, Z) {
        const R = e.r * S;
        for (let i = 0; i < 90; i++) {   // sand in a spiral into the glass
          const a = rnd() * TAU, rr = R * (0.4 + rnd() * 0.7), c = Math.cos(a), s = Math.sin(a), v = rr / 0.5, g = i & 1;
          (g ? A : D).put(g ? 0 : 12, X + c * rr, 0.1 + rnd() * 1.2, Z + s * rr, -c * v * 0.8 - s * v, 0.3, -s * v * 0.8 + c * v, 0.5 + rnd() * 0.2, g ? 0.16 : 0.1, C(g ? '#ff8aff' : '#5a2a8a'), C(g ? '#a020f0' : '#1a0a2a'), 0, 1.2, -0.3, 3, 0, 1);
        }
        fx.ring(X, Z, R, 0.3, 0.5, '#e060ff', 0.3); fx.ring(X, Z, R * 0.99, R, 0.6, '#ffd76a', 0.06);
        run(0.9, (t, dt, q) => {   // 2 clock hands that turn backward
          for (let k = 0; k < 2; k++) fx.tele.put(2, X, Z, 0.06, R * (k ? 0.55 : 0.85), -q * TAU * (k ? 1 : 3) - Math.PI / 2, { col: C(k ? '#ffd76a' : '#e060ff'), wid: k ? 0.16 : 0.09, fill: 0.9, a: 0.8 * (1 - q), w: 0.0001, hdr: 1.4 });
        });
        if (e.n) {   // the time goes from the opponent to Chronovesp
          const FX2 = wx(e.x2), FZ2 = wz(e.y2);
          for (let i = 0; i < 20; i++) at(i * 0.012, () => A.put(2, FX2 + (rnd() - 0.5) * 0.8, 0.4 + rnd(), FZ2 + (rnd() - 0.5) * 0.8, (X - FX2) / 0.35, 0, (Z - FZ2) / 0.35, 0.35, 0.6, C('#ffffff'), C('#e060ff'), 0, 0, -0.3, 0, 1, 1));
          fx.beam(FX2, 0.8, FZ2, X, 0.8, Z, 0.06, 0.4, '#e060ff');
        }
        at(0.4, () => { const p = env.pos(e.side); glare(p.x, 1, p.z, 2.6, '#ff8aff', '#ffd76a'); fx.buff('Shade', p.x, p.z); });
        light(X, 1.2, Z, '#e060ff', 160, 0.5);
      }
    },

    // Lustrewing: the last dance
    lastwaltz: {
      spin(e) {
        const L = e.len * S, p0 = env.pos(e.side);
        every(e.dur, 1 / 30, t => {
          const p = env.pos(e.side);
          for (let k = 0; k < 6; k++) {
            const a = e.a + t * e.w + k * Math.PI / 3, c = Math.cos(a), s = Math.sin(a), ice = k & 1, col = ice ? '#7fe0ff' : '#ff8a3a', d = L * (0.3 + rnd() * 0.7);
            fx.beam(p.x + c * 0.4, 0.75, p.z + s * 0.4, p.x + c * L, 0.3, p.z + s * L, 0.1, 0.05, col);
            if (ice) A.put(6, p.x + c * d, 0.35, p.z + s * d, 0, 0.3, 0, 0.4, 0.4, C('#ffffff'), C(col), 0, 0.5, -0.3, 2, 0, 1);
            else A.put(14, p.x + c * d, 0.3, p.z + s * d, 0, 1.5, 0, 0.4, 0.4, C('#ffffff'), C(col), -1, 0.5, -0.3, 0, 0, 1, 0, 0);
            if (rnd() < 0.4) A.put(1, p.x + c * L, 0.35, p.z + s * L, 0, 0, 0, 0.2, 0.7, C('#ffffff'), C(col), 0, 0, 0.3, 3, 0, 1);
          }
        });
        // the floor of the ballroom lights in waltz time: 1, 2, 3
        for (let k = 0; k < 6; k++) at(k * 0.3, () => { const p = env.pos(e.side), one = k % 3 === 0; fx.ring(p.x, p.z, 0.4, L * (one ? 1.05 : 0.7), 0.3, one ? '#ffe9c0' : '#7fe0ff', one ? 0.22 : 0.1); if (one) G.sfx('fire'); });
        glare(p0.x, 1, p0.z, 3, '#ffe9c0', '#ffffff'); light(p0.x, 1.5, p0.z, '#ffd0a0', 200, 0.8);
      }
    }
  };

  return {
    // the wind-up: light goes into the heart of the Beast
    cast(id, e, dur) {
      const c = CAST[id] || ['#ffe27a', '#ffffff'], p0 = env.pos(e.side);
      fx.ring(p0.x, p0.z, 3.4, 0.3, Math.max(0.3, dur * 0.9), c[0], 0.1);
      rate(dur * 0.9, 90, () => {
        const p = env.pos(e.side), a = rnd() * TAU, R = 1.6 + rnd() * 1.6, cs = Math.cos(a), sn = Math.sin(a), sp = R / 0.32;
        A.put(2, p.x + cs * R, 0.2 + rnd() * 1.5, p.z + sn * R, -cs * sp, 0, -sn * sp, 0.32, 0.55, C(c[1]), C(c[0]), 0, 0, -0.5, 0, 1, 1);
      });
      at(dur * 0.9, () => { const p = env.pos(e.side); glare(p.x, 0.9, p.z, 2.2, c[0], c[1], 0.14); });
    },
    event(e) { const u = U[e.id], f = u && u[e.ph]; if (f) f(e, wx(e.x), wz(e.y)); },
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const L = live[i];
        L.t += dt;
        if (L.dur < 0) { if (L.t >= 0) { live.splice(i, 1); L.fn(); } }
        else if (L.t >= L.dur) live.splice(i, 1);
        else L.fn(L.t, dt, L.t / L.dur);
      }
    },
    clear() { live.length = 0; },
    has(id) { return !!U[id]; }
  };
}
