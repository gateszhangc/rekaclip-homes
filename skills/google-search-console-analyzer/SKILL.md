---
name: google-search-console-analyzer
description: Pull and analyze Google Search Console performance data from https://search.google.com/. Use when you need Search Console (Search Analytics) data via API or CSV export, or when summarizing queries/pages/impressions/CTR/position from Search Console exports.
---

# Google Search Console Analyzer

## Overview
Fetch Search Console performance data (API or CSV export) and produce summarized insights.

## Workflow Decision Tree
- Need repeatable automated pulls -> Use the API workflow (`scripts/fetch_search_console.py`).
- Have UI access or a one-off export -> Download CSV and analyze (`scripts/analyze_search_console.py`).
- Already have API JSON -> Analyze directly with `scripts/analyze_search_console.py` and `--dimensions`.

## Step 1: Gather inputs
- Confirm property URL (for example, `https://example.com/`).
- Confirm date range (`YYYY-MM-DD` start/end).
- Choose dimensions (query, page, country, device, date, searchAppearance).
- Decide if filters are needed (page folder, query contains, etc.).
- Ask whether the user can provide an access token or CSV export.

## Step 2: Fetch data via API
Use the fetch script when API access is available.

Example:
```bash
python3 scripts/fetch_search_console.py \
  --site "https://example.com/" \
  --start-date 2024-01-01 \
  --end-date 2024-01-31 \
  --dimensions query,page \
  --filters-file assets/dimension_filters_template.json \
  --output tmp/search_console.json
```

Set `GOOGLE_OAUTH_ACCESS_TOKEN` or pass `--access-token`. See `references/search_console_api.md` for scopes and notes.

## Step 2b: Fetch data via UI export
Use the Search Console UI export when API access is not available.

Steps:
1. Open Search Console -> Performance -> Search results.
2. Select date range, filters, and dimensions.
3. Click Export -> CSV.
4. Analyze the CSV with `scripts/analyze_search_console.py`.

## Step 3: Analyze data
Use the analysis script for both CSV and JSON exports.

CSV example:
```bash
python3 scripts/analyze_search_console.py tmp/search_console.csv --format markdown --top 10
```

JSON example:
```bash
python3 scripts/analyze_search_console.py tmp/search_console.json --dimensions query,page --format markdown
```

Outputs include totals, CTR, weighted average position, and top values per dimension.

## Notes and constraints
- Data is delayed; the newest days may be incomplete.
- API row limit defaults to 1,000 and caps at 25,000.
- Average position is weighted by impressions.

## References
- `references/search_console_api.md`
- `assets/dimension_filters_template.json`
