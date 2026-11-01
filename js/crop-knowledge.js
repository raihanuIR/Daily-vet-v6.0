/* DailyVet — Bangladesh crop & forage knowledge base (Field Shift)
   Attributes are comparative planning indices for decision support — not yield guarantees.
   Citations point to public agronomy / extension-style references farmers can verify. */
(function () {
'use strict';

const SOURCES = {
  dae: { id: 'DAE', name: 'Department of Agricultural Extension (Bangladesh)', url: 'https://dae.gov.bd/' },
  brri: { id: 'BRRI', name: 'Bangladesh Rice Research Institute (varietal / rice systems context)', url: 'https://brri.gov.bd/' },
  barc: { id: 'BARC', name: 'Bangladesh Agricultural Research Council', url: 'https://barc.gov.bd/' },
  fao: { id: 'FAO', name: 'FAO crop water / agronomy guidance (general)', url: 'https://www.fao.org/land-water/databases-and-software/crop-information/en/' },
  nasa_power: { id: 'NASA POWER', name: 'NASA POWER agroclimatology', url: 'https://power.larc.nasa.gov/' },
  soilgrids: { id: 'SoilGrids', name: 'ISRIC SoilGrids', url: 'https://soilgrids.org/' },
  local: { id: 'Local practice', name: 'Common BD livestock-forage & smallholder rotation practice (illustrative)', url: '' }
};

/** waterNeed / droughtTol / floodTol / soilBuild: 0–100 comparative indices */
const CROPS = {
  boro_rice: {
    key: 'boro_rice', name: 'Boro Rice', emoji: '🌾', group: 'cereal',
    durationDays: 140, waterNeed: 90, droughtTol: 15, floodTol: 40, soilBuild: 35, feedValue: 20, incomeIdx: 75,
    plantingWindow: [11, 12, 1, 2], seasons: ['Rabi'],
    nutrients: 'High N demand; responds to balanced NPK', residue: 'Straw for feed/bedding',
    why: 'Major rabi cereal under irrigation',
    sources: ['brri', 'dae', 'fao']
  },
  aman_rice: {
    key: 'aman_rice', name: 'Aman Rice', emoji: '🌿', group: 'cereal',
    durationDays: 120, waterNeed: 80, droughtTol: 25, floodTol: 70, soilBuild: 40, feedValue: 20, incomeIdx: 70,
    plantingWindow: [6, 7, 8], seasons: ['Kharif-2'],
    nutrients: 'Moderate–high N; avoid late N on flood-prone fields', residue: 'Straw',
    why: 'Monsoon rice; better flood alignment than boro',
    sources: ['brri', 'dae', 'fao']
  },
  maize: {
    key: 'maize', name: 'Maize (grain/fodder)', emoji: '🌽', group: 'cereal',
    durationDays: 100, waterNeed: 65, droughtTol: 45, floodTol: 25, soilBuild: 40, feedValue: 85, incomeIdx: 72,
    plantingWindow: [10, 11, 12, 1, 2, 3], seasons: ['Rabi', 'Kharif'],
    nutrients: 'High N and K for biomass', residue: 'Stover for fodder',
    why: 'Strong feed + income option for livestock farms',
    sources: ['dae', 'fao', 'local']
  },
  wheat: {
    key: 'wheat', name: 'Wheat', emoji: '🍞', group: 'cereal',
    durationDays: 110, waterNeed: 55, droughtTol: 50, floodTol: 20, soilBuild: 45, feedValue: 30, incomeIdx: 60,
    plantingWindow: [11, 12], seasons: ['Rabi'],
    nutrients: 'Moderate N; residual benefit after legumes', residue: 'Limited residue',
    why: 'Lower water than boro in many rabi settings',
    sources: ['dae', 'fao']
  },
  lentil: {
    key: 'lentil', name: 'Lentil (Masur)', emoji: '🫘', group: 'legume',
    durationDays: 100, waterNeed: 40, droughtTol: 60, floodTol: 15, soilBuild: 85, feedValue: 35, incomeIdx: 65,
    plantingWindow: [10, 11, 12], seasons: ['Rabi'],
    nutrients: 'N-fixing; improves following cereal', residue: 'Residue returns N',
    why: 'Soil-health rotation builder',
    sources: ['dae', 'barc', 'fao']
  },
  mung: {
    key: 'mung', name: 'Mung bean', emoji: '🟢', group: 'legume',
    durationDays: 70, waterNeed: 45, droughtTol: 55, floodTol: 20, soilBuild: 80, feedValue: 30, incomeIdx: 62,
    plantingWindow: [2, 3, 4, 8, 9], seasons: ['Kharif', 'Rabi'],
    nutrients: 'N-fixing short slot', residue: 'Green manure potential',
    why: 'Short-duration soil recovery crop',
    sources: ['dae', 'fao']
  },
  mustard: {
    key: 'mustard', name: 'Mustard', emoji: '🟡', group: 'oilseed',
    durationDays: 90, waterNeed: 45, droughtTol: 55, floodTol: 20, soilBuild: 50, feedValue: 25, incomeIdx: 58,
    plantingWindow: [10, 11], seasons: ['Rabi'],
    nutrients: 'Moderate; fits after aman in many systems', residue: 'Low–moderate',
    why: 'Rabi diversification / oilseed',
    sources: ['dae', 'local']
  },
  potato: {
    key: 'potato', name: 'Potato', emoji: '🥔', group: 'tuber',
    durationDays: 90, waterNeed: 70, droughtTol: 30, floodTol: 15, soilBuild: 35, feedValue: 15, incomeIdx: 80,
    plantingWindow: [11, 12], seasons: ['Rabi'],
    nutrients: 'High K and organic matter response', residue: 'Low',
    why: 'High-value rabi; needs well-drained soil',
    sources: ['dae', 'fao']
  },
  napier: {
    key: 'napier', name: 'Napier Grass', emoji: '🌾', group: 'forage',
    durationDays: 70, waterNeed: 45, droughtTol: 80, floodTol: 30, soilBuild: 35, feedValue: 95, incomeIdx: 55,
    plantingWindow: [1, 2, 3, 4, 5, 6, 10, 11, 12], seasons: ['Year-round'],
    nutrients: 'Responds to N; continuous stand can stress soil structure', residue: 'Perennial biomass',
    why: 'High livestock feed biomass; drought-tolerant relative to wet grasses',
    sources: ['local', 'dae', 'fao']
  },
  para: {
    key: 'para', name: 'Para Grass', emoji: '🍃', group: 'forage',
    durationDays: 60, waterNeed: 75, droughtTol: 25, floodTol: 90, soilBuild: 50, feedValue: 80, incomeIdx: 50,
    plantingWindow: [7, 8, 9, 10], seasons: ['Kharif'],
    nutrients: 'Tolerates wet lowland', residue: 'Perennial cover',
    why: 'Flood-prone lowland forage',
    sources: ['local', 'fao']
  },
  german: {
    key: 'german', name: 'German Grass', emoji: '🌱', group: 'forage',
    durationDays: 55, waterNeed: 70, droughtTol: 30, floodTol: 85, soilBuild: 55, feedValue: 78, incomeIdx: 48,
    plantingWindow: [7, 8, 9, 10], seasons: ['Kharif'],
    nutrients: 'Wet-soil performer', residue: 'Perennial cover',
    why: 'Waterlogged-field forage option',
    sources: ['local', 'fao']
  }
};

/** Simple compatibility: avoid repeating same cereal; prefer legume after heavy cereal */
function compatibilityPenalty(seq) {
  let p = 0;
  for (let i = 1; i < seq.length; i++) {
    const a = CROPS[seq[i - 1]], b = CROPS[seq[i]];
    if (!a || !b) continue;
    if (a.key === b.key && a.group !== 'forage') p += 12;
    if (a.group === 'cereal' && b.group === 'cereal') p += 8;
    if (a.group === 'legume' && b.group === 'cereal') p -= 6;
    if (a.group === 'forage' && b.group === 'forage' && a.key === b.key) p += 5;
  }
  return p;
}

function listCrops(filter) {
  return Object.values(CROPS).filter(c => {
    if (!filter || filter === 'all') return true;
    if (filter === 'forage') return c.group === 'forage';
    if (filter === 'crop') return c.group !== 'forage';
    return c.group === filter;
  });
}

function getCrop(key) { return CROPS[key] || null; }

function sourceList(keys) {
  return (keys || []).map(k => SOURCES[k]).filter(Boolean);
}

window.CropKnowledge = {
  CROPS, SOURCES, listCrops, getCrop, compatibilityPenalty, sourceList
};
})();
