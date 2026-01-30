import type { PlatformConfig } from 'homebridge';

export interface PollenConfig extends PlatformConfig {
  apiKey: string;
  location: string;
  pollInterval?: number;
  enableCategorySensors?: boolean;
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

export interface AccessoryDefinition {
  id: string;
  name: string;
  category: PollenCategory;
}
