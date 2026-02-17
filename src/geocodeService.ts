import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { Logger } from "homebridge";
import { NOMINATIM_BASE_URL, GEOCODE_CACHE_FILE } from "./settings.js";
import type { GeocodeCacheEntry } from "./types.js";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export class GeocodeService {
  constructor(private readonly log: Logger) {}

  async resolve(
    location: string,
    storagePath: string,
  ): Promise<{ latitude: number; longitude: number }> {
    const cachePath = join(storagePath, GEOCODE_CACHE_FILE);

    const cached = await this.readCache(cachePath);
    if (cached && cached.location === location) {
      this.log.info(
        `Using cached coordinates for "${location}": `
        + `${cached.latitude}, ${cached.longitude}`,
      );
      return { latitude: cached.latitude, longitude: cached.longitude };
    }

    this.log.info(`Geocoding location "${location}" via Nominatim...`);

    const url = `${NOMINATIM_BASE_URL}/search?`
      + `q=${encodeURIComponent(location)}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "homebridge-pollen",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Nominatim geocoding failed with status ${response.status}`,
      );
    }

    const results = await response.json() as NominatimResult[];

    if (results.length === 0) {
      throw new Error(
        `Could not geocode location "${location}". `
        + "Check that it is a valid place name or zip code.",
      );
    }

    const latitude = parseFloat(results[0].lat);
    const longitude = parseFloat(results[0].lon);

    this.log.info(
      `Resolved "${location}" to ${latitude}, ${longitude} `
      + `(${results[0].display_name})`,
    );

    await this.writeCache(cachePath, { location, latitude, longitude });

    return { latitude, longitude };
  }

  private async readCache(
    cachePath: string,
  ): Promise<GeocodeCacheEntry | null> {
    try {
      const data = await readFile(cachePath, "utf-8");
      return JSON.parse(data) as GeocodeCacheEntry;
    } catch {
      return null;
    }
  }

  private async writeCache(
    cachePath: string,
    entry: GeocodeCacheEntry,
  ): Promise<void> {
    try {
      await mkdir(dirname(cachePath), { recursive: true });
      await writeFile(cachePath, JSON.stringify(entry, null, 2), "utf-8");
    } catch (error) {
      this.log.warn(
        `Failed to cache geocode result: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
