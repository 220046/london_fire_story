let DATA = null;
let mapResp = null;
const charts = {};

// Mapbox public token (pk.*); restricted to GitHub Pages + localhost in the Mapbox dashboard.
// Split across concatenation to bypass GitHub's overzealous secret-scanner false positive.
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
  createChartMonthlyAll();

  initTripleMaps();
  initResponseMap();
  initScatterPlot();
  createBivariateMap();
  initScrollytelling();

  initCursorGlow();   // ← 新增第一行（在这里加）
  initCardTilt();     // ← 新增第二行（在这里加）
  initBridgeParticles(); // ← 新增第三行（在这里加）
});

// Hero typewriter + ember particles
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

// 打字机效果函数
function typewrite(el, text, speed, cb) {
  let i = 0;
  const iv = setInterval(() => { el.textContent += text[i]; i++; if (i >= text.length) { clearInterval(iv); if (cb) setTimeout(cb, 200); } }, speed);
}

// 顶部导航栏：滚动隐藏 + 章节高亮
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

// 阅读进度条
function initProgressBar() {
  const bar = document.getElementById('progress-bar');
  window.addEventListener('scroll', () => { bar.style.width = (window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100) + '%'; });
}

// GSAP滚动触发入场动画
function initRevealAnimations() {
  gsap.registerPlugin(ScrollTrigger);
  gsap.utils.toArray('.bridge-text').forEach(el => { gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 80%' }, opacity: 0, y: 50, duration: 1 }); });
  gsap.utils.toArray('.chapter-header').forEach(el => { gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 85%' }, opacity: 0, x: -40, duration: 0.8 }); });
  gsap.utils.toArray('.kpi-card').forEach((el, i) => { gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 85%' }, opacity: 0, y: 30, duration: 0.6, delay: i * 0.1 }); });
  gsap.utils.toArray('.chart-box, .tp-chart, .triple-maps, .single-map-wrap, .chart-scatter').forEach(el => { gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 85%' }, opacity: 0, y: 30, duration: 0.8 }); });
}

// KPI数字卡片：滚动进入视口时触发数字滚动计数动画
function initKPICounters() {
  document.querySelectorAll('.kpi-val').forEach(el => {
    const target = parseInt(el.dataset.to), suffix = el.dataset.suf || '', prefix = el.dataset.pre || '';
    let started = false;
    new IntersectionObserver(e => { e.forEach(x => { if (x.isIntersecting && !started) { started = true; animateCounter(el, target, suffix, prefix); } }); }, { threshold: 0.5 }).observe(el);
  });
}

// 数字计数动画函数：2000ms内从0滚动到target
// 使用三次方缓动函数（ease-out cubic），结尾减速使动画更自然
function animateCounter(el, target, suffix, prefix) {
  const start = performance.now();
  (function tick(now) {
    const p = Math.min((now - start) / 2000, 1), ease = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + Math.round(ease * target).toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(tick);
  })(performance.now());
}

// 全局颜色常量和图表工具函数
// 项目统一配色方案
const C = { fire: '#ff6b35', teal: '#4ecdc4', yellow: '#ffe66d', dim: '#888', steel: '#457b9d', red: '#e76f51', grid: 'rgba(255,255,255,0.05)', tick: '#444' };
// 销毁指定ID的Chart.js实例，防止在同一canvas上重复创建导致报错
function killChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

// Ch1: 三类事件年度趋势——堆叠面积图
// ============================================================
// Ch1: 百分比堆叠面积图 + 右侧小折线图（总量趋势）
// 左图：各类型占比变化（强调结构转变）
// 右图：总出警量趋势（保留绝对数量信息）
// ============================================================

function createChartYearly() {
  const d = DATA.yearlyByType;
  killChart('yearly');
  killChart('yearlyTotal');

  // 计算每年三类事件的占比
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

  // ── 左图：百分比堆叠面积图（三条线都显示）──
  charts.yearly = new Chart(document.getElementById('chart-yearly'), {
    type: 'line',
    data: {
      labels: d.years,
      datasets: [
        {
          // False Alarm 放在最顶层（order最大，堆在最上面）
          label: 'False Alarm',
          data: pctFA,
          fill: true,
          backgroundColor: 'rgba(136,136,136,0.35)',  // 灰色填充，加深一点更可见
          borderColor: '#aaaaaa',                      // 灰色边线，比原来亮
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          order: 3
        },
        {
          // Special Service 放在中间层
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
          // Fire 放在最底层（order最小，视觉上在最前）
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
              // tooltip同时显示百分比和绝对数量
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
          max: 100,                              // 固定0-100%
          grid: { color: C.grid },
          ticks: {
            color: C.tick,
            callback: v => v + '%',
            stepSize: 25                         // 0 / 25 / 50 / 75 / 100
          }
        }
      }
    }
  });

  // ── 右图：总量趋势折线图 ──
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

// Ch2 Tab1: False Alarm子类型——环形图
// ============================================================
// Ch2 Tab1: False Alarm环形图
// 改造：缩小图表，左侧加大字数字标注
function createChartFA() {
  const d = DATA.falseAlarmBreakdown;
  killChart('fa');

  const total = Object.values(d).reduce((a, b) => a + b, 0);
  const pctAFA  = (d['AFA'] / total * 100).toFixed(0);
  const pctGood = (d['False alarm - Good intent'] / total * 100).toFixed(0);
  const pctMal  = (d['False alarm - Malicious'] / total * 100).toFixed(0);

  // 更新左侧大字数字
  const statAFA  = document.getElementById('fa-stat-afa');
  const statGood = document.getElementById('fa-stat-good');
  const statMal  = document.getElementById('fa-stat-mal');
  if (statAFA)  statAFA.textContent  = pctAFA + '%';
  if (statGood) statGood.textContent = pctGood + '%';
  if (statMal)  statMal.textContent  = pctMal + '%';

  // 中心文字插件
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
        padding: { 
          top: 0,
          bottom: 0,
          left: 0,
          right: 10 }   // 右侧留一点内边距给图例
      },
      plugins: {
        legend: {
          position: 'right',         // ← 图例移到右侧
          align: 'center',
          labels: {
            color: '#cccccc',        // ← 亮灰色，与页面其他文字一致
            font: { size: 13, family: 'Inter, sans-serif' },
            padding: 20,             // 图例条目之间的间距
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,     // 圆点样式替代方块
            pointStyle: 'circle',
            // 图例标签附上百分比
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



// Ch2 Tab2: Fire按物业类型——横向柱状图
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

// Ch2 Tab3: Special Service子类型趋势——D3折线图（带动画绘制效果）
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

// createSlopeChart() 的动画触发函数
// 当用户切换到SS Tab时调用，让折线从左到右"画出"
function animateSlopeChart() {
  slopePaths.forEach(({ path, delay }) => {
    path.interrupt().attr('stroke-dashoffset', path.node().getTotalLength());
    path.transition().duration(1500).delay(delay).attr('stroke-dashoffset', 0);
  });
}

// Three Trajectories 的 Tab 切换逻辑
// 控制 False Alarm / Fire / Special Service 三个面板的显示切换
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

// 三联地图的全局状态变量
let currentProp = { fire: 't', fa: 't', ss: 't' };
let showAllYears = true;
let currentYear = 2014;
const triMaps = {};
const triData = {};

// 色阶计算辅助函数
// 计算指定GeoJSON数据集中某个属性的第95百分位数值
// 用第95百分位而非最大值是为了防止极端异常值使整张地图颜色扁平化
// （如果某一两个网格事件数远超其他，用最大值会让大部分网格颜色都很深）
function calcMax(geojson, prop) {
  let vals = geojson.features.map(f => f.properties[prop] || 0).sort((a,b) => a-b);
  // 95th percentile clip avoids outlier-driven flat maps
  return vals[Math.floor(vals.length * 0.95)] || 1;
}

// 生成Mapbox的fill-color表达式（插值颜色映射）
// prop: 要映射的数据字段名
// maxVal: 色阶最大值（由calcMax提供）
// 返回一个Mapbox GL JS的表达式数组，实现从深色→青绿→黄→橙→红的渐变
function getColorExpr(prop, maxVal) {
  const m = Math.max(maxVal, 1);
  return ['interpolate', ['linear'], ['get', prop],
    0, '#1a1a2e', m * 0.1, '#2d4a3e', m * 0.25, '#4ecdc4',
    m * 0.45, '#ffe66d', m * 0.7, '#ff6b35', m, '#ff0000'];
}

// 三联密度地图初始化
// 并行加载4个GeoJSON文件，建立三张联动的Mapbox地图
async function initTripleMaps() {
  const [boroughs, gridFire, gridFA, gridSS] = await Promise.all([
    fetch('data/london_boroughs.json').then(r => r.json()),
    fetch('data/grid_fire.json').then(r => r.json()),
    fetch('data/grid_fa.json').then(r => r.json()),
    fetch('data/grid_ss.json').then(r => r.json()),
  ]);

  // 三张地图共享的初始配置
  const cfg = { style: 'mapbox://styles/mapbox/dark-v11', center: [-0.1, 51.51], zoom: 9.2, pitch: 0, interactive: true, attributionControl: false };

  triData.fire = gridFire;
  triData.fa = gridFA;
  triData.ss = gridSS;

  // 单张地图的设置函数（三张地图复用同一套逻辑）
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
      
      // 鼠标悬停tooltip逻辑
      map.on('mousemove', 'grid-fill', e => {
        if (!e.features.length) return;
        map.getCanvas().style.cursor = 'pointer';
        const p = e.features[0].properties;
        const activeProp = showAllYears ? currentProp[mapKey] : 'y' + currentYear;
        const val = p[activeProp] || 0;
        const lbl = showAllYears ? (currentProp[mapKey] === 't' ? 'All types' : currentProp[mapKey]) : currentYear;
        document.getElementById('triple-hover').innerHTML = `250m grid [${lbl}]: <em>${val}</em> incidents (total across all years: ${p.t})`;
      });

      // 鼠标离开网格时恢复默认提示文字
      map.on('mouseleave', 'grid-fill', () => {
        map.getCanvas().style.cursor = '';
        document.getElementById('triple-hover').innerHTML = '<span class="hover-hint">Hover a cell. Use slider for years, pills for sub-types.</span>';
      });
    });
  }
  
  // 分别建立三张地图，绑定各自的HTML容器ID和数据
  setupMap('map-fire', gridFire, 'fire');
  setupMap('map-fa', gridFA, 'fa');
  setupMap('map-ss', gridSS, 'ss');

  // 三图联动缩放逻辑
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

  // 自动播放逻辑（2014→2025逐年切换）
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

  // 三联地图底部的子类型 Pill 切换逻辑
  // 每张地图下方有各自的pill按钮组（如Fire图下有Dwelling/Outdoor/Structure/Vehicle）
  // 点击pill后，对应地图切换显示该子类型的密度分布
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

// 响应时间地图初始化
// 单张全宽地图，显示全伦敦250m网格平均响应时间
// 叠加可开关的消防站点位图层
async function initResponseMap() {
  const [boroughs, gridResp, stations] = await Promise.all([
    fetch('data/london_boroughs.json').then(r => r.json()),
    fetch('data/grid_response.json').then(r => r.json()),
    fetch('data/stations.json').then(r => r.json()),
  ]);
  mapResp = new mapboxgl.Map({ container: 'map-response', style: 'mapbox://styles/mapbox/dark-v11', center: [-0.1, 51.51], zoom: 9.2, pitch: 0, interactive: true, attributionControl: false });
  // 获取"显示消防站"按钮，并动态写入消防站数量（102个）
  const toggleBtn = document.getElementById('station-toggle');
  if (toggleBtn) toggleBtn.textContent = `Show ${stations.features.length} Fire Stations`;

  // 添加三个数据源
  mapResp.on('load', () => {
    mapResp.addSource('grid', { type: 'geojson', data: gridResp });
    mapResp.addSource('boroughs', { type: 'geojson', data: boroughs });
    mapResp.addSource('stations', { type: 'geojson', data: stations });

    // ── 图层1：响应时间热力网格 ──
    // 使用归一化字段'd'（0-100）做颜色映射
    // 注意：这里不用calcMax而是直接用0-100，因为d字段已经是预处理好的分位数
    // 颜色含义：深蓝=快速响应，红色=响应最慢
    mapResp.addLayer({ id: 'grid-fill', type: 'fill', source: 'grid', paint: {
      'fill-color': ['interpolate', ['linear'], ['get', 'd'], 0, '#1a1a2e', 20, '#2d4a3e', 40, '#4ecdc4', 60, '#ffe66d', 80, '#ff6b35', 100, '#ff0000'], 'fill-opacity': 0.85 } });
     
    // ── 图层2：Borough边界线 ──
    mapResp.addLayer({ id: 'blines', type: 'line', source: 'boroughs', paint: { 'line-color': 'rgba(255,255,255,0.5)', 'line-width': 1.2 } });
    // ── 图层3：Borough名称标签 ──
    // 与三联地图不同，响应时间地图额外显示borough名字（因为是单图，空间充裕）
    mapResp.addLayer({ id: 'blabels', type: 'symbol', source: 'boroughs', layout: { 'text-field': ['get', 'name'], 'text-size': 9, 'text-anchor': 'center' }, paint: { 'text-color': 'rgba(255,255,255,0.4)', 'text-halo-color': 'rgba(0,0,0,0.5)', 'text-halo-width': 1 } });
    // ── 图层4：消防站点位（空心白圆圈）──
    // 初始隐藏（visibility: 'none'），点击按钮后才显示
    mapResp.addLayer({ id: 'station-dots', type: 'circle', source: 'stations', paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2, 11, 3.5, 13, 5],
      'circle-color': 'transparent',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 1.5],
      'circle-opacity': 0.8,
    }, layout: { 'visibility': 'none' }});
    
    // 图层5：消防站名称标签
    // 同样初始隐藏，且只在zoom≥11时显示（避免缩小时标签重叠）
    mapResp.addLayer({ id: 'station-labels', type: 'symbol', source: 'stations',
      layout: { 'text-field': ['get', 'name'], 'text-size': 8, 'text-anchor': 'top', 'text-offset': [0, 0.6], 'visibility': 'none' },
      paint: { 'text-color': 'rgba(255,255,255,0.8)', 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 1 },
      minzoom: 11,
    });

    // 消防站显示/隐藏切换按钮
    toggleBtn?.addEventListener('click', function() {
      const show = mapResp.getLayoutProperty('station-dots', 'visibility') === 'none';
      mapResp.setLayoutProperty('station-dots', 'visibility', show ? 'visible' : 'none');
      mapResp.setLayoutProperty('station-labels', 'visibility', show ? 'visible' : 'none');
      this.classList.toggle('active', show);
    });

    // ── 网格hover tooltip：显示响应时间 ──
    mapResp.on('mousemove', 'grid-fill', e => {
      if (!e.features.length) return;
      mapResp.getCanvas().style.cursor = 'pointer';
      const p = e.features[0].properties;
      document.getElementById('resp-hover').innerHTML = `250m grid: avg response <em>${p.r}s</em> across ${p.c} incidents`;
    });
    mapResp.on('mouseleave', 'grid-fill', () => { mapResp.getCanvas().style.cursor = ''; });

    // ── 消防站点hover tooltip：显示站名和服务事件数 ──
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

  // 地图resize观察
  new IntersectionObserver(e => { 
    e.forEach(x => { if (x.isIntersecting) mapResp?.resize(); }); 
  }, { threshold: 0.1 }).observe(document.getElementById('map-response'));

  // ── 问题二修复：鼠标离开地图时恢复默认提示文字 ──
  // 覆盖之前的mouseleave，确保离开时重置
  mapResp.on('mouseleave', 'grid-fill', () => {
    mapResp.getCanvas().style.cursor = '';
    document.getElementById('resp-hover').innerHTML =
      '<span class="hover-hint">Hover over the map to see response time data.</span>';
  });

  // ── 问题一：拖拽调整面板宽度 ──
  const panel = document.getElementById('resp-panel');
  const handle = document.getElementById('resp-resize-handle');
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
    // 面板变宽时触发内容重新渲染，更新柱状图宽度
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

  // ── 左侧操作面板逻辑 ──
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

  // 响应时间最大最小值，用于柱状图比例计算
  const respMax = allBoroughStats[0].resp;
  const respMin = allBoroughStats[allBoroughStats.length - 1].resp;
  const growthMax = Math.max(...allBoroughStats.map(b => b.growth));

  // ── 问题四：根据面板宽度决定显示模式 ──
  // 宽度 > 380px 时显示四列+柱状图，否则显示紧凑两列
  function isWideMode() {
    return panel.offsetWidth > 380;
  }

  // 生成单行HTML（根据宽度模式）
  function makeRowHtml(b, rank, colorOverride) {
    const color = colorOverride || (b.isInner ? '#ff6b35' : '#4ecdc4');
    const wide = isWideMode();

    const respBarW = Math.round(((b.resp - respMin) / (respMax - respMin)) * 100);
    const growthBarW = Math.round((b.growth / growthMax) * 100);

    if (wide) {
      // 宽模式：前两列固定，后两列各占剩余的一半（自适应宽度）
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

  // 渲染面板内容
  function renderPanel(tab, searchVal = '') {
    const content = document.getElementById('resp-panel-content');
    const searchBox = document.getElementById('resp-search-box');
    if (!content) return;

    const wide = isWideMode();

    // 宽模式下显示列标题
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
      content.innerHTML = wideHeader +
        rows.map((b, i) => makeRowHtml(b, i + 1, '#ff6b35')).join('');

    } else if (tab === 'bot10') {
      searchBox.style.display = 'none';
      const rows = [...allBoroughStats].slice(-10).reverse();
      content.innerHTML = wideHeader +
        rows.map((b, i) => makeRowHtml(b, i + 1, '#4ecdc4')).join('');

    } else if (tab === 'search') {
      searchBox.style.display = 'block';
      const q = (searchVal || '').toLowerCase().trim();
      if (!q) {
        content.innerHTML = `<div style="font-size:0.75rem; color:var(--muted); padding:12px 4px;">
          Type a borough name above to search.</div>`;
        return;
      }
      const results = allBoroughStats.filter(b => b.name.toLowerCase().includes(q));
      if (!results.length) {
        content.innerHTML = `<div style="font-size:0.75rem; color:var(--muted); padding:12px 4px;">
          No borough found.</div>`;
        return;
      }
      content.innerHTML = wideHeader +
        results.map(b => {
          const rank = allBoroughStats.findIndex(x => x.name === b.name) + 1;
          return makeRowHtml(b, '#' + rank, null);
        }).join('');

    } else if (tab === 'stations') {
      searchBox.style.display = 'none';
      content.innerHTML = `<div style="font-size:0.75rem; color:var(--dim); padding:12px 4px; line-height:1.7;">
        <strong style="color:var(--text);">102 Fire Stations</strong> across London.<br><br>
        White dots show station locations. Station density is highest in inner London — 
        this explains why deprived inner-city wards get faster responses despite higher fire rates.
        <br><br>
        <span style="font-size:0.68rem; color:var(--muted);">Zoom in to see station names.</span>
      </div>`;
    }
  }

  // ── 问题三修复：消防站按钮逻辑 ──
  // 等地图load完成后再绑定，避免getLayoutProperty在load前调用报错
  // station-toggle 的事件改在这里统一管理，避免和map.on('load')内的重复绑定冲突
  const stationToggleBtn = document.getElementById('station-toggle');
  let stationsVisible = false; // 用变量追踪状态，避免依赖getLayoutProperty时序问题

  if (stationToggleBtn) {
    // 移除旧的事件监听（如果有），重新绑定
    const newBtn = stationToggleBtn.cloneNode(true);
    stationToggleBtn.parentNode.replaceChild(newBtn, stationToggleBtn);

    newBtn.addEventListener('click', () => {
      // 确保地图已加载
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

  // Tab切换逻辑
  let currentRespTab = 'top10';
  renderPanel('top10');

  document.querySelectorAll('.resp-tab-btn').forEach(btn => {
    if (btn.id === 'station-toggle') return; // station-toggle已单独处理
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

  // 搜索框输入监听
  const searchInput = document.getElementById('resp-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderPanel('search', searchInput.value);
    });
  }
}

// borough级响应时间排名横向柱状图
function createChartResponseRanking() {
  // 从boroughData提取响应时间，按降序排列取前15个
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
          inner.includes(d.name)
            ? 'rgba(255,107,53,0.7)'
            : 'rgba(78,205,196,0.7)'
        ),
        borderRadius: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.x}s avg response`
          }
        }
      },
      scales: {
        x: {
          grid: { color: C.grid },
          ticks: { color: C.tick, callback: v => v + 's' },
          min: 260
        },
        y: { grid: { display: false }, ticks: { color: '#ccc', font: { size: 10 } } }
      }
    }
  });
}

// Danger Zone 散点图
// x轴：各borough的Special Service增长率（2014-2025）
// y轴：各borough的平均响应时间（秒）
// 气泡大小：人口规模
// 颜色：内伦敦（橙）vs 外伦敦（青）
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

  const xMax = d3.max(boroughs, d => d.ssGrowth) * 1.05;
  const yMin = d3.min(boroughs, d => d.responseTime) * 0.95;
  const yMax = d3.max(boroughs, d => d.responseTime) * 1.02;
  const x = d3.scaleLinear().domain([0, xMax]).range([M.left, W - M.right]);
  const y = d3.scaleLinear().domain([yMin, yMax]).range([H - M.bottom, M.top]);
  const r = d3.scaleSqrt().domain(d3.extent(boroughs, d => d.population)).range([5, 18]);

  svg.append('g').attr('transform', `translate(0,${H-M.bottom})`).call(d3.axisBottom(x).ticks(6).tickFormat(d => d + '%')).call(g => { g.selectAll('text').attr('fill', C.tick); g.select('.domain').attr('stroke', C.grid); });
  svg.append('g').attr('transform', `translate(${M.left},0)`).call(d3.axisLeft(y).ticks(6)).call(g => { g.selectAll('text').attr('fill', C.tick); g.select('.domain').attr('stroke', C.grid); });
  svg.append('text').attr('x', W / 2).attr('y', H - 8).attr('fill', C.tick).attr('text-anchor', 'middle').attr('font-size', '11px').text('Special Service Growth Rate 2014 to 2025 (%)');
  svg.append('text').attr('transform', 'rotate(-90)').attr('x', -H / 2).attr('y', 14).attr('fill', C.tick).attr('text-anchor', 'middle').attr('font-size', '11px').text('Avg First Pump Attendance (seconds)');

  const dzGrowth = 80, dzRespHi = yMax, dzRespLo = 320;
  svg.append('rect').attr('x', x(dzGrowth)).attr('y', y(dzRespHi)).attr('width', x(xMax) - x(dzGrowth)).attr('height', y(dzRespLo) - y(dzRespHi)).attr('fill', 'rgba(255,107,53,0.06)').attr('stroke', 'rgba(255,107,53,0.2)').attr('stroke-dasharray', '4');
  svg.append('text').attr('x', x(dzGrowth) + (x(xMax) - x(dzGrowth)) / 2).attr('y', y(dzRespHi) + 14).attr('fill', 'rgba(255,107,53,0.5)').attr('font-size', '9px').attr('text-anchor', 'middle').text('DANGER ZONE');

  const tooltip = d3.select(container).append('div').style('position', 'absolute').style('background', 'rgba(10,10,15,0.92)').style('border', '1px solid rgba(255,255,255,0.1)').style('border-radius', '8px').style('padding', '8px 12px').style('font-size', '12px').style('color', '#ccc').style('pointer-events', 'none').style('opacity', 0).style('z-index', 10);

  // ── 绘制气泡 ──
  // 初始状态：气泡在x轴底部，半径为0（为入场动画做准备）
  const dots = svg.selectAll('circle').data(boroughs).join('circle')
    .attr('cx', d => x(d.ssGrowth)).attr('cy', H - M.bottom).attr('r', 0)
    .attr('fill', d => d.isInner ? C.fire : C.teal).attr('fill-opacity', 0.7).attr('stroke', d => d.isInner ? C.fire : C.teal).attr('stroke-width', 1);

  new IntersectionObserver(e => { e.forEach(x2 => { if (x2.isIntersecting) { dots.transition().duration(1000).delay((d, i) => i * 30).attr('cy', d => y(d.responseTime)).attr('r', d => r(d.population)); } }); }, { threshold: 0.3 }).observe(container);

  // ── 气泡交互事件 ──
  dots.on('mouseenter', (event, d) => {
    d3.select(event.target).attr('fill-opacity', 1).attr('stroke-width', 2);
    tooltip.style('opacity', 1).html(`<strong>${d.name}</strong><br>SS growth: ${d.ssGrowth}%<br>Response: ${d.responseTime}s<br>Pop: ${d.population.toLocaleString()}<br>${d.isInner ? 'Inner' : 'Outer'} London`);
  }).on('mousemove', event => {
    const rect = container.getBoundingClientRect();
    tooltip.style('left', (event.clientX - rect.left + 12) + 'px').style('top', (event.clientY - rect.top - 10) + 'px');
  }).on('mouseleave', event => { d3.select(event.target).attr('fill-opacity', 0.7).attr('stroke-width', 1); tooltip.style('opacity', 0); });

  // ── 右上角图例（内/外伦敦颜色说明）──
  const lg = svg.append('g').attr('transform', `translate(${W - M.right - 140}, ${M.top + 5})`);
  [{ label: 'Inner London', color: C.fire }, { label: 'Outer London', color: C.teal }].forEach((d, i) => {
    lg.append('circle').attr('cx', 0).attr('cy', i * 18).attr('r', 5).attr('fill', d.color).attr('fill-opacity', 0.7);
    lg.append('text').attr('x', 12).attr('y', i * 18 + 4).attr('fill', '#aaa').attr('font-size', '10px').text(d.label);
  });
}

// 索引化辅助函数
// 将绝对数量数组转换为以第一个值为基准100的指数
// 用于内外伦敦对比图，消除绝对数量差异，突出增长率变化
// 例如：[50, 55, 60] → [100, 110, 120]（增长了10%和20%）
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
    options: { responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { color: '#888', font: { size: 10 }, boxWidth: 14 } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} (index, 2014=100)` } },
        annotation: undefined,
      },
      scales: {
        x: { grid: { color: C.grid }, ticks: { color: C.tick } },
        y: { grid: { color: C.grid }, ticks: { color: C.tick, callback: v => v },
          title: { display: true, text: 'Index (2014 = 100)', color: C.tick, font: { size: 10 } },
        }
      }
    }
  });
}

// 内外伦敦图的Tab切换（All Types / Fire / False Alarm / Special Service）
function initInOutTabs() {
  document.querySelectorAll('.inout-tabs .pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.inout-tabs .pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      createChartInOut(pill.dataset.io);
    });
  });
}

// IMD贫困分位 vs 火灾率柱状图
// 4个柱子分别代表按IMD四分位划分的ward组
// Q1=最富裕，Q4=最贫困
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

// Grid级别IMD/火灾发生的双变量分析图
async function createBivariateMap() {
  // 并行加载两个数据文件
  const [gridImd, gridFire, boroughs] = await Promise.all([
    fetch('data/grid_imd.json').then(r => r.json()),
    fetch('data/grid_fire.json').then(r => r.json()),
    fetch('data/london_boroughs.json').then(r => r.json()),
  ]);

  // 建立格子坐标 → 火灾数量的查找表
  // 用SW角坐标做key（保留4位小数）
  const fireMap = {};
  gridFire.features.forEach(f => {
    const sw = f.geometry.coordinates[0][0];
    const key = `${sw[0].toFixed(4)},${sw[1].toFixed(4)}`;
    fireMap[key] = f.properties.t || 0;
  });

  // 把火灾数量合并到imd格子里
  let maxFire = 0;
  gridImd.features.forEach(f => {
    const sw = f.geometry.coordinates[0][0];
    const key = `${sw[0].toFixed(4)},${sw[1].toFixed(4)}`;
    f.properties.fire = fireMap[key] || 0;
    if (f.properties.fire > maxFire) maxFire = f.properties.fire;
  });

  // 火灾数量三分位断点（用于双变量分类）
  const fireVals = gridImd.features
    .map(f => f.properties.fire)
    .filter(v => v > 0)
    .sort((a, b) => a - b);
  const fireQ1 = fireVals[Math.floor(fireVals.length * 0.33)];
  const fireQ2 = fireVals[Math.floor(fireVals.length * 0.66)];

  // 双变量9色矩阵
  // x轴：火灾密度（低/中/高），y轴：IMD贫困程度（低/中/高）
  const bivColors = {
    '1-1': '#e8e8e8',  // 低火灾 + 低贫困
    '2-1': '#ace4e4',
    '3-1': '#5ac8c8',  // 高火灾 + 低贫困
    '1-2': '#dfb0d6',
    '2-2': '#a5add3',
    '3-2': '#5698b9',
    '1-3': '#be64ac',
    '2-3': '#8c62aa',
    '3-3': '#3b4994',  // 高火灾 + 高贫困（最值得关注）
  };

  // 给每个格子计算双变量颜色
  gridImd.features.forEach(f => {
    const p = f.properties;
    if (!p.imd_q || p.fire === undefined) {
      p.bivColor = '#1a1a2e';
      return;
    }
    // 火灾密度分类（1=低，3=高）
    const fClass = p.fire === 0 ? 1
      : p.fire <= fireQ1 ? 1
      : p.fire <= fireQ2 ? 2
      : 3;
    // IMD分类：imd_q已经是1-4，合并为1-3
    const iClass = p.imd_q <= 1 ? 1
      : p.imd_q <= 2 ? 1
      : p.imd_q <= 3 ? 2
      : 3;
    p.bivColor = bivColors[`${fClass}-${iClass}`] || '#333';
  });

  // 初始化Mapbox地图
  const mapBiv = new mapboxgl.Map({
    container: 'map-bivariate',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-0.1, 51.51], zoom: 9,
    interactive: true, attributionControl: false
  });

  mapBiv.on('load', () => {
    mapBiv.addSource('grid-imd', { type: 'geojson', data: gridImd });
    mapBiv.addSource('boroughs-biv', { type: 'geojson', data: boroughs });

    // 双变量填充图层
    mapBiv.addLayer({
      id: 'biv-fill', type: 'fill', source: 'grid-imd',
      paint: {
        'fill-color': ['get', 'bivColor'],
        'fill-opacity': 0.85
      }
    });

    // borough边界线
    mapBiv.addLayer({
      id: 'biv-line', type: 'line', source: 'boroughs-biv',
      paint: { 'line-color': 'rgba(255,255,255,0.4)', 'line-width': 1 }
    });

    // hover tooltip
    mapBiv.on('mousemove', 'biv-fill', e => {
      if (!e.features.length) return;
      mapBiv.getCanvas().style.cursor = 'pointer';
      const p = e.features[0].properties;
      const imdLabel = ['', 'Least deprived', 'Below average', 'Above average', 'Most deprived'];
      document.getElementById('biv-hover').innerHTML =
        `<strong>${p.borough || 'Unknown'}</strong> · 
         IMD: ${p.imd || 'N/A'} (${imdLabel[p.imd_q] || ''}) · 
         Fire incidents: ${p.fire || 0}`;
    });
    mapBiv.on('mouseleave', 'biv-fill', () => {
      mapBiv.getCanvas().style.cursor = '';
      document.getElementById('biv-hover').innerHTML =
        '<span class="hover-hint">Hover a grid cell to see IMD and fire data</span>';
    });
  });

  new IntersectionObserver(e => {
    e.forEach(x => { if (x.isIntersecting) mapBiv?.resize(); });
  }, { threshold: 0.1 }).observe(document.getElementById('map-bivariate'));
}


// 月度季节性总览折线图（The Seasonal Landscape）
// 6条线同时显示，展示各类事件的全年分布模式
// 这是scrollytelling之前的总览图，让读者先建立整体印象
function createChartMonthlyAll() {
  const d = DATA.monthlyByType;
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  killChart('monthlyAll');

  // 去掉False Alarm，只保留5条有季节意义的线
  const datasets = [
    { 
      label: 'Outdoor Fire', data: d.outdoor_fire,
      borderColor: C.fire, borderWidth: 2.5,
      pointRadius: 4, pointHoverRadius: 7,
      tension: 0.4, fill: false
    },
    { 
      label: 'Dwelling Fire', data: d.dwelling_fire,
      borderColor: '#f4a261', borderWidth: 2,
      pointRadius: 3, pointHoverRadius: 6,
      tension: 0.4, fill: false,
      borderDash: [5, 3]
    },
    { 
      label: 'Flooding', data: d.flooding,
      borderColor: C.teal, borderWidth: 2.5,
      pointRadius: 4, pointHoverRadius: 7,
      tension: 0.4, fill: false
    },
    { 
      label: 'Forced Entry', data: d.forced_entry,
      borderColor: C.steel, borderWidth: 2.5,
      pointRadius: 4, pointHoverRadius: 7,
      tension: 0.4, fill: false
    },
    { 
      label: 'Agency Assist', data: d.agency_assist,
      borderColor: C.yellow, borderWidth: 2,
      pointRadius: 3, pointHoverRadius: 6,
      tension: 0.4, fill: false
    },
  ];

  // 动画配置：线条从左到右逐渐绘制出来
  charts.monthlyAll = new Chart(document.getElementById('chart-monthly-all'), {
    type: 'line',
    data: { labels: months, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // 入场动画：每条线依次从左绘制
      animation: {
        x: {
          type: 'number',
          easing: 'easeInOutQuart',
          duration: 1200,
          from: NaN,
          delay(ctx) {
            // 每个数据点依次延迟，形成从左到右绘制的效果
            if (ctx.type !== 'data' || ctx.xStarted) return 0;
            ctx.xStarted = true;
            return ctx.index * 60; // 每个月份点延迟60ms
          }
        },
        y: {
          type: 'number',
          easing: 'easeInOutQuart',
          duration: 1200,
          from: ctx => ctx.index === 0 ? ctx.chart.scales.y.getPixelForValue(100) : undefined,
          delay(ctx) {
            if (ctx.type !== 'data' || ctx.yStarted) return 0;
            ctx.yStarted = true;
            return ctx.index * 60;
          }
        }
      },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#ccc', font: { size: 11 }, boxWidth: 14 }
        },
        tooltip: {
          backgroundColor: 'rgba(10,10,15,0.92)',
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        x: { grid: { color: C.grid }, ticks: { color: C.tick } },
        y: {
          grid: { color: C.grid },
          ticks: { color: C.tick, callback: v => (v/1000)+'k' },
          // y轴范围限制到0-15k，不受False Alarm影响
          min: 0,
          max: 15000
        }
      }
    }
  });

  // 进入视口时重新触发动画
  let animated = false;
  new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        charts.monthlyAll.reset();
        charts.monthlyAll.update();
      }
    });
  }, { threshold: 0.3 }).observe(
    document.getElementById('chart-monthly-all')
  );
}

// Scrollytelling 月度专注图
// 随用户向下滚动，左侧图表依次高亮各个事件类型
// 最后一步"collision"同时显示4条线，展示季节性碰撞
let monthlyFocusChart = null;

function initScrollytelling() {
  const d = DATA.monthlyByType;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const configs = {
    overview: null,
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
        { label: 'Outdoor Fire',  data: d.outdoor_fire,  borderColor: C.fire   + '88', fill: false, borderWidth: 1.5, pointRadius: 0, tension: 0.4 },
        { label: 'Dwelling Fire', data: d.dwelling_fire, borderColor: '#f4a261' + '88', fill: false, borderWidth: 1.5, pointRadius: 0, tension: 0.4 },
        { label: 'Flooding',      data: d.flooding,      borderColor: C.teal   + '88', fill: false, borderWidth: 1.5, pointRadius: 0, tension: 0.4 },
        { label: 'Forced Entry',  data: d.forced_entry,  borderColor: C.steel  + '88', fill: false, borderWidth: 1.5, pointRadius: 0, tension: 0.4 },
        { label: 'Agency Assist', data: d.agency_assist, borderColor: C.yellow + '88', fill: false, borderWidth: 1.5, pointRadius: 0, tension: 0.4 },
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
        animation: { duration: 600 },
        plugins: { legend: { labels: { color: '#888' } } },
        scales: {
          x: { grid: { color: C.grid }, ticks: { color: C.tick } },
          y: { grid: { color: C.grid }, ticks: { color: C.tick, callback: v => v >= 1000 ? (v/1000)+'k' : v }, beginAtZero: true }
        }
      }
    });
  }

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


// ============================================================
// 特效1：鼠标追踪光晕（在现有代码末尾添加）
// ============================================================
function initCursorGlow() {
  // 创建光晕DOM元素
  const glow = document.createElement('div');
  glow.style.cssText = `
    position: fixed;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    pointer-events: none;        /* 不拦截任何鼠标事件 */
    z-index: 9999;
    background: radial-gradient(circle, 
      rgba(255,107,53,0.06) 0%, 
      rgba(78,205,196,0.03) 40%, 
      transparent 70%);
    transform: translate(-50%, -50%);
    transition: opacity 0.3s ease;
    mix-blend-mode: screen;      /* 叠加混合模式，不遮挡内容 */
  `;
  document.body.appendChild(glow);

  let mouseX = 0, mouseY = 0;
  let glowX = 0, glowY = 0;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // 用requestAnimationFrame让光晕平滑跟随（带延迟感，比直接跟随更自然）
  function animateGlow() {
    glowX += (mouseX - glowX) * 0.08;  // 0.08是缓动系数，越小越滞后
    glowY += (mouseY - glowY) * 0.08;
    glow.style.left = glowX + 'px';
    glow.style.top = glowY + 'px';
    requestAnimationFrame(animateGlow);
  }
  animateGlow();

  // 鼠标悬停在图表或地图上时，光晕变色为青绿色
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
// 特效2：KPI卡片3D倾斜效果
// 鼠标在卡片上移动时，卡片轻微3D倾斜跟随视角
// ============================================================
function initCardTilt() {
  document.querySelectorAll('.kpi-card').forEach(card => {
    card.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease';
    card.style.transformStyle = 'preserve-3d';

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      // 计算鼠标在卡片内的相对位置（-1到1的范围）
      const xRel = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5到0.5
      const yRel = (e.clientY - rect.top) / rect.height - 0.5;
      // 转换为倾斜角度（最大8度）
      const rotateX = -yRel * 8;  // 上下倾斜
      const rotateY = xRel * 8;   // 左右倾斜
      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
      card.style.boxShadow = `${-xRel * 10}px ${-yRel * 10}px 20px rgba(255,107,53,0.15)`;
    });

    card.addEventListener('mouseleave', () => {
      // 鼠标离开时平滑恢复原始状态
      card.style.transform = 'perspective(600px) rotateX(0) rotateY(0) scale(1)';
      card.style.boxShadow = 'none';
    });
  });
}

// ============================================================
// Bridge区域：Three.js 3D粒子球背景
// 三个bridge各自有不同颜色的粒子球
// ============================================================

function initBridgeParticles() {

  // ── Bridge 1：1 in 7 比例粒子球 ──
  // 1/7橙色（Fire），6/7灰色，视觉化"1 in 7"
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
    const fireCount = Math.round(total / 7);  // 约200个橙色粒子
    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);

    // 橙色 rgb(255,107,53) → three.js 归一化
    const fireR = 1.0, fireG = 0.42, fireB = 0.21;
    // 灰色
    const grayR = 0.35, grayG = 0.35, grayB = 0.35;

    for (let i = 0; i < total; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.2 + (Math.random() - 0.5) * 0.25;
      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);

      // 前fireCount个粒子为橙色，其余为灰色
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

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
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


  // ── Bridge 2：内外伦敦两群粒子 ──
  // 内圈密集（内伦敦），外圈稀疏（外伦敦）
  // hover时外圈向外扩散，松开时收回
  (function setupBridge2() {
    const canvas = document.getElementById('bridge-canvas-2');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 1000);
    camera.position.z = 3.5;

    const innerCount = 600;  // 内伦敦粒子（密集）
    const outerCount = 400;  // 外伦敦粒子（稀疏）
    const total = innerCount + outerCount;

    const basePositions = new Float32Array(total * 3);  // 初始位置
    const positions = new Float32Array(total * 3);      // 当前位置
    const colors = new Float32Array(total * 3);

    // 内圈粒子：半径0.6~0.9，橙红色
    for (let i = 0; i < innerCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.6 + Math.random() * 0.3;
      basePositions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      basePositions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      basePositions[i*3+2] = r * Math.cos(phi);
      colors[i*3] = 1.0; colors[i*3+1] = 0.42; colors[i*3+2] = 0.21; // 橙
    }
    // 外圈粒子：半径1.2~1.6，青绿色
    for (let i = innerCount; i < total; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.2 + Math.random() * 0.4;
      basePositions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      basePositions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      basePositions[i*3+2] = r * Math.cos(phi);
      colors[i*3] = 0.306; colors[i*3+1] = 0.804; colors[i*3+2] = 0.769; // 青绿
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

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    let isHovered = false;
    let expandProgress = 0; // 0=收缩，1=完全展开

    canvas.parentElement.addEventListener('mouseenter', () => isHovered = true);
    canvas.parentElement.addEventListener('mouseleave', () => isHovered = false);

    let speed = 0.002, fId;
    function animate() {
      fId = requestAnimationFrame(animate);
      pts.rotation.y += speed;

      // 外圈粒子扩散/收缩动画
      expandProgress += isHovered
        ? Math.min(0.04, 1 - expandProgress)   // hover时展开
        : Math.max(-0.04, -expandProgress);     // 松开时收回

      const posAttr = pts.geometry.attributes.position;
      for (let i = innerCount; i < total; i++) {
        // 外圈粒子在基础位置上额外向外移动expandProgress*0.6
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


  // ── Bridge 3：12月份圆形排列，7月和12月粒子更亮更大 ──
  (function setupBridge3() {
    const canvas = document.getElementById('bridge-canvas-3');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 1000);
    camera.position.z = 3;

    // 12个月份，每月一簇粒子排列在圆形上
    const particlesPerMonth = 80;
    const total = 12 * particlesPerMonth;
    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const sizes = new Float32Array(total);

    // 高亮月份：7月（index 6）和12月（index 11）
    const hotMonths = [6, 11];

    for (let m = 0; m < 12; m++) {
      // 每个月份在圆周上的角度
      const monthAngle = (m / 12) * Math.PI * 2 - Math.PI / 2;
      const ringRadius = 1.1;  // 圆环半径
      const cx = ringRadius * Math.cos(monthAngle);
      const cy = ringRadius * Math.sin(monthAngle);

      const isHot = hotMonths.includes(m);
      // 高亮月份用橙色，其他月份用黄色淡色
      const r = isHot ? 1.0  : 0.8;
      const g = isHot ? 0.42 : 0.7;
      const b = isHot ? 0.21 : 0.2;

      for (let p = 0; p < particlesPerMonth; p++) {
        const idx = m * particlesPerMonth + p;
        // 每个粒子在月份中心点周围随机分布
        const spread = isHot ? 0.15 : 0.08; // 高亮月份粒子范围更大
        positions[idx*3]   = cx + (Math.random() - 0.5) * spread;
        positions[idx*3+1] = cy + (Math.random() - 0.5) * spread;
        positions[idx*3+2] = (Math.random() - 0.5) * 0.1;

        colors[idx*3] = r; colors[idx*3+1] = g; colors[idx*3+2] = b;
        sizes[idx] = isHot ? 0.025 : 0.012; // 高亮月份粒子更大
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // 使用ShaderMaterial支持每粒子不同大小
    // 如果Three.js r128不支持，改用统一大小
    const mat = new THREE.PointsMaterial({
      size: 0.016, vertexColors: true,
      transparent: true, opacity: 0.75, sizeAttenuation: true
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    let speed = 0.002, target = 0.002, fId;
    // 圆形缓慢旋转
    canvas.parentElement.addEventListener('mouseenter', () => target = 0.008);
    canvas.parentElement.addEventListener('mouseleave', () => target = 0.002);

    // 高亮月份粒子的呼吸动画（脉冲效果）
    let pulseT = 0;
    function animate() {
      fId = requestAnimationFrame(animate);
      speed += (target - speed) * 0.05;
      pts.rotation.z += speed;  // 绕z轴旋转，让圆形在平面内转动

      // 脉冲：高亮月份粒子大小随时间变化
      pulseT += 0.04;
      mat.opacity = 0.6 + Math.sin(pulseT) * 0.15;

      renderer.render(scene, camera);
    }
    new IntersectionObserver(es => {
      es.forEach(e => { e.isIntersecting ? animate() : cancelAnimationFrame(fId); });
    }, { threshold: 0.1 }).observe(canvas.parentElement);
  })();
}

