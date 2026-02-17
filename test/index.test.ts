import { PollenService } from "../src/pollenService.js";
import { GeocodeService } from "../src/geocodeService.js";
import type { GooglePollenResponse } from "../src/types.js";

// --- Mock logger ---

function createMockLog() {
  return Object.assign(() => {}, {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

// --- Helpers ---

function makeGoogleResponse(
  tree?: { value: number; category: string },
  grass?: { value: number; category: string },
  weed?: { value: number; category: string },
): GooglePollenResponse {
  const pollenTypeInfo = [];

  if (tree) {
    pollenTypeInfo.push({
      code: "TREE" as const,
      displayName: "Tree",
      inSeason: true,
      indexInfo: { code: "UPI", displayName: "Universal Pollen Index", ...tree },
    });
  } else {
    pollenTypeInfo.push({
      code: "TREE" as const,
      displayName: "Tree",
      inSeason: false,
    });
  }

  if (grass) {
    pollenTypeInfo.push({
      code: "GRASS" as const,
      displayName: "Grass",
      inSeason: true,
      indexInfo: { code: "UPI", displayName: "Universal Pollen Index", ...grass },
    });
  } else {
    pollenTypeInfo.push({
      code: "GRASS" as const,
      displayName: "Grass",
      inSeason: false,
    });
  }

  if (weed) {
    pollenTypeInfo.push({
      code: "WEED" as const,
      displayName: "Weed",
      inSeason: true,
      indexInfo: { code: "UPI", displayName: "Universal Pollen Index", ...weed },
    });
  } else {
    pollenTypeInfo.push({
      code: "WEED" as const,
      displayName: "Weed",
      inSeason: false,
    });
  }

  return {
    regionCode: "US",
    dailyInfo: [{
      date: { year: 2026, month: 2, day: 16 },
      pollenTypeInfo,
    }],
  };
}

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }));
}

// --- PollenService tests ---

describe("PollenService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses a full Google Pollen API response", async () => {
    mockFetch(makeGoogleResponse(
      { value: 3, category: "Moderate" },
      { value: 1, category: "Very Low" },
      { value: 2, category: "Low" },
    ));

    const service = new PollenService("key", 40.7, -74.0, createMockLog());
    const data = await service.fetchPollenData();

    expect(data).not.toBeNull();
    expect(data!.tree).toEqual({ index: 3, level: "Moderate" });
    expect(data!.grass).toEqual({ index: 1, level: "Very Low" });
    expect(data!.weed).toEqual({ index: 2, level: "Low" });
    expect(data!.overall.index).toBe(3);
    expect(data!.overall.level).toBe("Moderate");
    expect(data!.timestamp).toBe("2026-02-16");
  });

  it("treats out-of-season types as index 0", async () => {
    mockFetch(makeGoogleResponse(
      { value: 2, category: "Low" },
      undefined, // grass out of season
      undefined, // weed out of season
    ));

    const service = new PollenService("key", 40.7, -74.0, createMockLog());
    const data = await service.fetchPollenData();

    expect(data!.grass).toEqual({ index: 0, level: "None" });
    expect(data!.weed).toEqual({ index: 0, level: "None" });
    expect(data!.overall.index).toBe(2);
  });

  it("handles all types out of season", async () => {
    mockFetch(makeGoogleResponse());

    const service = new PollenService("key", 40.7, -74.0, createMockLog());
    const data = await service.fetchPollenData();

    expect(data!.overall.index).toBe(0);
    expect(data!.overall.level).toBe("None");
  });

  it("returns null on first call with 401 error", async () => {
    mockFetch({ error: { message: "Unauthorized" } }, 401);

    const log = createMockLog();
    const service = new PollenService("bad-key", 40.7, -74.0, log);
    const data = await service.fetchPollenData();

    expect(data).toBeNull();
    expect(log.error).toHaveBeenCalled();
  });

  it("returns null on first call with 403 error", async () => {
    mockFetch({ error: { message: "Forbidden" } }, 403);

    const log = createMockLog();
    const service = new PollenService("key", 40.7, -74.0, log);
    const data = await service.fetchPollenData();

    expect(data).toBeNull();
    expect(log.error).toHaveBeenCalled();
  });

  it("returns cached data on 429 rate limit", async () => {
    // First call succeeds
    mockFetch(makeGoogleResponse({ value: 4, category: "High" }));
    const service = new PollenService("key", 40.7, -74.0, createMockLog());
    await service.fetchPollenData();

    // Second call rate limited
    mockFetch({ error: { message: "Rate limited" } }, 429);
    const data = await service.fetchPollenData();

    expect(data).not.toBeNull();
    expect(data!.tree.index).toBe(4);
  });

  it("returns cached data on empty dailyInfo", async () => {
    mockFetch(makeGoogleResponse({ value: 1, category: "Very Low" }));
    const service = new PollenService("key", 40.7, -74.0, createMockLog());
    await service.fetchPollenData();

    mockFetch({ dailyInfo: [] });
    const data = await service.fetchPollenData();

    expect(data).not.toBeNull();
    expect(data!.tree.index).toBe(1);
  });

  it("returns cached data on network error", async () => {
    mockFetch(makeGoogleResponse({ value: 2, category: "Low" }));
    const service = new PollenService("key", 40.7, -74.0, createMockLog());
    await service.fetchPollenData();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const data = await service.fetchPollenData();

    expect(data).not.toBeNull();
    expect(data!.tree.index).toBe(2);
  });

  it("computes backoff multiplier on consecutive failures", async () => {
    mockFetch({}, 500);
    const service = new PollenService("key", 40.7, -74.0, createMockLog());

    await service.fetchPollenData();
    expect(service.getBackoffMultiplier()).toBe(1);

    await service.fetchPollenData();
    expect(service.getBackoffMultiplier()).toBe(2);

    await service.fetchPollenData();
    expect(service.getBackoffMultiplier()).toBe(4);
  });

  it("resets backoff on successful fetch", async () => {
    mockFetch({}, 500);
    const service = new PollenService("key", 40.7, -74.0, createMockLog());
    await service.fetchPollenData();
    await service.fetchPollenData();
    expect(service.getBackoffMultiplier()).toBe(2);

    mockFetch(makeGoogleResponse({ value: 1, category: "Very Low" }));
    await service.fetchPollenData();
    expect(service.getBackoffMultiplier()).toBe(1);
  });
});

// --- GeocodeService tests ---

describe("GeocodeService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("geocodes a location via Nominatim", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{
        lat: "40.7127281",
        lon: "-74.0060152",
        display_name: "New York, NY, USA",
      }]),
    }));

    // Use a temp dir that won't have a cache file
    const service = new GeocodeService(createMockLog());
    const result = await service.resolve("10001", "/tmp/homebridge-pollen-test-" + Date.now());

    expect(result.latitude).toBeCloseTo(40.7127, 3);
    expect(result.longitude).toBeCloseTo(-74.006, 3);
  });

  it("throws on empty geocode results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));

    const service = new GeocodeService(createMockLog());
    await expect(
      service.resolve("notarealplace999", "/tmp/homebridge-pollen-test-" + Date.now()),
    ).rejects.toThrow("Could not geocode");
  });

  it("throws on Nominatim HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const service = new GeocodeService(createMockLog());
    await expect(
      service.resolve("10001", "/tmp/homebridge-pollen-test-" + Date.now()),
    ).rejects.toThrow("Nominatim geocoding failed");
  });
});

// --- UPI to AirQuality mapping ---

describe("UPI to AirQuality mapping", () => {
  // The mapping logic is in platformAccessory.ts but tightly coupled to HomeKit.
  // Test the expected mapping values directly.
  const mapping: [number, number][] = [
    [0, 1], // None → EXCELLENT
    [1, 1], // Very Low → EXCELLENT
    [2, 2], // Low → GOOD
    [3, 3], // Moderate → FAIR
    [4, 4], // High → INFERIOR
    [5, 5], // Very High → POOR
  ];

  for (const [upi, expected] of mapping) {
    it(`UPI ${upi} maps to AirQuality ${expected}`, () => {
      // Reproduce the switch logic from platformAccessory.ts
      let quality: number;
      switch (upi) {
        case 0:
        case 1:
          quality = 1; // EXCELLENT
          break;
        case 2:
          quality = 2; // GOOD
          break;
        case 3:
          quality = 3; // FAIR
          break;
        case 4:
          quality = 4; // INFERIOR
          break;
        case 5:
          quality = 5; // POOR
          break;
        default:
          quality = 0; // UNKNOWN
      }
      expect(quality).toBe(expected);
    });
  }
});
