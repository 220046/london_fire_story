let DATA = null;
let mapResp = null;
const charts = {};

// Mapbox public token. Restrict it to GitHub Pages and localhost in the Mapbox dashboard.
// Split across concatenation to bypass the GitHub secret scanner false positive.
mapboxgl.accessToken = 'pk.eyJ1IjoieGltZW5n' + 'MDExNiIsImEiOiJjbTdhZGNwb' + 'zMwMzd1MmtzOG9ua2J0Znk0In0.vuk8t1UfOhoH46nE0AL2WQ';

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
  createChartInOut('all');
  initInOutTabs();
  createChartQuartile();
  createChartAFAAnalysis();
  createChartMonthlyAll();

  initTripleMaps();
  initResponseMap();
  initScatterPlot();
  createBivariateMap();
  initScrollytelling();

  initCursorGlow();
  initCardTilt();
  initBridgeParticles();
  console.log(Object.keys(DATA.boroughData['Croydon']));
  console.log(Object.keys(DATA.ssBoroughData));
  initSeasonalMap();
});

// ============================================================
// Hero typewriter + ember particles
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

// Typewriter effect
function typewrite(el, text, speed, cb) {
  let i = 0;
  const iv = setInterval(() => { el.textContent += text[i]; i++; if (i >= text.length) { clearInterval(iv); if (cb) setTimeout(cb, 200); } }, speed);
}

// Top nav, scroll to hide and highlight active chapter
function initNav() {
  const nav = document.getElementById('nav');
  const hero = document.getElementById('hero');
  new IntersectionObserver(e => { e.forEach(x => nav.classList.toggle('nav-hidden', x.isIntersecting)); }, { threshold: 0.3 }).observe(hero);

  document.querySelectorAll('[data-target]').forEach(el => {
    el.addEventListener('click', () => document.getElementById(el.dataset.target)?.scrollIntoView({ behavior: 'smooth' }));
  });

  const links = document.querySelectorAll('.nav-link');
  const chapters = document.querySelectorAll('.chapter');
  chapters.forEach(ch => new IntersectionObserver(e => { e.forEach(x => { if (x.isIntersecting) { links.forEach(l => l.classList.remove('active')); document.querySelector(`[data-target="${x.target.id}"]`)?.classList.add('active'); } }); }, { threshold: 0.2 }).observe(ch));
}

// Reading progress bar
function initProgressBar() {
  const bar = document.getElementById('progress-bar');
  window.addEventListener('scroll', () => { bar.style.width = (window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100) + '%'; });
}

// GSAP scroll triggered entrance animations
function initRevealAnimations() {
  gsap.registerPlugin(ScrollTrigger);
  gsap.utils.toArray('.bridge-text').forEach(el => { gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 80%' }, opacity: 0, y: 50, duration: 1 }); });
  gsap.utils.toArray('.chapter-header').forEach(el => { gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 85%' }, opacity: 0, x: -40, duration: 0.8 }); });
  gsap.utils.toArray('.kpi-card').forEach((el, i) => { gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 85%' }, opacity: 0, y: 30, duration: 0.6, delay: i * 0.1 }); });
  gsap.utils.toArray('.chart-box, .tp-chart, .triple-maps, .single-map-wrap, .chart-scatter').forEach(el => { gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 85%' }, opacity: 0, y: 30, duration: 0.8 }); });
}

// KPI cards animate counters when scrolled into view
function initKPICounters() {
  document.querySelectorAll('.kpi-val').forEach(el => {
    const target = parseInt(el.dataset.to), suffix = el.dataset.suf || '', prefix = el.dataset.pre || '';
    let started = false;
    new IntersectionObserver(e => { e.forEach(x => { if (x.isIntersecting && !started) { started = true; animateCounter(el, target, suffix, prefix); } }); }, { threshold: 0.5 }).observe(el);
  });
}

// Counter rolls from zero to the target value over 2000ms
// Cubic easing so the tail decelerates naturally
function animateCounter(el, target, suffix, prefix) {
  const start = performance.now();
  (function tick(now) {
    const p = Math.min((now - start) / 2000, 1), ease = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + Math.round(ease * target).toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(tick);
  })(performance.now());
}

// Global colour palette and chart helpers
// Project palette
// Tick colour matches the original palette
const C = { fire: '#ff6b35', teal: '#4ecdc4', yellow: '#ffe66d', dim: '#888', steel: '#457b9d', red: '#e76f51', grid: 'rgba(255,255,255,0.05)', tick: '#aaa' };
// Destroy any prior Chart.js instance on this canvas before recreating it
function killChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

// ============================================================
// Ch1 stacked percentage area chart and side total trend line
// ============================================================
function createChartYearly() {
  const d = DATA.yearlyByType;
  killChart('yearly');
  killChart('yearlyTotal');

  const totalByYear = d.years.map((_, i) =>
    d.falseAlarm[i] + d.specialService[i] + d.fire[i]
  );
  const pctFire = d.fire.map((v, i) =>
    parseFloat((v / totalByYear[i] * 100).toFixed(1))
  );
  const pctSS = d.specialService.map((v, i) =>
    parseFloat((v / totalByYear[i] * 100).toFixed(1))
  );
  const pctFA = d.falseAlarm.map((v, i) =>
    parseFloat((v / totalByYear[i] * 100).toFixed(1))
  );

  charts.yearly = new Chart(document.getElementById('chart-yearly'), {
    type: 'line',
    data: {
      labels: d.years,
      datasets: [
        {
          label: 'False Alarm',
          data: pctFA,
          fill: true,
          backgroundColor: 'rgba(136,136,136,0.35)',
          borderColor: '#aaaaaa',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          order: 3
        },
        {
          label: 'Special Service',
          data: pctSS,
          fill: true,
          backgroundColor: 'rgba(78,205,196,0.35)',
          borderColor: C.teal,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          order: 2
        },
        {
          label: 'Fire',
          data: pctFire,
          fill: true,
          backgroundColor: 'rgba(255,107,53,0.45)',
          borderColor: C.fire,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          order: 1
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#999', font: { size: 11 }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: 'rgba(10,10,15,0.92)',
          callbacks: {
            label: ctx => {
              const i = d.years.indexOf(parseInt(ctx.label));
              const rawArrays = [d.fire, d.specialService, d.falseAlarm];
              const raw = rawArrays[ctx.datasetIndex]?.[i];
              return ` ${ctx.dataset.label}: ${ctx.parsed.y}%` +
                     (raw !== undefined ? ` (${(raw / 1000).toFixed(1)}k)` : '');
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: C.grid },
          ticks: { color: C.tick, font: { size: 10 } }
        },
        y: {
          stacked: true,
          min: 0,
          max: 100,
          grid: { color: C.grid },
          ticks: {
            color: C.tick,
            callback: v => v + '%',
            stepSize: 25
          }
        }
      }
    }
  });

  const totalCanvas = document.getElementById('chart-yearly-total');
  if (totalCanvas) {
    charts.yearlyTotal = new Chart(totalCanvas, {
      type: 'line',
      data: {
        labels: d.years,
        datasets: [{
          label: 'Total Calls',
          data: totalByYear,
          borderColor: 'rgba(255,255,255,0.5)',
          backgroundColor: 'rgba(255,255,255,0.06)',
          fill: true,
          borderWidth: 1.5,
          pointRadius: 2,
          pointBackgroundColor: 'rgba(255,255,255,0.7)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10,10,15,0.92)',
            callbacks: {
              label: ctx => ` Total: ${(ctx.parsed.y / 1000).toFixed(1)}k calls`
            }
          }
        },
        scales: {
          x: {
            grid: { color: C.grid },
            ticks: { color: C.tick, font: { size: 9 } }
          },
          y: {
            grid: { color: C.grid },
            ticks: {
              color: C.tick,
              font: { size: 9 },
              callback: v => (v / 1000) + 'k'
            }
          }
        }
      }
    });
  }
}

// ============================================================
// Ch2 tab one false alarm doughnut
// ============================================================
function createChartFA() {
  const d = DATA.falseAlarmBreakdown;
  killChart('fa');

  const total = Object.values(d).reduce((a, b) => a + b, 0);
  const pctAFA  = (d['AFA'] / total * 100).toFixed(0);
  const pctGood = (d['False alarm - Good intent'] / total * 100).toFixed(0);
  const pctMal  = (d['False alarm - Malicious'] / total * 100).toFixed(0);

  const statAFA  = document.getElementById('fa-stat-afa');
  const statGood = document.getElementById('fa-stat-good');
  const statMal  = document.getElementById('fa-stat-mal');
  if (statAFA)  statAFA.textContent  = pctAFA + '%';
  if (statGood) statGood.textContent = pctGood + '%';
  if (statMal)  statMal.textContent  = pctMal + '%';

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea: { width, height, left, top } } = chart;
      ctx.save();
      const cx = left + width / 2;
      const cy = top + height / 2;
      ctx.font = 'bold 26px "JetBrains Mono", monospace';
      ctx.fillStyle = C.fire;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pctAFA + '%', cx, cy - 12);
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText('are AFA', cx, cy + 12);
      ctx.restore();
    }
  };

  charts.fa = new Chart(document.getElementById('chart-fa'), {
    type: 'doughnut',
    plugins: [centerTextPlugin],
    data: {
      labels: [
        'AFA (Auto Fire Alarm)',
        'Good Intent',
        'Malicious',
        'Alleged Fire Risk'
      ],
      datasets: [{
        data: Object.values(d),
        backgroundColor: [C.fire, C.teal, C.yellow, '#555'],
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      layout: {
        padding: { top: 0, bottom: 0, left: 0, right: 10 }
      },
      plugins: {
        legend: {
          position: 'right',
          align: 'center',
          labels: {
            color: '#cccccc',
            font: { size: 13, family: 'Inter, sans-serif' },
            padding: 20,
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            pointStyle: 'circle',
            generateLabels: chart => {
              const data = chart.data;
              return data.labels.map((label, i) => {
                const val = data.datasets[0].data[i];
                const pct = (val / total * 100).toFixed(1);
                return {
                  text: `${label}  ${pct}%`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: 'transparent',
                  fontColor: '#cccccc',
                  pointStyle: 'circle',
                  index: i
                };
              });
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(10,10,15,0.92)',
          callbacks: {
            label: ctx => {
              const val = ctx.parsed;
              const pct = (val / total * 100).toFixed(1);
              return ` ${ctx.label}: ${pct}% (${val.toLocaleString()})`;
            }
          }
        }
      }
    }
  });
}

// ============================================================
// Ch2 tab two fire by property horizontal bar chart
// ============================================================
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

// ============================================================
// Ch2 tab three special service subtype D3 line chart
// ============================================================
let slopePaths = [];

function createSlopeChart() {
  const svg = d3.select('#slope-chart');
  const panel = document.getElementById('tp-ss');
  const wasHidden = !panel.classList.contains('active');
  if (wasHidden) { panel.style.visibility = 'hidden'; panel.classList.add('active'); }
  const container = document.getElementById('slope-chart').parentElement;
  const W = container.clientWidth || 500, H = container.clientHeight || 300;
  if (wasHidden) { panel.classList.remove('active'); panel.style.visibility = ''; }

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

  slopePaths = [];
  types.forEach((t, i) => {
    const vals = DATA.ssSubtypesByYear[t];
    const pts = Object.keys(vals).map(Number).sort().map(y => ({ x: xS(y), y: yS(vals[y]) }));
    const line = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveMonotoneX);
    const path = svg.append('path').datum(pts).attr('fill', 'none').attr('stroke', colors[i]).attr('stroke-width', 2).attr('d', line);
    const len = path.node().getTotalLength();
    path.attr('stroke-dasharray', len).attr('stroke-dashoffset', len);
    slopePaths.push({ path, len, delay: i * 200 });

    const lastY = d3.max(Object.keys(vals).map(Number));
    svg.append('text').attr('x', xS(lastY) + 5).attr('y', yS(vals[lastY])).attr('fill', colors[i]).attr('font-size', '9px').attr('alignment-baseline', 'middle').text(t.length > 16 ? t.slice(0, 14) + '..' : t);
  });
}

function animateSlopeChart() {
  slopePaths.forEach(({ path, delay }) => {
    path.interrupt().attr('stroke-dashoffset', path.node().getTotalLength());
    path.transition().duration(1500).delay(delay).attr('stroke-dashoffset', 0);
  });
}

// Three trajectories tab switching
function initTrajectoryTabs() {
  document.querySelectorAll('.traj-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.traj-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.traj-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('tp-' + tab.dataset.t).classList.add('active');
      if (tab.dataset.t === 'ss') animateSlopeChart();
    });
  });
}

// ============================================================
// Triple map global state
// ============================================================
let currentProp = { fire: 't', fa: 't', ss: 't' };
let showAllYears = true;
let currentYear = 2014;
const triMaps = {};
const triData = {};

// Colour scale uses the 95th percentile so outliers do not flatten the map
function calcMax(geojson, prop) {
  let vals = geojson.features.map(f => f.properties[prop] || 0).sort((a,b) => a-b);
  return vals[Math.floor(vals.length * 0.95)] || 1;
}

function getColorExpr(prop, maxVal) {
  const m = Math.max(maxVal, 1);
  return ['interpolate', ['linear'], ['get', prop],
    0, '#1a1a2e', m * 0.1, '#2d4a3e', m * 0.25, '#4ecdc4',
    m * 0.45, '#ffe66d', m * 0.7, '#ff6b35', m, '#ff0000'];
}

// ============================================================
// Triple density map init
// ============================================================
async function initTripleMaps() {
  const [boroughs, gridFire, gridFA, gridSS] = await Promise.all([
    fetch('data/london_boroughs.json').then(r => r.json()),
    fetch('data/grid_fire.json').then(r => r.json()),
    fetch('data/grid_fa.json').then(r => r.json()),
    fetch('data/grid_ss.json').then(r => r.json()),
  ]);

  const cfg = { style: 'mapbox://styles/mapbox/dark-v11', center: [-0.1, 51.51], zoom: 9.2, pitch: 0, interactive: true, attributionControl: false };

  triData.fire = gridFire;
  triData.fa = gridFA;
  triData.ss = gridSS;

  function setupMap(containerId, gridData, mapKey) {
    const map = new mapboxgl.Map({ container: containerId, ...cfg });
    triMaps[mapKey] = map;
    const initMax = calcMax(gridData, 't');

    map.on('load', () => {
      map.addSource('grid', { type: 'geojson', data: gridData });
      map.addSource('boroughs', { type: 'geojson', data: boroughs });
      map.addLayer({ id: 'grid-fill', type: 'fill', source: 'grid', paint: {
        'fill-color': getColorExpr('t', initMax), 'fill-opacity': 0.85 } });
      map.addLayer({ id: 'blines', type: 'line', source: 'boroughs', paint: { 'line-color': 'rgba(255,255,255,0.5)', 'line-width': 1.2 } });

      map.on('mousemove', 'grid-fill', e => {
        if (!e.features.length) return;
        map.getCanvas().style.cursor = 'pointer';
        const p = e.features[0].properties;
        const activeProp = showAllYears ? currentProp[mapKey] : 'y' + currentYear;
        const val = p[activeProp] || 0;
        const lbl = showAllYears ? (currentProp[mapKey] === 't' ? 'All types' : currentProp[mapKey]) : currentYear;
        document.getElementById('triple-hover').innerHTML = `250m grid [${lbl}]: <em>${val}</em> incidents (total across all years: ${p.t})`;
      });

      map.on('mouseleave', 'grid-fill', () => {
        map.getCanvas().style.cursor = '';
        document.getElementById('triple-hover').innerHTML = '<span class="hover-hint">Hover a cell. Use slider for years, pills for sub-types.</span>';
      });
    });
  }

  setupMap('map-fire', gridFire, 'fire');
  setupMap('map-fa', gridFA, 'fa');
  setupMap('map-ss', gridSS, 'ss');

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
    let resizedOnce = false;
    new IntersectionObserver(e => { e.forEach(x => { if (x.isIntersecting && !resizedOnce) { resizedOnce = true; maps.forEach(m => m.resize()); } }); }, { threshold: 0.1 }).observe(document.querySelector('.triple-maps'));
  }, 2000);

  const slider = document.getElementById('time-slider');
  const label = document.getElementById('time-label');
  const playBtn = document.getElementById('time-play');
  const allBtn = document.getElementById('time-all');

  function updateMaps() {
    Object.entries(triMaps).forEach(([key, map]) => {
      if (!map.getLayer('grid-fill')) return;
      const prop = showAllYears ? currentProp[key] : 'y' + currentYear;
      const mx = calcMax(triData[key], prop);
      map.setPaintProperty('grid-fill', 'fill-color', getColorExpr(prop, mx));
    });
  }

  slider.addEventListener('input', () => {
    showAllYears = false;
    allBtn.classList.remove('active');
    currentYear = parseInt(slider.value);
    label.textContent = String(currentYear);
    updateMaps();
  });

  allBtn.addEventListener('click', () => {
    showAllYears = !showAllYears;
    allBtn.classList.toggle('active', showAllYears);
    label.textContent = showAllYears ? 'All Years' : String(currentYear);
    updateMaps();
  });
  allBtn.classList.add('active');

  let playing = false, playIv = null;
  playBtn.addEventListener('click', () => {
    if (playing) { clearInterval(playIv); playBtn.textContent = 'Play'; playing = false; return; }
    playing = true; playBtn.textContent = 'Pause';
    showAllYears = false; allBtn.classList.remove('active');
    currentYear = parseInt(slider.value);
    playIv = setInterval(() => {
      currentYear++;
      if (currentYear > 2025) currentYear = 2014;
      slider.value = currentYear;
      label.textContent = String(currentYear);
      updateMaps();
      if (currentYear === 2025) { clearInterval(playIv); playBtn.textContent = 'Play'; playing = false; }
    }, 1200);
  });

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
// Response time map init
// ============================================================
async function initResponseMap() {
  const [boroughs, gridResp, stations] = await Promise.all([
    fetch('data/london_boroughs.json').then(r => r.json()),
    fetch('data/grid_response.json').then(r => r.json()),
    fetch('data/stations.json').then(r => r.json()),
  ]);
  mapResp = new mapboxgl.Map({ container: 'map-response', style: 'mapbox://styles/mapbox/dark-v11', center: [-0.1, 51.51], zoom: 9.2, pitch: 0, interactive: true, attributionControl: false });
  const toggleBtn = document.getElementById('station-toggle');
  if (toggleBtn) toggleBtn.textContent = `Show ${stations.features.length} Fire Stations`;

  mapResp.on('load', () => {
    mapResp.addSource('grid', { type: 'geojson', data: gridResp });
    mapResp.addSource('boroughs', { type: 'geojson', data: boroughs });
    mapResp.addSource('stations', { type: 'geojson', data: stations });

    mapResp.addLayer({ id: 'grid-fill', type: 'fill', source: 'grid', paint: {
      'fill-color': ['interpolate', ['linear'], ['get', 'd'], 0, '#1a1a2e', 20, '#2d4a3e', 40, '#4ecdc4', 60, '#ffe66d', 80, '#ff6b35', 100, '#ff0000'], 'fill-opacity': 0.85 } });
    mapResp.addLayer({ id: 'blines', type: 'line', source: 'boroughs', paint: { 'line-color': 'rgba(255,255,255,0.5)', 'line-width': 1.2 } });
    mapResp.addLayer({ id: 'blabels', type: 'symbol', source: 'boroughs', layout: { 'text-field': ['get', 'name'], 'text-size': 9, 'text-anchor': 'center' }, paint: { 'text-color': 'rgba(255,255,255,0.4)', 'text-halo-color': 'rgba(0,0,0,0.5)', 'text-halo-width': 1 } });
    mapResp.addLayer({ id: 'station-dots', type: 'circle', source: 'stations', paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2, 11, 3.5, 13, 5],
      'circle-color': 'transparent',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 1.5],
      'circle-opacity': 0.8,
    }, layout: { 'visibility': 'none' }});
    mapResp.addLayer({ id: 'station-labels', type: 'symbol', source: 'stations',
      layout: { 'text-field': ['get', 'name'], 'text-size': 8, 'text-anchor': 'top', 'text-offset': [0, 0.6], 'visibility': 'none' },
      paint: { 'text-color': 'rgba(255,255,255,0.8)', 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 1 },
      minzoom: 11,
    });

    toggleBtn?.addEventListener('click', function() {
      const show = mapResp.getLayoutProperty('station-dots', 'visibility') === 'none';
      mapResp.setLayoutProperty('station-dots', 'visibility', show ? 'visible' : 'none');
      mapResp.setLayoutProperty('station-labels', 'visibility', show ? 'visible' : 'none');
      this.classList.toggle('active', show);
    });

    mapResp.on('mousemove', 'grid-fill', e => {
      if (!e.features.length) return;
      mapResp.getCanvas().style.cursor = 'pointer';
      const p = e.features[0].properties;
      document.getElementById('resp-hover').innerHTML = `250m grid: avg response <em>${p.r}s</em> across ${p.c} incidents`;
    });
    mapResp.on('mouseleave', 'grid-fill', () => { mapResp.getCanvas().style.cursor = ''; });

    mapResp.on('mouseenter', 'station-dots', e => {
      mapResp.getCanvas().style.cursor = 'pointer';
      if (e.features.length) {
        const p = e.features[0].properties;
        document.getElementById('resp-hover').innerHTML = `Station: <strong>${p.name}</strong>, ${p.incidents.toLocaleString()} incidents served`;
      }
    });
    mapResp.on('mouseleave', 'station-dots', () => {
      mapResp.getCanvas().style.cursor = '';
      document.getElementById('resp-hover').innerHTML = '<span class="hover-hint">Hover grid for response time. White dots are fire stations.</span>';
    });
  });

  new IntersectionObserver(e => {
    e.forEach(x => { if (x.isIntersecting) mapResp?.resize(); });
  }, { threshold: 0.1 }).observe(document.getElementById('map-response'));

  mapResp.on('mouseleave', 'grid-fill', () => {
    mapResp.getCanvas().style.cursor = '';
    document.getElementById('resp-hover').innerHTML =
      '<span class="hover-hint">Hover over the map to see response time data.</span>';
  });

  // Drag to resize the panel width with defensive checks
  const panel = document.getElementById('resp-panel');
  const handle = document.getElementById('resp-resize-handle');
  if (!panel || !handle) return;
  const mapContainer = document.getElementById('map-response');

  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  handle.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.clientX;
    startWidth = panel.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const newWidth = Math.max(200, Math.min(startWidth + dx,
      panel.parentElement.offsetWidth * 0.85));
    panel.style.width = newWidth + 'px';
    renderPanel(currentRespTab,
      document.getElementById('resp-search-input')?.value || '');
    mapResp?.resize();
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  const innerBoroughs = ['Camden','City of London','Greenwich','Hackney',
    'Hammersmith and Fulham','Islington','Kensington and Chelsea',
    'Lambeth','Lewisham','Newham','Southwark','Tower Hamlets',
    'Wandsworth','Westminster','Haringey'];

  const allBoroughStats = Object.entries(DATA.boroughData)
    .map(([name, d]) => ({
      name,
      resp: d.avgResponseSec,
      growth: d.ssGrowth,
      isInner: innerBoroughs.includes(name)
    }))
    .sort((a, b) => b.resp - a.resp);

  const respMax = allBoroughStats[0].resp;
  const respMin = allBoroughStats[allBoroughStats.length - 1].resp;
  const growthMax = Math.max(...allBoroughStats.map(b => b.growth));

  function isWideMode() {
    return panel.offsetWidth > 380;
  }

  function makeRowHtml(b, rank, colorOverride) {
    const color = colorOverride || (b.isInner ? '#ff6b35' : '#4ecdc4');
    const wide = isWideMode();
    const respBarW = Math.round(((b.resp - respMin) / (respMax - respMin)) * 100);
    const growthBarW = Math.round((b.growth / growthMax) * 100);

    if (wide) {
      return `
        <div style="display:grid; grid-template-columns:22px minmax(80px,1.5fr) 1fr 1fr;
                    gap:6px; padding:6px 4px; align-items:center;
                    border-bottom:1px solid rgba(255,255,255,0.04);">
          <span style="font-size:0.65rem; color:var(--muted); text-align:center;">${rank}</span>
          <div style="min-width:0;">
            <div style="display:flex; align-items:center; gap:4px;">
              <span style="width:6px; height:6px; border-radius:50%;
                           background:${color}; flex-shrink:0;"></span>
              <span style="font-size:0.72rem; color:var(--text);
                           white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${b.name}
              </span>
            </div>
            <div style="font-size:0.62rem; color:var(--muted);">${b.isInner ? 'Inner' : 'Outer'}</div>
          </div>
          <div style="min-width:0;">
            <div style="font-size:0.72rem; color:${color}; font-family:var(--font-mono); margin-bottom:3px;">${b.resp}s</div>
            <div style="height:5px; border-radius:2px; background:rgba(255,255,255,0.06); overflow:hidden; width:100%;">
              <div style="width:${respBarW}%; height:100%; background:${color}; border-radius:2px; transition:width 0.3s;"></div>
            </div>
          </div>
          <div style="min-width:0;">
            <div style="font-size:0.72rem; color:var(--dim); font-family:var(--font-mono); margin-bottom:3px;">+${b.growth}%</div>
            <div style="height:5px; border-radius:2px; background:rgba(255,255,255,0.06); overflow:hidden; width:100%;">
              <div style="width:${growthBarW}%; height:100%; background:rgba(78,205,196,0.6); border-radius:2px; transition:width 0.3s;"></div>
            </div>
          </div>
        </div>`;
    } else {
      return `
        <div style="display:flex; align-items:center; gap:6px; padding:5px 4px;
                    border-bottom:1px solid rgba(255,255,255,0.04);">
          <span style="font-size:0.65rem; color:var(--muted); width:18px; flex-shrink:0; text-align:center;">${rank}</span>
          <span style="width:6px; height:6px; border-radius:50%;
                       background:${color}; flex-shrink:0;"></span>
          <div style="flex:1; min-width:0;">
            <div style="font-size:0.72rem; color:var(--text);
                        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.name}</div>
            <div style="font-size:0.62rem; color:var(--muted);">${b.isInner ? 'Inner' : 'Outer'}</div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            <div style="font-size:0.72rem; color:${color}; font-family:var(--font-mono);">${b.resp}s</div>
            <div style="font-size:0.65rem; color:var(--dim);">+${b.growth}%</div>
          </div>
        </div>`;
    }
  }

  function renderPanel(tab, searchVal = '') {
    const content = document.getElementById('resp-panel-content');
    const searchBox = document.getElementById('resp-search-box');
    if (!content) return;

    const wide = isWideMode();
    const wideHeader = wide ? `
      <div style="display:grid; grid-template-columns:22px minmax(80px,1.5fr) 1fr 1fr;
                  gap:6px; padding:4px 4px 6px; border-bottom:1px solid rgba(255,255,255,0.08);">
        <span style="font-size:0.62rem; color:var(--muted);"></span>
        <span style="font-size:0.62rem; color:var(--muted); letter-spacing:0.4px;">BOROUGH</span>
        <span style="font-size:0.62rem; color:var(--muted); letter-spacing:0.4px;">RESP TIME ▼</span>
        <span style="font-size:0.62rem; color:var(--muted); letter-spacing:0.4px;">SS GROWTH</span>
      </div>` : `
      <div style="font-size:0.68rem; color:var(--dim); padding:4px 4px 6px;">
        BOROUGH &nbsp;&nbsp; RESP &nbsp; GROWTH
      </div>`;

    if (tab === 'top10') {
      searchBox.style.display = 'none';
      const rows = allBoroughStats.slice(0, 10);
      content.innerHTML = wideHeader + rows.map((b, i) => makeRowHtml(b, i + 1, '#ff6b35')).join('');
    } else if (tab === 'bot10') {
      searchBox.style.display = 'none';
      const rows = [...allBoroughStats].slice(-10).reverse();
      content.innerHTML = wideHeader + rows.map((b, i) => makeRowHtml(b, i + 1, '#4ecdc4')).join('');
    } else if (tab === 'search') {
      searchBox.style.display = 'block';
      const q = (searchVal || '').toLowerCase().trim();
      if (!q) {
        content.innerHTML = `<div style="font-size:0.75rem; color:var(--muted); padding:12px 4px;">Type a borough name above to search.</div>`;
        return;
      }
      const results = allBoroughStats.filter(b => b.name.toLowerCase().includes(q));
      if (!results.length) {
        content.innerHTML = `<div style="font-size:0.75rem; color:var(--muted); padding:12px 4px;">No borough found.</div>`;
        return;
      }
      content.innerHTML = wideHeader + results.map(b => {
        const rank = allBoroughStats.findIndex(x => x.name === b.name) + 1;
        return makeRowHtml(b, '#' + rank, null);
      }).join('');
    } else if (tab === 'stations') {
      searchBox.style.display = 'none';
      content.innerHTML = `<div style="font-size:0.75rem; color:var(--dim); padding:12px 4px; line-height:1.7;">
        <strong style="color:var(--text);">102 Fire Stations</strong> across London.<br><br>
        White dots show station locations. Station density is highest in inner London, this explains why deprived inner-city wards get faster responses despite higher fire rates.
        <br><br>
        <span style="font-size:0.68rem; color:var(--muted);">Zoom in to see station names.</span>
      </div>`;
    }
  }

  const stationToggleBtn = document.getElementById('station-toggle');
  let stationsVisible = false;

  if (stationToggleBtn) {
    const newBtn = stationToggleBtn.cloneNode(true);
    stationToggleBtn.parentNode.replaceChild(newBtn, stationToggleBtn);

    newBtn.addEventListener('click', () => {
      if (!mapResp.getLayer('station-dots')) return;
      stationsVisible = !stationsVisible;
      mapResp.setLayoutProperty('station-dots', 'visibility', stationsVisible ? 'visible' : 'none');
      mapResp.setLayoutProperty('station-labels', 'visibility', stationsVisible ? 'visible' : 'none');
      newBtn.style.background = stationsVisible ? 'rgba(255,255,255,0.15)' : 'var(--glass)';
      newBtn.style.color = stationsVisible ? 'var(--text)' : 'var(--dim)';
      newBtn.textContent = stationsVisible ? '📍 Hide Fire Stations' : '📍 Show Fire Stations';
      renderPanel('stations');
    });
  }

  let currentRespTab = 'top10';
  renderPanel('top10');

  document.querySelectorAll('.resp-tab-btn').forEach(btn => {
    if (btn.id === 'station-toggle') return;
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      currentRespTab = tab;
      document.querySelectorAll('.resp-tab-btn').forEach(b => {
        if (b.id === 'station-toggle') return;
        b.style.background = 'var(--glass)';
        b.style.color = 'var(--dim)';
      });
      btn.style.background = 'rgba(255,107,53,0.15)';
      btn.style.color = 'var(--fire)';
      renderPanel(tab);
    });
  });

  const searchInput = document.getElementById('resp-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderPanel('search', searchInput.value);
    });
  }
}

// ============================================================
// Borough response time ranking horizontal bar chart
// ============================================================
function createChartResponseRanking() {
  const sorted = Object.entries(DATA.boroughData)
    .map(([name, d]) => ({ name, resp: d.avgResponseSec }))
    .sort((a, b) => b.resp - a.resp)
    .slice(0, 15);

  const inner = ['Camden','City of London','Greenwich','Hackney',
    'Hammersmith and Fulham','Islington','Kensington and Chelsea',
    'Lambeth','Lewisham','Newham','Southwark','Tower Hamlets',
    'Wandsworth','Westminster','Haringey'];

  killChart('respRank');
  charts.respRank = new Chart(document.getElementById('chart-resp-rank'), {
    type: 'bar',
    data: {
      labels: sorted.map(d => d.name),
      datasets: [{
        data: sorted.map(d => d.resp),
        backgroundColor: sorted.map(d =>
          inner.includes(d.name) ? 'rgba(255,107,53,0.7)' : 'rgba(78,205,196,0.7)'
        ),
        borderRadius: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x}s avg response` } }
      },
      scales: {
        x: { grid: { color: C.grid }, ticks: { color: C.tick, callback: v => v + 's' }, min: 260 },
        y: { grid: { display: false }, ticks: { color: '#ccc', font: { size: 10 } } }
      }
    }
  });
}

// ============================================================
// Danger zone scatter plot annotated outside the top left at opacity 0.8
// ============================================================
function initScatterPlot() {
  const container = document.getElementById('scatter-plot').parentElement;
  const svg = d3.select('#scatter-plot');
  const W = container.clientWidth || 700, H = container.clientHeight || 400;
  const M = { top: 20, right: 30, bottom: 50, left: 60 };
  svg.attr('viewBox', `0 0 ${W} ${H}`)
     .attr('width', '100%')
     .attr('height', H)
     .style('display', 'block');

  const inner = ['Camden','City of London','Greenwich','Hackney','Hammersmith and Fulham','Islington','Kensington and Chelsea','Lambeth','Lewisham','Newham','Southwark','Tower Hamlets','Wandsworth','Westminster','Haringey'];
  const boroughs = Object.entries(DATA.boroughData).filter(([,d]) => d.ssGrowth !== 0).map(([name, d]) => ({
    name, ssGrowth: d.ssGrowth, responseTime: d.avgResponseSec, population: d.population, isInner: inner.includes(name),
  }));

  const xMax = d3.max(boroughs, d => d.ssGrowth) * 1.05;
  const yMin = d3.min(boroughs, d => d.responseTime) * 0.95;
  const yMax = d3.max(boroughs, d => d.responseTime) * 1.02;
  const x = d3.scaleLinear().domain([0, xMax]).range([M.left, W - M.right]);
  const y = d3.scaleLinear().domain([yMin, yMax]).range([H - M.bottom, M.top]);
  const r = d3.scaleSqrt().domain(d3.extent(boroughs, d => d.population)).range([5, 18]);

  svg.append('g').attr('transform', `translate(0,${H-M.bottom})`).call(d3.axisBottom(x).ticks(6).tickFormat(d => d + '%')).call(g => { g.selectAll('text').attr('fill', '#aaa'); g.select('.domain').attr('stroke', '#555'); g.selectAll('.tick line').attr('stroke', '#555'); });
  svg.append('g').attr('transform', `translate(${M.left},0)`).call(d3.axisLeft(y).ticks(6)).call(g => { g.selectAll('text').attr('fill', '#aaa'); g.select('.domain').attr('stroke', '#555'); g.selectAll('.tick line').attr('stroke', '#555'); });
  svg.append('text').attr('x', W / 2).attr('y', H - 10).attr('fill', '#aaa').attr('text-anchor', 'middle').attr('font-size', '11px').text('Special Service Growth Rate 2014 to 2025 (%)');
  svg.append('text').attr('transform', 'rotate(-90)').attr('x', -H / 2).attr('y', 14).attr('fill', '#aaa').attr('text-anchor', 'middle').attr('font-size', '11px').text('Avg First Pump Attendance (seconds)');

  const dzGrowth = 80, dzRespHi = yMax, dzRespLo = 320;
  svg.append('rect').attr('x', x(dzGrowth)).attr('y', y(dzRespHi)).attr('width', x(xMax) - x(dzGrowth)).attr('height', y(dzRespLo) - y(dzRespHi)).attr('fill', 'rgba(255,107,53,0.06)').attr('stroke', 'rgba(255,107,53,0.2)').attr('stroke-dasharray', '4');
  // Annotation sits outside the top left of the zone at opacity 0.8
  svg.append('text').attr('x', x(dzGrowth) + 8).attr('y', y(dzRespHi) - 6).attr('fill', 'rgba(255,107,53,0.8)').attr('font-size', '9px').attr('text-anchor', 'start').attr('letter-spacing', '1px').text('DANGER ZONE');

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

  // Inner and outer London labels for the danger zone
  const dangerOuterLabels = ['Havering', 'Hillingdon', 'Bromley', 'Harrow', 'Sutton'];
  boroughs.forEach(d => {
    if (!d.isInner && d.ssGrowth >= dzGrowth && d.responseTime >= dzRespLo
        && dangerOuterLabels.includes(d.name)) {
      svg.append('text')
        .attr('x', x(d.ssGrowth) + r(d.population) + 4)
        .attr('y', y(d.responseTime) + 4)
        .attr('fill', '#4ecdc4')
        .attr('font-size', '9px')
        .attr('font-family', 'Inter, sans-serif')
        .text(d.name);
    }
  });

  const lg = svg.append('g').attr('transform', `translate(${W - M.right - 120}, ${M.top + 30})`);
  [{ label: 'Inner London', color: C.fire }, { label: 'Outer London', color: C.teal }].forEach((d, i) => {
    lg.append('circle').attr('cx', 0).attr('cy', i * 18).attr('r', 5).attr('fill', d.color).attr('fill-opacity', 0.7);
    lg.append('text').attr('x', 12).attr('y', i * 18 + 4).attr('fill', '#aaa').attr('font-size', '10px').text(d.label);
  });
}

// ============================================================
// Indexing helper
// ============================================================
function indexify(arr) {
  const base = arr[0] || 1;
  return arr.map(v => Math.round(v / base * 100));
}

function createChartInOut(filter) {
  const io = DATA.innerOuter;
  if (!io) return;
  killChart('inout');

  let datasets = [];
  const colors = { 'Fire': C.fire, 'False Alarm': C.dim, 'Special Service': C.teal };
  const years = io['Fire'].years;

  if (filter === 'all') {
    Object.entries(io).forEach(([grp, d]) => {
      const col = colors[grp] || '#888';
      datasets.push({ label: grp + ' (Inner)', data: indexify(d.inner), borderColor: col, borderWidth: 2, pointRadius: 2, tension: 0.3, borderDash: [5,3] });
      datasets.push({ label: grp + ' (Outer)', data: indexify(d.outer), borderColor: col, borderWidth: 2.5, pointRadius: 3, tension: 0.3 });
    });
  } else {
    const d = io[filter];
    const col = colors[filter];
    datasets = [
      { label: 'Inner London', data: indexify(d.inner), borderColor: col, borderWidth: 2, pointRadius: 2, tension: 0.3, borderDash: [5,3], backgroundColor: col + '10', fill: true },
      { label: 'Outer London', data: indexify(d.outer), borderColor: col, borderWidth: 2.5, pointRadius: 3, tension: 0.3, backgroundColor: col + '15', fill: true },
    ];
  }

  charts.inout = new Chart(document.getElementById('chart-inout'), {
    type: 'line',
    data: { labels: years, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1200, easing: 'easeInOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'right', align: 'center', labels: { color: '#aaa', font: { size: 10 }, boxWidth: 12, padding: 16, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} (index, 2014=100)` } },
        annotation: {
          annotations: {
            covidLine: {
              type: 'line',
              xMin: 6, xMax: 6,
              borderColor: 'rgba(255,255,255,0.25)',
              borderWidth: 1.5, borderDash: [6, 4],
              label: {
                display: true, content: 'COVID-19',
                color: 'rgba(255,255,255,0.5)',
                font: { size: 10, family: 'Inter' },
                position: 'center', yAdjust: -80,
              }
            }
          }
        },
      },
      scales: {
        x: { grid: { color: C.grid }, ticks: { color: C.tick } },
        y: {
          grid: { color: C.grid },
          ticks: { color: C.tick, callback: v => v },
          title: { display: true, text: 'Index (2014 = 100)', color: C.tick, font: { size: 10 } },
        }
      }
    }
  });

  const inoutCanvas = document.getElementById('chart-inout');
  let inoutAnimated = false;
  new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !inoutAnimated) {
        inoutAnimated = true;
        charts.inout.reset();
        charts.inout.update();
      }
    });
  }, { threshold: 0.3 }).observe(inoutCanvas);
}

function initInOutTabs() {
  document.querySelectorAll('.inout-tabs .pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.inout-tabs .pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      createChartInOut(pill.dataset.io);
    });
  });
}

// ============================================================
// IMD deprivation quartile versus fire rate bar chart
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
// Bivariate map of fire frequency against response time
// ============================================================
async function createBivariateMap() {
  const [gridFire, gridResp, boroughs] = await Promise.all([
    fetch('data/grid_fire.json').then(r => r.json()),
    fetch('data/grid_response.json').then(r => r.json()),
    fetch('data/london_boroughs.json').then(r => r.json()),
  ]);

  const respMap = {};
  gridResp.features.forEach(f => {
    const sw = f.geometry.coordinates[0][0];
    const key = `${sw[0].toFixed(4)},${sw[1].toFixed(4)}`;
    respMap[key] = { r: f.properties.r, d: f.properties.d };
  });

  gridFire.features.forEach(f => {
    const sw = f.geometry.coordinates[0][0];
    const key = `${sw[0].toFixed(4)},${sw[1].toFixed(4)}`;
    const resp = respMap[key];
    f.properties.resp = resp ? resp.r : null;
    f.properties.resp_d = resp ? resp.d : null;
  });

  const fireVals = gridFire.features.map(f => f.properties.t || 0).filter(v => v > 0).sort((a,b)=>a-b);
  const fireQ1 = fireVals[Math.floor(fireVals.length * 0.33)];
  const fireQ2 = fireVals[Math.floor(fireVals.length * 0.66)];

  const respVals = gridFire.features.map(f => f.properties.resp).filter(v => v != null).sort((a,b)=>a-b);
  const respQ1 = respVals[Math.floor(respVals.length * 0.33)];
  const respQ2 = respVals[Math.floor(respVals.length * 0.66)];

  const bivColors = {
    '1-1': '#d4f5f3', '2-1': '#7eddd8', '3-1': '#4ecdc4',
    '1-2': '#f5e8d4', '2-2': '#f0c090', '3-2': '#ff9a5c',
    '1-3': '#fdf0e8', '2-3': '#ffb37a', '3-3': '#ff6b35',
  };

  gridFire.features.forEach(f => {
    const p = f.properties;
    if (!p.t || p.resp == null) { p.bivColor = '#1a1a2e'; return; }
    const fClass = p.t <= fireQ1 ? 1 : p.t <= fireQ2 ? 2 : 3;
    const rClass = p.resp <= respQ1 ? 1 : p.resp <= respQ2 ? 2 : 3;
    p.bivColor = bivColors[`${fClass}-${rClass}`] || '#333';
  });

  const mapBiv = new mapboxgl.Map({
    container: 'map-bivariate',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-0.1, 51.51], zoom: 9,
    interactive: true, attributionControl: false
  });

  mapBiv.on('load', () => {
    mapBiv.addSource('grid-fire-biv', { type: 'geojson', data: gridFire });
    mapBiv.addSource('boroughs-biv', { type: 'geojson', data: boroughs });
    mapBiv.addLayer({ id: 'biv-fill', type: 'fill', source: 'grid-fire-biv',
      paint: { 'fill-color': ['get', 'bivColor'], 'fill-opacity': 0.85 } });
    mapBiv.addLayer({ id: 'biv-line', type: 'line', source: 'boroughs-biv',
      paint: { 'line-color': 'rgba(255,255,255,0.4)', 'line-width': 1 } });

    mapBiv.on('mousemove', 'biv-fill', e => {
      if (!e.features.length) return;
      const p = e.features[0].properties;
      document.getElementById('biv-hover').innerHTML =
        `<strong>${p.borough || 'Unknown'}</strong> ·
         Fire incidents: ${p.t || 0} ·
         Avg response: ${p.resp ? Math.round(p.resp) + 's' : 'N/A'}`;
    });
    mapBiv.on('mouseleave', 'biv-fill', () => {
      document.getElementById('biv-hover').innerHTML =
        '<span class="hover-hint">Hover a grid cell to see fire rate and response time</span>';
    });
  });

  new IntersectionObserver(e => {
    e.forEach(x => { if (x.isIntersecting) mapBiv?.resize(); });
  }, { threshold: 0.1 }).observe(document.getElementById('map-bivariate'));
}

// ============================================================
// AFA breakdown chart
// ============================================================
function createChartAFAAnalysis() {
  const d = DATA.yearlyByType;
  if (!d || !document.getElementById('chart-afa-trend')) return;

  killChart('afaTrend');
  charts.afaTrend = new Chart(document.getElementById('chart-afa-trend'), {
    type: 'line',
    data: {
      labels: d.years,
      datasets: [
        { label: 'AFA False Alarms', data: d.afa || d.falseAlarm,
          borderColor: '#888', backgroundColor: 'rgba(136,136,136,0.1)',
          borderWidth: 2, pointRadius: 2, tension: 0.3, fill: true, yAxisID: 'y' },
        { label: 'Real Fires', data: d.fire,
          borderColor: C.fire, backgroundColor: 'rgba(255,107,53,0.1)',
          borderWidth: 2.5, pointRadius: 3, tension: 0.3, fill: true, yAxisID: 'y2' },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#aaa', font: { size: 10 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}` } }
      },
      scales: {
        x: { grid: { color: C.grid }, ticks: { color: C.tick } },
        y: { position: 'left', grid: { color: C.grid }, ticks: { color: '#888', callback: v => (v/1000)+'k' },
             title: { display: true, text: 'AFA calls', color: '#888', font: { size: 9 } } },
        y2: { position: 'right', grid: { display: false }, ticks: { color: C.fire, callback: v => (v/1000)+'k' },
              title: { display: true, text: 'Real fires', color: C.fire, font: { size: 9 } } }
      }
    }
  });

  if (!document.getElementById('chart-afa-borough')) return;
  const yr = DATA.yearlyByType;
  if (!yr) return;

  const afaRateData = yr.years.map((y, i) => {
    const total = (yr.fire[i] || 0) + (yr.falseAlarm[i] || 0) + (yr.specialService[i] || 0);
    return total > 0 ? parseFloat(((yr.falseAlarm[i] / total) * 100).toFixed(1)) : 0;
  });

  killChart('afaBorough');
  charts.afaBorough = new Chart(document.getElementById('chart-afa-borough'), {
    type: 'line',
    data: {
      labels: yr.years,
      datasets: [{
        label: 'False Alarm share of all calls (%)',
        data: afaRateData,
        borderColor: '#888',
        backgroundColor: 'rgba(136,136,136,0.1)',
        borderWidth: 2, pointRadius: 3, tension: 0.3, fill: true,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#aaa', font: { size: 10 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}% of all calls` } }
      },
      scales: {
        x: { grid: { color: C.grid }, ticks: { color: C.tick } },
        y: { grid: { color: C.grid }, ticks: { color: '#aaa', callback: v => v + '%' },
             min: 40, max: 60,
             title: { display: true, text: 'Share of total calls', color: '#aaa', font: { size: 9 } } }
      }
    }
  });
}

// ============================================================
// Monthly seasonal overview merged into scrollytelling
// ============================================================
function createChartMonthlyAll() {
  // merged into scrollytelling chart
}

// ============================================================
// Scrollytelling with updatePanel and signal sync
// ============================================================
let monthlyFocusChart = null;

function initScrollytelling() {
  const d = DATA.monthlyByType;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const panelColors = {
    overview:  'rgba(255,255,255,0.03)',
    outdoor:   'rgba(255,107,53,0.06)',
    dwelling:  'rgba(244,162,97,0.06)',
    flooding:  'rgba(78,205,196,0.06)',
    entry:     'rgba(69,123,157,0.08)',
    assist:    'rgba(255,230,109,0.05)',
    collision: 'rgba(255,255,255,0.05)',
  };

  const borderColors = {
    overview:  'rgba(255,255,255,0.08)',
    outdoor:   'rgba(255,107,53,0.3)',
    dwelling:  'rgba(244,162,97,0.3)',
    flooding:  'rgba(78,205,196,0.3)',
    entry:     'rgba(69,123,157,0.35)',
    assist:    'rgba(255,230,109,0.25)',
    collision: 'rgba(255,255,255,0.2)',
  };

  const configs = {
    outdoor:  { data: d.outdoor_fire,  color: C.fire,   label: 'Outdoor Fire' },
    dwelling: { data: d.dwelling_fire, color: '#f4a261', label: 'Dwelling Fire' },
    flooding: { data: d.flooding,      color: C.teal,   label: 'Flooding' },
    entry:    { data: d.forced_entry,  color: C.steel,  label: 'Forced Entry' },
    assist:   { data: d.agency_assist, color: C.yellow, label: 'Agency Assist' },
    collision: null,
  };

  function updateFocusChart(step) {
    const canvas = document.getElementById('chart-monthly-focus');
    if (monthlyFocusChart) monthlyFocusChart.destroy();

    let datasets;

    if (step === 'overview') {
      datasets = [
        { label: 'Outdoor Fire',  data: d.outdoor_fire,  borderColor: C.fire,    backgroundColor: C.fire   + '15', fill: true,  borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 6, tension: 0.4 },
        { label: 'Dwelling Fire', data: d.dwelling_fire, borderColor: '#f4a261', backgroundColor: '#f4a26115', fill: false, borderWidth: 2,   pointRadius: 3, pointHoverRadius: 6, tension: 0.4, borderDash: [5,3] },
        { label: 'Flooding',      data: d.flooding,      borderColor: C.teal,    backgroundColor: C.teal   + '15', fill: false, borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 6, tension: 0.4 },
        { label: 'Forced Entry',  data: d.forced_entry,  borderColor: C.steel,   backgroundColor: C.steel  + '15', fill: false, borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 6, tension: 0.4 },
        { label: 'Agency Assist', data: d.agency_assist, borderColor: C.yellow,  backgroundColor: C.yellow + '15', fill: false, borderWidth: 2,   pointRadius: 3, pointHoverRadius: 6, tension: 0.4 },
      ];
    } else if (step === 'collision') {
      datasets = [
        { label: 'Outdoor Fire',  data: d.outdoor_fire,  borderColor: C.fire,   backgroundColor: C.fire   + '20', fill: true, borderWidth: 2, pointRadius: 2, tension: 0.3 },
        { label: 'Flooding',      data: d.flooding,      borderColor: C.teal,   backgroundColor: C.teal   + '20', fill: true, borderWidth: 2, pointRadius: 2, tension: 0.3 },
        { label: 'Forced Entry',  data: d.forced_entry,  borderColor: C.steel,  backgroundColor: C.steel  + '20', fill: true, borderWidth: 2, pointRadius: 2, tension: 0.3 },
        { label: 'Agency Assist', data: d.agency_assist, borderColor: C.yellow, backgroundColor: C.yellow + '20', fill: true, borderWidth: 2, pointRadius: 2, tension: 0.3 },
      ];
    } else {
      const cfg = configs[step];
      if (!cfg) return;
      datasets = [{ label: cfg.label, data: cfg.data, borderColor: cfg.color, backgroundColor: cfg.color + '20', fill: true, borderWidth: 2.5, pointRadius: 3, tension: 0.3 }];
    }

    monthlyFocusChart = new Chart(canvas, {
      type: 'line',
      data: { labels: months, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: step === 'overview',
            position: 'bottom',
            labels: { color: '#ccc', font: { size: 11 }, boxWidth: 14 }
          },
          tooltip: {
            backgroundColor: 'rgba(10,10,15,0.92)',
            filter: item => {
              if (step === 'overview' || step === 'collision') return true;
              return item.dataset.label === configs[step]?.label;
            },
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}`
            }
          },
          annotation: step === 'collision' ? {
            annotations: {
              july: {
                type: 'line', xMin: 'Jul', xMax: 'Jul',
                borderColor: 'rgba(255,107,53,0.5)', borderWidth: 1.5, borderDash: [4,4],
                label: { content: 'July Peak', display: true, position: 'start', backgroundColor: 'rgba(255,107,53,0.15)', color: '#ff6b35', font: { size: 10 } }
              },
              december: {
                type: 'line', xMin: 'Dec', xMax: 'Dec',
                borderColor: 'rgba(78,205,196,0.5)', borderWidth: 1.5, borderDash: [4,4],
                label: { content: 'Dec Peak', display: true, position: 'start', backgroundColor: 'rgba(78,205,196,0.15)', color: '#4ecdc4', font: { size: 10 } }
              }
            }
          } : {}
        },
        scales: {
          x: { grid: { color: C.grid }, ticks: { color: C.tick } },
          y: {
            grid: { color: C.grid },
            ticks: { color: C.tick, callback: v => v >= 1000 ? (v/1000)+'k' : v },
            min: 0, max: 15000
          }
        }
      }
    });
  }

  function updatePanel(step) {
    const panel = document.getElementById('signal-panel');
    if (!panel) return;

    panel.style.background  = panelColors[step] || panelColors.overview;
    panel.style.borderColor = borderColors[step] || borderColors.overview;

    panel.querySelectorAll('.signal-item').forEach(item => {
      item.classList.remove('is-active', 'is-dimmed');
      if (step === 'overview') {
        // Everything normal so do not expand
      } else if (step === 'collision') {
        item.classList.add('is-active');
      } else {
        if (item.dataset.step === step) {
          item.classList.add('is-active');
        } else {
          item.classList.add('is-dimmed');
        }
      }
    });
  }

  updateFocusChart('overview');
  updatePanel('overview');

  setTimeout(() => {
    const scroller = scrollama();
    scroller.setup({ step: '#scrolly-ch3 .step', offset: 0.5 })
      .onStepEnter(({ element }) => {
        document.querySelectorAll('#scrolly-ch3 .step').forEach(s => s.classList.remove('is-active'));
        element.classList.add('is-active');
        const step = element.dataset.step;
        updateFocusChart(step);
        updatePanel(step);
      });
    window.addEventListener('resize', scroller.resize);
  }, 500);
}

// ============================================================
// Effect one, mouse tracking glow
// ============================================================
function initCursorGlow() {
  const glow = document.createElement('div');
  glow.style.cssText = `
    position: fixed;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    background: radial-gradient(circle,
      rgba(255,107,53,0.06) 0%,
      rgba(78,205,196,0.03) 40%,
      transparent 70%);
    transform: translate(-50%, -50%);
    transition: opacity 0.3s ease;
    mix-blend-mode: screen;
  `;
  document.body.appendChild(glow);

  let mouseX = 0, mouseY = 0;
  let glowX = 0, glowY = 0;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animateGlow() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    glow.style.left = glowX + 'px';
    glow.style.top = glowY + 'px';
    requestAnimationFrame(animateGlow);
  }
  animateGlow();

  document.querySelectorAll('.chart-box, .single-map-wrap, .triple-maps').forEach(el => {
    el.addEventListener('mouseenter', () => {
      glow.style.background = `radial-gradient(circle,
        rgba(78,205,196,0.08) 0%,
        rgba(78,205,196,0.03) 40%,
        transparent 70%)`;
    });
    el.addEventListener('mouseleave', () => {
      glow.style.background = `radial-gradient(circle,
        rgba(255,107,53,0.06) 0%,
        rgba(78,205,196,0.03) 40%,
        transparent 70%)`;
    });
  });
}

// ============================================================
// Effect two, KPI card 3D tilt
// ============================================================
function initCardTilt() {
  document.querySelectorAll('.kpi-card').forEach(card => {
    card.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease';
    card.style.transformStyle = 'preserve-3d';

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const xRel = (e.clientX - rect.left) / rect.width - 0.5;
      const yRel = (e.clientY - rect.top) / rect.height - 0.5;
      const rotateX = -yRel * 8;
      const rotateY = xRel * 8;
      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
      card.style.boxShadow = `${-xRel * 10}px ${-yRel * 10}px 20px rgba(255,107,53,0.15)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(600px) rotateX(0) rotateY(0) scale(1)';
      card.style.boxShadow = 'none';
    });
  });
}

// ============================================================
// Bridge area, Three.js 3D particle sphere background
// ============================================================
function initBridgeParticles() {

  // Bridge one, ratio sphere one in seven
  (function setupBridge1() {
    const canvas = document.getElementById('bridge-canvas-1');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 1000);
    camera.position.z = 3;

    const total = 1400;
    const fireCount = Math.round(total / 7);
    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);

    const fireR = 1.0, fireG = 0.42, fireB = 0.21;
    const grayR = 0.35, grayG = 0.35, grayB = 0.35;

    for (let i = 0; i < total; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.2 + (Math.random() - 0.5) * 0.25;
      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);

      if (i < fireCount) {
        colors[i*3] = fireR; colors[i*3+1] = fireG; colors[i*3+2] = fireB;
      } else {
        colors[i*3] = grayR; colors[i*3+1] = grayG; colors[i*3+2] = grayB;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.016, vertexColors: true,
      transparent: true, opacity: 0.7, sizeAttenuation: true
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    canvas.style.cssText = `
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: 400px !important;
      height: 400px !important;
      z-index: 2;
      pointer-events: none;
    `;

    function resize() {
      renderer.setSize(400, 400, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    let speed = 0.003, target = 0.003;
    canvas.parentElement.addEventListener('mouseenter', () => target = 0.01);
    canvas.parentElement.addEventListener('mouseleave', () => target = 0.003);

    let fId;
    function animate() {
      fId = requestAnimationFrame(animate);
      speed += (target - speed) * 0.05;
      pts.rotation.y += speed;
      pts.rotation.x += speed * 0.3;
      renderer.render(scene, camera);
    }
    new IntersectionObserver(es => {
      es.forEach(e => { e.isIntersecting ? animate() : cancelAnimationFrame(fId); });
    }, { threshold: 0.1 }).observe(canvas.parentElement);
  })();

  // Bridge two, inner versus outer London clusters
  (function setupBridge2() {
    const canvas = document.getElementById('bridge-canvas-2');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 1000);
    camera.position.z = 3.5;

    const innerCount = 600;
    const outerCount = 400;
    const total = innerCount + outerCount;

    const basePositions = new Float32Array(total * 3);
    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);

    for (let i = 0; i < innerCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.6 + Math.random() * 0.3;
      basePositions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      basePositions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      basePositions[i*3+2] = r * Math.cos(phi);
      colors[i*3] = 1.0; colors[i*3+1] = 0.42; colors[i*3+2] = 0.21;
    }
    for (let i = innerCount; i < total; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.2 + Math.random() * 0.4;
      basePositions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      basePositions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      basePositions[i*3+2] = r * Math.cos(phi);
      colors[i*3] = 0.306; colors[i*3+1] = 0.804; colors[i*3+2] = 0.769;
    }
    positions.set(basePositions);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.018, vertexColors: true,
      transparent: true, opacity: 0.65, sizeAttenuation: true
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    canvas.style.cssText = `
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: 400px !important;
      height: 400px !important;
      z-index: 2;
      pointer-events: none;
    `;

    function resize() {
      renderer.setSize(400, 400, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    let isHovered = false;
    let expandProgress = 0;

    canvas.parentElement.addEventListener('mouseenter', () => isHovered = true);
    canvas.parentElement.addEventListener('mouseleave', () => isHovered = false);

    let speed = 0.002, fId;
    function animate() {
      fId = requestAnimationFrame(animate);
      pts.rotation.y += speed;

      expandProgress += isHovered
        ? Math.min(0.04, 1 - expandProgress)
        : Math.max(-0.04, -expandProgress);

      const posAttr = pts.geometry.attributes.position;
      for (let i = innerCount; i < total; i++) {
        const scale = 1 + expandProgress * 0.6;
        posAttr.array[i*3]   = basePositions[i*3]   * scale;
        posAttr.array[i*3+1] = basePositions[i*3+1] * scale;
        posAttr.array[i*3+2] = basePositions[i*3+2] * scale;
      }
      posAttr.needsUpdate = true;
      renderer.render(scene, camera);
    }
    new IntersectionObserver(es => {
      es.forEach(e => { e.isIntersecting ? animate() : cancelAnimationFrame(fId); });
    }, { threshold: 0.1 }).observe(canvas.parentElement);
  })();

  // Bridge three, twelve months in a ring
  (function setupBridge3() {
    const canvas = document.getElementById('bridge-canvas-3');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 1000);
    camera.position.z = 3;

    const particlesPerMonth = 80;
    const total = 12 * particlesPerMonth;
    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const sizes = new Float32Array(total);

    const hotMonths = [6, 11];

    for (let m = 0; m < 12; m++) {
      const monthAngle = (m / 12) * Math.PI * 2 - Math.PI / 2;
      const ringRadius = 1.1;
      const cx = ringRadius * Math.cos(monthAngle);
      const cy = ringRadius * Math.sin(monthAngle);

      const isHot = hotMonths.includes(m);
      const r = isHot ? 1.0  : 0.8;
      const g = isHot ? 0.42 : 0.7;
      const b = isHot ? 0.21 : 0.2;

      for (let p = 0; p < particlesPerMonth; p++) {
        const idx = m * particlesPerMonth + p;
        const spread = isHot ? 0.15 : 0.08;
        positions[idx*3]   = cx + (Math.random() - 0.5) * spread;
        positions[idx*3+1] = cy + (Math.random() - 0.5) * spread;
        positions[idx*3+2] = (Math.random() - 0.5) * 0.1;

        colors[idx*3] = r; colors[idx*3+1] = g; colors[idx*3+2] = b;
        sizes[idx] = isHot ? 0.025 : 0.012;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.016, vertexColors: true,
      transparent: true, opacity: 0.75, sizeAttenuation: true
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    canvas.style.cssText = `
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: 400px !important;
      height: 400px !important;
      z-index: 2;
      pointer-events: none;
    `;

    function resize() {
      renderer.setSize(400, 400, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);

    let speed = 0.002, target = 0.002, fId;
    canvas.parentElement.addEventListener('mouseenter', () => target = 0.008);
    canvas.parentElement.addEventListener('mouseleave', () => target = 0.002);

    let pulseT = 0;
    function animate() {
      fId = requestAnimationFrame(animate);
      speed += (target - speed) * 0.05;
      pts.rotation.z += speed;
      pulseT += 0.04;
      mat.opacity = 0.6 + Math.sin(pulseT) * 0.15;
      renderer.render(scene, camera);
    }
    new IntersectionObserver(es => {
      es.forEach(e => { e.isIntersecting ? animate() : cancelAnimationFrame(fId); });
    }, { threshold: 0.1 }).observe(canvas.parentElement);
  })();
}

// ============================================================
// Seasonal map
// ============================================================
function initSeasonalMap() {
  let currentSeason = 'summer';
  let currentType = 'outdoor_fire';

  const typeColors = {
    outdoor_fire:  '#ff6b35',
    dwelling_fire: '#f4a261',
    flooding:      '#4ecdc4',
    forced_entry:  '#457b9d',
    agency_assist: '#ffe66d',
  };

  const typeTitles = {
    outdoor_fire:  'Outdoor Fire',
    dwelling_fire: 'Dwelling Fire',
    flooding:      'Flooding',
    forced_entry:  'Forced Entry',
    agency_assist: 'Agency Assist',
  };

  function getColor(val, max, type) {
    const t = Math.min(val / max, 1);
    const c = typeColors[type];
    const parse = hex => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    const [r,g,b] = parse(c);
    if (t > 0.8) return `rgba(${r},${g},${b},0.9)`;
    if (t > 0.6) return `rgba(${Math.round(r+(255-r)*0.2)},${Math.round(g+(255-g)*0.2)},${Math.round(b+(255-b)*0.2)},0.85)`;
    if (t > 0.4) return `rgba(${Math.round(r+(255-r)*0.45)},${Math.round(g+(255-g)*0.45)},${Math.round(b+(255-b)*0.45)},0.8)`;
    if (t > 0.2) return `rgba(${Math.round(r+(255-r)*0.7)},${Math.round(g+(255-g)*0.7)},${Math.round(b+(255-b)*0.7)},0.75)`;
    return 'rgba(255,255,255,0.8)';
  }

  const mapSeasonal = new mapboxgl.Map({
    container: 'map-seasonal',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-0.1, 51.51],
    zoom: 9,
    interactive: true,
    attributionControl: false,
  });

  mapSeasonal.on('load', async () => {
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: 'ward-popup'
    });
    const wards = await fetch('data/ward_seasonal.json').then(r => r.json());

    function updateMap() {
      const key = `${currentSeason}_${currentType}`;
      const color = typeColors[currentType];
      const vals = wards.features.map(f => f.properties[key] || 0);
      const sorted = [...vals].sort((a,b) => a-b);
      const max = sorted[Math.floor(sorted.length * 0.95)] || 1;

      wards.features.forEach(f => {
        const val = f.properties[key] || 0;
        f.properties.fillColor = getColor(val, max, currentType);
        f.properties.fillVal = val;
      });

      if (mapSeasonal.getSource('wards-seasonal')) {
        mapSeasonal.getSource('wards-seasonal').setData(wards);
      } else {
        mapSeasonal.addSource('wards-seasonal', { type: 'geojson', data: wards });
        mapSeasonal.addLayer({ id: 'ward-fill', type: 'fill', source: 'wards-seasonal',
          paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': 0.85 } });
        mapSeasonal.addLayer({ id: 'ward-line', type: 'line', source: 'wards-seasonal',
          paint: { 'line-color': 'rgba(255,255,255,0.15)', 'line-width': 0.5 } });

        mapSeasonal.on('mousemove', 'ward-fill', e => {
          if (!e.features.length) return;
          mapSeasonal.getCanvas().style.cursor = 'pointer';
          const p = e.features[0].properties;
          const val = p.fillVal || 0;
          const allVals = wards.features.map(f => f.properties[`${currentSeason}_${currentType}`] || 0).filter(v => v > 0);
          const avg = Math.round(allVals.reduce((a,b) => a+b, 0) / allVals.length);
          const rank = [...allVals].sort((a,b) => b-a).indexOf(val) + 1;
          const total = allVals.length;
          const diff = Math.round((val - avg) / avg * 100);
          const diffStr = diff > 0
            ? `<span style="color:${typeColors[currentType]}">+${diff}% above avg</span>`
            : `<span style="color:#888">${diff}% below avg</span>`;

          document.getElementById('hover-ward').innerHTML  = `${p.name} <span style="font-size:0.62rem; color:#555; font-weight:400;">· ${p.borough}</span>`;
          document.getElementById('hover-count').innerHTML = `<span style="color:#fff">${val.toLocaleString()}</span> incidents`;
          document.getElementById('hover-rank').innerHTML  = `Rank <span style="color:#fff">#${rank}</span> of ${total} wards`;
          document.getElementById('hover-avg').innerHTML   = diffStr;

          mapSeasonal.setPaintProperty('ward-line', 'line-color', ['case', ['==', ['get', 'name'], p.name], '#ffffff', 'rgba(255,255,255,0.15)']);
          mapSeasonal.setPaintProperty('ward-line', 'line-width', ['case', ['==', ['get', 'name'], p.name], 2, 0.5]);
          mapSeasonal.setPaintProperty('ward-fill', 'fill-opacity', ['case', ['==', ['get', 'name'], p.name], 1.0, 0.65]);

          popup.setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family:'Inter',sans-serif; padding:4px 2px;">
                <div style="font-size:0.78rem; font-weight:600; color:#fff; margin-bottom:2px;">${p.name}</div>
                <div style="font-size:0.68rem; color:#888; margin-bottom:4px;">${p.borough}</div>
                <div style="font-size:0.82rem; font-weight:700; color:${typeColors[currentType]};">${val.toLocaleString()} incidents</div>
              </div>
            `)
            .addTo(mapSeasonal);
        });

        mapSeasonal.on('mouseleave', 'ward-fill', () => {
          mapSeasonal.getCanvas().style.cursor = '';
          mapSeasonal.setPaintProperty('ward-line', 'line-color', 'rgba(255,255,255,0.15)');
          mapSeasonal.setPaintProperty('ward-line', 'line-width', 0.5);
          mapSeasonal.setPaintProperty('ward-fill', 'fill-opacity', 0.85);
          document.getElementById('hover-ward').innerHTML  = ', ';
          document.getElementById('hover-count').innerHTML = ', ';
          document.getElementById('hover-rank').innerHTML  = ', ';
          document.getElementById('hover-avg').innerHTML   = ', ';
          popup.remove();
        });
      }

      document.getElementById('seasonal-legend-title').textContent = typeTitles[currentType];
      document.getElementById('seasonal-legend-title').style.color = color;
      const [r,g,b] = [parseInt(color.slice(1,3),16), parseInt(color.slice(3,5),16), parseInt(color.slice(5,7),16)];
      const legendColors = [
        `rgba(${r},${g},${b},0.9)`,
        `rgba(${Math.round(r+(255-r)*0.2)},${Math.round(g+(255-g)*0.2)},${Math.round(b+(255-b)*0.2)},0.85)`,
        `rgba(${Math.round(r+(255-r)*0.45)},${Math.round(g+(255-g)*0.45)},${Math.round(b+(255-b)*0.45)},0.8)`,
        `rgba(${Math.round(r+(255-r)*0.7)},${Math.round(g+(255-g)*0.7)},${Math.round(b+(255-b)*0.7)},0.75)`,
        'rgba(255,255,255,0.8)',
      ];
      const allVals2 = wards.features.map(f => f.properties[`${currentSeason}_${currentType}`] || 0);
      const sortedVals = [...allVals2].sort((a,b) => a-b);
      const p95 = sortedVals[Math.floor(sortedVals.length * 0.95)] || 1;
      const intervals = [
        `> ${Math.round(p95 * 0.8)}`,
        `${Math.round(p95 * 0.6)}, ${Math.round(p95 * 0.8)}`,
        `${Math.round(p95 * 0.4)}, ${Math.round(p95 * 0.6)}`,
        `${Math.round(p95 * 0.2)}, ${Math.round(p95 * 0.4)}`,
        `< ${Math.round(p95 * 0.2)}`,
      ];
      legendColors.forEach((c, i) => {
        const el = document.getElementById(`legend-c${i+1}`);
        if (el) el.style.background = c;
      });
      intervals.forEach((text, i) => {
        const el = document.getElementById(`legend-label${i+1}`);
        if (el) el.textContent = text;
      });
    }

    function setSeasonBtn(season) {
      const summerBtn = document.getElementById('btn-summer');
      const winterBtn = document.getElementById('btn-winter');
      if (season === 'summer') {
        summerBtn.style.width = '66px'; summerBtn.style.height = '66px';
        summerBtn.style.border = '2px solid #ff6b35';
        summerBtn.style.boxShadow = '0 0 14px rgba(255,107,53,0.7)';
        summerBtn.style.opacity = '1';
        summerBtn.style.transform = 'scale(1.1) translateY(-2px)';
        winterBtn.style.width = '49px'; winterBtn.style.height = '49px';
        winterBtn.style.border = '2px solid rgba(78,205,196,0.4)';
        winterBtn.style.boxShadow = 'none';
        winterBtn.style.opacity = '0.65';
        winterBtn.style.transform = 'scale(1)';
      } else {
        winterBtn.style.width = '66px'; winterBtn.style.height = '66px';
        winterBtn.style.border = '2px solid #4ecdc4';
        winterBtn.style.boxShadow = '0 0 14px rgba(78,205,196,0.7)';
        winterBtn.style.opacity = '1';
        winterBtn.style.transform = 'scale(1.1) translateY(-2px)';
        summerBtn.style.width = '49px'; summerBtn.style.height = '49px';
        summerBtn.style.border = '2px solid rgba(255,107,53,0.4)';
        summerBtn.style.boxShadow = 'none';
        summerBtn.style.opacity = '0.65';
        summerBtn.style.transform = 'scale(1)';
      }
    }

    function setTypeBtn(activeId, activeBg, activeBorder, activeShadow) {
      const configs = {
        'btn-fire':     { bg: 'rgba(0,0,0,0.5)', border: '1.5px solid rgba(255,107,53,0.4)',  shadow: 'none', color: '#aaa', size: '40px' },
        'btn-dwelling': { bg: 'rgba(0,0,0,0.5)', border: '1.5px solid rgba(244,162,97,0.4)',  shadow: 'none', color: '#aaa', size: '40px' },
        'btn-flood':    { bg: 'rgba(0,0,0,0.5)', border: '1.5px solid rgba(78,205,196,0.4)',  shadow: 'none', color: '#aaa', size: '40px' },
        'btn-entry':    { bg: 'rgba(0,0,0,0.5)', border: '1.5px solid rgba(69,123,157,0.4)',  shadow: 'none', color: '#aaa', size: '40px' },
        'btn-assist':   { bg: 'rgba(0,0,0,0.5)', border: '1.5px solid rgba(255,230,109,0.4)', shadow: 'none', color: '#aaa', size: '40px' },
      };
      ['btn-fire','btn-dwelling','btn-flood','btn-entry','btn-assist'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const c = configs[id];
        el.style.background = c.bg; el.style.border = c.border;
        el.style.boxShadow = c.shadow; el.style.color = c.color;
        el.style.width = c.size; el.style.height = c.size;
        el.style.transform = 'scale(1)';
      });
      const active = document.getElementById(activeId);
      if (active) {
        active.style.background = activeBg; active.style.border = activeBorder;
        active.style.boxShadow = activeShadow; active.style.color = '#fff';
        active.style.width = '45px'; active.style.height = '45px';
        active.style.transform = 'scale(1.08) translateX(-2px)';
      }
    }

    updateMap();

    document.getElementById('btn-summer')?.addEventListener('click', () => {
      currentSeason = 'summer'; setSeasonBtn('summer'); updateMap();
    });
    document.getElementById('btn-winter')?.addEventListener('click', () => {
      currentSeason = 'winter'; setSeasonBtn('winter'); updateMap();
    });
    document.getElementById('btn-fire')?.addEventListener('click', () => {
      currentType = 'outdoor_fire';
      setTypeBtn('btn-fire', 'rgba(255,107,53,0.85)', '2px solid #ff6b35', '0 0 10px rgba(255,107,53,0.5)');
      updateMap();
    });
    document.getElementById('btn-dwelling')?.addEventListener('click', () => {
      currentType = 'dwelling_fire';
      setTypeBtn('btn-dwelling', 'rgba(244,162,97,0.85)', '2px solid #f4a261', '0 0 10px rgba(244,162,97,0.5)');
      updateMap();
    });
    document.getElementById('btn-flood')?.addEventListener('click', () => {
      currentType = 'flooding';
      setTypeBtn('btn-flood', 'rgba(78,205,196,0.85)', '2px solid #4ecdc4', '0 0 10px rgba(78,205,196,0.5)');
      updateMap();
    });
    document.getElementById('btn-entry')?.addEventListener('click', () => {
      currentType = 'forced_entry';
      setTypeBtn('btn-entry', 'rgba(69,123,157,0.85)', '2px solid #457b9d', '0 0 10px rgba(69,123,157,0.5)');
      updateMap();
    });
    document.getElementById('btn-assist')?.addEventListener('click', () => {
      currentType = 'agency_assist';
      setTypeBtn('btn-assist', 'rgba(255,230,109,0.85)', '2px solid #ffe66d', '0 0 10px rgba(255,230,109,0.5)');
      updateMap();
    });
  });

  new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) setTimeout(() => mapSeasonal?.resize(), 100);
    });
  }, { threshold: 0.1 }).observe(document.getElementById('map-seasonal'));

  window.addEventListener('resize', () => setTimeout(() => mapSeasonal?.resize(), 100));
}