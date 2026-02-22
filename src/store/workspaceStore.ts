import { create } from 'zustand';
import type { BlockNode, BlockId } from '@/engine/ast';

interface WorkspaceState {
    blocks: Record<BlockId, BlockNode>; // Flat dictionary of all blocks by ID
    rootBlocks: BlockId[]; // Array of IDs for blocks sitting freely on the canvas
    addBlock: (block: BlockNode) => void;
    connectBlocks: (parentId: BlockId, childId: BlockId) => void;
    moveBlock: (id: BlockId, x: number, y: number) => void;
}

// Initial state representing our C4 -> D4 -> E4 program, but normalized
const initialBlocks: Record<BlockId, BlockNode> = {
    'b1': { id: 'b1', type: 'start', inputs: {}, x: 100, y: 100, next: 'b2' },
    'b2': { id: 'b2', type: 'play_note', inputs: { pitch: 'C4', beats: 1 }, next: 'b3' },
    'b3': { id: 'b3', type: 'play_note', inputs: { pitch: 'D4', beats: 1 }, next: 'b4' },
    'b4': { id: 'b4', type: 'play_note', inputs: { pitch: 'E4', beats: 2 } }
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

    connectBlocks: (parentId: BlockId, childId: BlockId) =>
        set((state) => {
            const parent = state.blocks[parentId];
            let child = state.blocks[childId];

            if (!parent || !child) return state;

            // --- CYCLE PREVENTION ---
            // If the user tries to drop a parent onto its own child (or itself), abort
            let currentPathId: BlockId | undefined = childId;
            while (currentPathId) {
                if (currentPathId === parentId) {
                    console.warn('Cycle detected! Cannot connect block to its own child.');
                    return state;
                }
                currentPathId = state.blocks[currentPathId]?.next;
            }

            // Traverse to the true tail of the chain the user dropped ONTO
            let tailId = parentId;
            let tail = state.blocks[tailId];
            while (tail.next && state.blocks[tail.next]) {
                tailId = tail.next;
                tail = state.blocks[tailId];
            }

            // If the block we are attaching (childId) was previously connected to something else,
            // we must detach it from its old parent first to avoid orphaned references
            const newBlocks = { ...state.blocks };
            let oldParentId: BlockId | undefined = undefined;

            for (const [id, b] of Object.entries(newBlocks)) {
                if (b.next === childId) {
                    oldParentId = id;
                    newBlocks[id] = { ...b, next: undefined };
                    break;
                }
            }

            // Remove child from root blocks (if it was one)
            const newRootBlocks = state.rootBlocks.filter(id => id !== childId);

            // Connect them
            newBlocks[tailId] = {
                ...tail,
                next: childId
            };

            // Clear x/y from child so it nests under parent naturally
            newBlocks[childId] = {
                ...child,
                x: undefined,
                y: undefined
            };

            return {
                rootBlocks: newRootBlocks,
                blocks: newBlocks
            };
        }),

    moveBlock: (id: BlockId, x: number, y: number) =>
        set((state) => {
            const block = state.blocks[id];
            if (!block) return state;

            const newBlocks = { ...state.blocks };
            const newRootBlocks = new Set(state.rootBlocks);

            // If it had a parent, detach it
            let hasParent = false;
            for (const [otherId, b] of Object.entries(newBlocks)) {
                if (b.next === id) {
                    hasParent = true;
                    newBlocks[otherId] = { ...b, next: undefined };
                    break;
                }
            }

            // If it was just detached, it must become a root block again
            if (hasParent) {
                newRootBlocks.add(id);
            }

            newBlocks[id] = { ...block, x, y };

            return {
                rootBlocks: Array.from(newRootBlocks),
                blocks: newBlocks,
            };
        }),
}));
