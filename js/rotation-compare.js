/* DailyVet — Field Shift Rotation Decision Engine
   Compare multi-season crop/forage sequences with NASA POWER / MODIS / SoilGrids
   + farmer priorities + uncertainty + printable plan.
   Aligns with: compare rotations, trade-offs, risk, uncertainty visible. */
(function () {
'use strict';

const _el = id => document.getElementById(id);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const round = n => Math.round(n);

function districtOptionsHtml() {
  const list = window.BD_DISTRICTS_LIST || {};
  const keys = Object.keys(list).sort((a, b) => (list[a].name || a).localeCompare(list[b].name || b));
  return keys.map(k => {
    const d = list[k];
    return `<option value="${k}">${d.name || k} (${d.division || ''})</option>`;
  }).join('');
}

function cropOptionsHtml() {
  const CK = window.CropKnowledge;
  if (!CK) return '<option value="napier">Napier Grass</option>';
  return CK.listCrops('all').map(c =>
    `<option value="${c.key}">${c.emoji} ${c.name} (${c.group})</option>`
  ).join('');
}

function getCoords(districtKey) {
  const list = window.BD_DISTRICTS_LIST || {};
  const d = list[districtKey];
  if (d && Number.isFinite(d.lat) && Number.isFinite(d.lng)) {
    return { lat: d.lat, lng: d.lng, name: d.name, division: d.division };
  }
  return { lat: 23.8103, lng: 90.4125, name: 'Dhaka', division: 'Dhaka' };
}

function getCrop(key) {
  const CK = window.CropKnowledge;
  if (CK && CK.getCrop(key)) return CK.getCrop(key);
  return {
    key, name: key, emoji: '🌱', group: 'crop', durationDays: 100,
    waterNeed: 50, droughtTol: 40, floodTol: 40, soilBuild: 40,
    feedValue: 40, incomeIdx: 50, plantingWindow: [1, 2, 3],
    nutrients: '', residue: '', why: '', sources: []
  };
}

async function loadLiveContext(districtKey) {
  const coords = getCoords(districtKey);
  const evidence = [];
  const ts = new Date().toISOString();
  let power = null, ndvi = null, soil = null, grass = null;

  await Promise.all([
    (window.NasaPower && NasaPower.getPowerData)
      ? NasaPower.getPowerData(coords.lat, coords.lng, 14).then(p => { power = p; }).catch(e => evidence.push({ ok: false, src: 'NASA POWER', err: String(e.message || e) }))
      : Promise.resolve(),
    (window.NasaModisNdvi && NasaModisNdvi.getNDVI)
      ? NasaModisNdvi.getNDVI(districtKey).then(n => { ndvi = n; }).catch(e => evidence.push({ ok: false, src: 'MODIS NDVI', err: String(e.message || e) }))
      : Promise.resolve(),
    (window.NasaSoilGrids && NasaSoilGrids.getSoilData)
      ? NasaSoilGrids.getSoilData(districtKey).then(s => { soil = s; }).catch(e => evidence.push({ ok: false, src: 'SoilGrids', err: String(e.message || e) }))
      : Promise.resolve(),
    (window.GrassHealthScore && GrassHealthScore.computeGrassHealthScore)
      ? GrassHealthScore.computeGrassHealthScore(districtKey).then(g => { grass = g; }).catch(() => {})
      : Promise.resolve()
  ]);

  const gwettop = power && NasaPower.getLatest ? (NasaPower.getLatest(power, 'GWETTOP') || {}).value : null;
  const t2m = power && NasaPower.getLatest ? (NasaPower.getLatest(power, 'T2M') || {}).value : null;
  const precip = power && NasaPower.getLatest ? (NasaPower.getLatest(power, 'PRECTOTCORR') || {}).value : null;
  const soilCls = window.NasaClimate && NasaClimate.classifySoilMoisture
    ? NasaClimate.classifySoilMoisture(gwettop) : { level: 'unknown', label: 'Unknown' };
  const region = window.NasaClimate && NasaClimate.getRegionProfile
    ? NasaClimate.getRegionProfile(districtKey) : null;

  let sourcesOk = 0;
  if (gwettop != null) {
    sourcesOk++;
    evidence.push({
      ok: true, src: 'NASA POWER', param: 'GWETTOP (surface soil moisture)',
      value: (gwettop * 100).toFixed(1) + '%', unit: '0–1 fraction', date: ts,
      loc: `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`,
      link: 'https://power.larc.nasa.gov/',
      note: 'Model/reanalysis agroclimatology — not a field sensor'
    });
  }
  if (precip != null) {
    sourcesOk++;
    evidence.push({
      ok: true, src: 'NASA POWER', param: 'PRECTOTCORR',
      value: Number(precip).toFixed(2) + ' mm/day', unit: 'mm/day', date: ts,
      loc: `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`,
      link: 'https://power.larc.nasa.gov/'
    });
  }
  if (t2m != null) {
    sourcesOk++;
    evidence.push({
      ok: true, src: 'NASA POWER', param: 'T2M',
      value: Number(t2m).toFixed(1) + ' °C', unit: '°C', date: ts,
      loc: `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`,
      link: 'https://power.larc.nasa.gov/'
    });
  }
  if (ndvi && ndvi.available) {
    sourcesOk++;
    evidence.push({
      ok: true, src: 'NASA MODIS NDVI', param: 'NDVI',
      value: String(ndvi.ndvi), unit: 'index', date: ndvi.date || ts,
      loc: districtKey, link: 'https://modis.gsfc.nasa.gov/',
      note: 'Vegetation greenness proxy — not crop yield'
    });
  }
  if (soil && soil.available) {
    sourcesOk++;
    evidence.push({
      ok: true, src: 'SoilGrids / ISRIC', param: 'N · pH · SOC',
      value: `N ${soil.nitrogen_gkg ?? '—'} g/kg · pH ${soil.ph ?? '—'} · SOC ${soil.soc_gkg ?? '—'}`,
      unit: 'g/kg', date: ts, loc: districtKey, link: 'https://soilgrids.org/',
      note: 'Modeled soil grids — coarse vs farm plot'
    });
  }

  const confidence = sourcesOk >= 4 ? 82 : sourcesOk >= 3 ? 70 : sourcesOk >= 2 ? 55 : sourcesOk >= 1 ? 40 : 22;

  return {
    districtKey, coords, power, ndvi, soil, grass,
    gwettop, t2m, precip, soilCls, region,
    grassHealth: grass && grass.available ? grass.score : null,
    confidence, sourcesOk, evidence, fetchedAt: ts
  };
}

/** Build 3 multi-season sequences from current crop + mode */
function buildStrategies(prefs) {
  const cur = prefs.currentCrop || 'napier';
  const CK = window.CropKnowledge;
  const all = CK ? CK.listCrops('all').map(c => c.key) : ['napier', 'para', 'german'];

  // Alternatives: prefer legume / different group when available
  let altA = 'lentil', altB = 'maize';
  if (prefs.mode === 'forage') {
    const forages = ['napier', 'para', 'german'].filter(k => k !== cur);
    altA = forages[0] || 'para';
    altB = forages[1] || 'german';
  } else {
    const others = all.filter(k => k !== cur);
    // soil-building alt
    altA = others.find(k => (getCrop(k).group === 'legume')) || others[0] || 'lentil';
    // feed/income alt
    altB = others.find(k => k !== altA && (getCrop(k).feedValue >= 70 || getCrop(k).group === 'cereal')) || others[1] || 'maize';
  }

  const label = seq => seq.map(k => getCrop(k).name).join(' → ');

  return [
    {
      id: 'S1', title: 'Strategy 1 · Current path', tag: 'Baseline',
      sequence: [cur, cur, cur], isBaseline: true,
      label: label([cur, cur, cur])
    },
    {
      id: 'S2', title: 'Strategy 2 · Diversify A', tag: 'Alternative A',
      sequence: [cur, altA, cur], isBaseline: false,
      label: label([cur, altA, cur])
    },
    {
      id: 'S3', title: 'Strategy 3 · Diversify B', tag: 'Alternative B',
      sequence: [cur, altB, getCrop(altA).group === 'legume' ? altA : cur],
      isBaseline: false,
      label: label([cur, altB, getCrop(altA).group === 'legume' ? altA : cur])
    }
  ];
}

function scoreStrategy(strat, ctx, prefs, whatIf) {
  const moisture = Number.isFinite(ctx.gwettop) ? ctx.gwettop : 0.4;
  const rainFactor = 1 + (whatIf.rainPct || 0) / 100 * 0.35;
  const heatPenalty = (whatIf.tempC || 0) * 3;
  const effMoisture = clamp(moisture * rainFactor, 0, 1);
  const seq = strat.sequence.map(getCrop);
  const avg = fn => seq.reduce((s, c) => s + fn(c), 0) / seq.length;

  const moistureSuit = avg(c => {
    const need = c.waterNeed / 100;
    return clamp(100 - Math.abs(effMoisture - need) * 140, 5, 100);
  });

  const waterAccess = prefs.waterAccess;
  const waterScore = avg(c => {
    if (waterAccess === 'scarce') return clamp(100 - c.waterNeed * 0.9, 10, 100);
    if (waterAccess === 'abundant') return clamp(35 + c.waterNeed * 0.55, 20, 100);
    return clamp(100 - Math.abs(c.waterNeed - 55) * 0.7, 20, 100);
  });

  const CK = window.CropKnowledge;
  const compatPen = CK ? CK.compatibilityPenalty(strat.sequence) : 0;
  const soilHealth = clamp(avg(c => c.soilBuild) + (new Set(strat.sequence).size > 1 ? 18 : 0) - compatPen, 10, 100);

  let yieldIdx = avg(c => (prefs.goal === 'feed' ? c.feedValue : prefs.goal === 'income' ? c.incomeIdx : (c.feedValue + c.incomeIdx) / 2));
  yieldIdx = clamp(yieldIdx - heatPenalty * 0.35 + (effMoisture > 0.25 && effMoisture < 0.75 ? 4 : -2), 15, 100);

  const floodRiskEnv = (ctx.region && ctx.region.type === 'flood') || (ctx.soilCls && ctx.soilCls.level === 'wet');
  const droughtRiskEnv = (ctx.region && ctx.region.type === 'drought') || (ctx.soilCls && (ctx.soilCls.level === 'drought' || ctx.soilCls.level === 'dry'));
  let climateSafety = avg(c => {
    if (floodRiskEnv) return c.floodTol;
    if (droughtRiskEnv) return c.droughtTol;
    return (c.floodTol + c.droughtTol) / 2;
  });
  climateSafety = clamp(climateSafety - heatPenalty * 0.45, 10, 100);

  let wMoist = 0.18, wSoil = 0.22, wWater = 0.2, wYield = 0.2, wRisk = 0.2;
  if (prefs.priority === 'soil') { wSoil = 0.35; wMoist = 0.15; wWater = 0.15; wYield = 0.15; wRisk = 0.2; }
  if (prefs.priority === 'water') { wWater = 0.35; wMoist = 0.15; wSoil = 0.15; wYield = 0.15; wRisk = 0.2; }
  if (prefs.priority === 'yield') { wYield = 0.35; wMoist = 0.15; wSoil = 0.15; wWater = 0.15; wRisk = 0.2; }
  if (prefs.priority === 'risk') { wRisk = 0.35; wMoist = 0.15; wSoil = 0.15; wWater = 0.15; wYield = 0.2; }

  let overall = moistureSuit * wMoist + waterScore * wWater + soilHealth * wSoil + yieldIdx * wYield + climateSafety * wRisk;
  if (Number.isFinite(ctx.grassHealth) && seq.some(c => c.group === 'forage')) {
    overall = overall * 0.88 + ctx.grassHealth * 0.12;
  }

  const benefits = [];
  const limits = [];
  if (new Set(strat.sequence).size > 1) benefits.push('Sequence diversity can reduce continuous monoculture pressure');
  else limits.push('Same crop repeated — limited soil recovery between seasons');
  if (seq.some(c => c.group === 'legume')) benefits.push('Includes legume phase for soil nitrogen / structure support');
  if (floodRiskEnv && avg(c => c.floodTol) > 65) benefits.push('Better alignment with wet / flood-prone regional signal');
  if (droughtRiskEnv && avg(c => c.droughtTol) > 65) benefits.push('Better alignment with dry / drought regional signal');
  if (waterAccess === 'scarce' && avg(c => c.waterNeed) > 70) limits.push('High water-demand crops under scarce water access');
  if (ctx.soilCls && ctx.soilCls.level === 'drought') limits.push('Live NASA soil moisture indicates dry stress');
  if (ctx.soilCls && ctx.soilCls.level === 'wet') limits.push('Live NASA soil moisture high — drainage / waterlogging risk');
  seq.forEach(c => { if (c.why && strat.isBaseline) limits.push(c.why); });

  return {
    moistureSuit: round(moistureSuit),
    waterScore: round(waterScore),
    soilHealth: round(soilHealth),
    yieldIdx: round(yieldIdx),
    climateSafety: round(climateSafety),
    overall: round(clamp(overall, 5, 98)),
    benefits: benefits.slice(0, 3),
    limits: limits.slice(0, 3)
  };
}

function renderLiveMetrics(ctx) {
  const box = _el('rcLiveMetrics');
  if (!box) return;
  const m = ctx.gwettop != null ? (ctx.gwettop * 100).toFixed(0) + '%' : '—';
  const nd = ctx.ndvi && ctx.ndvi.available ? Number(ctx.ndvi.ndvi).toFixed(2) : '—';
  const t = ctx.t2m != null ? Number(ctx.t2m).toFixed(1) + '°C' : '—';
  const p = ctx.precip != null ? Number(ctx.precip).toFixed(1) + ' mm' : '—';
  const soilLine = ctx.soil && ctx.soil.available
    ? `pH ${ctx.soil.ph ?? '—'} · SOC ${ctx.soil.soc_gkg ?? '—'} · N ${ctx.soil.nitrogen_gkg ?? '—'}`
    : 'SoilGrids pending / unavailable';
  box.innerHTML = `
    <div class="rc-metric"><div class="k">Soil moisture</div><div class="v">${m}</div><div class="s">NASA POWER GWETTOP · ${ctx.soilCls.label || ''}</div></div>
    <div class="rc-metric"><div class="k">NDVI</div><div class="v">${nd}</div><div class="s">MODIS vegetation proxy</div></div>
    <div class="rc-metric"><div class="k">Temp / rain</div><div class="v">${t}</div><div class="s">${p}/day · POWER</div></div>
    <div class="rc-metric"><div class="k">Soil grids</div><div class="v" style="font-size:0.85rem">${soilLine}</div><div class="s">Modeled — not plot sensor</div></div>
  `;
}

function barRow(label, val) {
  const v = clamp(val, 0, 100);
  return `<div class="rc-bar-row"><span class="label">${label}</span><div class="rc-bar"><i style="width:${v}%"></i></div><span class="num">${v}</span></div>`;
}

function renderStrategies(strats, scores) {
  const root = _el('rcStrategies');
  if (!root) return;
  const best = Math.max(...scores.map(s => s.overall));
  root.innerHTML = strats.map((st, i) => {
    const sc = scores[i];
    const top = sc.overall === best;
    const chips = st.sequence.map(k => {
      const c = getCrop(k);
      return `<span class="rc-crop-chip">${c.emoji} ${c.name}</span>`;
    }).join('<span class="rc-arrow">→</span>');
    return `<article class="rc-strat ${top ? 'rc-top' : ''}">
      <span class="rc-strat-tag">${st.tag}${top ? ' · fits priority' : ''}</span>
      <h3>${st.title}</h3>
      <div class="rc-seq">${chips}</div>
      ${barRow('Moisture fit', sc.moistureSuit)}
      ${barRow('Water pressure', sc.waterScore)}
      ${barRow('Soil health', sc.soilHealth)}
      ${barRow('Goal fit', sc.yieldIdx)}
      ${barRow('Climate safety', sc.climateSafety)}
      <div class="rc-score">${sc.overall}<small>priority-weighted score (relative)</small></div>
      ${sc.benefits.length ? `<ul class="rc-list good">${sc.benefits.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
      ${sc.limits.length ? `<ul class="rc-list warn">${sc.limits.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
    </article>`;
  }).join('');
}

function renderEvidence(ctx) {
  const box = _el('rcEvidence');
  if (!box) return;
  const rows = (ctx.evidence || []).filter(e => e.ok).map(e => `
    <tr>
      <th>${e.src}</th>
      <td><strong>${e.param}</strong><br>${e.value || '—'} · ${e.date ? String(e.date).slice(0, 10) : ''} · ${e.loc || ''}
      ${e.note ? `<br><em style="color:#64748b">${e.note}</em>` : ''}<br>
      <a href="${e.link}" target="_blank" rel="noopener">source</a></td>
    </tr>`).join('');
  box.innerHTML = `
    <p>Decision support for <strong>${ctx.coords.name}</strong> (${ctx.districtKey}). Scores are relative indices — not yield forecasts.</p>
    <table>${rows || '<tr><td>No live layers succeeded — library + moisture fallback 0.40 used.</td></tr>'}</table>
    <div class="rc-uncert">
      <span class="rc-chip">Data confidence: <strong>${ctx.confidence}%</strong> (${ctx.sourcesOk} live layers)</span>
      <span class="rc-chip">Soil class: <strong>${(ctx.soilCls && ctx.soilCls.label) || 'Unknown'}</strong></span>
      ${ctx.region ? `<span class="rc-chip">Region: <strong>${ctx.region.regionBn || ctx.region.type}</strong></span>` : ''}
    </div>
    <div class="rc-disclaimer">
      <strong>Uncertainty & limits:</strong> NASA POWER / MODIS / SoilGrids differ in scale and type (observation vs model/reanalysis).
      Sequences are illustrative Field Shift exploration — not agronomist prescriptions. Confirm with local DAE / livestock officer before field action.
    </div>`;
}

function renderCropLibrary() {
  const box = _el('rcCropLibrary');
  if (!box || !window.CropKnowledge) return;
  const crops = window.CropKnowledge.listCrops('all');
  box.innerHTML = crops.map(c => {
    const src = window.CropKnowledge.sourceList(c.sources).map(s => s.id).join(', ');
    return `<div class="rc-lib-item">
      <strong>${c.emoji} ${c.name}</strong>
      <span class="rc-lib-meta">${c.durationDays}d · water ${c.waterNeed} · soil+ ${c.soilBuild}</span>
      <span class="rc-lib-why">${c.why}</span>
      <span class="rc-lib-src">Sources: ${src || '—'}</span>
    </div>`;
  }).join('');
}

function buildPrintPlan(strats, scores, prefs, ctx) {
  const ranked = strats.map((s, i) => ({ s, sc: scores[i] })).sort((a, b) => b.sc.overall - a.sc.overall);
  const top = ranked[0];
  const lines = top.s.sequence.map((k, i) => {
    const c = getCrop(k);
    return `<li><strong>Season ${i + 1}:</strong> ${c.emoji} ${c.name} — ~${c.durationDays} days · water index ${c.waterNeed} · ${c.nutrients || c.why}</li>`;
  }).join('');
  return `
    <div class="rc-print-inner">
      <h3>Seasonal exploration plan</h3>
      <p><strong>Location:</strong> ${ctx.coords.name} (${ctx.districtKey}) · <strong>Land:</strong> ${prefs.landSize || '—'} · <strong>Goal:</strong> ${prefs.goal}</p>
      <p><strong>Priority-weighted top sequence</strong> (relative score ${top.sc.overall}/100 · data confidence ${ctx.confidence}%):</p>
      <p class="rc-seq">${top.s.label}</p>
      <ol>${lines}</ol>
      <p><strong>Trade-offs:</strong> moisture fit ${top.sc.moistureSuit}, water ${top.sc.waterScore}, soil ${top.sc.soilHealth}, climate safety ${top.sc.climateSafety}</p>
      <p><strong>Monitoring:</strong> re-check NASA POWER soil moisture & local rainfall before each season; watch waterlogging/drought signals.</p>
      <p class="rc-disclaimer">Not a certified agronomic prescription. Validate with local extension / livestock officer. Generated ${new Date().toLocaleString()}.</p>
    </div>`;
}

function getPrefs() {
  return {
    district: (_el('rcDistrict') || {}).value || 'dhaka',
    currentCrop: (_el('rcCrop') || {}).value || 'napier',
    mode: (_el('rcMode') || {}).value || 'mixed',
    soilType: (_el('rcSoilType') || {}).value || 'loam',
    waterAccess: (_el('rcWater') || {}).value || 'moderate',
    goal: (_el('rcGoal') || {}).value || 'balanced',
    landSize: (_el('rcLand') || {}).value || '',
    riskTolerance: (_el('rcRisk') || {}).value || 'medium',
    priority: (document.querySelector('input[name="rcPriority"]:checked') || {}).value || 'balanced'
  };
}

function getWhatIf() {
  return {
    tempC: Number((_el('rcWhatTemp') || {}).value || 0),
    rainPct: Number((_el('rcWhatRain') || {}).value || 0)
  };
}

let _lastCtx = null, _lastStrats = null, _lastPrefs = null, _lastScores = null;

async function runComparison() {
  const btn = _el('rcRunBtn');
  const prefs = getPrefs();
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading NASA data…'; }
  _el('rcResults') && _el('rcResults').classList.remove('rc-hidden');
  if (_el('rcLiveMetrics')) _el('rcLiveMetrics').innerHTML = '<div class="rc-loading">Fetching NASA POWER · MODIS · SoilGrids…</div>';

  try {
    const ctx = await loadLiveContext(prefs.district);
    _lastCtx = ctx;
    _lastPrefs = prefs;
    renderLiveMetrics(ctx);
    const whatIf = getWhatIf();
    const strats = buildStrategies(prefs);
    _lastStrats = strats;
    const scores = strats.map(s => scoreStrategy(s, ctx, prefs, whatIf));
    _lastScores = scores;
    renderStrategies(strats, scores);
    renderEvidence(ctx);
    if (_el('rcPrintPlan')) _el('rcPrintPlan').innerHTML = buildPrintPlan(strats, scores, prefs, ctx);
    updateWhatIfLabels();
  } catch (err) {
    console.error('[RotationCompare]', err);
    if (_el('rcLiveMetrics')) _el('rcLiveMetrics').innerHTML = `<div class="rc-loading">Error: ${String(err.message || err)}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-scale-balanced"></i> Compare rotations'; }
  }
}

function rescoreWhatIf() {
  if (!_lastCtx || !_lastStrats || !_lastPrefs) return;
  const whatIf = getWhatIf();
  const scores = _lastStrats.map(s => scoreStrategy(s, _lastCtx, _lastPrefs, whatIf));
  _lastScores = scores;
  renderStrategies(_lastStrats, scores);
  if (_el('rcPrintPlan')) _el('rcPrintPlan').innerHTML = buildPrintPlan(_lastStrats, scores, _lastPrefs, _lastCtx);
  updateWhatIfLabels();
}

function updateWhatIfLabels() {
  const t = _el('rcWhatTemp'), r = _el('rcWhatRain');
  if (_el('rcWhatTempVal') && t) _el('rcWhatTempVal').textContent = (Number(t.value) >= 0 ? '+' : '') + t.value + '°C';
  if (_el('rcWhatRainVal') && r) _el('rcWhatRainVal').textContent = (Number(r.value) >= 0 ? '+' : '') + r.value + '%';
}

function printPlan() {
  const plan = _el('rcPrintPlan');
  if (!plan || !plan.innerHTML.trim()) {
    alert('Run comparison first to generate a plan.');
    return;
  }
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>DailyVet Seasonal Plan</title>
    <style>body{font-family:Inter,system-ui,sans-serif;padding:24px;color:#0f172a;line-height:1.5}
    h3{margin-top:0}.rc-seq{background:#F0FDFA;padding:8px 12px;border-radius:8px;font-weight:700}
    .rc-disclaimer{background:#FFFBEB;border:1px solid #FDE68A;padding:10px;border-radius:8px;font-size:13px;color:#92400e}</style>
    </head><body>${plan.innerHTML}<script>window.print()<\\/script></body></html>`);
  w.document.close();
}

function init() {
  const sel = _el('rcDistrict');
  if (sel && !sel.options.length) {
    sel.innerHTML = districtOptionsHtml();
    if ([...sel.options].some(o => o.value === 'mymensingh')) sel.value = 'mymensingh';
    else if ([...sel.options].some(o => o.value === 'dhaka')) sel.value = 'dhaka';
  }
  const crop = _el('rcCrop');
  if (crop) crop.innerHTML = cropOptionsHtml();
  renderCropLibrary();
  const btn = _el('rcRunBtn');
  if (btn) btn.addEventListener('click', runComparison);
  const pb = _el('rcPrintBtn');
  if (pb) pb.addEventListener('click', printPlan);
  ['rcWhatTemp', 'rcWhatRain'].forEach(id => {
    const el = _el(id);
    if (el) el.addEventListener('input', () => { updateWhatIfLabels(); rescoreWhatIf(); });
  });
  updateWhatIfLabels();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

window.RotationCompare = { runComparison, loadLiveContext, buildStrategies, scoreStrategy, printPlan };
})();
