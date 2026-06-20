const DEMOGRAPHIC_SLIDERS = [
  ["black_share", "Black population share", "ACS estimate of the share of residents who identify as Black"],
  ["median_age", "Median age", "ACS median age"],
  ["income", "Median household income", "ACS median household income"],
  ["college", "Adults with a bachelor's degree", "ACS share of adults age 25+ with a bachelor's degree or higher"],
  ["renter", "Renter-occupied homes", "ACS share of occupied homes that are renter-occupied"],
  ["age_25_34", "Residents ages 25-34", "ACS share of residents age 25 to 34"],
  ["transit", "Public-transit commuters", "ACS share of commuters using public transit"],
  ["density", "Population density", "Residents per square kilometer"],
];

const PRESETS = [
  ["Younger renter support", { renter: 4, age_25_34: 4, median_age: -3 }],
  ["Dense-area support", { density: 5, transit: 3, college: 2 }],
  ["Income pattern", { income: -4, college: 3, renter: -2 }],
  ["Black population support", { black_share: 5 }],
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
  "#4c9be8",
  "#ec6a63",
  "#43c69b",
  "#b07ae0",
  "#ef9f54",
  "#5bd0d8",
  "#e86fae",
  "#9bc24a",
  "#c98a4b",
  "#6f7fe0",
  "#e0606b",
  "#4fb0c0",
  "#c77fd0",
  "#8aa0b5",
];

const state = {
  data: null,
  contestNumber: null,
  demoSliders: Object.fromEntries(DEMOGRAPHIC_SLIDERS.map(([key]) => [key, 0])),
  turnoutSliders: Object.fromEntries(DEMOGRAPHIC_SLIDERS.map(([key]) => [key, 0])),
  demographicCandidateSelection: new Set(),
  demographicScopeContest: null,
  candidateShifts: {},
  territorySettings: {},
  activePreset: null,
  mapMode: "winner",
  pathsReady: false,
  leafletMap: null,
  precinctGeoLayer: null,
  precinctLayers: new Map(),
  selectedPid: null,
  explorerHoverPid: null,
  latestScenario: null,
  latestSummary: [],
  insightFilters: {
    compareA: null,
    compareB: null,
    explorerCandidate: null,
    explorerOverlay: "",
    explorerFactor: "black_share",
    explorerSpatial: "raw",
    explorerScale: "shared",
    explorerSize: "compact",
    analysisMetric: "",
    explorerMode: "base",
    explorerSizeBy: "primary",
    explorerSizeMag: 1.2,
    explorerNetMode: "factor",
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
  electionTotals: document.querySelector("#electionTotals"),
  map: document.querySelector("#map"),
  legend: document.querySelector("#legend"),
  modeToggle: document.querySelector("#modeToggle"),
  demographicCandidateScope: document.querySelector("#demographicCandidateScope"),
  demographicScopeSummary: document.querySelector("#demographicScopeSummary"),
  demographicCandidateChecklist: document.querySelector("#demographicCandidateChecklist"),
  selectAllDemographicCandidates: document.querySelector("#selectAllDemographicCandidates"),
  clearDemographicCandidates: document.querySelector("#clearDemographicCandidates"),
  impactCards: document.querySelector("#impactCards"),
  impactTitle: document.querySelector("#impactTitle"),
  impactCaption: document.querySelector("#impactCaption"),
  compareCandidateA: document.querySelector("#compareCandidateA"),
  compareCandidateB: document.querySelector("#compareCandidateB"),
  candidateComparison: document.querySelector("#candidateComparison"),
  explorerCandidate: document.querySelector("#explorerCandidate"),
  explorerOverlay: document.querySelector("#explorerOverlay"),
  explorerFactor: document.querySelector("#explorerFactor"),
  explorerSpatial: document.querySelector("#explorerSpatial"),
  explorerScale: document.querySelector("#explorerScale"),
  explorerSize: document.querySelector("#explorerSize"),
  analysisMetric: document.querySelector("#analysisMetric"),
  explorerMode: document.querySelector("#explorerMode"),
  explorerModeField: document.querySelector("#explorerModeField"),
  patternFindings: document.querySelector("#patternFindings"),
  scatterSummary: document.querySelector("#scatterSummary"),
  scatterPlot: document.querySelector("#scatterPlot"),
  scatterTooltip: document.querySelector("#scatterTooltip"),
  explorerRail: document.querySelector("#explorerRail"),
  explorerSizeBy: document.querySelector("#explorerSizeBy"),
  explorerNetMode: document.querySelector("#explorerNetMode"),
  explorerSizeMag: document.querySelector("#explorerSizeMag"),
  explorerSizeMagVal: document.querySelector("#explorerSizeMagVal"),
  scatterSizeLegend: document.querySelector("#scatterSizeLegend"),
  explorerFactorRanks: document.querySelector("#explorerFactorRanks"),
  explorerSideStats: document.querySelector("#explorerSideStats"),
  precinctSearch: document.querySelector("#precinctSearch"),
  precinctCandidate: document.querySelector("#precinctCandidate"),
  precinctSort: document.querySelector("#precinctSort"),
  changedOnly: document.querySelector("#changedOnly"),
  changedOnlyControl: document.querySelector("#changedOnlyControl"),
  precinctTableBody: document.querySelector("#precinctTableBody"),
  precinctTableMeta: document.querySelector("#precinctTableMeta"),
  selectedCandidateHeading: document.querySelector("#selectedCandidateHeading"),
  candidateChangeHeading: document.querySelector("#candidateChangeHeading"),
  turnoutChangeHeading: document.querySelector("#turnoutChangeHeading"),
  precinctCaption: document.querySelector("#precinctCaption"),
  downloadPrecincts: document.querySelector("#downloadPrecincts"),
};

init().catch((error) => {
  console.error(error);
  els.contestMeta.textContent = "Unable to load election data. Use a local web server or GitHub Pages.";
});

async function init() {
  renderDemographicSliders();
  renderPresets();

  const [precincts, candidates, terms, predictions, priorMatches, candidateTerritory, officialContestTotals, geojson] = await Promise.all([
    loadCsv("data/precincts.csv"),
    loadCsv("data/candidates.csv"),
    loadCsv("data/candidate_terms.csv"),
    loadCsv("data/candidate_precinct_predictions.csv"),
    loadCsv("data/prior_matches.csv"),
    loadCsv("data/candidate_territory.csv"),
    loadCsv("data/official_contest_totals.csv"),
    fetch("data/precincts.geojson").then((response) => {
      if (!response.ok) throw new Error("Failed to load data/precincts.geojson");
      return response.json();
    }),
  ]);

  const precinctByPid = new Map(precincts.map((row) => [row.pid, row]));
  const validCandidates = candidates.filter((row) => parseBool(row.valid_model));
  const contests = buildContests(validCandidates);
  const turnoutExposureByFactor = buildTurnoutExposures(precincts);
  const officialTotalsByContest = new Map(
    officialContestTotals.map((row) => [row.contest_number, row])
  );
  const electionWideBallots = calculateElectionWideBallots(predictions, officialContestTotals);
  const electionBallotsByPid = calculateElectionBallotsByPid(predictions, officialContestTotals);
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
    officialContestTotals,
    officialTotalsByContest,
    electionWideBallots,
    electionBallotsByPid,
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
    state.demographicCandidateSelection = new Set();
    state.demographicScopeContest = null;
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

  els.selectAllDemographicCandidates.addEventListener("click", () => {
    state.demographicCandidateSelection = new Set(getContestCandidates().map((row) => row.model_key));
    syncDemographicCandidateScope();
    update();
  });
  els.clearDemographicCandidates.addEventListener("click", () => {
    state.demographicCandidateSelection = new Set();
    syncDemographicCandidateScope();
    update();
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
    if (state.insightFilters.explorerOverlay === state.insightFilters.explorerCandidate) {
      state.insightFilters.explorerOverlay = "";
    }
    syncInsightControls(state.latestSummary);
    renderDemographicExplorer(state.latestScenario);
  });
  els.explorerOverlay.addEventListener("change", () => {
    state.insightFilters.explorerOverlay = els.explorerOverlay.value;
    if (state.insightFilters.explorerOverlay && state.insightFilters.explorerScale === "shared") {
      state.insightFilters.explorerScale = "log";
      els.explorerScale.value = "log";
    }
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
  els.explorerSpatial.addEventListener("change", () => {
    state.insightFilters.explorerSpatial = els.explorerSpatial.value;
    renderDemographicExplorer(state.latestScenario);
  });
  els.analysisMetric.addEventListener("change", () => {
    state.insightFilters.analysisMetric = els.analysisMetric.value;
    if (state.insightFilters.analysisMetric) {
      applyAutomaticFactorSelection();
      setExplorerView("explore");
      flashExplorerControls();
    }
    renderDemographicExplorer(state.latestScenario);
  });
  els.explorerScale.addEventListener("change", () => {
    state.insightFilters.explorerScale = els.explorerScale.value;
    renderDemographicExplorer(state.latestScenario);
  });
  els.explorerSize.addEventListener("change", () => {
    state.insightFilters.explorerSize = els.explorerSize.value;
    renderDemographicExplorer(state.latestScenario);
  });
  if (els.explorerNetMode) {
    els.explorerNetMode.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        state.insightFilters.explorerNetMode = btn.dataset.netmode;
        renderDemographicExplorer(state.latestScenario);
      });
    });
  }
  if (els.explorerSizeBy) {
    els.explorerSizeBy.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        state.insightFilters.explorerSizeBy = btn.dataset.sizeby;
        renderDemographicExplorer(state.latestScenario);
      });
    });
  }
  if (els.explorerSizeMag) {
    els.explorerSizeMag.addEventListener("input", () => {
      state.insightFilters.explorerSizeMag = num(els.explorerSizeMag.value) || 1.2;
      if (els.explorerSizeMagVal) {
        els.explorerSizeMagVal.textContent = `${Number(state.insightFilters.explorerSizeMag).toFixed(1)}\u00d7`;
      }
      renderDemographicExplorer(state.latestScenario);
    });
  }
  if (els.explorerRail) {
    els.explorerRail.querySelectorAll(".erail-btn").forEach((btn) => {
      btn.addEventListener("click", () => setExplorerView(btn.dataset.eview));
    });
  }
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
      <span class="subslider-label"><span>Support shift</span><output data-output="${key}">0.00</output></span>
      <input aria-label="${escapeHtml(label)} support effect" data-slider="${key}" data-slider-kind="demo" type="range" min="-10" max="10" step="0.1" value="0">
      <span class="subslider-label turnout-label"><span>Turnout</span><output data-turnout-output="${key}">0.00%</output></span>
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
    const label = humanContestName(contest);
    return `<option value="${escapeHtml(contest.contest_number)}">${escapeHtml(label)}</option>`;
  }).join("");
}

function humanContestName(contest) {
  const names = {
    "14": "Democratic primary: Delegate to the U.S. House",
    "15": "Democratic primary: Mayor",
    "17": "Democratic primary: At-Large Council",
    "22": "Democratic primary: Attorney General",
    "25": "Democratic Party: National Committeeman",
    "26": "Democratic Party: National Committeewoman",
    "27": "Democratic Party: At-Large Committeeman",
    "28": "Democratic Party: At-Large Committeewoman",
    "75": "Special election: At-Large Council",
  };
  if (names[contest.contest_number]) return names[contest.contest_number];
  return titleCaseContest(contest.contest_name);
}

function titleCaseContest(value) {
  return String(value || "")
    .replace(/^DEM\s+/i, "Democratic primary: ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/U\.s\./g, "U.S.")
    .replace(/D\.c\./g, "D.C.");
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

function calculateElectionWideBallots(predictions, officialContestTotals) {
  const officialBallotProxy = Math.max(0, ...officialContestTotals.map((row) => num(row.total_votes)));
  if (officialBallotProxy > 0) return officialBallotProxy;
  const precinctVotes = new Map();
  for (const row of predictions) {
    const key = `${row.contest_number}|${row.pid}`;
    precinctVotes.set(key, Math.max(precinctVotes.get(key) || 0, num(row.contest_votes)));
  }
  const contestTotals = new Map();
  for (const [key, votes] of precinctVotes.entries()) {
    const contestNumber = key.split("|")[0];
    contestTotals.set(contestNumber, (contestTotals.get(contestNumber) || 0) + votes);
  }
  return Math.max(0, ...contestTotals.values());
}

function calculateElectionBallotsByPid(predictions, officialContestTotals) {
  const anchor = [...officialContestTotals]
    .sort((a, b) => num(b.total_votes) - num(a.total_votes))[0];
  const anchorContest = anchor?.contest_number;
  const byPid = new Map();
  for (const row of predictions) {
    if (anchorContest && row.contest_number !== anchorContest) continue;
    byPid.set(row.pid, Math.max(byPid.get(row.pid) || 0, num(row.contest_votes)));
  }
  const representedTotal = [...byPid.values()].reduce((sum, value) => sum + value, 0);
  const officialTotal = num(anchor?.total_votes);
  if (representedTotal > 0 && officialTotal > representedTotal) {
    const scale = officialTotal / representedTotal;
    for (const [pid, value] of byPid.entries()) byPid.set(pid, value * scale);
  }
  return byPid;
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

function scenarioState() {
  const supportActive = Object.values(state.demoSliders).some((value) => Math.abs(num(value)) > 0.0001)
    || Object.values(state.candidateShifts).some((value) => Math.abs(num(value)) > 0.0001);
  const turnoutActive = Object.values(state.turnoutSliders).some((value) => Math.abs(num(value)) > 0.0001);
  return { active: supportActive || turnoutActive, supportActive, turnoutActive };
}

function syncScenarioVisibility() {
  const status = scenarioState();
  const wasSupportActive = document.body.classList.contains("support-active");
  document.body.classList.toggle("scenario-active", status.active);
  document.body.classList.toggle("support-active", status.supportActive);
  document.body.classList.toggle("turnout-active", status.turnoutActive);

  const changeMode = els.modeToggle.querySelector('[data-mode="change"]');
  changeMode.hidden = !status.supportActive;
  els.explorerModeField.hidden = !status.supportActive;
  els.changedOnlyControl.hidden = !status.supportActive;
  els.candidateChangeHeading.hidden = !status.supportActive;
  els.turnoutChangeHeading.hidden = !status.turnoutActive;

  const changeSort = els.precinctSort.querySelector('[value="change_desc"]');
  const turnoutSort = els.precinctSort.querySelector('[value="turnout_desc"]');
  changeSort.hidden = !status.supportActive;
  turnoutSort.hidden = !status.turnoutActive;

  if (status.supportActive && !wasSupportActive) state.insightFilters.explorerMode = "scenario";
  if (!status.supportActive) {
    state.insightFilters.explorerMode = "base";
    state.insightFilters.changedOnly = false;
    if (state.insightFilters.sort === "change_desc") {
      state.insightFilters.sort = "margin_asc";
    }
    if (state.mapMode === "change") {
      state.mapMode = "winner";
      els.modeToggle.querySelectorAll(".mode-btn").forEach((button) => {
        button.classList.toggle("active", button.dataset.mode === "winner");
      });
    }
  }
  if (!status.turnoutActive && state.insightFilters.sort === "turnout_desc") {
    state.insightFilters.sort = "margin_asc";
  }

  els.impactCaption.textContent = status.active
    ? "How your changes affect the district result."
    : "A quick read of the precinct results.";
  els.impactTitle.textContent = status.active ? "Effect of your changes" : "District at a glance";
  els.precinctCaption.textContent = status.active
    ? "Search, sort, and download the result after your changes."
    : "Search, sort, and download precinct results.";
  return status;
}

function update() {
  if (!state.data || !state.contestNumber) return;

  syncDemographicCandidateScope();
  syncScenarioVisibility();

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

function syncDemographicCandidateScope() {
  const candidates = getContestCandidates();
  const validKeys = new Set(candidates.map((row) => row.model_key));
  if (state.demographicScopeContest !== state.contestNumber) {
    state.demographicCandidateSelection = new Set(candidates[0] ? [candidates[0].model_key] : []);
    state.demographicScopeContest = state.contestNumber;
  }
  state.demographicCandidateSelection = new Set(
    [...state.demographicCandidateSelection].filter((key) => validKeys.has(key))
  );
  const signature = `${state.contestNumber}|${candidates.map((row) => row.model_key).join("|")}`;
  if (els.demographicCandidateChecklist.dataset.signature !== signature) {
    els.demographicCandidateChecklist.innerHTML = candidates.map((row) => `
      <label>
        <input type="checkbox" value="${escapeHtml(row.model_key)}">
        <span class="swatch" style="background:${row.color}"></span>
        <span>${escapeHtml(row.candidate)}</span>
      </label>
    `).join("");
    els.demographicCandidateChecklist.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) state.demographicCandidateSelection.add(input.value);
        else state.demographicCandidateSelection.delete(input.value);
        updateDemographicScopeUI(candidates);
        update();
      });
    });
    els.demographicCandidateChecklist.dataset.signature = signature;
  }
  updateDemographicScopeUI(candidates);
}

function updateDemographicScopeUI(candidates) {
  const selected = state.demographicCandidateSelection;
  els.demographicCandidateChecklist.querySelectorAll("input").forEach((input) => {
    input.checked = selected.has(input.value);
  });
  if (selected.size === candidates.length) els.demographicScopeSummary.textContent = "All candidates";
  else if (selected.size === 0) els.demographicScopeSummary.textContent = "No candidates";
  else if (selected.size === 1) {
    els.demographicScopeSummary.textContent = candidates.find((row) => selected.has(row.model_key))?.candidate || "1 candidate";
  } else els.demographicScopeSummary.textContent = `${selected.size} candidates`;
}

function runScenario(contestNumber) {
  const { validCandidates, predictions } = state.data;
  const candidateRows = validCandidates.filter((row) => row.contest_number === contestNumber);
  const candidateColorByModel = new Map(candidateRows.map((row, index) => [row.model_key, COLORS[index % COLORS.length]]));
  const modelKeys = new Set(candidateRows.map((row) => row.model_key));
  const turnoutByPid = scenarioTurnoutByPid();
  const contestPredictions = predictions
    .filter((row) => row.contest_number === contestNumber && modelKeys.has(row.model_key))
    .map((row) => ({
      ...row,
      color: candidateColorByModel.get(row.model_key),
      base_share: num(row.actual_share),
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

  const initialRowsByPid = groupBy(contestPredictions, (row) => row.pid);
  for (const [pid, precinctRows] of initialRowsByPid.entries()) {
    const selectedRows = precinctRows.filter((row) => state.demographicCandidateSelection.has(row.model_key));
    const unselectedRows = precinctRows.filter((row) => !state.demographicCandidateSelection.has(row.model_key));
    if (!selectedRows.length || !unselectedRows.length) continue;

    let coalitionShift = 0;
    for (const [factor] of DEMOGRAPHIC_SLIDERS) {
      const shift = state.demoSliders[factor] || 0;
      if (shift === 0) continue;
      const exposure = state.data.turnoutExposureByFactor.get(factor)?.get(pid) || 0;
      coalitionShift += shift * exposure;
    }

    const selectedBase = selectedRows.reduce((sum, row) => sum + row.base_share, 0);
    const unselectedBase = unselectedRows.reduce((sum, row) => sum + row.base_share, 0);
    const modeledTotal = selectedBase + unselectedBase;
    const selectedTarget = clamp(selectedBase + coalitionShift, 0, modeledTotal);
    const unselectedTarget = modeledTotal - selectedTarget;

    for (const row of selectedRows) {
      const target = selectedBase > 0
        ? row.base_share * (selectedTarget / selectedBase)
        : selectedTarget / selectedRows.length;
      row.demographic_delta_pp = target - row.base_share;
    }
    for (const row of unselectedRows) {
      const target = unselectedBase > 0
        ? row.base_share * (unselectedTarget / unselectedBase)
        : unselectedTarget / unselectedRows.length;
      row.demographic_delta_pp = target - row.base_share;
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
    const modeledShareTotal = precinctRows.reduce((sum, row) => sum + row.base_share, 0);

    let total = 0;
    for (const row of precinctRows) {
      row.raw_scenario_share = row.base_share + row.delta_pp;
      row.raw_clip = Math.max(row.raw_scenario_share, 0);
      total += row.raw_clip;
    }

    for (const row of precinctRows) {
      row.scenario_share = total > 0 ? (row.raw_clip / total) * modeledShareTotal : 0;
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

  const candidates = [...byCandidate.values()];
  const totals = districtVoteTotals(candidates);

  return candidates
    .map((row) => ({
      ...row,
      share: totals.current > 0 ? (row.votes / totals.current) * 100 : 0,
      base_share: totals.base > 0 ? (row.base_votes / totals.base) * 100 : 0,
    }))
    .sort((a, b) => b.share - a.share);
}

function districtVoteTotals(candidateRows) {
  const namedCurrent = candidateRows.reduce((sum, row) => sum + num(row.votes), 0);
  const namedBase = candidateRows.reduce((sum, row) => sum + num(row.base_votes), 0);
  const official = state.data?.officialTotalsByContest?.get(state.contestNumber);
  if (!official) return { current: namedCurrent, base: namedBase, other: 0 };

  const officialBase = num(official.total_votes);
  const otherBase = Math.max(0, num(official.other_votes) || (officialBase - namedBase));
  const turnoutScale = namedBase > 0 ? namedCurrent / namedBase : 1;
  return {
    current: namedCurrent + (otherBase * turnoutScale),
    base: officialBase,
    other: otherBase * turnoutScale,
  };
}

function renderSummary(summary) {
  if (!summary.length) {
    els.summary.innerHTML = `<p class="empty-state">No candidate estimates are available for this contest.</p>`;
    return;
  }

  const status = scenarioState();
  const candidateRows = summary.map((row) => {
    const delta = row.share - row.base_share;
    const voteDelta = row.votes - row.base_votes;
    const deltaClass = delta >= 0 ? "delta-pos" : "delta-neg";
    const changeDetail = status.active
      ? `, <span class="${voteDelta >= 0 ? "delta-pos" : "delta-neg"}">${formatSignedVotes(voteDelta)} votes</span> from the election result`
      : "";
    return `
      <article class="candidate-row">
        <div class="candidate-main">
          <span class="candidate-name">${escapeHtml(row.candidate)}</span>
          <span class="candidate-result">
            ${status.active ? `<span class="candidate-delta ${deltaClass}">${formatSigned(delta)} pp</span>` : ""}
            <span class="candidate-share">${formatPct(row.share)}</span>
          </span>
        </div>
        <div class="bar-track">
          <div class="bar" style="width:${clamp(row.share, 0, 100)}%; background:${row.color}"></div>
        </div>
        <div class="candidate-detail">${formatVotes(row.votes)} votes${changeDetail}</div>
      </article>
    `;
  }).join("");

  const totals = districtVoteTotals(summary);
  const otherShare = totals.current > 0 ? (totals.other / totals.current) * 100 : 0;
  const otherRow = totals.other >= 0.5 ? `
    <article class="candidate-row other-row">
      <div class="candidate-main">
        <span class="candidate-name">Write-in / other</span>
        <span class="candidate-share">${formatPct(otherShare)}</span>
      </div>
      <div class="bar-track"><div class="bar other-bar" style="width:${clamp(otherShare, 0, 100)}%"></div></div>
      <div class="candidate-detail">${formatVotes(totals.other)} votes included in the official denominator</div>
    </article>
  ` : "";
  els.summary.innerHTML = candidateRows + otherRow;
}

function renderMeta(summary, scenario) {
  const contest = state.data.contests.find((row) => row.contest_number === state.contestNumber);
  const precinctCount = new Set(scenario.rows.map((row) => row.pid)).size;
  const candidateCount = summary.length;
  const voteTotals = districtVoteTotals(summary);
  const totalVotes = voteTotals.current;
  const flippedCount = [...scenario.byPid.keys()].filter((pid) => {
    return scenario.baseWinnerByPid.get(pid) !== scenario.scenarioWinnerByPid.get(pid);
  }).length;

  const status = scenarioState();
  els.contestMeta.textContent = contest
    ? `${humanContestName(contest)} | ${candidateCount} candidates`
    : "";
  const baseVotes = voteTotals.base;
  const turnoutChange = baseVotes > 0 ? ((totalVotes / baseVotes) - 1) * 100 : 0;
  els.mapMeta.textContent = status.active
    ? `${precinctCount} precincts, ${formatVotes(totalVotes)} votes${status.turnoutActive ? ` (${formatSigned(turnoutChange)}% turnout)` : ""}${status.supportActive ? `, ${flippedCount} precinct winner${flippedCount === 1 ? "" : "s"} changed` : ""}. District totals come from precinct results.`
    : `${precinctCount} precincts and ${formatVotes(totalVotes)} votes. District totals come from precinct results.`;
  els.electionTotals.innerHTML = `
    ${status.active ? `<div><span>Selected race after changes</span><strong>${formatVotes(totalVotes)} votes</strong></div>` : ""}
    <div><span>Votes cast in selected race</span><strong>${formatVotes(baseVotes)}</strong></div>
    <div title="Ballots cast election-wide, based on the highest-turnout contest. Contest vote totals are not added together."><span>Ballots cast election-wide</span><strong>${formatVotes(state.data.electionWideBallots)}</strong></div>
  `;
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
  if (!keys.has(filters.explorerOverlay) || filters.explorerOverlay === filters.explorerCandidate) filters.explorerOverlay = "";
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
  els.explorerOverlay.innerHTML = `<option value="">None selected</option>` + candidates
    .filter((row) => row.key !== filters.explorerCandidate)
    .map((row) => `<option value="${escapeHtml(row.key)}">${escapeHtml(row.name)}</option>`)
    .join("");
  els.explorerOverlay.value = filters.explorerOverlay;
  els.precinctCandidate.value = filters.precinctCandidate;

  if (!els.explorerFactor.options.length) {
    els.explorerFactor.innerHTML = `<option value="">None selected</option>`
      + DEMOGRAPHIC_SLIDERS.map(([key, label]) => (
        `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`
      )).join("");
  }
  els.explorerFactor.value = filters.explorerFactor;
  els.explorerSpatial.value = filters.explorerSpatial;
  els.explorerScale.value = filters.explorerScale;
  els.explorerSize.value = filters.explorerSize;
  els.analysisMetric.value = filters.analysisMetric;
  els.explorerMode.value = filters.explorerMode;
  if (els.explorerSizeMag) els.explorerSizeMag.value = filters.explorerSizeMag;
  if (els.explorerSizeMagVal) els.explorerSizeMagVal.textContent = `${Number(filters.explorerSizeMag).toFixed(1)}\u00d7`;
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
  const voteTotals = districtVoteTotals(summary);
  const currentVotes = voteTotals.current;
  const baseVotes = voteTotals.base;
  const turnoutChange = baseVotes > 0 ? ((currentVotes / baseVotes) - 1) * 100 : 0;

  const status = scenarioState();
  const cards = status.active ? [
    ["District leader", leader?.candidate || "None", `${formatPct(leader?.share || 0)} support, ${lead.toFixed(2)}-point lead`],
    ...(status.turnoutActive ? [["Turnout change", `${formatSigned(turnoutChange)}%`, `${formatVotes(currentVotes)} votes after your changes`]] : []),
    ...(status.supportActive ? [["Precincts that flipped", String(flipped), flipped ? "Precincts with a different leader" : "No precinct leaders changed"]] : []),
    ["Largest share movement", mover?.candidate || "None", mover ? `${formatSigned(mover.share - mover.base_share)} points districtwide` : "No change"],
    ["Closest precinct", closest ? `Precinct ${closest.pid}` : "None", closest ? `${closest.margin.toFixed(2)}-point margin` : "No result"],
  ] : [
    ["District leader", leader?.candidate || "None", `${formatPct(leader?.share || 0)} support, ${lead.toFixed(2)}-point lead`],
    ["Votes cast", formatVotes(currentVotes), "Across the precinct results shown"],
    ["Precincts led", String([...scenario.scenarioWinnerByPid.values()].filter((key) => key === leader?.model_key).length), leader?.candidate || "District leader"],
    ["Closest precinct", closest ? `Precinct ${closest.pid}` : "None", closest ? `${closest.margin.toFixed(2)}-point margin` : "No result"],
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

  const status = scenarioState();
  els.candidateComparison.innerHTML = keys.map((key) => {
    const candidate = bySummary.get(key);
    const rows = scenario.rows.filter((row) => row.model_key === key).sort((a, b) => b.scenario_share - a.scenario_share);
    const strongest = rows[0];
    const weakest = rows[rows.length - 1];
    if (!candidate) return "";
    return `
      <article class="comparison-card">
        <h4><span class="swatch" style="background:${candidate.color}"></span>${escapeHtml(candidate.candidate)}</h4>
        <div class="comparison-stat"><span>${status.active ? "After your changes" : "District vote share"}</span><strong>${formatPct(candidate.share)}</strong></div>
        ${status.active ? `<div class="comparison-stat"><span>Election result</span><strong>${formatPct(candidate.base_share)}</strong></div>` : ""}
        <div class="comparison-stat"><span>Precincts leading</span><strong>${winnerCounts.get(key) || 0}</strong></div>
        <div class="comparison-stat"><span>Strongest precinct</span><strong>${strongest ? `${strongest.pid} (${formatPct(strongest.scenario_share)})` : "None"}</strong></div>
        <div class="comparison-stat"><span>Weakest precinct</span><strong>${weakest ? `${weakest.pid} (${formatPct(weakest.scenario_share)})` : "None"}</strong></div>
      </article>
    `;
  }).join("");
}

function renderDemographicExplorer(scenario) {
  if (!scenario) return;
  els.scatterTooltip.hidden = true;
  const key = state.insightFilters.explorerCandidate;
  const overlayKey = state.insightFilters.explorerOverlay;
  const factor = state.insightFilters.explorerFactor;
  const mode = state.insightFilters.explorerMode;
  const spatialMode = state.insightFilters.explorerSpatial;
  const scaleMode = state.insightFilters.explorerScale;
  const chartSize = state.insightFilters.explorerSize;
  const points = explorerPoints(scenario, key, factor, mode, spatialMode);
  const overlayPoints = overlayKey
    ? explorerPoints(scenario, overlayKey, factor, mode, spatialMode)
    : [];
  if (!points.length) {
    els.scatterPlot.innerHTML = "";
    els.scatterSummary.textContent = "No precinct data are available for this selection.";
    els.patternFindings.innerHTML = "";
    return;
  }

  const primaryPlot = preparePlotSeries(points, scaleMode);
  const overlayPlot = preparePlotSeries(overlayPoints, scaleMode);
  const primaryXs = primaryPlot.map((point) => point.x);
  const xs = primaryXs.concat(overlayPoints.map((point) => point.x));
  const primaryYs = points.map((point) => point.y);
  const plottedYs = primaryPlot.concat(overlayPlot).map((point) => point.plotY);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...plottedYs);
  const yMax = Math.max(...plottedYs);
  const rawYMin = Math.min(...points.concat(overlayPoints).map((point) => point.y));
  const rawYMax = Math.max(...points.concat(overlayPoints).map((point) => point.y));
  const correlationValue = correlation(primaryXs, primaryYs);
  const width = Math.max(720, Math.round(els.scatterPlot.parentElement.clientWidth || 720));
  const height = { compact: 280, standard: 380, tall: 520 }[chartSize] || 380;
  const left = 56;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const xScale = (value) => left + ((value - xMin) / Math.max(xMax - xMin, 1)) * (width - left - right);
  const yScale = (value) => height - bottom - ((value - yMin) / Math.max(yMax - yMin, 1)) * (height - top - bottom);
  const candidateName = scenario.candidateRows.find((row) => row.model_key === key)?.candidate || "Candidate";
  const overlayName = scenario.candidateRows.find((row) => row.model_key === overlayKey)?.candidate || "";
  const fit = linearRegression(primaryPlot.map((point) => ({ x: point.x, y: point.plotY })));
  const fitStart = clamp(fit.intercept + (fit.slope * xMin), yMin, yMax);
  const fitEnd = clamp(fit.intercept + (fit.slope * xMax), yMin, yMax);
  const overlayFit = overlayPlot.length
    ? linearRegression(overlayPlot.map((point) => ({ x: point.x, y: point.plotY })))
    : null;
  const overlayFitStart = overlayFit ? clamp(overlayFit.intercept + (overlayFit.slope * xMin), yMin, yMax) : 0;
  const overlayFitEnd = overlayFit ? clamp(overlayFit.intercept + (overlayFit.slope * xMax), yMin, yMax) : 0;
  const overlayCorrelation = overlayPoints.length
    ? correlation(overlayPoints.map((point) => point.x), overlayPoints.map((point) => point.y))
    : null;

  els.scatterSummary.innerHTML = demographicCaption(
    candidateName,
    factorLabel(factor),
    correlationValue,
    mode,
    overlayName,
    overlayCorrelation,
    spatialMode,
    scaleMode,
  );
  renderPatternFindings(scenario, key, overlayKey, mode, spatialMode);

  const explorerActive = scenarioState().active;
  const sizeMag = num(state.insightFilters.explorerSizeMag) || 1.2;
  const hasCompare = Boolean(overlayKey);
  const noFactor = !factor;
  const factorActive = factorSliderActive(factor);
  const requestedMode = state.insightFilters.explorerNetMode === "all" ? "all" : "factor";
  // No characteristic -> "none" (uniform markers, no attribution). Otherwise
  // "From your changes" only means something once sliders have moved.
  let effectiveMode;
  if (noFactor) effectiveMode = explorerActive ? "all" : "none";
  else effectiveMode = (requestedMode === "all" && explorerActive) ? "all" : "factor";

  // Per-precinct vote effect attributable to the selected factor. If that
  // factor's slider is active we use the exact scenario isolation; otherwise we
  // estimate it from the precinct relationship (regression slope), so the
  // estimate exists even with no user changes.
  const factorEffectMap = (effectiveMode === "factor" && explorerActive && factorActive)
    ? precinctFactorEffect(factor)
    : null;
  const meanX = primaryPlot.length ? primaryPlot.reduce((sum, point) => sum + point.x, 0) / primaryPlot.length : 0;
  const slopePrimary = effectiveMode === "factor" ? rawSupportSlope(primaryPlot) : 0;
  const slopeOverlay = (effectiveMode === "factor" && hasCompare) ? rawSupportSlope(overlayPlot) : 0;
  const factorVote = (point, slope) => {
    if (factorEffectMap) {
      const isolated = factorEffectMap.get(`${point.modelKey}|${point.pid}`);
      if (isolated !== undefined) return isolated;
    }
    return (slope * (point.x - meanX) / 100) * point.raceVotes;
  };
  const primaryFactorByPid = effectiveMode === "factor"
    ? new Map(primaryPlot.map((point) => [point.pid, factorVote(point, slopePrimary)]))
    : new Map();
  const overlayFactorByPid = (effectiveMode === "factor" && hasCompare)
    ? new Map(overlayPlot.map((point) => [point.pid, factorVote(point, slopeOverlay)]))
    : null;

  // What each marker's area encodes: scenario delta (your changes), the factor
  // estimate for one candidate, the factor-driven transfer between two, or
  // nothing (uniform) when no characteristic is selected.
  const markerValue = (point, series) => {
    if (effectiveMode === "none") return 0;
    if (effectiveMode === "all") return point.scenarioVotes - point.baseVotes;
    if (!hasCompare) return primaryFactorByPid.get(point.pid) || 0;
    const transfer = (primaryFactorByPid.get(point.pid) || 0) - (overlayFactorByPid.get(point.pid) || 0);
    return series === "primary" ? transfer : -transfer;
  };

  const neutralMarkers = effectiveMode === "none";
  const plottedForBasis = hasCompare ? primaryPlot.concat(overlayPlot) : primaryPlot;
  const sizeBasisMax = plottedForBasis.reduce((max, point) => {
    const magnitude = Math.abs(markerValue(point, "primary"));
    return magnitude > max ? magnitude : max;
  }, 0);

  const netContext = {
    mode: effectiveMode,
    hasCompare,
    factor,
    primaryKey: key,
    overlayKey,
    primaryName: candidateName,
    overlayName,
    primaryByPid: primaryFactorByPid,
    overlayByPid: overlayFactorByPid,
    primaryPlot,
    isolated: Boolean(factorEffectMap),
    basisMax: sizeBasisMax,
    mag: sizeMag,
    r: correlationValue,
  };
  state.explorerNetContext = netContext;

  const primaryMarkers = buildScatterMarkers(primaryPlot, "primary", sizeBasisMax, sizeMag, xScale, yScale, factor, overlayName, (point) => markerValue(point, "primary"), neutralMarkers);
  const overlayMarkers = hasCompare
    ? buildScatterMarkers(overlayPlot, "overlay", sizeBasisMax, sizeMag, xScale, yScale, factor, overlayName, (point) => markerValue(point, "overlay"), neutralMarkers)
    : "";

  const factorModeBtn = els.explorerNetMode ? els.explorerNetMode.querySelector('[data-netmode="factor"]') : null;
  if (factorModeBtn) factorModeBtn.disabled = noFactor;
  const allModeBtn = els.explorerNetMode ? els.explorerNetMode.querySelector('[data-netmode="all"]') : null;
  if (allModeBtn) allModeBtn.disabled = !explorerActive;
  if (els.explorerNetMode) {
    els.explorerNetMode.querySelectorAll(".seg-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.netmode === effectiveMode));
  }

  els.scatterPlot.setAttribute("viewBox", `0 0 ${width} ${height}`);
  els.scatterPlot.style.height = `${height}px`;
  els.scatterPlot.innerHTML = `
    <line class="chart-axis" x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}"></line>
    <line class="chart-axis" x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}"></line>
    <text class="chart-label" x="${left}" y="${height - 14}">${escapeHtml(formatFactorValue(factor, xMin))}</text>
    <text class="chart-label" x="${width - right}" y="${height - 14}" text-anchor="end">${escapeHtml(formatFactorValue(factor, xMax))}</text>
    <text class="chart-label" x="${width / 2}" y="${height - 4}" text-anchor="middle">${escapeHtml(factorLabel(factor))}</text>
    <text class="chart-label" x="${left - 8}" y="${height - bottom}" text-anchor="end">${scaleMode === "relative" ? "Low" : `${rawYMin.toFixed(0)}%`}</text>
    <text class="chart-label" x="${left - 8}" y="${top + 4}" text-anchor="end">${scaleMode === "relative" ? "High" : `${rawYMax.toFixed(0)}%`}</text>
    <line class="best-fit-line" x1="${xScale(xMin).toFixed(2)}" y1="${yScale(fitStart).toFixed(2)}" x2="${xScale(xMax).toFixed(2)}" y2="${yScale(fitEnd).toFixed(2)}"></line>
    ${overlayFit ? `<line class="best-fit-line overlay-fit-line" style="stroke:${overlayPoints[0].color}" x1="${xScale(xMin).toFixed(2)}" y1="${yScale(overlayFitStart).toFixed(2)}" x2="${xScale(xMax).toFixed(2)}" y2="${yScale(overlayFitEnd).toFixed(2)}"></line>` : ""}
    ${primaryMarkers}
    ${overlayMarkers}
  `;
  bindScatterTooltips(primaryPlot, overlayPlot, candidateName, overlayName, factor, spatialMode);
  renderScatterSizeLegend(netContext);
  renderExplorerSideStats(netContext);
  renderExplorerFactorRanks(scenario, key, overlayKey, mode, spatialMode);
}

function preparePlotSeries(points, scaleMode) {
  if (!points.length) return [];
  if (scaleMode === "relative") {
    const min = Math.min(...points.map((point) => point.y));
    const max = Math.max(...points.map((point) => point.y));
    return points.map((point) => ({
      ...point,
      plotY: max > min ? ((point.y - min) / (max - min)) * 100 : 50,
    }));
  }
  return points.map((point) => ({
    ...point,
    plotY: scaleMode === "log" ? Math.log1p(Math.max(0, point.y)) : point.y,
  }));
}

function explorerPoints(scenario, modelKey, factor, mode, spatialMode) {
  const column = FACTOR_COLUMNS[factor];
  const points = scenario.rows
    .filter((row) => row.model_key === modelKey)
    .map((row) => {
      const precinct = state.data.precinctByPid.get(row.pid);
      const xValue = factor ? num(precinct?.[column]) : num(row.contest_votes);
      return {
        pid: row.pid,
        modelKey,
        x: xValue,
        y: mode === "base" ? row.base_share : row.scenario_share,
        rawX: xValue,
        rawY: mode === "base" ? row.base_share : row.scenario_share,
        color: row.color,
        cx: num(precinct?.cx),
        cy: num(precinct?.cy),
        baseVotes: (row.base_share / 100) * num(row.contest_votes),
        scenarioVotes: row.scenario_votes,
        raceVotes: num(row.contest_votes),
        scenarioRaceVotes: num(row.contest_votes) * row.turnout_multiplier,
        electionBallots: num(state.data.electionBallotsByPid.get(row.pid)),
      };
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  return spatialMode === "nearby" ? nearbyAverage(points) : points;
}

function nearbyAverage(points) {
  return points.map((point) => {
    const neighbors = points
      .map((other) => ({
        ...other,
        distance: Math.hypot(point.cx - other.cx, point.cy - other.cy),
      }))
      .sort((a, b) => a.distance - b.distance)
      .filter((other, index) => index < 7 && (index < 3 || other.distance <= 2000));
    const weighted = neighbors.map((other) => ({
      ...other,
      weight: Math.exp(-other.distance / 750),
    }));
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0) || 1;
    return {
      ...point,
      x: weighted.reduce((sum, item) => sum + (item.x * item.weight), 0) / totalWeight,
      y: weighted.reduce((sum, item) => sum + (item.y * item.weight), 0) / totalWeight,
    };
  });
}

function bindScatterTooltips(primaryPoints, overlayPoints, primaryName, overlayName, factor, spatialMode) {
  els.scatterPlot.querySelectorAll("[data-scatter-series]").forEach((circle) => {
    const series = circle.dataset.scatterSeries;
    const points = series === "overlay" ? overlayPoints : primaryPoints;
    const point = points[Number(circle.dataset.scatterIndex)];
    if (!point) return;
    circle.addEventListener("mousemove", (event) => {
      const candidateName = series === "overlay" ? overlayName : primaryName;
      showScatterTooltip(event, point, candidateName, factor, spatialMode);
      highlightPrecinctOnMap(point.pid);
    });
    circle.addEventListener("mouseleave", () => {
      els.scatterTooltip.hidden = true;
      clearExplorerHighlight();
    });
    circle.addEventListener("click", () => {
      selectPrecinctOnMap(point.pid === state.selectedPid ? null : point.pid);
    });
  });
}

function showScatterTooltip(event, point, candidateName, factor, spatialMode) {
  const voteDelta = point.scenarioVotes - point.baseVotes;
  const voteLabel = voteDelta < -0.5
    ? "Estimated vote loss"
    : voteDelta > 0.5 ? "Estimated vote gain" : "Estimated vote change";
  const nearbyNote = spatialMode === "nearby"
    ? `<div><span>Nearby average</span><strong>${formatFactorValue(factor, point.x)}; ${formatPct(point.y)} support</strong></div>`
    : "";
  const actualValue = spatialMode === "nearby"
    ? `<div><span>Precinct itself</span><strong>${formatFactorValue(factor, point.rawX)}; ${formatPct(point.rawY)} support</strong></div>`
    : `<div><span>${escapeHtml(factorLabel(factor))}</span><strong>${formatFactorValue(factor, point.rawX)}</strong></div><div><span>Candidate support</span><strong>${formatPct(point.rawY)}</strong></div>`;
  const change = scenarioState().active
    ? `<div><span>${voteLabel}</span><strong class="${voteDelta >= 0 ? "delta-pos" : "delta-neg"}">${formatSignedVotes(voteDelta)} votes</strong></div>`
    : "";
  const netCtx = state.explorerNetContext;
  let isolatedLine = "";
  if (netCtx && netCtx.mode === "factor" && netCtx.primaryByPid) {
    const isPrimary = point.modelKey === netCtx.primaryKey;
    const own = (isPrimary ? netCtx.primaryByPid : (netCtx.overlayByPid || new Map())).get(point.pid);
    const factorName = escapeHtml(FACTOR_LABELS[netCtx.factor].toLowerCase());
    if (own !== undefined) {
      isolatedLine += `<div><span>Est. from ${factorName}</span><strong class="${own >= 0 ? "delta-pos" : "delta-neg"}">${formatSignedVotes(own)} votes</strong></div>`;
    }
    if (netCtx.hasCompare && netCtx.overlayByPid) {
      const transfer = (netCtx.primaryByPid.get(point.pid) || 0) - (netCtx.overlayByPid.get(point.pid) || 0);
      const toward = transfer >= 0 ? netCtx.primaryName : netCtx.overlayName;
      isolatedLine += `<div><span>Net transfer</span><strong class="${transfer >= 0 ? "delta-pos" : "delta-neg"}">${formatVotes(Math.abs(transfer))} to ${escapeHtml(toward)}</strong></div>`;
    }
  }
  const raceVotes = scenarioState().turnoutActive
    ? `${formatVotes(point.scenarioRaceVotes)} after turnout change (${formatVotes(point.raceVotes)} in result)`
    : `${formatVotes(point.raceVotes)}`;
  els.scatterTooltip.innerHTML = `
    <strong>${escapeHtml(candidateName)} · Precinct ${escapeHtml(point.pid)}</strong>
    ${nearbyNote}${actualValue}${change}${isolatedLine}
    <div><span>Votes recorded in this race</span><strong>${raceVotes}</strong></div>
    <div><span>Estimated election ballots</span><strong>${formatVotes(point.electionBallots)}</strong></div>
  `;
  els.scatterTooltip.hidden = false;
  const shell = els.scatterPlot.parentElement;
  const rect = shell.getBoundingClientRect();
  const tooltipRect = els.scatterTooltip.getBoundingClientRect();
  const left = clamp(event.clientX - rect.left + 12, 8, Math.max(8, rect.width - tooltipRect.width - 8));
  const top = clamp(event.clientY - rect.top - tooltipRect.height - 10, 8, Math.max(8, rect.height - tooltipRect.height - 8));
  els.scatterTooltip.style.left = `${left}px`;
  els.scatterTooltip.style.top = `${top}px`;
}

function renderPatternFindings(scenario, key, overlayKey, mode, spatialMode) {
  const metric = state.insightFilters.analysisMetric;
  if (!metric) {
    els.patternFindings.hidden = true;
    els.patternFindings.innerHTML = "";
    return;
  }
  els.patternFindings.hidden = false;
  const candidates = new Map(scenario.candidateRows.map((row) => [row.model_key, row.candidate]));
  const primaryName = candidates.get(key) || "Selected candidate";
  const overlayName = candidates.get(overlayKey) || "";

  if (metric === "votes") {
    els.patternFindings.innerHTML = voteEffectFinding(scenario, key, overlayKey, primaryName, overlayName);
    return;
  }

  const ranked = DEMOGRAPHIC_SLIDERS.map(([factor, label]) => {
    const primary = explorerPoints(scenario, key, factor, mode, spatialMode);
    const primaryR = correlation(primary.map((point) => point.x), primary.map((point) => point.y));
    const overlay = overlayKey ? explorerPoints(scenario, overlayKey, factor, mode, spatialMode) : [];
    const overlayR = overlay.length
      ? correlation(overlay.map((point) => point.x), overlay.map((point) => point.y))
      : null;
    return {
      factor,
      label,
      primaryR,
      overlayR,
      score: Math.max(Math.abs(primaryR), Math.abs(overlayR || 0)),
    };
  }).sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const comparison = overlayName
    ? ` ${escapeHtml(overlayName)}: r = ${top.overlayR.toFixed(2)}.`
    : "";
  els.patternFindings.innerHTML = `
    <article class="finding-card">
      <span class="finding-kicker">Strongest geographic relationship</span>
      <strong>${escapeHtml(top.label)}</strong>
      <p>${escapeHtml(primaryName)}: r = ${top.primaryR.toFixed(2)}.${comparison}</p>
      <div class="finding-ranks">${ranked.slice(0, 3).map((item, index) => `
        <button type="button" data-finding-factor="${escapeHtml(item.factor)}"><span>${index + 1}</span>${escapeHtml(item.label)} <b>r = ${item.primaryR.toFixed(2)}</b></button>
      `).join("")}</div>
      <small>Ranked across the available precinct characteristics. Correlation describes places, not individual voters.</small>
    </article>
  `;
  els.patternFindings.querySelectorAll("[data-finding-factor]").forEach((button) => {
    button.addEventListener("click", () => {
      state.insightFilters.explorerFactor = button.dataset.findingFactor;
      els.explorerFactor.value = button.dataset.findingFactor;
      renderDemographicExplorer(scenario);
    });
  });
}

function applyAutomaticFactorSelection() {
  const scenario = state.latestScenario;
  const metric = state.insightFilters.analysisMetric;
  if (!scenario || !metric) return;
  const key = state.insightFilters.explorerCandidate;
  const overlayKey = state.insightFilters.explorerOverlay;
  let topFactor = null;

  if (metric === "votes") {
    if (!scenarioState().active) return;
    const ranked = marginalFactorEffects().map((effect) => {
      const primary = effect.byCandidate.get(key) || 0;
      const overlay = overlayKey ? effect.byCandidate.get(overlayKey) || 0 : 0;
      return { factor: effect.factor, score: Math.abs(overlayKey ? primary - overlay : primary) };
    }).sort((a, b) => b.score - a.score);
    topFactor = ranked[0]?.factor || null;
  } else {
    const mode = state.insightFilters.explorerMode;
    const spatialMode = state.insightFilters.explorerSpatial;
    const ranked = DEMOGRAPHIC_SLIDERS.map(([factor]) => {
      const primary = explorerPoints(scenario, key, factor, mode, spatialMode);
      const primaryR = correlation(primary.map((point) => point.x), primary.map((point) => point.y));
      const overlay = overlayKey ? explorerPoints(scenario, overlayKey, factor, mode, spatialMode) : [];
      const overlayR = overlay.length
        ? correlation(overlay.map((point) => point.x), overlay.map((point) => point.y))
        : 0;
      return { factor, score: Math.max(Math.abs(primaryR), Math.abs(overlayR)) };
    }).sort((a, b) => b.score - a.score);
    topFactor = ranked[0]?.factor || null;
  }

  if (topFactor) {
    state.insightFilters.explorerFactor = topFactor;
    els.explorerFactor.value = topFactor;
  }
}

let explorerFactorEffectCache = { signature: null, map: null };

function scenarioSignature() {
  return JSON.stringify([
    state.contestNumber,
    state.demoSliders,
    state.turnoutSliders,
    state.candidateShifts,
    state.territorySettings,
    [...state.demographicCandidateSelection],
  ]);
}

// Isolated per-precinct effect of one factor: current scenario votes minus the
// votes from a scenario with that factor's support + turnout zeroed. Keyed by
// `${model_key}|${pid}`. Returns null when the factor has no active slider.
function precinctFactorEffect(factor) {
  const support = state.demoSliders[factor] || 0;
  const turnout = state.turnoutSliders[factor] || 0;
  if (support === 0 && turnout === 0) return null;
  if (!state.latestScenario) return null;

  const signature = `${scenarioSignature()}::${factor}`;
  if (explorerFactorEffectCache.signature === signature) return explorerFactorEffectCache.map;

  const currentByKey = new Map();
  for (const row of state.latestScenario.rows) {
    currentByKey.set(`${row.model_key}|${row.pid}`, row.scenario_votes);
  }
  state.demoSliders[factor] = 0;
  state.turnoutSliders[factor] = 0;
  const without = runScenario(state.contestNumber);
  state.demoSliders[factor] = support;
  state.turnoutSliders[factor] = turnout;

  const map = new Map();
  for (const row of without.rows) {
    const key = `${row.model_key}|${row.pid}`;
    map.set(key, (currentByKey.get(key) || 0) - row.scenario_votes);
  }
  explorerFactorEffectCache = { signature, map };
  return map;
}

function factorSliderActive(factor) {
  return (state.demoSliders[factor] || 0) !== 0 || (state.turnoutSliders[factor] || 0) !== 0;
}

function rawSupportSlope(plot) {
  if (plot.length < 2) return 0;
  const fit = linearRegression(plot.map((point) => ({ x: point.x, y: point.y })));
  return Number.isFinite(fit.slope) ? fit.slope : 0;
}

function buildScatterMarkers(plot, seriesName, basisMax, mag, xScale, yScale, factor, overlayName, valueFn, neutral) {
  const MIN = 4;
  const RANGE = 20;
  return plot.map((point, index) => {
    const cx = xScale(point.x);
    const cy = yScale(point.plotY);
    const value = valueFn(point);
    let side;
    let fill;
    let stroke;
    if (neutral) {
      side = 7;
      fill = seriesName === "overlay" ? "#0e131c" : point.color;
      stroke = point.color;
    } else {
      const norm = basisMax > 0 ? Math.sqrt(Math.abs(value) / basisMax) : 0;
      side = (MIN + (norm * RANGE)) * mag;
      fill = value >= 0 ? "#9ad7c8" : "#f2a69a";
      stroke = value >= 0 ? "#5fae9a" : "#cf7f6a";
    }
    const half = side / 2;
    const isSelected = point.pid === state.selectedPid;
    const strokeWidth = isSelected ? 2.6 : 1;
    const finalStroke = isSelected ? "#fff3c4" : stroke;
    const titleName = seriesName === "overlay" ? `${escapeHtml(overlayName)}, ` : "";
    const estNote = neutral ? "" : `, ${formatSignedVotes(value)} est. votes`;
    const title = `<title>${titleName}Precinct ${escapeHtml(point.pid)}: ${formatFactorValue(factor, point.x)}, ${formatPct(point.y)} support${estNote}</title>`;
    if (seriesName === "overlay") {
      const pts = `${cx.toFixed(2)},${(cy - half).toFixed(2)} ${(cx + half).toFixed(2)},${cy.toFixed(2)} ${cx.toFixed(2)},${(cy + half).toFixed(2)} ${(cx - half).toFixed(2)},${cy.toFixed(2)}`;
      return `<polygon class="scatter-point${neutral ? " overlay-point" : " sized"}${isSelected ? " selected" : ""}" data-scatter-series="overlay" data-scatter-index="${index}" points="${pts}" fill="${fill}" style="stroke:${finalStroke};stroke-width:${strokeWidth}">${title}</polygon>`;
    }
    return `<rect class="scatter-point${neutral ? "" : " sized"}${isSelected ? " selected" : ""}" data-scatter-series="primary" data-scatter-index="${index}" x="${(cx - half).toFixed(2)}" y="${(cy - half).toFixed(2)}" width="${side.toFixed(2)}" height="${side.toFixed(2)}" fill="${fill}" style="stroke:${finalStroke};stroke-width:${strokeWidth}">${title}</rect>`;
  }).join("");
}

function renderScatterSizeLegend(ctx) {
  if (!els.scatterSizeLegend) return;
  const { basisMax, mag, mode, hasCompare, primaryName, overlayName, factor, isolated } = ctx;
  if (mode === "none") {
    els.scatterSizeLegend.innerHTML = `<span class="legend-note">No characteristic selected \u2014 markers uniform.</span>`;
    return;
  }
  if (!(basisMax > 0)) {
    els.scatterSizeLegend.innerHTML = `<span class="legend-note">No estimated vote effect for this selection.</span>`;
    return;
  }
  const MIN = 4;
  const RANGE = 20;
  const sideFor = (value) => (MIN + ((basisMax > 0 ? Math.sqrt(value / basisMax) : 0) * RANGE)) * mag;
  const steps = [0.2, 0.55, 1]
    .map((fraction) => Math.round(basisMax * fraction))
    .filter((value, index, all) => value > 0 && all.indexOf(value) === index);
  const swatches = steps.map((value) => {
    const dimension = Math.max(4, sideFor(value));
    return `<span class="legend-size"><i style="width:${dimension.toFixed(0)}px;height:${dimension.toFixed(0)}px"></i>${formatVotes(value)}</span>`;
  }).join("");

  let lead;
  let sign;
  if (mode === "all") {
    lead = "Your changes";
    sign = `<span class="legend-sign"><i class="pos"></i>adds</span><span class="legend-sign"><i class="neg"></i>removes</span>`;
  } else if (hasCompare) {
    lead = `Transfer \u00b7 ${escapeHtml(FACTOR_LABELS[factor])}`;
    sign = `<span class="legend-sign"><i class="pos"></i>to ${escapeHtml(primaryName)}</span><span class="legend-sign"><i class="neg"></i>to ${escapeHtml(overlayName)}</span>`;
  } else {
    lead = escapeHtml(FACTOR_LABELS[factor]);
    sign = `<span class="legend-sign"><i class="pos"></i>adds</span><span class="legend-sign"><i class="neg"></i>removes</span>`;
  }
  const basisNote = mode === "all"
    ? "from your changes"
    : (isolated ? "isolated from your shift" : "estimated from precinct pattern");
  els.scatterSizeLegend.innerHTML = `<span class="legend-lead">${lead}</span>${swatches}${sign}<span class="legend-note">${basisNote}</span>`;
}

function renderExplorerSideStats(ctx) {
  if (!els.explorerSideStats) return;
  const { mode, hasCompare, factor, primaryName, overlayName, primaryByPid, overlayByPid, primaryPlot, r } = ctx;
  const count = primaryPlot.length;
  let rows;
  let note;
  if (mode === "none") {
    rows = [
      ["Correlation r", r.toFixed(2)],
      ["Precincts", String(count)],
    ];
    note = "Select a characteristic to estimate the votes it moves per precinct.";
    els.explorerSideStats.innerHTML = `<span class="eside-title">${escapeHtml(factorLabel(factor))}</span>`
      + rows.map(([label, value]) => `<div class="eside-row"><span>${escapeHtml(label)}</span><b>${value}</b></div>`).join("")
      + `<p class="eside-note">${note}</p>`;
    return;
  }
  if (mode === "all") {
    const net = primaryPlot.reduce((sum, point) => sum + (point.scenarioVotes - point.baseVotes), 0);
    const adds = primaryPlot.filter((point) => (point.scenarioVotes - point.baseVotes) > 0.5).length;
    rows = [
      ["Correlation r", r.toFixed(2)],
      ["Net votes, total", formatSignedVotes(net)],
      ["Precincts adding", `${adds} / ${count}`],
      ["Precincts", String(count)],
    ];
    note = "Reflects your scenario changes \u2014 precinct patterns, not individual voters.";
  } else if (hasCompare) {
    let transferTotal = 0;
    let favorsPrimary = 0;
    primaryPlot.forEach((point) => {
      const transfer = (primaryByPid.get(point.pid) || 0) - (overlayByPid.get(point.pid) || 0);
      transferTotal += transfer;
      if (transfer > 0.5) favorsPrimary += 1;
    });
    const towardName = transferTotal >= 0 ? primaryName : overlayName;
    rows = [
      ["Correlation r", r.toFixed(2)],
      ["Net factor transfer", `${formatVotes(Math.abs(transferTotal))} to ${escapeHtml(towardName)}`],
      [`Precincts favoring ${primaryName}`, `${favorsPrimary} / ${count}`],
      ["Precincts", String(count)],
    ];
    note = `Estimated transfer between ${escapeHtml(primaryName)} and ${escapeHtml(overlayName)} associated with ${escapeHtml(FACTOR_LABELS[factor].toLowerCase())} \u2014 precinct patterns, not individual voters.`;
  } else {
    let total = 0;
    let adds = 0;
    primaryPlot.forEach((point) => {
      const value = primaryByPid.get(point.pid) || 0;
      total += value;
      if (value > 0.5) adds += 1;
    });
    rows = [
      ["Correlation r", r.toFixed(2)],
      ["Est. votes from factor", formatSignedVotes(total)],
      ["Precincts adding", `${adds} / ${count}`],
      ["Precincts", String(count)],
    ];
    note = `Estimated votes associated with ${escapeHtml(FACTOR_LABELS[factor].toLowerCase())} \u2014 precinct patterns, not individual voters.`;
  }
  els.explorerSideStats.innerHTML = `<span class="eside-title">${escapeHtml(FACTOR_LABELS[factor])}</span>`
    + rows.map(([label, value]) => `<div class="eside-row"><span>${escapeHtml(label)}</span><b>${value}</b></div>`).join("")
    + `<p class="eside-note">${note}</p>`;
}

function renderExplorerFactorRanks(scenario, key, overlayKey, mode, spatialMode) {
  if (!els.explorerFactorRanks) return;
  const ranked = DEMOGRAPHIC_SLIDERS.map(([factor, label]) => {
    const primary = explorerPoints(scenario, key, factor, mode, spatialMode);
    const r = correlation(primary.map((point) => point.x), primary.map((point) => point.y));
    return { factor, label, r: Number.isFinite(r) ? r : 0 };
  }).sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  const maxAbs = Math.max(...ranked.map((item) => Math.abs(item.r)), 0.0001);
  els.explorerFactorRanks.innerHTML = ranked.map((item) => {
    const pct = (Math.abs(item.r) / maxAbs) * 50;
    const neg = item.r < 0;
    const activeClass = item.factor === state.insightFilters.explorerFactor ? " active" : "";
    const fillStyle = neg ? `right:50%;width:${pct.toFixed(1)}%` : `left:50%;width:${pct.toFixed(1)}%`;
    return `<button type="button" class="frank${activeClass}" data-rank-factor="${escapeHtml(item.factor)}">
      <span class="frank-label">${escapeHtml(item.label)}</span>
      <span class="frank-track"><span class="frank-zero"></span><span class="frank-fill ${neg ? "neg" : "pos"}" style="${fillStyle}"></span></span>
      <span class="frank-val ${neg ? "neg" : "pos"}">r ${item.r.toFixed(2)}</span>
    </button>`;
  }).join("");
  els.explorerFactorRanks.querySelectorAll("[data-rank-factor]").forEach((button) => {
    button.addEventListener("click", () => {
      state.insightFilters.explorerFactor = button.dataset.rankFactor;
      els.explorerFactor.value = button.dataset.rankFactor;
      setExplorerView("explore");
      renderDemographicExplorer(state.latestScenario);
    });
  });
}

function setExplorerView(view) {
  document.querySelectorAll(".explorer-rail .erail-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.eview === view);
  });
  document.querySelectorAll(".explorer-view").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.eview === view);
  });
  if (view === "explore" && state.latestScenario) {
    renderDemographicExplorer(state.latestScenario);
  }
}

function flashExplorerControls() {
  [els.explorerFactor, els.analysisMetric].forEach((element) => {
    if (!element) return;
    element.classList.remove("control-flash");
    void element.offsetWidth;
    element.classList.add("control-flash");
    setTimeout(() => element.classList.remove("control-flash"), 1100);
  });
}

function voteEffectFinding(scenario, key, overlayKey, primaryName, overlayName) {
  const status = scenarioState();
  if (!status.active) {
    return `<article class="finding-card finding-empty"><span class="finding-kicker">Estimated vote effect</span><strong>Make a support or turnout change first</strong><p>This view ranks the active settings by their estimated effect on candidate vote totals.</p></article>`;
  }

  const currentByKey = new Map(state.latestSummary.map((row) => [row.model_key, row]));
  const primary = currentByKey.get(key);
  const overlay = currentByKey.get(overlayKey);
  const effects = marginalFactorEffects();
  const ranked = effects.map((effect) => {
    const primaryEffect = effect.byCandidate.get(key) || 0;
    const overlayEffect = overlayKey ? effect.byCandidate.get(overlayKey) || 0 : 0;
    return {
      ...effect,
      primaryEffect,
      overlayEffect,
      value: overlayKey ? primaryEffect - overlayEffect : primaryEffect,
    };
  }).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const top = ranked[0];

  let headline;
  let detail;
  if (overlay && primary) {
    const advantageChange = (primary.votes - overlay.votes) - (primary.base_votes - overlay.base_votes);
    const beneficiary = advantageChange >= 0 ? primaryName : overlayName;
    headline = `${beneficiary}'s relative advantage improves by ${formatVotes(Math.abs(advantageChange))} votes`;
    const topBeneficiary = top?.value >= 0 ? primaryName : overlayName;
    detail = top
      ? `${top.label} has the largest isolated effect on that gap: ${formatVotes(Math.abs(top.value))} votes toward ${topBeneficiary}.`
      : "No active demographic or turnout factor can be isolated.";
  } else {
    const voteChange = primary ? primary.votes - primary.base_votes : 0;
    headline = `${primaryName}: ${formatSignedVotes(voteChange)} votes versus the election result`;
    detail = top
      ? `${top.label} has the largest isolated estimate: ${formatSignedVotes(top.primaryEffect)} votes.`
      : "No active demographic or turnout factor can be isolated.";
  }

  return `
    <article class="finding-card">
      <span class="finding-kicker">Largest estimated vote effect</span>
      <strong>${escapeHtml(headline)}</strong>
      <p>${escapeHtml(detail)}</p>
      ${ranked.length ? `<div class="finding-ranks">${ranked.slice(0, 3).map((item, index) => `
        <span><i>${index + 1}</i>${escapeHtml(item.label)} <b>${formatSignedVotes(item.value)} votes</b></span>
      `).join("")}</div>` : ""}
      <small>Each estimate reruns the precinct results with one active setting removed. It is not evidence that individual voters switched candidates.</small>
    </article>
  `;
}

function marginalFactorEffects() {
  const currentByKey = new Map(state.latestSummary.map((row) => [row.model_key, row]));
  const effects = [];
  for (const [factor, label] of DEMOGRAPHIC_SLIDERS) {
    const supportValue = state.demoSliders[factor] || 0;
    const turnoutValue = state.turnoutSliders[factor] || 0;
    if (supportValue === 0 && turnoutValue === 0) continue;
    state.demoSliders[factor] = 0;
    state.turnoutSliders[factor] = 0;
    const withoutFactor = summarizeScenario(runScenario(state.contestNumber).rows);
    state.demoSliders[factor] = supportValue;
    state.turnoutSliders[factor] = turnoutValue;
    const alternativeByKey = new Map(withoutFactor.map((row) => [row.model_key, row]));
    const byCandidate = new Map();
    for (const [modelKey, current] of currentByKey.entries()) {
      byCandidate.set(modelKey, current.votes - (alternativeByKey.get(modelKey)?.votes || 0));
    }
    effects.push({ factor, label, byCandidate, supportValue, turnoutValue });
  }
  return effects;
}

function renderPrecinctTable(scenario) {
  if (!scenario) return;
  const status = scenarioState();
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
  els.selectedCandidateHeading.textContent = `${selectedName} support`;
  els.precinctTableBody.innerHTML = rows.map((row) => `
    <tr class="${row.changed ? "changed-row" : ""}">
      <td>${escapeHtml(row.pid)}</td>
      <td>${escapeHtml(row.winner)}</td>
      <td>${formatPct(row.winner_share)}</td>
      <td>${row.margin.toFixed(2)} points</td>
      <td>${formatPct(row.candidate_share)}</td>
      ${status.supportActive ? `<td class="${row.candidate_change >= 0 ? "delta-pos" : "delta-neg"}">${formatSigned(row.candidate_change)} points</td>` : ""}
      ${status.turnoutActive ? `<td>${formatSigned(row.turnout_change)}%</td>` : ""}
    </tr>
  `).join("");
  els.precinctTableMeta.textContent = `${rows.length} precinct${rows.length === 1 ? "" : "s"} shown.`;
}

function downloadPrecinctTable() {
  const rows = state.latestTableRows || [];
  const status = scenarioState();
  const headers = ["precinct", "winner", "winner_share", "margin", "candidate_share"]
    .concat(status.supportActive ? ["candidate_change", "winner_changed"] : [])
    .concat(status.turnoutActive ? ["turnout_change"] : []);
  const csvRows = [headers.join(",")].concat(rows.map((row) => [
    row.pid, row.winner, row.winner_share, row.margin, row.candidate_share,
    ...(status.supportActive ? [row.candidate_change, row.changed] : []),
    ...(status.turnoutActive ? [row.turnout_change] : []),
  ].map(csvCell).join(",")));
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `dc-election-precincts-${state.contestNumber}.csv`;
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

function linearRegression(points) {
  if (points.length < 2) return { slope: 0, intercept: points[0]?.y || 0 };
  const xMean = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const yMean = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  let numerator = 0;
  let denominator = 0;
  for (const point of points) {
    numerator += (point.x - xMean) * (point.y - yMean);
    denominator += (point.x - xMean) ** 2;
  }
  const slope = denominator > 0 ? numerator / denominator : 0;
  return { slope, intercept: yMean - (slope * xMean) };
}

function correlationDescription(value) {
  const strength = Math.abs(value) >= 0.65 ? "strong" : Math.abs(value) >= 0.35 ? "moderate" : "weak";
  const direction = value >= 0 ? "positive" : "negative";
  return `${strength} ${direction}`;
}

function demographicCaption(candidateName, factorLabel, value, mode, overlayName = "", overlayValue = null, spatialMode = "raw", scaleMode = "shared") {
  const factor = escapeHtml(factorLabel.toLowerCase());
  const strength = Math.abs(value) < 0.2 ? "weak" : Math.abs(value) < 0.45 ? "moderate" : "strong";
  const overlay = overlayName && overlayValue !== null
    ? ` \u00b7 <strong>${escapeHtml(overlayName)}</strong> r ${overlayValue.toFixed(2)}`
    : "";
  const geography = spatialMode === "nearby" ? " \u00b7 nearby avg" : "";
  const scale = scaleMode === "log" ? " \u00b7 log scale" : scaleMode === "relative" ? " \u00b7 relative scale" : "";
  return `<strong>${escapeHtml(candidateName)}</strong> \u00d7 ${factor}: r ${value.toFixed(2)} (${strength})${overlay}${geography}${scale} \u00b7 precinct patterns, not individual voters`;
}

function factorLabel(factor) {
  return FACTOR_LABELS[factor] || "Turnout (votes cast)";
}

function formatFactorValue(factor, value) {
  if (!factor) return `${Math.round(value).toLocaleString("en-US")} votes`;
  if (factor === "income") return `$${Math.round(value).toLocaleString("en-US")}`;
  if (factor === "density") return `${Math.round(value).toLocaleString("en-US")}/km²`;
  if (factor === "median_age") return `${value.toFixed(2)} years`;
  return `${value.toFixed(2)}%`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function renderMapTitle() {
  const active = scenarioState().supportActive;
  const titles = {
    winner: active ? "Precinct winners after your changes" : "Precinct winners",
    margin: active ? "Winning margins after your changes" : "Precinct winning margins",
    change: "Change from the election result",
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
          <div class="choropleth-bar" style="background:linear-gradient(to right,#16263b,#9fc0e6,#eef5ff)"></div>
          <div class="choropleth-labels"><span>Narrow</span><span>Decisive</span></div>
        </div>
      `);
    }
    return;
  }

  els.legend.innerHTML = `
    ${flipLegend()}
    <div class="choropleth-legend">
      <div class="choropleth-bar" style="background:linear-gradient(to right,#8f3341,#c98a90,#727d89,#7692b1,#dcecff)"></div>
      <div class="choropleth-labels"><span>Down</span><span>Up</span></div>
    </div>
  `;
}

function flipLegend() {
  if (!scenarioState().supportActive) return "";
  return `
    <span class="legend-item">
      <span class="swatch swatch-flip"></span>
      Winner changed
    </span>
  `;
}

function drawMapShell(geojson) {
  if (!window.L) throw new Error("Leaflet failed to load.");
  state.precinctLayers = new Map();
  state.leafletMap = L.map(els.map, {
    zoomControl: true,
    minZoom: 10,
    maxZoom: 17,
    scrollWheelZoom: true,
  });
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: "abcd",
  }).addTo(state.leafletMap);

  state.precinctGeoLayer = L.geoJSON(geojson, {
    style: {
      color: "#dce6f0",
      fillColor: "#495765",
      fillOpacity: 0.62,
      opacity: 0.85,
      weight: 0.8,
    },
    onEachFeature: (feature, layer) => {
      const pid = String(feature.properties.pid);
      state.precinctLayers.set(pid, layer);
      layer.bindTooltip(() => mapTooltipHtml(pid), {
        className: "precinct-map-tooltip",
        direction: "auto",
        opacity: 1,
        sticky: true,
      });
      layer.on("mouseover", () => {
        layer.setTooltipContent(mapTooltipHtml(pid));
        if (pid !== state.selectedPid) layer.setStyle({ color: "#ffffff", opacity: 1, weight: 2 });
        layer.bringToFront();
      });
      layer.on("mouseout", () => layer.setStyle(restingMapStyle(pid)));
      layer.on("click", (event) => {
        if (event && window.L) L.DomEvent.stopPropagation(event);
        selectPrecinctOnMap(pid === state.selectedPid ? null : pid);
      });
    },
  }).addTo(state.leafletMap);
  state.leafletMap.on("click", () => selectPrecinctOnMap(null));
  state.leafletMap.fitBounds(state.precinctGeoLayer.getBounds(), { padding: [18, 18] });
  state.pathsReady = true;
}

function selectedMapStyle(pid) {
  return { ...mapStyleForPid(pid), color: "#fff3c4", weight: 3.2, opacity: 1 };
}

function restingMapStyle(pid) {
  return state.selectedPid === pid ? selectedMapStyle(pid) : mapStyleForPid(pid);
}

function selectPrecinctOnMap(pid) {
  const previous = state.selectedPid;
  if (previous && previous !== pid) {
    const prevLayer = state.precinctLayers.get(previous);
    if (prevLayer) {
      prevLayer.closeTooltip();
      prevLayer.setStyle(mapStyleForPid(previous));
    }
  }
  state.selectedPid = pid;
  if (!pid) return;
  const layer = state.precinctLayers.get(pid);
  if (!layer) return;
  layer.setTooltipContent(mapTooltipHtml(pid));
  layer.setStyle(selectedMapStyle(pid));
  layer.bringToFront();
  layer.openTooltip();
}

// Highlights a precinct on the map from the Demographic Explorer scatter
// (hover). Style only -- never opens the map tooltip/popup.
function highlightPrecinctOnMap(pid) {
  if (state.explorerHoverPid === pid) return;
  clearExplorerHighlight();
  state.explorerHoverPid = pid;
  if (!pid || pid === state.selectedPid) return;
  const layer = state.precinctLayers.get(pid);
  if (!layer) return;
  layer.setStyle({ color: "#7cc7ff", weight: 2.4, opacity: 1 });
  layer.bringToFront();
}

function clearExplorerHighlight() {
  const pid = state.explorerHoverPid;
  state.explorerHoverPid = null;
  if (!pid) return;
  const layer = state.precinctLayers.get(pid);
  if (layer) layer.setStyle(restingMapStyle(pid));
}

function paintMap() {
  if (!state.pathsReady || !state.latestScenario) return;
  for (const [pid, layer] of state.precinctLayers.entries()) {
    layer.setStyle(restingMapStyle(pid));
    layer.setTooltipContent(mapTooltipHtml(pid));
  }
}

function mapStyleForPid(pid) {
  const scenario = state.latestScenario;
  const rows = scenario?.byPid.get(pid) || [];
  if (!rows.length) {
    return { color: "#dce6f0", fillColor: "#495765", fillOpacity: 0.4, opacity: 0.75, weight: 0.8 };
  }
  const colorByModel = new Map(state.latestSummary.map((row) => [row.model_key, row.color]));
  const winner = rows[0];
  const second = rows[1];
  const flipped = scenarioState().supportActive
    && scenario.baseWinnerByPid.get(pid) !== scenario.scenarioWinnerByPid.get(pid);
  const style = {
    color: flipped ? "#f3c74f" : "#e8eef5",
    fillColor: colorByModel.get(winner.model_key) || "#788594",
    fillOpacity: 0.72,
    opacity: 0.92,
    weight: flipped ? 2.8 : 0.8,
  };
  if (state.mapMode === "winner") {
    const dark = lerpColor(style.fillColor, "#0a111b", 0.5);
    const bright = lerpColor(style.fillColor, "#f3f8ff", 0.2);
    const t = clamp((winner.scenario_share - 25) / 50, 0, 1);
    style.fillColor = lerpColor(dark, bright, t);
    style.fillOpacity = 0.92;
  } else if (state.mapMode === "margin") {
    const margin = winner.scenario_share - (second?.scenario_share || 0);
    const dark = lerpColor(style.fillColor, "#0a111b", 0.52);
    const bright = lerpColor(style.fillColor, "#f3f8ff", 0.2);
    const m = Math.pow(clamp(margin / 45, 0, 1), 0.7);
    style.fillColor = lerpColor(dark, bright, m);
    style.fillOpacity = 0.93;
  } else {
    const change = winner.scenario_share - winner.base_share;
    style.fillColor = Math.abs(change) < 0.5
      ? "#727d89"
      : change > 0
        ? lerpColor("#7692b1", "#dcecff", clamp(change / 20, 0, 1))
        : lerpColor("#c98a90", "#8f3341", clamp(-change / 20, 0, 1));
    style.fillOpacity = 0.76;
  }
  return style;
}

function mapTooltipHtml(pid) {
  const scenario = state.latestScenario;
  const rows = scenario?.byPid.get(pid) || [];
  if (!rows.length) return `<strong>Precinct ${escapeHtml(pid)}</strong><br>No candidate estimates`;
  const baseWinner = scenario?.baseWinnerByPid.get(pid);
  const scenarioWinner = scenario?.scenarioWinnerByPid.get(pid);
  const status = scenarioState();
  const active = status.active;
  const flipped = status.supportActive && baseWinner && scenarioWinner && baseWinner !== scenarioWinner;
  const baseWinnerName = rows.find((row) => row.model_key === baseWinner)?.candidate || "Election winner";
  const scenarioWinnerName = rows.find((row) => row.model_key === scenarioWinner)?.candidate || "New winner";
  const topRows = rows.slice(0, 4);
  const body = topRows.map((row) => {
    const delta = row.scenario_share - row.base_share;
    const baseVotes = (row.base_share / 100) * num(row.contest_votes);
    const voteDelta = row.scenario_votes - baseVotes;
    const direct = row.direct_delta_pp
      ? `; candidate setting added ${formatSigned(row.direct_delta_pp)} points here`
      : "";
    const change = active
      ? `<span>${formatSigned(delta)} points; ${formatSignedVotes(voteDelta)} estimated votes${direct}</span>`
      : "";
    return `<div class="map-tooltip-candidate"><b>${escapeHtml(row.candidate)}</b><strong>${formatPct(row.scenario_share)}</strong>${change}</div>`;
  }).join("");

  const winnerChange = flipped
    ? `<div class="tooltip-change">${escapeHtml(baseWinnerName)} → ${escapeHtml(scenarioWinnerName)}</div>`
    : "";
  const raceVotes = num(rows[0].contest_votes);
  const scenarioRaceVotes = raceVotes * num(rows[0].turnout_multiplier || 1);
  const electionBallots = num(state.data.electionBallotsByPid.get(pid));
  const turnoutLine = status.turnoutActive
    ? `<div><span>Race votes after turnout change</span><strong>${formatVotes(scenarioRaceVotes)}</strong></div>`
    : "";
  return `
    <div class="map-tooltip-title"><strong>Precinct ${escapeHtml(pid)}</strong>${winnerChange}</div>
    <div class="map-tooltip-results">${body}</div>
    <div class="map-tooltip-totals">
      ${turnoutLine}
      <div><span>Votes recorded in this race</span><strong>${formatVotes(raceVotes)}</strong></div>
      <div><span>Estimated election ballots</span><strong>${formatVotes(electionBallots)}</strong></div>
    </div>
  `;
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
  return `${value.toFixed(2)}%`;
}

function formatVotes(value) {
  return Math.round(value).toLocaleString("en-US");
}

function formatSignedVotes(value) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("en-US")}`;
}

function formatSigned(value) {
  const rounded = Number(value).toFixed(2);
  return `${value > 0 ? "+" : ""}${rounded}`;
}

function lerpColor(a, b, t) {
  const from = parseColor(a);
  const to = parseColor(b);
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const blue = Math.round(from[2] + (to[2] - from[2]) * t);
  return rgbToHex(r, g, blue);
}

function rgbToHex(r, g, b) {
  const channel = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function parseColor(value) {
  const input = String(value).trim();
  if (input.startsWith("rgb")) {
    const parts = input.match(/-?\d+(\.\d+)?/g) || [];
    return [Number(parts[0]) || 0, Number(parts[1]) || 0, Number(parts[2]) || 0];
  }
  const clean = input.replace("#", "");
  const hex = clean.length === 3
    ? clean.split("").map((char) => char + char).join("")
    : clean;
  return [
    parseInt(hex.slice(0, 2), 16) || 0,
    parseInt(hex.slice(2, 4), 16) || 0,
    parseInt(hex.slice(4, 6), 16) || 0,
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
