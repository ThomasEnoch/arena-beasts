/* Arena Beasts - the Keeper in a battle: the rules and the texts. G.KEEPER.
   A Keeper has 3 parts:
   - Crowd favour: a meter from 0 to 100 for each side. Good play fills it (FAV).
   - 2 commands, selected from 5 (CMDS). A command costs favour. It works on the Beast in the arena.
   - 1 guild, selected from 12 (GUILDS). A guild gives one small rule for the full team. The numbers are in RULE.
   A Keeper record is { guild: 'Ember', cmds: ['rally', 'brace'] }. The id of a guild is its element.
   js/engine.js applies the rules. This file has no page code, so that the tests can run it without a browser.
   To change the balance: change the numbers here, then run "node test/keeper.js" and "node test/sim.js 300 hard guilds". */
(function () {
  'use strict';
  var G = globalThis.G = globalThis.G || {};

  // How the crowd favour fills.
  var FAV = {
    max: 100,
    time: 0.3,        // each second of the battle
    dmg: 18,          // for damage equal to the full HP of the opponent
    superHit: 2,      // a hit that is super effective
    ko: 6,            // the opponent faints
    fall: 8,          // an own Beast faints: the crowd helps the Keeper who is behind
    perfect: 8,       // a perfect guard
    dodge: 5,         // a dodge through an attack
    wait: 3           // seconds between 2 commands of one Keeper
  };

  // The numbers of the guild rules.
  var RULE = {
    emberHp: 0.5, emberDmg: 1.06,     // Kilnwrights: more damage while the HP of the Beast is below 50%
    tideSwitch: 5.5,                  // Tidewardens: the switch wait in seconds (normal: 8)
    bloomRegen: 0.001,                // Greenhands: share of the maximum HP that the Beast in the arena gets back each second
    voltCharge: 1.25,                 // Sparkwrights: the signature power charges faster
    frostPerfect: 0.24,               // Coldglaziers: the time for a perfect guard in seconds (normal: 0.18)
    stoneGuard: 0.22,                 // Quarrymen: the share of the damage that a guard lets through (normal: 0.35)
    galeDodge: 1.1,                   // Windcallers: the dodge wait in seconds (normal: 1.7)
    venomStatus: 0.5,                 // Apothecaries: a status condition on an own Beast stays this share of the time
    mindCd: 0.94,                     // Lensgrinders: the wait of each move
    shadeDmg: 1.15, shadeTaken: 0.85, // Lamplighters: the last Beast of the team
    ironTaken: 0.96,                  // Smiths of Anvil Hall: damage from hits
    brawlFav: 1.25                    // Pitwrights: the crowd favour fills faster
  };

  var CMD_IDS = ['rally', 'brace', 'focus', 'whistle', 'quick'];
  var CMDS = {
    rally: { name: 'Rally', cost: 70, heal: 0.1, text: 'Your Beast gets back 10% of its HP. Its status condition and its confusion end.' },
    brace: { name: 'Brace', cost: 45, time: 3, taken: 0.5, text: 'For 3 seconds, hits do half damage to your Beast.' },
    focus: { name: 'Focus', cost: 40, charge: 40, text: 'The signature power of your Beast gets 40% charge.' },
    whistle: { name: 'Whistle', cost: 35, text: 'The waits of the 4 moves and of the dodge end now.' },
    quick: { name: 'Quick call', cost: 30, time: 6, enter: 0.25, wait: 4, text: 'The switch wait ends now. Your next switch in 6 seconds is fast, and the wait after it is 4 seconds.' }
  };

  var GUILD_IDS = ['Ember', 'Tide', 'Bloom', 'Volt', 'Frost', 'Stone', 'Gale', 'Venom', 'Mind', 'Shade', 'Iron', 'Brawl'];
  var GUILDS = {
    Ember: { name: 'Kilnwrights', rule: 'Kiln heat', text: 'Your Beasts do 6% more damage while their HP is below 50%.' },
    Tide: { name: 'Tidewardens', rule: 'Turn of the tide', text: 'Your switch wait is 5.5 seconds. The normal wait is 8 seconds.' },
    Bloom: { name: 'Greenhands', rule: 'Green hand', text: 'Your Beast in the arena gets back 1% of its HP each 10 seconds.' },
    Volt: { name: 'Sparkwrights', rule: 'Live wire', text: 'The signature powers of your Beasts charge 25% faster.' },
    Frost: { name: 'Coldglaziers', rule: 'Clear ice', text: 'You have more time for a perfect guard: 0.24 seconds. The normal time is 0.18 seconds.' },
    Stone: { name: 'Quarrymen', rule: 'Bedrock', text: 'A guard of your Beasts lets through 22% of the damage. The normal share is 35%.' },
    Gale: { name: 'Windcallers', rule: 'Tailwind', text: 'Your dodge wait is 1.1 seconds. The normal wait is 1.7 seconds.' },
    Venom: { name: 'Apothecaries', rule: 'Antidote', text: 'Burn, poison, paralysis and chill stay half the time on your Beasts.' },
    Mind: { name: 'Lensgrinders', rule: 'Fine gears', text: 'The moves of your Beasts are ready 6% sooner.' },
    Shade: { name: 'Lamplighters', rule: 'Last light', text: 'Your last Beast does 15% more damage and takes 15% less damage from hits.' },
    Iron: { name: 'Smiths of Anvil Hall', rule: 'Tempered', text: 'Your Beasts take 4% less damage from hits.' },
    Brawl: { name: 'Pitwrights', rule: 'Pit favourite', text: 'Your crowd favour fills 25% faster.' }
  };

  var DEF = { guild: 'Ember', cmds: ['rally', 'brace'] };

  // Make a valid Keeper record from data of the storage or of the other player. Data that is not valid gives the default part.
  function clean(o) {
    var k = { guild: DEF.guild, cmds: DEF.cmds.slice() }, a, b;
    if (!o || typeof o !== 'object') return k;
    if (typeof o.guild === 'string' && GUILDS.hasOwnProperty(o.guild)) k.guild = o.guild;
    if (Array.isArray(o.cmds) && o.cmds.length === 2) {
      a = o.cmds[0]; b = o.cmds[1];
      if (typeof a === 'string' && typeof b === 'string' && CMDS.hasOwnProperty(a) && CMDS.hasOwnProperty(b) && a !== b) k.cmds = [a, b];
    }
    return k;
  }
  // A Keeper for an AI opponent. r = a function that gives a number from 0 to 1 (default: Math.random).
  function random(r) {
    var ids = CMD_IDS.slice(), a, b;
    r = r || Math.random;
    a = ids.splice(Math.floor(r() * ids.length), 1)[0];
    b = ids[Math.floor(r() * ids.length)];
    return { guild: GUILD_IDS[Math.floor(r() * GUILD_IDS.length)], cmds: [a, b] };
  }

  G.KEEPER = { FAV: FAV, RULE: RULE, CMDS: CMDS, CMD_IDS: CMD_IDS, GUILDS: GUILDS, GUILD_IDS: GUILD_IDS, DEF: DEF, clean: clean, random: random };
})();
