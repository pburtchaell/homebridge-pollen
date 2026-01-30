import type { Logger } from 'homebridge';
import { AMBEE_BASE_URL } from './settings.js';
import type { AmbeePollenResponse, ParsedPollenData, PollenLevel } from './types.js';

// Internal thresholds for level classification (used for logging)
const THRESHOLDS = {
  overall: { low: 50, high: 200 },
  tree: { low: 15, high: 90 },
  grass: { low: 20, high: 200 },
  weed: { low: 10, high: 50 },
};

function classifyLevel(count: number, thresholds: { low: number; high: number }): PollenLevel {
  if (count >= thresholds.high) {
    return 'High';
  }
  if (count <= thresholds.low) {
    return 'Low';
  }
  return 'Medium';
}

export class PollenService {
  private cache: ParsedPollenData | null = null;
  private consecutiveFailures = 0;

  constructor(
    private readonly apiKey: string,
    private readonly location: string,
    private readonly log: Logger,
  ) {}

  async fetchPollenData(): Promise<ParsedPollenData | null> {
    const url = `${AMBEE_BASE_URL}/latest/pollen/by-place?place=${encodeURIComponent(this.location)}`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        this.log.error('Ambee API returned 401 Unauthorized. Check that your API key is valid.');
        return this.cache;
      }

      if (response.status === 429) {
        this.consecutiveFailures++;
        this.log.warn(
          'Ambee API rate limit reached (429). Will retry next cycle. '
          + `Consecutive failures: ${this.consecutiveFailures}`,
        );
        return this.cache;
      }

      if (!response.ok) {
        this.consecutiveFailures++;
        this.log.warn(
          `Ambee API returned ${response.status}. `
          + `Returning cached data. Consecutive failures: ${this.consecutiveFailures}`,
        );
        return this.cache;
      }

      const body = await response.json() as AmbeePollenResponse;

      if (!body.data || body.data.length === 0) {
        this.log.warn(
          `Ambee API returned no pollen data for location "${this.location}". `
          + 'The location may not be supported. Retaining cached data.',
        );
        return this.cache;
      }

      const item = body.data[0];
      const treeCount = item.Count.tree_pollen;
      const grassCount = item.Count.grass_pollen;
      const weedCount = item.Count.weed_pollen;
      const totalCount = treeCount + grassCount + weedCount;

      const parsed: ParsedPollenData = {
        overall: {
          count: totalCount,
          level: classifyLevel(totalCount, THRESHOLDS.overall),
        },
        tree: {
          count: treeCount,
          level: classifyLevel(treeCount, THRESHOLDS.tree),
        },
        grass: {
          count: grassCount,
          level: classifyLevel(grassCount, THRESHOLDS.grass),
        },
        weed: {
          count: weedCount,
          level: classifyLevel(weedCount, THRESHOLDS.weed),
        },
        timestamp: item.updatedAt,
      };

      this.cache = parsed;
      this.consecutiveFailures = 0;

      this.log.info(
        `Pollen data updated: overall=${totalCount} (${parsed.overall.level}), `
        + `tree=${treeCount} (${parsed.tree.level}), `
        + `grass=${grassCount} (${parsed.grass.level}), `
        + `weed=${weedCount} (${parsed.weed.level})`,
      );

      return parsed;
    } catch (error) {
      this.consecutiveFailures++;
      this.log.warn(
        `Failed to fetch pollen data: ${error instanceof Error ? error.message : error}. `
        + `Returning cached data. Consecutive failures: ${this.consecutiveFailures}`,
      );
      return this.cache;
    }
  }

  getBackoffMultiplier(): number {
    if (this.consecutiveFailures <= 1) {
      return 1;
    }
    return Math.min(2 ** (this.consecutiveFailures - 1), 16);
  }

  getCachedData(): ParsedPollenData | null {
    return this.cache;
  }
}
