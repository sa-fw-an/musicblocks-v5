import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { globalRegistry } from '@/main-registry';
import type { BlockDefinition } from '@/core/registry/types';

interface PaletteItemProps {
    def: BlockDefinition;
    isOverlay?: boolean;
}

export const PaletteItem: React.FC<PaletteItemProps> = ({ def, isOverlay = false }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `palette-${def.type}`,
        data: { type: def.type, defaultInputs: def.defaultInputs },
        disabled: isOverlay,
    });

    const Comp = def.component;

    return (
        <div
            ref={isOverlay ? undefined : setNodeRef}
            className={`palette-block-item${isDragging ? ' palette-block-item--dragging' : ''}`}
            style={{ opacity: isDragging ? 0.4 : 1 }}
            {...(isOverlay ? {} : attributes)}
            {...(isOverlay ? {} : listeners)}
        >
            <Comp
                node={{ id: `palette-preview-${def.type}`, type: def.type, inputs: def.defaultInputs }}
                isActive={false}
                isBreakpoint={false}
                isOver={false}
            />
        </div>
    );
};

interface BlockListPanelProps {
    activeCategory: string;
}

export const BlockListPanel: React.FC<BlockListPanelProps> = ({ activeCategory }) => {
    const blocks = globalRegistry.getBlocksByCategory(activeCategory);

    return (
        <div className="palette-block-list">
            <div className="palette-block-list__heading">{activeCategory}</div>
            {blocks.map((def) => (
                <PaletteItem key={def.type} def={def} />
            ))}
        </div>
    );
};
