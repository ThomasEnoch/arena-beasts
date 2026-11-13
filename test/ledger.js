/* Headless test of the Keeper's ledger (js/ledger.js): marks, keys, stories, the Daily Proving and the save code.
   Run: node test/ledger.js */
'use strict';
var mem = {};
globalThis.localStorage = { getItem: function (k) { return k in mem ? mem[k] : null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; } };
require('../js/data.js');
require('../js/ledger.js');
var G = globalThis.G, L = G.LEDGER, fails = 0, n = 0;
function eq(what, got, want) {
  n++;
  if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL ' + what + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); }
}

// start: 8 Beasts, 1 key
var i = L.info();
eq('start beasts', i.beasts, 8); eq('start keys', i.keys, 1); eq('total', i.total, 20);
eq('starter is open', L.has('kilnhound'), true); eq('other is locked', L.has('lanternangler'), false);
eq('locked count', L.locked().length, 12);

// unlock with the first key
eq('unlock', L.unlock('lanternangler'), true); eq('open now', L.has('lanternangler'), true);
eq('no key left', L.unlock('gyropangolin'), false); eq('unlock an open Beast', L.unlock('kilnhound'), false);

// marks: normal victory = 3 = 1 key. A defeat = 1 mark.
var r = L.battle({ win: true, diff: 'normal', auto: false, team: ['kilnhound', 'mercurystag'] });
eq('normal victory', r, { marks: 3, keys: 1, stories: ['kilnhound', 'mercurystag'] });
r = L.battle({ win: false, diff: 'hard', auto: false, team: ['kilnhound'] });
eq('defeat', r, { marks: 1, keys: 0, stories: [] });
r = L.battle({ win: true, diff: 'hard', auto: false, team: ['kilnhound'] });   // 1 + 4 = 5 marks: 1 key, 2 left
eq('hard victory', r, { marks: 4, keys: 1, stories: [] });
eq('progress', L.info().prog, 2);
r = L.battle({ win: true, diff: 'easy', auto: true, team: ['teslajelly'] });    // auto play: 1 mark, no story
eq('auto play', r, { marks: 1, keys: 1, stories: [] });
eq('story open', L.story('kilnhound'), true); eq('story locked', L.story('teslajelly'), false);
eq('record', [L.info().battles, L.info().wins], [4, 3]);

// Daily Proving: one try for each date
eq('no daily yet', L.daily('2026-11-13'), null);
eq('start', L.dailyStart('2026-11-13'), true); eq('second start', L.dailyStart('2026-11-13'), false);
eq('open try is a defeat', L.daily('2026-11-13').r, 'L');
r = L.dailyEnd('2026-11-13', { win: true, t: 222, left: 4, team: ['needlescorpion'] });
eq('daily victory', [r.marks, r.stories], [5, ['needlescorpion']]);
eq('daily entry', L.daily('2026-11-13'), { r: 'W', t: 222, left: 4, open: false });
eq('second end', L.dailyEnd('2026-11-13', { win: false, t: 1, left: 0, team: [] }), null);
eq('stamps', L.info().stamps, 1);
eq('date format', L.today(new Date(2026, 0, 5)), '2026-01-05');

// keys stop when no Beast is locked
L.locked().forEach(function (id) { while (!L.has(id)) { if (!L.unlock(id)) L.battle({ win: true, diff: 'hard', auto: false, team: [] }); } });
eq('all open', L.info().beasts, 20);
var k0 = L.info().keys;
L.battle({ win: true, diff: 'hard', auto: false, team: [] }); L.battle({ win: true, diff: 'hard', auto: false, team: [] });
eq('no key without a locked Beast', L.info().keys, k0);

// save code: export, import, bad codes
var code = L.exportCode(), before = JSON.stringify(L.info());
mem = {}; L.reload();
eq('new browser', L.info().beasts, 8);
eq('import', L.importCode(code), true); eq('same ledger', JSON.stringify(L.info()), before);
eq('bad code', L.importCode('hello'), false); eq('bad json', L.importCode('AB1.' + Buffer.from('{"v":2}').toString('base64')), false);
eq('unknown Beast is dropped', (L.importCode('AB1.' + Buffer.from(JSON.stringify({ v: 1, beasts: ['nobody', 'gyropangolin'], keys: 500, marks: -4 })).toString('base64')), [L.info().beasts, L.info().keys, L.info().marks]), [9, 99, 0]);
// storage survives a reload
L.reload(); eq('reload', L.info().beasts, 9);

console.log(fails ? fails + ' of ' + n + ' checks failed' : 'ledger: ' + n + ' checks passed');
process.exit(fails ? 1 : 0);
