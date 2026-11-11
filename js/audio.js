/* Arena Beasts - small WebAudio synthesizer. No audio files. */
(function () {
  'use strict';
  var G = window.G, ac = null, master = null, last = {}, nbuf = null;
  G.muted = false;

  function init() {
    if (ac) return true;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return false;
    ac = new C();
    master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    nbuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    var d = nbuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function tone(type, f0, f1, dur, vol, delay) {
    var t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, delay) {
    var t = ac.currentTime + (delay || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nbuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  var S = {
    hit: function () { noise(0.09, 0.3, 900); tone('square', 220, 90, 0.09, 0.1); },
    big: function () { noise(0.2, 0.45, 500); tone('sawtooth', 180, 50, 0.22, 0.16); },
    weak: function () { noise(0.06, 0.15, 1600); },
    cast: function () { tone('triangle', 380, 620, 0.08, 0.07); },
    fire: function () { noise(0.1, 0.14, 1800); tone('square', 520, 260, 0.08, 0.05); },
    burst: function () { noise(0.28, 0.4, 300); tone('sine', 140, 40, 0.3, 0.25); },
    dodge: function () { noise(0.12, 0.14, 2600); },
    guard: function () { tone('square', 760, 520, 0.05, 0.07); noise(0.05, 0.1, 3000); },
    faint: function () { tone('sawtooth', 420, 60, 0.55, 0.14); },
    send: function () { tone('square', 320, 900, 0.16, 0.08); noise(0.1, 0.1, 2000); },
    sig: function () { tone('sawtooth', 200, 800, 0.35, 0.12); tone('square', 400, 1600, 0.35, 0.06, 0.05); noise(0.4, 0.2, 700); },
    ready: function () { tone('square', 660, 660, 0.08, 0.07); tone('square', 990, 990, 0.14, 0.07, 0.09); },
    up: function () { tone('triangle', 500, 900, 0.14, 0.08); },
    down: function () { tone('triangle', 500, 240, 0.16, 0.08); },
    heal: function () { tone('sine', 520, 780, 0.12, 0.09); tone('sine', 780, 1040, 0.14, 0.07, 0.08); },
    status: function () { tone('square', 300, 200, 0.1, 0.06); tone('square', 260, 180, 0.12, 0.06, 0.08); },
    ui: function () { tone('square', 700, 700, 0.04, 0.05); },
    go: function () { tone('square', 440, 440, 0.1, 0.09); tone('square', 880, 880, 0.3, 0.09, 0.12); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone('square', f, f, 0.18, 0.09, i * 0.13); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone('triangle', f, f, 0.24, 0.11, i * 0.17); }); }
  };
  G.sfx = function (n) {
    if (G.muted || !S[n]) return;
    var now = performance.now();
    if (last[n] && now - last[n] < 45) return;
    last[n] = now;
    try { if (!init()) return; if (ac.state === 'suspended') ac.resume(); S[n](); } catch (e) { /* audio is optional */ }
  };
})();
