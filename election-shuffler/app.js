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

const FACTOR_COLUMNS = {
  black_share: "pBlk",
  median_age: "medAge",
  income: "medInc",
  college: "pCollege",
  renter: "pRenter",
  age_25_34: "p2534",
  transit: "pTransit",
  density: "density",
};

const FACTOR_LABELS = Object.fromEntries(
  DEMOGRAPHIC_SLIDERS.map(([key, label]) => [key, label])
);

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
  turnoutSliders: Object.fromEntries(DEMOGRAPHIC_SLIDERS.map(([key]) => [key, 0])),
  candidateShifts: {},
  territorySettings: {},
  activePreset: null,
  mapMode: "winner",
  pathsReady: false,
  latestScenario: null,
  latestSummary: [],
  insightFilters: {
    compareA: null,
    compareB: null,
    explorerCandidate: null,
    explorerFactor: "black_share",
    explorerMode: "scenario",
    precinctCandidate: null,
    search: "",
    changedOnly: false,
    sort: "margin_asc",
  },
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
  impactCards: document.querySelector("#impactCards"),
  compareCandidateA: document.querySelector("#compareCandidateA"),
  compareCandidateB: document.querySelector("#compareCandidateB"),
  candidateComparison: document.querySelector("#candidateComparison"),
  explorerCandidate: document.querySelector("#explorerCandidate"),
  explorerFactor: document.querySelector("#explorerFactor"),
  explorerMode: document.querySelector("#explorerMode"),
  scatterSummary: document.querySelector("#scatterSummary"),
  scatterPlot: document.querySelector("#scatterPlot"),
  precinctSearch: document.querySelector("#precinctSearch"),
  precinctCandidate: document.querySelector("#precinctCandidate"),
  precinctSort: document.querySelector("#precinctSort"),
  changedOnly: document.querySelector("#changedOnly"),
  precinctTableBody: document.querySelector("#precinctTableBody"),
  precinctTableMeta: document.querySelector("#precinctTableMeta"),
  selectedCandidateHeading: document.querySelector("#selectedCandidateHeading"),
  downloadPrecincts: document.querySelector("#downloadPrecincts"),
};

init().catch((error) => {
  console.error(error);
  els.contestMeta.textContent = "Unable to load election data. Use a local web server or GitHub Pages.";
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
  const turnoutExposureByFactor = buildTurnoutExposures(precincts);
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
    turnoutExposureByFactor,
    geojson,
    contests,
  };

  populateContestSelect(contests);
  state.contestNumber = contests[0]?.contest_number || null;
  els.contestSelect.value = state.contestNumber || "";
  drawMapShell(geojson);
  bindEvents();
  bindInsightEvents();
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
    renderCandidateSliders();
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

function bindInsightEvents() {
  els.compareCandidateA.addEventListener("change", () => {
    state.insightFilters.compareA = els.compareCandidateA.value;
    renderCandidateComparison(state.latestScenario, state.latestSummary);
  });
  els.compareCandidateB.addEventListener("change", () => {
    state.insightFilters.compareB = els.compareCandidateB.value;
    renderCandidateComparison(state.latestScenario, state.latestSummary);
  });
  els.explorerCandidate.addEventListener("change", () => {
    state.insightFilters.explorerCandidate = els.explorerCandidate.value;
    renderDemographicExplorer(state.latestScenario);
  });
  els.explorerFactor.addEventListener("change", () => {
    state.insightFilters.explorerFactor = els.explorerFactor.value;
    renderDemographicExplorer(state.latestScenario);
  });
  els.explorerMode.addEventListener("change", () => {
    state.insightFilters.explorerMode = els.explorerMode.value;
    renderDemographicExplorer(state.latestScenario);
  });
  els.precinctSearch.addEventListener("input", () => {
    state.insightFilters.search = els.precinctSearch.value.trim();
    renderPrecinctTable(state.latestScenario);
  });
  els.precinctCandidate.addEventListener("change", () => {
    state.insightFilters.precinctCandidate = els.precinctCandidate.value;
    renderPrecinctTable(state.latestScenario);
  });
  els.precinctSort.addEventListener("change", () => {
    state.insightFilters.sort = els.precinctSort.value;
    renderPrecinctTable(state.latestScenario);
  });
  els.changedOnly.addEventListener("change", () => {
    state.insightFilters.changedOnly = els.changedOnly.checked;
    renderPrecinctTable(state.latestScenario);
  });
  els.downloadPrecincts.addEventListener("click", downloadPrecinctTable);
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
    const row = document.createElement("div");
    row.className = "slider-row";
    row.innerHTML = `
      <span class="slider-label">
        <span class="factor-label">
          <strong>${escapeHtml(label)}</strong>
          <button class="info-button" type="button" aria-label="About ${escapeHtml(label)}" aria-expanded="false">?</button>
        </span>
      </span>
      <span class="factor-help" hidden>${escapeHtml(description)}</span>
      <span class="subslider-label"><span>Support</span><output data-output="${key}">0.0</output></span>
      <input aria-label="${escapeHtml(label)} support effect" data-slider="${key}" data-slider-kind="demo" type="range" min="-10" max="10" step="0.1" value="0">
      <span class="subslider-label turnout-label"><span>Turnout</span><output data-turnout-output="${key}">0%</output></span>
      <input aria-label="${escapeHtml(label)} turnout change" data-turnout-slider="${key}" type="range" min="-30" max="30" step="1" value="0">
    `;

    const input = row.querySelector("[data-slider]");
    const turnoutInput = row.querySelector("[data-turnout-slider]");
    const infoButton = row.querySelector(".info-button");
    const help = row.querySelector(".factor-help");
    infoButton.addEventListener("click", () => {
      const willOpen = help.hidden;
      document.querySelectorAll(".factor-help").forEach((item) => { item.hidden = true; });
      document.querySelectorAll(".info-button").forEach((button) => button.setAttribute("aria-expanded", "false"));
      help.hidden = !willOpen;
      infoButton.setAttribute("aria-expanded", String(willOpen));
    });
    input.addEventListener("input", () => {
      state.demoSliders[key] = Number(input.value);
      state.activePreset = null;
      syncSliderInputs();
      renderPresets();
      update();
    });
    turnoutInput.addEventListener("input", () => {
      state.turnoutSliders[key] = Number(turnoutInput.value);
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
    const territoryCopy = territory ? territoryControlCopy(territory) : null;
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
          <span>${escapeHtml(territoryCopy.toggle)}</span>
        </label>
        <div class="territory-options" data-territory-options="${escapeHtml(candidate.model_key)}" ${settings.enabled ? "" : "hidden"}>
          <span class="territory-scale-label">
            <span>${escapeHtml(territoryCopy.reachLabel)}</span>
            <output data-territory-output="${escapeHtml(candidate.model_key)}">${Math.round(settings.reach)}%</output>
          </span>
          <input type="range" min="20" max="80" step="5" value="${settings.reach}" data-territory-reach="${escapeHtml(candidate.model_key)}">
          <span class="territory-hint">${escapeHtml(territoryCopy.hint)}</span>
          <span class="territory-source">${escapeHtml(territoryCopy.source)}</span>
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
  resetTurnoutSliders();
  resetCandidateShiftsForContest();
  syncSliderInputs();
}

function resetDemographicSliders() {
  for (const [key] of DEMOGRAPHIC_SLIDERS) state.demoSliders[key] = 0;
}

function resetTurnoutSliders() {
  for (const [key] of DEMOGRAPHIC_SLIDERS) state.turnoutSliders[key] = 0;
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
    const turnoutValue = state.turnoutSliders[key] || 0;
    const turnoutInput = document.querySelector(`[data-turnout-slider="${cssEscape(key)}"]`);
    const turnoutOutput = document.querySelector(`[data-turnout-output="${cssEscape(key)}"]`);
    if (turnoutInput) turnoutInput.value = String(turnoutValue);
    if (turnoutOutput) turnoutOutput.value = `${formatSigned(turnoutValue)}%`;
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

function buildTurnoutExposures(precincts) {
  const output = new Map();
  for (const [factor, column] of Object.entries(FACTOR_COLUMNS)) {
    const values = precincts
      .map((row) => num(row[column]))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    const low = quantile(values, 0.05);
    const high = quantile(values, 0.95);
    const byPid = new Map();
    for (const precinct of precincts) {
      const value = num(precinct[column]);
      const exposure = high > low ? clamp((value - low) / (high - low), 0, 1) : 0.5;
      byPid.set(precinct.pid, exposure);
    }
    output.set(factor, byPid);
  }
  return output;
}

function scenarioTurnoutByPid() {
  const result = new Map();
  for (const precinct of state.data.precincts) {
    let multiplier = 1;
    for (const [factor] of DEMOGRAPHIC_SLIDERS) {
      const change = (state.turnoutSliders[factor] || 0) / 100;
      if (change === 0) continue;
      const exposure = state.data.turnoutExposureByFactor.get(factor)?.get(precinct.pid) || 0;
      multiplier *= 1 + (change * exposure);
    }
    result.set(precinct.pid, clamp(multiplier, 0.25, 2.5));
  }
  return result;
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

function territoryControlCopy(territory) {
  if (territory.territory_type === "ward_edge_decay") {
    const district = territory.source.match(/Ward\s+\d+/i)?.[0] || "home district";
    return {
      toggle: `Focus this change in ${district}`,
      reachLabel: `Reach outside ${district}`,
      hint: `20% keeps most of the change near ${district}; 80% spreads it more widely.`,
      source: `District based on the candidate's 2024 council race.`,
    };
  }
  return {
    toggle: "Focus this change in past strongholds",
    reachLabel: "Reach beyond strongholds",
    hint: "20% closely follows past support; 80% spreads the change more widely.",
    source: "Based on precinct results from a prior election.",
  };
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
  renderInsights(scenario, summary);
}

function runScenario(contestNumber) {
  const { validCandidates, terms, predictions, precinctByPid } = state.data;
  const candidateRows = validCandidates.filter((row) => row.contest_number === contestNumber);
  const candidateColorByModel = new Map(candidateRows.map((row, index) => [row.model_key, COLORS[index % COLORS.length]]));
  const modelKeys = new Set(candidateRows.map((row) => row.model_key));
  const turnoutByPid = scenarioTurnoutByPid();
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
      turnout_multiplier: turnoutByPid.get(row.pid) || 1,
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
      row.scenario_votes = (row.scenario_share / 100) * num(row.contest_votes) * row.turnout_multiplier;
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
    turnoutByPid,
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
    els.summary.innerHTML = `<p class="empty-state">No candidate estimates are available for this contest.</p>`;
    return;
  }

  els.summary.innerHTML = summary.map((row) => {
    const delta = row.share - row.base_share;
    const deltaClass = delta >= 0 ? "delta-pos" : "delta-neg";
    return `
      <article class="candidate-row">
        <div class="candidate-main">
          <span class="candidate-name">${escapeHtml(row.candidate)}</span>
          <span class="candidate-share">${formatPct(row.share)}</span>
        </div>
        <div class="bar-track">
          <div class="bar" style="width:${clamp(row.share, 0, 100)}%; background:${row.color}"></div>
        </div>
        <div class="candidate-detail">${formatVotes(row.votes)} votes, <span class="${deltaClass}">${formatSigned(delta)} points</span> from start</div>
      </article>
    `;
  }).join("");
}

function renderMeta(summary, scenario) {
  const contest = state.data.contests.find((row) => row.contest_number === state.contestNumber);
  const precinctCount = new Set(scenario.rows.map((row) => row.pid)).size;
  const candidateCount = summary.length;
  const totalVotes = summary.reduce((sum, row) => sum + row.votes, 0);
  const flippedCount = [...scenario.byPid.keys()].filter((pid) => {
    return scenario.baseWinnerByPid.get(pid) !== scenario.scenarioWinnerByPid.get(pid);
  }).length;

  els.contestMeta.textContent = contest
    ? `${contest.contest_family} - ${candidateCount} candidates`
    : "";
  const baseVotes = [...scenario.byPid.values()].reduce((sum, rows) => sum + num(rows[0]?.contest_votes), 0);
  const turnoutChange = baseVotes > 0 ? ((totalVotes / baseVotes) - 1) * 100 : 0;
  els.mapMeta.textContent = `${precinctCount} precincts, ${formatVotes(totalVotes)} votes (${formatSigned(turnoutChange)}% turnout), ${flippedCount} winner changes. District totals come from precinct results.`;
}

function renderInsights(scenario, summary) {
  if (!scenario || !summary.length) return;
  syncInsightControls(summary);
  renderImpactCards(scenario, summary);
  renderCandidateComparison(scenario, summary);
  renderDemographicExplorer(scenario);
  renderPrecinctTable(scenario);
}

function syncInsightControls(summary) {
  const candidates = summary.map((row) => ({ key: row.model_key, name: row.candidate }));
  const keys = new Set(candidates.map((row) => row.key));
  const filters = state.insightFilters;
  if (!keys.has(filters.compareA)) filters.compareA = candidates[0]?.key || null;
  if (!keys.has(filters.compareB) || filters.compareB === filters.compareA) {
    filters.compareB = candidates[1]?.key || candidates[0]?.key || null;
  }
  if (!keys.has(filters.explorerCandidate)) filters.explorerCandidate = candidates[0]?.key || null;
  if (!keys.has(filters.precinctCandidate)) filters.precinctCandidate = candidates[0]?.key || null;

  const options = candidates.map((row) => `<option value="${escapeHtml(row.key)}">${escapeHtml(row.name)}</option>`).join("");
  for (const select of [els.compareCandidateA, els.compareCandidateB, els.explorerCandidate, els.precinctCandidate]) {
    if (select.dataset.contest !== state.contestNumber) {
      select.innerHTML = options;
      select.dataset.contest = state.contestNumber;
    }
  }
  els.compareCandidateA.value = filters.compareA;
  els.compareCandidateB.value = filters.compareB;
  els.explorerCandidate.value = filters.explorerCandidate;
  els.precinctCandidate.value = filters.precinctCandidate;

  if (!els.explorerFactor.options.length) {
    els.explorerFactor.innerHTML = DEMOGRAPHIC_SLIDERS.map(([key, label]) => (
      `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`
    )).join("");
  }
  els.explorerFactor.value = filters.explorerFactor;
  els.explorerMode.value = filters.explorerMode;
  els.precinctSearch.value = filters.search;
  els.precinctSort.value = filters.sort;
  els.changedOnly.checked = filters.changedOnly;
}

function renderImpactCards(scenario, summary) {
  const leader = summary[0];
  const runnerUp = summary[1];
  const lead = leader && runnerUp ? leader.share - runnerUp.share : leader?.share || 0;
  const flipped = [...scenario.byPid.keys()].filter((pid) => (
    scenario.baseWinnerByPid.get(pid) !== scenario.scenarioWinnerByPid.get(pid)
  )).length;
  const mover = [...summary].sort((a, b) => (
    Math.abs(b.share - b.base_share) - Math.abs(a.share - a.base_share)
  ))[0];
  const closest = [...scenario.byPid.entries()]
    .map(([pid, rows]) => ({ pid, margin: (rows[0]?.scenario_share || 0) - (rows[1]?.scenario_share || 0) }))
    .sort((a, b) => a.margin - b.margin)[0];
  const currentVotes = summary.reduce((sum, row) => sum + row.votes, 0);
  const baseVotes = [...scenario.byPid.values()].reduce((sum, rows) => sum + num(rows[0]?.contest_votes), 0);
  const turnoutChange = baseVotes > 0 ? ((currentVotes / baseVotes) - 1) * 100 : 0;

  const cards = [
    ["District leader", leader?.candidate || "None", `${formatPct(leader?.share || 0)} support, ${lead.toFixed(1)}-point lead`],
    ["Turnout", `${formatSigned(turnoutChange)}%`, `${formatVotes(currentVotes)} votes in this scenario`],
    ["Winner changes", String(flipped), flipped ? "Precincts with a different leader" : "No precinct leaders changed"],
    ["Biggest movement", mover?.candidate || "None", mover ? `${formatSigned(mover.share - mover.base_share)} points` : "No change"],
    ["Closest precinct", closest ? `Precinct ${closest.pid}` : "None", closest ? `${closest.margin.toFixed(1)}-point margin` : "No result"],
  ];
  els.impactCards.innerHTML = cards.map(([label, value, detail]) => `
    <article class="impact-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(detail)}</p>
    </article>
  `).join("");
}

function renderCandidateComparison(scenario, summary) {
  if (!scenario) return;
  const keys = [state.insightFilters.compareA, state.insightFilters.compareB];
  const bySummary = new Map(summary.map((row) => [row.model_key, row]));
  const winnerCounts = new Map();
  for (const winner of scenario.scenarioWinnerByPid.values()) {
    winnerCounts.set(winner, (winnerCounts.get(winner) || 0) + 1);
  }

  els.candidateComparison.innerHTML = keys.map((key) => {
    const candidate = bySummary.get(key);
    const rows = scenario.rows.filter((row) => row.model_key === key).sort((a, b) => b.scenario_share - a.scenario_share);
    const strongest = rows[0];
    const weakest = rows[rows.length - 1];
    if (!candidate) return "";
    return `
      <article class="comparison-card">
        <h4><span class="swatch" style="background:${candidate.color}"></span>${escapeHtml(candidate.candidate)}</h4>
        <div class="comparison-stat"><span>Current district share</span><strong>${formatPct(candidate.share)}</strong></div>
        <div class="comparison-stat"><span>Starting share</span><strong>${formatPct(candidate.base_share)}</strong></div>
        <div class="comparison-stat"><span>Precincts leading</span><strong>${winnerCounts.get(key) || 0}</strong></div>
        <div class="comparison-stat"><span>Strongest precinct</span><strong>${strongest ? `${strongest.pid} (${formatPct(strongest.scenario_share)})` : "None"}</strong></div>
        <div class="comparison-stat"><span>Weakest precinct</span><strong>${weakest ? `${weakest.pid} (${formatPct(weakest.scenario_share)})` : "None"}</strong></div>
      </article>
    `;
  }).join("");
}

function renderDemographicExplorer(scenario) {
  if (!scenario) return;
  const key = state.insightFilters.explorerCandidate;
  const factor = state.insightFilters.explorerFactor;
  const mode = state.insightFilters.explorerMode;
  const column = FACTOR_COLUMNS[factor];
  const points = scenario.rows
    .filter((row) => row.model_key === key)
    .map((row) => ({
      pid: row.pid,
      x: num(state.data.precinctByPid.get(row.pid)?.[column]),
      y: mode === "base" ? row.base_share : row.scenario_share,
      color: row.color,
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!points.length) {
    els.scatterPlot.innerHTML = "";
    els.scatterSummary.textContent = "No precinct data are available for this selection.";
    return;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const correlationValue = correlation(xs, ys);
  const width = 720;
  const height = 320;
  const left = 56;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const xScale = (value) => left + ((value - xMin) / Math.max(xMax - xMin, 1)) * (width - left - right);
  const yScale = (value) => height - bottom - ((value - yMin) / Math.max(yMax - yMin, 1)) * (height - top - bottom);
  const candidateName = scenario.candidateRows.find((row) => row.model_key === key)?.candidate || "Candidate";

  els.scatterSummary.innerHTML = `<strong>${escapeHtml(candidateName)}</strong> and ${escapeHtml(FACTOR_LABELS[factor])}: ${escapeHtml(correlationDescription(correlationValue))} relationship across precincts (r = ${correlationValue.toFixed(2)}).`;
  els.scatterPlot.innerHTML = `
    <line class="chart-axis" x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}"></line>
    <line class="chart-axis" x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}"></line>
    <text class="chart-label" x="${left}" y="${height - 14}">${escapeHtml(formatFactorValue(factor, xMin))}</text>
    <text class="chart-label" x="${width - right}" y="${height - 14}" text-anchor="end">${escapeHtml(formatFactorValue(factor, xMax))}</text>
    <text class="chart-label" x="${width / 2}" y="${height - 4}" text-anchor="middle">${escapeHtml(FACTOR_LABELS[factor])}</text>
    <text class="chart-label" x="${left - 8}" y="${height - bottom}" text-anchor="end">${yMin.toFixed(0)}%</text>
    <text class="chart-label" x="${left - 8}" y="${top + 4}" text-anchor="end">${yMax.toFixed(0)}%</text>
    ${points.map((point) => `
      <circle class="scatter-point" cx="${xScale(point.x).toFixed(2)}" cy="${yScale(point.y).toFixed(2)}" r="4" fill="${point.color}">
        <title>Precinct ${escapeHtml(point.pid)}: ${formatFactorValue(factor, point.x)}, ${formatPct(point.y)} support</title>
      </circle>
    `).join("")}
  `;
}

function renderPrecinctTable(scenario) {
  if (!scenario) return;
  const selectedKey = state.insightFilters.precinctCandidate;
  const selectedName = scenario.candidateRows.find((row) => row.model_key === selectedKey)?.candidate || "Selected candidate";
  let rows = [...scenario.byPid.entries()].map(([pid, candidateRows]) => {
    const winner = candidateRows[0];
    const second = candidateRows[1];
    const selected = candidateRows.find((row) => row.model_key === selectedKey);
    return {
      pid,
      winner: winner?.candidate || "None",
      winner_share: winner?.scenario_share || 0,
      margin: (winner?.scenario_share || 0) - (second?.scenario_share || 0),
      candidate_share: selected?.scenario_share || 0,
      candidate_change: selected ? selected.scenario_share - selected.base_share : 0,
      turnout_change: ((winner?.turnout_multiplier || 1) - 1) * 100,
      changed: scenario.baseWinnerByPid.get(pid) !== scenario.scenarioWinnerByPid.get(pid),
    };
  });

  if (state.insightFilters.search) rows = rows.filter((row) => String(row.pid).includes(state.insightFilters.search));
  if (state.insightFilters.changedOnly) rows = rows.filter((row) => row.changed);
  const sorters = {
    margin_asc: (a, b) => a.margin - b.margin,
    change_desc: (a, b) => b.candidate_change - a.candidate_change,
    share_desc: (a, b) => b.candidate_share - a.candidate_share,
    turnout_desc: (a, b) => b.turnout_change - a.turnout_change,
    pid_asc: (a, b) => Number(a.pid) - Number(b.pid),
  };
  rows.sort(sorters[state.insightFilters.sort] || sorters.margin_asc);
  state.latestTableRows = rows;
  els.selectedCandidateHeading.textContent = selectedName;
  els.precinctTableBody.innerHTML = rows.map((row) => `
    <tr class="${row.changed ? "changed-row" : ""}">
      <td>${escapeHtml(row.pid)}</td>
      <td>${escapeHtml(row.winner)}</td>
      <td>${formatPct(row.winner_share)}</td>
      <td>${row.margin.toFixed(1)} points</td>
      <td>${formatPct(row.candidate_share)}</td>
      <td class="${row.candidate_change >= 0 ? "delta-pos" : "delta-neg"}">${formatSigned(row.candidate_change)} points</td>
      <td>${formatSigned(row.turnout_change)}%</td>
    </tr>
  `).join("");
  els.precinctTableMeta.textContent = `${rows.length} precinct${rows.length === 1 ? "" : "s"} shown.`;
}

function downloadPrecinctTable() {
  const rows = state.latestTableRows || [];
  const headers = ["precinct", "winner", "winner_share", "margin", "candidate_share", "candidate_change", "turnout_change", "winner_changed"];
  const csvRows = [headers.join(",")].concat(rows.map((row) => [
    row.pid, row.winner, row.winner_share, row.margin, row.candidate_share,
    row.candidate_change, row.turnout_change, row.changed,
  ].map(csvCell).join(",")));
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `dc-election-scenario-${state.contestNumber}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function correlation(xs, ys) {
  if (xs.length < 2 || xs.length !== ys.length) return 0;
  const xMean = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const yMean = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  let numerator = 0;
  let xSquares = 0;
  let ySquares = 0;
  for (let index = 0; index < xs.length; index += 1) {
    const xDelta = xs[index] - xMean;
    const yDelta = ys[index] - yMean;
    numerator += xDelta * yDelta;
    xSquares += xDelta * xDelta;
    ySquares += yDelta * yDelta;
  }
  const denominator = Math.sqrt(xSquares * ySquares);
  return denominator > 0 ? numerator / denominator : 0;
}

function correlationDescription(value) {
  const strength = Math.abs(value) >= 0.65 ? "strong" : Math.abs(value) >= 0.35 ? "moderate" : "weak";
  const direction = value >= 0 ? "positive" : "negative";
  return `${strength} ${direction}`;
}

function formatFactorValue(factor, value) {
  if (factor === "income") return `$${Math.round(value).toLocaleString("en-US")}`;
  if (factor === "density") return `${Math.round(value).toLocaleString("en-US")}/km²`;
  if (factor === "median_age") return `${value.toFixed(1)} years`;
  return `${value.toFixed(1)}%`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function renderMapTitle() {
  const titles = {
    winner: "Precinct Winner Map",
    margin: "Precinct Margin Map",
    change: "Change From Starting Point",
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
      <div class="choropleth-labels"><span>Down</span><span>Up</span></div>
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
  const longitudeScale = Math.cos(38.91 * Math.PI / 180);
  const geographicPoint = ([lon, lat]) => [lon * longitudeScale, lat];
  const bounds = geoBounds(geojson, geographicPoint);
  const width = 900;
  const height = 760;
  const padding = 22;
  const scale = Math.min(
    (width - padding * 2) / (bounds.maxLon - bounds.minLon),
    (height - padding * 2) / (bounds.maxLat - bounds.minLat)
  );
  const renderedWidth = (bounds.maxLon - bounds.minLon) * scale;
  const renderedHeight = (bounds.maxLat - bounds.minLat) * scale;
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;

  const project = (point) => {
    const [x, y] = geographicPoint(point);
    return [
      offsetX + (x - bounds.minLon) * scale,
      height - offsetY - (y - bounds.minLat) * scale,
    ];
  };

  els.map.setAttribute("viewBox", `0 0 ${width} ${height}`);
  els.map.setAttribute("preserveAspectRatio", "xMidYMid meet");
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
      ? `; candidate setting added ${formatSigned(row.direct_delta_pp)} points here`
      : "";
    return `${escapeHtml(row.candidate)}: ${formatPct(row.scenario_share)} (${formatSigned(delta)} points from start${direct})`;
  }).join("<br>");

  els.tooltip.innerHTML = `<strong>Precinct ${escapeHtml(pid)}</strong>${flipped ? "<br>Winner changed" : ""}<br>${body || "No candidate estimates"}`;
  els.tooltip.hidden = false;

  const wrap = event.currentTarget.ownerSVGElement.parentElement;
  const rect = wrap.getBoundingClientRect();
  const tooltipRect = els.tooltip.getBoundingClientRect();
  const desiredLeft = event.clientX - rect.left + 12;
  const desiredTop = event.clientY - rect.top - (tooltipRect.height / 2);
  els.tooltip.style.left = `${clamp(desiredLeft, 8, Math.max(8, rect.width - tooltipRect.width - 8))}px`;
  els.tooltip.style.top = `${clamp(desiredTop, 8, Math.max(8, rect.height - tooltipRect.height - 8))}px`;
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

function geoBounds(geojson, transform = (point) => point) {
  const bounds = {
    minLon: Infinity,
    minLat: Infinity,
    maxLon: -Infinity,
    maxLat: -Infinity,
  };

  walkCoordinates(geojson.features.map((feature) => feature.geometry?.coordinates), (point) => {
    const [x, y] = transform(point);
    bounds.minLon = Math.min(bounds.minLon, x);
    bounds.maxLon = Math.max(bounds.maxLon, x);
    bounds.minLat = Math.min(bounds.minLat, y);
    bounds.maxLat = Math.max(bounds.maxLat, y);
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

function quantile(sortedValues, probability) {
  if (!sortedValues.length) return 0;
  const position = (sortedValues.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
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
