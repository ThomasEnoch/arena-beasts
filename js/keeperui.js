/* Arena Beasts - the Keeper of the player on the screen: the selection of the guild and of the 2 commands (#keeper).
   The rules and the texts are in js/keeper.js (G.KEEPER). The selection stays in the Keeper's ledger (js/ledger.js).
   All guilds and all commands are open from the start. The player cannot change the Keeper in a battle. */
(function () {
  'use strict';
  var G = window.G, A = G.APP, UI = G.UI, L = G.LEDGER, KP = G.KEEPER, Net = G.Net, $ = A.$;
  var next = 0;   // the command place (0 or 1) that the next new command replaces

  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function draw() {
    var k = L.keeper(), html = '';
    KP.CMD_IDS.forEach(function (id) {
      var c = KP.CMDS[id], n = k.cmds.indexOf(id);
      html += '<button type="button" class="kcard' + (n >= 0 ? ' on' : '') + '" data-c="' + id + '" aria-pressed="' + (n >= 0) + '"><b>' + c.name + '<em>' + c.cost + ' favour</em></b><small>' + c.text + '</small>' +
        (n >= 0 ? '<i>Command ' + (n + 1) + ' · key ' + esc(G.KEYS.text('cmd' + (n + 1)) || 'none') + '</i>' : '') + '</button>';
    });
    $('kpcmds').innerHTML = html;
    html = '';
    KP.GUILD_IDS.forEach(function (id) {
      var g = KP.GUILDS[id], on = k.guild === id;
      html += '<button type="button" class="kcard' + (on ? ' on' : '') + '" data-g="' + id + '" aria-pressed="' + on + '"><b>' + G.typeBadge(id) + g.name + '</b><i>' + g.rule + '</i><small>' + g.text + '</small></button>';
    });
    $('kpguilds').innerHTML = html;
  }
  // The Keeper buttons of the Beast screen and of the Daily Proving show the guild.
  function labels() {
    var t = 'Keeper: ' + KP.GUILDS[L.keeper().guild].name;
    $('keepbtn').textContent = t; $('dkeep').textContent = t;
  }
  function change(k) {
    L.setKeeper(k);
    G.sfx('ui');
    // online: the other player has the old Keeper, so this player is not ready
    if (A.myReady) { A.myReady = false; Net.send({ t: 'ready', on: false }); A.refreshLobby(); }
  }
  function openKeeper() { next = 0; draw(); UI.open('keeper'); $('kpclose').focus(); }
  function initKeeper() {
    $('kpcmds').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.kcard') : null, k = L.keeper();
      if (!b || !KP.CMDS[b.dataset.c] || k.cmds.indexOf(b.dataset.c) >= 0) return;
      k.cmds[next] = b.dataset.c; next = 1 - next;
      change(k);
    });
    $('kpguilds').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.kcard') : null, k = L.keeper();
      if (!b || !KP.GUILDS[b.dataset.g] || k.guild === b.dataset.g) return;
      k.guild = b.dataset.g;
      change(k);
    });
    L.onChange(function () { labels(); if (UI.overlay === 'keeper') draw(); });
    G.KEYS.onChange(function () { if (UI.overlay === 'keeper') draw(); });
    labels();
  }

  A.openKeeper = openKeeper; A.initKeeper = initKeeper;
})();
