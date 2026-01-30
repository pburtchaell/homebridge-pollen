export const PLATFORM_NAME = 'HomebridgePollen';
export const PLUGIN_NAME = 'homebridge-pollen';

export const AMBEE_BASE_URL = 'https://api.ambeedata.com';

export const DEFAULT_POLL_INTERVAL = 60; // minutes
export const MIN_POLL_INTERVAL = 15; // minutes

export interface ThresholdRange {
  low: number;
  high: number;
}

export interface Thresholds {
  overall: ThresholdRange;
  tree: ThresholdRange;
  grass: ThresholdRange;
  weed: ThresholdRange;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  overall: { low: 50, high: 200 },
  tree: { low: 15, high: 90 },
  grass: { low: 20, high: 200 },
  weed: { low: 10, high: 50 },
};
