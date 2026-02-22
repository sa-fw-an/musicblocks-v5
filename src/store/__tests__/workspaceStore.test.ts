import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { BlockNode } from '@/core/ast';

describe('WorkspaceStore AST Operations', () => {
    beforeEach(() => {
        useWorkspaceStore.getState().clearWorkspace();
    });

    it('prevents cycles when connecting blocks', () => {
        // Setup blocks: b1 -> b2 -> b3
        useWorkspaceStore.getState().addBlock({ id: 'b1', type: 'start', inputs: {} } as BlockNode);
        useWorkspaceStore.getState().addBlock({ id: 'b2', type: 'play_note', inputs: {} } as BlockNode);
        useWorkspaceStore.getState().addBlock({ id: 'b3', type: 'play_note', inputs: {} } as BlockNode);

        useWorkspaceStore.getState().connectBlocks('b1', 'b2', 'next');
        useWorkspaceStore.getState().connectBlocks('b2', 'b3', 'next');

        const stateBefore = useWorkspaceStore.getState();
        const b1Next = stateBefore.blocks['b1'].next;

        // Try to connect b3 back to b1 (cycle)
        // b3 is a descendant of b1. parent: b3, child: b1
        useWorkspaceStore.getState().connectBlocks('b3', 'b1', 'next');

        const stateAfter = useWorkspaceStore.getState();

        // Assert connection was rejected
        expect(stateAfter.blocks['b3'].next).toBeUndefined();
        expect(stateAfter.blocks['b1'].next).toBe(b1Next); // Unchanged
    });

    it('cascading orphan deletion removes parent and all nested children', () => {
        useWorkspaceStore.getState().addBlock({ id: 'b1', type: 'start', inputs: {} } as BlockNode);
        useWorkspaceStore.getState().addBlock({ id: 'b2', type: 'repeat', inputs: {} } as BlockNode);
        useWorkspaceStore.getState().addBlock({ id: 'b3', type: 'play_note', inputs: {} } as BlockNode);
        useWorkspaceStore.getState().addBlock({ id: 'b4', type: 'play_note', inputs: {} } as BlockNode);

        // b1 -> b2
        useWorkspaceStore.getState().connectBlocks('b1', 'b2', 'next');

        // b2 (body) -> b3
        useWorkspaceStore.getState().connectBlocks('b2', 'b3', 'body');

        // b3 -> b4
        useWorkspaceStore.getState().connectBlocks('b3', 'b4', 'next');

        // Verify they all exist
        let state = useWorkspaceStore.getState();
        expect(state.blocks['b2']).toBeDefined();
        expect(state.blocks['b3']).toBeDefined();
        expect(state.blocks['b4']).toBeDefined();

        // Delete b2
        useWorkspaceStore.getState().deleteBlock('b2');

        state = useWorkspaceStore.getState();
        expect(state.blocks['b2']).toBeUndefined();
        expect(state.blocks['b3']).toBeUndefined();
        expect(state.blocks['b4']).toBeUndefined();

        // b1 should still exist, but without its next connection (already pointing to b2 though it's technically orphaned)
        expect(state.blocks['b1']).toBeDefined();
    });
});
