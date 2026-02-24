import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';
import { BlockTree } from '@/components/BlockTree';
import { useWorkspaceStore } from '@/store/workspaceStore';

const TrashCan: React.FC = () => {
    const { isOver, setNodeRef } = useDroppable({ id: 'trash-can' });

    return (
        <div
            ref={setNodeRef}
            className={`trash-can${isOver ? ' trash-can--over' : ''}`}
        >
            <Trash2 size={22} />
        </div>
    );
};

export const Canvas: React.FC = () => {
    const rootBlocks = useWorkspaceStore(state => state.rootBlocks);
    const blocks = useWorkspaceStore(state => state.blocks);

    return (
        <main
            style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
            className="canvas-grid"
        >
            {rootBlocks.map((id) => {
                const block = blocks[id];
                if (!block) return null;
                return <BlockTree key={id} id={id} isRoot={true} />;
            })}
            <TrashCan />
        </main>
    );
};
