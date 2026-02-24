import React from 'react';
import type { BlockShape as BlockShapeType } from '@/core/registry/types';
import {
    STROKE_WIDTH,
    BLOCK_MIN_WIDTH,
    HEADER_HEIGHT,
    VALUE_BLOCK_HEIGHT,
} from '@/core/ui/constants';
import {
    buildStackPath,
    buildHatPath,
    buildClampPath,
    buildValuePath,
    buildBooleanPath,
    stackBlockHeight,
} from '@/core/ui/pathBuilder';

export interface BlockShapeProps {
    shape: BlockShapeType;
    color: string;
    label: string;
    width?: number;
    /** Number of argument rows (each INPUT_ROW_HEIGHT tall) */
    argRows?: number;
    /** Body height for clamp blocks */
    bodyHeight?: number;
    isActive?: boolean;
    isBreakpoint?: boolean;
    /** Draggable is over the next drop zone */
    isOver?: boolean;
    /** Draggable is over the body drop zone (clamp blocks) */
    isBodyOver?: boolean;
    children?: React.ReactNode;
    /** Body slot content (for clamp blocks) */
    bodySlot?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
}

function darken(hex: string, amount = 0.18): string {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - Math.round(((n >> 16) & 0xff) * amount));
    const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(((n >> 8) & 0xff) * amount));
    const b = Math.max(0, (n & 0xff) - Math.round((n & 0xff) * amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const DROP_HIGHLIGHT = '2px dashed #60A5FA';

export const BlockShape: React.FC<BlockShapeProps> = ({
    shape,
    color,
    label,
    width,
    argRows = 0,
    bodyHeight = 36,
    isActive = false,
    isBreakpoint = false,
    isOver = false,
    isBodyOver = false,
    children,
    bodySlot,
    style,
    className,
}) => {
    const W = width ?? BLOCK_MIN_WIDTH;
    const stroke = darken(color);
    const activeGlow = isActive ? `drop-shadow(0 0 6px #fbbf24)` : undefined;
    const bpGlow = isBreakpoint ? `drop-shadow(0 0 5px #dc2626)` : undefined;
    const filter = activeGlow ?? bpGlow;

    if (shape === 'value') {
        const H = VALUE_BLOCK_HEIGHT;
        const vW = Math.max(60, W);
        const path = buildValuePath(vW, H);
        return (
            <svg
                width={vW}
                height={H}
                style={{
                    display: 'inline-block',
                    verticalAlign: 'middle',
                    filter,
                    outline: isOver ? DROP_HIGHLIGHT : undefined,
                    outlineOffset: 2,
                    borderRadius: 4,
                    ...style,
                }}
                className={className}
                overflow="visible"
            >
                <path d={path} fill={color} stroke={stroke} strokeWidth={STROKE_WIDTH} />
                <text x={vW / 2} y={H / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                    style={{ fontSize: 12, fontFamily: 'var(--font-ui)', fontWeight: 600, fill: '#fff', pointerEvents: 'none', userSelect: 'none' }}>
                    {label}
                </text>
                {children}
            </svg>
        );
    }

    if (shape === 'boolean') {
        const H = VALUE_BLOCK_HEIGHT;
        const bW = Math.max(80, W);
        const path = buildBooleanPath(bW, H);
        return (
            <svg
                width={bW}
                height={H}
                style={{
                    display: 'inline-block',
                    verticalAlign: 'middle',
                    filter,
                    outline: isOver ? DROP_HIGHLIGHT : undefined,
                    outlineOffset: 2,
                    borderRadius: 4,
                    ...style,
                }}
                className={className}
                overflow="visible"
            >
                <path d={path} fill={color} stroke={stroke} strokeWidth={STROKE_WIDTH} />
                <text x={bW / 2} y={H / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                    style={{ fontSize: 12, fontFamily: 'var(--font-ui)', fontWeight: 600, fill: '#fff', pointerEvents: 'none', userSelect: 'none' }}>
                    {label}
                </text>
                {children}
            </svg>
        );
    }

    if (shape === 'clamp') {
        const headerH = HEADER_HEIGHT + argRows * 24;
        const footH = HEADER_HEIGHT;
        const bH = Math.max(bodyHeight, 36);
        const totalH = headerH + bH + footH;
        const path = buildClampPath(W, headerH, bH, footH);

        return (
            <div style={{
                position: 'relative',
                display: 'inline-block',
                outline: isOver ? DROP_HIGHLIGHT : undefined,
                outlineOffset: 2,
                borderRadius: 4,
                ...style,
            }} className={className}>
                <svg
                    width={W}
                    height={totalH + 8}
                    overflow="visible"
                    style={{ display: 'block', filter }}
                >
                    <path d={path} fill={color} stroke={stroke} strokeWidth={STROKE_WIDTH} fillRule="evenodd" />
                    {/* Breakpoint dot */}
                    {isBreakpoint && <circle cx={10} cy={headerH / 2} r={5} fill="#dc2626" />}
                    {/* Label */}
                    <text x={W / 2} y={headerH / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                        style={{ fontSize: 13, fontFamily: 'var(--font-ui)', fontWeight: 700, fill: '#fff', pointerEvents: 'none', userSelect: 'none', textTransform: 'uppercase' }}>
                        {label}
                    </text>
                </svg>
                {/* Arg rows */}
                {argRows > 0 && (
                    <div style={{ position: 'absolute', top: HEADER_HEIGHT, left: 8, right: 8 }}>
                        {children}
                    </div>
                )}
                {/* Body slot */}
                <div style={{
                    position: 'absolute',
                    top: headerH,
                    left: 20,
                    width: W - 22,
                    minHeight: bH,
                    outline: isBodyOver ? DROP_HIGHLIGHT : undefined,
                    outlineOffset: 2,
                    borderRadius: 4,
                }}>
                    {bodySlot}
                </div>
            </div>
        );
    }

    // Stack or Hat
    const H = stackBlockHeight(argRows);
    const path = shape === 'hat' ? buildHatPath(W, H) : buildStackPath(W, H);
    const topPad = shape === 'hat' ? 10 : 0;

    return (
        <div style={{
            position: 'relative',
            display: 'inline-block',
            outline: isOver ? DROP_HIGHLIGHT : undefined,
            outlineOffset: 2,
            borderRadius: 4,
            ...style,
        }} className={className}>
            <svg
                width={W}
                height={H + topPad + 8}
                overflow="visible"
                style={{ display: 'block', filter }}
            >
                <g transform={`translate(0,${topPad})`}>
                    <path d={path} fill={color} stroke={stroke} strokeWidth={STROKE_WIDTH} />
                    {isBreakpoint && <circle cx={10} cy={HEADER_HEIGHT / 2} r={5} fill="#dc2626" />}
                    <text
                        x={W / 2} y={HEADER_HEIGHT / 2 + 1}
                        textAnchor="middle" dominantBaseline="middle"
                        style={{ fontSize: 13, fontFamily: 'var(--font-ui)', fontWeight: 700, fill: '#fff', pointerEvents: 'none', userSelect: 'none', textTransform: 'uppercase' }}
                    >
                        {label}
                    </text>
                </g>
            </svg>
            {/* Arg rows rendered as overlay */}
            {argRows > 0 && (
                <div style={{ position: 'absolute', top: topPad + HEADER_HEIGHT, left: 8, right: 8 }}>
                    {children}
                </div>
            )}
        </div>
    );
};
