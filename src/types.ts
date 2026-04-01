// src/types.ts

export type Grain = 'any' | 'horizontal' | 'vertical';

export interface StockPlate {
  id: string;
  label: string;
  width: number;   // mm
  height: number;  // mm
  thickness: number; // mm - material thickness
  grain: Grain;
  quantity: number;
}

export interface CutPiece {
  id: string;
  name: string;
  width: number;   // mm
  height: number;  // mm
  thickness: number; // mm - material thickness
  quantity: number;
  grain: Grain;
}

export interface Placement {
  piece: CutPiece;
  x: number;       // mm, top-left origin
  y: number;
  rotated: boolean; // true = width↔height swapped
}

export interface PlacedPlate {
  stock: StockPlate;
  plateIndex: number; // 0-based physical instance index
  placements: Placement[];
  // wasteArea = (stock.width × stock.height) − Σ(piece areas) − Σ(kerf strip areas)
  wasteArea: number;
  wastePct: number;   // wasteArea / (stock.width × stock.height) × 100
  cutTree?: CutNode;  // root of the guillotine cut tree for this plate
}

export interface CutStep {
  direction: 'horizontal' | 'vertical';
  position: number;    // mm from plate origin
  context: string;     // human-readable context, e.g. "im oberen Teil"
  subSteps?: CutStep[];
  panelWidth?: number;   // width of the panel being cut
  panelHeight?: number;  // height of the panel being cut
  pieceName?: string;    // name of the piece placed by this cut (if any)
}

export interface CutPlan {
  plates: PlacedPlate[];
  totalWastePct: number; // weighted: Σ(wasteArea) / Σ(plate area) × 100
  unusedStockPlates: Array<{ stock: StockPlate; quantity: number }>;
  unplacedPieces: CutPiece[]; // pieces that didn't fit any plate
  cutTrees?: CutNode[]; // one cut tree root per placed plate
}

export type OptimizationPriority = 'least-waste' | 'least-cuts' | 'balanced';

export interface CutNode {
  direction: 'horizontal' | 'vertical';
  position: number;       // mm from top/left of parent panel
  panelWidth: number;     // width of panel being cut
  panelHeight: number;    // height of panel being cut
  piece?: Placement;      // placed piece (if this is a leaf)
  children?: CutNode[];   // sub-cuts
}

export interface AppOptions {
  kerf: number;
  grainEnabled: boolean;
  priority: OptimizationPriority;
  trimLeft: number;
  trimTop: number;
}
