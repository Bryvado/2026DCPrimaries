import pandas as pd


TERM_GROUPS = {
    "zpBlk": "black_share",
    "zmedAge": "median_age",
    "zmedInc": "income",
    "zpCollege": "college",
    "zpRenter": "renter",
    "zp2534": "age_25_34",
    "zpTransit": "transit",
    "zdensity": "density",
}


TERM_EXPOSURE_COLUMNS = {
    "zpBlk": "zpBlk",
    "zmedAge": "zmedAge",
    "zmedInc": "zmedInc",
    "zpCollege": "zpCollege",
    "zpRenter": "zpRenter",
    "zp2534": "zp2534",
    "zpTransit": "zpTransit",
    "zdensity": "zdensity",
}


def term_group(term):
    term = str(term)
    if term.startswith("zprior_"):
        return "prior_territory"
    return TERM_GROUPS.get(term, term)


def _zscore(s):
    sd = s.std(skipna=True)
    if pd.isna(sd) or sd == 0:
        return s * 0
    return (s - s.mean(skipna=True)) / sd


def run_precinct_scenario(
    summary,
    terms,
    candidate_precinct_predictions,
    contest_number,
    sliders=None,
    precincts=None,
    use_fitted=True,
):
    """Return one row per precinct-candidate under a scenario.

    Sliders are spatially uneven. A slider modifies a candidate according to
    the candidate's coefficient and the precinct's exposure to that factor.
    This avoids applying one uniform citywide change to every precinct.
    """
    if sliders is None:
        sliders = {}

    contest_number = str(contest_number)

    cand = summary[
        (summary["contest_number"].astype(str) == contest_number) &
        (summary["valid_model"])
    ].copy()

    if cand.empty:
        raise ValueError("No valid models for contest")

    pred = candidate_precinct_predictions[
        candidate_precinct_predictions["contest_number"].astype(str) == contest_number
    ].copy()

    pred = pred[pred["model_key"].isin(cand["model_key"])].copy()

    if precincts is not None:
        exposure_cols = [
            c for c in [
                "pid",
                "zpBlk",
                "zmedAge",
                "zmedInc",
                "zpCollege",
                "zpRenter",
                "zp2534",
                "zpTransit",
                "zdensity",
            ]
            if c in precincts.columns
        ]
        pred = pred.merge(precincts[exposure_cols], on="pid", how="left", suffixes=("", "_prec"))

    term_lookup = terms[terms["model_key"].isin(cand["model_key"])].copy()
    term_lookup["term_group"] = term_lookup["term"].map(term_group)
    term_lookup["slider_value"] = term_lookup["term_group"].map(sliders).fillna(0)

    pred["base_share"] = pred["fitted_share"] if use_fitted else pred["actual_share"]
    pred["delta_pp"] = 0.0

    for _, term_row in term_lookup.iterrows():
        slider_value = term_row["slider_value"]
        if slider_value == 0:
            continue

        model_key = term_row["model_key"]
        term = str(term_row["term"])
        coef = term_row["coef_pp_per_sd"]

        if term in pred.columns:
            exposure = pred[term]
        elif term in TERM_EXPOSURE_COLUMNS and TERM_EXPOSURE_COLUMNS[term] in pred.columns:
            exposure = pred[TERM_EXPOSURE_COLUMNS[term]]
        elif term.startswith("zprior_") and "prior_territory_score" in pred.columns:
            exposure = pred.groupby("model_key")["prior_territory_score"].transform(_zscore).fillna(0)
        else:
            exposure = 0

        mask = pred["model_key"] == model_key
        pred.loc[mask, "delta_pp"] += coef * slider_value * exposure[mask]

    pred["raw_scenario_share"] = pred["base_share"] + pred["delta_pp"]

    pred["raw_clip"] = pred["raw_scenario_share"].clip(lower=0.001)
    pred["scenario_share"] = (
        pred["raw_clip"] /
        pred.groupby("pid")["raw_clip"].transform("sum") * 100
    )

    pred["scenario_votes"] = pred["scenario_share"] / 100 * pred["contest_votes"]

    keep = [
        "pid",
        "contest_number",
        "contest_name",
        "contest_family",
        "model_key",
        "candidate",
        "actual_share",
        "fitted_share",
        "base_share",
        "delta_pp",
        "scenario_share",
        "contest_votes",
        "scenario_votes",
        "residual",
        "prior_territory_score",
    ]

    return pred[[c for c in keep if c in pred.columns]].sort_values(
        ["pid", "scenario_share"],
        ascending=[True, False],
    )
