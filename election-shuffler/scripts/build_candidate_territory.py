#!/usr/bin/env python3
"""Build browser-ready candidate territory weights from model and election data."""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
from collections import defaultdict
from pathlib import Path


SKIP_CANDIDATE = re.compile(r"OVER VOTES|UNDER VOTES|WRITE[- ]?IN|NO CANDIDATE|BLANK", re.I)
DC_LAT = 38.91
KM_PER_DEG_LAT = 110.57
KM_PER_DEG_LON = 111.32 * math.cos(math.radians(DC_LAT))


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def number(value: str | None) -> float | None:
    try:
        return float(value) if value not in (None, "") else None
    except ValueError:
        return None


def robust_scale(values: dict[str, float]) -> dict[str, float]:
    ordered = sorted(values.values())
    if not ordered:
        return {}
    lo = ordered[max(0, round((len(ordered) - 1) * 0.05))]
    hi = ordered[min(len(ordered) - 1, round((len(ordered) - 1) * 0.95))]
    if hi <= lo:
        return {key: 1.0 for key in values}
    return {key: min(1.0, max(0.0, (value - lo) / (hi - lo))) for key, value in values.items()}


def election_shares(rows: list[dict[str, str]], contest_number: str, candidate_name: str) -> dict[str, float]:
    contest = [row for row in rows if row.get("ContestNumber") == contest_number]
    totals: dict[str, float] = defaultdict(float)
    candidate: dict[str, float] = defaultdict(float)
    target = candidate_name.upper()
    for row in contest:
        pid = row.get("PrecinctNumber", "")
        name = row.get("Candidate") or ""
        votes = number(row.get("Votes")) or 0.0
        if not pid or SKIP_CANDIDATE.search(name):
            continue
        totals[pid] += votes
        if target in name.upper():
            candidate[pid] += votes
    return {pid: candidate[pid] / total for pid, total in totals.items() if total > 0 and pid in candidate}


def ward_by_pid(rows: list[dict[str, str]]) -> dict[str, str]:
    result: dict[str, str] = {}
    for row in rows:
        pid = row.get("PrecinctNumber", "")
        ward = row.get("WardNumber", "")
        if pid and ward:
            result[pid] = ward
    return result


def rings(geometry: dict) -> list[list[list[float]]]:
    if geometry.get("type") == "Polygon":
        return geometry.get("coordinates", [])
    if geometry.get("type") == "MultiPolygon":
        return [ring for polygon in geometry.get("coordinates", []) for ring in polygon]
    return []


def projected(point: list[float]) -> tuple[float, float]:
    return point[0] * KM_PER_DEG_LON, point[1] * KM_PER_DEG_LAT


def ring_centroid(ring: list[list[float]]) -> tuple[float, float]:
    points = [projected(point) for point in ring]
    if not points:
        return 0.0, 0.0
    area2 = 0.0
    cx = 0.0
    cy = 0.0
    for (x1, y1), (x2, y2) in zip(points, points[1:] + points[:1]):
        cross = x1 * y2 - x2 * y1
        area2 += cross
        cx += (x1 + x2) * cross
        cy += (y1 + y2) * cross
    if abs(area2) < 1e-12:
        return sum(x for x, _ in points) / len(points), sum(y for _, y in points) / len(points)
    return cx / (3 * area2), cy / (3 * area2)


def point_segment_distance(point, start, end) -> float:
    px, py = point
    ax, ay = start
    bx, by = end
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = min(1.0, max(0.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def ward_decay(geojson: dict, wards: dict[str, str], target_ward: str, decay_km: float) -> dict[str, float]:
    features = {str(f["properties"]["pid"]): f for f in geojson["features"]}
    boundary_segments = []
    for pid, feature in features.items():
        if wards.get(pid) != target_ward:
            continue
        for ring in rings(feature["geometry"]):
            points = [projected(point) for point in ring]
            boundary_segments.extend(zip(points, points[1:]))

    result = {}
    for pid, feature in features.items():
        if wards.get(pid) == target_ward:
            result[pid] = 1.0
            continue
        polygon_rings = rings(feature["geometry"])
        if not polygon_rings or not boundary_segments:
            result[pid] = 0.0
            continue
        centroid = ring_centroid(max(polygon_rings, key=len))
        distance = min(point_segment_distance(centroid, a, b) for a, b in boundary_segments)
        result[pid] = math.exp(-distance / decay_km)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--predictions", type=Path, default=Path("data/candidate_precinct_predictions.csv"))
    parser.add_argument("--geojson", type=Path, default=Path("data/precincts.geojson"))
    parser.add_argument("--results-2024", type=Path, required=True)
    parser.add_argument("--results-2024-primary", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/candidate_territory.csv"))
    args = parser.parse_args()

    predictions = read_csv(args.predictions)
    results = read_csv(args.results_2024)
    primary_results = read_csv(args.results_2024_primary) if args.results_2024_primary else []
    with args.geojson.open(encoding="utf-8") as handle:
        geojson = json.load(handle)

    output: dict[tuple[str, str], dict[str, str | float]] = {}

    existing: dict[str, dict[str, float]] = defaultdict(dict)
    candidate_by_model = {}
    for row in predictions:
        candidate_by_model[row["model_key"]] = row["candidate"]
        score = number(row.get("prior_territory_score"))
        if score is not None:
            existing[row["model_key"]][row["pid"]] = score
    for model_key, values in existing.items():
        for pid, score in robust_scale(values).items():
            output[(model_key, pid)] = {
                "model_key": model_key,
                "candidate": candidate_by_model[model_key],
                "pid": pid,
                "territory_score": score,
                "territory_type": "prior_vote_pattern",
                "source": "matched prior election result",
            }

    white = robust_scale(election_shares(results, "6", "ROBERT WHITE"))
    for pid, score in white.items():
        output[("14_robert_white", pid)] = {
            "model_key": "14_robert_white",
            "candidate": "Robert White",
            "pid": pid,
            "territory_score": score,
            "territory_type": "prior_vote_pattern",
            "source": "2024 general at-large council vote share",
        }

    if primary_results:
        owolewa = robust_scale(election_shares(primary_results, "20", "OYE OWOLEWA"))
        for pid, score in owolewa.items():
            output[("17_oye_owolewa", pid)] = {
                "model_key": "17_oye_owolewa",
                "candidate": "Oye Owolewa",
                "pid": pid,
                "territory_score": score,
                "territory_type": "prior_vote_pattern",
                "source": "2024 Democratic primary citywide vote share",
            }

    wards = ward_by_pid(results)
    ward_territories = [
        ("14_brooke_pinto", "Brooke Pinto", "2", "2024 Ward 2 council district"),
        ("15_janeese_lewis_george", "Janeese Lewis George", "4", "Ward 4 council district"),
        ("15_kenyan_r_mcduffie", "Kenyan R. McDuffie", "5", "former Ward 5 council district"),
        ("15_vincent_orange_vo", 'Vincent Orange ("VO")', "5", "former Ward 5 council district"),
    ]
    for model_key, candidate, ward, source in ward_territories:
        values = ward_decay(geojson, wards, ward, decay_km=0.75)
        for pid, score in values.items():
            output[(model_key, pid)] = {
                "model_key": model_key,
                "candidate": candidate,
                "pid": pid,
                "territory_score": score,
                "territory_type": "ward_edge_decay",
                "source": f"{source}; 0.75 km outside-edge decay",
            }

    all_pids = {str(feature["properties"]["pid"]) for feature in geojson["features"]}
    metadata = {}
    for row in output.values():
        metadata.setdefault(
            str(row["model_key"]),
            (str(row["candidate"]), str(row["territory_type"]), str(row["source"])),
        )
    for model_key, (candidate, territory_type, source) in metadata.items():
        for pid in all_pids:
            output.setdefault(
                (model_key, pid),
                {
                    "model_key": model_key,
                    "candidate": candidate,
                    "pid": pid,
                    "territory_score": 0.0,
                    "territory_type": territory_type,
                    "source": source,
                },
            )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    fields = ["model_key", "candidate", "pid", "territory_score", "territory_type", "source"]
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in sorted(output.values(), key=lambda item: (str(item["model_key"]), int(item["pid"]))):
            row["territory_score"] = f"{float(row['territory_score']):.6f}"
            writer.writerow(row)

    print(f"wrote {len(output)} territory rows to {args.output}")


if __name__ == "__main__":
    main()
