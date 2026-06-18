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
- terms beginning with `zprior_` are retained in fitted model output but are not
  exposed as a single global slider

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

## Turnout Scenarios

Each demographic factor also has a turnout setting from -30% to +30%. Raw
precinct values are scaled from 0 to 1 using their 5th and 95th percentiles.
The turnout setting is applied most strongly to the highest-exposure precincts:

```text
factor_multiplier = 1 + turnout_setting * scaled_precinct_exposure
```

Multiple active factors compound. The combined precinct multiplier is bounded
between 0.25 and 2.5. It changes `contest_votes`, not candidate preference.
District totals are then recalculated from the precinct scenario votes.

## Official Contest Totals

Expected file: `data/official_contest_totals.csv`

The named-candidate dataset excludes write-in and other votes. Where an
official total is available, this file supplies the full denominator so the
default district percentages match DCBOE. The mayor contest includes 357 such
votes, producing 54,105 / 102,377 = 52.85% for Janeese Lewis George.

## Candidate Territory

Expected file: `data/candidate_territory.csv`

Key columns:
- `model_key`
- `candidate`
- `pid`
- `territory_score`: 0 to 1, where 1 is core territory
- `territory_type`: `prior_vote_pattern` or `ward_edge_decay`
- `source`: human-readable provenance shown in the controls

Candidate direct shifts use this file only when localization is enabled. The
effective precinct weight is:

```text
outside_reach + (1 - outside_reach) * territory_score
```

Outside reach is selectable from 20% (tight) to 80% (broad). Ward-based
territory is 1 inside the ward and decays outside it using a 0.75 km scale.
