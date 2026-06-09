'use client'
import { useEffect, useRef } from 'react'
import type { OreoFlavorWithReviews, OreoReviewer } from '@/lib/types'

interface Props {
  flavors: OreoFlavorWithReviews[]
  reviewers: OreoReviewer[]
}

// ─── Data transformation ──────────────────────────────────────────────
function computeStddev(values: number[], mean?: number): number {
  if (values.length < 2) return 0
  const avg = mean ?? values.reduce((s, v) => s + v, 0) / values.length
  return Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length)
}

function processOreoData(
  supabaseFlavors: OreoFlavorWithReviews[],
  supabaseReviewers: OreoReviewer[]
) {
  const reviewerMap: Record<string, { ratings: Record<string, number>; comments: Record<string, string> }> = {}
  let flavorId = 0

  const flavorList = supabaseFlavors.map(sf => {
    const allRevs = sf.oreo_reviews ?? []
    const avgEntry = allRevs.find(r => r.is_average)
    const indivRevs = allRevs.filter(r => !r.is_average)

    const wafers = (sf.wafers ?? []).map((w: string) => w.toLowerCase().trim())
    const type = (sf.type ?? 'original').toLowerCase().trim()
    const tags = (sf.tags ?? []).map((t: string) => t.toLowerCase().trim())
    const image = sf.image_path
    const avgComment = avgEntry?.comment ?? ''

    const indivRatings = indivRevs.map(r => r.rating)
    const avgEntryRating = avgEntry?.rating ?? null
    const isUnrated = avgEntryRating === null && indivRatings.length === 0
    const isAvgOnly = !isUnrated && avgEntryRating !== null && indivRatings.length === 0

    const avgRating = isUnrated
      ? null
      : avgEntryRating !== null
        ? avgEntryRating
        : indivRatings.reduce((s, r) => s + r, 0) / indivRatings.length

    const stddev = isUnrated || isAvgOnly ? null : computeStddev(indivRatings, avgRating ?? 0)
    const controversy = isUnrated
      ? 'none'
      : isAvgOnly
        ? null
        : (stddev ?? 0) >= 2.0 ? 'high' : (stddev ?? 0) >= 1.3 ? 'moderate' : 'low'

    const reviews = indivRevs
      .filter(r => typeof r.rating === 'number')
      .map(r => ({ name: r.reviewer_name, rating: r.rating, comment: r.comment ?? '' }))
      .sort((a, b) => b.rating - a.rating)

    for (const rev of indivRevs) {
      if (typeof rev.rating !== 'number') continue
      const rname = rev.reviewer_name
      if (!reviewerMap[rname]) reviewerMap[rname] = { ratings: {}, comments: {} }
      reviewerMap[rname].ratings[sf.name] = rev.rating
      reviewerMap[rname].comments[sf.name] = rev.comment ?? ''
    }

    return {
      id: ++flavorId,
      name: sf.name,
      wafers, type, tags, image,
      unrated: isUnrated,
      avgOnly: isAvgOnly,
      avgRating: isUnrated ? null : +(avgRating!.toFixed(2)),
      stddev: stddev !== null ? +(stddev.toFixed(2)) : null,
      controversy, notes: avgComment, reviews,
    }
  })

  const ratedList = flavorList.filter(f => !f.unrated)
  const globalAvg = ratedList.length ? ratedList.reduce((s, f) => s + f.avgRating!, 0) / ratedList.length : 0
  let reviewerId = 0

  const reviewerList = Object.entries(reviewerMap).map(([rname, data]) => {
    const vals = Object.values(data.ratings)
    const rAvg = vals.reduce((s, v) => s + v, 0) / vals.length
    const rStd = computeStddev(vals, rAvg)
    const sorted = Object.entries(data.ratings).sort((a, b) => b[1] - a[1])
    const initials = rname.trim().split(/\s+/).map(w => w[0].toUpperCase()).join('').slice(0, 2)
    return {
      id: ++reviewerId,
      name: rname,
      initials,
      color: '#1d4ed8',
      avgRating: +rAvg.toFixed(2),
      stddev: +rStd.toFixed(2),
      bias: +(rAvg - globalAvg).toFixed(2),
      coverage: vals.length,
      highest: sorted[0]?.[0] ?? '—',
      lowest: sorted[sorted.length - 1]?.[0] ?? '—',
      ratings: data.ratings,
      comments: data.comments,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))

  return { flavorList, reviewerList }
}

// ─── Component ────────────────────────────────────────────────────────
export default function OreoDashboard({ flavors: rawFlavors, reviewers: rawReviewers }: Props) {
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const { flavorList, reviewerList } = processOreoData(rawFlavors, rawReviewers)

    // Dynamically import Chart.js to avoid SSR issues
    import('chart.js/auto').then(({ default: Chart }) => {
      // ── Expose globals so inline onclick="" strings in innerHTML work ──
      let FLAVORS = flavorList
      let REVIEWERS = reviewerList
      const charts: Record<string, any> = {}
      let currentPage = 'overview'
      let activeWaferFilters = new Set(['all'])
      let activeTypeFilters = new Set(['all'])
      let activeTagFilters = new Set<string>()

      function capitalize(s: string) {
        return s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : ''
      }

      function initials2(name: string) {
        return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).join('').slice(0, 2)
      }

      function getChartColors() {
        const dark = document.body.classList.contains('dark')
        return {
          primary: dark ? '#3b82f6' : '#2563eb',
          secondary: '#93c5fd',
          grid: dark ? '#1e293b' : '#e8ebf0',
          axis: dark ? 'rgba(255,255,255,0.55)' : '#8a9bb0',
          text: dark ? '#cbd5e1' : '#596677',
          dotHigh: dark ? 'rgba(0, 255, 255, 0.65)' : 'rgba(0, 221, 255, 0.50)',
          dotTop: dark ? 'rgba(59, 130, 246, 0.70)' : 'rgba(0, 98, 255, 0.50)',
          dotBase: dark ? 'rgba(99, 132, 255, 0.65)' : 'rgba(8, 13, 173, 0.50)',
          avgLine: dark ? '#e8ebf0' : '#1e293b',
        }
      }

      function getBaseOpts() {
        const c = getChartColors()
        return {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#1a2f6b', titleFont: { family: 'DM Mono', size: 11 }, bodyFont: { family: 'DM Mono', size: 11 }, padding: 10, cornerRadius: 8 },
          },
          layout: { padding: { left: 12, right: 8, top: 8, bottom: 8 } },
          scales: {
            x: { grid: { display: false }, border: { color: c.axis }, ticks: { font: { family: 'DM Mono', size: 9 }, color: c.text, maxRotation: 90, minRotation: 0, autoSkip: false } },
            y: { grid: { display: false }, border: { color: c.axis }, ticks: { font: { family: 'DM Mono', size: 9 }, color: c.text } },
          },
        }
      }

      function destroyChart(id: string) {
        if (charts[id]) { charts[id].destroy(); delete charts[id] }
      }

      function showPage(page: string) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
        document.getElementById('page-' + page)?.classList.add('active')
        document.querySelectorAll('.nav-item').forEach(n => {
          n.classList.toggle('active', (n.textContent ?? '').trim().toLowerCase().includes(page))
        })
        document.querySelectorAll('.view-tab').forEach(t => {
          t.classList.toggle('active', (t.textContent ?? '').toLowerCase().trim() === page)
        })
        const titleEl = document.getElementById('page-title')
        if (titleEl) titleEl.textContent = { overview: 'OVERVIEW', flavors: 'FLAVOR ANALYTICS', reviewers: 'REVIEWER ANALYTICS' }[page]?.toUpperCase() ?? page.toUpperCase()
        currentPage = page
        closeSidebar()
        if (page === 'flavors' && !(document.getElementById('flavor-select') as HTMLSelectElement)?.value) {
          renderFlavorGrid(getFilteredFlavors())
        }
        document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }

      function openSidebar() {
        document.getElementById('sidebar')?.classList.add('open')
        document.getElementById('overlay')?.classList.add('open')
      }

      function closeSidebar() {
        document.getElementById('sidebar')?.classList.remove('open')
        document.getElementById('overlay')?.classList.remove('open')
      }

      function setStatCard(id: string, value: string | number, sub: string) {
        const el = document.getElementById(id)
        if (!el) return
        const v = el.querySelector('.stat-value')
        const s = el.querySelector('.stat-sub')
        if (v) v.textContent = String(value)
        if (s) s.textContent = sub
      }

      function updateOverviewStats() {
        const rated = FLAVORS.filter(f => !f.unrated)
        const allRatings = rated.flatMap(f => f.reviews.map((r: any) => r.rating))
        const globalAvg = allRatings.length ? allRatings.reduce((s: number, v: number) => s + v, 0) / allRatings.length : 0
        const top = [...rated].sort((a, b) => b.avgRating! - a.avgRating!)[0]
        const bot = [...rated].sort((a, b) => a.avgRating! - b.avgRating!)[0]
        const div = [...rated].sort((a, b) => (b.stddev ?? 0) - (a.stddev ?? 0))[0]
        setStatCard('stat-total-flavors', FLAVORS.length, 'across all types')
        setStatCard('stat-total-reviewers', REVIEWERS.length, 'active contributors')
        setStatCard('stat-global-avg', globalAvg.toFixed(2), 'out of 10')
        setStatCard('stat-most-loved', `${top?.name} (${capitalize(top?.type ?? '')})`, `average of ${top?.avgRating?.toFixed(2)} / 10`)
        setStatCard('stat-most-hated', `${bot?.name} (${capitalize(bot?.type ?? '')})`, `average of ${bot?.avgRating?.toFixed(2)} / 10`)
        setStatCard('stat-most-divisive', `${div?.name} (${capitalize(div?.type ?? '')})`, `standard deviation of ${div?.stddev?.toFixed(2)}`)
      }

      function populateWaferFilters() {
        const wafers = [...new Set(FLAVORS.flatMap(f => f.wafers))].filter(Boolean).sort()
        const container = document.getElementById('wafer-filters')
        if (!container) return
        container.innerHTML = `<div class="filter-tag active" data-wafer="all">All</div>`
        wafers.forEach(t => {
          const tag = document.createElement('div')
          tag.className = 'filter-tag'; tag.dataset.wafer = t as string
          tag.textContent = (t as string).toLowerCase() === 'cocoa (default)' ? 'Cocoa (Default)' : capitalize(t as string)
          tag.onclick = () => toggleWaferFilter(tag, t as string)
          container.appendChild(tag)
        })
        container.querySelector('[data-wafer="all"]')?.addEventListener('click', (e) => {
          toggleWaferFilter(e.currentTarget as HTMLElement, 'all')
        })
      }

      function populateTypeFilters() {
        const types = [...new Set(FLAVORS.map(f => f.type))].sort()
        const container = document.getElementById('type-filters')
        if (!container) return
        container.innerHTML = `<div class="filter-tag active" data-type="all">All</div>`
        types.forEach(t => {
          const tag = document.createElement('div')
          tag.className = 'filter-tag'; tag.dataset.type = t as string
          tag.textContent = capitalize(t as string)
          tag.onclick = () => toggleTypeFilter(tag, t as string)
          container.appendChild(tag)
        })
        container.querySelector('[data-type="all"]')?.addEventListener('click', (e) => {
          toggleTypeFilter(e.currentTarget as HTMLElement, 'all')
        })
      }

      function populateIngredientFilter() {
        const allTags = [...new Set(FLAVORS.flatMap(f => f.tags))].sort()
        const container = document.getElementById('tag-filters')
        if (!container) return
        container.innerHTML = ''
        const allPill = document.createElement('div')
        allPill.className = 'filter-tag tag-filter-all active'; allPill.dataset.tag = 'all'
        allPill.textContent = 'All'; allPill.onclick = () => clearTagFilters()
        container.appendChild(allPill)
        allTags.forEach(t => {
          const pill = document.createElement('div')
          pill.className = 'filter-tag tag-filter-pill'; pill.dataset.tag = t as string
          pill.textContent = capitalize(t as string)
          pill.onclick = () => toggleTagFilter(t as string)
          container.appendChild(pill)
        })
      }

      function clearTagFilters() {
        activeTagFilters = new Set()
        document.querySelectorAll('.tag-filter-pill').forEach(t => t.classList.remove('active'))
        document.querySelector('.tag-filter-all')?.classList.add('active')
        applyFilters()
      }

      function populateReviewerSelect() {
        const sel = document.getElementById('reviewer-select') as HTMLSelectElement
        if (!sel) return
        sel.innerHTML = '<option value="">— all reviewers —</option>'
        REVIEWERS.forEach(r => {
          const opt = document.createElement('option')
          opt.value = String(r.id); opt.textContent = r.name
          sel.appendChild(opt)
        })
        renderReviewerGrid()
      }

      function buildTypeChart(f: typeof FLAVORS) {
        const rated = f.filter(x => !x.unrated)
        const typeSet = [...new Set(rated.map(x => x.type))].sort()
        const blues = ['#002998','#0835b0','#1140c0','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#e0f2fe']
        const o = getBaseOpts()
        destroyChart('type')
        const el = document.getElementById('typeChart')
        if (!el) return
        charts['type'] = new Chart(el as HTMLCanvasElement, {
          type: 'bar',
          data: {
            labels: typeSet.map(capitalize),
            datasets: [{ data: typeSet.map(t => { const tf = rated.filter(x => x.type === t); return tf.length ? +(tf.reduce((s, x) => s + x.avgRating!, 0) / tf.length).toFixed(2) : 0 }), backgroundColor: typeSet.map((_, i) => blues[i % blues.length]), borderRadius: 6, borderSkipped: false as const }],
          },
          options: { ...o, scales: { ...o.scales, y: { ...o.scales.y, min: 0, max: 10 } }, plugins: { ...o.plugins, legend: { display: false } } },
        })
      }

      function buildWaferChart(f: typeof FLAVORS) {
        const rated = f.filter(x => !x.unrated)
        const waferSet = [...new Set(rated.flatMap(x => x.wafers))].filter(Boolean).sort()
        const blues = ['#002280','#002381','#002998','#0835b0','#1140c0','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#e0f2fe']
        const fmt = (w: string) => w.toLowerCase() === 'cocoa (default)' ? 'Cocoa (Default)' : capitalize(w)
        const o = getBaseOpts()
        destroyChart('wafer')
        const el = document.getElementById('waferChart')
        if (!el) return
        charts['wafer'] = new Chart(el as HTMLCanvasElement, {
          type: 'bar',
          data: {
            labels: (waferSet as string[]).map(fmt),
            datasets: [{ data: (waferSet as string[]).map(w => { const contrib = rated.filter(x => x.wafers.includes(w)); return contrib.length ? +(contrib.reduce((s, x) => s + x.avgRating!, 0) / contrib.length).toFixed(2) : 0 }), backgroundColor: waferSet.map((_, i) => blues[i % blues.length]), borderRadius: 6, borderSkipped: false as const }],
          },
          options: { ...o, scales: { ...o.scales, y: { ...o.scales.y, min: 0, max: 10 } }, plugins: { ...o.plugins, legend: { display: false } } },
        })
      }

      function buildScatterChart(f: typeof FLAVORS) {
        const c = getChartColors()
        const data = f.filter(x => !x.unrated && !x.avgOnly).map(x => ({ x: x.avgRating!, y: x.stddev!, label: x.name }))
        const o = getBaseOpts()
        destroyChart('scatter')
        const el = document.getElementById('scatterChart')
        if (!el) return
        charts['scatter'] = new Chart(el as HTMLCanvasElement, {
          type: 'scatter',
          data: { datasets: [{ data, backgroundColor: data.map(d => d.y > 2 ? c.dotHigh : d.x > 8 ? c.dotTop : c.dotBase), pointRadius: 6, pointHoverRadius: 9 }] },
          options: { ...o, plugins: { ...o.plugins, tooltip: { ...o.plugins.tooltip, callbacks: { label: (ctx: any) => ` ${ctx.raw.label}: avg ${ctx.parsed.x.toFixed(2)}, σ ${ctx.parsed.y.toFixed(2)}` } } }, scales: { x: { ...o.scales.x, title: { display: true, text: 'Average Rating', font: { family: 'DM Mono', size: 10 }, color: c.text } }, y: { ...o.scales.y, title: { display: true, text: 'Standard Deviation', font: { family: 'DM Mono', size: 10 }, color: c.text } } } },
        })
      }

      function renderLeaderboard(elId: string, items: any[], total: number, top: boolean) {
        const el = document.getElementById(elId)
        if (!el) return
        el.innerHTML = items.map((f, i) => `
          <div class="lb-row" style="cursor:pointer" onclick="(window.__oreo?.goToFlavor)(${f.id})">
            <div class="lb-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${top ? i+1 : total - i - 1}</div>
            <div><div class="lb-name">${f.name}</div><div class="lb-sub">${capitalize(f.type)}</div></div>
            <div class="lb-bar-wrap"><div class="lb-bar" style="width:${(f.avgRating/10)*100}%;${!top?'background:linear-gradient(90deg,#93c5fd,#dbeafe);':''}"></div></div>
            <div class="lb-score">${f.avgRating.toFixed(2)}</div>
          </div>`).join('')
      }

      function buildLeaderboards(f: typeof FLAVORS) {
        const rated = f.filter(x => !x.unrated)
        renderLeaderboard('leaderboard-top', [...rated].sort((a, b) => b.avgRating! - a.avgRating!).slice(0, 5), rated.length, true)
        renderLeaderboard('leaderboard-bottom', [...rated].sort((a, b) => a.avgRating! - b.avgRating!).slice(0, 5), rated.length, false)
      }

      function buildAllFlavorsChart(f: typeof FLAVORS) {
        const c = getChartColors()
        const rated = f.filter(x => !x.unrated)
        const o = getBaseOpts()
        destroyChart('allFlavors')
        const el = document.getElementById('allFlavorsChart')
        if (!el) return
        charts['allFlavors'] = new Chart(el as HTMLCanvasElement, {
          type: 'bar',
          data: {
            labels: rated.map(x => `${x.name}${x.type !== 'original' && x.type !== 'Loaded' ? ` (${capitalize(x.type)})` : ''}`),
            datasets: [{ data: rated.map(x => x.avgRating!), backgroundColor: rated.map(x => x.avgRating! < 4.5 ? '#93c5fd' : x.avgRating! < 8.0 ? '#2563eb' : '#1e40af'), borderRadius: 6, borderSkipped: false as const }],
          },
          options: { ...o, layout: { padding: { left: 45, right: 8, top: 8, bottom: 2 } }, scales: { ...o.scales, x: { ...o.scales.x, ticks: { font: { family: 'DM Mono', size: window.innerWidth < 600 ? 6 : 8 }, color: c.text, maxRotation: 90, minRotation: window.innerWidth < 600 ? 90 : 50, autoSkip: false } }, y: { ...o.scales.y, min: 0, max: 10 } }, plugins: { ...o.plugins, legend: { display: false } } },
        })
      }

      function goToFlavor(id: number) {
        showPage('flavors')
        const sel = document.getElementById('flavor-select') as HTMLSelectElement
        if (sel) sel.value = String(id)
        loadFlavorDetail()
      }

      function goToReviewer(id: number) {
        showPage('reviewers')
        const sel = document.getElementById('reviewer-select') as HTMLSelectElement
        if (sel) sel.value = String(id)
        loadReviewerDetail()
      }

      function goToReviewerByName(name: string) {
        const r = REVIEWERS.find(x => x.name === name)
        if (r) goToReviewer(r.id)
      }

      function loadFlavorDetail() {
        const sel = document.getElementById('flavor-select') as HTMLSelectElement
        const id = parseInt(sel?.value ?? '')
        if (!id) { renderFlavorGrid(); return }
        const f = FLAVORS.find(x => x.id === id)
        if (!f) return
        const backBtn = document.getElementById('flavor-back-btn')
        if (backBtn) backBtn.style.display = 'flex'

        const imgSrc = f.image ? `/oreos/assets/images/${f.image}` : null
        const panel = document.getElementById('flavor-detail-panel')
        if (!panel) return

        document.getElementById('flavor-type-badge')!.innerHTML = `<span class="flavor-tag type">${f.type.toUpperCase()}</span>`

        if (f.unrated) {
          panel.innerHTML = `<div class="card" style="margin-bottom:20px;"><div class="card-body"><div class="flavor-hero-inner">${imgSrc ? `<img src="${imgSrc}" alt="${f.name}">` : '<div class="flavor-image-placeholder">🍪</div>'}<div class="flavor-meta"><h2>${f.name}</h2><div class="flavor-tags">${f.tags.map((t: string) => `<span class="flavor-tag">🏷 ${t}</span>`).join('')}</div><div class="flavor-stat-notes unrated">↳ haven't tried this one yet — check back later!</div></div></div></div></div>`
          return
        }

        const percentile = Math.round((FLAVORS.filter(x => !x.unrated && x.avgRating! < f.avgRating!).length / FLAVORS.filter(x => !x.unrated).length) * 100)
        const reviewsHTML = f.reviews.map((rev: any) => {
          if (rev.comment === '') return ''
          const reviewer = REVIEWERS.find(r => r.name === rev.name)
          const color = (reviewer as any)?.color ?? '#2563eb'
          const cls = rev.rating >= 8 ? 'high' : rev.rating < 5 ? 'low' : 'mid'
          return `<div class="review-row" style="cursor:pointer" onclick="(window.__oreo?.goToReviewerByName)('${rev.name.replace(/'/g,"\\'")}')"><div class="reviewer-avatar" style="background:${color}">${initials2(rev.name)}</div><div class="review-name">${rev.name}</div><div class="review-note">${rev.comment}</div><div class="rating-pill ${cls}">${rev.rating.toFixed(2)}</div></div>`
        }).join('')
        const commentsCount = f.reviews.filter((r: any) => r.comment !== '').length

        panel.innerHTML = `
          <div class="card" style="margin-bottom:20px;"><div class="card-body"><div class="flavor-hero-inner">
            ${imgSrc ? `<img src="${imgSrc}" alt="${f.name}">` : '<div class="flavor-image-placeholder">🍪</div>'}
            <div class="flavor-meta"><h2>${f.name}</h2>
              <div class="flavor-tags">${f.tags.map((t: string) => `<span class="flavor-tag">🏷 ${t}</span>`).join('')}</div>
              <div class="flavor-stats-row">
                <div class="flavor-stat"><div class="flavor-stat-val">${f.avgRating!.toFixed(2)}</div><div class="flavor-stat-lbl">Average Rating</div></div>
                ${!f.avgOnly ? `<div class="flavor-stat"><div class="flavor-stat-val">${f.stddev!.toFixed(2)}</div><div class="flavor-stat-lbl">Standard Deviation</div></div>` : ''}
                <div class="flavor-stat"><div class="flavor-stat-val">${percentile}<span style="font-size:14px">th</span></div><div class="flavor-stat-lbl">Percentile</div></div>
                <div class="flavor-stat"><div class="flavor-stat-val">${f.avgOnly ? '—' : f.reviews.length}</div><div class="flavor-stat-lbl">Ratings</div></div>
              </div>
              ${f.notes ? `<div class="flavor-stat-notes">"${f.notes}"</div>` : ''}
            </div>
          </div></div></div>
          ${f.avgOnly ? `<div class="card" style="margin-bottom:20px;"><div class="card-header"><div class="card-title">Reviewer Ratings</div></div><div class="card-body"><div class="no-individual-ratings">this is one of the first flavors tried before the system was in place! reviewer ratings weren't recorded. ꃋᴖꃋ</div></div></div>` : `
          <div class="card" style="margin-bottom:20px;"><div class="card-header"><div class="card-title">Reviewer Ratings</div><div class="card-badge">compared to average</div></div><div class="card-body"><div class="chart-container" style="height:220px;"><canvas id="flavorReviewerScatter"></canvas></div></div></div>
          <div class="card" style="margin-top:0;"><div class="card-header"><div class="card-title">Comments</div><div class="card-badge">from ${commentsCount} reviewer${commentsCount === 1 ? '' : 's'}</div></div><div class="card-body"><div class="reviews-list">${reviewsHTML}</div></div></div>`}`

        if (f.avgOnly) return
        const sortedRevs = [...f.reviews].sort((a: any, b: any) => a.name.localeCompare(b.name))
        const c = getChartColors()
        destroyChart('flavorDist')
        const flCanvas = document.getElementById('flavorReviewerScatter')
        if (!flCanvas) return
        charts['flavorDist'] = new Chart(flCanvas as HTMLCanvasElement, {
          type: 'scatter',
          data: {
            datasets: [
              { label: 'Reviewer Rating', data: sortedRevs.map((r: any, i: number) => ({ x: i, y: r.rating, name: r.name })), backgroundColor: sortedRevs.map((r: any) => r.rating >= 8 ? 'rgba(29,64,175,0.85)' : r.rating < 5 ? 'rgba(147,197,253,0.85)' : 'rgba(37,99,235,0.85)'), pointRadius: 7, pointHoverRadius: 10 },
              { label: 'Average', data: sortedRevs.map((_: any, i: number) => ({ x: i, y: f.avgRating!, name: '' })), type: 'line' as const, borderColor: c.avgLine, borderWidth: 2, borderDash: [5, 4], pointRadius: 0, fill: false, tension: 0 },
            ],
          },
          options: {
            ...getBaseOpts(),
            scales: {
              x: { type: 'linear' as const, min: -0.5, max: sortedRevs.length - 0.5, border: { color: c.axis }, ticks: { font: { family: 'DM Mono', size: 9 }, color: c.text, stepSize: 1, callback: (val: any) => sortedRevs[val]?.name ?? '', maxRotation: 45 } },
              y: { ...getBaseOpts().scales.y, min: 0, max: 10, border: { color: c.axis }, ticks: { font: { family: 'DM Mono', size: 9 }, color: c.text, stepSize: 2 } },
            },
            plugins: { ...getBaseOpts().plugins, legend: { display: true, labels: { font: { family: 'DM Mono', size: 10 }, color: c.text, boxWidth: 14 } }, tooltip: { ...getBaseOpts().plugins.tooltip, filter: (item: any) => item.datasetIndex === 0, callbacks: { title: (ctx: any) => ctx[0]?.raw?.name ?? '', label: (ctx: any) => `  ${ctx.parsed.y.toFixed(2)} / 10` } } },
          },
        })
      }

      function renderFlavorGrid(items?: typeof FLAVORS) {
        const source = items ?? FLAVORS
        const rated = [...source].filter(f => !f.unrated).sort((a, b) => a.name.localeCompare(b.name))
        const unrated = [...source].filter(f => f.unrated).sort((a, b) => a.name.localeCompare(b.name))
        function makeCard(f: any) {
          const imgSrc = f.image ? `/oreos/assets/images/${f.image}` : null
          const avatar = imgSrc ? `<img src="${imgSrc}" alt="${f.name}" style="width:72px;height:72px;object-fit:contain;border-radius:6px;flex-shrink:0;">` : `<div class="reviewer-card-avatar" style="background:#2563eb;font-size:22px;letter-spacing:0;"></div>`
          if (f.unrated) return `<div class="reviewer-card" style="opacity:0.75;cursor:pointer" onclick="(window.__oreo?.selectFlavorCard)(${f.id})">${avatar}<div><div class="reviewer-card-name" style="font-size:12px;">${f.name}</div><div class="reviewer-card-rating-lbl">${capitalize(f.type)}</div></div><div><div class="reviewer-card-rating unrated">N/A</div><div class="reviewer-card-rating-lbl">unrated</div></div><div class="reviewer-card-bar"><div class="reviewer-card-bar-fill" style="width:0%;background:#cbd5e1;"></div></div><div class="reviewer-card-meta"><div class="reviewer-card-stat"><div class="reviewer-card-stat-val" style="display:inline;">0 <span class="reviewer-card-stat-lbl" style="display:inline;">Reviews</span></div></div></div></div>`
          const barColor = f.avgRating >= 8 ? '#1e40af' : f.avgRating >= 6 ? '#2563eb' : '#93c5fd'
          return `<div class="reviewer-card" style="cursor:pointer" onclick="(window.__oreo?.selectFlavorCard)(${f.id})">${avatar}<div><div class="reviewer-card-name" style="font-size:12px;">${f.name}</div><div class="reviewer-card-rating-lbl">${capitalize(f.type)}</div></div><div><div class="reviewer-card-rating" style="font-size:20px;">${f.avgRating.toFixed(2)}</div><div class="reviewer-card-rating-lbl">out of 10</div></div><div class="reviewer-card-bar"><div class="reviewer-card-bar-fill" style="width:${(f.avgRating/10)*100}%;background:${barColor};"></div></div><div class="reviewer-card-meta"><div class="reviewer-card-stat"><div class="reviewer-card-stat-val" style="display:inline;">${f.reviews.length} <span class="reviewer-card-stat-lbl" style="display:inline;">Reviews</span></div></div></div></div>`
        }
        const panel = document.getElementById('flavor-detail-panel')
        if (panel) panel.innerHTML = `<div class="reviewer-grid">${rated.map(makeCard).join('')}${unrated.length ? `<div style="grid-column:1/-1;margin-top:24px;margin-bottom:8px;font-size:11px;font-family:'DM Mono',monospace;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;border-top:1px solid var(--border);padding-top:16px;">Queued Flavors (${unrated.length})</div>${unrated.map(makeCard).join('')}` : ''}</div>`
        const backBtn = document.getElementById('flavor-back-btn')
        if (backBtn) backBtn.style.display = 'none'
        document.getElementById('flavor-type-badge')!.innerHTML = ''
        ;(document.getElementById('flavor-select') as HTMLSelectElement).value = ''
      }

      function selectFlavorCard(id: number) {
        ;(document.getElementById('flavor-select') as HTMLSelectElement).value = String(id)
        loadFlavorDetail()
        document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' })
      }

      function renderReviewerGrid() {
        const sorted = [...REVIEWERS].sort((a, b) => a.name.localeCompare(b.name))
        const panel = document.getElementById('reviewer-detail-panel')
        if (!panel) return
        panel.innerHTML = `<div class="reviewer-grid">${sorted.map(r => {
          const barColor = r.avgRating >= 8 ? '#1e40af' : r.avgRating >= 6 ? '#2563eb' : '#93c5fd'
          return `<div class="reviewer-card" style="cursor:pointer" onclick="(window.__oreo?.selectReviewerCard)(${r.id})"><div class="reviewer-card-avatar" style="background:${r.color};">${r.initials}</div><div><div class="reviewer-card-name">${r.name}</div></div><div><div class="reviewer-card-rating">${r.avgRating.toFixed(2)}</div><div class="reviewer-card-rating-lbl">out of 10</div></div><div class="reviewer-card-bar"><div class="reviewer-card-bar-fill" style="width:${(r.avgRating/10)*100}%;background:${barColor};"></div></div><div class="reviewer-card-meta"><div class="reviewer-card-stat"><div class="reviewer-card-stat-val">${r.coverage} <span class="reviewer-card-stat-lbl" style="display:inline;">Reviewed</span></div></div></div></div>`
        }).join('')}</div>`
        const backBtn = document.getElementById('reviewer-back-btn')
        if (backBtn) backBtn.style.display = 'none'
        ;(document.getElementById('reviewer-select') as HTMLSelectElement).value = ''
      }

      function selectReviewerCard(id: number) {
        ;(document.getElementById('reviewer-select') as HTMLSelectElement).value = String(id)
        loadReviewerDetail()
        document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' })
      }

      function loadReviewerDetail() {
        const id = parseInt((document.getElementById('reviewer-select') as HTMLSelectElement)?.value ?? '')
        if (!id) return
        const r = REVIEWERS.find(x => x.id === id) as any
        if (!r) return

        const ratedFlavors = FLAVORS.filter(f => r.ratings[f.name] !== undefined && !f.unrated)
          .map(f => ({ ...f, myRating: r.ratings[f.name], myComment: r.comments[f.name] ?? '' }))
        const sortedRated = [...ratedFlavors].sort((a, b) => b.myRating - a.myRating)
        const topF = sortedRated.slice(0, 5)
        const botCount = sortedRated.length <= 5 ? 0 : Math.min(5, sortedRated.length - 5)
        const botF = [...sortedRated].sort((a, b) => a.myRating - b.myRating).slice(0, botCount)
        const contrarian = +(Math.abs(r.bias) + r.stddev / 4).toFixed(2)
        const highestFlavor = FLAVORS.find(f => f.name === r.highest)
        const highestLabel = r.highest + ((highestFlavor?.type?.toLowerCase() !== 'original' && highestFlavor?.type?.toLowerCase() !== 'loaded') ? ` (${capitalize(highestFlavor?.type ?? '')})` : '')
        const lowestFlavor = FLAVORS.find(f => f.name === r.lowest)
        const lowestLabel = r.lowest + ((lowestFlavor?.type?.toLowerCase() !== 'original' && lowestFlavor?.type?.toLowerCase() !== 'loaded') ? ` (${capitalize(lowestFlavor?.type ?? '')})` : '')
        const isDark = document.body.classList.contains('dark')
        const avatar = isDark ? '/oreos/assets/images/golden-oreo.webp' : '/oreos/assets/images/oreo.webp'

        function lbRow(f: any, i: number, worst: boolean) {
          return `<div class="lb-row" style="cursor:pointer" onclick="(window.__oreo?.goToFlavor)(${f.id})"><div class="lb-rank ${!worst&&i===0?'gold':!worst&&i===1?'silver':!worst&&i===2?'bronze':''}">${worst ? sortedRated.length-i-1 : i+1}</div><div><div class="lb-name">${f.name}</div><div class="lb-sub">${capitalize(f.type)}</div></div><div class="lb-bar-wrap"><div class="lb-bar" style="width:${(f.myRating/10)*100}%;${worst?'background:linear-gradient(90deg,#93c5fd,#dbeafe);':''}"></div></div><div class="lb-score">${f.myRating.toFixed(2)}</div></div>`
        }

        const commentCount = sortedRated.filter(f => f.myComment !== '').length
        const panel = document.getElementById('reviewer-detail-panel')
        if (!panel) return
        panel.innerHTML = `
          <div class="card" style="margin-bottom:20px;"><div class="card-body"><div class="reviewer-hero"><img id="reviewer-hero-image" src="${avatar}" alt="avatar"><div><div class="profile-name">${r.name}</div><div style="display:flex;flex-wrap:wrap;gap:20px;margin-bottom:12px;"><div class="flavor-stat"><div class="flavor-stat-val">${r.avgRating.toFixed(2)}</div><div class="flavor-stat-lbl">Average Rating</div></div>${r.coverage > 1 ? `<div class="flavor-stat"><div class="flavor-stat-val">${r.stddev.toFixed(2)}</div><div class="flavor-stat-lbl">Standard Dev</div></div>` : ''}<div class="flavor-stat"><div class="flavor-stat-val">${r.coverage}</div><div class="flavor-stat-lbl">Flavors Rated</div></div><div class="flavor-stat"><div class="flavor-stat-val">${r.bias >= 0 ? '+' : ''}${r.bias.toFixed(2)}</div><div class="flavor-stat-lbl">Rating Bias</div></div><div class="flavor-stat"><div class="flavor-stat-val">${contrarian}</div><div class="flavor-stat-lbl">Contrarian Score</div></div></div></div></div></div></div>
          <div class="stat-grid" style="margin-bottom:20px;"><div class="stat-card"><div class="stat-label">Favorite</div><div class="stat-value">${highestLabel}</div><div class="stat-sub">highest rated</div></div><div class="stat-card"><div class="stat-label">Least Favorite</div><div class="stat-value">${lowestLabel !== highestLabel ? lowestLabel : '—'}</div><div class="stat-sub">lowest rated</div></div></div>
          <div class="card" style="margin-bottom:20px;"><div class="card-header"><div class="card-title">Reviewer Ratings vs. Average</div><div class="card-badge">CHRONOLOGICAL</div></div><div class="card-body"><div class="chart-container" style="height:290px;"><canvas id="reviewerCompChart"></canvas></div></div></div>
          <div class="chart-grid-2" style="margin-bottom:20px;"><div class="card"><div class="card-header"><div class="card-title">Top 5 Oreos</div></div><div class="card-body">${topF.map((f, i) => lbRow(f, i, false)).join('')}</div></div><div class="card"><div class="card-header"><div class="card-title">Bottom 5 Oreos</div></div><div class="card-body">${botF.length === 0 ? '<div class="no-bottom-oreos">not enough ratings yet</div>' : botF.map((f, i) => lbRow(f, i, true)).join('')}</div></div></div>
          <div class="card"><div class="card-header"><div class="card-title">All Reviews</div><div class="card-badge">ACROSS ${commentCount} OREO${commentCount === 1 ? '' : 'S'}</div></div><div class="card-body"><div class="reviews-list">${commentCount === 0 ? '<div class="no-reviews">*crickets*</div>' : ''}${sortedRated.map(f => { if (f.myComment === '') return ''; const cls = f.myRating >= 8 ? 'high' : f.myRating < 5 ? 'low' : 'mid'; const type = (f.type.toLowerCase() !== 'original' && f.type.toLowerCase() !== 'loaded') ? `(${capitalize(f.type)})` : ''; return `<div class="review-row" style="cursor:pointer" onclick="(window.__oreo?.goToFlavor)(${f.id})"><div class="reviewer-avatar" style="background:${r.color}">${r.initials}</div><div class="review-name">${f.name} ${type}</div><div class="review-note">${f.myComment}</div><div class="rating-pill ${cls}">${f.myRating.toFixed(2)}</div></div>` }).join('')}</div></div></div>`

        document.getElementById('reviewer-back-btn')!.style.display = 'block'

        const c = getChartColors()
        destroyChart('reviewerComp')
        const rcCanvas = document.getElementById('reviewerCompChart')
        if (!rcCanvas) return
        const o = getBaseOpts()
        charts['reviewerComp'] = new Chart(rcCanvas as HTMLCanvasElement, {
          type: 'bar',
          data: {
            labels: ratedFlavors.map(f => `${f.name}${f.type !== 'original' && f.type !== 'loaded' ? ` (${capitalize(f.type)})` : ''}`),
            datasets: [
              { label: 'Reviewer', data: ratedFlavors.map(f => f.myRating), backgroundColor: r.color, borderRadius: 4, borderSkipped: false as const },
              { label: 'Average', data: ratedFlavors.map(f => f.avgRating!), backgroundColor: '#bfdbfe', borderRadius: 4, borderSkipped: false as const },
            ],
          },
          options: {
            ...o, layout: { padding: { left: 80, right: 8, top: 8, bottom: 2 } },
            scales: { ...o.scales, x: { ...o.scales.x, ticks: { font: { family: 'DM Mono', size: window.innerWidth < 600 ? 6 : 8 }, color: c.text, maxRotation: 90, minRotation: window.innerWidth < 600 ? 90 : 50, autoSkip: false } }, y: { ...o.scales.y, min: 0, max: 10 } },
            plugins: { ...o.plugins, legend: { display: true, labels: { font: { family: 'DM Mono', size: 11 }, color: c.text } } },
          },
        })
      }

      function getFilteredFlavors() {
        const minRating = parseFloat((document.getElementById('rating-filter') as HTMLInputElement)?.value ?? '0')
        return FLAVORS.filter(f => {
          if (!activeWaferFilters.has('all') && !f.wafers.some((w: string) => activeWaferFilters.has(w))) return false
          if (!activeTypeFilters.has('all') && !activeTypeFilters.has(f.type)) return false
          if (!f.unrated && f.avgRating! < minRating) return false
          if (f.unrated && minRating > 0) return false
          if (activeTagFilters.size > 0 && !f.tags.some((t: string) => activeTagFilters.has(t))) return false
          return true
        })
      }

      function applyFilters() {
        const filtered = getFilteredFlavors()
        const flavorSel = document.getElementById('flavor-select') as HTMLSelectElement
        if (flavorSel) {
          const cur = flavorSel.value
          flavorSel.innerHTML = '<option value="">— all oreos —</option>'
          ;[...filtered].sort((a, b) => a.name.localeCompare(b.name)).forEach(f => {
            const opt = document.createElement('option')
            opt.value = String(f.id)
            opt.textContent = f.name + (f.type.toLowerCase() !== 'original' && f.type.toLowerCase() !== 'loaded' ? ` (${capitalize(f.type)})` : '')
            flavorSel.appendChild(opt)
          })
          if (filtered.find(f => f.id === parseInt(cur))) flavorSel.value = cur
        }
        buildLeaderboards(filtered)
        if (charts['type']) {
          const rated = filtered.filter(f => !f.unrated)
          const blues = ['#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#e0f2fe','#0284c7']
          const typeSet = [...new Set(rated.map(f => f.type))].sort()
          charts['type'].data.labels = typeSet.map(capitalize)
          charts['type'].data.datasets[0].data = typeSet.map((t: string) => { const tf = rated.filter(f => f.type === t); return tf.length ? +(tf.reduce((s, f) => s + f.avgRating!, 0) / tf.length).toFixed(2) : 0 })
          charts['type'].data.datasets[0].backgroundColor = typeSet.map((_: any, i: number) => blues[i % blues.length])
          charts['type'].update()
        }
        if (charts['wafer']) {
          const rated = filtered.filter(f => !f.unrated)
          const blues = ['#002280','#002381','#002998','#0835b0','#1140c0','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#e0f2fe']
          const fmt = (w: string) => w.toLowerCase() === 'cocoa (default)' ? 'Cocoa (Default)' : capitalize(w)
          const waferSet = [...new Set(rated.flatMap(f => f.wafers))].filter(Boolean).sort()
          charts['wafer'].data.labels = (waferSet as string[]).map(fmt)
          charts['wafer'].data.datasets[0].data = (waferSet as string[]).map(w => { const c = rated.filter(f => f.wafers.includes(w)); return c.length ? +(c.reduce((s, f) => s + f.avgRating!, 0) / c.length).toFixed(2) : 0 })
          charts['wafer'].data.datasets[0].backgroundColor = waferSet.map((_: any, i: number) => blues[i % blues.length])
          charts['wafer'].update()
        }
        if (charts['scatter']) {
          const c = getChartColors()
          const sd = filtered.filter(f => !f.unrated && !f.avgOnly).map(f => ({ x: f.avgRating!, y: f.stddev!, label: f.name }))
          charts['scatter'].data.datasets[0].data = sd
          charts['scatter'].data.datasets[0].backgroundColor = sd.map(d => d.y > 2 ? c.dotHigh : d.x > 8 ? c.dotTop : c.dotBase)
          charts['scatter'].update()
        }
        const countEl = document.getElementById('filter-count')
        if (countEl) {
          const r = filtered.filter(f => !f.unrated).length
          const u = filtered.filter(f => f.unrated).length
          countEl.textContent = `${r} rated${u ? ` + ${u} unrated` : ''} of ${FLAVORS.length} total`
        }
        if (currentPage === 'flavors' && !(document.getElementById('flavor-select') as HTMLSelectElement)?.value) renderFlavorGrid(filtered)
      }

      function clearFilters() {
        ;(document.getElementById('rating-filter') as HTMLInputElement).value = '0'
        const ratingVal = document.getElementById('rating-val')
        if (ratingVal) ratingVal.textContent = '0.00'
        activeWaferFilters = new Set(['all'])
        document.querySelectorAll('#wafer-filters .filter-tag').forEach((t, i) => t.classList.toggle('active', i === 0))
        activeTypeFilters = new Set(['all'])
        document.querySelectorAll('#type-filters .filter-tag').forEach((t, i) => t.classList.toggle('active', i === 0))
        clearTagFilters()
      }

      function toggleWaferFilter(el: HTMLElement, wafer: string) {
        if (wafer === 'all') {
          activeWaferFilters = new Set(['all'])
          document.querySelectorAll('#wafer-filters .filter-tag').forEach(t => t.classList.remove('active'))
          el.classList.add('active')
        } else {
          activeWaferFilters.delete('all')
          document.querySelector('#wafer-filters .filter-tag[data-wafer="all"]')?.classList.remove('active')
          if (activeWaferFilters.has(wafer)) { activeWaferFilters.delete(wafer); el.classList.remove('active') }
          else { activeWaferFilters.add(wafer); el.classList.add('active') }
          if (activeWaferFilters.size === 0) {
            activeWaferFilters = new Set(['all'])
            document.querySelector('#wafer-filters .filter-tag[data-wafer="all"]')?.classList.add('active')
          }
        }
        applyFilters()
      }

      function toggleTypeFilter(el: HTMLElement, type: string) {
        if (type === 'all') {
          activeTypeFilters = new Set(['all'])
          document.querySelectorAll('#type-filters .filter-tag').forEach(t => t.classList.remove('active'))
          el.classList.add('active')
        } else {
          activeTypeFilters.delete('all')
          document.querySelector('#type-filters .filter-tag[data-type="all"]')?.classList.remove('active')
          if (activeTypeFilters.has(type)) { activeTypeFilters.delete(type); el.classList.remove('active') }
          else { activeTypeFilters.add(type); el.classList.add('active') }
          if (activeTypeFilters.size === 0) {
            activeTypeFilters = new Set(['all'])
            document.querySelector('#type-filters .filter-tag[data-type="all"]')?.classList.add('active')
          }
        }
        applyFilters()
      }

      function toggleTagFilter(tag: string) {
        const el = document.querySelector(`.tag-filter-pill[data-tag="${CSS.escape(tag)}"]`)
        if (activeTagFilters.has(tag)) { activeTagFilters.delete(tag); el?.classList.remove('active') }
        else { activeTagFilters.add(tag); el?.classList.add('active') }
        const allPill = document.querySelector('.tag-filter-all')
        if (allPill) allPill.classList.toggle('active', activeTagFilters.size === 0)
        applyFilters()
      }

      function updateChartsForTheme() {
        const c = getChartColors()
        Object.values(charts).forEach(chart => {
          if (!chart) return
          Object.values(chart.options.scales ?? {}).forEach((scale: any) => {
            if (scale.ticks) scale.ticks.color = c.text
            if (scale.title) scale.title.color = c.text
          })
          if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = c.text
          chart.update('none')
        })
      }

      // Expose for onclick="" in innerHTML and React onClick handlers
      ;(window as any).__oreo = { goToFlavor, goToReviewerByName, selectFlavorCard, selectReviewerCard }
      ;(window as any).__oreo_nav = { showPage, openSidebar, closeSidebar, clearFilters }

      // Wire up static DOM event handlers
      document.getElementById('overlay')?.addEventListener('click', closeSidebar)
      document.getElementById('rating-filter')?.addEventListener('input', (e: Event) => {
        const val = parseFloat((e.target as HTMLInputElement).value).toFixed(2)
        const el = document.getElementById('rating-val')
        if (el) el.textContent = val
        applyFilters()
      })
      document.getElementById('flavor-select')?.addEventListener('change', loadFlavorDetail)
      document.getElementById('reviewer-select')?.addEventListener('change', loadReviewerDetail)
      document.getElementById('flavor-back-btn')?.addEventListener('click', () => { renderFlavorGrid(getFilteredFlavors()); document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' }) })
      document.getElementById('reviewer-back-btn')?.addEventListener('click', () => { renderReviewerGrid(); document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' }) })
      document.getElementById('back-to-top')?.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('page-overview')?.scrollIntoView({ behavior: 'smooth' }) })

      // Sync oreo image
      function syncOreoImages() {
        const isDark = document.body.classList.contains('dark')
        const src = isDark ? '/oreos/assets/images/golden-oreo.webp' : '/oreos/assets/images/oreo.webp'
        const link = document.getElementById('oreo-link') as HTMLImageElement
        const hero = document.getElementById('reviewer-hero-image') as HTMLImageElement
        if (link) link.src = src
        if (hero) hero.src = src
      }
      syncOreoImages()

      const themeObserver = new MutationObserver(() => { syncOreoImages(); updateChartsForTheme() })
      themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })

      const resizeTimer = { id: 0 }
      const onResize = () => {
        clearTimeout(resizeTimer.id)
        resizeTimer.id = setTimeout(() => {
          buildAllFlavorsChart(FLAVORS)
          Object.values(charts).forEach(c => c?.resize())
          if (window.innerWidth > 900) closeSidebar()
        }, 100) as unknown as number
      }
      window.addEventListener('resize', onResize)

      // Boot
      populateWaferFilters()
      populateTypeFilters()
      populateIngredientFilter()
      populateReviewerSelect()
      renderFlavorGrid()
      updateOverviewStats()
      buildTypeChart(FLAVORS)
      buildWaferChart(FLAVORS)
      buildScatterChart(FLAVORS)
      buildLeaderboards(FLAVORS)
      buildAllFlavorsChart(FLAVORS)
      applyFilters()

      return () => {
        themeObserver.disconnect()
        window.removeEventListener('resize', onResize)
        delete (window as any).__oreo
        delete (window as any).__oreo_nav
        Object.values(charts).forEach(c => c?.destroy())
        initRef.current = false
      }
    })
  }, [rawFlavors, rawReviewers])

  return (
    <div className="oreos-app">
      <div className="tooltip" id="tooltip"></div>
      <div className="sidebar-overlay" id="overlay"></div>

      <nav className="sidebar" id="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">🥛 OREO STATS</div>
          <div className="logo-sub">Review Dashboard v1.1</div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigate</div>
          <div className="nav-item active" onClick={() => (window as any).__oreo_nav?.showPage('overview')}>Overview</div>
          <div className="nav-item" onClick={() => (window as any).__oreo_nav?.showPage('flavors')}>Flavors</div>
          <div className="nav-item" onClick={() => (window as any).__oreo_nav?.showPage('reviewers')}>Reviewers</div>
        </div>

        <div className="filter-section">
          <div className="sidebar-section-label">Filters</div>
          <div className="filter-group">
            <label className="filter-label">Wafer</label>
            <div className="filter-tags" id="wafer-filters" style={{ maxHeight: '60px', overflowY: 'auto', paddingRight: '2px' }}></div>
          </div>
          <div className="filter-group">
            <label className="filter-label">Filling</label>
            <div className="filter-tags" id="type-filters" style={{ maxHeight: '60px', overflowY: 'auto', paddingRight: '2px' }}></div>
          </div>
          <div className="filter-group">
            <label className="filter-label">Flavor Profile / Component</label>
            <div className="filter-tags" id="tag-filters" style={{ maxHeight: '60px', overflowY: 'auto', paddingRight: '2px' }}></div>
          </div>
          <div className="filter-group">
            <label className="filter-label">Min Average Rating</label>
            <input type="range" id="rating-filter" min="0" max="10" defaultValue="0" step="0.05" style={{ width: '100%', accentColor: 'var(--blue-400)' }} />
            <div style={{ fontSize: '10px', color: 'var(--blue-300)', fontFamily: "'DM Mono',monospace", marginTop: '4px' }}>
              ≥ <span id="rating-val">0.00</span> / 10
            </div>
          </div>
          <button className="clear-filters" onClick={() => (window as any).__oreo_nav?.clearFilters()}>✕ Clear All Filters</button>
          <div id="filter-count" style={{ fontSize: '10px', color: 'var(--blue-400)', fontFamily: "'DM Mono',monospace", marginTop: '10px', textAlign: 'center', letterSpacing: '0.5px' }}></div>
        </div>
      </nav>

      <div className="main">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="hamburger" onClick={() => (window as any).__oreo_nav?.openSidebar()}>☰</button>
            <div className="topbar-title" id="page-title">OVERVIEW</div>
          </div>
          <div className="topbar-right">
            <div className="view-tabs">
              <div className="view-tab active" onClick={() => (window as any).__oreo_nav?.showPage('overview')}>OVERVIEW</div>
              <div className="view-tab" onClick={() => (window as any).__oreo_nav?.showPage('flavors')}>FLAVORS</div>
              <div className="view-tab" onClick={() => (window as any).__oreo_nav?.showPage('reviewers')}>REVIEWERS</div>
            </div>
          </div>
        </div>

        <div className="content">
          <div className="page active" id="page-overview">
            <div className="stat-card" style={{ marginBottom: '20px' }}>
              <div className="stat-label">Rating Scale</div>
              <div className="stat-sub rating-scale">The scale goes from 1-10 (although, truly bad ones have warranted a 0), where an 8 represents a standard Oreo.</div>
            </div>
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header"><div className="card-title">All Oreos by Average Rating</div><div className="card-badge">CHRONOLOGICAL (DATE TRIED)</div></div>
              <div className="card-body"><div className="chart-container" style={{ height: '290px' }}><canvas id="allFlavorsChart"></canvas></div></div>
            </div>
            <div className="stat-grid">
              {['stat-total-flavors','stat-global-avg','stat-total-reviewers','stat-most-loved','stat-most-hated','stat-most-divisive'].map((id, i) => (
                <div className="stat-card" key={id} id={id}>
                  <div className="stat-label">{['Total Flavors','Average Rating','Total Reviewers','Most Loved','Most Hated','Most Divisive'][i]}</div>
                  <div className="stat-value">—</div>
                  <div className="stat-sub">—</div>
                </div>
              ))}
            </div>
            <div className="chart-grid-2">
              <div className="card"><div className="card-header"><div className="card-title">Best Oreos Leaderboard</div><div className="card-badge">FILTER-DRIVEN</div></div><div className="card-body"><div className="leaderboard" id="leaderboard-top"></div></div></div>
              <div className="card"><div className="card-header"><div className="card-title">Worst Oreos Leaderboard</div><div className="card-badge">FILTER-DRIVEN</div></div><div className="card-body"><div className="leaderboard" id="leaderboard-bottom"></div></div></div>
            </div>
            <div className="chart-grid-2">
              <div className="card"><div className="card-header"><div className="card-title">Average Rating by Filling Type</div><div className="card-badge">FILTER-DRIVEN</div></div><div className="card-body"><div className="chart-container" style={{ height: '220px' }}><canvas id="typeChart"></canvas></div></div></div>
              <div className="card"><div className="card-header"><div className="card-title">Average Rating by Wafer Type</div><div className="card-badge">FILTER-DRIVEN</div></div><div className="card-body"><div className="chart-container" style={{ height: '220px' }}><canvas id="waferChart"></canvas></div></div></div>
            </div>
            <div className="chart-grid-2">
              <div className="card"><div className="card-header"><div className="card-title">Controversy vs. Popularity</div><div className="card-badge">FILTER-DRIVEN</div></div><div className="card-body"><div className="chart-container" style={{ height: '220px' }}><canvas id="scatterChart"></canvas></div></div></div>
            </div>
            <canvas id="topFlavorsChart" style={{ display: 'none' }}></canvas>
            <canvas id="distChart" style={{ display: 'none' }}></canvas>
          </div>

          <div className="page" id="page-flavors">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button id="flavor-back-btn" style={{ display: 'none' }}>← ALL OREOS</button>
              <select className="filter-select" id="flavor-select" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)', width: 'auto', minWidth: '200px' }}>
                <option value="">— all oreos —</option>
              </select>
              <div id="flavor-type-badge"></div>
            </div>
            <div id="flavor-detail-panel"></div>
          </div>

          <div className="page" id="page-reviewers">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button id="reviewer-back-btn" style={{ display: 'none' }}>← ALL REVIEWERS</button>
              <select className="filter-select" id="reviewer-select" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)', width: 'auto', minWidth: '200px' }}>
                <option value="">— all reviewers —</option>
              </select>
            </div>
            <div id="reviewer-detail-panel"></div>
          </div>
        </div>

        <div className="end-of-page">
          <a href="#" id="back-to-top">
            <img id="oreo-link" alt="back to top" src="/oreos/assets/images/oreo.webp" /> ↑
          </a>
        </div>
      </div>
    </div>
  )
}
