// Token Radar dashboard: board, detail, live-token and model views, no network, no framework.
//
// The page renders from window.RADAR (written by main.ts into data.js). The farm plans are
// generated here from the same rules as lib/model.ts, so the detail view's plan is the same
// plan board.json carries for that protocol. Hash routing: '' board, '#/live' live tokens,
// '#/model' the model, '#/detail/<slug>' one protocol, '#/?category=X&status=Y&sort=Z&q=…'
// a filtered board (the three screenshots use the board, a detail and a filtered view).
(function () {
  'use strict';
  var D = window.RADAR;
  var app = document.getElementById('app');
  if (!D || !app) return;

  /* ---------- small helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) {
    if (n == null) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return '$' + Math.round(n);
  }
  function moneyFull(n) { return n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US'); }
  function pct(n) {
    if (n == null) return '—';
    var s = (n > 0 ? '+' : '') + n.toFixed(2) + '%';
    return '<span class="' + (n < 0 ? 'neg' : n > 0 ? 'pos' : '') + '">' + s + '</span>';
  }
  function ageLabel(days) {
    if (days == null) return '—';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.round(days / 30) + 'mo';
    return (days / 365).toFixed(1) + 'y';
  }
  function bySlug(slug) {
    for (var i = 0; i < D.rows.length; i++) if (D.rows[i].slug === slug) return D.rows[i];
    return null;
  }
  function isWatch(slug) { return D.watchlist.indexOf(slug) >= 0; }

  /* ---------- farm plans: the same rules as lib/model.ts ---------- */
  function chainOf(r) { return r.chains && r.chains.length ? r.chains[0] : 'its main chain'; }
  function capitalFor(r) {
    if (r.tvl_usd >= 5e9) return 250;
    if (r.tvl_usd >= 1e9) return 150;
    if (r.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdFor(age) {
    if (age == null) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function catOf(r) { return (r.category || '').toLowerCase(); }
  function actionFor(r, capital, chain) {
    var c = catOf(r), name = r.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + '\'s main pool on ' + chain + ' and keep the position open.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Stake $' + capital + ' of the chain\'s staking asset through ' + name + ' and keep the receipt token.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedged position.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the vault shares.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return 'Mint $' + capital + ' of the protocol\'s yield-bearing asset on ' + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy active.';
    if (c.indexOf('payment') >= 0) return 'Route $' + capital + ' through ' + name + ' on ' + chain + ' and keep using it for a second payment.';
    if (c.indexOf('governance') >= 0) return 'Deposit $' + capital + ' into ' + name + ' on ' + chain + ' and delegate the voting power it gives you.';
    if (c.indexOf('chain') >= 0) return 'Bridge $' + capital + ' of USDC to the chain ' + name + ' runs on and use its flagship app.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function secondFor(r) {
    var c = catOf(r), name = r.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Borrow about 25% of your supply from ' + name + ', hold the loan for a week, then repay it in full.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Swap $25 through the ' + name + ' pool on ' + chainOf(r) + ' so the position shows trading activity as well as liquidity.';
    if (c.indexOf('bridge') >= 0) return 'Use the bridged funds in an app on ' + chainOf(r) + ', for example a swap or a deposit, instead of bridging straight back.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Claim or compound the staking rewards ' + name + ' pays and restake them in the same position.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Close the hedged position on ' + name + ', then open a fresh one half the size and hold it.';
    if (c.indexOf('prediction') >= 0) return 'Settle one market position on ' + name + ' and open a second one in a different market.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Leave the vault through one rebalancing on ' + name + ' and check the new allocation it reports.';
    if (c.indexOf('stable') >= 0) return 'Repay or redeem part of the stable position on ' + name + ' and keep the rest deposited.';
    if (c.indexOf('rwa') >= 0) return 'Hold the yield asset through one full payout cycle on ' + name + ' and record the yield it paid.';
    if (c.indexOf('insurance') >= 0) return 'Keep the policy through its first renewal date on ' + name + ' and check the cover it still gives.';
    if (c.indexOf('payment') >= 0) return 'Make a second payment of $25 through ' + name + ' on ' + chainOf(r) + ' a week after the first.';
    if (c.indexOf('governance') >= 0) return 'Vote on a second live proposal on ' + name + ' after your first delegation.';
    if (c.indexOf('chain') >= 0) return 'Use a second app on the chain ' + name + ' runs on, so the activity is not a single bridge.';
    return 'Make a second deposit of a different asset into ' + name + ' on ' + chainOf(r) + ' a week after the first.';
  }
  function farmSteps(r) {
    var chain = chainOf(r), capital = capitalFor(r), hold = holdFor(r.age_days);
    var steps = [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(r, capital, chain), cost: '$' + capital + ' of capital and about $' + (capital >= 150 ? 8 : 4) + ' of gas', time: '15 minutes to set up' },
      { text: secondFor(r), cost: 'about $3 of gas', time: '10 minutes' },
      { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: 'Before you withdraw, open the protocol\'s own points or rewards page and claim only from the link it publishes.', cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Never open a claim link from a direct message or a social post: type the protocol\'s own domain yourself, and revoke any approval you no longer use.', cost: 'a few dollars of gas to revoke', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction hash in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' }
    ];
    return steps.map(function (s) {
      var t = s.text + ' Cost: ' + s.cost + '. Time: ' + s.time + '.';
      return { text: s.text, cost: s.cost, time: s.time, full: t };
    });
  }

  /* ---------- shared chrome ---------- */
  function header(active) {
    return '<header class="mast"><h1>Token Radar<span class="dot">.</span></h1>' +
      '<p>Pre-token protocols ranked by what their token would be worth if the protocol&rsquo;s record stayed as it is. Snapshot ' + esc(D.as_of) + ' &middot; DefiLlama, ' + esc(D.source.replace(/^DefiLlama /, '')) + '.</p>' +
      '<div class="stats"><span><b>' + D.board_size + '</b> ranked</span><span><b>' + D.watchlist_size + '</b> watchlist</span><span><b>' + D.early_size + '</b> early finds</span><span><b>' + D.live_size + '</b> live tokens</span><span><b>' + D.calibration.global_median + '&times;</b> market multiple</span></div></header>' +
      '<nav class="tabs"><a href="#/" class="' + (active === 'board' ? 'on' : '') + '">Board</a>' +
      '<a href="#/live" class="' + (active === 'live' ? 'on' : '') + '">Live tokens</a>' +
      '<a href="#/model" class="' + (active === 'model' ? 'on' : '') + '">The model</a></nav>';
  }
  function modelStrip() {
    return '<div class="model-strip"><b>How a row is valued:</b> implied value = TVL &times; market multiple &times; growth &times; maturity &times; chains. ' +
      'The multiple is measured from the protocols that already trade &mdash; the median market-cap / TVL is <code>' + D.calibration.global_median + '&times;</code> across ' + D.calibration.live_comps + ' live protocols, with a category&rsquo;s own median where at least ' + D.model.min_category_comps + ' live protocols trade in it. ' +
      'No protocol name is special-cased. <a href="#/model">See the model &amp; the calibration table</a>.</div>';
  }
  function footer() {
    return '<footer class="foot">Token Radar ' + esc(D.model_version) + ' &middot; snapshot ' + esc(D.as_of) + ' &middot; ' + esc(D.source) + '. ' +
      'Implied values are this radar&rsquo;s own claim from the snapshot&rsquo;s figures, never a prediction that a token will be issued or when. ' +
      'Farm steps are general guidance: check the protocol&rsquo;s own page before you act, and never pay to claim.</footer>';
  }

  /* ---------- board view ---------- */
  var state = { q: '', category: '', chain: '', status: '', sort: 'implied' };
  function categories() {
    var seen = {}, out = [];
    D.rows.forEach(function (r) { var c = r.category || 'Uncategorised'; if (!seen[c]) { seen[c] = 1; out.push(c); } });
    return out.sort();
  }
  function chains() {
    var seen = {}, out = [];
    D.rows.forEach(function (r) { (r.chains || []).forEach(function (c) { if (!seen[c]) { seen[c] = 1; out.push(c); } }); });
    return out.sort();
  }
  function filteredRows() {
    var q = state.q.toLowerCase();
    var rows = D.rows.filter(function (r) {
      if (state.category && (r.category || 'Uncategorised') !== state.category) return false;
      if (state.chain && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (state.status === 'watchlist' && !isWatch(r.slug)) return false;
      if (state.status === 'early' && isWatch(r.slug)) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var s = state.sort;
    rows.sort(function (a, b) {
      if (s === 'tvl') return b.tvl_usd - a.tvl_usd;
      if (s === 'growth') return (b.change_7d || 0) - (a.change_7d || 0);
      if (s === 'age') return (b.age_days || 0) - (a.age_days || 0);
      return a.rank - b.rank;
    });
    return rows;
  }
  function boardView() {
    var rows = filteredRows();
    var opts = function (list, cur, all) {
      var h = '<option value="">' + all + '</option>';
      list.forEach(function (v) { h += '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(v) + '</option>'; });
      return h;
    };
    var h = '<div class="wrap">' + header('board') + modelStrip() +
      '<div class="controls"><input type="search" id="q" placeholder="Search a protocol…" value="' + esc(state.q) + '" aria-label="Search">' +
      '<label>Category <select id="fcat">' + opts(categories(), state.category, 'All categories') + '</select></label>' +
      '<label>Chain <select id="fchain">' + opts(chains(), state.chain, 'All chains') + '</select></label>' +
      '<label>Board <select id="fstatus"><option value="">All rows</option><option value="watchlist"' + (state.status === 'watchlist' ? ' selected' : '') + '>Watchlist only</option><option value="early"' + (state.status === 'early' ? ' selected' : '') + '>Early finds only</option></select></label>' +
      '<label>Sort <select id="fsort"><option value="implied"' + (state.sort === 'implied' ? ' selected' : '') + '>Implied value</option><option value="tvl"' + (state.sort === 'tvl' ? ' selected' : '') + '>TVL</option><option value="growth"' + (state.sort === 'growth' ? ' selected' : '') + '>7-day growth</option><option value="age"' + (state.sort === 'age' ? ' selected' : '') + '>Age</option></select></label>' +
      '<span class="count">' + rows.length + ' of ' + D.rows.length + ' rows</span></div>' +
      '<table class="board"><thead><tr><th>#</th><th>Protocol</th><th>Category</th><th class="num">TVL</th><th class="num">7d</th><th class="num">Age</th><th class="num">Implied value</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr data-slug="' + esc(r.slug) + '"><td class="rk">' + r.rank + '</td>' +
        '<td class="nm">' + esc(r.name) + '<small>' + esc(r.slug) + '</small></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td><td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + ageLabel(r.age_days) + '</td>' +
        '<td class="num imp">' + money(r.implied_value_usd) + (isWatch(r.slug) ? '<span class="tag watch">watchlist</span>' : '<span class="tag early">early</span>') + '</td></tr>';
    });
    h += '</tbody></table>' + footer() + '</div>';
    app.innerHTML = h;
    app.setAttribute('aria-busy', 'false');
    document.getElementById('q').addEventListener('input', function (e) { state.q = e.target.value; syncHash(); render(); });
    document.getElementById('fcat').addEventListener('change', function (e) { state.category = e.target.value; syncHash(); render(); });
    document.getElementById('fchain').addEventListener('change', function (e) { state.chain = e.target.value; syncHash(); render(); });
    document.getElementById('fstatus').addEventListener('change', function (e) { state.status = e.target.value; syncHash(); render(); });
    document.getElementById('fsort').addEventListener('change', function (e) { state.sort = e.target.value; syncHash(); render(); });
    var trs = app.querySelectorAll('tbody tr');
    for (var i = 0; i < trs.length; i++) {
      trs[i].addEventListener('click', function () { location.hash = '#/detail/' + this.getAttribute('data-slug'); });
    }
    var qEl = document.getElementById('q');
    if (state.q) { qEl.focus(); qEl.setSelectionRange(qEl.value.length, qEl.value.length); }
  }
  function syncHash() {
    var p = [];
    if (state.q) p.push('q=' + encodeURIComponent(state.q));
    if (state.category) p.push('category=' + encodeURIComponent(state.category));
    if (state.chain) p.push('chain=' + encodeURIComponent(state.chain));
    if (state.status) p.push('status=' + state.status);
    if (state.sort !== 'implied') p.push('sort=' + state.sort);
    var h = '#/' + (p.length ? '?' + p.join('&') : '');
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  /* ---------- detail view ---------- */
  function calibrationRowFor(category) {
    for (var i = 0; i < D.calibration.rows.length; i++) if (D.calibration.rows[i].category === (category || 'Uncategorised')) return D.calibration.rows[i];
    return null;
  }
  function compsFor(category) {
    for (var i = 0; i < D.live_by_category.length; i++) if (D.live_by_category[i].category === (category || 'Uncategorised')) return D.live_by_category[i].comps;
    return [];
  }
  function detailView(slug) {
    var r = bySlug(slug);
    if (!r) {
      app.innerHTML = '<div class="wrap">' + header('board') + '<p class="note">No protocol on this board has the slug <b>' + esc(slug) + '</b>.</p><p><a href="#/">&larr; Back to the board</a></p>' + footer() + '</div>';
      app.setAttribute('aria-busy', 'false');
      return;
    }
    var steps = farmSteps(r);
    var base = r.tvl_usd * r.multiple;
    var cal = calibrationRowFor(r.category);
    var comps = compsFor(r.category);
    var h = '<div class="wrap detail">' + header('board') +
      '<p><a class="back" href="#/">&larr; Back to the board</a></p>' +
      '<h2>' + esc(r.name) + ' <span class="tag ' + (isWatch(r.slug) ? 'watch' : 'early') + '">' + (isWatch(r.slug) ? 'watchlist' : 'early find') + '</span></h2>' +
      '<p class="sub">Rank #' + r.rank + ' of ' + D.rows.length + ' &middot; ' + esc(r.category || 'Uncategorised') + ' &middot; ' + esc((r.chains || []).join(', ') || '—') + ' &middot; tracked since ' + esc(r.listed_at || 'unknown') + '.</p>' +
      '<div class="cards">' +
      '<div class="card"><span>Implied value</span><b>' + moneyFull(r.implied_value_usd) + '</b><small>if the record stayed as it is</small></div>' +
      '<div class="card"><span>TVL</span><b>' + moneyFull(r.tvl_usd) + '</b><small>total value locked</small></div>' +
      '<div class="card"><span>7-day change</span><b>' + (r.change_7d == null ? '—' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(2) + '%') + '</b><small>TVL change, 7 days</small></div>' +
      '<div class="card"><span>Age with no token</span><b>' + ageLabel(r.age_days) + '</b><small>' + (r.age_days == null ? 'listed date unknown' : r.age_days + ' days tracked') + '</small></div>' +
      '</div>' +
      '<h3 class="sec">Why this value</h3>' +
      '<table class="math"><thead><tr><th>Step</th><th class="num">Figure</th><th>What it is</th></tr></thead><tbody>' +
      '<tr><td>TVL</td><td class="num">' + moneyFull(r.tvl_usd) + '</td><td>The protocol&rsquo;s locked value on ' + esc(D.as_of) + '.</td></tr>' +
      '<tr><td>&times; market multiple</td><td class="num">' + r.multiple + '&times;</td><td>' + (cal && cal.from_category ? 'Median market-cap / TVL of ' + cal.comps + ' live ' + esc(r.category || '') + ' protocols (' + cal.median + '&times;), shrunk toward the market median.' : 'Market-wide median of ' + D.calibration.live_comps + ' live protocols: this category has too few live protocols of its own.') + '</td></tr>' +
      '<tr><td>= base value</td><td class="num">' + moneyFull(base) + '</td><td>What the locked value alone would price the token at.</td></tr>' +
      '<tr><td>&times; growth</td><td class="num">' + r.growth_multiplier + '&times;</td><td>Seven-day TVL change ' + (r.change_7d == null ? 'unreported' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(2) + '%') + ', clamped to &minus;60%…+120%.</td></tr>' +
      '<tr><td>&times; maturity</td><td class="num">' + r.maturity_multiplier + '&times;</td><td>' + (r.age_days == null ? 'Age unknown, counted as one year.' : 'Running ' + r.age_days + ' days with no token yet.') + '</td></tr>' +
      '<tr><td>&times; chains</td><td class="num">' + r.chain_multiplier + '&times;</td><td>Present on ' + (r.chains || []).length + ' chain' + ((r.chains || []).length === 1 ? '' : 's') + '.</td></tr>' +
      '<tr class="tot"><td>Implied value</td><td class="num">' + moneyFull(r.implied_value_usd) + '</td><td>The radar&rsquo;s own claim, from the snapshot&rsquo;s figures alone.</td></tr>' +
      '</tbody></table>';
    if (comps.length) {
      h += '<h3 class="sec">Live comparables in ' + esc(r.category || 'Uncategorised') + '</h3>' +
        '<p class="note">Protocols in the same category that already trade &mdash; the market the multiple is measured from. Highest multiple first.</p>' +
        '<table class="math"><thead><tr><th>Protocol</th><th class="num">Market-cap / TVL</th></tr></thead><tbody>';
      comps.forEach(function (c) { h += '<tr><td>' + esc(c.name) + '</td><td class="num">' + c.ratio + '&times;</td></tr>'; });
      h += '</tbody></table>';
    }
    h += '<h3 class="sec">How to farm it</h3>' +
      '<div class="callout">This plan never claims ' + esc(r.name) + ' runs a points program or will issue a token. Check the protocol&rsquo;s own page before you act, and never pay to claim.</div>' +
      '<ol class="steps">';
    steps.forEach(function (s) {
      h += '<li>' + esc(s.text) + '<div class="meta"><span class="chip">Cost: <b>' + esc(s.cost) + '</b></span><span class="chip">Time: <b>' + esc(s.time) + '</b></span></div></li>';
    });
    h += '</ol>' + footer() + '</div>';
    app.innerHTML = h;
    app.setAttribute('aria-busy', 'false');
    window.scrollTo(0, 0);
  }

  /* ---------- live view ---------- */
  function liveView() {
    var h = '<div class="wrap">' + header('live') + modelStrip() +
      '<p class="note">These protocols already trade, so the board shows the market&rsquo;s own value for them &mdash; their market cap &mdash; never a model&rsquo;s. They are the comparables the radar&rsquo;s multiples are measured from.</p>' +
      '<table class="board"><thead><tr><th>#</th><th>Protocol</th><th>Category</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Mcap / TVL</th><th class="num">7d</th></tr></thead><tbody>';
    D.live.forEach(function (p, i) {
      var ratio = p.mcap_usd && p.tvl_usd ? (p.mcap_usd / p.tvl_usd).toFixed(2) + '&times;' : '—';
      h += '<tr><td class="rk">' + (i + 1) + '</td><td class="nm">' + esc(p.name) + '<small>' + esc(p.slug) + '</small></td><td>' + esc(p.category || '—') + '</td>' +
        '<td class="num">' + money(p.tvl_usd) + '</td><td class="num">' + money(p.mcap_usd) + '</td><td class="num">' + ratio + '</td><td class="num">' + pct(p.change_7d) + '</td></tr>';
    });
    h += '</tbody></table>' + footer() + '</div>';
    app.innerHTML = h;
    app.setAttribute('aria-busy', 'false');
    window.scrollTo(0, 0);
  }

  /* ---------- model view + sandbox ---------- */
  function modelView() {
    var m = D.model;
    var h = '<div class="wrap">' + header('model') +
      '<p>The implied value is computed from the snapshot&rsquo;s own figures only. No protocol name is special-cased: the same function scores every row, and the same calibration is measured from the snapshot at every run.</p>' +
      '<h3 class="sec">The formula</h3>' +
      '<div class="model-strip"><b>implied = TVL &times; multiple &times; growth &times; maturity &times; chains</b><br>' +
      'multiple: the category&rsquo;s market multiple (below), or the market-wide median where the category has fewer than ' + m.min_category_comps + ' live protocols.<br>' +
      'growth: 1 + clamp(7-day TVL change, ' + m.growth_floor + '%, ' + m.growth_cap + '%) / 100 &times; ' + m.growth_weight + '.<br>' +
      'maturity: ' + m.maturity_floor + ' + min(age, ' + m.maturity_days + ' days) / ' + m.maturity_days + ' &times; ' + m.maturity_range + ' (age unknown: ' + m.unknown_age_days + ' days).<br>' +
      'chains: 1 + ' + m.chain_bonus + ' &times; min(chains &minus; 1, ' + m.chain_bonus_cap + '). Multiples are capped to ' + m.multiple_cap_lo + '&times;&hellip;' + m.multiple_cap_hi + '&times;.</div>' +
      '<h3 class="sec">Calibration: market multiples by category</h3>' +
      '<p class="note">Measured from the ' + D.calibration.live_comps + ' live protocols with a market cap and a TVL (centralised exchanges excluded). A category&rsquo;s multiple is its live median shrunk toward the market-wide median of ' + D.calibration.global_median + '&times;; a thin category uses the market-wide median.</p>' +
      '<table class="math"><thead><tr><th>Category</th><th class="num">Live comps</th><th class="num">Live median</th><th class="num">Multiple used</th></tr></thead><tbody>';
    D.calibration.rows.forEach(function (r) {
      h += '<tr><td>' + esc(r.category) + '</td><td class="num">' + r.comps + '</td><td class="num">' + (r.median == null ? '—' : r.median + '&times;') + '</td><td class="num">' + r.multiple + '&times;' + (r.from_category ? '' : ' <span class="note">(market median)</span>') + '</td></tr>';
    });
    h += '</tbody></table>' +
      '<h3 class="sec">Model sandbox</h3>' +
      '<p class="note">Change a constant and see the top 10 move. This is an explorer only: the submitted board uses the constants above.</p>' +
      '<div class="sandbox">' +
      '<label>Growth weight <b id="v-gw">' + m.growth_weight + '</b><input type="range" id="s-gw" min="0" max="1" step="0.05" value="' + m.growth_weight + '"></label>' +
      '<label>Maturity floor <b id="v-mf">' + m.maturity_floor + '</b><input type="range" id="s-mf" min="0.3" max="0.8" step="0.05" value="' + m.maturity_floor + '"></label>' +
      '<label>Chain bonus <b id="v-cb">' + m.chain_bonus + '</b><input type="range" id="s-cb" min="0" max="0.05" step="0.005" value="' + m.chain_bonus + '"></label>' +
      '<div class="out" id="sandbox-out"></div></div>' + footer() + '</div>';
    app.innerHTML = h;
    app.setAttribute('aria-busy', 'false');
    var run = function () {
      var gw = parseFloat(document.getElementById('s-gw').value);
      var mf = parseFloat(document.getElementById('s-mf').value);
      var cb = parseFloat(document.getElementById('s-cb').value);
      document.getElementById('v-gw').textContent = gw.toFixed(2);
      document.getElementById('v-mf').textContent = mf.toFixed(2);
      document.getElementById('v-cb').textContent = cb.toFixed(3);
      var rescored = D.rows.map(function (r) {
        var g = Math.min(m.growth_cap, Math.max(m.growth_floor, r.change_7d || 0));
        var gm = 1 + (g / 100) * gw;
        var age = r.age_days == null ? m.unknown_age_days : r.age_days;
        var mm = mf + (Math.min(Math.max(age, 0), m.maturity_days) / m.maturity_days) * m.maturity_range;
        var cm = 1 + cb * Math.min(Math.max((r.chains || []).length - 1, 0), m.chain_bonus_cap);
        return { slug: r.slug, name: r.name, v: Math.max(1, Math.round(r.tvl_usd * r.multiple * gm * mm * cm)) };
      }).sort(function (a, b) { return b.v - a.v; });
      var top = rescored.slice(0, 10).map(function (r, i) { return (i + 1) + '. ' + r.name + ' (' + money(r.v) + ')'; }).join('<br>');
      var moved = 0;
      rescored.slice(0, 10).forEach(function (r, i) { var orig = D.rows[i]; if (orig && orig.slug !== r.slug) moved++; });
      document.getElementById('sandbox-out').innerHTML = '<b>Top 10 under these constants:</b><br>' + top + '<br><span class="note">' + moved + ' of the top 10 changed places.</span>';
    };
    ['s-gw', 's-mf', 's-cb'].forEach(function (id) { document.getElementById(id).addEventListener('input', run); });
    run();
    window.scrollTo(0, 0);
  }

  /* ---------- routing ---------- */
  function parseHash() {
    var raw = location.hash || '#/';
    if (raw.indexOf('#/detail/') === 0) return { view: 'detail', slug: decodeURIComponent(raw.slice(10).split('?')[0]) };
    if (raw === '#/live') return { view: 'live' };
    if (raw === '#/model') return { view: 'model' };
    var q = raw.indexOf('?') >= 0 ? raw.slice(raw.indexOf('?') + 1) : '';
    var params = {};
    q.split('&').forEach(function (pair) {
      var kv = pair.split('=');
      if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    state.q = params.q || '';
    state.category = params.category || '';
    state.chain = params.chain || '';
    state.status = params.status || '';
    state.sort = params.sort || 'implied';
    return { view: 'board' };
  }
  function render() {
    var r = parseHash();
    if (r.view === 'detail') detailView(r.slug);
    else if (r.view === 'live') liveView();
    else if (r.view === 'model') modelView();
    else boardView();
  }
  window.addEventListener('hashchange', render);
  render();
})();
