# homebridge-pollen

[![npm](https://img.shields.io/npm/v/homebridge-pollen)](https://www.npmjs.com/package/homebridge-pollen)
[![downloads](https://img.shields.io/npm/dm/homebridge-pollen)](https://www.npmjs.com/package/homebridge-pollen)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Homebridge plugin that exposes pollen levels as HomeKit air quality sensors using the [Ambee API](https://www.getambee.com/).

## Features

- **Air quality sensors** — Pollen counts are mapped to HomeKit's 5-level air quality scale (Excellent, Good, Fair, Inferior, Poor)
- **Per-category sensors** — Optionally add separate sensors for tree, grass, and weed pollen
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
| `enableCategorySensors` | No | `false` | Add 3 additional sensors for tree, grass, and weed pollen |

## How it works

The plugin creates an air quality sensor that displays the overall pollen level. Pollen counts are mapped to HomeKit's air quality scale:

| Pollen count | Air quality |
|--------------|-------------|
| 0-20         | Excellent   |
| 21-80        | Good        |
| 81-200       | Fair        |
| 201-400      | Inferior    |
| 400+         | Poor        |

### Optional sensors

When `enableCategorySensors` is enabled, you get 3 additional air quality sensors:

- **Tree Pollen** — Air quality based on tree pollen count
- **Grass Pollen** — Air quality based on grass pollen count
- **Weed Pollen** — Air quality based on weed pollen count
