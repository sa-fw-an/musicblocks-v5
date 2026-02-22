import { create } from 'zustand';
import type { BlockNode, BlockId } from '@/engine/ast';

interface WorkspaceState {
    blocks: Record<BlockId, BlockNode>; // Flat dictionary of all blocks by ID
    rootBlocks: BlockId[]; // Array of IDs for blocks sitting freely on the canvas
    addBlock: (block: BlockNode) => void;
    detachBlock: (id: BlockId) => void;
    connectBlocks: (parentId: BlockId, childId: BlockId) => void;
    moveBlock: (id: BlockId, x: number, y: number) => void;
    updateBlockInput: (id: BlockId, key: string, value: any) => void;
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

    detachBlock: (id: BlockId) =>
        set((state) => {
            const newBlocks = { ...state.blocks };
            const newRootBlocks = new Set(state.rootBlocks);

            let hasParent = false;
            for (const [otherId, b] of Object.entries(newBlocks)) {
                if (b.next === id) {
                    hasParent = true;
                    // Properly break the link without mutating the original object deeply
                    newBlocks[otherId] = { ...b, next: undefined };
                    break;
                }
            }

            // Only make it a root block if it actually detached from something
            // to prevent duplicate insertions
            if (hasParent) {
                newRootBlocks.add(id);
            }

            // DO NOT copy x,y from anywhere. When detaching, it's just floating in dnd-kit land.
            // On DragEnd, moveBlock will assign its exact drop coordinates.

            return {
                rootBlocks: Array.from(newRootBlocks),
                blocks: newBlocks
            };
        }),

    connectBlocks: (parentId: BlockId, childId: BlockId) =>
        set((state) => {
            const parent = state.blocks[parentId];
            const child = state.blocks[childId];

            if (!parent || !child) return state;

            // --- CYCLE PREVENTION ---
            // If the drop target (parentId) is a descendant of the dragged block (childId),
            // or is the dragged block itself, abort to prevent infinite loops.
            const createsCycle = (startId: BlockId, targetId: BlockId) => {
                let curr: BlockId | undefined = startId;
                const visited = new Set<BlockId>();
                while (curr) {
                    if (curr === targetId) return true;
                    if (visited.has(curr)) break; // already iterating a cycle
                    visited.add(curr);
                    curr = state.blocks[curr]?.next;
                }
                return false;
            };

            if (createsCycle(childId, parentId) || createsCycle(parentId, childId)) {
                console.warn(`Cycle detected/prevented: cannot connect ${parentId} to ${childId}`);
                return state;
            }

            // Remove child from root blocks
            const newRootBlocks = state.rootBlocks.filter(id => id !== childId);
            const newBlocks = { ...state.blocks };
            const oldNextId = parent.next;

            // Connect parent directly to dropped child tree
            newBlocks[parentId] = {
                ...parent,
                next: childId
            };

            // Clear x/y from incoming child so it nests under parent naturally
            newBlocks[childId] = {
                ...child,
                x: undefined,
                y: undefined
            };

            // Splicing: If the parent already had a child, attach it to the tail of the dropped tree
            if (oldNextId) {
                let tailId = childId;
                let tail = newBlocks[tailId];
                while (tail.next && newBlocks[tail.next]) {
                    tailId = tail.next;
                    tail = newBlocks[tailId];
                }
                newBlocks[tailId] = {
                    ...tail,
                    next: oldNextId
                };
            }

            return {
                rootBlocks: newRootBlocks,
                blocks: newBlocks
            };
        }),

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

    updateBlockInput: (id: BlockId, key: string, value: any) =>
        set((state) => {
            const block = state.blocks[id];
            if (!block) return state;

            return {
                blocks: {
                    ...state.blocks,
                    [id]: {
                        ...block,
                        inputs: {
                            ...block.inputs,
                            [key]: value
                        }
                    }
                }
            };
        }),
}));
