// ═══════════════════════════════════════════════════════════════════
//  OREO DASHBOARD  —  script.js
//  Drop in alongside oreo-dashboard.html.
//  Set DATA_URL below to point at your JSON file (or inline it).
// ═══════════════════════════════════════════════════════════════════

const DATA_URL = './assets/data/ratings.json';

// ─── GLOBALS (populated after load) ────────────────────────────────
let FLAVORS   = [];   // [{id, name, type, tags, avgRating, stddev, reviews:[{name,rating,comment}]}]
let REVIEWERS = [];   // [{id, name, initials, color, avgRating, stddev, bias, coverage, highest, lowest}]

// ═══════════════════════════════════════════════════════════════════
//  PARSE JSON → internal structures
// ═══════════════════════════════════════════════════════════════════
function parseData(raw) {
  const flavorList   = [];
  const reviewerMap  = {}; // name → { ratings:[], comments:{} }
  let   flavorId     = 0;

  for (const [flavorName, entries] of Object.entries(raw)) {
    // Split Average (metadata) from individual reviews
    const avgEntry     = entries.find(e => e.Name === 'Average');
    const reviewEntries = entries.filter(e => e.Name !== 'Average');

    // Flavor metadata from the Average entry
    const wafers = (avgEntry?.Wafers ?? []).map(t => t.toLowerCase().trim());
    const type = (avgEntry?.Type ?? 'original').toLowerCase().trim();
    const tags = (avgEntry?.Tags ?? []).map(t => t.toLowerCase().trim());
    const avgComment = avgEntry?.Comment ?? '';
    const image = avgEntry?.Image ?? null;

    // Collect all individual ratings for this flavor
    const individualRatings = reviewEntries
      .filter(e => typeof e.Rating === 'number')
      .map(e => e.Rating);

    const avgEntryRating = avgEntry?.Rating === 'N/A'
      ? null
      : parseFloat(avgEntry?.Rating);

    // Unrated: no usable average AND no individual ratings
    const isUnrated = avgEntryRating === null && individualRatings.length === 0;

    // avgOnly: has a numeric average but no individual reviewer ratings recorded
    const isAvgOnly = !isUnrated && avgEntryRating !== null && individualRatings.length === 0;

    // Compute avg (prefer Average entry rating; fall back to mean of individuals)
    const avgRating = isUnrated
      ? null
      : avgEntryRating !== null
        ? avgEntryRating
        : individualRatings.reduce((s, r) => s + r, 0) / individualRatings.length;

    // Compute standard deviation (null for avgOnly — nothing to compare)
    const stddev = isUnrated || isAvgOnly ? null : computeStddev(individualRatings, avgRating);

    // Controversy classification (null for avgOnly)
    const controversy = isUnrated ? 'none' : isAvgOnly ? null : stddev >= 2.0 ? 'high' : stddev >= 1.3 ? 'moderate' : 'low';

    // Build reviews array (sorted high→low)
    const reviews = reviewEntries
      .filter(e => typeof e.Rating === 'number')
      .map(e => ({ name: e.Name, rating: e.Rating, comment: e.Comment ?? '' }))
      .sort((a, b) => b.rating - a.rating);

    flavorList.push({
      id:          ++flavorId,
      name:        flavorName,
      wafers,
      type,
      tags,
      image,
      unrated:     isUnrated,
      avgOnly:     isAvgOnly,
      avgRating:   isUnrated ? null : +avgRating.toFixed(2),
      stddev:      stddev !== null ? +stddev.toFixed(2) : null,
      controversy,
      notes:       avgComment,
      reviews,     // real per-reviewer data
    });

    // Accumulate per-reviewer stats
    for (const entry of reviewEntries) {
      if (typeof entry.Rating !== 'number') continue;
      const rname = entry.Name;
      if (!reviewerMap[rname]) reviewerMap[rname] = { ratings: {}, comments: {} };
      reviewerMap[rname].ratings[flavorName]  = entry.Rating;
      reviewerMap[rname].comments[flavorName] = entry.Comment ?? '';
    }
  }

  // ── Build REVIEWERS array from accumulated data ──────────────────
  const ratedList = flavorList.filter(f => !f.unrated);
  const globalAvg = ratedList.length ? ratedList.reduce((s, f) => s + f.avgRating, 0) / ratedList.length : 0;
  let reviewerId = 0;

  const reviewerList = Object.entries(reviewerMap).map(([rname, data]) => {
    const ratingValues = Object.values(data.ratings);
    const rAvg    = ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length;
    const rStddev = computeStddev(ratingValues, rAvg);

    // Sort their flavors to find highest/lowest
    const sorted = Object.entries(data.ratings).sort((a, b) => b[1] - a[1]);
    const highest = sorted[0]?.[0] ?? '—';
    const lowest  = sorted[sorted.length - 1]?.[0] ?? '—';

    // Bias = reviewer avg minus global flavor avg
    const bias = +(rAvg - globalAvg).toFixed(2);

    const initials = rname.trim().split(/\s+/).map(w => w[0].toUpperCase()).join('').slice(0, 2);

    return {
      id:       ++reviewerId,
      name:     rname,
      initials,
      color:    '#1d4ed8',
      avgRating: +rAvg.toFixed(2),
      stddev:   +rStddev.toFixed(2),
      bias,
      coverage: ratingValues.length,
      highest,
      lowest,
      ratings:  data.ratings,   // { flavorName: rating }
      comments: data.comments,  // { flavorName: comment }
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  return { flavorList, reviewerList };
}

// ─── HELPERS ───────────────────────────────────────────────────────
function computeStddev(values, mean) {
  if (values.length < 2) return 0;
  const avg = mean ?? values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function capitalize(s) {
  return s 
    ? s.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') 
    : '';
}

function initials2(name) {
  return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).join('').slice(0, 2);
}

// ═══════════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════════
const pageTitles = {
  overview:  'Overview',
  flavors:   'Flavor Analytics',
  reviewers: 'Reviewer Analytics'
};
let currentPage = 'overview';

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    const txt = n.textContent.trim().toLowerCase();
    n.classList.toggle('active', txt.includes(page));
  });
  document.querySelectorAll('.view-tab').forEach(t => {
    t.classList.toggle('active', t.textContent.toLowerCase().trim() === page);
  });
  document.getElementById('page-title').textContent = pageTitles[page].toUpperCase() || page.toUpperCase();
  currentPage = page;
  closeSidebar();

  // If navigating to flavors with no flavor selected, re-render grid with current filters
  if (page === 'flavors' && !document.getElementById('flavor-select').value) {
    renderFlavorGrid(getFilteredFlavors());
  }

  document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════════════
//  OVERVIEW STAT CARDS (dynamic)
// ═══════════════════════════════════════════════════════════════════
function updateOverviewStats() {
  const ratedFlavors = FLAVORS.filter(f => !f.unrated);
  const allRatings = ratedFlavors.flatMap(f => f.reviews.map(r => r.rating));
  const globalAvg  = allRatings.length ? allRatings.reduce((s, v) => s + v, 0) / allRatings.length : 0;
  const topFlavor  = [...ratedFlavors].sort((a, b) => b.avgRating - a.avgRating)[0];
  const botFlavor  = [...ratedFlavors].sort((a, b) => a.avgRating - b.avgRating)[0];
  const mostDiv    = [...ratedFlavors].sort((a, b) => b.stddev - a.stddev)[0];

  setStatCard('stat-total-flavors',   FLAVORS.length,             'across all types');
  setStatCard('stat-total-reviewers', REVIEWERS.length,           'active contributors');
  setStatCard('stat-global-avg',      globalAvg.toFixed(2),       'out of 10');
  setStatCard('stat-most-loved',      topFlavor?.name + ` (${capitalize(topFlavor?.type)})` ?? '—',     `average of ${topFlavor?.avgRating.toFixed(2)} / 10`, true);
  setStatCard('stat-most-hated',      botFlavor?.name + ` (${capitalize(botFlavor?.type)})` ?? '—',     `average of ${botFlavor?.avgRating.toFixed(2)} / 10`, true);
  setStatCard('stat-most-divisive',   mostDiv?.name + ` (${capitalize(mostDiv?.type)})` ?? '—',     `standard deviation of ${mostDiv?.stddev.toFixed(2)}`, true);
}

function setStatCard(id, value, sub, small = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector('.stat-value').textContent = value;
  //if (small) el.querySelector('.stat-value').style.fontSize = '18px';
  el.querySelector('.stat-sub').textContent   = sub;
}

// ═══════════════════════════════════════════════════════════════════
//  POPULATE SELECTS
// ═══════════════════════════════════════════════════════════════════
function populateReviewerSelect() {
  const sel = document.getElementById('reviewer-select');
  sel.innerHTML = '<option value="">— all reviewers —</option>';
  REVIEWERS.forEach(r => {
    const opt = document.createElement('option');
    opt.value       = r.id;
    opt.textContent = r.name;
    sel.appendChild(opt);
  });
  // Render the default grid view
  renderReviewerGrid();
}

// Populate the wafer filter tags dynamically from actual data
function populateWaferFilters() {
  // flavors store `wafers` as an array; flatten before deduping
  const wafers = [...new Set(FLAVORS.flatMap(f => f.wafers))].filter(Boolean).sort();
  const container = document.getElementById('wafer-filters');
  container.innerHTML = `<div class="filter-tag active" data-wafer="all" onclick="toggleWaferFilter(this,'all')">All</div>`;
  wafers.forEach(t => {
    const tag = document.createElement('div');
    tag.className    = 'filter-tag';
    tag.dataset.wafer = t;
    tag.textContent  = t.toLowerCase() == 'cocoa (default)' ? 'Cocoa (Default)' : capitalize(t);
    tag.onclick      = () => toggleWaferFilter(tag, t);
    container.appendChild(tag);
  });
}

// Populate the type filter tags dynamically from actual data
function populateTypeFilters() {
  const types = [...new Set(FLAVORS.map(f => f.type))].sort();
  const container = document.getElementById('type-filters');
  container.innerHTML = `<div class="filter-tag active" data-type="all" onclick="toggleTypeFilter(this,'all')">All</div>`;
  types.forEach(t => {
    const tag = document.createElement('div');
    tag.className  = 'filter-tag';
    tag.dataset.type = t;
    tag.textContent = capitalize(t);
    tag.onclick    = () => toggleTypeFilter(tag, t);
    container.appendChild(tag);
  });
}

// Populate ingredient/tag filter as multi-select pills
function populateIngredientFilter() {
  const allTags = [...new Set(FLAVORS.flatMap(f => f.tags))].sort();
  const container = document.getElementById('tag-filters');
  if (!container) return;
  container.innerHTML = '';

  const allPill = document.createElement('div');
  allPill.className = 'filter-tag tag-filter-all active';
  allPill.dataset.tag = 'all';
  allPill.textContent = 'All';
  allPill.onclick = () => clearTagFilters();
  container.appendChild(allPill);

  allTags.forEach(t => {
    const pill = document.createElement('div');
    pill.className = 'filter-tag tag-filter-pill';
    pill.dataset.tag = t;
    pill.textContent = capitalize(t);
    pill.onclick = () => toggleTagFilter(t);
    container.appendChild(pill);
  });
}

function clearTagFilters() {
  activeTagFilters = new Set();
  document.querySelectorAll('.tag-filter-pill').forEach(t => t.classList.remove('active'));
  document.querySelector('.tag-filter-all')?.classList.add('active');
  applyFilters();
}

// ═══════════════════════════════════════════════════════════════════
//  CHART HELPERS
// ═══════════════════════════════════════════════════════════════════
function getChartColors() {
  const dark = document.body.classList.contains('dark');
  return {
    primary:   dark ? '#3b82f6'                   : '#2563eb',
    secondary: '#93c5fd',
    grid:      dark ? '#1e293b'                   : '#e8ebf0',
    axis:      dark ? 'rgba(255,255,255,0.55)'    : '#8a9bb0',
    text:      dark ? '#cbd5e1'                   : '#596677',
    dotHigh:   dark ? 'rgba(0, 255, 255, 0.65)'   : 'rgba(0, 221, 255, 0.50)',
    dotTop:    dark ? 'rgba(59, 130, 246, 0.70)'  : 'rgba(0, 98, 255, 0.50)',
    dotBase:   dark ? 'rgba(99, 132, 255, 0.65)'  : 'rgba(8, 13, 173, 0.50)',
    // Color used for the "Average" reference line on flavor details
    avgLine:   dark ? '#e8ebf0'                   : '#1e293b',
  };
}

// Convenience accessor for inline colour references (e.g. CHART_COLORS.text)
const CHART_COLORS = {
  get text()    { return getChartColors().text; },
  get grid()    { return getChartColors().grid; },
  get avgLine() { return getChartColors().avgLine; },
  get axis()    { return getChartColors().axis; },
};

function getBaseChartOptions() {
  const c = getChartColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a2f6b',
        titleFont: { family: 'DM Mono', size: 11 },
        bodyFont:  { family: 'DM Mono', size: 11 },
        padding:      10,
        cornerRadius:  8,
      },
    },
    layout: { padding: { left: 12, right: 8, top: 8, bottom: 8 } },
    scales: {
      x: {
        grid:   { display: false },
        border: { color: CHART_COLORS.axis },
        ticks: {
          font: { family: 'DM Mono', size: 9 },
          color: c.text,
          maxRotation: 90,
          minRotation: 0,
          autoSkip: false,
        },
      },
      y: {
        grid:   { display: false },
        border: { color: CHART_COLORS.axis },
        ticks: { font: { family: 'DM Mono', size: 9 }, color: c.text },
      },
    },
  };
}

// Thin shim so the few spread sites that use ...baseChartOptions still work.
// We make it a real object with the right shape each time it's first accessed
// in a given synchronous task, by using a getter that returns a fresh snapshot.
const baseChartOptions = {
  get responsive()         { return getBaseChartOptions().responsive; },
  get maintainAspectRatio(){ return getBaseChartOptions().maintainAspectRatio; },
  get plugins()            { return getBaseChartOptions().plugins; },
  get layout()             { return getBaseChartOptions().layout; },
  get scales()             { return getBaseChartOptions().scales; },
};

const charts = {};

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

// ═══════════════════════════════════════════════════════════════════
//  OVERVIEW CHARTS
// ═══════════════════════════════════════════════════════════════════
function initOverviewCharts() {
  buildTypeChart(FLAVORS);
  buildWaferChart(FLAVORS);
  buildScatterChart(FLAVORS);
  buildLeaderboards(FLAVORS);
  buildAllFlavorsChart(FLAVORS);
}

function buildTopFlavorsChart(flavors) {
  const top = [...flavors].filter(f => !f.unrated).sort((a, b) => b.avgRating - a.avgRating).slice(0, 10);
  destroyChart('topFlavors');
  charts['topFlavors'] = new Chart(document.getElementById('topFlavorsChart'), {
    type: 'bar',
    data: {
      labels:   top.map(f => f.name),
      datasets: [{
        data:            top.map(f => f.avgRating),
        backgroundColor: top.map((_, i) => i === 0 ? '#1e40af' : i < 3 ? '#2563eb' : '#93c5fd'),
        borderRadius:    6,
        borderSkipped:   false,
      }],
    },
    options: {
      ...baseChartOptions,
      plugins: {
        ...baseChartOptions.plugins,
        tooltip: {
          ...baseChartOptions.plugins.tooltip,
          callbacks: { label: ctx => `\t${ctx.parsed.y.toFixed(2)} / 10` },
        },
      },
      scales: { ...baseChartOptions.scales, y: { ...baseChartOptions.scales.y, min: 0, max: 10 } },
    },
  });
}

function buildDistChart(flavors) {
  const bins = Array(10).fill(0);
  flavors.filter(f => !f.unrated).forEach(f => { bins[Math.min(9, Math.floor(f.avgRating))]++; });
  destroyChart('dist');
  charts['dist'] = new Chart(document.getElementById('distChart'), {
    type: 'bar',
    data: {
      labels:   ['0–1','1–2','2–3','3–4','4–5','5–6','6–7','7–8','8–9','9–10'],
      datasets: [{
        data:            bins,
        backgroundColor: bins.map((_, i) => i < 3 ? '#dbeafe' : i < 5 ? '#93c5fd' : i < 7 ? '#2563eb' : '#1e40af'),
        borderRadius:    6,
        borderSkipped:   false,
      }],
    },
    options: { 
        ...baseChartOptions, 
        scales: {
            ...baseChartOptions.scales,
            x: {
                ticks: {
                    font: { family: 'DM Mono', size: 9 },
                    color: CHART_COLORS.text,
                    maxRotation: 0,
                    minRotation: 0,
                    autoSkip: false,
                }
            }
        },
        plugins: { ...baseChartOptions.plugins, legend: { display: false } } },
  });
}

function buildTypeChart(flavors) {
  // Only include types that appear in the current set (rated only)
  const ratedFlavors = flavors.filter(f => !f.unrated);
  const typeSet  = [...new Set(ratedFlavors.map(f => f.type))].sort();
  const typeAvgs = typeSet.map(t => {
    const tf = ratedFlavors.filter(f => f.type === t);
    return tf.length ? +(tf.reduce((s, f) => s + f.avgRating, 0) / tf.length).toFixed(2) : 0;
  });
  const blues = ['#002998', '#0835b0', '#1140c0', '#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#e0f2fe'];
  destroyChart('type');
  charts['type'] = new Chart(document.getElementById('typeChart'), {
    type: 'bar',
    data: {
      labels:   typeSet.map(capitalize),
      datasets: [{
        data:            typeAvgs,
        backgroundColor: typeSet.map((_, i) => blues[i % blues.length]),
        borderRadius:    6,
        borderSkipped:   false,
      }],
    },
    options: {
      ...baseChartOptions,
      scales: {
        ...baseChartOptions.scales,
        y: {
          ...baseChartOptions.scales.y,
          min: 0,
          max: 10,
        },
      },
      plugins: { ...baseChartOptions.plugins, legend: { display: false } },
    },
  });
}

function buildWaferChart(flavors) {
  const ratedFlavors = flavors.filter(f => !f.unrated);

  // Each flavor may have multiple wafers — fan out so each wafer gets the flavor's rating
  const waferSet = [...new Set(ratedFlavors.flatMap(f => f.wafers))].filter(Boolean).sort();
  const waferAvgs = waferSet.map(w => {
    const contributing = ratedFlavors.filter(f => f.wafers.includes(w));
    return contributing.length
      ? +(contributing.reduce((s, f) => s + f.avgRating, 0) / contributing.length).toFixed(2)
      : 0;
  });

  const blues = ['#002280', '#002381', '#002998', '#0835b0', '#1140c0', '#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#e0f2fe'];
  const formatWaferLabel = (wafer) => wafer.toLowerCase() == 'cocoa (default)' ? 'Cocoa (Default)' : capitalize(wafer);

  destroyChart('wafer');
  charts['wafer'] = new Chart(document.getElementById('waferChart'), {
    type: 'bar',
    data: {
      labels:   waferSet.map(formatWaferLabel),
      datasets: [{
        data:            waferAvgs,
        backgroundColor: waferSet.map((_, i) => blues[i % blues.length]),
        borderRadius:    6,
        borderSkipped:   false,
      }],
    },
    options: {
      ...baseChartOptions,
      scales: {
        ...baseChartOptions.scales,
        y: {
          ...baseChartOptions.scales.y,
          min: 0,
          max: 10,
        },
      },
      plugins: {
        ...baseChartOptions.plugins,
        legend: { display: false },
        tooltip: {
          ...baseChartOptions.plugins.tooltip,
          callbacks: {
            label: ctx => `  avg ${ctx.parsed.y.toFixed(2)} / 10`,
          },
        },
      },
    },
  });
}

function buildScatterChart(flavors) {
  const c = getChartColors();
  const scatterData = flavors.filter(f => !f.unrated && !f.avgOnly).map(f => ({ x: f.avgRating, y: f.stddev, label: f.name }));
  destroyChart('scatter');
  charts['scatter'] = new Chart(document.getElementById('scatterChart'), {
    type: 'scatter',
    data: {
      datasets: [{
        data:            scatterData,
        backgroundColor: scatterData.map(d =>
          d.y > 2         ? c.dotHigh
          : d.x > 8       ? c.dotTop
          :                  c.dotBase
        ),
        pointRadius:      6,
        pointHoverRadius: 9,
      }],
    },
    options: {
      ...baseChartOptions,
      plugins: {
        ...baseChartOptions.plugins,
        tooltip: {
          ...baseChartOptions.plugins.tooltip,
          callbacks: {
            label: ctx => ` ${ctx.raw.label}: avg ${ctx.parsed.x.toFixed(2)}, σ ${ctx.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: { ...baseChartOptions.scales.x, title: { display: true, text: 'Average Rating', font: { family: 'DM Mono', size: 10 }, color: c.text },
            ticks: {
                    font: { family: 'DM Mono', size: 9 },
                    color: c.text,
                    maxRotation: 0,
                    minRotation: 0,
                    autoSkip: false,
                } },
        y: { ...baseChartOptions.scales.y, title: { display: true, text: 'Standard Deviation',    font: { family: 'DM Mono', size: 10 }, color: c.text } }
      },
    },
  });
}

function buildLeaderboards(flavors) {
  const rated = flavors.filter(f => !f.unrated);
  const top = [...rated].sort((a, b) => b.avgRating - a.avgRating).slice(0, 5);
  const bot = [...rated].sort((a, b) => a.avgRating - b.avgRating).slice(0, 5);

  renderLeaderboard('leaderboard-top',    top, rated.length, true);
  renderLeaderboard('leaderboard-bottom', bot, rated.length, false);
}

function renderLeaderboard(elId, flavors, flavorsLength, top) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = flavors.map((f, i) => `
    <div class="lb-row" onclick="goToFlavor(${f.id})">
      <div class="lb-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${top ? i + 1 : flavorsLength - i - 1}</div>
      <div>
        <div class="lb-name">${f.name}</div>
        <div class="lb-sub">${capitalize(f.type)}</div>
      </div>
      <div class="lb-bar-wrap"><div class="lb-bar" style="width:${(f.avgRating / 10) * 100}%;${!top?'background:linear-gradient(90deg,#93c5fd,#dbeafe);':''}"></div></div>
      <div class="lb-score">${f.avgRating.toFixed(2)}</div>
    </div>
  `).join('');
}

function buildAllFlavorsChart(flavors) {
  const top = [...flavors].filter(f => !f.unrated)
  destroyChart('allFlavors');
  charts['allFlavors'] = new Chart(document.getElementById('allFlavorsChart'), {
    type: 'bar',
    data: {
      labels:   top.map(f => `${f.name} ${(f.type !== 'original' && f.type !== 'Loaded') ? '(' + capitalize(f.type) + ')': ''}`),
      datasets: [{
        data:            top.map(f => f.avgRating),
        backgroundColor: top.map(f => f.avgRating < 4.5 ? '#93c5fd' : f.avgRating < 8.0 ? '#2563eb' : '#1e40af'),
        borderRadius:    6,
        borderSkipped:   false,
      }],
    },
    options: {
      ...baseChartOptions,
      layout: { padding: { left: 45, right: 8, top: 8, bottom: 2 } },
      plugins: {
        ...baseChartOptions.plugins,
        tooltip: {
          ...baseChartOptions.plugins.tooltip,
          callbacks: { label: ctx => `\t${ctx.parsed.y.toFixed(2)} / 10` },
        },
      },
      scales: {
        ...baseChartOptions.scales,
        x: {
          ...baseChartOptions.scales.x,
          ticks: {
            font: { family: 'DM Mono', size: 8 },
            color: CHART_COLORS.text,
            maxRotation: 90,
            minRotation: 50,
            autoSkip: false,
          },
        },
        y: { ...baseChartOptions.scales.y, min: 0, max: 10 },
      },
    },
  });
}

function goToFlavor(id) {
  showPage('flavors');
  document.getElementById('flavor-select').value = id;
  loadFlavorDetail();
}

// ═══════════════════════════════════════════════════════════════════
//  FLAVOR DETAIL
// ═══════════════════════════════════════════════════════════════════
function loadFlavorDetail() {
  const id = parseInt(document.getElementById('flavor-select').value);
  if (!id) { renderFlavorGrid(); return; }
  const f = FLAVORS.find(x => x.id === id);
  if (!f) return;
 
  // Show back button
  const backBtn = document.getElementById('flavor-back-btn');
  if (backBtn) backBtn.style.display = 'flex';
 
  // Badges
  document.getElementById('flavor-type-badge').innerHTML = `<span class="flavor-tag type">${f.type.toUpperCase()}</span>`;

  // ── Unrated flavors: simplified view ──────────────────────────────
  if (f.unrated) {
    document.getElementById('flavor-detail-panel').innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div class="card-body">
          <div class="flavor-hero-inner">
            ${f.image
              ? `<img src="./assets/images/${f.image}" alt="${f.name}">`
              : `<div class="flavor-image-placeholder">🍪</div>`}
            <div class="flavor-meta">
              <h2>${f.name}</h2>
              <div class="flavor-tags">
                ${f.tags.map(t => `<span class="flavor-tag">🏷 ${t}</span>`).join('')}
              </div>
              <div class="flavor-stat-notes unrated">
                ↳ haven't tried this one yet — check back later!
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // Stats derived from real reviews
  const percentile  = Math.round((FLAVORS.filter(x => !x.unrated && x.avgRating < f.avgRating).length / FLAVORS.filter(x => !x.unrated).length) * 100);
 
  // Reviews list — REAL data from JSON (already sorted high→low)
  const reviewsHTML = f.reviews.map(rev => {
    if (rev.comment === '') return; // Skip reviews with no comment.

    const reviewer = REVIEWERS.find(r => r.name === rev.name);
    const color    = reviewer?.color ?? '#2563eb';
    const inits    = initials2(rev.name);
    const cls      = rev.rating >= 8 ? 'high' : rev.rating < 5 ? 'low' : 'mid';
    const comment  = rev.comment;

    return `<div class="review-row" onclick="goToReviewerByName('${rev.name.replace(/'/g,"\\'")}')">
      <div class="reviewer-avatar" style="background:${color}">${inits}</div>
      <div class="review-name">${rev.name}</div>
      <div class="review-note">${comment}</div>
      <div class="rating-pill ${cls}">${rev.rating.toFixed(2)}</div>
    </div>`;
  }).join('');
 
  const commentsCount = f.reviews.filter(rev => rev.comment !== '').length;
  document.getElementById('flavor-detail-panel').innerHTML = `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-body">
        <div class="flavor-hero-inner">
          ${f.image
            ? `<img src="./assets/images/${f.image}" alt="${f.name}">`
            : `<div class="flavor-image-placeholder">🍪</div>`}
          <div class="flavor-meta">
            <h2>${f.name}</h2>
            <div class="flavor-tags">
              ${f.tags.map(t => `<span class="flavor-tag">🏷 ${t}</span>`).join('')}
            </div>
            <div class="flavor-stats-row">
              <div class="flavor-stat">
                <div class="flavor-stat-val">${f.avgRating.toFixed(2)}</div>
                <div class="flavor-stat-lbl">Average Rating</div>
              </div>
              ${!f.avgOnly ? `<div class="flavor-stat">
                <div class="flavor-stat-val">${f.stddev.toFixed(2)}</div>
                <div class="flavor-stat-lbl">Standard Deviation</div>
              </div>` : ''}
              <div class="flavor-stat">
                <div class="flavor-stat-val">${percentile}<span style="font-size:14px">th</span></div>
                <div class="flavor-stat-lbl">Percentile</div>
              </div>
              <div class="flavor-stat">
                <div class="flavor-stat-val">${f.avgOnly ? '—' : f.reviews.length}</div>
                <div class="flavor-stat-lbl">Ratings</div>
              </div>
            </div>
            ${f.notes ? `<div class="flavor-stat-notes">"${f.notes}"</div>` : ''}
          </div>
        </div>
      </div>
    </div>
 
    ${f.avgOnly
      ? `<div class="card" style="margin-bottom:20px;">
          <div class="card-header">
            <div class="card-title">Reviewer Ratings</div>
          </div>
          <div class="card-body">
            <div class="no-individual-ratings">
              this is one of the first flavors tried before the system was in place! reviewer ratings weren't recorded. ꃋᴖꃋ
            </div>
          </div>
        </div>
        <div class="card" style="margin-top:0;">
          <div class="card-header">
            <div class="card-title">Comments</div>
          </div>
          <div class="card-body">
            <div class="no-individual-ratings">
              neither were the comments. ꃋᴖꃋ
            </div>
          </div>
        </div>`

      : `<div class="card" style="margin-bottom:20px;">
          <div class="card-header">
            <div class="card-title">Reviewer Ratings</div>
            <div class="card-badge">compared to average</div>
          </div>
          <div class="card-body">
            <div class="chart-container" style="height:220px;">
              <canvas id="flavorReviewerScatter"></canvas>
            </div>
          </div>
        </div>

      <div class="card" style="margin-top:0;">
        <div class="card-header">
          <div class="card-title">Comments</div>
          <div class="card-badge">${f.avgOnly ? '—' : `from ${commentsCount}`} reviewer${!f.avgOnly && commentsCount === 1 ? '' : 's'}</div>
        </div>
        <div class="card-body">
          <div class="reviews-list">${reviewsHTML}</div>
        </div>
      </div>`
    }`;
 
  // Reviewer scatter chart — only for flavors with individual ratings
  if (f.avgOnly) return;

  const sortedReviews = [...f.reviews].sort((a, b) => a.name.localeCompare(b.name));
  const reviewerLabels = sortedReviews.map(r => r.name);
  const reviewerPoints = sortedReviews.map((r, i) => ({ x: i, y: r.rating, name: r.name }));
  const avgLine        = sortedReviews.map((_, i) => ({ x: i, y: f.avgRating }));

  const c = getChartColors();

  destroyChart('flavorDist');
  charts['flavorDist'] = new Chart(document.getElementById('flavorReviewerScatter'), {
    type: 'scatter',
    data: {
      datasets: [
        {
          label:           'Reviewer Rating',
          data:            reviewerPoints,
          backgroundColor: reviewerPoints.map(p =>
            p.y >= 8 ? 'rgba(29,64,175,0.85)' : p.y < 5 ? 'rgba(147,197,253,0.85)' : 'rgba(37,99,235,0.85)'
          ),
          pointRadius:      7,
          pointHoverRadius: 10,
          pointStyle:       'circle',
        },
        {
          label:     'Average',
          data:      avgLine,
          type:      'line',
          borderColor:     c.avgLine,
          borderWidth:      2,
          borderDash:       [5, 4],
          pointRadius:      0,
          pointHoverRadius: 0,
          fill:             false,
          tension:          0,
        },
      ],
    },
    options: {
      ...baseChartOptions,
      plugins: {
        ...baseChartOptions.plugins,
        legend: {
          display: true,
          labels: { font: { family: 'DM Mono', size: 10 }, color: CHART_COLORS.text, boxWidth: 14 },
        },
        tooltip: {
          ...baseChartOptions.plugins.tooltip,
          filter: item => item.datasetIndex === 0,
          callbacks: {
            title: ctx => ctx[0]?.raw?.name ?? '',
            label: ctx => `  ${ctx.parsed.y.toFixed(2)} / 10`,
          },
        },
      },
      scales: {
        x: {
          type:   'linear',
          min:    -0.5,
          max:    sortedReviews.length - 0.5,
          border: { color: CHART_COLORS.axis },
          ticks: {
            font:        { family: 'DM Mono', size: 9 },
            color:       CHART_COLORS.text,
            stepSize:    1,
            callback:    (val) => reviewerLabels[val] ?? '',
            maxRotation: 45,
            minRotation: 0,
          },
        },
        y: {
          ...baseChartOptions.scales.y,
          min:    0,
          max:    10,
          border: { color: CHART_COLORS.axis },
          ticks: { font: { family: 'DM Mono', size: 9 }, color: CHART_COLORS.text, stepSize: 2 },
        },
      },
    },
  });
}
 
function goToReviewer(id) {
  showPage('reviewers');
  document.getElementById('reviewer-select').value = id;
  loadReviewerDetail();
}
 
function goToReviewerByName(name) {
  const r = REVIEWERS.find(x => x.name === name);
  if (r) goToReviewer(r.id);
}
 
// ═══════════════════════════════════════════════════════════════════
//  FLAVOR GRID (default view)
// ═══════════════════════════════════════════════════════════════════
function renderFlavorGrid(flavors) {
  const source = flavors ?? FLAVORS;
  const rated   = [...source].filter(f => !f.unrated).sort((a, b) => a.name.localeCompare(b.name));
  const unrated = [...source].filter(f =>  f.unrated).sort((a, b) => a.name.localeCompare(b.name));

  function makeCard(f) {
    if (f.unrated) {
      const avatar = f.image
        ? `<img src="./assets/images/${f.image}" alt="${f.name}" style="width:72px;height:72px;object-fit:contain;border-radius:6px;flex-shrink:0;">`
        : `<div class="reviewer-card-avatar" style="background:#2563eb;font-size:22px;letter-spacing:0;"></div>`;
      return `<div class="reviewer-card" onclick="selectFlavorCard(${f.id})" style="opacity:0.75;">
        ${avatar}
        <div>
          <div class="reviewer-card-name" style="font-size:12px;">${f.name}</div>
          <div class="reviewer-card-rating-lbl" style="margin-top:2px;">${capitalize(f.type)}</div>
        </div>
        <div>
          <div class="reviewer-card-rating unrated">N/A</div>
          <div class="reviewer-card-rating-lbl">unrated</div>
        </div>
        <div class="reviewer-card-bar">
          <div class="reviewer-card-bar-fill" style="width:0%;background:#cbd5e1;"></div>
        </div>
        <div class="reviewer-card-meta">
          <div class="reviewer-card-stat">
            <div class="reviewer-card-stat-val" style="display:inline;">0 <span class="reviewer-card-stat-lbl" style="display:inline;">Reviews</span></div>
          </div>
        </div>
      </div>`;
    }
    const barColor = f.avgRating >= 8 ? '#1e40af' : f.avgRating >= 6 ? '#2563eb' : '#93c5fd';
    const barPct   = (f.avgRating / 10) * 100;
    const avatar   = f.image
      ? `<img src="./assets/images/${f.image}" alt="${f.name}" style="width:72px;height:72px;object-fit:contain;border-radius:6px;flex-shrink:0;">`
      : `<div class="reviewer-card-avatar" style="background:#2563eb;font-size:22px;letter-spacing:0;"></div>`;
    return `<div class="reviewer-card" onclick="selectFlavorCard(${f.id})">
      ${avatar}
      <div>
        <div class="reviewer-card-name" style="font-size:12px;">${f.name}</div>
        <div class="reviewer-card-rating-lbl" style="margin-top:2px;">${capitalize(f.type)}</div>
      </div>
      <div>
        <div class="reviewer-card-rating" style="font-size:20px;">${f.avgRating.toFixed(2)}</div>
        <div class="reviewer-card-rating-lbl">out of 10</div>
      </div>
      <div class="reviewer-card-bar">
        <div class="reviewer-card-bar-fill" style="width:${barPct}%;background:${barColor};"></div>
      </div>
      <div class="reviewer-card-meta">
        <div class="reviewer-card-stat">
          <div class="reviewer-card-stat-val" style="display:inline;">${f.avgOnly ? '—' : f.reviews.length} <span class="reviewer-card-stat-lbl" style="display:inline;">Reviews</span></div>
        </div>
      </div>
    </div>`;
  }

  const ratedSection  = rated.map(makeCard).join('');
  const unratedSection = unrated.length ? `
    <div style="grid-column:1/-1;margin-top:24px;margin-bottom:8px;font-size:11px;font-family:'DM Mono',monospace;color:var(--off-white);letter-spacing:1px;text-transform:uppercase;border-top:1px solid var(--border);padding-top:16px;">
      Queued Flavors (${unrated.length})
    </div>
    ${unrated.map(makeCard).join('')}
  ` : '';

  document.getElementById('flavor-detail-panel').innerHTML =
    `<div class="reviewer-grid">${ratedSection}${unratedSection}</div>`;
 
  const backBtn = document.getElementById('flavor-back-btn');
  if (backBtn) backBtn.style.display = 'none';
 
  document.getElementById('flavor-type-badge').innerHTML = '';
  document.getElementById('flavor-select').value = '';
}
 
function showFlavorGrid() {
  renderFlavorGrid(getFilteredFlavors());
}
 
function selectFlavorCard(id) {
  document.getElementById('flavor-select').value = id;
  loadFlavorDetail();

  document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
 
// ═══════════════════════════════════════════════════════════════════
//  REVIEWER GRID (default view)
// ═══════════════════════════════════════════════════════════════════
function renderReviewerGrid() {
  // Sort alphabetically by default
  const sorted = [...REVIEWERS].sort((a, b) => a.name.localeCompare(b.name));
 
  const cardsHTML = sorted.map(r => {
    const barColor  = r.avgRating >= 8 ? '#1e40af' : r.avgRating >= 6 ? '#2563eb' : '#93c5fd';
    const barPct    = (r.avgRating / 10) * 100;
 
    return `<div class="reviewer-card"
        style="--card-accent:${r.color};"
        onclick="selectReviewerCard(${r.id})">
      <div class="reviewer-card-avatar" style="background:${r.color};">${r.initials}</div>
      <div>
        <div class="reviewer-card-name">${r.name}</div>
      </div>
      <div>
        <div class="reviewer-card-rating">${r.avgRating.toFixed(2)}</div>
        <div class="reviewer-card-rating-lbl">out of 10</div>
      </div>
      <div class="reviewer-card-bar">
        <div class="reviewer-card-bar-fill" style="width:${barPct}%;background:${barColor};"></div>
      </div>
      <div class="reviewer-card-meta">
        <div class="reviewer-card-stat">
          <div class="reviewer-card-stat-val">${r.coverage}  <span class="reviewer-card-stat-lbl" style="display:inline;">Reviewed</span></div>
        </div>
      </div>
    </div>`;
  }).join('');
 
  document.getElementById('reviewer-detail-panel').innerHTML =
    `<div class="reviewer-grid">${cardsHTML}</div>`;
 
  // Hide the back button when showing the grid
  const backBtn = document.getElementById('reviewer-back-btn');
  if (backBtn) backBtn.style.display = 'none';
 
  // Reset the select
  document.getElementById('reviewer-select').value = '';
}
 
function showReviewerGrid() {
  renderReviewerGrid();
}
 
function selectReviewerCard(id) {
  document.getElementById('reviewer-select').value = id;
  loadReviewerDetail();

  document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════════════════
//  REVIEWER DETAIL
// ═══════════════════════════════════════════════════════════════════
function loadReviewerDetail() {
  const id = parseInt(document.getElementById('reviewer-select').value);
  if (!id) return;
  const r = REVIEWERS.find(x => x.id === id);
  if (!r) return;

  // Real per-flavor ratings for this reviewer
  const ratedFlavors = FLAVORS
    .filter(f => r.ratings[f.name] !== undefined && !f.unrated)
    .map(f => ({ ...f, myRating: r.ratings[f.name], myComment: r.comments[f.name] ?? '' }));
  const sortedRatedFlavors = [...ratedFlavors].sort((a, b) => b.myRating - a.myRating);

  const topFlavors = sortedRatedFlavors.slice(0, 5);
  // Bottom 5 rules:
  // - ≤5 reviewed: show nothing in bottom list
  // - 6–9 reviewed: show only the difference (e.g. 6 reviewed → 1 bottom entry)
  // - ≥10 reviewed: show full 5 bottom entries
  const botCount   = sortedRatedFlavors.length <= 5 ? 0 : Math.min(5, sortedRatedFlavors.length - 5);
  const botFlavors = [...sortedRatedFlavors].sort((a, b) => a.myRating - b.myRating).slice(0, botCount);
  const contrarian  = +(Math.abs(r.bias) + r.stddev / 4).toFixed(2);

  // Bias label
  const highestFlavor = FLAVORS.find(f => f.name === r.highest);
  const highestLabel  = r.highest + ((highestFlavor?.type.toLowerCase() !== 'original' && highestFlavor?.type.toLowerCase() !== 'loaded') ? ` (${capitalize(highestFlavor.type)})` : '');
  const lowestFlavor  = FLAVORS.find(f => f.name === r.lowest);
  const lowestLabel   = r.lowest  + ((lowestFlavor?.type.toLowerCase() !== 'original' && lowestFlavor?.type.toLowerCase() !== 'loaded') ? ` (${capitalize(lowestFlavor.type)})` : '');

  // Top/bot flavor rows
  function lbRowHTML(f, i, worst = false) {
    const score = f.myRating;
    return `<div class="lb-row" onclick="goToFlavor(${f.id})">
      <div class="lb-rank ${!worst && i===0?'gold':!worst&&i===1?'silver':!worst&&i===2?'bronze':''}">
        ${worst ? sortedRatedFlavors.length - i - 1 : i + 1}
      </div>
      <div>
        <div class="lb-name">${f.name}</div>
        <div class="lb-sub">${capitalize(f.type)}</div>
      </div>
      <div class="lb-bar-wrap">
        <div class="lb-bar" style="width:${(score / 10) * 100}%;${worst?'background:linear-gradient(90deg,#93c5fd,#dbeafe);':''}"></div>
      </div>
      <div class="lb-score">${score.toFixed(2)}</div>
    </div>`;
  }

  // Count how many rated flavors have comments
const reviewerCommentCount = sortedRatedFlavors.filter(f => f.myComment !== '').length;
const reviewerCommentText = reviewerCommentCount === 0 ? '*crickets*' : '';
const avatar = document.body.classList.contains('dark')
  ? './assets/images/golden-oreo.webp'
  : './assets/images/oreo.webp';
  document.getElementById('reviewer-detail-panel').innerHTML = `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-body">
        <div class="reviewer-hero">
          <img id="reviewer-hero-image" src="${avatar}" alt="avatar"></img>
          <div>
            <div class="profile-name">${r.name}</div>
            <div style="display:flex;flex-wrap:wrap;gap:20px;margin-bottom:12px;">
              <div class="flavor-stat"><div class="flavor-stat-val">${r.avgRating.toFixed(2)}</div><div class="flavor-stat-lbl">Average Rating</div></div>
              ${r.coverage > 1 ? `<div class="flavor-stat"><div class="flavor-stat-val">${r.stddev.toFixed(2)}</div><div class="flavor-stat-lbl">Standard Dev</div></div>` : ''}
              <div class="flavor-stat"><div class="flavor-stat-val">${r.coverage}</div><div class="flavor-stat-lbl">Flavors Rated</div></div>
              <div class="flavor-stat"><div class="flavor-stat-val">${r.bias >= 0 ? '+' : ''}${r.bias.toFixed(2)}</div><div class="flavor-stat-lbl">Rating Bias</div></div>
              <div class="flavor-stat"><div class="flavor-stat-val">${contrarian}</div><div class="flavor-stat-lbl">Contrarian Score</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="stat-grid" style="margin-bottom:20px;">
      <div class="stat-card"><div class="stat-label">Favorite</div><div class="stat-value"">${highestLabel}</div><div class="stat-sub">highest rated</div></div>
      <div class="stat-card"><div class="stat-label">Least Favorite</div><div class="stat-value"">${lowestLabel != highestLabel ? lowestLabel : '—'}</div><div class="stat-sub">lowest rated</div></div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-header">
        <div class="card-title">Reviewer Ratings vs. Average</div>
        <div class="card-badge">CHRONOLOGICAL (DATE TRIED)</div>
      </div>
      <div class="card-body">
        <div class="chart-container" style="height:260px;">
          <canvas id="reviewerCompChart"></canvas>
        </div>
      </div>
    </div>

    <div class="chart-grid-2" style="margin-bottom:20px;">
      <div class="card">
        <div class="card-header"><div class="card-title">Top 5 Oreos</div></div>
        <div class="card-body">${topFlavors.map((f, i) => lbRowHTML(f, i, false)).join('')}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Bottom 5 Oreos</div></div>
        <div class="card-body">${botFlavors.length === 0
          ? `<div class="no-bottom-oreos">not enough ratings yet</div>`
          : botFlavors.map((f, i) => lbRowHTML(f, i, true)).join('')}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">All Reviews</div>
        <div class="card-badge">ACROSS ${reviewerCommentCount} ${reviewerCommentCount === 1 ? 'OREO' : 'OREOS'}</div>
      </div>
      <div class="card-body">
        <div class="reviews-list">
          ${reviewerCommentCount === 0 ? `<div class="no-reviews">${reviewerCommentText}</div>` : ''}
          ${sortedRatedFlavors.map(f => {
            if (f.myComment === '') return ''; // Skip reviews with no comment.

            const cls = f.myRating >= 8 ? 'high' : f.myRating < 5 ? 'low' : 'mid';
            const type = (f.type.toLowerCase() !== 'original' && f.type.toLowerCase() !== 'loaded') ? `(${capitalize(f.type)})` : '';

            return `<div class="review-row" onclick="goToFlavor(${f.id})">
              <div class="reviewer-avatar" style="background:${r.color}">${r.initials}</div>
              <div class="review-name">${f.name} ${type}</div>
              <div class="review-note">${f.myComment || '—'}</div>
              <div class="rating-pill ${cls}">${f.myRating.toFixed(2)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  // Comparison chart: this reviewer vs group avg.
  const sample = ratedFlavors;
  destroyChart('reviewerComp');
  charts['reviewerComp'] = new Chart(document.getElementById('reviewerCompChart'), {
    type: 'bar',
    data: {
      labels: sample.map(f => `${f.name} ${(f.type !== 'original' && f.type !== 'loaded') ? '(' + capitalize(f.type) + ')': ''}`),
      datasets: [
        {
          label:           'Reviewer',
          data:            sample.map(f => f.myRating),
          backgroundColor: r.color,
          borderRadius:    4,
          borderSkipped:   false,
        },
        {
          label:           'Average',
          data:            sample.map(f => f.avgRating),
          backgroundColor: '#bfdbfe',
          borderRadius:    4,
          borderSkipped:   false,
        },
      ],
    },
    options: {
      ...baseChartOptions,
      layout: { padding: { left: 80, right: 8, top: 8, bottom: 2 } },
      plugins: {
        ...baseChartOptions.plugins,
        legend: {
          display: true,
          labels: { font: { family: 'DM Mono', size: 11 }, color: CHART_COLORS.text },
        },
      },
      scales: { ...baseChartOptions.scales, y: { ...baseChartOptions.scales.y, min: 0, max: 10 } },
    },
  });

  const backBtn = document.getElementById('reviewer-back-btn');
  if (backBtn) backBtn.style.display = 'block';
}

// ═══════════════════════════════════════════════════════════════════
//  FILTERS
// ═══════════════════════════════════════════════════════════════════
let activeWaferFilters = new Set(['all']);
let activeTypeFilters = new Set(['all']);
let activeTagFilters = new Set();

function toggleWaferFilter(el, wafer) {
  if (wafer === 'all') {
    activeWaferFilters = new Set(['all']);
    document.querySelectorAll('#wafer-filters .filter-tag').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  } else {
    activeWaferFilters.delete('all');
    document.querySelector('#wafer-filters .filter-tag[data-wafer="all"]')?.classList.remove('active');
 
    if (activeWaferFilters.has(wafer)) {
      activeWaferFilters.delete(wafer);
      el.classList.remove('active');
    } else {
      activeWaferFilters.add(wafer);
      el.classList.add('active');
    }
 
    // If nothing selected, revert to "All"
    if (activeWaferFilters.size === 0) {
      activeWaferFilters = new Set(['all']);
      document.querySelector('#wafer-filters .filter-tag[data-wafer="all"]')?.classList.add('active');
    } else {
      // If every individual wafer is now selected, collapse back to "All"
      const allWaferTags = [...document.querySelectorAll('#wafer-filters .filter-tag:not([data-wafer="all"])')];
      if (allWaferTags.length > 0 && allWaferTags.every(t => activeWaferFilters.has(t.dataset.wafer))) {
        activeWaferFilters = new Set(['all']);
        allWaferTags.forEach(t => t.classList.remove('active'));
        document.querySelector('#wafer-filters .filter-tag[data-wafer="all"]')?.classList.add('active');
      }
    }
  }
  applyFilters();
}
 
function toggleTypeFilter(el, type) {
  if (type === 'all') {
    activeTypeFilters = new Set(['all']);
    document.querySelectorAll('#type-filters .filter-tag').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  } else {
    activeTypeFilters.delete('all');
    document.querySelector('#type-filters .filter-tag[data-type="all"]')?.classList.remove('active');
 
    if (activeTypeFilters.has(type)) {
      activeTypeFilters.delete(type);
      el.classList.remove('active');
    } else {
      activeTypeFilters.add(type);
      el.classList.add('active');
    }
 
    // If nothing selected, revert to "All"
    if (activeTypeFilters.size === 0) {
      activeTypeFilters = new Set(['all']);
      document.querySelector('#type-filters .filter-tag[data-type="all"]')?.classList.add('active');
    } else {
      // If every individual type is now selected, collapse back to "All"
      const allTypeTags = [...document.querySelectorAll('#type-filters .filter-tag:not([data-type="all"])')];
      if (allTypeTags.length > 0 && allTypeTags.every(t => activeTypeFilters.has(t.dataset.type))) {
        activeTypeFilters = new Set(['all']);
        allTypeTags.forEach(t => t.classList.remove('active'));
        document.querySelector('#type-filters .filter-tag[data-type="all"]')?.classList.add('active');
      }
    }
  }
  applyFilters();
}
 
function toggleTagFilter(tag) {
  const el = document.querySelector(`.tag-filter-pill[data-tag="${CSS.escape(tag)}"]`);
  if (activeTagFilters.has(tag)) {
    activeTagFilters.delete(tag);
    el?.classList.remove('active');
  } else {
    activeTagFilters.add(tag);
    el?.classList.add('active');
  }

  // If every individual tag pill is now selected, collapse back to "All"
  const allTagPills = [...document.querySelectorAll('.tag-filter-pill:not(.tag-filter-all)')];
  if (allTagPills.length > 0 && allTagPills.every(t => activeTagFilters.has(t.dataset.tag))) {
    clearTagFilters();
  } else {
    // Keep All pill active only when nothing is selected
    const allPill = document.querySelector('.tag-filter-all');
    if (allPill) allPill.classList.toggle('active', activeTagFilters.size === 0);
  }

  applyFilters();
}
 
function getFilteredFlavors() {
  const minRating  = parseFloat(document.getElementById('rating-filter').value);
  return FLAVORS.filter(f => {
    if (!activeWaferFilters.has('all') && !f.wafers.some(w => activeWaferFilters.has(w))) return false;
    if (!activeTypeFilters.has('all') && !activeTypeFilters.has(f.type)) return false;
    // Unrated flavors are excluded by a nonzero min-rating filter, otherwise always shown
    if (!f.unrated && f.avgRating < minRating) return false;
    if (f.unrated && minRating > 0) return false;
    if (activeTagFilters.size > 0 && !f.tags.some(t => activeTagFilters.has(t))) return false;
    return true;
  });
}
 
function applyFilters() {
  const filtered = getFilteredFlavors();
 
  // 1. Rebuild flavor dropdown
  const flavorSel  = document.getElementById('flavor-select');
  const currentVal = flavorSel.value;
  flavorSel.innerHTML = '<option value="">— all oreos —</option>';
  [...filtered].sort((a, b) => a.name.localeCompare(b.name)).forEach(f => {
    const opt = document.createElement('option');
    opt.value       = f.id;
    
    opt.textContent = f.name + `${f.type.toLowerCase() !== 'original' && f.type.toLowerCase() !== 'loaded' 
        ? ` (${capitalize(f.type)})` : ''}`;
    flavorSel.appendChild(opt);
  });
  if (filtered.find(f => f.id === parseInt(currentVal))) {
    flavorSel.value = currentVal;
  } else if (currentVal) {
    document.getElementById('flavor-detail-panel').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">selected flavor filtered out — pick another</div>
      </div>`;
    document.getElementById('flavor-type-badge').innerHTML        = '';
  }
 
  // 2. Overview leaderboards
  buildLeaderboards(filtered);
 
  // 3. Overview charts
  if (charts['type']) {
    const ratedFiltered = filtered.filter(f => !f.unrated);
    const typeSet  = [...new Set(ratedFiltered.map(f => f.type))].sort();
    const blues    = ['#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#e0f2fe','#0284c7'];
    charts['type'].data.labels            = typeSet.map(capitalize);
    charts['type'].data.datasets[0].data  = typeSet.map(t => {
      const tf = ratedFiltered.filter(f => f.type === t);
      return tf.length ? +(tf.reduce((s, f) => s + f.avgRating, 0) / tf.length).toFixed(2) : 0;
    });
    charts['type'].data.datasets[0].backgroundColor = typeSet.map((_, i) => blues[i % blues.length]);
    charts['type'].options.plugins.tooltip.callbacks.label = ctx => `  ${ctx.parsed.y.toFixed(2)} / 10`;
    charts['type'].update();
  }
  if (charts['wafer']) {
    const ratedFiltered = filtered.filter(f => !f.unrated);
    const blues = ['#002280', '#002381', '#002998', '#0835b0', '#1140c0', '#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#e0f2fe'];
    const formatWaferLabel = (wafer) => wafer.toLowerCase() == 'cocoa (default)' ? 'Cocoa (Default)' : capitalize(wafer);
    
    const waferSet = [...new Set(ratedFiltered.flatMap(f => f.wafers))].filter(Boolean).sort();
    const waferAvgs = waferSet.map(w => {
      const contributing = ratedFiltered.filter(f => f.wafers.includes(w));
      return contributing.length ? +(contributing.reduce((s, f) => s + f.avgRating, 0) / contributing.length).toFixed(2) : 0;
    });
    charts['wafer'].data.labels           = waferSet.map(formatWaferLabel);
    charts['wafer'].data.datasets[0].data = waferAvgs;
    charts['wafer'].data.datasets[0].backgroundColor = waferSet.map((_, i) => blues[i % blues.length]);
    charts['wafer'].options.plugins.tooltip.callbacks.label = ctx => `  ${ctx.parsed.y.toFixed(2)} / 10`;
    charts['wafer'].update();
  }
  if (charts['scatter']) {
    const c = getChartColors();
    const sd = filtered.filter(f => !f.unrated && !f.avgOnly).map(f => ({ x: f.avgRating, y: f.stddev, label: f.name }));
    charts['scatter'].data.datasets[0].data            = sd;
    charts['scatter'].data.datasets[0].backgroundColor = sd.map(d =>
      d.y > 2   ? c.dotHigh
      : d.x > 8 ? c.dotTop
      :            c.dotBase
    );
    charts['scatter'].update();
  }
 
  // 4. Count label
  const countEl = document.getElementById('filter-count');
  if (countEl) {
    const ratedCount = filtered.filter(f => !f.unrated).length;
    const unratedCount = filtered.filter(f => f.unrated).length;
    countEl.textContent = `${ratedCount} rated` + (unratedCount ? ` + ${unratedCount} unrated` : '') + ` of ${FLAVORS.length} total`;
  }

  // 5. Re-render flavor grid if it's currently visible (no detail open)
  if (currentPage === 'flavors' && !document.getElementById('flavor-select').value) {
    renderFlavorGrid(filtered);
  }
}
 
function clearFilters() {
  document.getElementById('rating-filter').value = 0.00;
  document.getElementById('rating-val').textContent = '0.00';
  activeWaferFilters = new Set(['all']);
  document.querySelectorAll('#wafer-filters .filter-tag').forEach((t, i) => t.classList.toggle('active', i === 0));
  activeTypeFilters = new Set(['all']);
  document.querySelectorAll('#type-filters .filter-tag').forEach((t, i) => t.classList.toggle('active', i === 0));
  clearTagFilters();
}

// ═══════════════════════════════════════════════════════════════════
//  THEME-AWARE CHART UPDATE
// ═══════════════════════════════════════════════════════════════════
function updateChartsForTheme() {
  const c = getChartColors();

  Object.entries(charts).forEach(([key, chart]) => {
    if (!chart) return;

    // Update tick / title colors and axis line color
    Object.values(chart.options.scales ?? {}).forEach(scale => {
      if (scale.ticks) scale.ticks.color = c.text;
      if (scale.title) scale.title.color = c.text;

      // Update axis line color
      if (scale.grid) {
        scale.grid.borderColor = c.isDarkMode ? '#ffffff' : c.gridBorderDefault;
      }
    });

    // Update legend label color
    if (chart.options.plugins?.legend?.labels) {
      chart.options.plugins.legend.labels.color = c.text;
    }

    // Re-color scatter dots
    if (key === 'scatter') {
      chart.data.datasets[0].backgroundColor = chart.data.datasets[0].data.map(d =>
        d.y > 2 ? c.dotHigh
        : d.x > 8 ? c.dotTop
        : c.dotBase
      );
    }

    // Re-color flavor detail "Average" reference line
    if (key === 'flavorDist') {
      chart.data.datasets.forEach(ds => {
        if (ds.type === 'line' || ds.label === 'Average') ds.borderColor = c.avgLine;
      });
    }

    chart.update('none');
  });
}

// ═══════════════════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════════════════
async function boot() {
  // Show loading state
  document.getElementById('page-title').textContent = 'Loading…';

  let raw;
  try {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    raw = await resp.json();
  } catch (err) {
    console.error('Failed to load data:', err);
    document.getElementById('page-title').textContent = 'Error loading data';
    document.querySelector('.content').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-text">Could not load ${DATA_URL}<br>${err.message}</div>
      </div>`;
    return;
  }

  // Parse → populate globals
  const parsed  = parseData(raw);
  FLAVORS       = parsed.flavorList;
  REVIEWERS     = parsed.reviewerList;

  // Wire up UI
  populateWaferFilters();
  populateTypeFilters();
  populateIngredientFilter();
  populateReviewerSelect();
  renderFlavorGrid();
  updateOverviewStats();
  initOverviewCharts();
  applyFilters(); // populates flavor dropdown
 
  document.getElementById('page-title').textContent = 'OVERVIEW';
}
 
document.addEventListener('DOMContentLoaded', () => {
  // Wait for fonts before rendering charts so label measurements are accurate
  if (document.fonts?.ready) {
    document.fonts.ready.then(boot);
  } else {
    boot();
  }

  // Swap #oreo-link image when dark mode is toggled
  function syncOreoLink() {
    const img = document.getElementById('oreo-link');
    if (!img) return;
    const isDark = document.body.classList.contains('dark');
    img.src = isDark
      ? './assets/images/golden-oreo.webp'
      : './assets/images/oreo.webp';
  }

  function syncOreoAvatar() {
    const img = document.getElementById('reviewer-hero-image');
    if (!img) return;
    const isDark = document.body.classList.contains('dark');
    img.src = isDark
      ? './assets/images/golden-oreo.webp'
      : './assets/images/oreo.webp';
  }
  // Run once on load (in case dark mode is already active)
  syncOreoLink();
  syncOreoAvatar();
  // Watch for class changes on <body>
  new MutationObserver(() => { 
    syncOreoLink(); 
    syncOreoAvatar();
    updateChartsForTheme(); 
  }).observe(document.body, {
    attributes: true, attributeFilter: ['class']
  });
});

// Resize all active charts when the window resizes
let _resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    Object.values(charts).forEach(c => c?.resize());
    // Close mobile sidebar overlay if viewport is now wide enough for the fixed sidebar
    if (window.innerWidth > 900) {
      closeSidebar();
    }
  }, 100);
});