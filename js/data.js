/* Arena Beasts - data: element types, type chart, creatures, moves, signature powers.
   All creatures, names and moves are original. */
(function (root) {
  'use strict';
  var G = root.G = root.G || {};

  G.TYPES = ['Ember', 'Tide', 'Bloom', 'Volt', 'Frost', 'Stone', 'Gale', 'Venom', 'Mind', 'Shade', 'Iron', 'Brawl'];
  G.TCOL = {
    Ember: '#f0693a', Tide: '#3d8fe8', Bloom: '#57b84a', Volt: '#f2c81e', Frost: '#6fd0e6', Stone: '#b08a52',
    Gale: '#9fb4f0', Venom: '#a653c9', Mind: '#f065a8', Shade: '#7a66b8', Iron: '#9aa7b5', Brawl: '#d2553f'
  };

  var STRONG = {
    Ember: ['Bloom', 'Frost', 'Iron'], Tide: ['Ember', 'Stone'], Bloom: ['Tide', 'Stone'], Volt: ['Tide', 'Gale'],
    Frost: ['Bloom', 'Gale', 'Stone'], Stone: ['Ember', 'Volt', 'Venom'], Gale: ['Bloom', 'Brawl'], Venom: ['Bloom', 'Tide'],
    Mind: ['Brawl', 'Venom'], Shade: ['Mind', 'Shade'], Iron: ['Frost', 'Stone'], Brawl: ['Frost', 'Stone', 'Iron']
  };
  var WEAK = {
    Ember: ['Tide', 'Stone', 'Ember'], Tide: ['Bloom', 'Tide', 'Frost'], Bloom: ['Ember', 'Bloom', 'Venom', 'Gale', 'Iron'],
    Volt: ['Bloom', 'Volt'], Frost: ['Ember', 'Tide', 'Frost', 'Iron'], Stone: ['Bloom', 'Gale', 'Brawl'],
    Gale: ['Volt', 'Iron', 'Stone'], Venom: ['Venom', 'Stone', 'Shade'], Mind: ['Mind', 'Iron', 'Shade'],
    Shade: ['Brawl', 'Iron'], Iron: ['Ember', 'Tide', 'Volt', 'Iron'], Brawl: ['Gale', 'Mind', 'Venom']
  };
  var NONE = { Volt: ['Stone'], Brawl: ['Shade'], Venom: ['Iron'] };

  G.CHART = {};
  G.TYPES.forEach(function (a) {
    G.CHART[a] = {};
    G.TYPES.forEach(function (d) {
      var v = 1;
      if (STRONG[a].indexOf(d) >= 0) v = 2;
      if (WEAK[a].indexOf(d) >= 0) v = 0.5;
      if (NONE[a] && NONE[a].indexOf(d) >= 0) v = 0;
      G.CHART[a][d] = v;
    });
  });
  G.eff = function (t, types) {
    var m = G.CHART[t][types[0]];
    if (types.length > 1) m *= G.CHART[t][types[1]];
    return m;
  };

  G.STAT_NAME = { atk: 'Attack', def: 'Defence', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };
  G.STAT_SHORT = { atk: 'ATK', def: 'DEF', spa: 'SPA', spd: 'SPD', spe: 'SPE' };
  G.STATUS_NAME = { burn: 'Burn', poison: 'Poison', toxic: 'Toxic', para: 'Paralysis', chill: 'Chill', sleep: 'Sleep' };
  G.STATUS_COL = { burn: '#f0693a', poison: '#a653c9', toxic: '#7d2fa8', para: '#f2c81e', chill: '#6fd0e6', sleep: '#9aa7b5' };
  G.SHAPE_LABEL = { cone: 'Cone', line: 'Beam', nova: 'Burst', ring: 'Shockwave', proj: 'Shot', lob: 'Lob', zone: 'Hazard', dash: 'Dash', self: 'Self' };

  // ---- move helpers -------------------------------------------------------
  function M(name, type, cat, power, cd, wind, shape, o) {
    var m = { name: name, type: type, cat: cat, power: power, cd: cd, wind: wind, shape: shape, rec: 240, fx: [] };
    if (o) for (var k in o) m[k] = o[k];
    return m;
  }
  function st(s, ch) { return { k: 'status', s: s, ch: ch }; }
  function conf(ch) { return { k: 'conf', ch: ch }; }
  function sg(who, stat, n, ch) { return { k: 'stage', who: who, stat: stat, n: n, ch: ch === undefined ? 1 : ch }; }
  function heal(p) { return { k: 'heal', pct: p }; }
  function drain(p) { return { k: 'drain', pct: p }; }
  function recoil(p) { return { k: 'recoil', pct: p }; }
  var cure = { k: 'cure' };
  function rooted(t, ch) { return { k: 'root', t: t, ch: ch === undefined ? 1 : ch }; }
  function stun(t, ch) { return { k: 'stun', t: t, ch: ch === undefined ? 1 : ch }; }
  function slow(t, f, ch) { return { k: 'slow', t: t, f: f, ch: ch === undefined ? 1 : ch }; }
  function sap(n) { return { k: 'sap', n: n }; }

  G.DEX = {};
  G.ROSTER = [];
  function add(c) {
    var s = c.sig, sm = { name: s.name, type: s.type, cat: 'spec', power: 0, cd: 0, wind: s.wind, rec: 500, isSig: true, fx: [], shape: 'self' };
    for (var k in s.tele) sm[k] = s.tele[k];
    c.sigMove = sm;
    G.DEX[c.id] = c;
    G.ROSTER.push(c.id);
  }

  // ---- roster: 20 automaton creatures made of craft materials ---------------
  function C(id, name, types, size, role, pref, ai, hover, s, blurb, moves, sig) {
    add({ id: id, name: name, types: types, size: size, role: role, pref: pref, ai: ai, hover: hover,
      st: { hp: s[0], atk: s[1], def: s[2], spa: s[3], spd: s[4], spe: s[5] }, blurb: blurb, moves: moves, sig: sig });
  }

  C('kilnhound', 'Glazefang', ['Ember', 'Stone'], 'L', 'Bruiser', 'melee', 'aggressive', false, [105, 105, 92, 75, 70, 60],
    'A porcelain mastiff with veins of magma. A furnace burns in its open chest.', [
      M('Cinder Lunge', 'Ember', 'phys', 80, 2.3, 280, 'dash', { dist: 240, width: 44, fx: [st('burn', 0.2)] }),
      M('Hearth Howl', 'Ember', 'spec', 76, 4.6, 420, 'cone', { range: 220, arc: 60, fx: [sg('foe', 'def', -1, 0.5)] }),
      M('Slag Trail', 'Ember', 'status', 0, 9, 300, 'zone', { range: 0, radius: 82, zone: { kind: 'lava', dur: 7, pct: 0.02, slow: 0.7, status: 'burn', statusCh: 0.4 } }),
      M('Kiln Temper', 'Stone', 'status', 0, 12, 400, 'self', { fx: [sg('self', 'def', 1), sg('self', 'atk', 1)] })
    ], { id: 'caldera', name: 'Vesuvian Shatter', type: 'Ember', wind: 800, tele: { shape: 'nova', radius: 200 },
      desc: 'The porcelain shell explodes in all directions. Molten glass stays on the floor for 5 seconds and burns.', cost: 'Speed falls 2 stages.' });

  C('pendulummantis', 'Mantick', ['Iron', 'Mind'], 'M', 'Skirmisher', 'melee', 'aggressive', false, [82, 115, 78, 70, 75, 110],
    'A brass clockwork mantis with stained-glass wings. It strikes on a strict beat.', [
      M('Isochronal Slash', 'Iron', 'phys', 64, 1.1, 150, 'cone', { range: 112, arc: 95 }),
      M('Pendulum Swing', 'Iron', 'phys', 90, 4, 300, 'dash', { dist: 280, width: 40, kb: 220 }),
      M('Prism Refraction', 'Mind', 'status', 0, 12, 350, 'self', { fx: [sg('self', 'spd', 2)] }),
      M('Tick-Tock Feint', 'Mind', 'status', 0, 10, 300, 'nova', { radius: 125, fx: [conf(0.8), sg('foe', 'spe', -1)] })
    ], { id: 'xnova', name: 'Grand Chime', type: 'Iron', wind: 700, tele: { shape: 'nova', radius: 210 }, p: { pct: 0.24, radius: 210, type: 'Iron', stun: 1.4, cost: ['spe', -1], st: 0.6 },
      desc: 'The pendulum rings like a great bell. The shock wave stuns the opponent.', cost: 'Speed falls 1 stage.' });

  C('mercurystag', 'Argantler', ['Iron', 'Tide'], 'L', 'Bruiser', 'mid', 'aggressive', false, [95, 100, 85, 80, 80, 80],
    'An obsidian stag. Its antlers are drops of liquid silver that change shape.', [
      M('Quicksilver Lance', 'Iron', 'phys', 90, 5.2, 400, 'dash', { dist: 320, width: 40, kb: 200 }),
      M('Liquid Scatter', 'Iron', 'spec', 22, 3.4, 280, 'proj', { range: 420, speed: 420, pr: 8, count: 5, spread: 14, homing: 1.2 }),
      M('Mirror Puddle', 'Tide', 'status', 0, 11, 300, 'self', { fx: [sg('self', 'spe', 2)] }),
      M('Amalgam Shield', 'Iron', 'status', 0, 13, 400, 'self', { fx: [sg('self', 'def', 1), sg('self', 'spd', 1)] })
    ], { id: 'xlob', name: 'Tides of Chrome', type: 'Iron', wind: 700, tele: { shape: 'lob', range: 420, radius: 150 },
      p: { pct: 0.32, radius: 150, type: 'Iron', kb: 300, zone: { radius: 150, dur: 5, kind: 'spikes', pct: 0.02 }, cost: ['def', -1], st: 0.7 },
      desc: 'Mercury spikes come out of the floor in a large circle. The spikes stay for 5 seconds.', cost: 'Defence falls 1 stage.' });

  C('resonancewhale', 'Brasswail', ['Gale', 'Tide'], 'L', 'Support', 'long', 'careful', true, [120, 65, 95, 100, 100, 40],
    'A floating copper whale with organ pipes on its back. It fights with sound and steam.', [
      M('Brass Bellow', 'Gale', 'spec', 78, 3.9, 360, 'cone', { range: 240, arc: 60, kb: 300 }),
      M('Steam Vent Burst', 'Tide', 'spec', 85, 5, 400, 'nova', { radius: 120, fx: [st('burn', 0.3)] }),
      M('Harmonic Tether', 'Gale', 'status', 0, 11, 500, 'ring', { radius: 200, speed: 300, fx: [sg('foe', 'spd', -1), sg('foe', 'spa', -1)] }),
      M('Acoustic Dampener', 'Tide', 'status', 0, 15, 500, 'self', { fx: [heal(0.24), cure] })
    ], { id: 'xbeam', name: 'Symphony of the Deep', type: 'Gale', wind: 800, tele: { shape: 'line', range: 700, width: 90 },
      p: { pct: 0.34, range: 700, width: 90, type: 'Gale', kb: 420, conf: 3, root: 1.2, st: 1.2 },
      desc: 'All organ pipes fire one sonic beam across the arena. It pushes and confuses the opponent.', cost: 'Brasswail cannot move for 1.2 seconds.' });

  C('solarisscarab', 'Noonshell', ['Stone', 'Mind'], 'M', 'Tank', 'mid', 'defensive', false, [100, 90, 112, 75, 88, 45],
    'A golden sundial beetle. Its quartz dome holds sand that does not obey gravity.', [
      M('Dune Roll', 'Stone', 'phys', 90, 5, 400, 'dash', { dist: 300, width: 46, kb: 200 }),
      M('Glass Laser', 'Mind', 'spec', 90, 5.5, 520, 'line', { range: 480, width: 22, fx: [st('burn', 0.25)] }),
      M('Quicksand Sinkhole', 'Stone', 'status', 0, 11, 380, 'zone', { range: 320, radius: 90, zone: { kind: 'gravity', dur: 6, pct: 0.012, slow: 0.45 } }),
      M('Sundial Ward', 'Mind', 'status', 0, 13, 400, 'self', { fx: [sg('self', 'def', 1), sg('self', 'spd', 1)] })
    ], { id: 'zerofield', name: 'Hourglass Inversion', type: 'Mind', wind: 700, tele: { shape: 'nova', radius: 220 },
      desc: 'Gravity turns over. Opponent shots stop in the air and go back. The opponent becomes slow.', cost: 'All move cooldowns increase by 3 seconds.' });

  C('teslajelly', 'Coilbell', ['Volt', 'Tide'], 'S', 'Skirmisher', 'mid', 'tricky', true, [70, 60, 68, 115, 85, 115],
    'A glass bell with a glowing filament and copper-wire arms. It is fast and hard to hit.', [
      M('Filament Whip', 'Volt', 'phys', 66, 1.4, 200, 'cone', { range: 120, arc: 100, kb: -120, fx: [st('para', 0.15)] }),
      M('Arc Discharge', 'Volt', 'spec', 80, 2.8, 300, 'proj', { range: 450, speed: 380, pr: 11, homing: 1.8, fx: [st('para', 0.2)] }),
      M('Static Levitation', 'Volt', 'status', 0, 9, 300, 'nova', { radius: 130, fx: [st('para', 0.7), sg('foe', 'spe', -1)] }),
      M('Faraday Cage', 'Volt', 'status', 0, 13, 400, 'self', { fx: [sg('self', 'def', 1), sg('self', 'spd', 1)] })
    ], { id: 'xnova', name: 'High-Voltage Storm', type: 'Volt', wind: 700, tele: { shape: 'nova', radius: 230 },
      p: { pct: 0.22, radius: 230, type: 'Volt', status: 'para', zone: { radius: 230, dur: 3.5, kind: 'volt', pct: 0.03, slow: 0.75 }, recoil: 0.08, st: 0.5 },
      desc: 'The copper wires go into the floor. The floor around Coilbell stays electric for 3.5 seconds.', cost: 'Recoil: 8% of maximum HP.' });

  C('origamicrane', 'Pleatheron', ['Gale', 'Iron'], 'M', 'Skirmisher', 'mid', 'tricky', true, [75, 100, 75, 80, 75, 108],
    'A heron folded from titanium sheets. Its edges cut like paper.', [
      M('Paper-Cut Glide', 'Gale', 'phys', 78, 4.4, 240, 'dash', { dist: 300, width: 34 }),
      M('Thousand-Fold Barrage', 'Iron', 'spec', 20, 2.8, 260, 'proj', { range: 460, speed: 460, pr: 7, count: 5, spread: 12, homing: 1.8 }),
      M('Unfold Parry', 'Iron', 'status', 0, 12, 300, 'self', { fx: [sg('self', 'spe', 1), sg('self', 'def', 1)] }),
      M('Silk Snare', 'Gale', 'status', 0, 10, 350, 'line', { range: 300, width: 30, fx: [rooted(1.5), sg('foe', 'spe', -1)] })
    ], { id: 'cyclone', name: 'Crucible of Folds', type: 'Gale', wind: 600, tele: { shape: 'nova', radius: 150 },
      desc: 'Pleatheron becomes a tornado of metal sheets for 5 seconds. It heals, pushes the opponent, and stops shots.', cost: 'Sp. Atk falls 2 stages at the end.' });

  C('basaltgorilla', 'Basaltback', ['Stone', 'Brawl'], 'L', 'Bruiser', 'melee', 'aggressive', false, [115, 120, 100, 45, 70, 62],
    'An ape of basalt columns and steel pistons. Each hit shakes the arena.', [
      M('Hydraulic Pile-Driver', 'Stone', 'phys', 85, 2.2, 320, 'line', { range: 280, width: 44, kb: 160 }),
      M('Tectonic Grapple', 'Brawl', 'phys', 95, 4.5, 300, 'cone', { range: 95, arc: 80, kb: 260, fx: [stun(0.6, 0.5)] }),
      M('Pressure Vent', 'Brawl', 'status', 0, 12, 350, 'self', { fx: [sg('self', 'atk', 1), sg('self', 'spe', 1)] }),
      M('Monolith Hurl', 'Stone', 'phys', 90, 5, 450, 'lob', { range: 360, radius: 70, delay: 0.55 })
    ], { id: 'xpound', name: 'Magma Core Overdrive', type: 'Stone', wind: 600, tele: { shape: 'nova', radius: 150 },
      p: { pct: 0.085, n: 5, gap: 0.26, radius: 150, type: 'Stone', kb: 280, cost: ['spe', -1] },
      desc: 'The pistons glow white. Basaltback hits the ground 5 times.', cost: 'Speed falls 1 stage.' });

  C('lanternangler', 'Gloomlure', ['Shade', 'Tide'], 'M', 'Trapper', 'mid', 'tricky', true, [112, 110, 98, 95, 95, 80],
    'A wrought-iron anglerfish. A ghost flame burns in the lantern on its lure.', [
      M('Iron Jaw Snap', 'Shade', 'phys', 92, 1.8, 250, 'cone', { range: 115, arc: 80, fx: [sg('foe', 'def', -1, 0.5)] }),
      M('Wisp Detonation', 'Shade', 'spec', 92, 4, 400, 'lob', { range: 340, radius: 88, delay: 0.7, fx: [st('burn', 0.3)] }),
      M('Lure Hypnosis', 'Tide', 'spec', 62, 5, 350, 'cone', { range: 260, arc: 60, kb: -220, fx: [conf(0.5), sg('foe', 'spd', -1, 0.5)] }),
      M('Abyssal Fade', 'Tide', 'status', 0, 11, 300, 'self', { fx: [sg('self', 'spe', 1), sg('self', 'def', 1), heal(0.12)] })
    ], { id: 'nightfall', name: 'Lighthouse of the Lost', type: 'Shade', wind: 600, tele: { shape: 'self' },
      desc: 'The lantern goes dark and the arena with it for 6 seconds. Gloomlure is almost invisible and its next hit is much stronger.', cost: 'Defence falls 2 stages.' });

  C('gyropangolin', 'Pangyre', ['Iron', 'Brawl'], 'S', 'Skirmisher', 'melee', 'aggressive', false, [75, 105, 105, 50, 70, 105],
    'A bronze pangolin with a gyroscope in its body. It rolls like a wheel.', [
      M('Flywheel Ricochet', 'Iron', 'phys', 85, 4.2, 240, 'dash', { dist: 320, width: 38 }),
      M('Scale Shrapnel', 'Iron', 'phys', 75, 3.4, 300, 'nova', { radius: 120 }),
      M('Tunnel Bore', 'Brawl', 'phys', 85, 5, 380, 'lob', { range: 300, radius: 65, delay: 0.5 }),
      M('Gyro-Counter', 'Iron', 'status', 0, 12, 350, 'self', { fx: [sg('self', 'def', 1), sg('self', 'atk', 1)] })
    ], { id: 'relay', name: 'Juggernaut Sawblade', type: 'Iron', wind: 600, tele: { shape: 'line', range: 420, width: 44 },
      desc: 'Pangyre becomes a burning saw blade and cuts through the opponent 5 times.', cost: 'Pangyre is slow for 2.5 seconds after the last cut.' });

  C('needlescorpion', 'Seamsting', ['Venom', 'Iron'], 'M', 'Trapper', 'melee', 'tricky', false, [85, 115, 90, 70, 80, 100],
    'An ivory scorpion with scissor claws. Its tail is a golden needle with glowing thread.', [
      M('Scissor Cross-Cut', 'Iron', 'phys', 78, 1.6, 220, 'cone', { range: 100, arc: 85, fx: [sg('foe', 'def', -1, 0.3)] }),
      M('Thread Stitch', 'Venom', 'phys', 84, 4, 300, 'line', { range: 300, width: 22, kb: -170, fx: [rooted(1.2, 0.6)] }),
      M('Bobbin Dash', 'Venom', 'status', 0, 8, 250, 'zone', { range: 0, radius: 72, zone: { kind: 'vines', dur: 8, pct: 0.02, slow: 0.6 } }),
      M('Thimble Guard', 'Iron', 'status', 0, 13, 400, 'self', { fx: [sg('self', 'def', 2)] })
    ], { id: 'overgrowth', name: 'Grand Tapestry', type: 'Venom', wind: 700, tele: { shape: 'lob', range: 600, radius: 170 },
      desc: 'A web of glowing thread covers a large area for 6 seconds. It slows and drains the opponent.', cost: 'Defence falls 1 stage. Brief root.' });

  C('prismpeacock', 'Spectrail', ['Mind', 'Frost'], 'M', 'Artillery', 'long', 'careful', false, [75, 55, 75, 125, 100, 85],
    'A silver peacock with 15 floating glass feathers that change colour.', [
      M('Kaleidoscope Fan', 'Mind', 'spec', 30, 2.0, 260, 'proj', { range: 460, speed: 520, pr: 7, count: 5, spread: 9, homing: 1.2 }),
      M('Mirage Plume', 'Frost', 'spec', 88, 4.4, 420, 'lob', { range: 340, radius: 75, delay: 0.8, fx: [conf(0.4), st('chill', 0.3)] }),
      M('Laser Pirouette', 'Mind', 'spec', 88, 4.5, 450, 'nova', { radius: 140 }),
      M('Glamour Veil', 'Frost', 'status', 0, 13, 400, 'self', { fx: [sg('self', 'spa', 1), sg('self', 'spe', 1)] })
    ], { id: 'xlob', name: 'Solar Prism Convergence', type: 'Mind', wind: 800, tele: { shape: 'lob', range: 600, radius: 120 },
      p: { pct: 0.36, radius: 120, type: 'Mind', status: 'burn', cds: 2, st: 0.6 },
      desc: 'All 15 feathers focus the light into one rainbow pillar from above.', cost: 'All move cooldowns increase by 2 seconds.' });

  C('censerserpent', 'Smolderasp', ['Venom', 'Mind'], 'M', 'Trapper', 'mid', 'tricky', false, [100, 95, 85, 100, 95, 65],
    'A jade cobra with a bronze incense hood. Its smoke hides it and poisons.', [
      M('Jade Fang Strike', 'Venom', 'phys', 86, 1.7, 240, 'line', { range: 235, width: 26, fx: [st('poison', 0.4)] }),
      M('Incense Cloud', 'Venom', 'status', 0, 10, 380, 'zone', { range: 320, radius: 85, zone: { kind: 'smoke', dur: 9, pct: 0.028, slow: 0.7, status: 'poison', statusCh: 0.4 } }),
      M('Chain Constriction', 'Mind', 'phys', 95, 4, 300, 'cone', { range: 95, arc: 90, kb: 220, fx: [rooted(1, 0.5)] }),
      M('Smoke Teleport', 'Mind', 'status', 0, 15, 450, 'self', { fx: [heal(0.2), cure, sg('self', 'spe', 1)] })
    ], { id: 'xnova', name: 'Nirvana Haze', type: 'Venom', wind: 700, tele: { shape: 'nova', radius: 220 },
      p: { pct: 0.2, radius: 220, type: 'Venom', conf: 3, zone: { radius: 220, dur: 6, kind: 'smoke', pct: 0.02, slow: 0.7, status: 'poison', statusCh: 0.5 }, cost: ['def', -1], st: 0.6 },
      desc: 'Purple and gold mist covers the floor for 6 seconds. It confuses, slows and poisons.', cost: 'Defence falls 1 stage.' });

  C('anviltortoise', 'Forgeshell', ['Iron', 'Ember'], 'L', 'Tank', 'melee', 'defensive', false, [120, 95, 130, 55, 85, 35],
    'A cast-iron snapping turtle. Its shell is a hot anvil and its tail is a hammer.', [
      M('Anvil Drop', 'Iron', 'phys', 85, 2.4, 360, 'nova', { radius: 105 }),
      M('Hammer Tail Slam', 'Iron', 'phys', 80, 4, 340, 'cone', { range: 110, arc: 140, kb: 320 }),
      M('Forge Spark Shower', 'Ember', 'spec', 30, 3.5, 320, 'proj', { range: 400, speed: 430, pr: 8, count: 3, spread: 10, fx: [st('burn', 0.15)] }),
      M('Ironclad Bunker', 'Iron', 'status', 0, 13, 450, 'self', { fx: [sg('self', 'def', 2)] })
    ], { id: 'bulwark', name: 'Masterwork Cataclysm', type: 'Iron', wind: 600, tele: { shape: 'self' },
      desc: 'The anvil shell glows white for 5 seconds. It reflects shots, then releases a shock burst of molten iron.', cost: 'Forgeshell cannot move during this time.' });

  C('compasshawk', 'Lodetalon', ['Gale', 'Volt'], 'S', 'Skirmisher', 'mid', 'aggressive', true, [65, 95, 65, 95, 75, 125],
    'A falcon of astrolabe rings with compass-needle wings and a lodestone heart.', [
      M('True-North Dive', 'Gale', 'phys', 85, 4, 240, 'dash', { dist: 300, width: 36 }),
      M('Needle Volley', 'Volt', 'spec', 26, 2.2, 220, 'proj', { range: 440, speed: 520, pr: 7, count: 3, spread: 14, homing: 2 }),
      M('Magnetic Polarity', 'Volt', 'spec', 60, 5, 320, 'nova', { radius: 130, kb: 340, fx: [st('para', 0.25)] }),
      M('Astrolabe Hover', 'Gale', 'status', 0, 12, 350, 'self', { fx: [sg('self', 'spe', 1), sg('self', 'spa', 1)] })
    ], { id: 'xlob', name: 'Celestial Alignment', type: 'Volt', wind: 700, tele: { shape: 'lob', range: 600, radius: 110 },
      p: { pct: 0.34, radius: 110, type: 'Volt', stun: 1.0, recoil: 0.08, st: 0.5 },
      desc: 'Four beams of starlight come down and cross on the target.', cost: 'Recoil: 8% of maximum HP.' });

  C('coralgolem', 'Atollem', ['Bloom', 'Tide'], 'L', 'Tank', 'mid', 'defensive', false, [115, 85, 100, 80, 92, 35],
    'A guardian grown from white coral. A glowing pearl floats in its hollow chest.', [
      M('Reef Eruption', 'Bloom', 'phys', 82, 3.1, 340, 'line', { range: 240, width: 46, kb: 200 }),
      M('Pearl Beam', 'Tide', 'spec', 95, 6.5, 600, 'line', { range: 520, width: 28 }),
      M('Brine Wave', 'Tide', 'spec', 70, 5, 380, 'nova', { radius: 140, fx: [sg('foe', 'spe', -1)] }),
      M('Calcify Regen', 'Bloom', 'status', 0, 15, 500, 'self', { fx: [heal(0.25), sg('self', 'def', 1)] })
    ], { id: 'xlob', name: 'Abyssal Atoll', type: 'Bloom', wind: 800, tele: { shape: 'lob', range: 380, radius: 160 },
      p: { pct: 0.3, radius: 160, type: 'Bloom', zone: { radius: 160, dur: 6, kind: 'spikes', pct: 0.025, slow: 0.6 }, cost: ['spe', -1], st: 0.8 },
      desc: 'A reef grows around the target and breaks. Sharp coral stays on the floor for 6 seconds.', cost: 'Speed falls 1 stage.' });

  C('bellowsfrog', 'Bellowcroak', ['Gale', 'Ember'], 'M', 'Trapper', 'mid', 'tricky', false, [95, 85, 90, 90, 85, 65],
    'A copper boiler toad with an accordion throat. It moves with steam pressure.', [
      M('Pneumatic Tongue', 'Gale', 'phys', 70, 3.4, 280, 'line', { range: 280, width: 22, kb: -190 }),
      M('Bellows Blast', 'Gale', 'spec', 80, 4, 380, 'cone', { range: 240, arc: 60, kb: 340 }),
      M('Boiler Slam', 'Ember', 'phys', 85, 4.8, 380, 'nova', { radius: 110, fx: [st('burn', 0.3)] }),
      M('Pressure Bounce', 'Ember', 'status', 0, 11, 300, 'self', { fx: [sg('self', 'spe', 2)] })
    ], { id: 'xnova', name: 'Overpressure Detonation', type: 'Gale', wind: 900, tele: { shape: 'nova', radius: 220 },
      p: { pct: 0.36, radius: 220, type: 'Gale', kb: 520, status: 'burn', recoil: 0.1, st: 0.7 },
      desc: 'All valves close. Bellowcroak grows, then explodes in steam and sound.', cost: 'Recoil: 10% of maximum HP.' });

  C('lenschameleon', 'Shutterscale', ['Mind', 'Shade'], 'S', 'Artillery', 'long', 'tricky', false, [70, 70, 70, 120, 90, 95],
    'A brass chameleon of lens barrels. Its aperture eyes flash like a camera.', [
      M('Aperture Flash', 'Mind', 'spec', 76, 2.3, 300, 'cone', { range: 220, arc: 70, fx: [conf(0.4)] }),
      M('Zoom Snipe', 'Mind', 'spec', 105, 6, 650, 'line', { range: 600, width: 20 }),
      M('Film-Reel Whip', 'Shade', 'phys', 65, 3, 240, 'cone', { range: 105, arc: 120, fx: [sg('foe', 'spe', -1)] }),
      M('Optical Camouflage', 'Shade', 'status', 0, 12, 350, 'self', { fx: [sg('self', 'spe', 1), sg('self', 'spa', 1)] })
    ], { id: 'xlob', name: 'Exposure Overburn', type: 'Mind', wind: 800, tele: { shape: 'lob', range: 500, radius: 150 },
      p: { pct: 0.3, radius: 150, type: 'Mind', status: 'burn', conf: 3, zone: { radius: 150, dur: 4, kind: 'lava', pct: 0.015 }, cds: 2, st: 0.6 },
      desc: 'A viewfinder frame shows on the floor. Focused light burns all of that area for 4 seconds.', cost: 'All move cooldowns increase by 2 seconds.' });

  C('hourglasswasp', 'Chronovesp', ['Venom', 'Shade'], 'S', 'Skirmisher', 'mid', 'aggressive', true, [72, 110, 68, 80, 70, 120],
    'A brass wasp. Its abdomen is an hourglass full of glowing void sand.', [
      M('Void-Stinger Lunge', 'Venom', 'phys', 90, 3.0, 220, 'dash', { dist: 260, width: 34, fx: [st('poison', 0.4)] }),
      M('Chrono-Dart', 'Shade', 'phys', 28, 2.0, 200, 'proj', { range: 420, speed: 540, pr: 7, count: 3, spread: 9, homing: 1.5, fx: [slow(2, 0.65, 0.5)] }),
      M('Sand-Siphon', 'Venom', 'phys', 76, 4, 240, 'line', { range: 145, width: 26, fx: [drain(0.5), sap(20)] }),
      M('Evasive Buzz', 'Shade', 'status', 0, 11, 300, 'self', { fx: [sg('self', 'spe', 2)] })
    ], { id: 'xnova', name: 'Sands of Entropy', type: 'Shade', wind: 700, tele: { shape: 'nova', radius: 200 },
      p: { pct: 0.2, radius: 200, type: 'Shade', slow: [4, 0.4], zone: { radius: 200, dur: 5, kind: 'gravity', pct: 0.015, slow: 0.5 }, cost: ['def', -1], st: 0.5 },
      desc: 'The hourglass breaks. Void sand makes a field that keeps the opponent in slow motion for 5 seconds.', cost: 'Defence falls 1 stage.' });

  C('chandeliermoth', 'Lustrewing', ['Ember', 'Frost'], 'M', 'Artillery', 'long', 'careful', true, [86, 55, 80, 120, 100, 85],
    'A wrought-iron moth. Crystal drops hang from its wings and candles burn on its antennas.', [
      M('Crystal Shower', 'Frost', 'spec', 24, 2.4, 260, 'proj', { range: 440, speed: 480, pr: 7, count: 5, spread: 13, fx: [st('chill', 0.1)] }),
      M('Wax-Flame Orb', 'Ember', 'spec', 80, 2.8, 300, 'proj', { range: 450, speed: 360, pr: 11, homing: 2, fx: [st('burn', 0.3)] }),
      M('Chandelier Drop', 'Frost', 'phys', 90, 5, 420, 'lob', { range: 300, radius: 80, delay: 0.5 }),
      M('Dazzling Dust', 'Frost', 'status', 0, 10, 350, 'nova', { radius: 135, fx: [conf(0.6), sg('foe', 'atk', -1)] })
    ], { id: 'xnova', name: 'Grand Ballroom Inferno', type: 'Ember', wind: 800, tele: { shape: 'nova', radius: 240 },
      p: { pct: 0.34, radius: 240, type: 'Ember', status: 'burn', conf: 2, cost: ['spa', -2], st: 0.7 },
      desc: 'All crystals light at the same time. Beams of fire go out in all directions.', cost: 'Sp. Atk falls 2 stages.' });

  G.TRAINER_NAMES = ['Rook', 'Vesper', 'Tamsin', 'Okoro', 'Juno', 'Balt', 'Mirelle', 'Dax', 'Senna', 'Quill'];
})(typeof window !== 'undefined' ? window : globalThis);
