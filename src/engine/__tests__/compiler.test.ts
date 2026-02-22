import { describe, it, expect } from 'vitest';
import { Compiler } from '@/engine/compiler';
import type { BlockNode, BlockId } from '@/engine/ast';

describe('Compiler', () => {
    it('should compile a flat AST dictionary into a flat timeline', () => {
        const blocks: Record<BlockId, BlockNode> = {
            'b1': { id: 'b1', type: 'start', inputs: {}, next: 'b2' },
            'b2': { id: 'b2', type: 'play_note', inputs: { pitch: 'C4', beats: 1 }, next: 'b3' },
            'b3': { id: 'b3', type: 'rest', inputs: { beats: 1 }, next: 'b4' },
            'b4': { id: 'b4', type: 'play_note', inputs: { pitch: 'E4', beats: 2 } }
        };

        const compiler = new Compiler();
        const events = compiler.compile(blocks['b1'], blocks);

        // Default BPM in Tone is 120. 
        // 1 beat (quarter note) = 0.5 seconds

        expect(events.length).toBe(2); // The rest doesn't produce an event, just advances time

        expect(events[0]).toEqual({
            time: 0,
            type: 'note',
            pitch: 'C4',
            duration: '1n'
        });

        expect(events[1]).toEqual({
            time: 1, // 0.5s for the note + 0.5s for the rest
            type: 'note',
            pitch: 'E4',
            duration: '2n'
        });
    });
});
