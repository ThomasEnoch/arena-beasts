/* Arena Beasts - screens: the title screen, the Settings screen and the pause menu.
   One screen shows at a time:
     'title'  the main menu
     'team'   the Beast screen. js/main.js draws it. It has 3 views: 'solo', 'online', 'beasts'
     ''       no menu screen (battle and result)
   One overlay can be on top of a screen: 'settings' or 'pause'.
   js/main.js starts this file with G.UI.init(hooks). The hooks are the functions that only main.js can do.
   To add a screen: add its element to index.html and show it in UI.go. To add a Settings tab: add a button to #stabs
   and a section with the id "tab-<name>". */
(function () {
  'use strict';
  var G = window.G, SET = G.SET, K = G.KEYS;
  function $(id) { return document.getElementById(id); }
  var UI = G.UI = { screen: '', view: 'solo', overlay: '', feature: null };
  var hooks = {}, under = '', featT = 0, pauseOnline = false, armed = false, armT = 0;

  // ---- screens ------------------------------------------------------------
  // Show a screen. The live 3D canvas and the graphics notice move into the screen that shows.
  UI.go = function (screen, view) {
    var cvs = $('stagecv'), warn = $('gpuwarn');
    UI.screen = screen;
    if (view) UI.view = view;
    document.body.dataset.screen = screen;
    $('title').classList.toggle('hidden', screen !== 'title');
    $('menu').classList.toggle('hidden', screen !== 'team');
    if (screen === 'title') {
      $('thero').insertBefore(cvs, $('tfeat'));
      $('title').insertBefore(warn, $('tmain'));
      if (!UI.feature) feature();
    } else if (screen === 'team') {
      $('menu').dataset.view = UI.view;
      $('stage').insertBefore(cvs, $('shead'));
      $('menu').insertBefore(warn, $('menu').querySelector('main'));
      hooks.view(UI.view);
    }
  };
  function showOverlay(name) {
    UI.overlay = name;
    $('settings').classList.toggle('hidden', name !== 'settings');
    $('pause').classList.toggle('hidden', name !== 'pause');
    if (capture && name !== 'settings') endCapture('');
    disarm();
  }
  // Open the Settings screen. From the pause menu, Close goes back to the pause menu.
  UI.settings = function (tab) {
    under = UI.overlay === 'pause' ? 'pause' : '';
    if (tab) setTab(tab);
    drawAll();
    showOverlay('settings');
    $('setclose').focus();
  };
  // Open the pause menu. online = the battle continues while the menu is open.
  UI.pause = function (online) {
    pauseOnline = !!online; under = '';
    $('ptitle').textContent = online ? 'Battle menu' : 'Paused';
    $('pnote').textContent = online ? 'The online battle continues while this menu is open.' : 'The battle is stopped.';
    $('prestart').classList.toggle('hidden', !!online);
    showOverlay('pause');
    $('presume').focus();
  };
  // Close the top overlay. Returns true if an overlay was open.
  UI.back = function () {
    if (UI.overlay === 'settings') {
      showOverlay(under); under = '';
      if (UI.overlay === 'pause') $('pset').focus();
      return true;
    }
    if (UI.overlay === 'pause') { showOverlay(''); hooks.resume(); return true; }
    return false;
  };
  UI.closeAll = function () { under = ''; showOverlay(''); };
  UI.capturing = function () { return !!capture; };

  // ---- title screen: one Beast shows as a live 3D model -------------------
  function feature(id) {
    var ids = G.ROSTER, d, hero = $('thero');
    if (!id) do { id = ids[Math.floor(Math.random() * ids.length)]; } while (ids.length > 1 && id === UI.feature);
    UI.feature = id; featT = 0; d = G.DEX[id];
    hero.style.setProperty('--c1', G.TCOL[d.types[0]]);
    hero.style.setProperty('--c2', G.TCOL[d.types[1] || d.types[0]]);
    $('tmark').innerHTML = G.typeSvg(d.types[0]);
    $('tfname').textContent = d.name;
    $('tfepi').textContent = d.epithet || '';
  }
  // Each display frame, from main.js.
  UI.tick = function (dt) {
    if (UI.screen === 'title' && !UI.overlay) { featT += dt; if (featT > 10) feature(); }
    if (armed) { armT -= dt; if (armT <= 0) disarm(); }
  };

  // ---- Settings: tabs -----------------------------------------------------
  var tab = 'controls';
  function setTab(t) {
    var bs = $('stabs').querySelectorAll('button'), i, on;
    tab = t;
    for (i = 0; i < bs.length; i++) {
      on = bs[i].dataset.t === t;
      bs[i].classList.toggle('on', on); bs[i].setAttribute('aria-selected', on ? 'true' : 'false');
      $('tab-' + bs[i].dataset.t).classList.toggle('hidden', !on);
    }
    if (capture && t !== 'controls') endCapture('');
    disarm();
  }
  // A row of buttons where one is on. Each button has data-v.
  function seg(id, v) {
    var bs = $(id).querySelectorAll('button'), i, on;
    for (i = 0; i < bs.length; i++) { on = bs[i].dataset.v === String(v); bs[i].classList.toggle('on', on); bs[i].setAttribute('aria-pressed', on ? 'true' : 'false'); }
  }
  function segInit(id, fn) {
    $(id).addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b || !b.dataset.v) return;
      fn(b.dataset.v); G.sfx('ui');
    });
  }
  UI.seg = seg; UI.segInit = segInit;

  // ---- Settings: Controls. The player changes the input of each action. ----
  var capture = null, skipClick = false, HOLD = { up: 1, down: 1, left: 1, right: 1, guard: 1 };
  function escHtml(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function drawKeys() {
    var html = '', grp = '';
    K.ACTIONS.forEach(function (a) {
      var m = K.get(a[0]);
      if (a[2] !== grp) { html += (grp ? '</section>' : '') + '<section><h4>' + a[2] + '</h4>'; grp = a[2]; }
      html += '<div class="krow"><span>' + a[1] + '</span>' + [0, 1].map(function (sl) {
        return '<button type="button" class="kbtn' + (m[sl] ? '' : ' none') + '" data-a="' + a[0] + '" data-s="' + sl + '" aria-label="' + a[1] + ', key ' + (sl + 1) + '">' + escHtml(K.label(m[sl])) + '</button>';
      }).join('') + '</div>';
    });
    $('keys').innerHTML = html + '</section>';
  }
  function keyHint(t, warn) { $('khint').textContent = t || 'Click a key to change it. Each action has 2 keys. Esc always opens the pause menu.'; $('khint').classList.toggle('warn', !!warn); }
  function endCapture(msg, warn) { capture = null; drawKeys(); keyHint(msg, warn); }
  function bind(code) {
    var c = capture, lost;
    if (!c) return;
    if (HOLD[c.id] && code.indexOf('Wheel') === 0) { keyHint('The wheel cannot hold an action. Use a key or a mouse button for "' + K.name(c.id) + '".', true); return; }
    lost = K.set(c.id, c.slot, code);
    endCapture(lost ? K.label(code) + ' was the key of "' + K.name(lost) + '". It is now the key of "' + K.name(c.id) + '".' : '', !!lost);
    G.sfx('ui');
  }
  function initKeys() {
    $('keys').addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('.kbtn') : null;
      if (skipClick) { skipClick = false; return; }
      if (!el) return;
      capture = { id: el.dataset.a, slot: +el.dataset.s };
      drawKeys();
      el = $('keys').querySelector('.kbtn[data-a="' + capture.id + '"][data-s="' + capture.slot + '"]');
      el.classList.add('wait'); el.textContent = 'Press…'; capture.el = el;
      keyHint('Press a key, turn the wheel, or click the yellow box with a mouse button. Esc = cancel. Delete = no key.');
    });
    $('keys').addEventListener('contextmenu', function (e) { e.preventDefault(); });
    $('kreset').onclick = function () { K.reset(); endCapture('All keys are the default keys again.'); G.sfx('ui'); };
    // While the panel waits for an input, these listeners take it before all others.
    window.addEventListener('mousedown', function (e) {
      if (!capture) return;
      if (e.target === capture.el) { e.preventDefault(); e.stopImmediatePropagation(); skipClick = e.button === 0; bind('Mouse' + e.button); }
      else if (!(e.target.closest && e.target.closest('.kbtn'))) endCapture('');
    }, true);
    window.addEventListener('wheel', function (e) {
      if (!capture) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (Math.abs(e.deltaY) >= 1) bind(e.deltaY > 0 ? 'WheelDown' : 'WheelUp');
    }, { capture: true, passive: false });
  }

  // ---- Settings: Graphics -------------------------------------------------
  function drawGfx() {
    var g = G.R.gfx();
    seg('gfx', g.mode);
    $('gfxnote').textContent = g.mode === 'auto' ? 'Auto: the game selects the quality and lowers it when the frames are slow. Quality now: ' + g.level + '.' : 'The quality stays at ' + g.level + '.';
    $('gfxgpu').textContent = g.gpu ? 'Graphics device: ' + g.gpu : '';
    $('gfxsoft').classList.toggle('hidden', !g.soft);
  }
  function initGfx() {
    var hide = false;
    segInit('gfx', function (v) { G.R.setGfx(v); hooks.gfx(); drawGfx(); });
    try { hide = sessionStorage.getItem('ab_gpuok') === '1'; } catch (e) { /* storage is optional */ }
    if (G.R.gfx().soft && !hide) $('gpuwarn').classList.remove('hidden');
    $('gpuok').onclick = function () { $('gpuwarn').classList.add('hidden'); try { sessionStorage.setItem('ab_gpuok', '1'); } catch (e) { /* storage is optional */ } };
  }

  // ---- Settings: Sound ----------------------------------------------------
  function drawSound() {
    var v = SET.get('vol');
    if (document.activeElement !== $('vol')) $('vol').value = v;
    $('volv').textContent = v + '%';
    seg('smute', SET.get('mute') ? 'off' : 'on');
  }
  function initSound() {
    $('vol').oninput = function () { SET.set('vol', +this.value); };
    $('vol').onchange = function () { G.sfx('hit'); };
    segInit('smute', function (v) { SET.set('mute', v === 'off'); });
    $('stest').onclick = function () { G.sfx('sig'); };
  }

  // ---- Settings: Game -----------------------------------------------------
  function drawGame() {
    if (document.activeElement !== $('gname')) $('gname').value = SET.get('name');
    seg('gdiff', SET.get('diff'));
    seg('gshake', SET.get('shake') ? 'on' : 'off');
  }
  function disarm() { armed = false; var b = $('greset'), q = $('pquit'); if (b) b.textContent = 'Reset all settings'; if (q) q.textContent = pauseOnline ? 'Leave battle' : 'Quit to main menu'; }
  function initGame() {
    $('gname').oninput = function () { SET.set('name', this.value); };
    segInit('gdiff', function (v) { SET.set('diff', v); });
    segInit('gshake', function (v) { SET.set('shake', v === 'on'); });
    // 2 clicks: the first click asks, the second click does it
    $('greset').onclick = function () {
      if (!armed) { armed = true; armT = 4; this.textContent = 'Click again to reset'; return; }
      disarm();
      SET.reset(); G.R.setGfx('auto'); hooks.gfx();
      endCapture('All keys are the default keys again.');
      drawAll(); G.sfx('ui');
    };
  }
  function drawAll() { drawKeys(); drawGfx(); drawSound(); drawGame(); }

  // ---- start --------------------------------------------------------------
  UI.init = function (h) {
    hooks = h;
    // title screen
    $('tsolo').onclick = function () { G.sfx('ui'); UI.go('team', 'solo'); };
    $('tonline').onclick = function () { G.sfx('ui'); UI.go('team', 'online'); };
    $('tbeasts').onclick = function () { G.sfx('ui'); UI.go('team', 'beasts'); };
    $('tset').onclick = function () { G.sfx('ui'); UI.settings(); };
    $('tfeat').onclick = function () { G.sfx('ui'); UI.go('team', 'beasts'); hooks.show(UI.feature); };
    $('tver').textContent = window.AB_V ? 'Version ' + window.AB_V : '';
    // Beast screen
    $('mback').onclick = function () { G.sfx('ui'); hooks.back(); };
    $('mset').onclick = function () { G.sfx('ui'); UI.settings(); };
    // Settings
    $('stabs').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (b && b.dataset.t) { setTab(b.dataset.t); G.sfx('ui'); }
    });
    $('setclose').onclick = function () { G.sfx('ui'); UI.back(); };
    initKeys(); initGfx(); initSound(); initGame();
    setTab('controls'); keyHint(''); drawAll();
    SET.onChange(function (k) { if (k === 'vol' || k === 'mute') drawSound(); else if (k !== 'keys' && k !== 'gfx') drawGame(); });
    // pause menu
    $('presume').onclick = function () { G.sfx('ui'); UI.back(); };
    $('pset').onclick = function () { G.sfx('ui'); UI.settings(); };
    $('prestart').onclick = function () { G.sfx('ui'); UI.closeAll(); hooks.restart(); };
    $('pquit').onclick = function () {
      // online: 2 clicks, because the other player loses the opponent
      if (pauseOnline && !armed) { armed = true; armT = 4; this.textContent = 'Click again to leave'; return; }
      G.sfx('ui'); UI.closeAll(); hooks.quit();
    };
    // Keys. This listener runs before the listeners of main.js.
    window.addEventListener('keydown', function (e) {
      var k = K.norm(e.code);
      if (capture) {            // the Controls tab waits for an input
        e.preventDefault(); e.stopImmediatePropagation();
        if (k === 'Escape') endCapture('');
        else if (k === 'Delete' || k === 'Backspace') { K.set(capture.id, capture.slot, ''); endCapture('"' + K.name(capture.id) + '": key ' + (capture.slot + 1) + ' is empty.'); }
        else if (k && k !== 'Unidentified') bind(k);
        return;
      }
      if (!UI.overlay) return;
      // An overlay is open: the battle gets no keys. Esc closes the overlay. The pause key closes the pause menu.
      e.stopImmediatePropagation();
      if (e.repeat) return;
      if (k === 'Escape' || (UI.overlay === 'pause' && K.actionOf(k) === 'pause')) { e.preventDefault(); G.sfx('ui'); UI.back(); }
    }, true);
  };
})();
