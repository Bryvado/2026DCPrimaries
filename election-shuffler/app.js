const DEMOGRAPHIC_SLIDERS = [
  ["black_share", "Black population", "ACS estimate of residents identifying as Black"],
  ["median_age", "Median age", "ACS median age"],
  ["income", "Median income", "ACS median household income"],
  ["college", "College educated", "ACS share of adults age 25+ with a bachelor's degree or higher"],
  ["renter", "Renter households", "ACS share of occupied homes that are renter-occupied"],
  ["age_25_34", "Age 25-34", "ACS share of residents age 25 to 34"],
  ["transit", "Transit commuters", "ACS share of commuters using public transit"],
  ["density", "Population density", "Residents per square kilometer"],
];

const PRESETS = [
  ["Young renter surge", { renter: 4, age_25_34: 4, median_age: -3 }],
  ["Dense-core swing", { density: 5, transit: 3, college: 2 }],
  ["Income realignment", { income: -4, college: 3, renter: -2 }],
  ["Black population +", { black_share: 5 }],
];

const TERM_GROUPS = {
  zpBlk: "black_share",
  zmedAge: "median_age",
  zmedInc: "income",
  zpCollege: "college",
  zpRenter: "renter",
  zp2534: "age_25_34",
  zpTransit: "transit",
  zdensity: "density",
};

const EXPOSURE_COLUMNS = {
  zpBlk: "zpBlk",
  zmedAge: "zmedAge",
  zmedInc: "zmedInc",
  zpCollege: "zpCollege",
  zpRenter: "zpRenter",
  zp2534: "zp2534",
  zpTransit: "zpTransit",
  zdensity: "zdensity",
};

const COLORS = [
  "#0f6b5f",
  "#b14d3a",
  "#4e6fb8",
  "#c4912c",
  "#7b5aa6",
  "#2f8a45",
  "#b55289",
  "#537f89",
  "#8f5a2a",
  "#5f6b25",
  "#ad653f",
  "#346b9f",
  "#9e476f",
  "#6b6f7a",
];

const state = {
  data: null,
  contestNumber: null,
  demoSliders: Object.fromEntries(DEMOGRAPHIC_SLIDERS.map(([key]) => [key, 0])),
  candidateShifts: {},
  territorySettings: {},
  activePreset: null,
  mapMode: "winner",
  pathsReady: false,
  latestScenario: null,
  latestSummary: [],
};

const els = {
  contestSelect: document.querySelector("#contestSelect"),
  contestMeta: document.querySelector("#contestMeta"),
  mapTitle: document.querySelector("#mapTitle"),
  mapMeta: document.querySelector("#mapMeta"),
  sliders: document.querySelector("#sliders"),
  candidateSliders: document.querySelector("#candidateSliders"),
  presetChips: document.querySelector("#presetChips"),
  resetButton: document.querySelector("#resetButton"),
  summary: document.querySelector("#summary"),
  map: document.querySelector("#map"),
  tooltip: document.querySelector("#tooltip"),
  legend: document.querySelector("#legend"),
  modeToggle: document.querySelector("#modeToggle"),
};

init().catch((error) => {
  console.error(error);
  els.contestMeta.textContent = "Unable to load shuffler data. Use a local web server or GitHub Pages so CSV fetches are allowed.";
});

async function init() {
  renderDemographicSliders();
  renderPresets();

  const [precincts, candidates, terms, predictions, priorMatches, candidateTerritory, geojson] = await Promise.all([
    loadCsv("data/precincts.csv"),
    loadCsv("data/candidates.csv"),
    loadCsv("data/candidate_terms.csv"),
    loadCsv("data/candidate_precinct_predictions.csv"),
    loadCsv("data/prior_matches.csv"),
    loadCsv("data/candidate_territory.csv"),
    fetch("data/precincts.geojson").then((response) => {
      if (!response.ok) throw new Error("Failed to load data/precincts.geojson");
      return response.json();
    }),
  ]);

  const precinctByPid = new Map(precincts.map((row) => [row.pid, row]));
  const validCandidates = candidates.filter((row) => parseBool(row.valid_model));
  const contests = buildContests(validCandidates);
  const territoryByModelPid = new Map(
    candidateTerritory.map((row) => [`${row.model_key}|${row.pid}`, row])
  );
  const territoryMetaByModel = new Map();
  for (const row of candidateTerritory) {
    if (!territoryMetaByModel.has(row.model_key)) {
      territoryMetaByModel.set(row.model_key, {
        territory_type: row.territory_type,
        source: row.source,
      });
    }
  }

  state.data = {
    precincts,
    precinctByPid,
    candidates,
    validCandidates,
    terms,
    predictions,
    priorMatches,
    candidateTerritory,
    territoryByModelPid,
    territoryMetaByModel,
    geojson,
    contests,
  };

  populateContestSelect(contests);
  state.contestNumber = contests[0]?.contest_number || null;
  els.contestSelect.value = state.contestNumber || "";
  drawMapShell(geojson);
  bindEvents();
  resetCandidateShiftsForContest();
  renderCandidateSliders();
  update();
}

function bindEvents() {
  els.contestSelect.addEventListener("change", () => {
    state.contestNumber = els.contestSelect.value;
    state.activePreset = null;
    resetCandidateShiftsForContest();
    renderCandidateSliders();
    renderPresets();
    update();
  });

  els.resetButton.addEventListener("click", () => {
    resetAllSliders();
    state.activePreset = null;
    renderPresets();
    update();
  });

  els.modeToggle.addEventListener("click", (event) => {
    const button = event.target.closest(".mode-btn");
    if (!button) return;

    state.mapMode = button.dataset.mode;
    document.querySelectorAll(".mode-btn").forEach((modeButton) => {
      modeButton.classList.toggle("active", modeButton === button);
    });
    paintMap();
    renderLegend(state.latestSummary);
    renderMapTitle();
  });
}

function renderPresets() {
  els.presetChips.innerHTML = "";

  PRESETS.forEach(([label, values], index) => {
    const button = document.createElement("button");
    button.className = "preset-chip";
    button.type = "button";
    button.textContent = label;
    button.classList.toggle("active", state.activePreset === index);
    button.addEventListener("click", () => {
      if (state.activePreset === index) {
        resetDemographicSliders();
        state.activePreset = null;
      } else {
        resetDemographicSliders();
        Object.assign(state.demoSliders, values);
        state.activePreset = index;
      }
      syncSliderInputs();
      renderPresets();
      update();
    });
    els.presetChips.append(button);
  });
}

function renderDemographicSliders() {
  els.sliders.innerHTML = "";

  for (const [key, label, description] of DEMOGRAPHIC_SLIDERS) {
    const row = document.createElement("label");
    row.className = "slider-row";
    row.innerHTML = `
      <span class="slider-label">
        <span class="factor-label">
          <strong>${escapeHtml(label)}</strong>
          <button class="info-button" type="button" aria-label="About ${escapeHtml(label)}" data-help="${escapeHtml(description)}">?</button>
        </span>
        <output data-output="${key}">0.00</output>
      </span>
      <input data-slider="${key}" data-slider-kind="demo" type="range" min="-10" max="10" step="0.1" value="0">
    `;

    const input = row.querySelector("input");
    input.addEventListener("input", () => {
      state.demoSliders[key] = Number(input.value);
      state.activePreset = null;
      syncSliderInputs();
      renderPresets();
      update();
    });
    els.sliders.append(row);
  }
}

function renderCandidateSliders() {
  els.candidateSliders.innerHTML = "";

  for (const candidate of getContestCandidates()) {
    const value = state.candidateShifts[candidate.model_key] || 0;
    const territory = state.data.territoryMetaByModel.get(candidate.model_key);
    const settings = state.territorySettings[candidate.model_key] || { enabled: false, reach: 20 };
    const row = document.createElement("section");
    row.className = "candidate-shift";
    row.innerHTML = `
      <span class="slider-label">
        <span class="cand-shift-label">
          <span class="swatch" style="background:${candidate.color}"></span>
          <strong>${escapeHtml(candidate.candidate)}</strong>
        </span>
        <output data-candidate-output="${escapeHtml(candidate.model_key)}">${formatSigned(value)}</output>
      </span>
      <input data-candidate-slider="${escapeHtml(candidate.model_key)}" data-slider-kind="candidate" type="range" min="-10" max="10" step="0.1" value="${value}">
      ${territory ? `
        <label class="territory-toggle">
          <input type="checkbox" data-territory-toggle="${escapeHtml(candidate.model_key)}" ${settings.enabled ? "checked" : ""}>
          <span>Localize to prior territory</span>
        </label>
        <div class="territory-options" data-territory-options="${escapeHtml(candidate.model_key)}" ${settings.enabled ? "" : "hidden"}>
          <span class="territory-scale-label">
            <span>Outside reach</span>
            <output data-territory-output="${escapeHtml(candidate.model_key)}">${Math.round(settings.reach)}%</output>
          </span>
          <input type="range" min="20" max="80" step="5" value="${settings.reach}" data-territory-reach="${escapeHtml(candidate.model_key)}">
          <span class="territory-hint">20% = tight; 80% = broad. Core territory stays at full strength.</span>
          <span class="territory-source">${escapeHtml(territory.source)}</span>
        </div>
      ` : ""}
    `;

    const input = row.querySelector("input");
    input.addEventListener("input", () => {
      state.candidateShifts[candidate.model_key] = Number(input.value);
      syncSliderInputs();
      update();
    });

    const toggle = row.querySelector("[data-territory-toggle]");
    const reach = row.querySelector("[data-territory-reach]");
    if (toggle) {
      toggle.addEventListener("change", () => {
        state.territorySettings[candidate.model_key].enabled = toggle.checked;
        row.querySelector("[data-territory-options]").hidden = !toggle.checked;
        update();
      });
    }
    if (reach) {
      reach.addEventListener("input", () => {
        state.territorySettings[candidate.model_key].reach = Number(reach.value);
        row.querySelector("[data-territory-output]").value = `${Math.round(Number(reach.value))}%`;
        update();
      });
    }
    els.candidateSliders.append(row);
  }
}

function resetAllSliders() {
  resetDemographicSliders();
  resetCandidateShiftsForContest();
  syncSliderInputs();
}

function resetDemographicSliders() {
  for (const [key] of DEMOGRAPHIC_SLIDERS) state.demoSliders[key] = 0;
}

function resetCandidateShiftsForContest() {
  state.candidateShifts = {};
  state.territorySettings = {};
  for (const candidate of getContestCandidates()) {
    state.candidateShifts[candidate.model_key] = 0;
    state.territorySettings[candidate.model_key] = { enabled: false, reach: 20 };
  }
}

function syncSliderInputs() {
  for (const [key] of DEMOGRAPHIC_SLIDERS) {
    const value = state.demoSliders[key] || 0;
    const input = document.querySelector(`[data-slider="${cssEscape(key)}"]`);
    const output = document.querySelector(`[data-output="${cssEscape(key)}"]`);
    if (input) input.value = String(value);
    if (output) output.value = formatSigned(value);
  }

  for (const [modelKey, value] of Object.entries(state.candidateShifts)) {
    const input = document.querySelector(`[data-candidate-slider="${cssEscape(modelKey)}"]`);
    const output = document.querySelector(`[data-candidate-output="${cssEscape(modelKey)}"]`);
    if (input) input.value = String(value);
    if (output) output.value = formatSigned(value);
  }
}

function populateContestSelect(contests) {
  els.contestSelect.innerHTML = contests.map((contest) => {
    const label = `${contest.contest_number} - ${contest.contest_name}`;
    return `<option value="${escapeHtml(contest.contest_number)}">${escapeHtml(label)}</option>`;
  }).join("");
}

function buildContests(validCandidates) {
  const byContest = new Map();

  for (const row of validCandidates) {
    if (!byContest.has(row.contest_number)) {
      byContest.set(row.contest_number, {
        contest_number: row.contest_number,
        contest_name: row.contest_name,
        contest_family: row.contest_family,
        candidate_count: 0,
      });
    }
    byContest.get(row.contest_number).candidate_count += 1;
  }

  return [...byContest.values()]
    .filter((contest) => contest.candidate_count > 1)
    .sort((a, b) => Number(a.contest_number) - Number(b.contest_number));
}

function getContestCandidates() {
  if (!state.data || !state.contestNumber) return [];
  return state.data.validCandidates
    .filter((row) => row.contest_number === state.contestNumber)
    .map((row, index) => ({
      ...row,
      color: COLORS[index % COLORS.length],
    }));
}

function update() {
  if (!state.data || !state.contestNumber) return;

  const scenario = runScenario(state.contestNumber);
  const summary = summarizeScenario(scenario.rows);
  state.latestScenario = scenario;
  state.latestSummary = summary;

  renderSummary(summary);
  renderLegend(summary);
  paintMap();
  renderMeta(summary, scenario);
  renderMapTitle();
}

function runScenario(contestNumber) {
  const { validCandidates, terms, predictions, precinctByPid } = state.data;
  const candidateRows = validCandidates.filter((row) => row.contest_number === contestNumber);
  const candidateColorByModel = new Map(candidateRows.map((row, index) => [row.model_key, COLORS[index % COLORS.length]]));
  const modelKeys = new Set(candidateRows.map((row) => row.model_key));
  const contestPredictions = predictions
    .filter((row) => row.contest_number === contestNumber && modelKeys.has(row.model_key))
    .map((row) => ({
      ...row,
      color: candidateColorByModel.get(row.model_key),
      base_share: num(row.fitted_share),
      demographic_delta_pp: 0,
      direct_delta_pp: 0,
      direct_input_pp: 0,
      territory_weight: 1,
      territory_localized: false,
      delta_pp: 0,
      raw_scenario_share: 0,
      raw_clip: 0,
      scenario_share: 0,
      scenario_votes: 0,
    }));

  const rowsByModel = groupBy(contestPredictions, (row) => row.model_key);
  const priorZByModelPid = buildPriorExposure(contestPredictions);
  const contestTerms = terms.filter((row) => modelKeys.has(row.model_key));

  for (const term of contestTerms) {
    const group = termGroup(term);
    const sliderValue = state.demoSliders[group] || 0;
    if (sliderValue === 0) continue;

    const coef = num(term.coef_pp_per_sd);
    const rows = rowsByModel.get(term.model_key) || [];

    for (const row of rows) {
      const exposure = exposureForTerm(row, term.term, precinctByPid, priorZByModelPid);
      row.demographic_delta_pp += coef * sliderValue * exposure;
    }
  }

  for (const row of contestPredictions) {
    const directInput = state.candidateShifts[row.model_key] || 0;
    const territory = state.data.territoryByModelPid.get(`${row.model_key}|${row.pid}`);
    const settings = state.territorySettings[row.model_key] || { enabled: false, reach: 20 };
    const canLocalize = Boolean(territory);
    const localized = settings.enabled && canLocalize;
    const coreScore = localized ? clamp(num(territory.territory_score), 0, 1) : 1;
    const outsideReach = clamp(num(settings.reach) / 100, 0.2, 0.8);

    row.direct_input_pp = directInput;
    row.territory_localized = localized;
    row.territory_weight = localized
      ? outsideReach + ((1 - outsideReach) * coreScore)
      : 1;
    row.direct_delta_pp = directInput * row.territory_weight;
    row.delta_pp = row.demographic_delta_pp + row.direct_delta_pp;
  }

  const rowsByPid = groupBy(contestPredictions, (row) => row.pid);
  const byPid = new Map();
  const baseWinnerByPid = new Map();
  const scenarioWinnerByPid = new Map();

  for (const [pid, precinctRows] of rowsByPid.entries()) {
    const baseSorted = [...precinctRows].sort((a, b) => b.base_share - a.base_share);
    baseWinnerByPid.set(pid, baseSorted[0]?.model_key || null);

    let total = 0;
    for (const row of precinctRows) {
      row.raw_scenario_share = row.base_share + row.delta_pp;
      row.raw_clip = Math.max(row.raw_scenario_share, 0.001);
      total += row.raw_clip;
    }

    for (const row of precinctRows) {
      row.scenario_share = total > 0 ? (row.raw_clip / total) * 100 : 0;
      row.scenario_votes = (row.scenario_share / 100) * num(row.contest_votes);
    }

    const scenarioSorted = [...precinctRows].sort((a, b) => b.scenario_share - a.scenario_share);
    byPid.set(pid, scenarioSorted);
    scenarioWinnerByPid.set(pid, scenarioSorted[0]?.model_key || null);
  }

  return {
    rows: contestPredictions,
    byPid,
    baseWinnerByPid,
    scenarioWinnerByPid,
    candidateRows,
  };
}

function termGroup(term) {
  const rawGroup = term.term_group || "";
  if (rawGroup) return rawGroup;
  const name = String(term.term || "");
  if (name.startsWith("zprior_")) return "prior_territory";
  return TERM_GROUPS[name] || name;
}

function exposureForTerm(row, termName, precinctByPid, priorZByModelPid) {
  if (String(termName).startsWith("zprior_")) {
    return priorZByModelPid.get(`${row.model_key}|${row.pid}`) || 0;
  }

  const exposureColumn = EXPOSURE_COLUMNS[termName] || termName;
  if (row[exposureColumn] !== undefined && row[exposureColumn] !== "") {
    return num(row[exposureColumn]);
  }

  const precinct = precinctByPid.get(row.pid);
  if (!precinct) return 0;
  return num(precinct[exposureColumn]);
}

function buildPriorExposure(rows) {
  const byModel = groupBy(rows, (row) => row.model_key);
  const output = new Map();

  for (const [modelKey, modelRows] of byModel.entries()) {
    const values = modelRows.map((row) => nullableNum(row.prior_territory_score));
    const valid = values.filter((value) => value !== null);
    const mean = valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
    const variance = valid.length > 1
      ? valid.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (valid.length - 1)
      : 0;
    const sd = Math.sqrt(variance);

    for (const row of modelRows) {
      const value = nullableNum(row.prior_territory_score);
      const z = value !== null && sd > 0 ? (value - mean) / sd : 0;
      output.set(`${modelKey}|${row.pid}`, z);
    }
  }

  return output;
}

function summarizeScenario(rows) {
  const byCandidate = new Map();

  for (const row of rows) {
    if (!byCandidate.has(row.model_key)) {
      byCandidate.set(row.model_key, {
        model_key: row.model_key,
        candidate: row.candidate,
        votes: 0,
        base_votes: 0,
        share: 0,
        base_share: 0,
        color: row.color,
        direct_shift: state.candidateShifts[row.model_key] || 0,
        territory_localized: Boolean(state.territorySettings[row.model_key]?.enabled),
      });
    }

    const item = byCandidate.get(row.model_key);
    const contestVotes = num(row.contest_votes);
    item.votes += row.scenario_votes;
    item.base_votes += (row.base_share / 100) * contestVotes;
  }

  const totalVotes = [...byCandidate.values()].reduce((sum, row) => sum + row.votes, 0);
  const totalBaseVotes = [...byCandidate.values()].reduce((sum, row) => sum + row.base_votes, 0);

  return [...byCandidate.values()]
    .map((row) => ({
      ...row,
      share: totalVotes > 0 ? (row.votes / totalVotes) * 100 : 0,
      base_share: totalBaseVotes > 0 ? (row.base_votes / totalBaseVotes) * 100 : 0,
    }))
    .sort((a, b) => b.share - a.share);
}

function renderSummary(summary) {
  if (!summary.length) {
    els.summary.innerHTML = `<p class="empty-state">No valid models are available for this contest.</p>`;
    return;
  }

  els.summary.innerHTML = summary.map((row) => {
    const delta = row.share - row.base_share;
    const directBadge = Math.abs(row.direct_shift) >= 0.05
      ? `<span class="shift-badge">${formatSigned(row.direct_shift)} pp${row.territory_localized ? " localized" : ""}</span>`
      : "";
    const deltaClass = delta >= 0 ? "delta-pos" : "delta-neg";
    return `
      <article class="candidate-row">
        <div class="candidate-main">
          <span class="candidate-name">${escapeHtml(row.candidate)}${directBadge}</span>
          <span class="candidate-share">${formatPct(row.share)}</span>
        </div>
        <div class="bar-track">
          <div class="bar" style="width:${clamp(row.share, 0, 100)}%; background:${row.color}"></div>
        </div>
        <div class="candidate-detail">${formatVotes(row.votes)} votes, <span class="${deltaClass}">${formatSigned(delta)} pp</span> vs base</div>
      </article>
    `;
  }).join("");
}

function renderMeta(summary, scenario) {
  const contest = state.data.contests.find((row) => row.contest_number === state.contestNumber);
  const precinctCount = new Set(scenario.rows.map((row) => row.pid)).size;
  const modeledCount = summary.length;
  const totalVotes = summary.reduce((sum, row) => sum + row.votes, 0);
  const flippedCount = [...scenario.byPid.keys()].filter((pid) => {
    return scenario.baseWinnerByPid.get(pid) !== scenario.scenarioWinnerByPid.get(pid);
  }).length;

  els.contestMeta.textContent = contest
    ? `${contest.contest_family} - ${modeledCount} valid candidate models`
    : "";
  els.mapMeta.textContent = `${precinctCount} precincts, ${formatVotes(totalVotes)} scenario votes, ${flippedCount} winner changes. Citywide totals are after precinct normalization.`;
}

function renderMapTitle() {
  const titles = {
    winner: "Precinct Winner Map",
    margin: "Precinct Margin Map",
    change: "Precinct vs Base Map",
  };
  els.mapTitle.textContent = titles[state.mapMode] || titles.winner;
}

function renderLegend(summary) {
  if (state.mapMode === "winner" || state.mapMode === "margin") {
    els.legend.innerHTML = summary.slice(0, 8).map((row) => `
      <span class="legend-item">
        <span class="swatch" style="background:${row.color}"></span>
        ${escapeHtml(row.candidate)}
      </span>
    `).join("") + flipLegend();
    if (state.mapMode === "margin") {
      els.legend.insertAdjacentHTML("beforeend", `
        <div class="choropleth-legend">
          <div class="choropleth-bar" style="background:linear-gradient(to right,rgba(80,80,80,0.15),rgba(80,80,80,0.9))"></div>
          <div class="choropleth-labels"><span>Narrow</span><span>Decisive</span></div>
        </div>
      `);
    }
    return;
  }

  els.legend.innerHTML = `
    ${flipLegend()}
    <div class="choropleth-legend">
      <div class="choropleth-bar" style="background:linear-gradient(to right,#8b2020,#f0c8c0,#c8ccc6,#c8e8c0,#1b6b40)"></div>
      <div class="choropleth-labels"><span>Down vs base</span><span>Up vs base</span></div>
    </div>
  `;
}

function flipLegend() {
  return `
    <span class="legend-item">
      <span class="swatch swatch-flip"></span>
      Winner changed
    </span>
  `;
}

function drawMapShell(geojson) {
  const bounds = geoBounds(geojson);
  const width = 900;
  const height = 760;
  const padding = 22;
  const scale = Math.min(
    (width - padding * 2) / (bounds.maxLon - bounds.minLon),
    (height - padding * 2) / (bounds.maxLat - bounds.minLat)
  );

  const project = ([lon, lat]) => [
    padding + (lon - bounds.minLon) * scale,
    height - padding - (lat - bounds.minLat) * scale,
  ];

  els.map.setAttribute("viewBox", `0 0 ${width} ${height}`);
  els.map.innerHTML = "";

  for (const feature of geojson.features) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "precinct");
    path.setAttribute("data-pid", feature.properties.pid);
    path.setAttribute("d", pathForGeometry(feature.geometry, project));
    path.setAttribute("fill", "var(--map-empty)");
    path.addEventListener("mousemove", (event) => showTooltip(event, feature.properties.pid));
    path.addEventListener("mouseleave", hideTooltip);
    els.map.append(path);
  }

  state.pathsReady = true;
}

function paintMap() {
  if (!state.pathsReady || !state.latestScenario) return;

  const scenario = state.latestScenario;
  const colorByModel = new Map(state.latestSummary.map((row) => [row.model_key, row.color]));

  for (const path of els.map.querySelectorAll(".precinct")) {
    const pid = path.dataset.pid;
    const rows = scenario.byPid.get(pid);
    path.classList.remove("flipped");

    if (!rows || rows.length === 0) {
      path.setAttribute("fill", "var(--map-empty)");
      path.setAttribute("opacity", "1");
      path.setAttribute("stroke", "#ffffff");
      path.setAttribute("stroke-width", "0.65");
      continue;
    }

    const winner = rows[0];
    const second = rows[1];
    const flipped = scenario.baseWinnerByPid.get(pid) !== scenario.scenarioWinnerByPid.get(pid);
    path.classList.toggle("flipped", flipped);
    path.setAttribute("stroke", flipped ? "#e8b820" : "#ffffff");
    path.setAttribute("stroke-width", flipped ? "2.5" : "0.65");

    if (state.mapMode === "winner") {
      const opacity = 0.45 + (winner.scenario_share / 100) * 0.55;
      path.setAttribute("fill", colorByModel.get(winner.model_key) || "#8b9088");
      path.setAttribute("opacity", String(clamp(opacity, 0.45, 1)));
      continue;
    }

    if (state.mapMode === "margin") {
      const margin = winner.scenario_share - (second?.scenario_share || 0);
      const intensity = clamp(margin / 60, 0, 1);
      path.setAttribute("fill", colorByModel.get(winner.model_key) || "#8b9088");
      path.setAttribute("opacity", String(0.25 + intensity * 0.75));
      continue;
    }

    const sameCandidateBase = winner.base_share;
    const change = winner.scenario_share - sameCandidateBase;
    if (Math.abs(change) < 0.5) {
      path.setAttribute("fill", "#c8ccc6");
    } else if (change > 0) {
      path.setAttribute("fill", lerpColor("#c8e8c0", "#1b6b40", clamp(change / 20, 0, 1)));
    } else {
      path.setAttribute("fill", lerpColor("#f0c8c0", "#8b2020", clamp(-change / 20, 0, 1)));
    }
    path.setAttribute("opacity", "1");
  }
}

function showTooltip(event, pid) {
  const scenario = state.latestScenario;
  const rows = scenario?.byPid.get(pid) || [];
  const baseWinner = scenario?.baseWinnerByPid.get(pid);
  const scenarioWinner = scenario?.scenarioWinnerByPid.get(pid);
  const flipped = baseWinner && scenarioWinner && baseWinner !== scenarioWinner;
  const topRows = rows.slice(0, 4);
  const body = topRows.map((row) => {
    const delta = row.scenario_share - row.base_share;
    const direct = row.direct_delta_pp
      ? `, direct ${formatSigned(row.direct_delta_pp)} pp${row.territory_localized ? ` at ${Math.round(row.territory_weight * 100)}% territory weight` : ""}`
      : "";
    return `${escapeHtml(row.candidate)}: ${formatPct(row.scenario_share)} (${formatSigned(delta)} pp vs base${direct})`;
  }).join("<br>");

  els.tooltip.innerHTML = `<strong>Precinct ${escapeHtml(pid)}</strong>${flipped ? "<br>Winner changed" : ""}<br>${body || "No modeled rows"}`;
  els.tooltip.hidden = false;

  const rect = event.currentTarget.ownerSVGElement.parentElement.getBoundingClientRect();
  els.tooltip.style.left = `${event.clientX - rect.left}px`;
  els.tooltip.style.top = `${event.clientY - rect.top}px`;
}

function hideTooltip() {
  els.tooltip.hidden = true;
}

function pathForGeometry(geometry, project) {
  if (!geometry) return "";
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map((ring) => pathForRing(ring, project)).join(" ");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .flatMap((polygon) => polygon.map((ring) => pathForRing(ring, project)))
      .join(" ");
  }
  return "";
}

function pathForRing(ring, project) {
  return ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

function geoBounds(geojson) {
  const bounds = {
    minLon: Infinity,
    minLat: Infinity,
    maxLon: -Infinity,
    maxLat: -Infinity,
  };

  walkCoordinates(geojson.features.map((feature) => feature.geometry?.coordinates), (point) => {
    bounds.minLon = Math.min(bounds.minLon, point[0]);
    bounds.maxLon = Math.max(bounds.maxLon, point[0]);
    bounds.minLat = Math.min(bounds.minLat, point[1]);
    bounds.maxLat = Math.max(bounds.maxLat, point[1]);
  });

  return bounds;
}

function walkCoordinates(value, visit) {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    visit(value);
    return;
  }
  for (const child of value) walkCoordinates(child, visit);
}

async function loadCsv(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return parseCsv(await response.text());
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function groupBy(values, keyFn) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFn(value);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(value);
  }
  return groups;
}

function num(value) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNum(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBool(value) {
  return String(value).toLowerCase() === "true";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatPct(value) {
  return `${value.toFixed(1)}%`;
}

function formatVotes(value) {
  return Math.round(value).toLocaleString("en-US");
}

function formatSigned(value) {
  const rounded = Number(value).toFixed(1);
  return `${value > 0 ? "+" : ""}${rounded}`;
}

function lerpColor(a, b, t) {
  const from = parseColor(a);
  const to = parseColor(b);
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const blue = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${blue})`;
}

function parseColor(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replaceAll('"', '\\"');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
