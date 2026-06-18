1| # D.C. Election Shuffler Handoff
2| 
3| This package is prepared for Codex CLI.
4| 
5| Start with:
6| - `AGENTS.md`
7| - `HANDOFF.md`
8| - `data_contract.md`
9| - `CODEX_CLI_START.md`
10| 
11| The core modeling rule is spatial exposure. Sliders must not add the same candidate delta across every precinct. They should use precinct-level z-scores or prior-territory exposure, then normalize[...]
12| 
13| The scenario helper lives at:
14| - `src/scenario_logic.py`
15| 
16| The app should eventually be a static one-page site suitable for GitHub Pages.
17| 
18| ## Static app
19| 
20| The usable shuffler is `index.html`. It loads the CSV model files and
21| `data/precincts.geojson` in the browser, so use a local web server rather than
22| opening the file directly.
23| 
24| ```powershell
25| powershell -ExecutionPolicy Bypass -File scripts\serve_static.ps1 -Port 8080
26| ```
27| 
28| Then open:
29| 
30| ```text
31| http://localhost:8080/
32| ```
33| 
34| ## Rebuild precinct geometry
35| 
36| `data/precincts.geojson` is generated from DCGIS and keyed to the existing
37| `data/precincts.csv` `pid` values.
38| 
39| ```powershell
40| powershell -ExecutionPolicy Bypass -File scripts\build_precinct_geojson.ps1
41| ```
42| 