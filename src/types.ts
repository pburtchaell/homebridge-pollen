import type { PlatformConfig } from "homebridge";

export interface PollenConfig extends PlatformConfig {
  apiKey: string;
  location: string;
  pollInterval?: number;
  enableCategorySensors?: boolean;
}

// Google Pollen API response types

export interface GooglePollenResponse {
  regionCode?: string;
  dailyInfo: GoogleDayInfo[];
}

export interface GoogleDayInfo {
  date: { year: number; month: number; day: number };
  pollenTypeInfo: GooglePollenTypeInfo[];
}

export interface GooglePollenTypeInfo {
  code: "GRASS" | "TREE" | "WEED";
  displayName: string;
  inSeason: boolean;
  indexInfo?: GoogleIndexInfo;
}

export interface GoogleIndexInfo {
  code: string;
  displayName: string;
  value: number;
  category: string;
}

// Geocoding

export interface GeocodeCacheEntry {
  location: string;
  latitude: number;
  longitude: number;
}

// Internal normalized types (API-agnostic)

export type PollenCategory = "overall" | "tree" | "grass" | "weed";

export interface CategoryData {
  index: number;
  level: string;
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
