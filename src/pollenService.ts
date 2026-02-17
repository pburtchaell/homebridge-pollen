import type { Logger } from "homebridge";
import { GOOGLE_POLLEN_BASE_URL } from "./settings.js";
import type { GooglePollenResponse, GooglePollenTypeInfo, ParsedPollenData } from "./types.js";

export class PollenService {
  private cache: ParsedPollenData | null = null;
  private consecutiveFailures = 0;

  constructor(
    private readonly apiKey: string,
    private readonly latitude: number,
    private readonly longitude: number,
    private readonly log: Logger,
  ) {}

  async fetchPollenData(): Promise<ParsedPollenData | null> {
    const url = `${GOOGLE_POLLEN_BASE_URL}/v1/forecast:lookup`
      + `?key=${encodeURIComponent(this.apiKey)}`
      + `&location.latitude=${this.latitude}`
      + `&location.longitude=${this.longitude}`
      + "&days=1"
      + "&plantsDescription=false";

    try {
      const response = await fetch(url);

      if (response.status === 401) {
        this.log.error(
          "Google Pollen API returned 401 Unauthorized. "
          + "Check that your API key is valid.",
        );
        return this.cache;
      }

      if (response.status === 403) {
        this.log.error(
          "Google Pollen API returned 403 Forbidden. "
          + "Ensure the Pollen API is enabled on your Google Cloud project "
          + "and billing is configured.",
        );
        return this.cache;
      }

      if (response.status === 429) {
        this.consecutiveFailures++;
        this.log.warn(
          "Google Pollen API rate limit reached (429). Will retry next cycle. "
          + `Consecutive failures: ${this.consecutiveFailures}`,
        );
        return this.cache;
      }

      if (!response.ok) {
        this.consecutiveFailures++;
        this.log.warn(
          `Google Pollen API returned ${response.status}. `
          + `Returning cached data. Consecutive failures: ${this.consecutiveFailures}`,
        );
        return this.cache;
      }

      const body = await response.json() as GooglePollenResponse;

      if (!body.dailyInfo || body.dailyInfo.length === 0) {
        this.log.warn(
          "Google Pollen API returned no daily info. "
          + "The location may not have pollen data available. Retaining cached data.",
        );
        return this.cache;
      }

      const today = body.dailyInfo[0];
      const types = today.pollenTypeInfo ?? [];

      const tree = this.extractCategory(types, "TREE");
      const grass = this.extractCategory(types, "GRASS");
      const weed = this.extractCategory(types, "WEED");

      const overallIndex = Math.max(tree.index, grass.index, weed.index);
      const overallLevel = [tree, grass, weed]
        .find(c => c.index === overallIndex)?.level ?? "None";

      const { year, month, day } = today.date;
      const timestamp = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const parsed: ParsedPollenData = {
        overall: { index: overallIndex, level: overallLevel },
        tree,
        grass,
        weed,
        timestamp,
      };

      this.cache = parsed;
      this.consecutiveFailures = 0;

      this.log.info(
        `Pollen data updated: overall=${overallIndex} (${overallLevel}), `
        + `tree=${tree.index} (${tree.level}), `
        + `grass=${grass.index} (${grass.level}), `
        + `weed=${weed.index} (${weed.level})`,
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

  private extractCategory(
    types: GooglePollenTypeInfo[],
    code: "TREE" | "GRASS" | "WEED",
  ): { index: number; level: string } {
    const entry = types.find(t => t.code === code);
    if (!entry?.indexInfo) {
      return { index: 0, level: "None" };
    }
    return { index: entry.indexInfo.value, level: entry.indexInfo.category };
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
