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

    it('connectBlocks with body attaches child to clamp body slot', () => {
        useWorkspaceStore.getState().addBlock({ id: 'r1', type: 'repeat', inputs: { iterations: 2 } } as BlockNode);
        useWorkspaceStore.getState().addBlock({ id: 'n1', type: 'play_note', inputs: { pitch: 'C4', beats: 1 } } as BlockNode);

        useWorkspaceStore.getState().connectBlocks('r1', 'n1', 'body');

        const state = useWorkspaceStore.getState();
        expect(state.blocks['r1'].body).toBe('n1');
        expect(state.blocks['n1'].body).toBeUndefined();
        expect(state.blocks['n1'].next).toBeUndefined();
        expect(state.rootBlocks).not.toContain('n1');
    });

    it('connectBlocks with next attaches child to next slot', () => {
        useWorkspaceStore.getState().addBlock({ id: 's1', type: 'start', inputs: {} } as BlockNode);
        useWorkspaceStore.getState().addBlock({ id: 'p1', type: 'play_note', inputs: {} } as BlockNode);

        useWorkspaceStore.getState().connectBlocks('s1', 'p1', 'next');

        const state = useWorkspaceStore.getState();
        expect(state.blocks['s1'].next).toBe('p1');
        expect(state.blocks['s1'].body).toBeUndefined();
        expect(state.rootBlocks).not.toContain('p1');
    });

    it('connectBlocks body rejects when parent already has body', () => {
        useWorkspaceStore.getState().addBlock({ id: 'r1', type: 'repeat', inputs: {} } as BlockNode);
        useWorkspaceStore.getState().addBlock({ id: 'n1', type: 'play_note', inputs: {} } as BlockNode);
        useWorkspaceStore.getState().addBlock({ id: 'n2', type: 'play_note', inputs: {} } as BlockNode);

        useWorkspaceStore.getState().connectBlocks('r1', 'n1', 'body');
        useWorkspaceStore.getState().connectBlocks('r1', 'n2', 'body');

        const state = useWorkspaceStore.getState();
        expect(state.blocks['r1'].body).toBe('n1');
        expect(state.rootBlocks).toContain('n2');
    });

    it('toggleBreakpoint adds and removes block from breakpoint set', () => {
        useWorkspaceStore.getState().addBlock({ id: 'b1', type: 'play_note', inputs: {} } as BlockNode);

        expect(useWorkspaceStore.getState().breakpointBlockIds.has('b1')).toBe(false);

        useWorkspaceStore.getState().toggleBreakpoint('b1');
        expect(useWorkspaceStore.getState().breakpointBlockIds.has('b1')).toBe(true);

        useWorkspaceStore.getState().toggleBreakpoint('b1');
        expect(useWorkspaceStore.getState().breakpointBlockIds.has('b1')).toBe(false);
    });

    it('toggleBreakpoint on non-existent block does not throw', () => {
        expect(() => useWorkspaceStore.getState().toggleBreakpoint('nonexistent')).not.toThrow();
        expect(useWorkspaceStore.getState().breakpointBlockIds.has('nonexistent')).toBe(true);
    });

    it('detachBlock removes block from parent body and makes it root', () => {
        useWorkspaceStore.getState().addBlock({ id: 'r1', type: 'repeat', inputs: {} } as BlockNode);
        useWorkspaceStore.getState().addBlock({ id: 'n1', type: 'play_note', inputs: {} } as BlockNode);
        useWorkspaceStore.getState().connectBlocks('r1', 'n1', 'body');

        expect(useWorkspaceStore.getState().blocks['r1'].body).toBe('n1');
        expect(useWorkspaceStore.getState().rootBlocks).not.toContain('n1');

        useWorkspaceStore.getState().detachBlock('n1');

        const state = useWorkspaceStore.getState();
        expect(state.blocks['r1'].body).toBeUndefined();
        expect(state.rootBlocks).toContain('n1');
    });

    it('addBlock adds block to rootBlocks', () => {
        useWorkspaceStore.getState().clearWorkspace();
        useWorkspaceStore.getState().addBlock({ id: 'b1', type: 'start', inputs: {} } as BlockNode);

        const state = useWorkspaceStore.getState();
        expect(state.blocks['b1']).toBeDefined();
        expect(state.rootBlocks).toContain('b1');
    });

    it('clearWorkspace resets blocks and rootBlocks', () => {
        useWorkspaceStore.getState().addBlock({ id: 'b1', type: 'start', inputs: {} } as BlockNode);
        useWorkspaceStore.getState().clearWorkspace();

        const state = useWorkspaceStore.getState();
        expect(state.blocks).toEqual({});
        expect(state.rootBlocks).toEqual([]);
    });
});
