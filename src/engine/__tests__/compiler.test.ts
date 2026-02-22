import { describe, it, expect } from 'vitest';
import type { BlockNode } from '@/engine/ast';
import { Compiler } from '@/engine/compiler';

describe('Headless Compiler', () => {
    it('should compile an AST into a flat timeline of events', () => {
        // start -> play_note (C4, 1 beat) -> rest (1 beat) -> play_note (E4, 1 beat)
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
                    inputs: { beats: 1 },
                    next: {
                        id: 'block_4',
                        type: 'play_note',
                        inputs: {
                            pitch: 'E4',
                            beats: 1
                        }
                    }
                }
            }
        };

        const compiler = new Compiler();
        const events = compiler.compile(sequence);

        expect(events.length).toBe(2);
        expect(events[0].timeOffset).toBe(0);
        expect(events[0].type).toBe('note');
        expect(events[0].pitch).toBe('C4');
        expect(events[0].duration).toBe(1);

        expect(events[1].timeOffset).toBe(2);
        expect(events[1].type).toBe('note');
        expect(events[1].pitch).toBe('E4');
        expect(events[1].duration).toBe(1);
    });
});
