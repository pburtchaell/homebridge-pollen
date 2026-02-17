import type {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
} from "homebridge";
import {
  DEFAULT_POLL_INTERVAL,
  MIN_POLL_INTERVAL,
  PLATFORM_NAME,
  PLUGIN_NAME,
} from "./settings.js";
import type { AccessoryDefinition, PollenCategory, PollenConfig } from "./types.js";
import { PollenService } from "./pollenService.js";
import { GeocodeService } from "./geocodeService.js";
import { PollenAccessoryHandler } from "./platformAccessory.js";

export class PollenPlatform implements DynamicPlatformPlugin {
  private readonly cachedAccessories: PlatformAccessory[] = [];
  private readonly handlers: Map<string, PollenAccessoryHandler> = new Map();
  private pollenService?: PollenService;
  private pollTimer?: ReturnType<typeof setInterval>;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    const pollenConfig = config as PollenConfig;

    if (!pollenConfig.apiKey || !pollenConfig.location) {
      this.log.error(
        "Missing required configuration: apiKey and location must be set. "
        + "Plugin will not start.",
      );
      return;
    }

    this.api.on("didFinishLaunching", () => {
      this.initialize(pollenConfig);
    });

    this.api.on("shutdown", () => {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
      }
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info(`Loading accessory from cache: ${accessory.displayName}`);
    this.cachedAccessories.push(accessory);
  }

  private async initialize(config: PollenConfig): Promise<void> {
    try {
      const geocoder = new GeocodeService(this.log);
      const { latitude, longitude } = await geocoder.resolve(
        config.location,
        this.api.user.storagePath(),
      );

      this.pollenService = new PollenService(
        config.apiKey,
        latitude,
        longitude,
        this.log,
      );

      this.discoverDevices(config);
      this.startPolling(config);
    } catch (error) {
      this.log.error(
        `Failed to initialize plugin: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private discoverDevices(config: PollenConfig): void {
    const definitions = this.buildAccessoryDefinitions(config);

    const desiredUUIDs = new Set<string>();

    for (const definition of definitions) {
      const uuid = this.api.hap.uuid.generate(definition.id);
      desiredUUIDs.add(uuid);

      const existingAccessory = this.cachedAccessories.find(a => a.UUID === uuid);

      if (existingAccessory) {
        this.log.info(`Restoring accessory from cache: ${existingAccessory.displayName}`);
        existingAccessory.context.definition = definition;
        const handler = new PollenAccessoryHandler(existingAccessory, definition, this.api, this.log);
        this.handlers.set(uuid, handler);
        this.api.updatePlatformAccessories([existingAccessory]);
      } else {
        this.log.info(`Adding new accessory: ${definition.name}`);
        const accessory = new this.api.platformAccessory(definition.name, uuid);
        accessory.context.definition = definition;
        const handler = new PollenAccessoryHandler(accessory, definition, this.api, this.log);
        this.handlers.set(uuid, handler);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    // Remove stale accessories
    const staleAccessories = this.cachedAccessories.filter(a => !desiredUUIDs.has(a.UUID));
    if (staleAccessories.length > 0) {
      this.log.info(`Removing ${staleAccessories.length} stale accessory(ies)`);
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, staleAccessories);
    }
  }

  private buildAccessoryDefinitions(config: PollenConfig): AccessoryDefinition[] {
    const location = config.location;
    const definitions: AccessoryDefinition[] = [];

    // Main pollen air quality sensor (always created)
    definitions.push({
      id: `pollen-overall-${location}`,
      name: "Pollen",
      category: "overall",
    });

    // Optional per-category sensors
    if (config.enableCategorySensors) {
      const categories: PollenCategory[] = ["tree", "grass", "weed"];
      for (const category of categories) {
        const label = category.charAt(0).toUpperCase() + category.slice(1);
        definitions.push({
          id: `pollen-${category}-${location}`,
          name: `${label} Pollen`,
          category,
        });
      }
    }

    return definitions;
  }

  private startPolling(config: PollenConfig): void {
    if (!this.pollenService) {
      return;
    }

    const intervalMinutes = Math.max(
      config.pollInterval ?? DEFAULT_POLL_INTERVAL,
      MIN_POLL_INTERVAL,
    );
    const intervalMs = intervalMinutes * 60 * 1000;

    this.log.info(`Polling Google Pollen API every ${intervalMinutes} minutes for location "${config.location}"`);

    // Immediate first fetch
    this.poll();

    this.pollTimer = setInterval(() => {
      const backoff = this.pollenService!.getBackoffMultiplier();
      if (backoff > 1) {
        this.log.debug(`Backoff active (${backoff}x). Skipping this poll cycle.`);
        return;
      }
      this.poll();
    }, intervalMs);
  }

  private async poll(): Promise<void> {
    if (!this.pollenService) {
      return;
    }

    const data = await this.pollenService.fetchPollenData();
    if (!data) {
      this.log.debug("No pollen data available (no cached data yet).");
      return;
    }

    for (const handler of this.handlers.values()) {
      handler.updatePollenData(data);
    }
  }
}
