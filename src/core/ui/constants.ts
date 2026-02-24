// ─── SVG Block Shape Constants (blockfactory-aligned from docs Part 1.2) ───────

export const CORNER_RADIUS = 8; // was 4; blockfactory radius=8
export const SLOT_X = 10;
export const SLOT_Y = 2;
export const INNIE_X1 = 4;
export const INNIE_Y1 = 3;
export const INNIE_X2 = 4;
export const INNIE_Y2 = 4;
// Legacy layout constants (kept for compatibility)
export const NOTCH_WIDTH = 10;
export const NOTCH_DEPTH = 4;
export const NOTCH_OFFSET_L = 16; // distance from left edge to start of notch
export const CLAMP_ARM_WIDTH = 20;
export const HEADER_HEIGHT = 36;
export const INPUT_ROW_HEIGHT = 28;
export const STROKE_WIDTH = 1.5;
export const BLOCK_MIN_WIDTH = 200;
export const VALUE_BLOCK_HEIGHT = 30;
export const VALUE_BLOCK_PADDING_X = 12;
export const CLAMP_BODY_MIN_HEIGHT = 28; // min inner slot height
export const CLAMP_NOTCH_OFFSET = 8;    // x offset for inner bottom notch
export const DEFAULTBLOCKSCALE = 1.5;    // blockfactory scale (docs Part 4)

// ─── Category Colors (v3 hex values) ─────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, string> = {
    rhythm:    '#FF8700',
    pitch:     '#7CD622',
    tone:      '#3EDCDD',
    ornament:  '#3EDCDD',
    volume:    '#3EDCDD',
    drum:      '#3EDCDD',
    meter:     '#FE994F',
    intervals: '#7CD622',
    flow:      '#D98A43',
    action:    '#F3C800',
    boxes:     '#FFB900',
    number:    '#FF6EA1',
    boolean:   '#D97DF5',
    graphics:  '#92A9FF',
    turtle:    '#92A9FF',
    pen:       '#92A9FF',
    ensemble:  '#92A9FF',
    media:     '#FF664B',
    sensors:   '#AABB00',
    extras:    '#C4C4C4',
    program:   '#C4C4C4',
    heap:      '#D98A43',
    dict:      '#D98A43',
    widgets:   '#7CD622',
};

// ─── Palette Layout ────────────────────────────────────────────────────────────

export const SIDEBAR_WIDTH = 72;
export const BLOCK_LIST_WIDTH = 240;
export const HEADER_BAR_HEIGHT = 52;
