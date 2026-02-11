# Homebridge Plugin Architecture

## Registration

A Homebridge plugin exports a default function that receives the `API` object and calls `api.registerPlatform(PLATFORM_NAME, PlatformClass)`. The platform name here must match `pluginAlias` in `config.schema.json`. The npm package name (`homebridge-pollen`) is how Homebridge discovers the plugin.

## Dynamic Platform Plugin Lifecycle

The plugin implements `DynamicPlatformPlugin` from `homebridge`. The lifecycle is:

1. **Constructor** — called with `(log, config, api)`. Set up state but do NOT create accessories here. Register a `didFinishLaunching` listener on the API.
2. **`configureAccessory(accessory)`** — Homebridge calls this for each accessory it has cached on disk. The plugin must store these in a list. This is called *before* `didFinishLaunching`.
3. **`didFinishLaunching` event** — now safe to create/remove accessories. Compare desired accessories against the cached list:
   - Cached and still desired → restore (call `api.updatePlatformAccessories`)
   - Not cached → create via `new api.platformAccessory(name, uuid)` then `api.registerPlatformAccessories`
   - Cached but no longer desired → remove via `api.unregisterPlatformAccessories`
4. **`shutdown` event** — clean up timers and connections.

## Accessory UUIDs

UUIDs must be deterministic and stable across restarts. Generate them with `api.hap.uuid.generate(stableString)`. This plugin uses `pollen-{category}-{location}` as the stable string. If the UUID changes, Homebridge treats it as a new accessory and the old one becomes stale.

## Services and Characteristics

Each `PlatformAccessory` has one or more `Service` objects. Always check `accessory.getService(ServiceType)` before calling `addService` to avoid duplicates on restore from cache.

Key pattern for getting/setting services:
```ts
const service = accessory.getService(api.hap.Service.AirQualitySensor)
  || accessory.addService(api.hap.Service.AirQualitySensor, displayName);
```

**Push model** — use `service.updateCharacteristic(CharType, value)` to push updates. This is preferred over registering `onGet` handlers when data is fetched on a polling interval. HomeKit GET requests return the last pushed value instantly.

## HomeKit Service Types Used

- **AirQualitySensor** — `AirQuality`: `UNKNOWN` (0), `EXCELLENT` (1), `GOOD` (2), `FAIR` (3), `INFERIOR` (4), `POOR` (5). Pollen counts are mapped to this scale.
- **AccessoryInformation** — always present on every accessory. Set `Manufacturer`, `Model`, `SerialNumber`.

## Accessories Created

- **Pollen** (always) — overall air quality sensor using combined pollen count
- **Tree Pollen** (optional) — air quality sensor for tree pollen count
- **Grass Pollen** (optional) — air quality sensor for grass pollen count
- **Weed Pollen** (optional) — air quality sensor for weed pollen count

Enable per-category sensors via `enableCategorySensors` in config.

## config.schema.json

This file defines the Homebridge UI configuration form. Key fields:

- `pluginAlias` — must match `PLATFORM_NAME` passed to `api.registerPlatform()`
- `pluginType` — `"platform"` for platform plugins
- `singular: true` — only one instance of this platform allowed
- `schema.properties` — defines form fields. Use `"required": true` on required fields.

## TypeScript Configuration

- Target `ES2022` with `module: nodenext` / `moduleResolution: nodenext`
- Imports must use `.js` extensions (e.g., `import { Foo } from './foo.js'`) — this is required by nodenext module resolution even though the source files are `.ts`
- `@types/node` is needed for `fetch`, `setInterval`, `clearInterval` globals
