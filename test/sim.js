/* Headless test: AI against AI. It finds crashes, invalid numbers, and large balance problems.
   Run: node test/sim.js [battles] [difficulty] */
'use strict';
require('../js/data.js');
require('../js/engine.js');
require('../js/ai.js');
var G = globalThis.G;

var N = +process.argv[2] || 300, diff = process.argv[3] || 'hard';
var stat = {}, sigUse = {}, durations = [], timeouts = 0, bad = 0;
G.ROSTER.forEach(function (id) { stat[id] = { games: 0, wins: 0, dealt: 0, taken: 0, kos: 0, faints: 0 }; sigUse[id] = 0; });

function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function check(b) {
  for (var s = 0; s < 2; s++) {
    var m = b.active(s);
    if (!isFinite(m.x) || !isFinite(m.y) || !isFinite(m.hp) || !isFinite(m.charge) || m.hp > m.maxHp + 0.001 || m.hp < 0) return 'bad mon state ' + m.id + ' ' + JSON.stringify({ x: m.x, y: m.y, hp: m.hp, st: m.state });
    if (m.x < G.ARENA.x0 - 1 || m.x > G.ARENA.x1 + 1 || m.y < G.ARENA.y0 - 1 || m.y > G.ARENA.y1 + 1) return 'out of arena ' + m.id + ' ' + m.state;
  }
  for (var i = 0; i < b.proj.length; i++) if (!isFinite(b.proj[i].x) || !isFinite(b.proj[i].vx)) return 'bad projectile';
  return null;
}

for (var g = 0; g < N; g++) {
  var a = shuffle(G.ROSTER.slice()).slice(0, 6), c = shuffle(G.ROSTER.slice()).slice(0, 6);
  var b = new G.Battle(a, c, { intro: 0, time: 420 });
  b.sides[0].isAI = b.sides[1].isAI = true;
  b.sides[0].ai = G.makeAI(diff); b.sides[1].ai = G.makeAI(diff);
  var steps = 0, err = null;
  while (!b.over && steps < 60 * 500) {
    b.step(1 / 60);
    for (var e = 0; e < b.ev.length; e++) if (b.ev[e].k === 'cast' && b.ev[e].sig) sigUse[b.active(b.ev[e].side).id]++;
    b.ev.length = 0;
    steps++;
    if (steps % 30 === 0) { err = check(b); if (err) break; }
  }
  if (err) { bad++; console.log('ERROR game', g, err); continue; }
  if (!b.over) { bad++; console.log('ERROR game', g, 'did not end'); continue; }
  if (b.timeLeft <= 0) timeouts++;
  durations.push(b.t);
  for (var s = 0; s < 2; s++) b.sides[s].team.forEach(function (m) {
    var r = stat[m.id]; r.games++; if (b.winner === s) r.wins++; r.dealt += m.dealt; r.taken += m.taken; r.kos += m.kos; if (m.fainted) r.faints++;
  });
}
durations.sort(function (x, y) { return x - y; });
console.log('battles', N, 'difficulty', diff, 'errors', bad, 'timeouts', timeouts);
console.log('duration s: median', durations[durations.length >> 1].toFixed(0), 'min', durations[0].toFixed(0), 'max', durations[durations.length - 1].toFixed(0));
console.log('id            win%   dealt/game  KOs/game  faint%  sig/game');
G.ROSTER.forEach(function (id) {
  var r = stat[id];
  console.log((id + '             ').slice(0, 13), (r.wins / r.games * 100).toFixed(0).padStart(4), (r.dealt / r.games).toFixed(0).padStart(11), (r.kos / r.games).toFixed(2).padStart(9), (r.faints / r.games * 100).toFixed(0).padStart(7), (sigUse[id] / r.games).toFixed(2).padStart(9));
});
process.exit(bad ? 1 : 0);
