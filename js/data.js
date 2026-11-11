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

  G.DEX = {};
  G.ROSTER = [];
  function add(c) {
    var s = c.sig, sm = { name: s.name, type: s.type, cat: 'spec', power: 0, cd: 0, wind: s.wind, rec: 500, isSig: true, fx: [], shape: 'self' };
    for (var k in s.tele) sm[k] = s.tele[k];
    c.sigMove = sm;
    G.DEX[c.id] = c;
    G.ROSTER.push(c.id);
  }

  // ---- roster -------------------------------------------------------------
  add({
    id: 'kilnox', name: 'Kilnox', types: ['Ember', 'Stone'], size: 'L', role: 'Bruiser', pref: 'melee', ai: 'aggressive', hover: false,
    st: { hp: 105, atk: 110, def: 95, spa: 70, spd: 70, spe: 55 },
    pal: ['#8d6b4c', '#f0693a', '#3b2f33'], focal: [19, 12],
    blurb: 'A stone boar with a furnace in its back. It starts slowly and hits hard.',
    moves: [
      M('Magma Tusk', 'Ember', 'phys', 80, 1.9, 260, 'cone', { range: 100, arc: 85, fx: [st('burn', 0.2)] }),
      M('Boulder Toss', 'Stone', 'phys', 85, 4.5, 450, 'lob', { range: 320, radius: 70, delay: 0.55 }),
      M('Kiln Charge', 'Ember', 'phys', 100, 5.5, 450, 'dash', { dist: 300, width: 46, kb: 220, fx: [recoil(0.2)] }),
      M('Stoke', 'Ember', 'status', 0, 12, 400, 'self', { fx: [sg('self', 'atk', 1), sg('self', 'spe', 1)] })
    ],
    sig: { id: 'caldera', name: 'Caldera', type: 'Ember', wind: 800, tele: { shape: 'nova', radius: 200 },
      desc: 'The arena floor erupts around Kilnox. The lava stays for 5 seconds and burns.', cost: 'Speed falls 2 stages.' }
  });

  add({
    id: 'lumanta', name: 'Lumanta', types: ['Tide', 'Mind'], size: 'M', role: 'Artillery', pref: 'long', ai: 'careful', hover: true,
    st: { hp: 80, atk: 55, def: 70, spa: 120, spd: 100, spe: 85 },
    pal: ['#3d7fd0', '#f065a8', '#d9f1ff'], focal: [42, 13],
    blurb: 'A gliding ray with a mind-lit lure. It fights from long range.',
    moves: [
      M('Pulse Jet', 'Tide', 'spec', 65, 1.6, 220, 'proj', { range: 480, speed: 520, pr: 10, fx: [conf(0.1)] }),
      M('Mind Lance', 'Mind', 'spec', 95, 5.5, 550, 'line', { range: 520, width: 26, fx: [sg('foe', 'spd', -1, 0.3)] }),
      M('Bubble Mines', 'Tide', 'status', 0, 9, 350, 'zone', { range: 360, radius: 62, zone: { kind: 'bubbles', dur: 9, pct: 0.025, slow: 0.6 } }),
      M('Calm Tide', 'Tide', 'status', 0, 14, 450, 'self', { fx: [heal(0.22), sg('self', 'spd', 1)] })
    ],
    sig: { id: 'riptide', name: 'Riptide', type: 'Tide', wind: 700, tele: { shape: 'line', range: 600, width: 60 },
      desc: 'A current pulls the opponent across the arena to Lumanta.', cost: 'Lumanta cannot move for 1.5 seconds.' }
  });

  add({
    id: 'brambletoad', name: 'Brambletoad', types: ['Bloom', 'Venom'], size: 'M', role: 'Trapper', pref: 'mid', ai: 'tricky', hover: false,
    st: { hp: 95, atk: 75, def: 90, spa: 95, spd: 90, spe: 60 },
    pal: ['#4fa644', '#a653c9', '#f4e36a'], focal: [21, 12],
    blurb: 'A toad with a crown of thorns. It fills the arena with poison.',
    moves: [
      M('Thorn Spit', 'Bloom', 'spec', 28, 1.5, 200, 'proj', { range: 400, speed: 460, pr: 7, count: 3, spread: 13 }),
      M('Sludge Lob', 'Venom', 'spec', 85, 4.5, 420, 'lob', { range: 340, radius: 75, delay: 0.6, fx: [st('poison', 0.4)] }),
      M('Toxic Bog', 'Venom', 'status', 0, 10, 380, 'zone', { range: 320, radius: 85, zone: { kind: 'toxic', dur: 10, pct: 0.015, slow: 0.7, status: 'poison', statusCh: 0.5 } }),
      M('Leech Tongue', 'Bloom', 'phys', 70, 5, 300, 'line', { range: 230, width: 22, kb: -160, fx: [drain(0.5)] })
    ],
    sig: { id: 'overgrowth', name: 'Overgrowth', type: 'Bloom', wind: 700, tele: { shape: 'lob', range: 600, radius: 170 },
      desc: 'Vines cover a large area for 6 seconds. They slow and drain the opponent.', cost: 'Defence falls 1 stage. Brief root.' }
  });

  add({
    id: 'flickermoth', name: 'Flickermoth', types: ['Volt', 'Gale'], size: 'S', role: 'Skirmisher', pref: 'mid', ai: 'tricky', hover: true,
    st: { hp: 65, atk: 70, def: 60, spa: 105, spd: 75, spe: 125 },
    pal: ['#f2c81e', '#b9c6f5', '#5a4a3a'], focal: [31, 9],
    blurb: 'A fast storm moth. It changes direction immediately.',
    moves: [
      M('Spark Dart', 'Volt', 'spec', 55, 1.2, 160, 'proj', { range: 420, speed: 620, pr: 8, fx: [st('para', 0.12)] }),
      M('Gust Cutter', 'Gale', 'spec', 80, 3.8, 320, 'cone', { range: 200, arc: 70, kb: 260 }),
      M('Static Dust', 'Volt', 'status', 0, 9, 300, 'nova', { radius: 130, fx: [st('para', 0.7), sg('foe', 'spe', -1)] }),
      M('Arc Loop', 'Volt', 'spec', 100, 7, 520, 'ring', { radius: 240, speed: 380 })
    ],
    sig: { id: 'mirage', name: 'Storm Mirage', type: 'Volt', wind: 600, tele: { shape: 'self' },
      desc: 'Flickermoth splits into 2 copies that hunt the opponent. The real moth teleports.', cost: 'Recoil: 10% of maximum HP.' }
  });

  add({
    id: 'frostusk', name: 'Frostusk', types: ['Frost', 'Brawl'], size: 'L', role: 'Bruiser', pref: 'melee', ai: 'aggressive', hover: false,
    st: { hp: 110, atk: 115, def: 85, spa: 55, spd: 75, spe: 65 },
    pal: ['#8fd3e8', '#d2553f', '#f4fbff'], focal: [36, 30],
    blurb: 'A heavy ice brawler with long tusks. It stops slowly.',
    moves: [
      M('Tusk Jab', 'Brawl', 'phys', 75, 1.7, 230, 'cone', { range: 95, arc: 75 }),
      M('Shard Fan', 'Frost', 'phys', 28, 4, 300, 'proj', { range: 300, speed: 480, pr: 7, count: 5, spread: 12, fx: [st('chill', 0.1)] }),
      M('Belly Slide', 'Frost', 'phys', 95, 5, 380, 'dash', { dist: 320, width: 48, kb: 220 }),
      M('War Bellow', 'Brawl', 'status', 0, 11, 350, 'nova', { radius: 170, fx: [sg('foe', 'atk', -1), sg('self', 'def', 1)] })
    ],
    sig: { id: 'glacier', name: 'Glacier Breaker', type: 'Frost', wind: 600, tele: { shape: 'lob', range: 380, radius: 130 },
      desc: 'Frostusk jumps high and breaks the floor where it lands. The floor stays frozen.', cost: 'Recovery time: 1.2 seconds.' }
  });

  add({
    id: 'ferrock', name: 'Ferrock', types: ['Stone', 'Iron'], size: 'L', role: 'Tank', pref: 'melee', ai: 'defensive', hover: false,
    st: { hp: 120, atk: 95, def: 130, spa: 50, spd: 85, spe: 40 },
    pal: ['#8a7a66', '#aab7c4', '#4a4f5c'], focal: [40, 18],
    blurb: 'A plated boulder beast with an anvil head. It is very hard to move.',
    moves: [
      M('Anvil Slam', 'Iron', 'phys', 85, 2.4, 360, 'nova', { radius: 105 }),
      M('Rock Volley', 'Stone', 'phys', 32, 3.5, 320, 'proj', { range: 420, speed: 430, pr: 9, count: 3, spread: 10 }),
      M('Caltrops', 'Iron', 'status', 0, 10, 350, 'zone', { range: 300, radius: 80, zone: { kind: 'spikes', dur: 14, pct: 0.03 } }),
      M('Temper', 'Iron', 'status', 0, 13, 450, 'self', { fx: [sg('self', 'def', 2)] })
    ],
    sig: { id: 'bulwark', name: 'Bulwark', type: 'Stone', wind: 600, tele: { shape: 'self' },
      desc: 'Ferrock becomes a fortress for 5 seconds. It reflects shots, then releases a shock burst.', cost: 'Ferrock cannot move during Bulwark.' }
  });

  add({
    id: 'songale', name: 'Songale', types: ['Gale', 'Mind'], size: 'M', role: 'Support', pref: 'long', ai: 'careful', hover: true,
    st: { hp: 90, atk: 50, def: 75, spa: 100, spd: 105, spe: 95 },
    pal: ['#aab8f2', '#f065a8', '#f6d55a'], focal: [9, 31],
    blurb: 'A crane with wind-chime feathers. It heals and controls space.',
    moves: [
      M('Feather Dart', 'Gale', 'spec', 60, 1.4, 200, 'proj', { range: 460, speed: 560, pr: 8 }),
      M('Lullaby Ring', 'Mind', 'status', 0, 12, 600, 'ring', { radius: 200, speed: 300, fx: [st('sleep', 1)] }),
      M('Mind Gust', 'Mind', 'spec', 85, 4.5, 380, 'cone', { range: 260, arc: 60, kb: 320, fx: [sg('foe', 'spa', -1, 0.3)] }),
      M('Roost Song', 'Gale', 'status', 0, 15, 500, 'self', { fx: [heal(0.28), cure] })
    ],
    sig: { id: 'cyclone', name: 'Eye of the Storm', type: 'Gale', wind: 600, tele: { shape: 'nova', radius: 150 },
      desc: 'A cyclone surrounds Songale for 5 seconds. It heals, pushes the opponent, and stops shots.', cost: 'Sp. Atk falls 2 stages at the end.' }
  });

  add({
    id: 'dusksting', name: 'Dusksting', types: ['Venom', 'Shade'], size: 'M', role: 'Trapper', pref: 'melee', ai: 'tricky', hover: false,
    st: { hp: 75, atk: 110, def: 80, spa: 70, spd: 70, spe: 100 },
    pal: ['#6a4a9c', '#9be05a', '#2a2238'], focal: [31, 9],
    blurb: 'A scorpion with a lantern stinger. It hunts in the dark.',
    moves: [
      M('Stinger Jab', 'Venom', 'phys', 70, 1.7, 220, 'line', { range: 125, width: 26, fx: [st('poison', 0.3)] }),
      M('Shadow Lunge', 'Shade', 'phys', 90, 5, 300, 'dash', { dist: 260, width: 38 }),
      M('Venom Trail', 'Venom', 'status', 0, 8, 250, 'zone', { range: 0, radius: 72, zone: { kind: 'toxic', dur: 8, pct: 0.02, status: 'poison', statusCh: 0.6 } }),
      M('Dread Glare', 'Shade', 'status', 0, 10, 350, 'cone', { range: 260, arc: 60, fx: [sg('foe', 'def', -1), conf(0.6)] })
    ],
    sig: { id: 'nightfall', name: 'Nightfall', type: 'Shade', wind: 600, tele: { shape: 'self' },
      desc: 'The arena becomes dark for 6 seconds. Dusksting is almost invisible and its next hit is much stronger.', cost: 'Defence falls 2 stages.' }
  });

  add({
    id: 'halovex', name: 'Halovex', types: ['Mind', 'Iron'], size: 'M', role: 'Artillery', pref: 'long', ai: 'defensive', hover: true,
    st: { hp: 75, atk: 60, def: 100, spa: 125, spd: 95, spe: 65 },
    pal: ['#aab7c4', '#f065a8', '#5d6b7c'], focal: [24, 24],
    blurb: 'A crystal core with 3 steel shards in orbit. It controls shots in the air.',
    moves: [
      M('Shard Orbit', 'Iron', 'spec', 24, 2.5, 260, 'proj', { range: 460, speed: 400, pr: 8, count: 3, spread: 16, homing: 1.6 }),
      M('Focus Beam', 'Mind', 'spec', 110, 7.5, 700, 'line', { range: 560, width: 30 }),
      M('Gravity Well', 'Mind', 'status', 0, 11, 380, 'zone', { range: 380, radius: 90, zone: { kind: 'gravity', dur: 6, pct: 0.012, slow: 0.45 } }),
      M('Polarize', 'Iron', 'status', 0, 13, 400, 'self', { fx: [sg('self', 'spa', 1), sg('self', 'spe', 1)] })
    ],
    sig: { id: 'zerofield', name: 'Zero Field', type: 'Mind', wind: 700, tele: { shape: 'nova', radius: 220 },
      desc: 'All opponent shots stop in the air and go back. A gravity pulse slows the opponent.', cost: 'All move cooldowns increase by 3 seconds.' }
  });

  add({
    id: 'rimewraith', name: 'Rimewraith', types: ['Shade', 'Frost'], size: 'S', role: 'Skirmisher', pref: 'mid', ai: 'tricky', hover: true,
    st: { hp: 70, atk: 95, def: 65, spa: 100, spd: 80, spe: 110 },
    pal: ['#4a4a8c', '#bfeeff', '#1e1e3a'], focal: [29, 19],
    blurb: 'A cloaked spirit with an ice mask. It goes through the floor.',
    moves: [
      M('Chill Touch', 'Frost', 'phys', 65, 1.5, 200, 'cone', { range: 90, arc: 85, fx: [st('chill', 0.2)] }),
      M('Wisp Bolt', 'Shade', 'spec', 75, 2.8, 280, 'proj', { range: 450, speed: 380, pr: 10, homing: 2.2 }),
      M('Hoarfrost', 'Frost', 'status', 0, 9, 320, 'zone', { range: 340, radius: 80, zone: { kind: 'ice', dur: 9, pct: 0.015, slow: 0.6, status: 'chill', statusCh: 0.25 } }),
      M('Soul Sip', 'Shade', 'spec', 80, 6, 380, 'line', { range: 280, width: 26, fx: [drain(0.5)] })
    ],
    sig: { id: 'phase', name: 'Phase Walk', type: 'Shade', wind: 500, tele: { shape: 'self' },
      desc: 'Rimewraith sinks into the floor and comes up behind the opponent. Its strike steals stat increases.', cost: 'Recoil: 8% of maximum HP. Sp. Def falls 1 stage.' }
  });

  add({
    id: 'jolthare', name: 'Jolthare', types: ['Brawl', 'Volt'], size: 'M', role: 'Skirmisher', pref: 'melee', ai: 'aggressive', hover: false,
    st: { hp: 80, atk: 115, def: 70, spa: 65, spd: 70, spe: 120 },
    pal: ['#e0b860', '#d2553f', '#f2e24a'], focal: [20, 7],
    blurb: 'A kick-boxing hare with lightning ears. It never stops moving.',
    moves: [
      M('Quick Kick', 'Brawl', 'phys', 60, 1.2, 150, 'cone', { range: 88, arc: 80 }),
      M('Thunder Heel', 'Volt', 'phys', 90, 5, 380, 'lob', { range: 240, radius: 70, delay: 0.45, fx: [st('para', 0.25)] }),
      M('Bolt Dash', 'Volt', 'phys', 80, 4.2, 240, 'dash', { dist: 280, width: 36 }),
      M('Rev Up', 'Brawl', 'status', 0, 12, 350, 'self', { fx: [sg('self', 'spe', 1), sg('self', 'atk', 1)] })
    ],
    sig: { id: 'relay', name: 'Lightning Relay', type: 'Volt', wind: 600, tele: { shape: 'line', range: 420, width: 44 },
      desc: 'Jolthare makes 5 lightning dashes through the opponent.', cost: 'Jolthare is slow for 2.5 seconds after the last dash.' }
  });

  add({
    id: 'lilypadon', name: 'Lilypadon', types: ['Bloom', 'Tide'], size: 'L', role: 'Tank', pref: 'mid', ai: 'defensive', hover: false,
    st: { hp: 125, atk: 80, def: 100, spa: 85, spd: 100, spe: 45 },
    pal: ['#3f9fa8', '#62c257', '#f58fc0'], focal: [19, 13],
    blurb: 'A river giant with a lily pad on its back. It lasts a long time.',
    moves: [
      M('Water Bulb', 'Tide', 'spec', 70, 2, 280, 'proj', { range: 420, speed: 420, pr: 13 }),
      M('Petal Storm', 'Bloom', 'spec', 90, 5.5, 450, 'nova', { radius: 140 }),
      M('Spore Mist', 'Bloom', 'status', 0, 10, 350, 'nova', { radius: 135, fx: [sg('foe', 'spe', -1), sg('foe', 'atk', -1)] }),
      M('Photosynth', 'Bloom', 'status', 0, 15, 500, 'self', { fx: [heal(0.25), sg('self', 'def', 1)] })
    ],
    sig: { id: 'monsoon', name: 'Monsoon Bloom', type: 'Tide', wind: 800, tele: { shape: 'self' },
      desc: 'Rain falls for 8 seconds. It heals Lilypadon, removes opponent hazards, and makes Tide moves stronger.', cost: 'No damage. Brief root.' }
  });

  G.TRAINER_NAMES = ['Rook', 'Vesper', 'Tamsin', 'Okoro', 'Juno', 'Balt', 'Mirelle', 'Dax', 'Senna', 'Quill'];
})(typeof window !== 'undefined' ? window : globalThis);
