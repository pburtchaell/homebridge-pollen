# Contributing

## Local Development

### Prerequisites

- Node.js 20 or later
- An [Ambee API key](https://api-dashboard.getambee.com/) (free tier works fine)

### Setup

```sh
npm install
```

### Build and Lint

```sh
npm run build   # compile TypeScript to dist/
npm run lint    # run ESLint
```

### How it works

The development workflow runs an isolated local Homebridge instance, completely separate from any system-wide Homebridge installation you may have:

- **Isolated config directory** — The `./homebridge` folder holds its own `config.json` and cache. Your production Homebridge setup remains untouched.
- **`npm link`** — Makes the plugin discoverable to Homebridge without publishing to npm.
- **`nodemon`** — Watches `src/` and automatically rebuilds TypeScript and restarts Homebridge on every change.

You don't need to install Homebridge separately — `npm run watch` starts everything for you.

### Testing the plugin

The project uses `nodemon` to rebuild and restart Homebridge on source changes. This runs Homebridge in debug mode (`-D`) with a local config directory (`./homebridge`), keeping your system Homebridge installation untouched.

1. Create a local Homebridge config directory and config file:

   ```sh
   mkdir -p homebridge
   cat > homebridge/config.json << 'EOF'
   {
     "bridge": {
       "name": "Test Homebridge",
       "username": "CC:22:3D:E3:CE:30",
       "port": 51826,
       "pin": "031-45-154"
     },
     "platforms": [
       {
         "platform": "HomebridgePollen",
         "apiKey": "YOUR_AMBEE_API_KEY",
         "location": "10001"
       }
     ]
   }
   EOF
   ```

2. Replace `YOUR_AMBEE_API_KEY` with your actual key.

3. Link the plugin locally and start the dev server:

   ```sh
   npm run watch
   ```

   This will:
   - Build the TypeScript source
   - `npm link` the plugin so Homebridge can discover it
   - Start `nodemon`, which recompiles and restarts Homebridge whenever you edit a file in `src/`

4. Verify in the console output that:
   - 3 ContactSensor accessories are registered (Pollen High, Pollen Medium, Pollen Low)
   - An initial pollen fetch completes and one sensor shows `DETECTED`
   - Debug log lines show the fetched counts and level classifications

5. To test optional features, add these to your config and restart:

   ```json
   {
     "platform": "HomebridgePollen",
     "apiKey": "YOUR_AMBEE_API_KEY",
     "location": "10001",
     "enableCategorySensors": true,
     "enableAirQualitySensor": true
   }
   ```

   This adds 9 per-category sensors (Tree/Grass/Weed x High/Medium/Low) and 1 AirQualitySensor.

6. **(Optional)** To test end-to-end in Apple Home, pair the test bridge:

   - Open the Home app on iOS or macOS
   - Tap **+** > **Add Accessory** > **More Options...**
   - Select "Test Homebridge" from the list
   - Enter the PIN: `031-45-154`

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
