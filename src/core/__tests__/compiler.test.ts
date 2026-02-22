import { describe, it, expect } from 'vitest';
import { BasicBlockManager, Compiler } from '../compiler';
import { PluginRegistry } from '../plugin-registry';
import type { BlockNode } from '../ast';

describe('Compiler', () => {
    it('creates basic blocks correctly', () => {
        const bbm = new BasicBlockManager();
        const b1 = bbm.createBlock('test');
        expect(b1.label).toBe('test_1');
        expect(b1.instructions).toEqual([]);

        const b2 = bbm.createBlock('test');
        expect(b2.label).toBe('test_2');
    });

    it('compiles an empty thread', () => {
        const registry = new PluginRegistry();
        const compiler = new Compiler(registry);

        const startNode: BlockNode = {
            id: 'start_1',
            type: 'start',
            inputs: {}
        };

        const program = compiler.compile([startNode], { 'start_1': startNode });
        expect(program.functions['thread_start_1']).toBeDefined();

        const func = program.functions['thread_start_1'];
        expect(func.entryBlockId).toBe('entry_1');
        expect(Object.keys(func.blocks).length).toBe(1);
    });
});
