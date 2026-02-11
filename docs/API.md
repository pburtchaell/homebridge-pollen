# Ambee API

## Endpoint

`GET https://api.ambeedata.com/latest/pollen/by-place?place={location}`

## Authentication

`x-api-key` header with API key

## Rate Limits

Free tier: 100 calls/day — default 60-min polling = 24 calls/day

## Response Shape

```json
{
  "message": "string",
  "data": [{
    "Count": {
      "grass_pollen": number,
      "tree_pollen": number,
      "weed_pollen": number
    },
    "Risk": { ... },
    "Species": { ... },
    "updatedAt": "string"
  }]
}
```

The `by-place` endpoint accepts zip codes and place names directly.

## Air Quality Mapping

Pollen counts are mapped to HomeKit's AirQuality scale:

| Pollen count | AirQuality |
|--------------|------------|
| 0-20         | Excellent  |
| 21-80        | Good       |
| 81-200       | Fair       |
| 201-400      | Inferior   |
| 400+         | Poor       |

## Error Handling

- Missing `apiKey`/`location` — logs error, plugin does not start polling
- 401 — logs error about invalid API key, returns cached data
- 429 — logs warning, increments consecutive failure counter for exponential backoff
- Network/5xx — logs warning, returns cached data, retries next cycle
- Empty data array — logs warning about unsupported location, retains cache
