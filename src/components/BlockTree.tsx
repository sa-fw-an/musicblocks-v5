import React from 'react';
import type { BlockNode } from '@/engine/ast';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface BlockTreeProps {
    node?: BlockNode;
    isRoot?: boolean; // Only the absolute root of a chain is draggable on the canvas
}

export const BlockTree: React.FC<BlockTreeProps> = ({ node, isRoot = false }) => {
    // Set up dnd-kit draggable hook
    const dragData = useDraggable({
        id: node?.id ?? 'temp',
        disabled: !isRoot || !node, // Prevent dragging individual sub-blocks for now
    });

    if (!node) return null;

    const { attributes, listeners, setNodeRef, transform } = dragData;

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
        marginLeft: isRoot ? 0 : '20px',
        marginTop: isRoot ? 0 : '10px',
        position: isRoot ? 'absolute' : 'relative',
        left: isRoot ? `${node.x ?? 0}px` : undefined,
        top: isRoot ? `${node.y ?? 0}px` : undefined,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        zIndex: transform ? 999 : 1, // Pop to front while dragging
    };

    return (
        <div ref={setNodeRef} style={style} {...(isRoot ? attributes : {})} {...(isRoot ? listeners : {})}>
            <div
                style={{
                    border: `2px solid ${borderColor}`,
                    backgroundColor,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    display: 'inline-block',
                    minWidth: '200px',
                    boxShadow: isRoot ? '0 4px 6px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
                    cursor: isRoot ? 'grab' : 'default',
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
                    <BlockTree node={node.next} isRoot={false} />
                </div>
            )}
        </div>
    );
};
