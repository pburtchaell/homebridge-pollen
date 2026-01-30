# homebridge-pollen

[![npm](https://img.shields.io/npm/v/homebridge-pollen)](https://www.npmjs.com/package/homebridge-pollen)
[![license](https://img.shields.io/npm/l/homebridge-pollen)](LICENSE)

Homebridge plugin that exposes pollen levels as HomeKit sensors using the [Ambee API](https://www.getambee.com/).

## Features

- **Contact sensors for automations** — Pollen levels are exposed as contact sensors, which can trigger HomeKit automations natively ("When Pollen High detected...")
- **Per-category sensors** — Optionally add separate sensors for tree, grass, and weed pollen
- **Air quality sensor** — Optionally add an air quality sensor that maps overall pollen count to a 1-5 severity scale
- **No runtime dependencies** — Uses Node.js 20+ built-in `fetch`

## Requirements

- Node.js 20.0.0 or later
- Homebridge 1.8.0 or later (including Homebridge 2.x)

## Installation

### Using the Homebridge UI

Search for `homebridge-pollen` in the Homebridge UI plugin search and install it.

### Using npm

```bash
npm install -g homebridge-pollen
```

## Getting an API key

This plugin requires an API key from Ambee to fetch pollen data.

1. Go to the [Ambee API Dashboard](https://api-dashboard.getambee.com/)
2. Create a free account
3. Copy your API key from the dashboard

The free tier allows 100 API calls per day. With the default 60-minute poll interval, the plugin uses approximately 24 calls per day.

## Configuration

You can configure the plugin using the Homebridge UI or by editing your `config.json` directly.

### Example configuration

```json
{
  "platforms": [
    {
      "platform": "HomebridgePollen",
      "apiKey": "your-ambee-api-key",
      "location": "10001"
    }
  ]
}
```

### Configuration options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `platform` | Yes | — | Must be `HomebridgePollen` |
| `apiKey` | Yes | — | Your Ambee API key |
| `location` | Yes | — | Zip code or place name to fetch pollen data for |
| `pollInterval` | No | `60` | How often to fetch pollen data, in minutes (minimum 15) |
| `enableCategorySensors` | No | `false` | Add 9 additional sensors for tree/grass/weed at each level |
| `enableAirQualitySensor` | No | `false` | Add an air quality sensor accessory |
| `thresholds` | No | — | Override default pollen count thresholds (see below) |

## How it works

The plugin creates contact sensors that represent pollen levels. By default, you get three sensors:

- **Pollen High** — Triggered when pollen count is high
- **Pollen Medium** — Triggered when pollen count is medium  
- **Pollen Low** — Triggered when pollen count is low

Contact sensors are used because their state changes are native HomeKit automation triggers. This lets you create automations like "When Pollen High is detected, turn on the air purifier."

### Optional sensors

When `enableCategorySensors` is enabled, you get 9 additional sensors:

- Tree Pollen High / Medium / Low
- Grass Pollen High / Medium / Low
- Weed Pollen High / Medium / Low

When `enableAirQualitySensor` is enabled, you get a single air quality sensor that maps the overall pollen count to HomeKit's 5-level air quality scale.

## Pollen thresholds

Pollen counts are classified as Low, Medium, or High based on thresholds from the National Allergy Bureau (NAB). You can override these defaults in your configuration.

| Category | Low (at or below) | High (at or above) |
|----------|-------------------|---------------------|
| Overall | 50 | 200 |
| Tree | 15 | 90 |
| Grass | 20 | 200 |
| Weed | 10 | 50 |

Counts between the low and high thresholds are classified as Medium.

### Customizing thresholds

```json
{
  "platforms": [
    {
      "platform": "HomebridgePollen",
      "apiKey": "your-api-key",
      "location": "10001",
      "thresholds": {
        "overall": { "low": 30, "high": 150 },
        "tree": { "low": 10, "high": 60 }
      }
    }
  ]
}
```

## License

[MIT](LICENSE)
