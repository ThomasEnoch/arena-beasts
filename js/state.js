/* Arena Beasts - the state that the game files share: G.APP.
   js/gfx/app.js loads these 5 files in this sequence, after the 3D engine is ready:
     js/state.js   this file: the shared state and the checks for data from the other player
     js/team.js    the Beast screen: grid, details, story, team selection
     js/lobby.js   online play: room, ready, messages from the other player, connection loss
     js/input.js   keys, mouse and wheel in a battle
     js/main.js    the battle flow, the result, the game loop, and the start of the game
   Each file adds its public functions to G.APP. A file calls a function of another file through G.APP at run time. */
(function () {
  'use strict';
  var G = window.G;
  var A = G.APP = {
    // the game. state: 'menu', 'battle' or 'result'. mode: 'solo' (AI opponent), 'host' (runs the battle for 2 players),
    // 'guest' (shows the battle of the host)
    battle: null, state: 'menu', mode: 'solo', lastTeams: null, rival: 'Rival',
    ui: { me: 0, auto: false, paused: false, mx: 480, my: 270, note: '', pick: -1 },   // the HUD reads this
    // the Beast screen
    picks: [], diff: G.SET.get('diff'), detailId: null,
    // input
    keys: {}, guardBtn: false,
    // online. away = the guest of this battle has no connection. The host holds the battle for WAIT seconds in total.
    myName: 'Player', peerName: 'Player', myReady: false, peerReady: false, peerTeam: null, peerV: null,
    WAIT: 30, away: false, waitLeft: 0, notice: '', ping: -1, snapN: 0
  };
  A.$ = function (id) { return document.getElementById(id); };

  // ---- checks for data from the other player ------------------------------
  A.cleanName = function (v, def) {
    if (typeof v !== 'string') return def;
    v = v.replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 12);
    return v || def;
  };
  A.cleanTeam = function (t) {
    if (!Array.isArray(t) || t.length !== 6) return null;
    var seen = {}, i;
    for (i = 0; i < 6; i++) { if (typeof t[i] !== 'string' || !G.DEX.hasOwnProperty(t[i]) || seen[t[i]]) return null; seen[t[i]] = 1; }
    return t.slice();
  };
  A.num = function (v, lo, hi) { return typeof v === 'number' && isFinite(v) ? (v < lo ? lo : v > hi ? hi : v) : 0; };
  A.r1 = function (v) { return Math.round(v * 10) / 10; };
  A.online = function () { return G.Net.state === 'connected'; };
})();
