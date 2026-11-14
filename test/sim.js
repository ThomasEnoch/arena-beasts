/* Headless test: AI against AI. It finds crashes, invalid numbers, and large balance problems.
   Run: node test/sim.js [battles] [difficulty] [mode]
   mode (optional):
     guilds  the balance of each guild rule: one side has the guild, the other side has no guild rule. The 2 sides use commands.
     cmds    the balance of each command: one side uses one command only, the other side uses no command. No guild rules.
   In these 2 modes the side under test changes each battle, because the side that moves first has a small advantage. */
'use strict';
require('../js/data.js');
require('../js/keeper.js');
require('../js/engine.js');
require('../js/ai.js');
var G = globalThis.G, KP = G.KEEPER;

var N = +process.argv[2] || 300, diff = process.argv[3] || 'hard', mode = process.argv[4] || '';
var bad = 0;

function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function check(b) {
  for (var s = 0; s < 2; s++) {
    var m = b.active(s), sd = b.sides[s];
    if (!isFinite(m.x) || !isFinite(m.y) || !isFinite(m.hp) || !isFinite(m.charge) || m.hp > m.maxHp + 0.001 || m.hp < 0) return 'bad mon state ' + m.id + ' ' + JSON.stringify({ x: m.x, y: m.y, hp: m.hp, st: m.state });
    if (m.x < G.ARENA.x0 - 1 || m.x > G.ARENA.x1 + 1 || m.y < G.ARENA.y0 - 1 || m.y > G.ARENA.y1 + 1) return 'out of arena ' + m.id + ' ' + m.state;
    if (!isFinite(sd.favour) || sd.favour < 0 || sd.favour > KP.FAV.max + 0.001) return 'bad favour ' + sd.favour;
  }
  for (var i = 0; i < b.proj.length; i++) if (!isFinite(b.proj[i].x) || !isFinite(b.proj[i].vx)) return 'bad projectile';
  return null;
}
// One battle. setup(b) can change the battle before the first step. each(b, e) gets each event.
// Returns the battle, or null after an error.
function play(g, keepers, setup, each) {
  var a = shuffle(G.ROSTER.slice()).slice(0, 6), c = shuffle(G.ROSTER.slice()).slice(0, 6);
  var b = new G.Battle(a, c, { intro: 0, time: 420, keepers: keepers });
  b.sides[0].isAI = b.sides[1].isAI = true;
  b.sides[0].ai = G.makeAI(diff); b.sides[1].ai = G.makeAI(diff);
  if (setup) setup(b);
  var steps = 0, err = null, e;
  while (!b.over && steps < 60 * 500) {
    b.step(1 / 60);
    if (each) for (e = 0; e < b.ev.length; e++) each(b, b.ev[e]);
    b.ev.length = 0;
    steps++;
    if (steps % 30 === 0) { err = check(b); if (err) break; }
  }
  if (err) { bad++; console.log('ERROR game', g, err); return null; }
  if (!b.over) { bad++; console.log('ERROR game', g, 'did not end'); return null; }
  return b;
}
function pct(w, n) { return (n ? w / n * 100 : 0).toFixed(1).padStart(6); }
function pad(s, n) { return (s + '                        ').slice(0, n); }

// ---- mode: the balance of each guild rule -------------------------------------
if (mode === 'guilds') {
  console.log('guild rule against no guild rule,', N, 'battles each, difficulty', diff, '(50% = no effect)');
  KP.GUILD_IDS.concat(['None']).forEach(function (gid) {
    var wins = 0, games = 0, g, b, me;
    for (g = 0; g < N; g++) {
      me = g & 1;
      b = play(g, [KP.random(), KP.random()], function (bt) { bt.sides[me].keeper.guild = gid; bt.sides[1 - me].keeper.guild = 'None'; });
      if (!b) continue;
      games++; if (b.winner === me) wins++; else if (b.winner === 2) wins += 0.5;
    }
    console.log(pad(gid === 'None' ? 'None (check)' : KP.GUILDS[gid].name, 22), pct(wins, games) + '%');
  });
  process.exit(bad ? 1 : 0);
}

// ---- mode: the balance of each command -----------------------------------------
if (mode === 'cmds') {
  console.log('one command against no command,', N, 'battles each, difficulty', diff, '(50% = no effect)');
  KP.CMD_IDS.forEach(function (cid) {
    var wins = 0, games = 0, uses = 0, g, b, me;
    for (g = 0; g < N; g++) {
      me = g & 1;
      b = play(g, [KP.random(), KP.random()], function (bt) {
        bt.sides[0].keeper.guild = bt.sides[1].keeper.guild = 'None';
        bt.sides[me].keeper.cmds = [cid, cid];
        bt.sides[1 - me].ai.d = Object.assign({}, bt.sides[1 - me].ai.d, { cmd: 0 });
      }, function (bt, e) { if (e.k === 'cmd') uses++; });
      if (!b) continue;
      games++; if (b.winner === me) wins++; else if (b.winner === 2) wins += 0.5;
    }
    console.log(pad(KP.CMDS[cid].name, 22), pct(wins, games) + '%', ' uses/battle', (uses / (games || 1)).toFixed(1));
  });
  process.exit(bad ? 1 : 0);
}

// ---- normal mode: each side has a random Keeper ---------------------------------
var stat = {}, sigUse = {}, cmdUse = {}, durations = [], timeouts = 0, favEnd = 0, sides = 0;
G.ROSTER.forEach(function (id) { stat[id] = { games: 0, wins: 0, dealt: 0, taken: 0, kos: 0, faints: 0 }; sigUse[id] = 0; });
KP.CMD_IDS.forEach(function (id) { cmdUse[id] = { n: 0, have: 0 }; });

for (var g = 0; g < N; g++) {
  var b = play(g, [KP.random(), KP.random()], null, function (bt, e) {
    if (e.k === 'cast' && e.sig) sigUse[bt.active(e.side).id]++;
    else if (e.k === 'cmd') cmdUse[e.id].n++;
  });
  if (!b) continue;
  if (b.timeLeft <= 0) timeouts++;
  durations.push(b.t);
  for (var s = 0; s < 2; s++) {
    b.sides[s].team.forEach(function (m) {
      var r = stat[m.id]; r.games++; if (b.winner === s) r.wins++; r.dealt += m.dealt; r.taken += m.taken; r.kos += m.kos; if (m.fainted) r.faints++;
    });
    b.sides[s].keeper.cmds.forEach(function (id) { cmdUse[id].have++; });
    favEnd += b.sides[s].favour; sides++;
  }
}
durations.sort(function (x, y) { return x - y; });
console.log('battles', N, 'difficulty', diff, 'errors', bad, 'timeouts', timeouts);
console.log('duration s: median', durations[durations.length >> 1].toFixed(0), 'min', durations[0].toFixed(0), 'max', durations[durations.length - 1].toFixed(0));
console.log('id            win%   dealt/game  KOs/game  faint%  sig/game');
G.ROSTER.forEach(function (id) {
  var r = stat[id];
  console.log((id + '             ').slice(0, 13), (r.wins / r.games * 100).toFixed(0).padStart(4), (r.dealt / r.games).toFixed(0).padStart(11), (r.kos / r.games).toFixed(2).padStart(9), (r.faints / r.games * 100).toFixed(0).padStart(7), (sigUse[id] / r.games).toFixed(2).padStart(9));
});
console.log('Keeper commands: uses for each battle of a Keeper that has the command. Favour left at the end:', (favEnd / (sides || 1)).toFixed(0));
KP.CMD_IDS.forEach(function (id) { console.log(pad(KP.CMDS[id].name, 13), (cmdUse[id].n / (cmdUse[id].have || 1)).toFixed(2).padStart(5)); });
process.exit(bad ? 1 : 0);
