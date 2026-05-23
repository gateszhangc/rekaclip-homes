# Google Search Console API notes

## Scope and access
- Preferred scope (read-only): `https://www.googleapis.com/auth/webmasters.readonly`
- Full access scope: `https://www.googleapis.com/auth/webmasters`
- Service accounts only work if added as an owner/user on the Search Console property.
- OAuth access tokens can be obtained via:
  - `gcloud auth print-access-token` (if gcloud is configured)
  - A custom OAuth flow with a stored refresh token

## Endpoint
```
POST https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
```
`siteUrl` must be URL-encoded (for example, `https%3A%2F%2Fexample.com%2F`).

## Common dimensions
- `query`
- `page`
- `country`
- `device`
- `date`
- `searchAppearance`

## Data state
- `final`: stable data (default)
- `all`: includes fresh data; more volatile

## Row limits
- Default: 1,000
- Max: 25,000

## Filters
Use `dimensionFilterGroups` when you need to scope results to pages, queries, or countries.
See `assets/dimension_filters_template.json` for a starter template.

Example filter group:
```json
{
  "dimensionFilterGroups": [
    {
      "groupType": "and",
      "filters": [
        {"dimension": "page", "operator": "contains", "expression": "/blog/"},
        {"dimension": "query", "operator": "contains", "expression": "caricature"}
      ]
    }
  ]
}
```

## CSV export notes (UI)
Search Console UI exports include some or all of the following columns:
- Query, Page, Country, Device, Search Appearance, Date
- Clicks, Impressions, CTR, Position

The analysis script auto-detects metric columns and treats the rest as dimensions.
