// src/types.ts

export type Grain = 'any' | 'horizontal' | 'vertical';

export interface StockPlate {
  id: string;
  pos?: string;      // position number from the parts list / CSV
  label: string;
  material?: string; // pieces only go on plates of the same material (empty = any)
  width: number;   // mm
  height: number;  // mm
  thickness: number; // mm - material thickness
  grain: Grain;
  quantity: number;
  price?: number;  // € per plate, used for material cost
}

export interface CutPiece {
  id: string;
  pos?: string;
  name: string;
  material?: string;
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
  kerf?: number;      // saw kerf used for this plate (needed to size offcuts)
}

export interface CutStep {
  direction: 'horizontal' | 'vertical';
  position: number;    // mm from plate origin
  context: string;     // human-readable context, e.g. "im oberen Teil"
  subSteps?: CutStep[];
  panelWidth?: number;   // width of the panel being cut
  panelHeight?: number;  // height of the panel being cut
  pieceName?: string;    // name of the piece placed by this cut (if any)
  pieceX?: number;       // algorithm-space x of placed piece
  pieceY?: number;       // algorithm-space y of placed piece
  itemWidth?: number;    // size of the resulting piece or offcut (for its price share)
  itemHeight?: number;
}

// What is missing when not all pieces/parts could be placed (see algorithm/shortage.ts)
export interface StockNeed<S> {
  stock: S;
  available: number;  // quantity in stock
  needed: number;     // quantity needed to place everything
  missing: number;    // needed − available
}

export interface Shortage<S, P> {
  missing: StockNeed<S>[];  // stock types to add
  unfittable: P[];          // items that fit no stock type at all (size, thickness, material, grain)
}

export interface CutPlan {
  plates: PlacedPlate[];
  totalWastePct: number; // weighted: Σ(wasteArea) / Σ(plate area) × 100
  unusedStockPlates: Array<{ stock: StockPlate; quantity: number }>;
  unplacedPieces: CutPiece[]; // pieces that didn't fit any plate
  cutTrees?: CutNode[]; // one cut tree root per placed plate
  shortage?: Shortage<StockPlate, CutPiece>; // set when pieces could not be placed
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

// ---------------------------------------------------------------------------
// 1D linear cutting (bars, battens)
// ---------------------------------------------------------------------------

export type AppMode = '2d' | '1d';

// Parts only go on bars with the same cross-section (width × thickness) and
// material; 0 / empty means "not specified" and matches anything.
export interface StockBar {
  id: string;
  pos?: string;
  label: string;
  material: string;
  width: number;     // mm, cross-section
  thickness: number; // mm, cross-section
  length: number;    // mm
  quantity: number;
  price?: number;   // € per bar
}

export interface LinearPart {
  id: string;
  pos?: string;
  name: string;
  material: string;
  width: number;
  thickness: number;
  length: number;   // mm
  quantity: number;
}

export interface LinearPlacement {
  part: LinearPart;
  offset: number;   // mm from bar start
}

export interface PlacedBar {
  stock: StockBar;
  barIndex: number;          // 0-based physical instance index
  placements: LinearPlacement[];
  wasteLength: number;       // stock.length − Σ part lengths (includes kerf and trim)
  wastePct: number;
  cuts: number;              // saw cuts on this bar (trim + after each part not ending at bar end)
}

export interface LinearPlan {
  bars: PlacedBar[];
  totalWastePct: number;     // Σ wasteLength / Σ bar length × 100
  unusedStock: Array<{ stock: StockBar; quantity: number }>;
  unplacedParts: LinearPart[];
  shortage?: Shortage<StockBar, LinearPart>; // set when parts could not be placed
}
