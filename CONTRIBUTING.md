# Contributing

## Local Development

### Prerequisites

- Node.js 20 or later
- An [Ambee API key](https://api-dashboard.getambee.com/) (free tier works fine)

### Quick start

Run the setup script to install dependencies, create the local Homebridge config, and link the plugin:

```sh
npm run setup
```

The script will prompt you for your Ambee API key and location. 

### Development

```sh
npm run dev
```

The development workflow runs an isolated local Homebridge instance, completely separate from any system-wide Homebridge installation you may have:

- `./.homebridge` folder holds its own `config.json` and cache
- **`npm link`** — Makes the plugin discoverable to Homebridge without publishing to npm
- **`nodemon`** — Watches `src/` and automatically rebuilds TypeScript and restarts Homebridge on every change


### Build

```sh
npm run build 
```

### Testing the plugin

After running `npm run setup` and `npm run dev`, verify in the console output that:

- 3 ContactSensor accessories are registered (Pollen High, Pollen Medium, Pollen Low)
- An initial pollen fetch completes and one sensor shows `DETECTED`
- Debug log lines show the fetched counts and level classifications

To test optional features, edit `.homebridge/config.json` and add:

```json
{
  "platform": "HomebridgePollen",
  "apiKey": "YOUR_AMBEE_API_KEY",
  "location": "10001",
  "enableCategorySensors": true,
  "enableAirQualitySensor": true
}
```

This adds 9 per-category sensors (Tree/Grass/Weed x High/Medium/Low) and 1 AirQualitySensor. Restart the dev server to pick up the changes.

### Pairing with Apple Home

To test end-to-end in the Home app:

1. Open the Home app on iOS or macOS
2. Tap **+** > **Add Accessory** > **More Options...**
3. Select "Test Homebridge" from the list
4. Enter the PIN: `031-45-154`

The test bridge uses port 51826, so it can run alongside a production Homebridge instance on the default port. When you're done testing, unpair the bridge from Home to avoid stale accessories.

### Project Structure

```
src/
├── index.ts              # Entry point — registers platform with Homebridge
├── settings.ts           # Constants and default thresholds
├── types.ts              # TypeScript interfaces and helper functions
├── pollenService.ts      # Ambee API client (fetch, parse, cache)
├── platform.ts           # DynamicPlatformPlugin (discovery, polling)
└── platformAccessory.ts  # Maps pollen data to HomeKit services
```

## Submitting Changes

1. Create a branch from `main`.
2. Make your changes and verify `npm run build` and `npm run lint` pass.
3. Test against a local Homebridge instance using the steps above.
4. Open a pull request with a description of what changed and why.
