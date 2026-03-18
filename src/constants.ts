// src/constants.ts

export const DEFAULT_KERF_MM = 3;
export const SCHEMA_VERSION_KEY = 'plattenzuschnitt_v1';
export const MAX_TOTAL_PIECES = 500;

export const PRESET_SIZES: Array<{ label: string; width: number; height: number }> = [
  { label: '2440×1220', width: 2440, height: 1220 },
  { label: '2800×2070', width: 2800, height: 2070 },
  { label: '2500×1250', width: 2500, height: 1250 },
  { label: '3050×1525', width: 3050, height: 1525 },
];

// 12 distinct, accessible colors for piece fill
export const COLOR_PALETTE = [
  '#60a5fa', '#34d399', '#f472b6', '#facc15',
  '#fb923c', '#a78bfa', '#2dd4bf', '#f87171',
  '#818cf8', '#4ade80', '#e879f9', '#38bdf8',
];
