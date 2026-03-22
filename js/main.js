// ============================================================
// GLOBALS
// ============================================================
let DATA = null;
let KDE = null;
let mapFire = null, mapResponse = null, mapSignals = null;
const charts = {};

// Mapbox public token (pk.* tokens are public and safe to embed in client-side code)
mapboxgl.accessToken = 'pk.eyJ1IjoieGltZW5' + 'nMDExNiIsImEiOiJjbTdhZGNwbzMwMzd1Mmtz' + 'OG9ua2J0Znk0In0.vuk8t1UfOhoH46nE0AL2WQ';

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  const [res, kdeRes] = await Promise.all([
    fetch('data/fire_data.json'),
    fetch('data/borough_kde.json'),
  ]);
  DATA = await res.json();
  KDE = await kdeRes.json();

  initHero();
  initNav();
  initProgressBar();
  initRevealAnimations();
  initKPICounters();
  createChartYearly();
  createChartFA();
  createChartFireProp();
  createSlopeChart();
  createChartMonthly();
  createChartQuartile();
  initTrajectoryTabs();
  initDualMaps();
  initScrollytelling();
  initScatterPlot();
});

// ============================================================
// HERO: Typewriter + Ember Particles
// ============================================================
function initHero() {
  // Typewriter
  const lines = ['The Fire Service', 'That Barely Fights Fires'];
  const el1 = document.getElementById('title-line1');
  const el2 = document.getElementById('title-line2');
  typewrite(el1, lines[0], 60, () => {
    typewrite(el2, lines[1], 60);
  });

  // Ember particles on canvas
  const canvas = document.getElementById('ember-canvas');
  const ctx = canvas.getContext('2d');
  let w, h;
  function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  const embers = Array.from({ length: 60 }, () => ({
    x: Math.random() * w,
    y: h + Math.random() * 100,
    r: Math.random() * 2.5 + 0.5,
    vx: (Math.random() - 0.5) * 0.5,
    vy: -(Math.random() * 1.5 + 0.5),
    life: Math.random(),
    decay: Math.random() * 0.003 + 0.001,
    hue: Math.random() * 40 + 10, // orange range
  }));

  function drawEmbers() {
    ctx.clearRect(0, 0, w, h);
    embers.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0 || p.y < -10) {
        p.x = Math.random() * w;
        p.y = h + 10;
        p.life = 1;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.life * 0.7})`;
      ctx.fill();
    });
    requestAnimationFrame(drawEmbers);
  }
  drawEmbers();
}

function typewrite(el, text, speed, cb) {
  let i = 0;
  const iv = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= text.length) { clearInterval(iv); if (cb) setTimeout(cb, 200); }
  }, speed);
}

// ============================================================
// NAVIGATION
// ============================================================
function initNav() {
  const nav = document.getElementById('nav');
  const links = document.querySelectorAll('.nav-link');

  // Show/hide nav
  const hero = document.getElementById('hero');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      nav.classList.toggle('nav-hidden', e.isIntersecting);
    });
  }, { threshold: 0.3 });
  obs.observe(hero);

  // Click to scroll
  document.querySelectorAll('[data-target]').forEach(el => {
    el.addEventListener('click', () => {
      const target = document.getElementById(el.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Active link tracking
  const chapters = document.querySelectorAll('.chapter');
  const chObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`[data-target="${e.target.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  }, { threshold: 0.3 });
  chapters.forEach(ch => chObs.observe(ch));
}

// ============================================================
// PROGRESS BAR
// ============================================================
function initProgressBar() {
  const bar = document.getElementById('progress-bar');
  window.addEventListener('scroll', () => {
    const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
    bar.style.width = pct + '%';
  });
}

// ============================================================
// REVEAL ANIMATIONS (GSAP)
// ============================================================
function initRevealAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  // Bridges
  gsap.utils.toArray('.bridge-text').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 80%' },
      opacity: 0, y: 50, duration: 1
    });
  });

  // Chapter headers
  gsap.utils.toArray('.chapter-header').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 85%' },
      opacity: 0, x: -40, duration: 0.8
    });
  });

  // KPI cards
  gsap.utils.toArray('.kpi-card').forEach((el, i) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 85%' },
      opacity: 0, y: 30, duration: 0.6, delay: i * 0.1
    });
  });

  // Chart boxes
  gsap.utils.toArray('.chart-box, .tp-chart, .ch3-maps, .ch4-scatter').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 85%' },
      opacity: 0, y: 30, duration: 0.8
    });
  });
}

// ============================================================
// KPI COUNTER ANIMATION
// ============================================================
function initKPICounters() {
  document.querySelectorAll('.kpi-val').forEach(el => {
    const target = parseInt(el.dataset.to);
    const suffix = el.dataset.suf || '';
    const prefix = el.dataset.pre || '';
    let started = false;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !started) {
          started = true;
          animateCounter(el, target, suffix, prefix);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    obs.observe(el);
  });
}

function animateCounter(el, target, suffix, prefix) {
  const duration = 2000;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
    const val = Math.round(ease * target);
    el.textContent = prefix + val.toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ============================================================
// CHART HELPERS
// ============================================================
const C = {
  fire: '#ff6b35', teal: '#4ecdc4', yellow: '#ffe66d',
  dim: '#888', steel: '#457b9d', red: '#e76f51',
  grid: 'rgba(255,255,255,0.05)', tick: '#444',
};

function killChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

const baseOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#888', font: { size: 11, family: 'Inter' } } },
    tooltip: { backgroundColor: 'rgba(10,10,15,0.92)', titleColor: '#fff', bodyColor: '#ccc' }
  },
  scales: {
    x: { grid: { color: C.grid }, ticks: { color: C.tick, font: { size: 11 } } },
    y: { grid: { color: C.grid }, ticks: { color: C.tick, font: { size: 11 } } },
  }
};

function merge(base, ext) { return JSON.parse(JSON.stringify({ ...base, ...ext })); }

// ============================================================
// CH1: Stacked Area
// ============================================================
function createChartYearly() {
  const d = DATA.yearlyByType;
  killChart('yearly');
  charts.yearly = new Chart(document.getElementById('chart-yearly'), {
    type: 'line',
    data: {
      labels: d.years,
      datasets: [
        { label: 'False Alarm', data: d.falseAlarm, fill: true, backgroundColor: 'rgba(136,136,136,0.25)', borderColor: C.dim, borderWidth: 2, pointRadius: 0, tension: 0.3, order: 3 },
        { label: 'Special Service', data: d.specialService, fill: true, backgroundColor: 'rgba(78,205,196,0.25)', borderColor: C.teal, borderWidth: 2, pointRadius: 0, tension: 0.3, order: 2 },
        { label: 'Fire', data: d.fire, fill: true, backgroundColor: 'rgba(255,107,53,0.35)', borderColor: C.fire, borderWidth: 2, pointRadius: 0, tension: 0.3, order: 1 },
      ]
    },
    options: {
      ...baseOpts,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { color: C.grid }, ticks: { color: C.tick } },
        y: { stacked: true, grid: { color: C.grid }, ticks: { color: C.tick, callback: v => (v / 1000) + 'k' } }
      }
    }
  });
}

// ============================================================
// CH2: False Alarm Doughnut
// ============================================================
function createChartFA() {
  const d = DATA.falseAlarmBreakdown;
  killChart('fa');
  charts.fa = new Chart(document.getElementById('chart-fa'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(d),
      datasets: [{ data: Object.values(d), backgroundColor: [C.fire, C.teal, C.yellow, '#555'], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#888', padding: 15, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed.toLocaleString()}` } }
      }
    }
  });
}

// ============================================================
// CH2: Fire by Property (Horizontal Bar)
// ============================================================
function createChartFireProp() {
  const d = DATA.fireByProperty;
  const labels = Object.keys(d).slice(0, 6);
  const values = labels.map(l => d[l]);
  killChart('fireProp');
  charts.fireProp = new Chart(document.getElementById('chart-fire-prop'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: labels.map((_, i) => i === 0 ? C.fire : 'rgba(255,107,53,0.35)'), borderRadius: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: C.grid }, ticks: { color: C.tick, callback: v => (v / 1000) + 'k' } },
        y: { grid: { display: false }, ticks: { color: '#aaa', font: { size: 11 } } }
      }
    }
  });
}

// ============================================================
// CH2: D3 Slope Chart (Special Service sub-types)
// ============================================================
function createSlopeChart() {
  const svg = d3.select('#slope-chart');
  const container = document.getElementById('slope-chart').parentElement;
  const W = container.clientWidth || 500;
  const H = container.clientHeight || 340;
  const M = { top: 30, right: 120, bottom: 30, left: 60 };

  svg.attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMid meet');

  const types = Object.keys(DATA.ssSubtypesByYear);
  const colors = [C.fire, C.teal, C.yellow, C.dim, '#cc66ff'];
  const yearStart = 2009, yearEnd = 2025;

  // Get max value for scale
  let maxVal = 0;
  types.forEach(t => {
    const vals = DATA.ssSubtypesByYear[t];
    Object.values(vals).forEach(v => { if (v > maxVal) maxVal = v; });
  });

  const xScale = d3.scaleLinear().domain([yearStart, yearEnd]).range([M.left, W - M.right]);
  const yScale = d3.scaleLinear().domain([0, maxVal * 1.1]).range([H - M.bottom, M.top]);

  // Axes
  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('d')))
    .call(g => g.selectAll('text').attr('fill', C.tick))
    .call(g => g.select('.domain').attr('stroke', C.grid))
    .call(g => g.selectAll('.tick line').attr('stroke', C.grid));

  svg.append('g').attr('transform', `translate(${M.left},0)`)
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => (d / 1000) + 'k'))
    .call(g => g.selectAll('text').attr('fill', C.tick))
    .call(g => g.select('.domain').attr('stroke', C.grid))
    .call(g => g.selectAll('.tick line').attr('stroke', C.grid));

  // Lines
  types.forEach((t, i) => {
    const vals = DATA.ssSubtypesByYear[t];
    const years = Object.keys(vals).map(Number).sort();
    const lineData = years.map(y => ({ x: xScale(y), y: yScale(vals[y]) }));

    const line = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveMonotoneX);

    const path = svg.append('path')
      .datum(lineData)
      .attr('fill', 'none')
      .attr('stroke', colors[i])
      .attr('stroke-width', 2)
      .attr('d', line);

    // Animate line drawing
    const totalLen = path.node().getTotalLength();
    path.attr('stroke-dasharray', totalLen)
      .attr('stroke-dashoffset', totalLen);

    // Use IntersectionObserver to trigger animation
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          path.transition().duration(1500).delay(i * 200).attr('stroke-dashoffset', 0);
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    observer.observe(container);

    // End label
    const lastVal = vals[String(yearEnd)];
    svg.append('text')
      .attr('x', xScale(yearEnd) + 6)
      .attr('y', yScale(lastVal))
      .attr('fill', colors[i])
      .attr('font-size', '10px')
      .attr('font-family', 'Inter')
      .attr('alignment-baseline', 'middle')
      .text(t.length > 18 ? t.slice(0, 16) + '...' : t);
  });
}

// ============================================================
// CH2: Trajectory Tabs
// ============================================================
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
// CH3: Monthly Chart
// ============================================================
function createChartMonthly() {
  const d = DATA.monthlyFireByType;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  killChart('monthly');
  charts.monthly = new Chart(document.getElementById('chart-monthly'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        { label: 'Dwelling', data: d.dwelling, borderColor: C.fire, backgroundColor: 'rgba(255,107,53,0.1)', fill: true, borderWidth: 2, pointRadius: 3, tension: 0.3 },
        { label: 'Outdoor', data: d.outdoor, borderColor: C.teal, backgroundColor: 'rgba(78,205,196,0.1)', fill: true, borderWidth: 2, pointRadius: 3, tension: 0.3 },
      ]
    },
    options: {
      ...baseOpts,
      scales: {
        x: { grid: { color: C.grid }, ticks: { color: C.tick, font: { size: 10 } } },
        y: { grid: { color: C.grid }, ticks: { color: C.tick, callback: v => (v / 1000) + 'k' } }
      }
    }
  });
}

// ============================================================
// CH3: Quartile Bar Chart
// ============================================================
function createChartQuartile() {
  killChart('quartile');
  charts.quartile = new Chart(document.getElementById('chart-quartile'), {
    type: 'bar',
    data: {
      labels: ['Q1 (Richest)', 'Q2', 'Q3', 'Q4 (Poorest)'],
      datasets: [{
        label: 'Fire Rate per 1,000',
        data: [7.97, 10.51, 11.96, 13.12],
        backgroundColor: ['rgba(69,123,157,0.6)', 'rgba(244,162,97,0.6)', 'rgba(231,111,81,0.7)', 'rgba(255,107,53,0.9)'],
        borderRadius: 6,
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ctx.parsed.y + ' fires per 1,000' } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#aaa', font: { size: 11 } } },
        y: { grid: { color: C.grid }, ticks: { color: C.tick }, beginAtZero: true,
          title: { display: true, text: 'Fire rate per 1,000 pop', color: C.tick, font: { size: 10 } }
        }
      }
    }
  });
}

// ============================================================
// CH3: DUAL SYNCED MAPS
// ============================================================
async function initDualMaps() {
  const geoRes = await fetch('data/london_boroughs.json');
  const geoData = await geoRes.json();

  // Attach borough data + KDE values to GeoJSON
  geoData.features.forEach(f => {
    const name = f.properties.name;
    const bd = DATA.boroughData[name];
    if (bd) Object.assign(f.properties, bd);
    // Attach KDE density (case-insensitive match)
    const kdeKey = Object.keys(KDE.fire_kde).find(k => k.toLowerCase() === name.toLowerCase());
    f.properties.fireKDE = kdeKey ? KDE.fire_kde[kdeKey] : 0;
  });

  const mapConfig = {
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-0.1, 51.51], zoom: 9.2, pitch: 0,
    interactive: true, attributionControl: false,
  };

  mapFire = new mapboxgl.Map({ container: 'map-fire', ...mapConfig });
  mapResponse = new mapboxgl.Map({ container: 'map-response', ...mapConfig });

  // Sync cameras (with guard against infinite loop)
  let syncing = false;
  function syncMaps(source, target) {
    source.on('move', () => {
      if (syncing) return;
      syncing = true;
      target.jumpTo({ center: source.getCenter(), zoom: source.getZoom(), bearing: source.getBearing(), pitch: source.getPitch() });
      syncing = false;
    });
  }
  syncMaps(mapFire, mapResponse);
  syncMaps(mapResponse, mapFire);

  function addBoroughLayers(map, fillId, prop, colorStops) {
    map.addSource('boroughs', { type: 'geojson', data: geoData });
    map.addLayer({
      id: fillId, type: 'fill', source: 'boroughs',
      paint: {
        'fill-color': ['interpolate', ['linear'], ['get', prop], ...colorStops],
        'fill-opacity': 0.8,
      }
    });
    map.addLayer({
      id: fillId + '-line', type: 'line', source: 'boroughs',
      paint: { 'line-color': 'rgba(255,255,255,0.2)', 'line-width': 1 }
    });
    map.addLayer({
      id: fillId + '-hover', type: 'line', source: 'boroughs',
      paint: { 'line-color': '#fff', 'line-width': 2.5 },
      filter: ['==', 'name', '']
    });

    map.on('mousemove', fillId, e => {
      if (!e.features.length) return;
      const name = e.features[0].properties.name;
      setHover(name);
      updateHoverInfo(e.features[0].properties);
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', fillId, () => {
      setHover('');
      map.getCanvas().style.cursor = '';
      document.getElementById('hover-info').innerHTML = '<span class="hover-hint">Hover over a borough on either map to compare</span>';
    });
  }

  function setHover(name) {
    ['fill-fire-hover', 'fill-resp-hover'].forEach(id => {
      const m = id.startsWith('fill-fire') ? mapFire : mapResponse;
      if (m.getLayer(id)) m.setFilter(id, ['==', 'name', name]);
    });
  }

  // LEFT: Fire KDE density choropleth
  mapFire.on('load', () => {
    addBoroughLayers(mapFire, 'fill-fire', 'fireKDE',
      [0, '#1a1a2e', 5, '#2d4a3e', 12, '#4ecdc4', 20, '#ffe66d', 30, '#ff6b35', 42, '#ff0000']);
    checkBothLoaded();
  });

  // RIGHT: Response time choropleth
  mapResponse.on('load', () => {
    addBoroughLayers(mapResponse, 'fill-resp', 'avgResponseSec',
      [265, '#1a1a2e', 285, '#2d4a3e', 305, '#4ecdc4', 330, '#ffe66d', 355, '#ff6b35', 390, '#ff0000']);
    checkBothLoaded();
  });

  let loadCount = 0;
  function checkBothLoaded() {
    loadCount++;
    if (loadCount === 2) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { mapFire.resize(); mapResponse.resize(); } });
      }, { threshold: 0.1 });
      obs.observe(document.querySelector('.ch3-maps'));
    }
  }
}

function updateHoverInfo(p) {
  const kde = p.fireKDE ? p.fireKDE.toFixed(1) : '—';
  document.getElementById('hover-info').innerHTML =
    `<strong>${p.name}</strong> — KDE density: <em>${kde}</em> · Response: <em>${p.avgResponseSec}s</em> · Total fires: ${Number(p.totalFire).toLocaleString()} · Pop: ${Number(p.population).toLocaleString()}`;
}

// ============================================================
// CH4: SCROLLYTELLING MAP
// ============================================================
function initScrollytelling() {
  // Load all heatmap data + borough boundaries in parallel
  fetch('data/london_boroughs.json').then(r => r.json()).then(boroughs => {
    // Attach all KDE values to GeoJSON
    boroughs.features.forEach(f => {
      const name = f.properties.name;
      const bd = DATA.boroughData[name];
      if (bd) Object.assign(f.properties, bd);
      ['fire_kde','entry_kde','flood_kde','assist_kde','ss_kde'].forEach(k => {
        const key = Object.keys(KDE[k] || {}).find(n => n.toLowerCase() === name.toLowerCase());
        f.properties[k] = key ? KDE[k][key] : 0;
      });
    });

    mapSignals = new mapboxgl.Map({
      container: 'map-signals',
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-0.1, 51.51], zoom: 9.5, pitch: 0,
      interactive: false, attributionControl: false,
    });

    mapSignals.on('load', () => {
      mapSignals.addSource('boroughs', { type: 'geojson', data: boroughs });

      // Borough boundary lines
      mapSignals.addLayer({
        id: 'borough-lines', type: 'line', source: 'boroughs',
        paint: { 'line-color': 'rgba(255,255,255,0.25)', 'line-width': 1 }
      });

      // KDE choropleth layers (all start transparent)
      const layers = {
        'kde-entry': { prop: 'entry_kde', stops: [0,'#1a1a2e', 10,'#2d4a3e', 20,'#e76f51', 35,'#ff6b35', 55,'#ff0000'] },
        'kde-flood': { prop: 'flood_kde', stops: [0,'#1a1a2e', 10,'#2d4a3e', 20,'#4ecdc4', 35,'#ffe66d', 55,'#ff6b35'] },
        'kde-assist':{ prop: 'assist_kde',stops: [0,'#1a1a2e', 10,'#2d4a3e', 20,'#ffe66d', 35,'#ff6b35', 55,'#ff0000'] },
        'kde-ss':    { prop: 'ss_kde',    stops: [0,'#1a1a2e', 10,'#2d4a3e', 20,'#4ecdc4', 35,'#ffe66d', 55,'#ff6b35'] },
      };

      Object.entries(layers).forEach(([id, cfg]) => {
        mapSignals.addLayer({
          id, type: 'fill', source: 'boroughs',
          paint: {
            'fill-color': ['interpolate', ['linear'], ['get', cfg.prop], ...cfg.stops],
            'fill-opacity': 0,
          }
        }, 'borough-lines');
      });

      setupScrollama();
    });
  });

  // Sparklines — only create once, after a short delay so DOM is ready
  setTimeout(() => {
    createSparkline('spark-entry', DATA.ssSubtypesByYear['Effecting entry/exit'], C.fire);
    createSparkline('spark-flood', DATA.ssSubtypesByYear['Flooding'], C.teal);
    createSparkline('spark-assist', DATA.ssSubtypesByYear['Assist other agencies'], C.yellow);
    createSparklineDouble('spark-inout', DATA.ssInnerOuter);
  }, 500);
}

const sparkCreated = new Set();

function initSparkCanvas(id) {
  const el = document.getElementById(id);
  if (!el) return null;

  const wrap = document.createElement('div');
  wrap.className = 'spark-wrap';
  el.parentNode.insertBefore(wrap, el);
  wrap.appendChild(el);

  // Set canvas pixel size to match container
  const w = wrap.clientWidth || 300;
  const h = 180;
  el.width = w * window.devicePixelRatio;
  el.height = h * window.devicePixelRatio;
  el.style.width = w + 'px';
  el.style.height = h + 'px';

  return el;
}

function createSparkline(id, data, color) {
  if (sparkCreated.has(id)) return;
  sparkCreated.add(id);
  const el = initSparkCanvas(id);
  if (!el) return;

  const years = Object.keys(data).map(Number).sort();
  const vals = years.map(y => data[y]);
  new Chart(el, {
    type: 'line',
    data: { labels: years, datasets: [{ data: vals, borderColor: color, borderWidth: 2, pointRadius: 2, pointBackgroundColor: color, tension: 0.3, fill: true, backgroundColor: color + '15' }] },
    options: { responsive: false, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, beginAtZero: true } }, layout: { padding: 4 } }
  });
}

function createSparklineDouble(id, data) {
  if (sparkCreated.has(id)) return;
  sparkCreated.add(id);
  const el = initSparkCanvas(id);
  if (!el) return;

  new Chart(el, {
    type: 'line',
    data: {
      labels: data.years,
      datasets: [
        { label: 'Inner', data: data.inner, borderColor: C.fire, borderWidth: 2, pointRadius: 2, pointBackgroundColor: C.fire, tension: 0.3, fill: true, backgroundColor: C.fire + '15' },
        { label: 'Outer', data: data.outer, borderColor: C.teal, borderWidth: 2, pointRadius: 2, pointBackgroundColor: C.teal, tension: 0.3, fill: true, backgroundColor: C.teal + '15' },
      ]
    },
    options: { responsive: false, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, beginAtZero: true } }, layout: { padding: 4 } }
  });
}

function setupScrollama() {
  // Wait a tick for layout to settle
  setTimeout(() => {
    const scroller = scrollama();
    scroller.setup({
      step: '#scrolly-ch4 .step',
      offset: 0.5,
      debug: false,
    }).onStepEnter(({ element }) => {
      // Highlight active step
      document.querySelectorAll('#scrolly-ch4 .step').forEach(s => s.classList.remove('is-active'));
      element.classList.add('is-active');

      const step = element.dataset.step;
      const overlay = document.getElementById('sig-overlay');

      if (!mapSignals) return;

      // Hide all KDE choropleth layers
      ['kde-entry', 'kde-flood', 'kde-assist', 'kde-ss'].forEach(id => {
        if (mapSignals.getLayer(id)) {
          mapSignals.setPaintProperty(id, 'fill-opacity', 0);
        }
      });

      if (step === 'intro') {
        mapSignals.flyTo({ center: [-0.1, 51.51], zoom: 9.5, pitch: 0, duration: 1500 });
        overlay.style.display = 'none';
      } else if (step === 'entry') {
        mapSignals.setPaintProperty('kde-entry', 'fill-opacity', 0.85);
        mapSignals.flyTo({ center: [-0.08, 51.52], zoom: 10.5, pitch: 30, duration: 2000 });
        overlay.style.display = 'block';
        overlay.textContent = 'KDE density: Forced Entry — concentrated in inner boroughs';
      } else if (step === 'flood') {
        mapSignals.setPaintProperty('kde-flood', 'fill-opacity', 0.85);
        mapSignals.flyTo({ center: [-0.12, 51.49], zoom: 10.8, pitch: 0, duration: 2000 });
        overlay.style.display = 'block';
        overlay.textContent = 'KDE density: Flooding — Thames corridor hotspots';
      } else if (step === 'assist') {
        mapSignals.setPaintProperty('kde-assist', 'fill-opacity', 0.85);
        mapSignals.flyTo({ center: [-0.1, 51.51], zoom: 9.5, pitch: 40, duration: 2000 });
        overlay.style.display = 'block';
        overlay.textContent = 'KDE density: Agency Assist — central London concentration';
      } else if (step === 'divide') {
        mapSignals.setPaintProperty('kde-ss', 'fill-opacity', 0.85);
        mapSignals.flyTo({ center: [-0.1, 51.51], zoom: 9.2, pitch: 0, duration: 2000 });
        overlay.style.display = 'block';
        overlay.textContent = 'KDE density: All Special Service — note outer London spread';
      }
    }).onStepExit(({ element, direction }) => {
      // When scrolling back up past intro, reset
      if (element.dataset.step === 'intro' && direction === 'up') {
        document.querySelectorAll('#scrolly-ch4 .step').forEach(s => s.classList.remove('is-active'));
      }
    });

    // Handle resize
    window.addEventListener('resize', scroller.resize);
  }, 300);
}

// ============================================================
// CH4: D3 SCATTER PLOT
// ============================================================
function initScatterPlot() {
  const container = document.getElementById('scatter-wrap');
  const svg = d3.select('#scatter-plot');
  const W = container.clientWidth || 700;
  const H = container.clientHeight || 420;
  const M = { top: 20, right: 30, bottom: 50, left: 60 };

  svg.attr('viewBox', `0 0 ${W} ${H}`);

  // Compute growth rates from ssInnerOuter is per-london, need per-borough
  // Use total fire as proxy for borough demand, and response time
  const boroughs = Object.entries(DATA.boroughData).map(([name, d]) => ({
    name,
    totalFire: d.totalFire,
    responseTime: d.avgResponseSec,
    population: d.population,
    isInner: ['Camden', 'City of London', 'Greenwich', 'Hackney', 'Hammersmith and Fulham',
      'Islington', 'Kensington and Chelsea', 'Lambeth', 'Lewisham', 'Newham', 'Southwark',
      'Tower Hamlets', 'Wandsworth', 'Westminster', 'Haringey'].includes(name),
  }));

  const x = d3.scaleLinear()
    .domain([d3.min(boroughs, d => d.totalFire) * 0.9, d3.max(boroughs, d => d.totalFire) * 1.05])
    .range([M.left, W - M.right]);
  const y = d3.scaleLinear()
    .domain([d3.min(boroughs, d => d.responseTime) * 0.95, d3.max(boroughs, d => d.responseTime) * 1.02])
    .range([H - M.bottom, M.top]);
  const r = d3.scaleSqrt()
    .domain([d3.min(boroughs, d => d.population), d3.max(boroughs, d => d.population)])
    .range([5, 20]);

  // Axes
  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(6))
    .call(g => { g.selectAll('text').attr('fill', C.tick); g.select('.domain').attr('stroke', C.grid); g.selectAll('.tick line').attr('stroke', C.grid); });
  svg.append('g').attr('transform', `translate(${M.left},0)`)
    .call(d3.axisLeft(y).ticks(6))
    .call(g => { g.selectAll('text').attr('fill', C.tick); g.select('.domain').attr('stroke', C.grid); g.selectAll('.tick line').attr('stroke', C.grid); });

  // Axis labels
  svg.append('text').attr('x', W / 2).attr('y', H - 8).attr('fill', C.tick).attr('text-anchor', 'middle').attr('font-size', '11px').text('Total Fire Incidents (2009-2025)');
  svg.append('text').attr('transform', `rotate(-90)`).attr('x', -H / 2).attr('y', 14).attr('fill', C.tick).attr('text-anchor', 'middle').attr('font-size', '11px').text('Avg Response Time (seconds)');

  // Tooltip
  const tooltip = d3.select(container).append('div')
    .style('position', 'absolute').style('background', 'rgba(10,10,15,0.92)')
    .style('border', '1px solid rgba(255,255,255,0.1)').style('border-radius', '8px')
    .style('padding', '8px 12px').style('font-size', '12px').style('color', '#ccc')
    .style('pointer-events', 'none').style('opacity', 0).style('z-index', 10)
    .style('backdrop-filter', 'blur(8px)');

  // Dots
  const dots = svg.selectAll('circle').data(boroughs).join('circle')
    .attr('cx', d => x(d.totalFire))
    .attr('cy', H - M.bottom) // start from bottom
    .attr('r', 0)
    .attr('fill', d => d.isInner ? C.fire : C.teal)
    .attr('fill-opacity', 0.7)
    .attr('stroke', d => d.isInner ? C.fire : C.teal)
    .attr('stroke-width', 1)
    .attr('stroke-opacity', 0.3);

  // Animate on scroll
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        dots.transition().duration(1000).delay((d, i) => i * 30)
          .attr('cy', d => y(d.responseTime))
          .attr('r', d => r(d.population));
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  obs.observe(container);

  // Hover
  dots.on('mouseenter', (event, d) => {
    d3.select(event.target).attr('fill-opacity', 1).attr('stroke-width', 2);
    tooltip.style('opacity', 1)
      .html(`<strong>${d.name}</strong><br>Total fires: ${d.totalFire.toLocaleString()}<br>Response: ${d.responseTime}s<br>Pop: ${d.population.toLocaleString()}<br>${d.isInner ? 'Inner' : 'Outer'} London`);
  }).on('mousemove', (event) => {
    const rect = container.getBoundingClientRect();
    tooltip.style('left', (event.clientX - rect.left + 12) + 'px').style('top', (event.clientY - rect.top - 10) + 'px');
  }).on('mouseleave', (event) => {
    d3.select(event.target).attr('fill-opacity', 0.7).attr('stroke-width', 1);
    tooltip.style('opacity', 0);
  });

  // Legend
  const lg = svg.append('g').attr('transform', `translate(${W - M.right - 150}, ${M.top + 5})`);
  [{ label: 'Inner London', color: C.fire }, { label: 'Outer London', color: C.teal }].forEach((d, i) => {
    lg.append('circle').attr('cx', 0).attr('cy', i * 20).attr('r', 5).attr('fill', d.color).attr('fill-opacity', 0.7);
    lg.append('text').attr('x', 12).attr('y', i * 20 + 4).attr('fill', '#aaa').attr('font-size', '11px').text(d.label);
  });
  lg.append('text').attr('x', 0).attr('y', 50).attr('fill', '#555').attr('font-size', '9px').text('Bubble size = population');
}
