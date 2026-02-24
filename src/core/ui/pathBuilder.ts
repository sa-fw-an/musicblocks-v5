import {
    CORNER_RADIUS as R,
    NOTCH_WIDTH as NW,
    NOTCH_DEPTH as ND,
    NOTCH_OFFSET_L as NX,
    CLAMP_ARM_WIDTH as ARM,
    HEADER_HEIGHT,
    CLAMP_BODY_MIN_HEIGHT,
    CLAMP_NOTCH_OFFSET,
} from '@/core/ui/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Rounded corner arc: sweep=1 for CW (top-left→top-right→bottom-right→bottom-left) */
const arc = (rx: number, ry: number, sw: 0 | 1) => `a${rx},${ry} 0 0 ${sw}`;

// ─── Stack Block (plain statement block with top notch + bottom tab) ──────────
//
// Shape: rounded rectangle, top-left inset notch for connection above,
//        bottom-left protruding tab for connecting below.
//
// W = width, H = height
export function buildStackPath(W: number, H: number): string {
    const a = R; // corner arc radius shorthand
    // Top edge: L→R, with notch cut (inset)
    // notch: goes DOWN ND then across NW then back UP ND
    return [
        `M ${a},0`,
        // top-left corner → go right to notch
        `H ${NX}`,
        // notch inset
        `v ${ND} h ${NW} v ${-ND}`,
        // continue right to top-right corner
        `H ${W - a}`,
        // top-right arc
        `${arc(a, a, 1)} ${a},${a}`,
        // right edge down
        `V ${H - a}`,
        // bottom-right arc
        `${arc(a, a, 1)} ${-a},${a}`,
        // bottom edge: R→L, with tab protrusion
        `H ${NX + NW}`,
        // tab protrudes DOWN ND
        `v ${ND} h ${-NW} v ${-ND}`,
        // continue left to bottom-left corner
        `H ${a}`,
        // bottom-left arc
        `${arc(a, a, 1)} ${-a},${-a}`,
        // left edge up
        `V ${a}`,
        // top-left arc
        `${arc(a, a, 1)} ${a},${-a}`,
        'Z',
    ].join(' ');
}

// ─── Hat Block (start block — rounded dome top, no top notch, has bottom tab) ─

export function buildHatPath(W: number, H: number): string {
    const a = R;
    const domeH = 10; // extra dome height above flat top
    return [
        `M ${a},${domeH}`,
        // dome curve across the top
        `Q ${W / 2},${-domeH} ${W - a},${domeH}`,
        // top-right arc into right edge
        `${arc(a, a, 1)} ${a},${a}`,
        // right edge down
        `V ${H - a}`,
        // bottom-right arc
        `${arc(a, a, 1)} ${-a},${a}`,
        // bottom edge with tab
        `H ${NX + NW}`,
        `v ${ND} h ${-NW} v ${-ND}`,
        `H ${a}`,
        // bottom-left arc
        `${arc(a, a, 1)} ${-a},${-a}`,
        // left edge up
        `V ${domeH + a}`,
        // top-left arc
        `${arc(a, a, 1)} ${a},${-a}`,
        'Z',
    ].join(' ');
}

// ─── Clamp Block (control block with C-shape body slot) ───────────────────────
//
// Uses fill-rule="evenodd": outer path (CW rectangle) + inner hole path (CW).
// The inner hole is the body slot between the header and the bottom arm.
//
// bodyH = height of the inner body area (grows with children)
// bottomArmH = height of the bottom "foot" row (standard HEADER_HEIGHT)

export function buildClampOuterPath(W: number, headerH: number, bodyH: number, footH: number): string {
    const a = R;
    const totalH = headerH + bodyH + footH;

    return [
        // Start top-left
        `M ${a},0`,
        // top edge with notch
        `H ${NX}`,
        `v ${ND} h ${NW} v ${-ND}`,
        `H ${W - a}`,
        // top-right arc
        `${arc(a, a, 1)} ${a},${a}`,
        // right edge all the way down
        `V ${totalH - a}`,
        // bottom-right arc
        `${arc(a, a, 1)} ${-a},${a}`,
        // bottom edge with tab
        `H ${NX + NW}`,
        `v ${ND} h ${-NW} v ${-ND}`,
        `H ${a}`,
        // bottom-left arc
        `${arc(a, a, 1)} ${-a},${-a}`,
        // left edge up to top
        `V ${a}`,
        // top-left arc
        `${arc(a, a, 1)} ${a},${-a}`,
        'Z',
    ].join(' ');
}

export function buildClampHolePath(W: number, headerH: number, bodyH: number): string {
    // The hole starts at (ARM, headerH) and goes CW to create the body slot.
    // The left arm of the C is ARM pixels wide.
    // The slot notch at the bottom-left (where body blocks connect in) is cut out.
    const holeTop = headerH;
    const holeBot = headerH + bodyH;
    // const innerW = W - ARM; // kept for reference: width of hole from right side of arm to right wall

    return [
        `M ${ARM},${holeTop}`,
        // go right to inner right wall
        `H ${W - R}`,
        `${arc(R, R, 1)} ${R},${R}`,
        // down the right inner wall
        `V ${holeBot - R}`,
        `${arc(R, R, 1)} ${-R},${R}`,
        // bottom of hole going left, with body-connection notch
        `H ${ARM + NW + CLAMP_NOTCH_OFFSET}`,
        `v ${ND} h ${-NW} v ${-ND}`,
        `H ${ARM}`,
        // close (go up left arm inner wall)
        'Z',
    ].join(' ');
}

// Combined clamp path string (outer + hole, space-separated; use fill-rule="evenodd")
export function buildClampPath(W: number, headerH: number, bodyH: number, footH: number): string {
    return buildClampOuterPath(W, headerH, bodyH, footH) + ' ' + buildClampHolePath(W, headerH, bodyH);
}

// ─── Value / Reporter Block (rounded pill / hexagon) ─────────────────────────

export function buildValuePath(W: number, H: number): string {
    const r = H / 2; // pill radius
    return [
        `M ${r},0`,
        `H ${W - r}`,
        `a ${r},${r} 0 0 1 0,${H}`,
        `H ${r}`,
        `a ${r},${r} 0 0 1 0,${-H}`,
        'Z',
    ].join(' ');
}

// Boolean block = hexagon (pointy left and right)
export function buildBooleanPath(W: number, H: number): string {
    const mid = H / 2;
    const tip = mid * 0.85;
    return [
        `M ${tip},0`,
        `H ${W - tip}`,
        `L ${W},${mid}`,
        `L ${W - tip},${H}`,
        `H ${tip}`,
        `L 0,${mid}`,
        'Z',
    ].join(' ');
}

// ─── Convenience: compute block height from arg count ─────────────────────────

export function stackBlockHeight(argCount: number): number {
    return HEADER_HEIGHT + argCount * 24 + (argCount > 0 ? 8 : 0);
}

export function clampBodyHeight(childCount: number): number {
    return Math.max(CLAMP_BODY_MIN_HEIGHT + 8, childCount * 44 + CLAMP_BODY_MIN_HEIGHT);
}
