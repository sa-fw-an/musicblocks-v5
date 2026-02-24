import { describe, it, expect } from 'vitest';
import { MusicBlocksPlugin } from '@/plugins/musicblocks';
import { Registry } from '@/core/registry/index';
import { CoreLogicPlugin } from '@/plugins/core_logic/index';
import { Compiler } from '@/core/compiler';
import type { BlockNode } from '@/core/ast';

describe('MusicBlocks Plugin', () => {
    it('exports a PluginModule with block definitions', () => {
        expect(MusicBlocksPlugin.name).toBeTruthy();
        expect(Array.isArray(MusicBlocksPlugin.blocks)).toBe(true);
        expect(MusicBlocksPlugin.blocks.length).toBeGreaterThan(0);
    });

    it('play_note block definition compiles correctly to sys_call', () => {
        const registry = new Registry();
        registry.registerPlugin(CoreLogicPlugin);
        registry.registerPlugin(MusicBlocksPlugin);

        const compiler = new Compiler(registry);

        const startNode: BlockNode = { id: 's1', type: 'start', inputs: {}, next: 'p1' };
        const playNode: BlockNode = { id: 'p1', type: 'play_note', inputs: { pitch: 'G4', beats: 2 } };
        const blocks = { 's1': startNode, 'p1': playNode };

        const program = compiler.compile([startNode], blocks);
        const func = program.functions['thread_s1'];
        expect(func).toBeDefined();

        // Find the play_note IR block
        const playBlock = Object.values(func.blocks).find(b =>
            b.instructions.some(i => i.opcode === 'sys_call' && i.operands[0] === 'play_note')
        );
        expect(playBlock).toBeDefined();

        const syscall = playBlock!.instructions.find(i => i.opcode === 'sys_call')!;
        expect(syscall.operands[0]).toBe('play_note');
        expect(syscall.operands[1]).toBe('G4');
        expect(syscall.operands[2]).toBe(2);
    });

    it('all block definitions have required fields', () => {
        for (const def of MusicBlocksPlugin.blocks) {
            expect(typeof def.type).toBe('string');
            expect(typeof def.label).toBe('string');
            expect(typeof def.category).toBe('string');
            expect(typeof def.color).toBe('string');
            expect(typeof def.compile).toBe('function');
        }
    });
});
