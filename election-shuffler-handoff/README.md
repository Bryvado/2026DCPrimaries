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

The app should eventually be a static one-page site suitable for GitHub Pages.

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
