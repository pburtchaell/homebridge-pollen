# homebridge-pollen

[![npm](https://img.shields.io/npm/v/homebridge-pollen?style=flat-square)](https://www.npmjs.com/package/homebridge-pollen)
[![downloads](https://img.shields.io/npm/dm/homebridge-pollen?style=flat-square)](https://www.npmjs.com/package/homebridge-pollen)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![verified-by-homebridge](https://img.shields.io/badge/homebridge-verified-blueviolet?color=%23491F59&style=flat-square)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

Homebridge plugin that exposes pollen levels as HomeKit air quality sensors using the [Google Pollen API](https://developers.google.com/maps/documentation/pollen).

## Features

- **Air quality sensors** — Pollen index mapped to HomeKit's 5-level air quality scale (Excellent, Good, Fair, Inferior, Poor)
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

This plugin requires a Google Maps API key with the Pollen API enabled.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Pollen API** under APIs & Services > Library
4. Create an API key under APIs & Services > Credentials
5. Set up a billing account if you haven't already (required even for the free tier)

The free tier allows 5,000 requests per month. With the default 60-minute poll interval, the plugin uses approximately 720 calls per month.

## Configuration

You can configure the plugin using the Homebridge UI or by editing your `config.json` directly.

### Example configuration

```json
{
  "platforms": [
    {
      "platform": "HomebridgePollen",
      "apiKey": "your-google-maps-api-key",
      "location": "10001"
    }
  ]
}
```

### Configuration options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `platform` | Yes | — | Must be `HomebridgePollen` |
| `apiKey` | Yes | — | Your Google Maps API key with the Pollen API enabled |
| `location` | Yes | — | Zip code or place name. Geocoded to coordinates on first startup and cached. |
| `pollInterval` | No | `60` | How often to fetch pollen data, in minutes (minimum 15) |
| `enableCategorySensors` | No | `false` | Add 3 additional sensors for tree, grass, and weed pollen |

## How it works

The plugin creates an air quality sensor that displays the overall pollen level. The Google Pollen API provides a Universal Pollen Index (UPI) from 0–5, which maps to HomeKit's air quality scale:

| UPI | Category | Air quality |
|-----|----------|-------------|
| 0   | None     | Excellent   |
| 1   | Very Low | Excellent   |
| 2   | Low      | Good        |
| 3   | Moderate | Fair        |
| 4   | High     | Inferior    |
| 5   | Very High| Poor        |

The overall sensor displays the worst (highest) pollen index across tree, grass, and weed categories.

### Location geocoding

The plugin accepts a place name or zip code in the `location` config field. On first startup, it geocodes this to latitude/longitude coordinates using [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap) and caches the result. Subsequent startups use the cached coordinates unless the location changes.

### Optional sensors

When `enableCategorySensors` is enabled, you get 3 additional air quality sensors:

- **Tree Pollen** — Air quality based on tree pollen index
- **Grass Pollen** — Air quality based on grass pollen index
- **Weed Pollen** — Air quality based on weed pollen index
