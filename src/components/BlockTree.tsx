import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface BlockTreeProps {
    id: string;
    isRoot?: boolean; // Only the absolute root of a chain is draggable on the canvas
    isOverlay?: boolean;
}

export const BlockTree: React.FC<BlockTreeProps> = ({ id, isRoot = false, isOverlay = false }) => {
    const node = useWorkspaceStore(state => state.blocks[id]);

    // Set up dnd-kit draggable hook
    const dragData = useDraggable({
        id: id,
        disabled: !isRoot || isOverlay, // Prevent dragging individual sub-blocks for now, and don't make overlay draggable
    });

    const dropData = useDroppable({
        id: id,
        disabled: isOverlay,
    });

    if (!node) return null;

    const { attributes, listeners, setNodeRef: setDragNodeRef } = dragData;
    const { isOver, setNodeRef: setDropNodeRef } = dropData;

    // Determine styles based on block type
    let backgroundColor = '#f8f9fa';
    let borderColor = '#ced4da';

    if (node.type === 'start') {
        backgroundColor = '#d4edda';
        borderColor = '#c3e6cb';
    } else if (node.type === 'play_note') {
        backgroundColor = '#cce5ff';
        borderColor = '#b8daff';
    } else if (node.type === 'rest') {
        backgroundColor = '#e2e3e5';
        borderColor = '#d6d8db';
    }

    // Calculate position styles
    const style: React.CSSProperties = {
        marginLeft: isRoot || isOverlay ? 0 : '20px',
        marginTop: isRoot || isOverlay ? 0 : '10px',
        position: isRoot && !isOverlay ? 'absolute' : 'relative',
        left: isRoot && !isOverlay ? `${node.x ?? 0}px` : undefined,
        top: isRoot && !isOverlay ? `${node.y ?? 0}px` : undefined,
        opacity: dragData.isDragging ? 0.3 : 1, // Leave a ghost
        // We do NOT use transform here because DragOverlay handles the visual clone movement.
        // Keeping it untransformed ensures DndKit's rect calculations remain stable.
    };

    return (
        <div ref={setDragNodeRef} style={style} {...(isRoot && !isOverlay ? attributes : {})} {...(isRoot && !isOverlay ? listeners : {})}>
            <div
                ref={setDropNodeRef}
                style={{
                    border: `2px solid ${isOver ? '#007bff' : borderColor}`,
                    backgroundColor,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    display: 'inline-block',
                    minWidth: '200px',
                    boxShadow: isRoot ? '0 4px 6px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
                    cursor: isRoot && !isOverlay ? 'grab' : 'default',
                    // Visual feedback for drop zone
                    borderBottomWidth: isOver ? '6px' : '2px',
                }}
            >
                <div style={{ fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.9rem', color: '#495057' }}>
                    {node.type}
                </div>

                {Object.keys(node.inputs).length > 0 && (
                    <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                        {Object.entries(node.inputs).map(([key, value]) => (
                            <div key={key}>
                                <strong>{key}:</strong> {String(value)}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {node.next && (
                <div style={{ paddingLeft: '20px', borderLeft: '2px solid #dee2e6', marginLeft: '20px', marginTop: '4px' }}>
                    <BlockTree id={node.next} isRoot={false} isOverlay={isOverlay} />
                </div>
            )}
        </div>
    );
};
