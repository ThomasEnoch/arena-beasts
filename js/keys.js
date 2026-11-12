/* Arena Beasts - key bindings. Each action has 2 slots. A slot holds one input code:
   a keyboard code ("KeyW", "Space", "Shift"), a mouse button ("Mouse0" = left, "Mouse1" = middle, "Mouse2" = right)
   or a wheel direction ("WheelUp", "WheelDown"). The player changes them in the Controls panel. They stay in localStorage. */
(function () {
  'use strict';
  var G = window.G = window.G || {};
  var STORE = 'ab_keys';
  // id, label, group, default slots
  var ACTIONS = [
    ['up', 'Move up', 'Move', ['KeyW', 'ArrowUp']], ['down', 'Move down', 'Move', ['KeyS', 'ArrowDown']],
    ['left', 'Move left', 'Move', ['KeyA', 'ArrowLeft']], ['right', 'Move right', 'Move', ['KeyD', 'ArrowRight']],
    ['dodge', 'Dodge', 'Move', ['Space', '']], ['guard', 'Guard (hold)', 'Move', ['Shift', 'KeyQ']],
    ['move1', 'Move 1', 'Attack', ['Digit1', 'Mouse0']], ['move2', 'Move 2', 'Attack', ['Digit2', 'Mouse2']],
    ['move3', 'Move 3', 'Attack', ['Digit3', '']], ['move4', 'Move 4', 'Attack', ['Digit4', '']],
    ['sig', 'Signature power', 'Attack', ['KeyR', '']],
    ['sw1', 'Creature 1', 'Switch', ['KeyZ', '']], ['sw2', 'Creature 2', 'Switch', ['KeyX', '']], ['sw3', 'Creature 3', 'Switch', ['KeyC', '']],
    ['sw4', 'Creature 4', 'Switch', ['KeyV', '']], ['sw5', 'Creature 5', 'Switch', ['KeyB', '']], ['sw6', 'Creature 6', 'Switch', ['KeyN', '']],
    ['swNext', 'Next creature', 'Switch', ['WheelDown', '']], ['swPrev', 'Previous creature', 'Switch', ['WheelUp', '']],
    ['auto', 'Auto play', 'Other', ['Tab', '']], ['pause', 'Pause', 'Other', ['KeyP', 'Escape']], ['mute', 'Mute', 'Other', ['KeyM', '']]
  ];
  var NAMES = {
    Space: 'Space', Shift: 'Shift', Ctrl: 'Ctrl', Alt: 'Alt', Tab: 'Tab', Escape: 'Esc', Enter: 'Enter', Backspace: 'Bksp', CapsLock: 'Caps',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Mouse0: 'LMB', Mouse1: 'MMB', Mouse2: 'RMB', Mouse3: 'M4', Mouse4: 'M5', WheelUp: 'Wheel ↑', WheelDown: 'Wheel ↓',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Backquote: '`'
  };
  var map = {}, byCode = {}, listeners = [];

  // one code for the left and the right key of Shift, Ctrl and Alt
  function norm(code) {
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
    if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
    if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
    return code;
  }
  function label(code) {
    if (!code) return '—';
    if (NAMES[code]) return NAMES[code];
    if (code.indexOf('Key') === 0 && code.length === 4) return code.charAt(3);
    if (code.indexOf('Digit') === 0) return code.slice(5);
    if (code.indexOf('Numpad') === 0) return 'Num ' + code.slice(6);
    return code;
  }
  function index() {
    byCode = {};
    for (var id in map) for (var s = 0; s < 2; s++) if (map[id][s]) byCode[map[id][s]] = id;
  }
  function defaults() {
    map = {};
    ACTIONS.forEach(function (a) { map[a[0]] = a[3].slice(); });
    index();
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(map)); } catch (e) { /* storage is optional */ }
    listeners.forEach(function (f) { f(); });
  }
  function load() {
    defaults();
    try {
      var o = JSON.parse(localStorage.getItem(STORE) || 'null'), used = {};
      if (!o || typeof o !== 'object') return;
      ACTIONS.forEach(function (a) {
        var v = o[a[0]];
        if (!Array.isArray(v)) return;
        map[a[0]] = [0, 1].map(function (s) {
          var c = typeof v[s] === 'string' && v[s].length < 24 && !used[v[s]] ? v[s] : '';
          if (c) used[c] = 1;
          return c;
        });
      });
      index();
    } catch (e) { defaults(); }
  }

  G.KEYS = {
    ACTIONS: ACTIONS, norm: norm, label: label,
    get: function (id) { return map[id] || ['', '']; },
    actionOf: function (code) { return byCode[code] || null; },
    // Put code in a slot. If another action has this code, that action loses it. Returns the id of that action, or null.
    set: function (id, slot, code) {
      var lost = null, k, s;
      if (!map[id]) return null;
      if (code) for (k in map) for (s = 0; s < 2; s++) if (map[k][s] === code && !(k === id && s === slot)) { map[k][s] = ''; if (k !== id) lost = k; }
      map[id][slot] = code || '';
      index(); save();
      return lost;
    },
    reset: function () { defaults(); save(); },
    // text for the HUD: the slots of an action, for example "1 · LMB"
    text: function (id, one) {
      var m = map[id] || [], a = m[0] ? label(m[0]) : '', b = !one && m[1] ? label(m[1]) : '';
      return a && b ? a + ' · ' + b : a || b || (m[1] ? label(m[1]) : '');
    },
    name: function (id) { for (var i = 0; i < ACTIONS.length; i++) if (ACTIONS[i][0] === id) return ACTIONS[i][1]; return id; },
    onChange: function (f) { listeners.push(f); }
  };
  load();
})();
