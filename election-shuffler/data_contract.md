# Data Contract

## Candidate Summary
Expected file: `data/candidates.csv`

Key columns:
- `model_key`
- `contest_number`
- `contest_name`
- `contest_family`
- `candidate`
- `candidate_share`
- `n_precincts`
- `base_r2`
- `expanded_r2`
- `gain_vs_base`
- `prior_count`
- `mean_abs_resid_pp`
- `valid_model`
- `reliability`

## Candidate Terms
Expected file: `data/candidate_terms.csv`

Key columns:
- `model_key`
- `contest_name`
- `contest_family`
- `candidate`
- `term`
- `coef_pp_per_sd`
- `p_value`
- `unique_drop_r2`
- `expanded_r2`

Terms should be mapped to UI slider groups:
- `zpBlk` -> `black_share`
- `zmedAge` -> `median_age`
- `zmedInc` -> `income`
- `zpCollege` -> `college`
- `zpRenter` -> `renter`
- `zp2534` -> `age_25_34`
- `zpTransit` -> `transit`
- `zdensity` -> `density`
- terms beginning with `zprior_` -> `prior_territory`

## Precincts
Expected file: `data/precincts.csv`

Recommended exposure columns:
- `pid`
- `zpBlk`
- `zmedAge`
- `zmedInc`
- `zpCollege`
- `zpRenter`
- `zp2534`
- `zpTransit`
- `zdensity`

## Precinct Scenario Rows
Expected file: `data/candidate_precinct_predictions.csv`

Required columns:
- `pid`
- `contest_number`
- `contest_name`
- `contest_family`
- `model_key`
- `candidate`
- `actual_share`
- `fitted_share`
- `contest_votes`
- `residual`
- `prior_territory_score`

Scenario functions should return this table shape, plus:
- `base_share`
- `delta_pp`
- `scenario_share`
- `scenario_votes`

Do not treat sliders as uniform citywide shocks. Sliders must scale the relevant exposure column precinct by precinct.
