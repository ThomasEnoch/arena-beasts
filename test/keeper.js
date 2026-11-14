/* Headless test of the Keeper in a battle (js/keeper.js and js/engine.js): the crowd favour, the 5 commands and the 12 guild rules.
   Run: node test/keeper.js */
'use strict';
require('../js/data.js');
require('../js/keeper.js');
require('../js/engine.js');
var G = globalThis.G, KP = G.KEEPER, F = KP.FAV, R = KP.RULE, fails = 0, n = 0;
function eq(what, got, want) {
  n++;
  if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL ' + what + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); }
}
function near(what, got, want, tol) {
  n++;
  if (!(Math.abs(got - want) <= (tol || 0.02))) { fails++; console.log('FAIL ' + what + ': got ' + got + ', want ' + want); }
}
var TEAM = G.ROSTER.slice(0, 6), TEAM2 = G.ROSTER.slice(6, 12), DT = 1 / 60;
// A battle with no intro. g0, g1 = the guilds. c0 = the commands of side 0.
function battle(g0, g1, c0) {
  var b = new G.Battle(TEAM, TEAM2, { intro: 0, keepers: [{ guild: g0 || 'Ember', cmds: c0 || ['rally', 'brace'] }, { guild: g1 || 'Ember', cmds: ['focus', 'whistle'] }] });
  steps(b, 40);   // the 2 Beasts come in
  return b;
}
function steps(b, k) { while (k-- > 0) { b.step(DT); b.ev.length = 0; } }
function cmd(b, si, i) { b.sides[si].ctrl.cmd = i; b.step(DT); var e = b.ev.filter(function (x) { return x.k === 'cmd'; }); b.ev.length = 0; return e.length ? e[0].id : null; }
// Put the 2 Beasts far apart, so that no hit occurs.
function apart(b) { var a = b.active(0), c = b.active(1); a.x = 200; a.y = 200; c.x = 760; c.y = 380; }

// ---- the Keeper record ----
eq('clean: valid', KP.clean({ guild: 'Tide', cmds: ['quick', 'focus'] }), { guild: 'Tide', cmds: ['quick', 'focus'] });
eq('clean: nothing', KP.clean(null), KP.DEF);
eq('clean: bad guild', KP.clean({ guild: 'toString', cmds: ['quick', 'focus'] }).guild, 'Ember');
eq('clean: 2 equal commands', KP.clean({ guild: 'Tide', cmds: ['quick', 'quick'] }).cmds, KP.DEF.cmds);
eq('clean: bad command', KP.clean({ guild: 'Tide', cmds: ['hasOwnProperty', 'focus'] }).cmds, KP.DEF.cmds);
eq('clean: 3 commands', KP.clean({ guild: 'Tide', cmds: ['quick', 'focus', 'rally'] }).cmds, KP.DEF.cmds);
var seen = {}, i, k;
for (i = 0; i < 300; i++) { k = KP.random(); seen[k.guild] = 1; seen[k.cmds[0]] = 1; if (k.cmds[0] === k.cmds[1] || JSON.stringify(KP.clean(k)) !== JSON.stringify(k)) seen.bad = 1; }
eq('random: all guilds and commands, all valid', [Object.keys(seen).length, !!seen.bad], [17, false]);
eq('12 guilds, 5 commands', [KP.GUILD_IDS.length, KP.CMD_IDS.length], [12, 5]);
KP.GUILD_IDS.forEach(function (id) { if (!G.TCOL[id] || !KP.GUILDS[id]) eq('guild ' + id + ' is an element', false, true); });

// ---- crowd favour ----
var b = battle(), s = b.sides[0], m = b.active(0), foe = b.active(1), f0;
apart(b); s.favour = 0; steps(b, 60);
near('favour from time', s.favour, F.time, 0.01);
var plain = new G.Battle(TEAM, TEAM2, { intro: 0 });
steps(plain, 120);
eq('no Keeper: no favour', [plain.sides[0].keeper, plain.sides[0].favour], [null, 0]);
plain.sides[0].ctrl.cmd = 0; plain.step(DT);
eq('no Keeper: no command', plain.ev.filter(function (x) { return x.k === 'cmd'; }).length, 0);
s.favour = 99.9; steps(b, 120);
eq('favour stops at 100', s.favour, 100);
b = battle('Brawl', 'Ember'); apart(b); b.sides[0].favour = b.sides[1].favour = 0; steps(b, 60);
near('Pitwrights: favour is faster', b.sides[0].favour / b.sides[1].favour, R.brawlFav, 0.001);

// ---- commands ----
b = battle('Ember', 'Ember', ['rally', 'brace']); apart(b); s = b.sides[0]; m = b.active(0);
s.favour = 59; m.hp = m.maxHp * 0.5;
eq('rally: not enough favour', cmd(b, 0, 0), null);
s.favour = 100; m.hp = m.maxHp;
eq('rally: full HP and no status', cmd(b, 0, 0), null);
near('a command that does not work costs nothing', s.favour, 100, 0.01);
m.hp = m.maxHp * 0.5; m.status = 'burn'; m.statusT = 5; m.conf = 3;
eq('rally works', cmd(b, 0, 0), 'rally');
near('rally: cost', s.favour, 100 - KP.CMDS.rally.cost, 0.02);
near('rally: heal', m.hp / m.maxHp, 0.5 + KP.CMDS.rally.heal, 0.002);
eq('rally: status and confusion end', [m.status, m.conf], [null, 0]);
s.favour = 100;
eq('wait between 2 commands', cmd(b, 0, 1), null);
steps(b, Math.ceil(F.wait * 60) + 2);
eq('brace works', cmd(b, 0, 1), 'brace');
near('brace: time', m.brace, KP.CMDS.brace.time, 0.03);
steps(b, 200); s.favour = 100;
eq('brace: again while it is on', (m.brace = 1, cmd(b, 0, 1)), null);

b = battle('Ember', 'Ember', ['focus', 'whistle']); apart(b); s = b.sides[0]; m = b.active(0);
s.favour = 100; m.charge = 20;
eq('focus works', cmd(b, 0, 0), 'focus');
near('focus: charge', m.charge, 20 + KP.CMDS.focus.charge, 0.1);
steps(b, 200); s.favour = 100; m.charge = 100;
eq('focus: full charge', cmd(b, 0, 0), null);
eq('whistle: no wait to end', cmd(b, 0, 1), null);
m.cds[0] = 5; m.cds[2] = 9; m.dodgeCd = 1;
eq('whistle works', cmd(b, 0, 1), 'whistle');
eq('whistle: the waits end', [m.cds[0], m.cds[2], m.dodgeCd <= 0], [0, 0, true]);

b = battle('Ember', 'Ember', ['quick', 'rally']); apart(b); s = b.sides[0];
s.favour = 100; s.switchCd = 6;
eq('quick call works', cmd(b, 0, 0), 'quick');
eq('quick call: the switch wait ends', s.switchCd <= 0, true);
s.ctrl.sw = 2; s.ctrl.swT = 0.6; b.step(DT); b.ev.length = 0;
eq('quick call: the switch', [s.active, s.switchCd > KP.CMDS.quick.wait - 0.1 && s.switchCd <= KP.CMDS.quick.wait, s.quick], [2, true, 0]);
near('quick call: fast entry', b.active(0).stMax, KP.CMDS.quick.enter, 0.001);
steps(b, 300); s.favour = 100;
s.team.forEach(function (t, j) { if (j !== s.active) { t.fainted = true; t.hp = 0; } });
eq('quick call: no other Beast', cmd(b, 0, 0), null);

// a command needs a Beast in the arena
b = battle('Ember', 'Ember', ['brace', 'rally']); s = b.sides[0]; s.favour = 100;
b.switchTo(0, 1);
eq('no command while the Beast comes in', cmd(b, 0, 0), null);

// ---- guild rules: the numbers ----
var NO = 'Tide';   // a guild whose rule does not change a hit
// The damage of one hit of the same move. Random parts are removed with a fixed Math.random.
function hitDmg(g0, g1, prep) {
  var rnd = Math.random, bt, a, c, mv, d;
  Math.random = function () { return 0.5; };
  bt = battle(g0, g1); a = bt.active(0); c = bt.active(1);
  a.x = 400; a.y = 270; c.x = 460; c.y = 270;
  mv = a.d.moves.filter(function (x) { return x.power > 0 && (x.shape === 'cone' || x.shape === 'nova' || x.shape === 'line'); })[0];
  if (prep) prep(bt, a, c);
  bt.sides[0].ctrl.ax = c.x; bt.sides[0].ctrl.ay = c.y;
  bt.sides[0].ctrl.move = a.d.moves.indexOf(mv); bt.sides[0].ctrl.moveT = 1;
  var hp = c.hp, guard = 0;
  while (c.hp === hp && guard++ < 240) { if (prep) prep(bt, a, c, true); bt.step(DT); }
  d = hp - c.hp;
  Math.random = rnd;
  return d;
}
var base = hitDmg(NO, NO);
eq('test hit does damage', base > 5, true);
near('Smiths: less damage', hitDmg(NO, 'Iron') / base, R.ironTaken, 0.02);
near('Kilnwrights: more damage below 50% HP', hitDmg('Ember', NO, function (bt, a) { a.hp = a.maxHp * 0.4; }) / base, R.emberDmg, 0.02);
near('Kilnwrights: no change above 50% HP', hitDmg('Ember', NO) / base, 1, 0.02);
function lastOnly(si) { return function (bt) { var sd = bt.sides[si]; sd.team.forEach(function (t, j) { if (j !== sd.active) t.fainted = true; }); }; }
near('Lamplighters: the last Beast does more', hitDmg('Shade', NO, lastOnly(0)) / base, R.shadeDmg, 0.02);
near('Lamplighters: the last Beast takes less', hitDmg(NO, 'Shade', lastOnly(1)) / base, R.shadeTaken, 0.02);
near('Lamplighters: no change with 6 Beasts', hitDmg('Shade', 'Shade') / base, 1, 0.02);
near('Brace: half damage', hitDmg(NO, NO, function (bt, a, c) { c.brace = 3; }) / base, KP.CMDS.brace.taken, 0.02);
var late = function (bt, a, c, each) { if (each) { bt.sides[1].ctrl.guard = true; } };
near('guard: normal share', hitDmg(NO, NO, function (bt, a, c, each) { late(bt, a, c, each); if (each && c.guardT < 0.5) c.guardT = 0.5; }) / base, 0.35, 0.02);
near('Quarrymen: guard share', hitDmg(NO, 'Stone', function (bt, a, c, each) { late(bt, a, c, each); if (each && c.guardT < 0.5) c.guardT = 0.5; }) / base, R.stoneGuard, 0.02);

b = battle('Tide', 'Ember'); b.switchTo(0, 1); eq('Tidewardens: switch wait', b.sides[0].switchCd, R.tideSwitch);
b.switchTo(1, 1); eq('normal switch wait', b.sides[1].switchCd, 8);

b = battle('Gale', 'Ember'); apart(b);
b.sides[0].ctrl.dodge = true; b.sides[0].ctrl.dodgeT = 0.2; b.sides[1].ctrl.dodge = true; b.sides[1].ctrl.dodgeT = 0.2; b.step(DT);
near('Windcallers: dodge wait', b.active(0).dodgeCd, R.galeDodge, 0.03); near('normal dodge wait', b.active(1).dodgeCd, 1.7, 0.03);

b = battle('Mind', 'Ember'); apart(b);
b.sides[0].ctrl.move = 0; b.sides[0].ctrl.moveT = 1; b.step(DT);
near('Lensgrinders: move wait', b.active(0).cds[0] / b.active(0).d.moves[0].cd, R.mindCd, 0.01);

b = battle('Volt', 'Ember'); apart(b); b.active(0).charge = b.active(1).charge = 0; steps(b, 60);
near('Sparkwrights: charge', b.active(0).charge / b.active(1).charge, R.voltCharge, 0.001);

b = battle('Bloom', 'Ember'); apart(b); b.active(0).hp = b.active(0).maxHp * 0.5; b.active(1).hp = b.active(1).maxHp * 0.5; steps(b, 600);
near('Greenhands: HP in 10 seconds', b.active(0).hp / b.active(0).maxHp, 0.5 + R.bloomRegen * 10, 0.001);
near('no guild: no HP', b.active(1).hp / b.active(1).maxHp, 0.5, 0.0001);

console.log(fails ? fails + ' of ' + n + ' checks failed' : 'keeper: ' + n + ' checks passed');
process.exit(fails ? 1 : 0);
