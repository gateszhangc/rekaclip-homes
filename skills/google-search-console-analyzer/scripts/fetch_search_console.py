#!/usr/bin/env python3
"""Fetch Google Search Console Search Analytics data via the API."""

import argparse
import json
import os
import sys
from urllib import error, parse, request

API_BASE = "https://searchconsole.googleapis.com/webmasters/v3"


def _load_filters(path):
    if not path:
        return None
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if isinstance(data, dict) and "dimensionFilterGroups" in data:
        return data["dimensionFilterGroups"]
    if isinstance(data, list):
        return data
    raise ValueError(
        "filters file must be a list or an object with dimensionFilterGroups"
    )


def _build_body(args):
    dims = [d.strip() for d in args.dimensions.split(",") if d.strip()]
    if not dims:
        raise ValueError("at least one dimension is required")

    body = {
        "startDate": args.start_date,
        "endDate": args.end_date,
        "dimensions": dims,
        "rowLimit": args.row_limit,
        "dataState": args.data_state,
    }

    filters = _load_filters(args.filters_file)
    if filters:
        body["dimensionFilterGroups"] = filters

    return body


def _request_url(site_url):
    encoded = parse.quote(site_url, safe="")
    return f"{API_BASE}/sites/{encoded}/searchAnalytics/query"


def _print_json(payload):
    print(json.dumps(payload, indent=2, sort_keys=True))


def main():
    parser = argparse.ArgumentParser(
        description="Fetch Search Console Search Analytics data via API."
    )
    parser.add_argument("--site", required=True, help="Property URL, e.g. https://example.com/")
    parser.add_argument("--start-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--end-date", required=True, help="YYYY-MM-DD")
    parser.add_argument(
        "--dimensions",
        default="query",
        help="Comma-separated dimensions (query,page,country,device,date,searchAppearance)",
    )
    parser.add_argument("--row-limit", type=int, default=25000)
    parser.add_argument(
        "--data-state",
        choices=("final", "all"),
        default="final",
        help="Use 'all' for fresh data; 'final' for stable data.",
    )
    parser.add_argument(
        "--filters-file",
        help="Path to JSON file with dimensionFilterGroups or a list of filters.",
    )
    parser.add_argument(
        "--access-token",
        help="OAuth access token. If omitted, uses GOOGLE_OAUTH_ACCESS_TOKEN.",
    )
    parser.add_argument("--output", help="Write response JSON to file instead of stdout.")
    parser.add_argument("--dry-run", action="store_true", help="Print request and exit.")

    args = parser.parse_args()

    try:
        body = _build_body(args)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    url = _request_url(args.site)
    payload = json.dumps(body).encode("utf-8")

    if args.dry_run:
        print("DRY RUN: request preview")
        print(url)
        _print_json(body)
        return 0

    token = args.access_token or os.environ.get("GOOGLE_OAUTH_ACCESS_TOKEN")
    if not token:
        print(
            "error: missing access token. Provide --access-token or set GOOGLE_OAUTH_ACCESS_TOKEN.",
            file=sys.stderr,
        )
        return 2

    req = request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(req) as resp:
            response_text = resp.read().decode("utf-8")
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        print(f"HTTP {exc.code} {exc.reason}\n{details}", file=sys.stderr)
        return 1

    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write(response_text)
        print(f"Wrote response to {args.output}")
    else:
        print(response_text)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
