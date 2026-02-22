import { describe, it, expect } from 'vitest';
import type { BlockNode } from '@/engine/ast';

describe('AST Definition', () => {
    it('should allow constructing a 3-block sequence in memory', () => {
        const sequence: BlockNode = {
            id: 'block_1',
            type: 'start',
            inputs: {},
            next: {
                id: 'block_2',
                type: 'play_note',
                inputs: {
                    pitch: 'C4',
                    beats: 1
                },
                next: {
                    id: 'block_3',
                    type: 'rest',
                    inputs: { beats: 1 }
                }
            }
        };

        expect(sequence.id).toBe('block_1');
        expect(sequence.type).toBe('start');
        expect(sequence.next?.id).toBe('block_2');
        expect(sequence.next?.inputs['pitch']).toBe('C4');
        expect(sequence.next?.next?.id).toBe('block_3');
        expect(sequence.next?.next?.type).toBe('rest');
        expect(sequence.next?.next?.next).toBeUndefined();
    });
});
