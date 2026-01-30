# CLAUDE.md

## Project Overview

Homebridge dynamic platform plugin that fetches pollen data from the Ambee API and exposes it as HomeKit accessories. No runtime dependencies — uses Node.js 20+ built-in `fetch`.

## Commands

- `npm run build` — clean compile TypeScript to `dist/`
- `npm run lint` — ESLint
- `npm run watch` — build, link, and start Homebridge with nodemon (auto-restarts on src changes)

## Homebridge Plugin Architecture

### Registration

A Homebridge plugin exports a default function that receives the `API` object and calls `api.registerPlatform(PLATFORM_NAME, PlatformClass)`. The platform name here must match `pluginAlias` in `config.schema.json`. The npm package name (`homebridge-pollen`) is how Homebridge discovers the plugin.

### Dynamic Platform Plugin Lifecycle

The plugin implements `DynamicPlatformPlugin` from `homebridge`. The lifecycle is:

1. **Constructor** — called with `(log, config, api)`. Set up state but do NOT create accessories here. Register a `didFinishLaunching` listener on the API.
2. **`configureAccessory(accessory)`** — Homebridge calls this for each accessory it has cached on disk. The plugin must store these in a list. This is called *before* `didFinishLaunching`.
3. **`didFinishLaunching` event** — now safe to create/remove accessories. Compare desired accessories against the cached list:
   - Cached and still desired → restore (call `api.updatePlatformAccessories`)
   - Not cached → create via `new api.platformAccessory(name, uuid)` then `api.registerPlatformAccessories`
   - Cached but no longer desired → remove via `api.unregisterPlatformAccessories`
4. **`shutdown` event** — clean up timers and connections.

### Accessory UUIDs

UUIDs must be deterministic and stable across restarts. Generate them with `api.hap.uuid.generate(stableString)`. This plugin uses `pollen-{category}-{level}-{location}` as the stable string. If the UUID changes, Homebridge treats it as a new accessory and the old one becomes stale.

### Services and Characteristics

Each `PlatformAccessory` has one or more `Service` objects. Always check `accessory.getService(ServiceType)` before calling `addService` to avoid duplicates on restore from cache.

Key pattern for getting/setting services:
```ts
const service = accessory.getService(api.hap.Service.ContactSensor)
  || accessory.addService(api.hap.Service.ContactSensor, displayName);
```

**Push model** — use `service.updateCharacteristic(CharType, value)` to push updates. This is preferred over registering `onGet` handlers when data is fetched on a polling interval. HomeKit GET requests return the last pushed value instantly.

### HomeKit Service Types Used

- **ContactSensor** — `ContactSensorState`: `CONTACT_DETECTED` (0) or `CONTACT_NOT_DETECTED` (1). Used because contact sensor state changes are native HomeKit automation triggers ("When X detected...").
- **AirQualitySensor** — `AirQuality`: `UNKNOWN` (0), `EXCELLENT` (1), `GOOD` (2), `FAIR` (3), `INFERIOR` (4), `POOR` (5).
- **AccessoryInformation** — always present on every accessory. Set `Manufacturer`, `Model`, `SerialNumber`.

### config.schema.json

This file defines the Homebridge UI configuration form. Key fields:

- `pluginAlias` — must match `PLATFORM_NAME` passed to `api.registerPlatform()`
- `pluginType` — `"platform"` for platform plugins
- `singular: true` — only one instance of this platform allowed
- `schema.properties` — defines form fields. Use `"required": true` on required fields. Nested objects with `"expandable": true` render as collapsible sections in the UI.

### TypeScript Configuration

- Target `ES2022` with `module: nodenext` / `moduleResolution: nodenext`
- Imports must use `.js` extensions (e.g., `import { Foo } from './foo.js'`) — this is required by nodenext module resolution even though the source files are `.ts`
- `@types/node` is needed for `fetch`, `setInterval`, `clearInterval` globals

## Ambee API

- **Endpoint**: `GET https://api.ambeedata.com/latest/pollen/by-place?place={location}`
- **Auth**: `x-api-key` header with API key
- **Free tier**: 100 calls/day — default 60-min polling = 24 calls/day
- **Response shape**: `{ message: string, data: [{ Count: { grass_pollen, tree_pollen, weed_pollen }, Risk: {...}, Species: {...}, updatedAt: string }] }`
- The `by-place` endpoint accepts zip codes and place names directly

## Pollen Thresholds

Default thresholds based on NAB (National Allergy Bureau) guidelines. A count is classified as:
- **Low** if `count <= threshold.low`
- **High** if `count >= threshold.high`
- **Medium** otherwise

| Category | Low | High |
|----------|-----|------|
| Overall  | 50  | 200  |
| Tree     | 15  | 90   |
| Grass    | 20  | 200  |
| Weed     | 10  | 50   |

Users can override these via `config.thresholds`.

## Error Handling

- Missing `apiKey`/`location` — logs error, plugin does not start polling
- 401 — logs clear message about invalid API key, returns cached data
- 429 — logs warning, increments consecutive failure counter for exponential backoff
- Network/5xx — logs warning, returns cached data, retries next cycle
- Empty data array — logs warning about unsupported location, retains cache
