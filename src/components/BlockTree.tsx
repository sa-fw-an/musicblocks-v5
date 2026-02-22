import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface BlockTreeProps {
    id: string;
    isRoot?: boolean; // Only the absolute root of a chain is draggable on the canvas
    isOverlay?: boolean;
    depth?: number;
}

export const BlockTree: React.FC<BlockTreeProps> = ({ id, isRoot = false, isOverlay = false, depth = 0 }) => {
    if (depth > 50) {
        console.error("Max tree depth exceeded for block", id, "- Preventing infinite render loop.");
        return <div style={{ padding: 10, color: 'red', border: '1px solid red' }}>CYCLE ERROR</div>;
    }

    const node = useWorkspaceStore(state => state.blocks[id]);

    // Set up dnd-kit draggable hook
    const dragData = useDraggable({
        id: `drag-${id}`,
        disabled: isOverlay, // Allow dragging of sub-blocks by removing !isRoot restriction
    });

    const dropData = useDroppable({
        id: `drop-${id}`,
        disabled: isOverlay,
    });

    const bodyDropData = useDroppable({
        id: `drop-body-${id}`,
        disabled: isOverlay,
    });

    if (!node) return null;

    const { attributes, listeners, setNodeRef: setDragNodeRef } = dragData;
    const { isOver, setNodeRef: setDropNodeRef } = dropData;
    const { isOver: isBodyOver, setNodeRef: setBodyDropNodeRef } = bodyDropData;

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
    } else if (node.type === 'repeat') {
        backgroundColor = '#fff3cd';
        borderColor = '#ffeeba';
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
        <div ref={setDragNodeRef} style={style} {...(!isOverlay ? attributes : {})} {...(!isOverlay ? listeners : {})}>
            <div
                ref={setDropNodeRef}
                style={{
                    border: `2px solid ${isOver ? '#007bff' : borderColor}`,
                    backgroundColor,
                    padding: '12px 16px',
                    borderRadius: node.type === 'repeat' ? '8px 8px 8px 0' : '8px',
                    display: 'inline-block',
                    minWidth: '200px',
                    boxShadow: isRoot ? '0 4px 6px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
                    cursor: !isOverlay ? 'grab' : 'default',
                    // Visual feedback for drop zone
                    borderBottomWidth: node.type === 'repeat' ? '1px' : (isOver ? '6px' : '2px'),
                }}
            >
                <div style={{ fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.9rem', color: '#495057' }}>
                    {node.type}
                </div>

                {Object.keys(node.inputs).length > 0 && (
                    <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                        {node.type === 'repeat' ? (
                            <div style={{ marginBottom: '4px' }}>
                                <strong>iterations:</strong>
                                <input
                                    type="number"
                                    min="1"
                                    value={node.inputs.iterations}
                                    onChange={(e) => useWorkspaceStore.getState().updateBlockInput(node.id, 'iterations', Number(e.target.value))}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    style={{ marginLeft: '8px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #ced4da', width: '60px' }}
                                />
                            </div>
                        ) : node.type === 'play_note' ? (
                            <>
                                <div style={{ marginBottom: '4px' }}>
                                    <strong>pitch:</strong>
                                    <select
                                        value={node.inputs.pitch}
                                        onChange={(e) => useWorkspaceStore.getState().updateBlockInput(node.id, 'pitch', e.target.value)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        style={{ marginLeft: '8px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #ced4da', cursor: 'pointer' }}
                                    >
                                        {['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'].map(note => (
                                            <option key={note} value={note}>{note}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ marginBottom: '4px' }}>
                                    <strong>beats:</strong>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0.5"
                                        value={node.inputs.beats}
                                        onChange={(e) => useWorkspaceStore.getState().updateBlockInput(node.id, 'beats', Number(e.target.value))}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        style={{ marginLeft: '8px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #ced4da', width: '60px' }}
                                    />
                                </div>
                            </>
                        ) : (
                            Object.entries(node.inputs).map(([key, value]) => (
                                <div key={key}>
                                    <strong>{key}:</strong> {String(value)}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {node.type === 'repeat' && (
                <div
                    ref={setBodyDropNodeRef}
                    style={{
                        padding: '12px',
                        paddingBottom: '24px',
                        borderLeft: `20px solid ${backgroundColor}`,
                        borderBottom: `20px solid ${backgroundColor}`,
                        borderRight: `2px solid ${borderColor}`,
                        backgroundColor: isBodyOver ? 'rgba(0,123,255,0.1)' : 'rgba(255,255,255,0.5)',
                        minHeight: '40px',
                        borderBottomLeftRadius: '8px',
                        borderBottomRightRadius: '8px',
                        width: 'fit-content',
                        minWidth: '178px',
                        boxShadow: isRoot ? '0 4px 6px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
                    }}
                >
                    {node.body && <BlockTree id={node.body} isRoot={false} isOverlay={isOverlay} depth={depth + 1} />}
                    {!node.body && <div style={{ color: '#aaa', fontSize: '0.8rem', fontStyle: 'italic', paddingLeft: '8px' }}>Drop blocks here</div>}
                </div>
            )}

            {node.next && (
                <div style={{ paddingLeft: '20px', borderLeft: '2px solid #dee2e6', marginLeft: '20px', marginTop: '4px' }}>
                    <BlockTree id={node.next} isRoot={false} isOverlay={isOverlay} depth={depth + 1} />
                </div>
            )}
        </div>
    );
};
