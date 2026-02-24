import React, { useRef, useState, useEffect } from 'react';
import type { ProtoblockShape } from '@/core/registry/types';
import { STROKE_WIDTH, DEFAULTBLOCKSCALE } from '@/core/ui/constants';
import { BLOCK_PATHS, isClampShape } from '@/core/ui/blockPaths';

export interface BlockShapeProps {
    shape: ProtoblockShape;
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
    width: _width,
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
    const def = BLOCK_PATHS[shape];
    const bodySlotRef = useRef<HTMLDivElement>(null);
    const [bodyContentHeight, setBodyContentHeight] = useState(0);

    useEffect(() => {
        if (!bodySlot || !bodySlotRef.current) return;
        const ro = new ResizeObserver((entries) => {
            for (const e of entries) setBodyContentHeight(e.contentRect.height);
        });
        ro.observe(bodySlotRef.current);
        return () => ro.disconnect();
    }, [bodySlot]);

    if (!def) return null;

    const scale = DEFAULTBLOCKSCALE;
    const stroke = darken(color);
    const activeGlow = isActive ? `drop-shadow(0 0 6px #fbbf24)` : undefined;
    const bpGlow = isBreakpoint ? `drop-shadow(0 0 5px #dc2626)` : undefined;
    const filter = activeGlow ?? bpGlow;

    const w = def.width * scale;
    const h = def.height * scale;

    // Value/media blocks: compact, label centered
    if (shape === 'valueBlock' || shape === 'mediaBlock') {
        return (
            <svg
                width={w}
                height={h}
                viewBox={def.viewBox}
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
                <path d={def.path} fill={color} stroke={stroke} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
                <text
                    x={def.width / 2}
                    y={def.height / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                        fontSize: 11,
                        fontFamily: 'var(--font-ui)',
                        fontWeight: 600,
                        fill: '#fff',
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}
                >
                    {label}
                </text>
                {children}
            </svg>
        );
    }

    // Boolean blocks: label centered
    if (
        shape === 'booleanZeroArgBlock' ||
        shape === 'booleanOneBooleanArgBlock' ||
        shape === 'booleanTwoBooleanArgBlock' ||
        shape === 'booleanTwoArgBlock'
    ) {
        const vbParts = def.viewBox.split(' ');
        const vbMinY = vbParts.length >= 4 ? Number(vbParts[1]) : 0;
        const vbHeight = vbParts.length >= 4 ? Number(vbParts[3]) : def.height;
        const labelY = vbMinY + vbHeight / 2 + 1;
        return (
            <svg
                width={w}
                height={h}
                viewBox={def.viewBox}
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
                {def.pathTransform ? (
                    <g transform={def.pathTransform}>
                        <path d={def.path} fill={color} stroke={stroke} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
                    </g>
                ) : (
                    <path d={def.path} fill={color} stroke={stroke} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
                )}
                <text
                    x={def.width / 2}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                        fontSize: 11,
                        fontFamily: 'var(--font-ui)',
                        fontWeight: 600,
                        fill: '#fff',
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}
                >
                    {label}
                </text>
                {children}
            </svg>
        );
    }

    // Clamp blocks: header + body slot (extends with nested content)
    if (isClampShape(shape) && (def.bodySlotTop != null || bodySlot != null)) {
        const bodyTop = (def.bodySlotTop ?? 0) * scale;
        const bodyH = (def.bodySlotHeight ?? 36) * scale;
        const headerCenterY = (def.bodySlotTop ?? 10) / 2 + 1;
        const effectiveBodyHeight = Math.max(bodyH, bodyHeight, bodyContentHeight);
        const containerMinHeight = bodyTop + effectiveBodyHeight;

        return (
            <div
                style={{
                    position: 'relative',
                    display: 'inline-block',
                    minHeight: containerMinHeight,
                    outline: isOver ? DROP_HIGHLIGHT : undefined,
                    outlineOffset: 2,
                    borderRadius: 4,
                    ...style,
                }}
                className={className}
            >
                <svg width={w} height={h} viewBox={def.viewBox} overflow="visible" style={{ display: 'block', filter }}>
                    <path d={def.path} fill={color} stroke={stroke} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
                    {isBreakpoint && <circle cx={10} cy={headerCenterY} r={5} fill="#dc2626" />}
                    <text
                        x={18}
                        y={headerCenterY}
                        textAnchor="start"
                        dominantBaseline="middle"
                        style={{
                            fontSize: 11,
                            fontFamily: 'var(--font-ui)',
                            fontWeight: 700,
                            fill: '#fff',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            textTransform: 'uppercase',
                        }}
                    >
                        {label}
                    </text>
                </svg>
                {argRows > 0 && children && (
                    <div style={{ position: 'absolute', top: bodyTop - 18, left: 8, right: 8, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        {children}
                    </div>
                )}
                {bodySlot != null && (
                    <>
                        <div
                            ref={bodySlotRef}
                            style={{
                                position: 'absolute',
                                top: bodyTop,
                                left: 20,
                                right: 8,
                                minHeight: Math.max(bodyH, bodyHeight),
                                paddingLeft: 4,
                                outline: isBodyOver ? DROP_HIGHLIGHT : undefined,
                                outlineOffset: 2,
                                borderRadius: 4,
                            }}
                        >
                            {bodySlot}
                        </div>
                        {bodyContentHeight > bodyH && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: bodyTop + bodyH,
                                    left: 8,
                                    right: 8,
                                    height: bodyContentHeight - bodyH,
                                    background: color,
                                    opacity: 0.92,
                                    borderLeft: `3px solid ${stroke}`,
                                    borderBottomLeftRadius: 8,
                                    pointerEvents: 'none',
                                }}
                            />
                        )}
                    </>
                )}
            </div>
        );
    }

    // Stack blocks (zeroArg, oneArg, twoArg, threeArg, stackClamp, etc.)
    const headerY = shape === 'stackClampZeroArgBlock' || shape === 'stackClampOneArgBlock' ? 16 : 10;
    const hasInnies = ['oneArgBlock', 'twoArgBlock', 'threeArgBlock'].includes(shape);
    const labelX = hasInnies ? 18 : def.width / 2;
    const labelAnchor = hasInnies ? 'start' : 'middle';

    return (
        <div
            style={{
                position: 'relative',
                display: 'inline-block',
                outline: isOver ? DROP_HIGHLIGHT : undefined,
                outlineOffset: 2,
                borderRadius: 4,
                ...style,
            }}
            className={className}
        >
            <svg width={w} height={h} viewBox={def.viewBox} overflow="visible" style={{ display: 'block', filter }}>
                <path d={def.path} fill={color} stroke={stroke} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
                {isBreakpoint && <circle cx={10} cy={headerY} r={5} fill="#dc2626" />}
                <text
                    x={labelX}
                    y={headerY + 1}
                    textAnchor={labelAnchor}
                    dominantBaseline="middle"
                    style={{
                        fontSize: 11,
                        fontFamily: 'var(--font-ui)',
                        fontWeight: 700,
                        fill: '#fff',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        textTransform: 'uppercase',
                    }}
                >
                    {label}
                </text>
            </svg>
            {argRows > 0 && children && (
                <div style={{ position: 'absolute', top: headerY + 14, left: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {children}
                </div>
            )}
            {isClampShape(shape) && bodySlot != null && def.bodySlotTop != null && (
                <div
                    style={{
                        position: 'absolute',
                        top: def.bodySlotTop * scale,
                        left: 20,
                        right: 8,
                        minHeight: (def.bodySlotHeight ?? 36) * scale,
                        paddingLeft: 4,
                        outline: isBodyOver ? DROP_HIGHLIGHT : undefined,
                        outlineOffset: 2,
                        borderRadius: 4,
                    }}
                >
                    {bodySlot}
                </div>
            )}
        </div>
    );
};
