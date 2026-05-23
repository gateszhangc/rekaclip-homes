#!/usr/bin/env python3
"""Analyze Search Console exports (CSV or API JSON) and summarize results."""

import argparse
import csv
import io
import json
import sys
from collections import defaultdict

METRIC_KEYS = ("clicks", "impressions", "ctr", "position")


def _classify_header(header):
    lower = header.strip().lower()
    if "ctr" in lower or "click through" in lower:
        return "ctr"
    if "impression" in lower:
        return "impressions"
    if "position" in lower:
        return "position"
    if "click" in lower:
        return "clicks"
    return None


def _parse_number(value):
    if value is None:
        return 0.0
    text = str(value).strip()
    if not text:
        return 0.0
    text = text.replace(",", "")
    if text.endswith("%"):
        text = text[:-1]
        try:
            return float(text) / 100.0
        except ValueError:
            return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


def _format_number(value, digits=2):
    return f"{value:.{digits}f}"


def _empty_stats():
    return {"clicks": 0.0, "impressions": 0.0, "pos_weighted": 0.0, "has_pos": False}


def _update_stats(stats, clicks, impressions, position):
    stats["clicks"] += clicks
    stats["impressions"] += impressions
    if position is not None:
        stats["pos_weighted"] += position * impressions
        stats["has_pos"] = True


def _compute_summary(stats):
    impressions = stats["impressions"]
    ctr = (stats["clicks"] / impressions) if impressions else 0.0
    if stats["has_pos"] and impressions:
        avg_pos = stats["pos_weighted"] / impressions
    else:
        avg_pos = None
    return ctr, avg_pos


def _load_csv(path):
    with open(path, "r", encoding="utf-8") as handle:
        return list(csv.reader(handle))


def _load_json(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _analyze_rows(dimension_names, rows):
    totals = _empty_stats()
    dimension_totals = {dim: defaultdict(_empty_stats) for dim in dimension_names}

    for row in rows:
        clicks = row.get("clicks", 0.0)
        impressions = row.get("impressions", 0.0)
        position = row.get("position")
        _update_stats(totals, clicks, impressions, position)

        for dim in dimension_names:
            value = row.get(dim, "(empty)") or "(empty)"
            _update_stats(dimension_totals[dim][value], clicks, impressions, position)

    return totals, dimension_totals


def _rows_from_csv(csv_rows):
    if not csv_rows:
        return [], []

    header = csv_rows[0]
    header_map = []
    dimension_names = []

    for raw in header:
        metric = _classify_header(raw)
        if metric:
            header_map.append(metric)
        else:
            dim_name = raw.strip() or "dimension"
            dimension_names.append(dim_name)
            header_map.append(dim_name)

    rows = []
    for record in csv_rows[1:]:
        if not record or all(not cell.strip() for cell in record):
            continue
        row = {"clicks": 0.0, "impressions": 0.0, "position": None}
        for idx, value in enumerate(record):
            if idx >= len(header_map):
                continue
            key = header_map[idx]
            if key in METRIC_KEYS:
                parsed = _parse_number(value)
                if key == "position":
                    row["position"] = parsed
                elif key in ("clicks", "impressions"):
                    row[key] = parsed
            else:
                row[key] = value.strip()
        rows.append(row)

    return dimension_names, rows


def _rows_from_json(payload, dimensions):
    rows = []
    raw_rows = payload.get("rows", [])
    if not raw_rows:
        return dimensions, rows

    if not dimensions:
        key_count = len(raw_rows[0].get("keys", []))
        dimensions = [f"dim_{idx + 1}" for idx in range(key_count)]

    for raw in raw_rows:
        row = {
            "clicks": raw.get("clicks", 0.0),
            "impressions": raw.get("impressions", 0.0),
            "position": raw.get("position"),
        }
        keys = raw.get("keys", [])
        for idx, key in enumerate(keys):
            if idx < len(dimensions):
                row[dimensions[idx]] = key
        rows.append(row)

    return dimensions, rows


def _render_markdown(totals, dimension_totals, top):
    ctr, avg_pos = _compute_summary(totals)
    lines = []
    lines.append("# Search Console Summary")
    lines.append("")
    lines.append("## Totals")
    lines.append(
        f"Clicks: {_format_number(totals['clicks'], 0)} | Impressions: {_format_number(totals['impressions'], 0)} | CTR: {_format_number(ctr * 100)}%"
    )
    if avg_pos is not None:
        lines.append(f"Average position: {_format_number(avg_pos)}")

    for dim, values in dimension_totals.items():
        lines.append("")
        lines.append(f"## Top {dim} (by clicks)")
        lines.append("| Value | Clicks | Impressions | CTR | Avg Position |")
        lines.append("| --- | --- | --- | --- | --- |")
        ranked = sorted(values.items(), key=lambda item: item[1]["clicks"], reverse=True)
        for value, stats in ranked[:top]:
            ctr_val, avg_pos_val = _compute_summary(stats)
            avg_pos_str = _format_number(avg_pos_val) if avg_pos_val is not None else ""
            lines.append(
                "| {value} | {clicks} | {impressions} | {ctr} | {pos} |".format(
                    value=value or "(empty)",
                    clicks=_format_number(stats["clicks"], 0),
                    impressions=_format_number(stats["impressions"], 0),
                    ctr=f"{_format_number(ctr_val * 100)}%",
                    pos=avg_pos_str,
                )
            )

    return "\n".join(lines)


def _render_json(totals, dimension_totals, top):
    output = {
        "totals": {
            "clicks": totals["clicks"],
            "impressions": totals["impressions"],
        },
        "dimensions": {},
    }

    ctr, avg_pos = _compute_summary(totals)
    output["totals"]["ctr"] = ctr
    output["totals"]["avg_position"] = avg_pos

    for dim, values in dimension_totals.items():
        ranked = sorted(values.items(), key=lambda item: item[1]["clicks"], reverse=True)
        output["dimensions"][dim] = []
        for value, stats in ranked[:top]:
            dim_ctr, dim_avg_pos = _compute_summary(stats)
            output["dimensions"][dim].append(
                {
                    "value": value,
                    "clicks": stats["clicks"],
                    "impressions": stats["impressions"],
                    "ctr": dim_ctr,
                    "avg_position": dim_avg_pos,
                }
            )

    return json.dumps(output, indent=2, sort_keys=True)


def _run_self_test():
    sample = """Query,Clicks,Impressions,CTR,Position
Foo,10,100,0.10,2.0
Bar,5,50,0.10,3.0
"""
    csv_rows = list(csv.reader(io.StringIO(sample)))
    dimensions, rows = _rows_from_csv(csv_rows)
    totals, dimension_totals = _analyze_rows(dimensions, rows)
    print(_render_markdown(totals, dimension_totals, top=5))


def main():
    parser = argparse.ArgumentParser(description="Analyze Search Console CSV or API JSON exports.")
    parser.add_argument("input", nargs="?", help="Path to CSV or JSON file")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    parser.add_argument("--top", type=int, default=10)
    parser.add_argument(
        "--dimensions",
        help="Comma-separated dimension names for JSON input (query,page,...).",
    )
    parser.add_argument("--self-test", action="store_true", help="Run built-in test and exit.")

    args = parser.parse_args()

    if args.self_test:
        _run_self_test()
        return 0

    if not args.input:
        print("error: input file is required unless --self-test is used", file=sys.stderr)
        return 2

    if args.input.lower().endswith(".json"):
        payload = _load_json(args.input)
        dims = []
        if args.dimensions:
            dims = [d.strip() for d in args.dimensions.split(",") if d.strip()]
        dimensions, rows = _rows_from_json(payload, dims)
    else:
        csv_rows = _load_csv(args.input)
        dimensions, rows = _rows_from_csv(csv_rows)

    totals, dimension_totals = _analyze_rows(dimensions, rows)

    if args.format == "json":
        print(_render_json(totals, dimension_totals, args.top))
    else:
        print(_render_markdown(totals, dimension_totals, args.top))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
