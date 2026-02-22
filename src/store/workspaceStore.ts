import { create } from 'zustand';
import type { BlockNode, BlockId } from '@/engine/ast';

interface WorkspaceState {
    blocks: Record<BlockId, BlockNode>; // Flat dictionary of all blocks by ID
    rootBlocks: BlockId[]; // Array of IDs for blocks sitting freely on the canvas
    addBlock: (block: BlockNode) => void;
    // connectBlocks: (parentId: BlockId, childId: BlockId) => void; // Saved for later
    moveBlock: (id: BlockId, x: number, y: number) => void;
}

// Initial state representing our C4 -> D4 -> E4 program, but normalized
const initialBlocks: Record<BlockId, BlockNode> = {
    'b1': {
        id: 'b1',
        type: 'start',
        inputs: {},
        x: 100,
        y: 100,
        next: {
            id: 'b2',
            type: 'play_note',
            inputs: { pitch: 'C4', beats: 1 },
            next: {
                id: 'b3',
                type: 'play_note',
                inputs: { pitch: 'D4', beats: 1 },
                next: {
                    id: 'b4',
                    type: 'play_note',
                    inputs: { pitch: 'E4', beats: 2 }
                }
            }
        }
    }
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
    blocks: initialBlocks,
    // For now, only the 'start' block is a root block sitting on the canvas
    rootBlocks: ['b1'],

    addBlock: (block: BlockNode) =>
        set((state) => ({
            blocks: { ...state.blocks, [block.id]: block },
            rootBlocks: [...state.rootBlocks, block.id],
        })),

    moveBlock: (id: BlockId, x: number, y: number) =>
        set((state) => {
            const block = state.blocks[id];
            if (!block) return state;

            return {
                blocks: {
                    ...state.blocks,
                    [id]: { ...block, x, y },
                },
            };
        }),
}));
