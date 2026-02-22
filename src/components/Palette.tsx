import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { BlockNode } from '@/engine/ast';

interface PaletteBlockProps {
    type: string;
    defaultInputs: BlockNode['inputs'];
}

const PaletteBlock: React.FC<PaletteBlockProps> = ({ type, defaultInputs }) => {
    // We use a prefix so the drop handler knows this is a template, not a real block
    const { attributes, listeners, setNodeRef } = useDraggable({
        id: `palette-${type}`,
        data: {
            type,
            defaultInputs
        }
    });

    // Determine styles based on block type
    let backgroundColor = '#f8f9fa';
    let borderColor = '#ced4da';

    if (type === 'start') {
        backgroundColor = '#d4edda';
        borderColor = '#c3e6cb';
    } else if (type === 'play_note') {
        backgroundColor = '#cce5ff';
        borderColor = '#b8daff';
    } else if (type === 'rest') {
        backgroundColor = '#e2e3e5';
        borderColor = '#d6d8db';
    }

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            style={{
                border: `2px solid ${borderColor}`,
                backgroundColor,
                padding: '12px 16px',
                borderRadius: '8px',
                minWidth: '150px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                cursor: 'grab',
                marginBottom: '1rem'
            }}
        >
            <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9rem', color: '#495057' }}>
                {type}
            </div>
        </div>
    );
};

export const Palette: React.FC = () => {
    return (
        <aside style={{
            width: '250px',
            backgroundColor: '#e9ecef',
            borderRight: '1px solid #dee2e6',
            padding: '1rem',
            overflowY: 'auto'
        }}>
            <h2 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '1.5rem', color: '#495057' }}>Block Palette</h2>

            <PaletteBlock type="start" defaultInputs={{}} />
            <PaletteBlock type="play_note" defaultInputs={{ pitch: 'C4', beats: 1 }} />
            <PaletteBlock type="rest" defaultInputs={{ beats: 1 }} />

        </aside>
    );
};
