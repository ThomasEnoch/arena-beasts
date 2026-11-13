/* Arena Beasts - the settings of the player. One store for all settings: G.SET.
   The values stay in localStorage under one key ("ab_set"). Each part of the game reads its setting from here.
   To add a setting: add its default value to DEF and its check to CHECK. Then use G.SET.get and G.SET.set. */
(function () {
  'use strict';
  var G = window.G = window.G || {};
  var STORE = 'ab_set';
  var DEF = { name: '', diff: 'normal', vol: 70, mute: false, shake: true, gfx: 'auto', keys: null };
  // Each check returns a valid value, or undefined for a value that is not valid.
  var CHECK = {
    name: function (v) { return typeof v === 'string' ? v.replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) : undefined; },
    diff: function (v) { return v === 'easy' || v === 'normal' || v === 'hard' ? v : undefined; },
    vol: function (v) { return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : undefined; },
    mute: function (v) { return typeof v === 'boolean' ? v : undefined; },
    shake: function (v) { return typeof v === 'boolean' ? v : undefined; },
    gfx: function (v) { return v === 'auto' || v === 'high' || v === 'medium' || v === 'low' ? v : undefined; },
    keys: function (v) { return v && typeof v === 'object' ? v : v === null ? null : undefined; }
  };
  var val = {}, listeners = [];

  function put(k, v) {
    if (!CHECK[k]) return false;
    v = CHECK[k](v);
    if (v === undefined) return false;
    val[k] = v;
    return true;
  }
  function defaults() { for (var k in DEF) val[k] = DEF[k]; }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(val)); } catch (e) { /* storage is optional */ } }
  function load() {
    var o = null, k, old;
    defaults();
    try { o = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { o = null; }
    if (o && typeof o === 'object') { for (k in DEF) if (o.hasOwnProperty(k)) put(k, o[k]); return; }
    // First start with this store: take the values that older releases kept under 3 different keys.
    try {
      old = localStorage.getItem('ab_name'); if (old) put('name', old);
      old = localStorage.getItem('ab_gfx'); if (old) put('gfx', old);
      old = localStorage.getItem('ab_keys'); if (old) put('keys', JSON.parse(old));
      if (localStorage.getItem('ab_name') !== null || localStorage.getItem('ab_gfx') !== null || localStorage.getItem('ab_keys') !== null) {
        save();
        localStorage.removeItem('ab_name'); localStorage.removeItem('ab_gfx'); localStorage.removeItem('ab_keys');
      }
    } catch (e) { /* storage is optional */ }
  }

  G.SET = {
    get: function (k) { return val[k]; },
    // Returns true if the value is valid. The listeners get the key.
    set: function (k, v) {
      if (!put(k, v)) return false;
      save();
      listeners.forEach(function (f) { f(k); });
      return true;
    },
    // All settings go back to the default values. The listeners get each key.
    reset: function () {
      defaults(); save();
      for (var k in DEF) listeners.forEach(function (f) { f(k); });
    },
    onChange: function (f) { listeners.push(f); }
  };
  load();
})();
