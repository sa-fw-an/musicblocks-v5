import { describe, it, expect } from 'vitest';
import { MusicBlocksPlugin } from '@/plugins/musicblocks';

describe('MusicBlocks Plugin', () => {
    it('compiles play_note correctly to sys_call', () => {
        const compilerSpy = MusicBlocksPlugin.blockCompilers['play_note'];
        const insts: any[] = [];

        compilerSpy({ id: 'p1', type: 'play_note', inputs: { pitch: 'G4', beats: 2 } }, insts, {});

        expect(insts.length).toBe(1);
        expect(insts[0].opcode).toBe('sys_call');
        expect(insts[0].operands).toEqual(['playNote', 'G4', 2]);
    });
});
