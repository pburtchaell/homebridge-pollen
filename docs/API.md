# Google Pollen API

## Endpoint

`GET https://pollen.googleapis.com/v1/forecast:lookup`

## Authentication

API key passed as a query parameter: `?key={apiKey}`

Requires a Google Cloud project with the Pollen API enabled and a billing account attached.

## Request Parameters

| Parameter | Description |
|-----------|-------------|
| `key` | Google Maps API key |
| `location.latitude` | Latitude |
| `location.longitude` | Longitude |
| `days` | Forecast days (1-5). Plugin uses `1` for current day only. |
| `plantsDescription` | Plugin sets `false` to minimize response size |

## Rate Limits

Free tier: 5,000 requests/month — default 60-min polling = ~720 calls/month

## Response Shape

```json
{
  "regionCode": "US",
  "dailyInfo": [{
    "date": { "year": 2026, "month": 2, "day": 16 },
    "pollenTypeInfo": [
      {
        "code": "TREE",
        "displayName": "Tree",
        "inSeason": true,
        "indexInfo": {
          "code": "UPI",
          "displayName": "Universal Pollen Index",
          "value": 3,
          "category": "Moderate"
        }
      },
      {
        "code": "GRASS",
        "displayName": "Grass",
        "inSeason": false
      },
      {
        "code": "WEED",
        "displayName": "Weed",
        "inSeason": false
      }
    ]
  }]
}
```

`indexInfo` is omitted when the pollen type is out of season. The plugin treats missing `indexInfo` as UPI 0 (None).

## UPI to Air Quality Mapping

The Universal Pollen Index (UPI) maps to HomeKit's AirQuality scale:

| UPI Value | UPI Category | AirQuality |
|-----------|--------------|------------|
| 0 (None)  | None         | Excellent  |
| 1         | Very Low     | Excellent  |
| 2         | Low          | Good       |
| 3         | Moderate     | Fair       |
| 4         | High         | Inferior   |
| 5         | Very High    | Poor       |

The overall sensor uses the maximum UPI value across tree, grass, and weed.

## Error Handling

- Missing `apiKey`/`location` — logs error, plugin does not start
- 401 — logs error about invalid API key, returns cached data
- 403 — logs error about Pollen API not enabled or billing not configured
- 429 — logs warning, increments consecutive failure counter for exponential backoff
- Network/5xx — logs warning, returns cached data, retries next cycle
- Empty `dailyInfo` — logs warning about unsupported location, retains cache

## Geocoding

The plugin geocodes the `location` config string to coordinates using Nominatim (OpenStreetMap) on first startup. The resolved coordinates are cached in `<storagePath>/homebridge-pollen-geocode.json` and reused on subsequent startups unless the location changes.
