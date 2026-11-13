/* Arena Beasts - the Keeper's ledger: the progress of the player that stays. G.LEDGER.
   It stays in localStorage under the key "ab_ledger". "Reset all settings" does not touch it.

   The rules:
   - The player starts with 8 Beasts and 1 key. A key opens one Beast that the player selects.
   - Each solo battle gives marks. 3 marks make 1 key. A defeat gives marks too.
   - The story of a Beast opens after the first victory with that Beast in the team.
   - The Daily Proving: one battle for each date, the same for all players. One try. Each try is one stamp.
     A day without play costs nothing: the stamps are a total, not a row that can break.
   - An unlock gives a new option, not more power. Online play has all Beasts open.
   This file has no page code, so that test/ledger.js can run it without a browser. */
(function () {
  'use strict';
  var G = globalThis.G = globalThis.G || {};
  var STORE = 'ab_ledger';
  var START = ['kilnhound', 'mercurystag', 'resonancewhale', 'solarisscarab', 'teslajelly', 'basaltgorilla', 'coralgolem', 'chandeliermoth'];
  var RULES = { win: { easy: 2, normal: 3, hard: 4 }, loss: 1, dailyWin: 5, dailyLoss: 3, key: 3, startKeys: 1 };
  var S = null, listeners = [];

  function fresh() { return { v: 1, beasts: START.slice(), stories: [], marks: 0, prog: 0, keys: RULES.startKeys, battles: 0, wins: 0, daily: {} }; }
  function int(v, max) { return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0; }
  function ids(list) {
    var out = [], seen = {};
    if (Array.isArray(list)) list.forEach(function (id) { if (typeof id === 'string' && G.DEX.hasOwnProperty(id) && !seen[id]) { seen[id] = 1; out.push(id); } });
    return out;
  }
  // Make a valid state from data that came from storage or from a save code. Returns null if the data is not a ledger.
  function clean(o) {
    var s = fresh(), k, d;
    if (!o || typeof o !== 'object' || o.v !== 1) return null;
    ids(o.beasts).forEach(function (id) { if (s.beasts.indexOf(id) < 0) s.beasts.push(id); });
    s.stories = ids(o.stories);
    s.marks = int(o.marks, 1e6); s.prog = int(o.prog, RULES.key - 1); s.keys = int(o.keys, 99);
    s.battles = int(o.battles, 1e6); s.wins = int(o.wins, s.battles);
    if (o.daily && typeof o.daily === 'object') for (k in o.daily) {
      d = o.daily[k];
      if (/^\d{4}-\d\d-\d\d$/.test(k) && d && typeof d === 'object') s.daily[k] = { r: d.r === 'W' ? 'W' : 'L', t: int(d.t, 3600), left: int(d.left, 6), open: !!d.open };
    }
    return s;
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* storage is optional */ } }
  function changed() { save(); listeners.forEach(function (f) { f(); }); }
  function load() {
    var o = null;
    try { o = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { o = null; }
    S = clean(o) || fresh();
  }
  function locked() { return G.ROSTER.filter(function (id) { return S.beasts.indexOf(id) < 0; }); }
  // Add marks. Each 3 marks give 1 key, while a Beast is still locked. Returns the number of new keys.
  function addMarks(n) {
    var keys = 0;
    S.marks += n; S.prog += n;
    while (S.prog >= RULES.key) { S.prog -= RULES.key; if (locked().length > S.keys + keys) keys++; }
    S.keys += keys;
    return keys;
  }
  function openStories(team) {
    var out = [];
    ids(team).forEach(function (id) { if (S.stories.indexOf(id) < 0) { S.stories.push(id); out.push(id); } });
    return out;
  }
  // The date of the player's own clock, as "2026-11-13".
  function today(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  G.LEDGER = {
    RULES: RULES, START: START, today: today,
    has: function (id) { return S.beasts.indexOf(id) >= 0; },
    story: function (id) { return S.stories.indexOf(id) >= 0; },
    locked: locked,
    // numbers for the screens
    info: function () {
      return { beasts: S.beasts.length, total: G.ROSTER.length, stories: S.stories.length, marks: S.marks, prog: S.prog, need: RULES.key,
        keys: S.keys, battles: S.battles, wins: S.wins, stamps: Object.keys(S.daily).length };
    },
    // Open one Beast with one key. Returns true if the Beast is open now.
    unlock: function (id) {
      if (S.keys < 1 || !G.DEX.hasOwnProperty(id) || S.beasts.indexOf(id) >= 0) return false;
      S.keys--; S.beasts.push(id);
      changed();
      return true;
    },
    // The end of a solo battle. o = { win, diff, auto, team }. auto = the AI played for the player.
    // Returns { marks, keys, stories } = what this battle gave.
    battle: function (o) {
      var marks = o.win && !o.auto ? (RULES.win[o.diff] || RULES.win.normal) : RULES.loss, out;
      S.battles++; if (o.win) S.wins++;
      out = { marks: marks, keys: addMarks(marks), stories: o.win && !o.auto ? openStories(o.team) : [] };
      changed();
      return out;
    },
    // ---- Daily Proving ----
    daily: function (date) { return S.daily[date || today()] || null; },
    days: function () { return S.daily; },
    // The battle starts: the try is used. If the player leaves, this entry stays as a defeat.
    dailyStart: function (date) {
      if (S.daily[date]) return false;
      S.daily[date] = { r: 'L', t: 0, left: 0, open: true };
      changed();
      return true;
    },
    // The battle ends. o = { win, t (seconds), left (own Beasts that stand), team }. Returns { marks, keys, stories }.
    dailyEnd: function (date, o) {
      var d = S.daily[date], marks, out;
      if (!d || !d.open) return null;
      S.daily[date] = { r: o.win ? 'W' : 'L', t: int(o.t, 3600), left: int(o.left, 6), open: false };
      marks = o.win ? RULES.dailyWin : RULES.dailyLoss;
      S.battles++; if (o.win) S.wins++;
      out = { marks: marks, keys: addMarks(marks), stories: o.win ? openStories(o.team) : [] };
      changed();
      return out;
    },
    // ---- save code: the ledger as text, to move it to another browser or to keep a copy ----
    exportCode: function () { return 'AB1.' + btoa(JSON.stringify(S)); },
    // Returns true if the code is valid. The ledger of this browser is then replaced.
    importCode: function (code) {
      var s = null;
      try { s = clean(JSON.parse(atob(String(code).trim().replace(/^AB1\./, '')))); } catch (e) { s = null; }
      if (!s || String(code).trim().indexOf('AB1.') !== 0) return false;
      S = s;
      changed();
      return true;
    },
    onChange: function (f) { listeners.push(f); },
    reload: load
  };
  load();
})();
