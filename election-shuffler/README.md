# D.C. Election Shuffler Handoff

This package is prepared for Codex CLI.

Start with:
- `AGENTS.md`
- `HANDOFF.md`
- `data_contract.md`
- `CODEX_CLI_START.md`

The core modeling rule is spatial exposure. Sliders must not add the same candidate delta across every precinct. They should use precinct-level z-scores or prior-territory exposure, then normalize within precinct.

The scenario helper lives at:
- `src/scenario_logic.py`

The app is a static, scrollable site suitable for GitHub Pages.

The current page includes the precinct shuffler plus live scenario impact,
candidate comparison, demographic exploration, and a downloadable precinct
table. Each demographic characteristic has separate support and turnout
controls. Support changes candidate shares; turnout changes precinct vote totals.
Reset reproduces the observed precinct result. Demographic support controls move
the checked candidates together as a coalition, while turnout controls affect
vote totals without changing candidate preference.

## Static app

The usable shuffler is `index.html`. It loads the CSV model files and
`data/precincts.geojson` in the browser, so use a local web server rather than
opening the file directly.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\serve_static.ps1 -Port 8080
```

Then open:

```text
http://localhost:8080/
```

## Rebuild precinct geometry

`data/precincts.geojson` is generated from DCGIS and keyed to the existing
`data/precincts.csv` `pid` values.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build_precinct_geojson.ps1
```

## Rebuild candidate territory

The committed `data/candidate_territory.csv` is ready for the browser. To
regenerate it after updating model data or certified 2024 results:

```powershell
python .\scripts\build_candidate_territory.py `
  --results-2024 "C:\path\to\November_5_2024_General_Election_Certified_Results.csv"
```

The generator preserves existing model prior-vote surfaces and adds Robert
White's 2024 citywide vote pattern and Brooke Pinto's Ward 2 footprint.
