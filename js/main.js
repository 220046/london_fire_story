// ============================================================
// GLOBALS
// ============================================================
let DATA = null;
let mapFire = null, mapFA = null, mapSS = null, mapResp = null;
const charts = {};

mapboxgl.accessToken = 'pk.eyJ1IjoieGltZW5' + 'nMDExNiIsImEiOiJjbTdhZGNwbzMwMzd1Mmtz' + 'OG9ua2J0Znk0In0.vuk8t1UfOhoH46nE0AL2WQ';

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch('data/fire_data.json');
  DATA = await res.json();

  initHero();
  initNav();
  initProgressBar();
  initRevealAnimations();
  initKPICounters();
  initTrajectoryTabs();

  createChartYearly();
  createChartFA();
  createChartFireProp();
  createSlopeChart();
  createChartInOut();
  createChartQuartile();
  createChartMonthlyAll();

  initTripleMaps();
  initResponseMap();
  initScatterPlot();
  initScrollytelling();
});

// ============================================================
// HERO: Typewriter + Ember Particles
// ============================================================
function initHero() {
  const lines = ['The Fire Service', 'That Barely Fights Fires'];
  typewrite(document.getElementById('title-line1'), lines[0], 60, () => {
    typewrite(document.getElementById('title-line2'), lines[1], 60);
  });

  const canvas = document.getElementById('ember-canvas');
  const ctx = canvas.getContext('2d');
  let w, h;
  function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);

  const embers = Array.from({ length: 60 }, () => ({
    x: Math.random() * (w || 1000), y: (h || 800) + Math.random() * 100,
    r: Math.random() * 2.5 + 0.5, vx: (Math.random() - 0.5) * 0.5,
    vy: -(Math.random() * 1.5 + 0.5), life: Math.random(),
    decay: Math.random() * 0.003 + 0.001, hue: Math.random() * 40 + 10,
  }));
  (function draw() {
    ctx.clearRect(0, 0, w, h);
    embers.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0 || p.y < -10) { p.x = Math.random() * w; p.y = h + 10; p.life = 1; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.life * 0.7})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  })();
}

function typewrite(el, text, speed, cb) {
  let i = 0;
  const iv = setInterval(() => { el.textContent += text[i]; i++; if (i >= text.length) { clearInterval(iv); if (cb) setTimeout(cb, 200); } }, speed);
}

// ============================================================
// NAV + PROGRESS
// ============================================================
function initNav() {
  const nav = document.getElementById('nav');
  const hero = document.getElementById('hero');
  new IntersectionObserver(e => { e.forEach(x => nav.classList.toggle('nav-hidden', x.isIntersecting)); }, { threshold: 0.3 }).observe(hero);

  document.querySelectorAll('[data-target]').forEach(el => {
    el.addEventListener('click', () => document.getElementById(el.dataset.target)?.scrollIntoView({ behavior: 'smooth' }));
  });

  const links = document.querySelectorAll('.nav-link');
  const chapters = document.querySelectorAll('.chapter');
  new IntersectionObserver(e => { e.forEach(x => { if (x.isIntersecting) { links.forEach(l => l.classList.remove('active')); document.querySelector(`[data-target="${x.target.id}"]`)?.classList.add('active'); } }); }, { threshold: 0.2 }).observe(chapters[0]);
  chapters.forEach(ch => new IntersectionObserver(e => { e.forEach(x => { if (x.isIntersecting) { links.forEach(l => l.classList.remove('active')); document.querySelector(`[data-target="${x.target.id}"]`)?.classList.add('active'); } }); }, { threshold: 0.2 }).observe(ch));
}

function initProgressBar() {
  const bar = document.getElementById('progress-bar');
  window.addEventListener('scroll', () => { bar.style.width = (window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100) + '%'; });
}

// ============================================================
// GSAP REVEAL ANIMATIONS
// ============================================================
function initRevealAnimations() {
  gsap.registerPlugin(ScrollTrigger);
  gsap.utils.toArray('.bridge-text').forEach(el => { gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 80%' }, opacity: 0, y: 50, duration: 1 }); });
  gsap.utils.toArray('.chapter-header').forEach(el => { gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 85%' }, opacity: 0, x: -40, duration: 0.8 }); });
  gsap.utils.toArray('.kpi-card').forEach((el, i) => { gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 85%' }, opacity: 0, y: 30, duration: 0.6, delay: i * 0.1 }); });
  gsap.utils.toArray('.chart-box, .tp-chart, .triple-maps, .single-map-wrap, .chart-scatter').forEach(el => { gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 85%' }, opacity: 0, y: 30, duration: 0.8 }); });
}

// ============================================================
// KPI COUNTERS
// ============================================================
function initKPICounters() {
  document.querySelectorAll('.kpi-val').forEach(el => {
    const target = parseInt(el.dataset.to), suffix = el.dataset.suf || '', prefix = el.dataset.pre || '';
    let started = false;
    new IntersectionObserver(e => { e.forEach(x => { if (x.isIntersecting && !started) { started = true; animateCounter(el, target, suffix, prefix); } }); }, { threshold: 0.5 }).observe(el);
  });
}
function animateCounter(el, target, suffix, prefix) {
  const start = performance.now();
  (function tick(now) {
    const p = Math.min((now - start) / 2000, 1), ease = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + Math.round(ease * target).toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(tick);
  })(performance.now());
}

// ============================================================
// CHART HELPERS
// ============================================================
const C = { fire: '#ff6b35', teal: '#4ecdc4', yellow: '#ffe66d', dim: '#888', steel: '#457b9d', red: '#e76f51', grid: 'rgba(255,255,255,0.05)', tick: '#444' };
function killChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

// ============================================================
// CH1 CHARTS
// ============================================================
function createChartYearly() {
  const d = DATA.yearlyByType;
  killChart('yearly');
  charts.yearly = new Chart(document.getElementById('chart-yearly'), {
    type: 'line',
    data: { labels: d.years, datasets: [
      { label: 'False Alarm', data: d.falseAlarm, fill: true, backgroundColor: 'rgba(136,136,136,0.25)', borderColor: C.dim, borderWidth: 2, pointRadius: 0, tension: 0.3, order: 3 },
      { label: 'Special Service', data: d.specialService, fill: true, backgroundColor: 'rgba(78,205,196,0.25)', borderColor: C.teal, borderWidth: 2, pointRadius: 0, tension: 0.3, order: 2 },
      { label: 'Fire', data: d.fire, fill: true, backgroundColor: 'rgba(255,107,53,0.35)', borderColor: C.fire, borderWidth: 2, pointRadius: 0, tension: 0.3, order: 1 },
    ]},
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#888', font: { size: 12 } } }, tooltip: { backgroundColor: 'rgba(10,10,15,0.9)' } },
      scales: { x: { grid: { color: C.grid }, ticks: { color: C.tick } }, y: { stacked: true, grid: { color: C.grid }, ticks: { color: C.tick, callback: v => (v/1000)+'k' } } }
    }
  });
}

function createChartFA() {
  const d = DATA.falseAlarmBreakdown;
  killChart('fa');
  charts.fa = new Chart(document.getElementById('chart-fa'), {
    type: 'doughnut',
    data: { labels: Object.keys(d), datasets: [{ data: Object.values(d), backgroundColor: [C.fire, C.teal, C.yellow, '#555', '#333'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { position: 'bottom', labels: { color: '#888', font: { size: 11 } } } } }
  });
}

function createChartFireProp() {
  const d = DATA.fireByProperty;
  const labels = Object.keys(d).slice(0, 6), values = labels.map(l => d[l]);
  killChart('fireProp');
  charts.fireProp = new Chart(document.getElementById('chart-fire-prop'), {
    type: 'bar', data: { labels, datasets: [{ data: values, backgroundColor: labels.map((_, i) => i === 0 ? C.fire : 'rgba(255,107,53,0.35)'), borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } },
      scales: { x: { grid: { color: C.grid }, ticks: { color: C.tick, callback: v => (v/1000)+'k' } }, y: { grid: { display: false }, ticks: { color: '#aaa', font: { size: 11 } } } } }
  });
}

function createSlopeChart() {
  const svg = d3.select('#slope-chart');
  const container = document.getElementById('slope-chart').parentElement;
  const W = container.clientWidth || 500, H = container.clientHeight || 300;
  const M = { top: 25, right: 110, bottom: 25, left: 50 };
  svg.attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMid meet');

  const types = Object.keys(DATA.ssSubtypesByYear);
  const colors = [C.fire, C.teal, C.yellow, C.dim, '#cc66ff'];
  let maxVal = 0;
  types.forEach(t => { Object.values(DATA.ssSubtypesByYear[t]).forEach(v => { if (v > maxVal) maxVal = v; }); });

  const years = DATA.yearlyByType.years;
  const xS = d3.scaleLinear().domain([d3.min(years), d3.max(years)]).range([M.left, W - M.right]);
  const yS = d3.scaleLinear().domain([0, maxVal * 1.1]).range([H - M.bottom, M.top]);

  svg.append('g').attr('transform', `translate(0,${H-M.bottom})`).call(d3.axisBottom(xS).ticks(5).tickFormat(d3.format('d'))).call(g => { g.selectAll('text').attr('fill', C.tick); g.select('.domain').attr('stroke', C.grid); });
  svg.append('g').attr('transform', `translate(${M.left},0)`).call(d3.axisLeft(yS).ticks(4).tickFormat(d => (d/1000)+'k')).call(g => { g.selectAll('text').attr('fill', C.tick); g.select('.domain').attr('stroke', C.grid); });

  types.forEach((t, i) => {
    const vals = DATA.ssSubtypesByYear[t];
    const pts = Object.keys(vals).map(Number).sort().map(y => ({ x: xS(y), y: yS(vals[y]) }));
    const line = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveMonotoneX);
    const path = svg.append('path').datum(pts).attr('fill', 'none').attr('stroke', colors[i]).attr('stroke-width', 2).attr('d', line);
    const len = path.node().getTotalLength();
    path.attr('stroke-dasharray', len).attr('stroke-dashoffset', len);
    new IntersectionObserver(e => { e.forEach(x => { if (x.isIntersecting) { path.transition().duration(1500).delay(i * 200).attr('stroke-dashoffset', 0); } }); }, { threshold: 0.3 }).observe(container);

    const lastY = d3.max(Object.keys(vals).map(Number));
    svg.append('text').attr('x', xS(lastY) + 5).attr('y', yS(vals[lastY])).attr('fill', colors[i]).attr('font-size', '9px').attr('alignment-baseline', 'middle').text(t.length > 16 ? t.slice(0, 14) + '..' : t);
  });
}

function initTrajectoryTabs() {
  document.querySelectorAll('.traj-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.traj-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.traj-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('tp-' + tab.dataset.t).classList.add('active');
    });
  });
}

// ============================================================
// CH1: TRIPLE MAPS with time slider + sub-category pills
// ============================================================
const PERIODS = [
  { key: 'p1', label: '2014-2016' },
  { key: 'p2', label: '2017-2019' },
  { key: 'p3', label: '2020-2022' },
  { key: 'p4', label: '2023-2025' },
];
let currentProp = { fire: 't', fa: 't', ss: 't' }; // which property each map shows
let showAllYears = true;
const triMaps = {};

function getColorExpr(prop, maxVal) {
  return ['interpolate', ['linear'], ['get', prop],
    0, '#1a1a2e', maxVal * 0.15, '#2d4a3e', maxVal * 0.3, '#4ecdc4',
    maxVal * 0.5, '#ffe66d', maxVal * 0.75, '#ff6b35', maxVal, '#ff0000'];
}

async function initTripleMaps() {
  const [boroughs, gridFire, gridFA, gridSS] = await Promise.all([
    fetch('data/london_boroughs.json').then(r => r.json()),
    fetch('data/grid_fire.json').then(r => r.json()),
    fetch('data/grid_fa.json').then(r => r.json()),
    fetch('data/grid_ss.json').then(r => r.json()),
  ]);

  const cfg = { style: 'mapbox://styles/mapbox/dark-v11', center: [-0.1, 51.51], zoom: 9.2, pitch: 0, interactive: true, attributionControl: false };

  function setupMap(containerId, gridData, mapKey) {
    const map = new mapboxgl.Map({ container: containerId, ...cfg });
    triMaps[mapKey] = map;

    map.on('load', () => {
      map.addSource('grid', { type: 'geojson', data: gridData });
      map.addSource('boroughs', { type: 'geojson', data: boroughs });
      map.addLayer({ id: 'grid-fill', type: 'fill', source: 'grid', paint: {
        'fill-color': getColorExpr('d', 100), 'fill-opacity': 0.85 } });
      map.addLayer({ id: 'blines', type: 'line', source: 'boroughs', paint: { 'line-color': 'rgba(255,255,255,0.5)', 'line-width': 1.2 } });

      map.on('mousemove', 'grid-fill', e => {
        if (!e.features.length) return;
        map.getCanvas().style.cursor = 'pointer';
        const p = e.features[0].properties;
        const prop = currentProp[mapKey];
        const val = p[prop] || 0;
        document.getElementById('triple-hover').innerHTML = `250m grid - ${prop === 't' ? 'Total' : prop}: <em>${val}</em> incidents`;
      });
      map.on('mouseleave', 'grid-fill', () => {
        map.getCanvas().style.cursor = '';
        document.getElementById('triple-hover').innerHTML = '<span class="hover-hint">Hover a grid cell. Use slider/pills to filter.</span>';
      });
    });
  }

  setupMap('map-fire', gridFire, 'fire');
  setupMap('map-fa', gridFA, 'fa');
  setupMap('map-ss', gridSS, 'ss');

  // Sync cameras
  let syncing = false;
  function sync(src, targets) {
    src.on('move', () => {
      if (syncing) return; syncing = true;
      targets.forEach(t => t.jumpTo({ center: src.getCenter(), zoom: src.getZoom(), bearing: src.getBearing(), pitch: src.getPitch() }));
      syncing = false;
    });
  }

  setTimeout(() => {
    const maps = Object.values(triMaps);
    maps.forEach((m, i) => { sync(m, maps.filter((_, j) => j !== i)); });
    new IntersectionObserver(e => { e.forEach(x => { if (x.isIntersecting) maps.forEach(m => m.resize()); }); }, { threshold: 0.1 }).observe(document.querySelector('.triple-maps'));
  }, 2000);

  // --- Time slider ---
  const slider = document.getElementById('time-slider');
  const label = document.getElementById('time-label');
  const playBtn = document.getElementById('time-play');
  const allBtn = document.getElementById('time-all');

  function updateMaps() {
    Object.entries(triMaps).forEach(([key, map]) => {
      if (!map.getLayer('grid-fill')) return;
      let prop;
      if (showAllYears) {
        prop = currentProp[key]; // sub-category or 't'
      } else {
        // In time mode, show period count for selected sub or total
        const sub = currentProp[key];
        if (sub === 't') {
          prop = PERIODS[parseInt(slider.value)].key; // p1/p2/p3/p4
        } else {
          // Can't cross sub-category with time (data doesn't have that combo)
          // Fall back to period total
          prop = PERIODS[parseInt(slider.value)].key;
        }
      }
      // Estimate max for color scaling
      const maxEst = showAllYears ? 100 : 40;
      map.setPaintProperty('grid-fill', 'fill-color', getColorExpr(prop, maxEst));
    });
  }

  slider.addEventListener('input', () => {
    showAllYears = false;
    allBtn.classList.remove('active');
    label.textContent = PERIODS[parseInt(slider.value)].label;
    updateMaps();
  });

  allBtn.addEventListener('click', () => {
    showAllYears = !showAllYears;
    allBtn.classList.toggle('active', showAllYears);
    label.textContent = showAllYears ? 'All Years' : PERIODS[parseInt(slider.value)].label;
    updateMaps();
  });
  allBtn.classList.add('active'); // default

  let playing = false, playIv = null;
  playBtn.addEventListener('click', () => {
    if (playing) { clearInterval(playIv); playBtn.textContent = 'Play'; playing = false; return; }
    playing = true; playBtn.textContent = 'Pause';
    showAllYears = false; allBtn.classList.remove('active');
    let idx = parseInt(slider.value);
    playIv = setInterval(() => {
      idx = (idx + 1) % PERIODS.length;
      slider.value = idx;
      label.textContent = PERIODS[idx].label;
      updateMaps();
      if (idx === PERIODS.length - 1) { clearInterval(playIv); playBtn.textContent = 'Play'; playing = false; }
    }, 1500);
  });

  // --- Sub-category pills ---
  document.querySelectorAll('.sub-pills').forEach(pillGroup => {
    const mapKey = pillGroup.dataset.map;
    pillGroup.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
        pillGroup.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentProp[mapKey] = pill.dataset.sub;
        updateMaps();
      });
    });
  });
}

// ============================================================
// CH2: RESPONSE TIME MAP
// ============================================================
async function initResponseMap() {
  const [boroughs, gridResp] = await Promise.all([
    fetch('data/london_boroughs.json').then(r => r.json()),
    fetch('data/grid_response.json').then(r => r.json()),
  ]);
  mapResp = new mapboxgl.Map({ container: 'map-response', style: 'mapbox://styles/mapbox/dark-v11', center: [-0.1, 51.51], zoom: 9.2, pitch: 0, interactive: true, attributionControl: false });
  mapResp.on('load', () => {
    mapResp.addSource('grid', { type: 'geojson', data: gridResp });
    mapResp.addSource('boroughs', { type: 'geojson', data: boroughs });
    mapResp.addLayer({ id: 'grid-fill', type: 'fill', source: 'grid', paint: {
      'fill-color': ['interpolate', ['linear'], ['get', 'd'], 0, '#1a1a2e', 20, '#2d4a3e', 40, '#4ecdc4', 60, '#ffe66d', 80, '#ff6b35', 100, '#ff0000'], 'fill-opacity': 0.85 } });
    mapResp.addLayer({ id: 'blines', type: 'line', source: 'boroughs', paint: { 'line-color': 'rgba(255,255,255,0.5)', 'line-width': 1.2 } });
    mapResp.addLayer({ id: 'blabels', type: 'symbol', source: 'boroughs', layout: { 'text-field': ['get', 'name'], 'text-size': 9, 'text-anchor': 'center' }, paint: { 'text-color': 'rgba(255,255,255,0.4)', 'text-halo-color': 'rgba(0,0,0,0.5)', 'text-halo-width': 1 } });
    mapResp.on('mousemove', 'grid-fill', e => {
      if (!e.features.length) return;
      mapResp.getCanvas().style.cursor = 'pointer';
      const p = e.features[0].properties;
      document.getElementById('resp-hover').innerHTML = `250m grid - Avg response: <em>${p.r}s</em> - Incidents: ${p.c}`;
    });
    mapResp.on('mouseleave', 'grid-fill', () => { mapResp.getCanvas().style.cursor = ''; document.getElementById('resp-hover').innerHTML = '<span class="hover-hint">Hover for response time</span>'; });
  });
  new IntersectionObserver(e => { e.forEach(x => { if (x.isIntersecting) mapResp?.resize(); }); }, { threshold: 0.1 }).observe(document.getElementById('map-response'));
}

// ============================================================
// CH2: SCATTER PLOT (SS growth vs response time)
// ============================================================
function initScatterPlot() {
  const container = document.getElementById('scatter-plot').parentElement;
  const svg = d3.select('#scatter-plot');
  const W = container.clientWidth || 700, H = container.clientHeight || 400;
  const M = { top: 20, right: 30, bottom: 50, left: 60 };
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const inner = ['Camden','City of London','Greenwich','Hackney','Hammersmith and Fulham','Islington','Kensington and Chelsea','Lambeth','Lewisham','Newham','Southwark','Tower Hamlets','Wandsworth','Westminster','Haringey'];
  const boroughs = Object.entries(DATA.boroughData).filter(([,d]) => d.ssGrowth !== 0).map(([name, d]) => ({
    name, ssGrowth: d.ssGrowth, responseTime: d.avgResponseSec, population: d.population, isInner: inner.includes(name),
  }));

  const x = d3.scaleLinear().domain([0, d3.max(boroughs, d => d.ssGrowth) * 1.05]).range([M.left, W - M.right]);
  const y = d3.scaleLinear().domain([d3.min(boroughs, d => d.responseTime) * 0.95, d3.max(boroughs, d => d.responseTime) * 1.02]).range([H - M.bottom, M.top]);
  const r = d3.scaleSqrt().domain(d3.extent(boroughs, d => d.population)).range([5, 18]);

  svg.append('g').attr('transform', `translate(0,${H-M.bottom})`).call(d3.axisBottom(x).ticks(6).tickFormat(d => d + '%')).call(g => { g.selectAll('text').attr('fill', C.tick); g.select('.domain').attr('stroke', C.grid); });
  svg.append('g').attr('transform', `translate(${M.left},0)`).call(d3.axisLeft(y).ticks(6)).call(g => { g.selectAll('text').attr('fill', C.tick); g.select('.domain').attr('stroke', C.grid); });
  svg.append('text').attr('x', W / 2).attr('y', H - 8).attr('fill', C.tick).attr('text-anchor', 'middle').attr('font-size', '11px').text('Special Service Growth Rate 2014-2025 (%)');
  svg.append('text').attr('transform', 'rotate(-90)').attr('x', -H / 2).attr('y', 14).attr('fill', C.tick).attr('text-anchor', 'middle').attr('font-size', '11px').text('Avg First Pump Attendance (seconds)');

  // Danger zone highlight
  svg.append('rect').attr('x', x(80)).attr('y', y(380)).attr('width', x(140) - x(80)).attr('height', y(320) - y(380)).attr('fill', 'rgba(255,107,53,0.06)').attr('stroke', 'rgba(255,107,53,0.2)').attr('stroke-dasharray', '4');
  svg.append('text').attr('x', x(110)).attr('y', y(375)).attr('fill', 'rgba(255,107,53,0.4)').attr('font-size', '9px').attr('text-anchor', 'middle').text('DANGER ZONE');

  const tooltip = d3.select(container).append('div').style('position', 'absolute').style('background', 'rgba(10,10,15,0.92)').style('border', '1px solid rgba(255,255,255,0.1)').style('border-radius', '8px').style('padding', '8px 12px').style('font-size', '12px').style('color', '#ccc').style('pointer-events', 'none').style('opacity', 0).style('z-index', 10);

  const dots = svg.selectAll('circle').data(boroughs).join('circle')
    .attr('cx', d => x(d.ssGrowth)).attr('cy', H - M.bottom).attr('r', 0)
    .attr('fill', d => d.isInner ? C.fire : C.teal).attr('fill-opacity', 0.7).attr('stroke', d => d.isInner ? C.fire : C.teal).attr('stroke-width', 1);

  new IntersectionObserver(e => { e.forEach(x2 => { if (x2.isIntersecting) { dots.transition().duration(1000).delay((d, i) => i * 30).attr('cy', d => y(d.responseTime)).attr('r', d => r(d.population)); } }); }, { threshold: 0.3 }).observe(container);

  dots.on('mouseenter', (event, d) => {
    d3.select(event.target).attr('fill-opacity', 1).attr('stroke-width', 2);
    tooltip.style('opacity', 1).html(`<strong>${d.name}</strong><br>SS growth: ${d.ssGrowth}%<br>Response: ${d.responseTime}s<br>Pop: ${d.population.toLocaleString()}<br>${d.isInner ? 'Inner' : 'Outer'} London`);
  }).on('mousemove', event => {
    const rect = container.getBoundingClientRect();
    tooltip.style('left', (event.clientX - rect.left + 12) + 'px').style('top', (event.clientY - rect.top - 10) + 'px');
  }).on('mouseleave', event => { d3.select(event.target).attr('fill-opacity', 0.7).attr('stroke-width', 1); tooltip.style('opacity', 0); });

  const lg = svg.append('g').attr('transform', `translate(${W - M.right - 140}, ${M.top + 5})`);
  [{ label: 'Inner London', color: C.fire }, { label: 'Outer London', color: C.teal }].forEach((d, i) => {
    lg.append('circle').attr('cx', 0).attr('cy', i * 18).attr('r', 5).attr('fill', d.color).attr('fill-opacity', 0.7);
    lg.append('text').attr('x', 12).attr('y', i * 18 + 4).attr('fill', '#aaa').attr('font-size', '10px').text(d.label);
  });
}

// ============================================================
// CH2: Inner vs Outer chart
// ============================================================
function createChartInOut() {
  const d = DATA.ssInnerOuter;
  killChart('inout');
  charts.inout = new Chart(document.getElementById('chart-inout'), {
    type: 'line',
    data: { labels: d.years, datasets: [
      { label: 'Inner London SS', data: d.inner, borderColor: C.fire, backgroundColor: C.fire + '15', fill: true, borderWidth: 2, pointRadius: 2, tension: 0.3 },
      { label: 'Outer London SS', data: d.outer, borderColor: C.teal, backgroundColor: C.teal + '15', fill: true, borderWidth: 2, pointRadius: 2, tension: 0.3 },
    ]},
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#888' } } },
      scales: { x: { grid: { color: C.grid }, ticks: { color: C.tick } }, y: { grid: { color: C.grid }, ticks: { color: C.tick, callback: v => (v/1000)+'k' } } }
    }
  });
}

// ============================================================
// CH2: IMD Quartile chart
// ============================================================
function createChartQuartile() {
  const d = DATA.imdQuartile;
  killChart('quartile');
  charts.quartile = new Chart(document.getElementById('chart-quartile'), {
    type: 'bar',
    data: { labels: d.labels, datasets: [{ label: 'Fire Rate per 1,000', data: d.fireRate,
      backgroundColor: ['rgba(69,123,157,0.6)', 'rgba(244,162,97,0.6)', 'rgba(231,111,81,0.7)', 'rgba(255,107,53,0.9)'], borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false }, ticks: { color: '#aaa', font: { size: 11 } } }, y: { grid: { color: C.grid }, ticks: { color: C.tick }, beginAtZero: true } } }
  });
}

// ============================================================
// CH3: Monthly all types overlay
// ============================================================
function createChartMonthlyAll() {
  const d = DATA.monthlyByType;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  killChart('monthlyAll');
  charts.monthlyAll = new Chart(document.getElementById('chart-monthly-all'), {
    type: 'line',
    data: { labels: months, datasets: [
      { label: 'Outdoor Fire', data: d.outdoor_fire, borderColor: C.fire, borderWidth: 2, pointRadius: 3, tension: 0.3 },
      { label: 'Dwelling Fire', data: d.dwelling_fire, borderColor: C.amber || '#f4a261', borderWidth: 2, pointRadius: 3, tension: 0.3, borderDash: [5, 3] },
      { label: 'Flooding', data: d.flooding, borderColor: C.teal, borderWidth: 2, pointRadius: 3, tension: 0.3 },
      { label: 'Forced Entry', data: d.forced_entry, borderColor: C.steel, borderWidth: 2, pointRadius: 3, tension: 0.3 },
      { label: 'Agency Assist', data: d.agency_assist, borderColor: C.yellow, borderWidth: 2, pointRadius: 3, tension: 0.3 },
      { label: 'False Alarm', data: d.false_alarm, borderColor: C.dim, borderWidth: 1.5, pointRadius: 2, tension: 0.3, borderDash: [3, 3] },
    ]},
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { color: '#888', font: { size: 10 }, boxWidth: 14 } } },
      scales: { x: { grid: { color: C.grid }, ticks: { color: C.tick } }, y: { grid: { color: C.grid }, ticks: { color: C.tick, callback: v => (v/1000)+'k' } } }
    }
  });
}

// ============================================================
// CH3: SCROLLYTELLING monthly focus chart
// ============================================================
let monthlyFocusChart = null;

function initScrollytelling() {
  const d = DATA.monthlyByType;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const configs = {
    outdoor: { data: d.outdoor_fire, color: C.fire, label: 'Outdoor Fire' },
    dwelling: { data: d.dwelling_fire, color: '#f4a261', label: 'Dwelling Fire' },
    flooding: { data: d.flooding, color: C.teal, label: 'Flooding' },
    entry: { data: d.forced_entry, color: C.steel, label: 'Forced Entry' },
    assist: { data: d.agency_assist, color: C.yellow, label: 'Agency Assist' },
    collision: null, // special case
  };

  function updateFocusChart(step) {
    const canvas = document.getElementById('chart-monthly-focus');
    if (monthlyFocusChart) monthlyFocusChart.destroy();

    let datasets;
    if (step === 'collision') {
      datasets = [
        { label: 'Outdoor Fire', data: d.outdoor_fire, borderColor: C.fire, backgroundColor: C.fire + '20', fill: true, borderWidth: 2, pointRadius: 2, tension: 0.3 },
        { label: 'Flooding', data: d.flooding, borderColor: C.teal, backgroundColor: C.teal + '20', fill: true, borderWidth: 2, pointRadius: 2, tension: 0.3 },
        { label: 'Forced Entry', data: d.forced_entry, borderColor: C.steel, backgroundColor: C.steel + '20', fill: true, borderWidth: 2, pointRadius: 2, tension: 0.3 },
      ];
    } else {
      const cfg = configs[step];
      if (!cfg) return;
      datasets = [{ label: cfg.label, data: cfg.data, borderColor: cfg.color, backgroundColor: cfg.color + '20', fill: true, borderWidth: 2.5, pointRadius: 3, tension: 0.3 }];
    }

    monthlyFocusChart = new Chart(canvas, {
      type: 'line',
      data: { labels: months, datasets },
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
        plugins: { legend: { labels: { color: '#888' } } },
        scales: { x: { grid: { color: C.grid }, ticks: { color: C.tick } }, y: { grid: { color: C.grid }, ticks: { color: C.tick, callback: v => v >= 1000 ? (v/1000)+'k' : v }, beginAtZero: true } }
      }
    });
  }

  // Scrollama
  setTimeout(() => {
    const scroller = scrollama();
    scroller.setup({ step: '#scrolly-ch3 .step', offset: 0.5 })
      .onStepEnter(({ element }) => {
        document.querySelectorAll('#scrolly-ch3 .step').forEach(s => s.classList.remove('is-active'));
        element.classList.add('is-active');
        updateFocusChart(element.dataset.step);
      });
    window.addEventListener('resize', scroller.resize);
  }, 500);
}
