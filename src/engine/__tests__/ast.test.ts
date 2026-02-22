import { describe, it, expect } from 'vitest';
import type { BlockNode } from '@/engine/ast';

describe('AST Data Structures', () => {
    it('should allow constructing a valid block graph via ID references', () => {
        const startNode: BlockNode = {
            id: 'b1',
            type: 'start',
            inputs: {},
            next: 'b2'
        };

        const playNode: BlockNode = {
            id: 'b2',
            type: 'play_note',
            inputs: {
                pitch: 'C4',
                beats: 1
            }
        };

        expect(startNode.next).toBe('b2');
        expect(playNode.inputs.pitch).toBe('C4');
    });
});
