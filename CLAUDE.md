# CLAUDE.md

## Project overview

Homebridge dynamic platform plugin that fetches pollen data from the Ambee API and exposes it as HomeKit air quality sensors. No runtime dependencies — uses Node.js 20+ built-in `fetch`.

## Commands

- `npm run build` — clean compile TypeScript to `dist/`
- `npm run lint` — ESLint
- `npm run dev` — build, link, and start Homebridge with nodemon (auto-restarts on src changes)

## Homebridge plugin architecture

### Registration

A Homebridge plugin exports a default function that receives the `API` object and calls `api.registerPlatform(PLATFORM_NAME, PlatformClass)`. The platform name here must match `pluginAlias` in `config.schema.json`. The npm package name (`homebridge-pollen`) is how Homebridge discovers the plugin.

### Dynamic platform plugin lifecycle

The plugin implements `DynamicPlatformPlugin` from `homebridge`. The lifecycle is:

1. **Constructor** — called with `(log, config, api)`. Set up state but do NOT create accessories here. Register a `didFinishLaunching` listener on the API.
2. **`configureAccessory(accessory)`** — Homebridge calls this for each accessory it has cached on disk. The plugin must store these in a list. This is called *before* `didFinishLaunching`.
3. **`didFinishLaunching` event** — now safe to create/remove accessories. Compare desired accessories against the cached list:
   - Cached and still desired → restore (call `api.updatePlatformAccessories`)
   - Not cached → create via `new api.platformAccessory(name, uuid)` then `api.registerPlatformAccessories`
   - Cached but no longer desired → remove via `api.unregisterPlatformAccessories`
4. **`shutdown` event** — clean up timers and connections.

### Accessory UUIDs

UUIDs must be deterministic and stable across restarts. Generate them with `api.hap.uuid.generate(stableString)`. This plugin uses `pollen-{category}-{location}` as the stable string. If the UUID changes, Homebridge treats it as a new accessory and the old one becomes stale.

### Services and characteristics

Each `PlatformAccessory` has one or more `Service` objects. Always check `accessory.getService(ServiceType)` before calling `addService` to avoid duplicates on restore from cache.

Key pattern for getting/setting services:
```ts
const service = accessory.getService(api.hap.Service.AirQualitySensor)
  || accessory.addService(api.hap.Service.AirQualitySensor, displayName);
```

**Push model** — use `service.updateCharacteristic(CharType, value)` to push updates. This is preferred over registering `onGet` handlers when data is fetched on a polling interval. HomeKit GET requests return the last pushed value instantly.

### HomeKit service types used

- **AirQualitySensor** — `AirQuality`: `UNKNOWN` (0), `EXCELLENT` (1), `GOOD` (2), `FAIR` (3), `INFERIOR` (4), `POOR` (5). Pollen counts are mapped to this scale.
- **AccessoryInformation** — always present on every accessory. Set `Manufacturer`, `Model`, `SerialNumber`.

### Accessories created

- **Pollen** (always) — overall air quality sensor using combined pollen count
- **Tree Pollen** (optional) — air quality sensor for tree pollen count
- **Grass Pollen** (optional) — air quality sensor for grass pollen count
- **Weed Pollen** (optional) — air quality sensor for weed pollen count

Enable per-category sensors via `enableCategorySensors` in config.

### config.schema.json

This file defines the Homebridge UI configuration form. Key fields:

- `pluginAlias` — must match `PLATFORM_NAME` passed to `api.registerPlatform()`
- `pluginType` — `"platform"` for platform plugins
- `singular: true` — only one instance of this platform allowed
- `schema.properties` — defines form fields. Use `"required": true` on required fields.

### TypeScript configuration

- Target `ES2022` with `module: nodenext` / `moduleResolution: nodenext`
- Imports must use `.js` extensions (e.g., `import { Foo } from './foo.js'`) — this is required by nodenext module resolution even though the source files are `.ts`
- `@types/node` is needed for `fetch`, `setInterval`, `clearInterval` globals

## Ambee API

- **Endpoint**: `GET https://api.ambeedata.com/latest/pollen/by-place?place={location}`
- **Auth**: `x-api-key` header with API key
- **Free tier**: 100 calls/day — default 60-min polling = 24 calls/day
- **Response shape**: `{ message: string, data: [{ Count: { grass_pollen, tree_pollen, weed_pollen }, Risk: {...}, Species: {...}, updatedAt: string }] }`
- The `by-place` endpoint accepts zip codes and place names directly

## Air quality mapping

Pollen counts are mapped to HomeKit's AirQuality scale:

| Pollen count | AirQuality |
|--------------|------------|
| 0-20         | Excellent  |
| 21-80        | Good       |
| 81-200       | Fair       |
| 201-400      | Inferior   |
| 400+         | Poor       |

## Error handling

- Missing `apiKey`/`location` — logs error, plugin does not start polling
- 401 — logs error about invalid API key, returns cached data
- 429 — logs warning, increments consecutive failure counter for exponential backoff
- Network/5xx — logs warning, returns cached data, retries next cycle
- Empty data array — logs warning about unsupported location, retains cache
