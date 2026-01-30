import type { PlatformConfig } from 'homebridge';
import type { Thresholds } from './settings.js';

export interface PollenConfig extends PlatformConfig {
  apiKey: string;
  location: string;
  pollInterval?: number;
  enableCategorySensors?: boolean;
  enableAirQualitySensor?: boolean;
  thresholds?: Partial<{
    overall: Partial<{ low: number; high: number }>;
    tree: Partial<{ low: number; high: number }>;
    grass: Partial<{ low: number; high: number }>;
    weed: Partial<{ low: number; high: number }>;
  }>;
}

export interface AmbeePollenCount {
  grass_pollen: number;
  tree_pollen: number;
  weed_pollen: number;
}

export interface AmbeePollenRisk {
  grass_pollen: string;
  tree_pollen: string;
  weed_pollen: string;
}

export interface AmbeePollenSpecies {
  Grass: Record<string, number>;
  Tree: Record<string, number>;
  Weed: Record<string, number>;
}

export interface AmbeePollenDataItem {
  Count: AmbeePollenCount;
  Risk: AmbeePollenRisk;
  Species: AmbeePollenSpecies;
  updatedAt: string;
}

export interface AmbeePollenResponse {
  message: string;
  data: AmbeePollenDataItem[];
}

export type PollenLevel = 'High' | 'Medium' | 'Low';
export type PollenCategory = 'overall' | 'tree' | 'grass' | 'weed';

export interface CategoryData {
  count: number;
  level: PollenLevel;
}

export interface ParsedPollenData {
  overall: CategoryData;
  tree: CategoryData;
  grass: CategoryData;
  weed: CategoryData;
  timestamp: string;
}

export type AccessoryType = 'contact' | 'airquality';

export interface AccessoryDefinition {
  id: string;
  name: string;
  type: AccessoryType;
  level?: PollenLevel;
  category?: PollenCategory;
}

export function classifyLevel(count: number, thresholds: { low: number; high: number }): PollenLevel {
  if (count >= thresholds.high) {
    return 'High';
  }
  if (count <= thresholds.low) {
    return 'Low';
  }
  return 'Medium';
}

export function resolveThresholds(config: PollenConfig, defaults: Thresholds): Thresholds {
  const overrides = config.thresholds;
  if (!overrides) {
    return defaults;
  }
  return {
    overall: { ...defaults.overall, ...overrides.overall },
    tree: { ...defaults.tree, ...overrides.tree },
    grass: { ...defaults.grass, ...overrides.grass },
    weed: { ...defaults.weed, ...overrides.weed },
  };
}
