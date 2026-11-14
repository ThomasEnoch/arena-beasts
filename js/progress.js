/* Arena Beasts - progress on the screen: the Daily Proving, the screen of the Keeper's ledger, the ledger line of the title
   screen and the reward lines of the result screen. The rules and the stored data are in js/ledger.js (G.LEDGER). */
(function () {
  'use strict';
  var G = window.G, A = G.APP, UI = G.UI, L = G.LEDGER, KP = G.KEEPER, $ = A.$;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function dateLabel(date) { var p = date.split('-'); return (+p[2]) + ' ' + MONTHS[+p[1] - 1].slice(0, 3) + ' ' + p[0]; }
  function clock(t) { return (t / 60 | 0) + ':' + (t % 60 < 10 ? '0' : '') + t % 60; }
  function copy(text, btn, label) {
    var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = label; }, 1500); };
    var old = function () {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* the player can copy by hand */ }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, old); else old();
  }

  // ---- Daily Proving: the date makes the 2 teams, the opponent and the arena. All players get the same battle. ----
  function hash(s) { var h = 2166136261, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // random numbers from a seed: the same seed gives the same numbers in each browser
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function pick6(r) {
    var a = G.ROSTER.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a.slice(0, 6);
  }
  function setup(date) {
    var r = rng(hash('arena-beasts-proving-' + date));
    // The Keeper of the opponent is the last value from the date, so that the values before it do not change.
    return { date: date, mine: pick6(r), foe: pick6(r), name: G.TRAINER_NAMES[Math.floor(r() * G.TRAINER_NAMES.length)], arena: Math.floor(r() * 9973), keeper: KP.random(r) };
  }
  // The result as text for other people. It shows no detail of the battle.
  function shareText(date, d) {
    var sq = '', i;
    for (i = 0; i < 6; i++) sq += i < d.left ? '🟨' : '⬛';
    return 'Arena Beasts - Daily Proving ' + dateLabel(date) + '\n' +
      (d.r === 'W' ? 'Victory in ' + clock(d.t) : d.open ? 'Gave up' : 'Defeat after ' + clock(d.t)) + '\n' +
      sq + ' ' + d.left + ' of 6 Beasts standing\n' + location.origin + location.pathname;
  }
  function fillTeam(el, team) {
    el.textContent = '';
    team.forEach(function (id) {
      var d = G.DEX[id], box = document.createElement('div'), name = document.createElement('span');
      box.className = 'dmon'; A.tcols(box, d);
      box.appendChild(A.spriteCanvas(id, 60));
      name.textContent = d.name; box.appendChild(name);
      el.appendChild(box);
    });
  }
  function drawDaily() {
    var date = L.today(), s = setup(date), d = L.daily(date), R = L.RULES;
    $('ddate').textContent = dateLabel(date);
    fillTeam($('dmine'), s.mine); fillTeam($('dfoe'), s.foe);
    $('dfoen').textContent = 'Opponent: ' + s.name + ' · ' + KP.GUILDS[s.keeper.guild].name;
    $('drule').textContent = d ? 'Your try of today is used. A new Proving starts tomorrow. A practice battle gives no marks.'
      : 'You have one try. All players get this team and this opponent today. Your Keeper is your own selection. If you leave the battle, it is a defeat. ' +
        'A victory gives ' + R.dailyWin + ' marks and opens the stories of your 6 Beasts. A defeat gives ' + R.dailyLoss + ' marks.';
    $('dres').classList.toggle('hidden', !d);
    if (d) $('dshare').textContent = shareText(date, d);
    $('dstart').classList.toggle('hidden', !!d);
    $('dpractice').classList.toggle('hidden', !d);
  }
  // practice = a battle with the teams of today that does not count.
  function startDaily(practice) {
    var date = L.today(), s = setup(date);
    if (!practice && !L.dailyStart(date)) { drawDaily(); return; }   // the try is used
    A.startBattle(s.mine, s.foe, 'solo', ['You', s.name], { daily: practice ? null : date, practice: practice ? date : null, seed: s.arena, diff: 'normal', keepers: [L.keeper(), s.keeper] });
  }
  function openDaily() { drawDaily(); UI.open('daily'); }

  // ---- the title screen: the Daily Proving button and the ledger in one line ----
  function drawTitle() {
    var i = L.info(), d = L.daily(L.today());
    $('tdailys').textContent = d ? (d.r === 'W' ? 'Today: victory in ' + clock(d.t) + '.' : 'Today: defeat.') + ' A new Proving starts tomorrow.' : 'One battle each day. The same for all players.';
    $('tdaily').classList.toggle('new', !d);
    $('tlsum').textContent = 'Beasts ' + i.beasts + ' / ' + i.total + ' · Keys ' + i.keys + ' · Stamps ' + i.stamps;
    $('tlbar').style.width = (i.beasts === i.total ? 100 : Math.round(i.prog / i.need * 100)) + '%';
  }

  // ---- the screen of the Keeper's ledger ----
  var armed = false, armT = 0;
  function statBox(name, val, frac, note) {
    return '<div class="lstat"><b>' + name + '<em>' + val + '</em></b><i class="pbar"><i style="width:' + Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%"></i></i><small>' + note + '</small></div>';
  }
  function drawLedger() {
    var i = L.info(), R = L.RULES, now = new Date(), y = now.getFullYear(), m = now.getMonth(), days = L.days(), cal = '', n, k, d, first, len;
    $('lbars').innerHTML =
      statBox('Beasts', i.beasts + ' / ' + i.total, i.beasts / i.total, i.beasts === i.total ? 'All Beasts are open.' : 'Keys: ' + i.keys + '. Open a Beast on the Beasts screen.') +
      statBox('Stories', i.stories + ' / ' + i.total, i.stories / i.total, 'A victory with a Beast in your team opens its story.') +
      statBox('Next key', i.beasts === i.total ? 'No more keys' : i.prog + ' / ' + i.need + ' marks', i.beasts === i.total ? 1 : i.prog / i.need,
        'Victory: ' + R.win.easy + ' to ' + R.win.hard + ' marks. Defeat: ' + R.loss + ' mark. Daily Proving: ' + R.dailyLoss + ' or ' + R.dailyWin + ' marks.') +
      statBox('Victories', i.wins + ' of ' + i.battles + ' battles', i.battles ? i.wins / i.battles : 0, 'Marks in total: ' + i.marks + '. Online battles do not count.');
    // the stamps of this month. The week starts on Monday.
    ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].forEach(function (h) { cal += '<i class="head">' + h + '</i>'; });
    first = (new Date(y, m, 1).getDay() + 6) % 7; len = new Date(y, m + 1, 0).getDate();
    for (n = 0; n < first; n++) cal += '<i class="none"></i>';
    for (n = 1; n <= len; n++) {
      k = y + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + n).slice(-2); d = days[k];
      cal += '<i class="' + (d ? (d.r === 'W' ? 'win' : 'loss') : '') + (n === now.getDate() ? ' now' : '') + '" title="' + (d ? (d.r === 'W' ? 'Victory' : 'Defeat') : 'No Proving') + '">' + n + '</i>';
    }
    $('lcal').innerHTML = cal;
    $('lmonth').textContent = MONTHS[m] + ' ' + y + ' · stamps in total: ' + i.stamps + '. Yellow = victory. A day without a stamp costs nothing.';
    $('lcode').value = L.exportCode();
  }
  function disarm() { armed = false; clearTimeout(armT); $('lload').textContent = 'Load code'; }
  function openLedger() { disarm(); $('lmsg').textContent = ''; $('lin').value = ''; drawLedger(); UI.open('ledger'); }

  // ---- the result screen: what the battle gave. g = the return value of G.LEDGER.battle or dailyEnd, or null. ----
  function gainHtml(g) {
    var i = L.info(), out;
    if (A.practice) return '<div class="rgain"><span>Practice battle: no marks.</span></div>';
    if (!g) return '';
    out = '<div class="rgain"><span><b>+' + g.marks + (g.marks === 1 ? ' mark' : ' marks') + '</b>' + (A.autoUsed ? ' · auto play gives ' + L.RULES.loss + ' mark only' : '') +
      (i.beasts < i.total ? ' · next key: ' + i.prog + ' / ' + i.need + ' marks' : '') + '</span>';
    if (g.keys) out += '<span class="new">New key. You can open a Beast on the Beasts screen. Keys: ' + i.keys + '</span>';
    if (g.stories.length) out += '<span class="new">' + (g.stories.length === 1 ? 'Story open: ' : 'Stories open: ') + g.stories.map(function (id) { return G.DEX[id].name; }).join(', ') + '</span>';
    return out + '</div>';
  }

  // ---- start --------------------------------------------------------------
  function initProgress() {
    $('dstart').onclick = function () { G.sfx('ui'); startDaily(false); };
    $('dpractice').onclick = function () { G.sfx('ui'); startDaily(true); };
    $('dcopy').onclick = function () { copy($('dshare').textContent, $('dcopy'), 'Copy result'); };
    $('lcopy').onclick = function () { copy($('lcode').value, $('lcopy'), 'Copy code'); };
    $('lin').oninput = disarm;
    // 2 clicks: the code replaces the ledger of this browser
    $('lload').onclick = function () {
      var code = $('lin').value.trim(), ok;
      if (!code) { $('lmsg').textContent = 'Paste a save code first.'; return; }
      if (!armed) { armed = true; this.textContent = 'Click again: this replaces your ledger'; armT = setTimeout(disarm, 5000); return; }
      disarm();
      ok = L.importCode(code);
      $('lmsg').textContent = ok ? 'The ledger is loaded.' : 'This is not a valid save code. Your ledger did not change.';
      if (ok) { $('lin').value = ''; G.sfx('ready'); }
    };
    L.onChange(function () { drawTitle(); if (UI.overlay === 'ledger') drawLedger(); });
    setInterval(drawTitle, 60000);   // a new date gives a new Proving
    drawTitle();
  }

  A.openDaily = openDaily; A.startDaily = startDaily; A.openLedger = openLedger; A.drawTitle = drawTitle;
  A.gainHtml = gainHtml; A.shareText = shareText; A.dateLabel = dateLabel; A.copyText = copy; A.initProgress = initProgress;
  A.dailySetup = setup;
})();
