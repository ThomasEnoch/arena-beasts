/* Arena Beasts - the Beast screen (#menu): the grid of Beasts, the details of one Beast, its story and the team selection.
   The screen has 3 views (G.UI.view): 'solo' and 'online' select a team, 'beasts' only shows the Beasts. */
(function () {
  'use strict';
  var G = window.G, A = G.APP, Net = G.Net, UI = G.UI, SET = G.SET, $ = A.$;
  var CAT = { phys: 'Physical', spec: 'Special', status: 'Status' };

  function chips(types) { return types.map(function (t) { return G.typeBadge(t, true); }).join(''); }
  function tcols(el, d) { el.style.setProperty('--c1', G.TCOL[d.types[0]]); el.style.setProperty('--c2', G.TCOL[d.types[1] || d.types[0]]); }
  function spriteCanvas(id, px) {
    var c = document.createElement('canvas'), im = G.SPR[id].idle[0]; c.width = c.height = im.width; c.style.width = c.style.height = px + 'px';
    c.getContext('2d').drawImage(im, 0, 0);
    return c;
  }
  function fxText(mv) {
    var out = [], z = mv.zone;
    mv.fx.forEach(function (f) {
      var pc = f.ch !== undefined && f.ch < 1 ? Math.round(f.ch * 100) + '% ' : '';
      if (f.k === 'status') out.push(pc + G.STATUS_NAME[f.s]);
      else if (f.k === 'conf') out.push(pc + 'Confusion');
      else if (f.k === 'stage') out.push(pc + (f.who === 'self' ? 'Own ' : 'Foe ') + G.STAT_SHORT[f.stat] + (f.n > 0 ? ' +' : ' ') + f.n);
      else if (f.k === 'heal') out.push('Heals ' + Math.round(f.pct * 100) + '%. Each use heals less');
      else if (f.k === 'drain') out.push('Drains ' + Math.round(f.pct * 100) + '% of damage');
      else if (f.k === 'recoil') out.push('Recoil ' + Math.round(f.pct * 100) + '%');
      else if (f.k === 'cure') out.push('Removes status');
    });
    if (z) {
      out.push('Stays ' + z.dur + ' s');
      if (z.slow) out.push('Slows');
      if (z.status) out.push(G.STATUS_NAME[z.status]);
    }
    if (mv.kb > 0) out.push('Knockback'); else if (mv.kb < 0) out.push('Pulls');
    if (mv.homing) out.push('Homing');
    if (mv.count) out.push(mv.count + ' shots');
    return out.join(' · ');
  }
  var STATN = [['HP', 'hp'], ['Attack', 'atk'], ['Defence', 'def'], ['Sp. Atk', 'spa'], ['Sp. Def', 'spd'], ['Speed', 'spe']];
  // Show one Beast on the stage and in the details panel.
  function showDetail(id) {
    if (A.detailId === id) return;
    A.detailId = id;
    var d = G.DEX[id], s = d.st, cards = document.querySelectorAll('.card'), i;
    for (i = 0; i < cards.length; i++) cards[i].classList.toggle('cur', cards[i].dataset.id === id);
    tcols($('stage'), d);
    $('smark').innerHTML = G.typeSvg(d.types[0]);
    $('sname').textContent = d.name;
    $('sepi').textContent = d.epithet || '';
    $('stypes').innerHTML = chips(d.types);
    $('srole').textContent = d.role + ' · ' + d.pref + ' range';
    $('sblurb').textContent = d.blurb;
    var rows = STATN.map(function (r) {
      var v = s[r[1]];
      return '<div class="stat"><span>' + r[0] + '</span><div class="bar"><i class="' + (v >= 105 ? 'hi' : v < 70 ? 'lo' : '') + '" style="width:' + Math.round(v / 130 * 100) + '%"></i></div><b>' + v + '</b></div>';
    }).join('');
    var moves = d.moves.map(function (mv) {
      var fxs = fxText(mv);
      return '<div class="move">' + G.typeBadge(mv.type) + '<b>' + mv.name + '</b><span class="pw">' + (mv.power ? '<strong>' + mv.power * (mv.count || 1) + '</strong> power' : CAT[mv.cat]) + '</span>' +
        '<div class="ms">' + G.SHAPE_LABEL[mv.shape] + ' · ' + mv.cd + ' s cooldown' + (fxs ? ' · <span class="mf">' + fxs + '</span>' : '') + '</div></div>';
    }).join('');
    $('sstats').innerHTML = rows;
    if (storyOpen) renderStory(id);
    $('detail').innerHTML = '<section class="dstats"><h3>Stats</h3>' + rows + '</section><section class="dmoves"><h3>Moves</h3>' + moves +
      '</section><section class="dsig"><h3>Signature power</h3><div class="sig"><div class="sh">' + G.typeBadge(d.sig.type) + '<b>' + d.sig.name + '</b></div><p>' + d.sig.desc + '</p><p class="cost">Cost: ' + d.sig.cost + '</p></div></section>';
  }

  // ---- stories: read from LORE.md, the one source of the canon -------------
  var LORE = {}, storyOpen = false;
  function loadLore() {
    if (!window.fetch) return;
    fetch('LORE.md' + (window.AB_V ? '?v=' + window.AB_V : '')).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      t.split(/^### /m).slice(1).forEach(function (sec) {
        var idm = /\x60([a-z]+)\x60\s*·\s*[^·\n]+·\s*([^\n]+)/.exec(sec), f = [], re = /^- \*\*(.+?):\*\*\s*(.+)$/gm, m;
        if (!idm || !G.DEX[idm[1]]) return;
        while ((m = re.exec(sec))) if (m[1] !== 'Look') f.push([m[1], m[2].replace(/[*\x60]/g, '')]);
        LORE[idm[1]] = { guilds: idm[2].trim(), f: f };
      });
      if (Object.keys(LORE).length) $('sbtn').classList.remove('hidden');
    }).catch(function () { /* the stories are optional */ });
  }
  function renderStory(id) {
    var L = LORE[id], el = $('story'), d = G.DEX[id], p, b, i;
    el.textContent = '';
    if (!L) return;
    p = document.createElement('h3'); p.textContent = d.name + ' - ' + d.epithet; el.appendChild(p);
    p = document.createElement('p'); p.className = 'guilds'; p.textContent = 'Guilds: ' + L.guilds; el.appendChild(p);
    for (i = 0; i < L.f.length; i++) {
      p = document.createElement('p'); b = document.createElement('b'); b.textContent = L.f[i][0];
      p.appendChild(b); p.appendChild(document.createTextNode(L.f[i][1])); el.appendChild(p);
    }
    el.scrollTop = 0;
  }
  function toggleStory(on) {
    storyOpen = on === undefined ? !storyOpen : on;
    $('story').classList.toggle('hidden', !storyOpen);
    $('sbtn').textContent = storyOpen ? 'Close story' : 'Story';
    $('sbtn').classList.toggle('on', storyOpen);
    if (storyOpen) renderStory(A.detailId);
  }

  // ---- team selection -----------------------------------------------------
  // Draw the selection marks, the team tray and the Start button again.
  function refresh() {
    var cards = document.querySelectorAll('.card'), picks = A.picks, i, id, n;
    for (i = 0; i < cards.length; i++) {
      id = cards[i].dataset.id; n = UI.view === 'beasts' ? -1 : picks.indexOf(id);
      cards[i].classList.toggle('on', n >= 0);
      cards[i].querySelector('.num').textContent = n >= 0 ? n + 1 : '';
    }
    $('tcount').textContent = 'Your team ' + picks.length + ' / 6';
    var team = $('team'); team.innerHTML = '';
    for (i = 0; i < 6; i++) {
      var slot = document.createElement('button'); slot.className = 'slot' + (picks[i] ? ' full' : '');
      if (picks[i]) {
        tcols(slot, G.DEX[picks[i]]);
        slot.appendChild(spriteCanvas(picks[i], 44));
        slot.insertAdjacentHTML('beforeend', '<span>' + G.DEX[picks[i]].name + '</span>');
        slot.title = 'Remove ' + G.DEX[picks[i]].name;
        slot.onclick = (function (p) { return function () { toggle(p); }; })(picks[i]);
      } else slot.innerHTML = '<span class="empty">' + (i + 1) + '</span>';
      team.appendChild(slot);
    }
    A.refreshLobby();
  }
  function teamChanged() {
    if (A.myReady) { A.myReady = false; Net.send({ t: 'ready', on: false }); }
    refresh();
  }
  function toggle(id) {
    if (UI.view === 'beasts') { G.sfx('ui'); showDetail(id); return; }   // this view does not select a team
    var n = A.picks.indexOf(id);
    if (n >= 0) A.picks.splice(n, 1); else if (A.picks.length < 6) A.picks.push(id);
    G.sfx('ui'); showDetail(id); teamChanged();
  }
  function shuffled() {
    var a = G.ROSTER.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // ---- the functions that js/ui.js calls -----------------------------------
  var VIEW = {
    solo: ['Play solo', 'Select 6 Beasts for your team. Then start the battle.'],
    online: ['Play online', ''],
    beasts: ['Beasts', 'Select a Beast to see its stats, its moves and its story.']
  };
  function setView(v) {
    $('mtitle').textContent = VIEW[v][0]; $('mhint').textContent = VIEW[v][1];
    refresh();
  }
  // Back button of the Beast screen. In a room, it also leaves the room.
  function backFromTeam() {
    if (UI.view === 'online' && Net.state !== 'off') { Net.leave(); A.peerGone(true); }
    if (storyOpen) toggleStory(false);
    UI.go('title');
  }

  // ---- start --------------------------------------------------------------
  function initTeam() {
    var grid = $('grid');
    G.ROSTER.forEach(function (id) {
      var d = G.DEX[id], el = document.createElement('button');
      el.className = 'card'; el.dataset.id = id;
      el.appendChild(spriteCanvas(id, 92));
      tcols(el, d);
      el.insertAdjacentHTML('beforeend', '<b>' + d.name + '</b><span class="tics">' + d.types.map(function (t) { return G.typeBadge(t); }).join('') + '</span><i class="num"></i>');
      el.onclick = function () { toggle(id); };
      el.onmouseenter = el.onfocus = function () { showDetail(id); };
      grid.appendChild(el);
    });
    // The difficulty is also in the Settings screen. Each change comes through the settings store.
    UI.segInit('diff', function (v) { SET.set('diff', v); });
    UI.seg('diff', A.diff);
    SET.onChange(function (k) { if (k === 'diff') { A.diff = SET.get('diff'); UI.seg('diff', A.diff); } });
    $('random').onclick = function () { A.picks = shuffled().slice(0, 6); G.sfx('ui'); teamChanged(); };
    $('clear').onclick = function () { A.picks = []; G.sfx('ui'); teamChanged(); };
    $('sbtn').onclick = function () { G.sfx('ui'); toggleStory(); };
    // Esc on the Beast screen: close the story, or go back. In a room, Esc does not leave the room.
    window.addEventListener('keydown', function (e) {
      if (e.code !== 'Escape' || e.repeat || A.state !== 'menu' || UI.screen !== 'team') return;
      if (storyOpen) toggleStory(false);
      else if (!(UI.view === 'online' && Net.state !== 'off')) backFromTeam();
    });
    loadLore();
    $('start').onclick = function () {
      if (A.picks.length !== 6) return;
      G.sfx('ui');
      if (UI.view === 'online') { if (Net.state !== 'off') A.setReady(!A.myReady); return; }
      A.rival = G.TRAINER_NAMES[Math.floor(Math.random() * G.TRAINER_NAMES.length)];
      A.startBattle(A.picks.slice(), shuffled().slice(0, 6), 'solo', ['You', A.rival]);
    };
    showDetail(G.ROSTER[0]);
  }

  A.showDetail = showDetail; A.refresh = refresh; A.shuffled = shuffled;
  A.setView = setView; A.backFromTeam = backFromTeam; A.initTeam = initTeam;
})();
