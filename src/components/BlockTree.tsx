import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { globalRegistry } from '@/main-registry';
import { isClampShape } from '@/core/ui/blockPaths';

interface BlockTreeProps {
    id: string;
    isRoot?: boolean;
    isOverlay?: boolean;
    depth?: number;
}

export const BlockTree: React.FC<BlockTreeProps> = ({ id, isRoot = false, isOverlay = false, depth = 0 }) => {
    if (depth > 50) {
        console.error('Max tree depth exceeded for block', id);
        return <div style={{ padding: 10, color: 'red', border: '1px solid red' }}>CYCLE ERROR</div>;
    }

    const node = useWorkspaceStore(state => state.blocks[id]);
    const isActive = useWorkspaceStore(state => state.activeBlockIds.includes(id));
    const isBreakpoint = useWorkspaceStore(state => state.breakpointBlockIds?.has(id));

    const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
        id: `drag-${id}`,
        disabled: isOverlay,
    });

    const { isOver, setNodeRef: setDropRef } = useDroppable({
        id: `drop-${id}`,
        disabled: isOverlay,
    });

    const { isOver: isBodyOver, setNodeRef: setBodyDropRef } = useDroppable({
        id: `drop-body-${id}`,
        disabled: isOverlay,
    });

    if (!node) return null;

    const def = globalRegistry.getBlock(node.type);

    const positionStyle: React.CSSProperties = {
        position: isRoot && !isOverlay ? 'absolute' : 'relative',
        left: isRoot && !isOverlay ? `${node.x ?? 0}px` : undefined,
        top: isRoot && !isOverlay ? `${node.y ?? 0}px` : undefined,
        opacity: isDragging ? 0.3 : 1,
        display: 'block',
    };

    // If the block type is registered, use its component
    if (def) {
        const Comp = def.component;
        const isClamp = isClampShape(def.shape);

        const handleBreakpointToggle = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            useWorkspaceStore.getState().toggleBreakpoint(id);
        };

        return (
            <div
                ref={setDragRef}
                style={positionStyle}
                {...(!isOverlay ? attributes : {})}
                {...(!isOverlay ? listeners : {})}
                onContextMenu={!isOverlay ? handleBreakpointToggle : undefined}
            >
                <div ref={setDropRef}>
                    <Comp
                        node={node}
                        isActive={isActive}
                        isBreakpoint={isBreakpoint ?? false}
                        isOver={isOver}
                        isBodyOver={isBodyOver}
                        bodySlot={
                            isClamp ? (
                                <div ref={setBodyDropRef} style={{ minHeight: 40 }}>
                                    {node.body && (
                                        <BlockTree id={node.body} isRoot={false} isOverlay={isOverlay} depth={depth + 1} />
                                    )}
                                </div>
                            ) : undefined
                        }
                    />
                </div>

                {/* Next block in chain */}
                {node.next && (
                    <BlockTree id={node.next} isRoot={false} isOverlay={isOverlay} depth={depth + 1} />
                )}
            </div>
        );
    }

    // Fallback: unknown block type — render a minimal placeholder
    return (
        <div
            ref={setDragRef}
            style={{ ...positionStyle, fontFamily: 'monospace', fontSize: 12, padding: '8px 12px', background: '#444', color: '#fff', borderRadius: 6, display: 'inline-block' }}
            {...(!isOverlay ? attributes : {})}
            {...(!isOverlay ? listeners : {})}
        >
            <div ref={setDropRef}>
                <span
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => useWorkspaceStore.getState().toggleBreakpoint(id)}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {isBreakpoint && (
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#dc3545', marginRight: 5 }} />
                    )}
                    {node.type}
                </span>
                {Object.entries(node.inputs).map(([k, v]) => (
                    <div key={k} style={{ color: '#aaa' }}>{k}: {String(v)}</div>
                ))}
            </div>

            <div ref={setBodyDropRef} style={{ minHeight: 40 }}>
                {node.body && (
                    <BlockTree id={node.body} isRoot={false} isOverlay={isOverlay} depth={depth + 1} />
                )}
            </div>

            {node.next && (
                <BlockTree id={node.next} isRoot={false} isOverlay={isOverlay} depth={depth + 1} />
            )}
        </div>
    );
};
