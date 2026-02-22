import { describe, it, expect } from 'vitest';
import { BasicBlockManager, Compiler } from '@/core/compiler';
import { PluginRegistry } from '@/core/plugin-registry';
import type { BlockNode } from '@/core/ast';

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

    it('compiles nested loops without crossing logic', () => {
        const registry = new PluginRegistry();
        const compiler = new Compiler(registry);

        const startNode: BlockNode = { id: 's1', type: 'start', inputs: {}, next: 'r1' };
        const repeatOuter: BlockNode = { id: 'r1', type: 'repeat', inputs: { iterations: 2 }, body: 'r2' };
        const repeatInner: BlockNode = { id: 'r2', type: 'repeat', inputs: { iterations: 3 } };

        const blocks = { 's1': startNode, 'r1': repeatOuter, 'r2': repeatInner };
        const program = compiler.compile([startNode], blocks);

        const func = program.functions['thread_s1'];
        expect(func).toBeDefined();

        // 1(entry) + 1(outer body) * (1 loop_condition + 1 loop_body + 1 loop_end + 1 after_loop + 1 loop_increment) + ...
        // Bbm creates these. Let's just assert the block count is sufficient and we have no errors.
        expect(Object.keys(func.blocks).length).toBeGreaterThan(5);

        // Assert nested loops generated different iter variables
        let iterVars = new Set<string>();
        for (const label in func.blocks) {
            for (const inst of func.blocks[label].instructions) {
                if (inst.opcode === 'sym_declare' && String(inst.operands[0]).startsWith('_loop_iter_')) {
                    iterVars.add(inst.operands[0]);
                }
            }
        }
        expect(iterVars.size).toBe(2); // Two different iterators for nested loops
    });

    it('handles empty blocks gracefully', () => {
        const registry = new PluginRegistry();
        const compiler = new Compiler(registry);

        const startNode: BlockNode = { id: 's1', type: 'start', inputs: {}, next: 'r1' };
        const repeatNode: BlockNode = { id: 'r1', type: 'repeat', inputs: { iterations: 2 } }; // No body

        const blocks = { 's1': startNode, 'r1': repeatNode };
        const program = compiler.compile([startNode], blocks);
        const func = program.functions['thread_s1'];

        // Should compile successfully without dying
        expect(func).toBeDefined();
        // Entry + condition + body + end + after_loop(maybe absent since no next) + increment
        expect(Object.keys(func.blocks).length).toBeGreaterThan(0);
    });

    it('compiles sequential math operations correctly', () => {
        const registry = new PluginRegistry();
        const compiler = new Compiler(registry);

        const startNode: BlockNode = { id: 's1', type: 'start', inputs: {}, next: 'v1' };
        const setNode: BlockNode = { id: 'v1', type: 'set_var', inputs: { varName: 'x', value: 10 }, next: 'c1' };
        const changeNode1: BlockNode = { id: 'c1', type: 'change_var', inputs: { varName: 'x', amount: 5 }, next: 'c2' };
        const changeNode2: BlockNode = { id: 'c2', type: 'change_var', inputs: { varName: 'x', amount: -2 } };

        const blocks = { 's1': startNode, 'v1': setNode, 'c1': changeNode1, 'c2': changeNode2 };
        const program = compiler.compile([startNode], blocks);

        const func = program.functions['thread_s1'];
        expect(func).toBeDefined();

        const entry = func.blocks[func.entryBlockId];
        expect(entry.instructions.length).toBe(3);

        expect(entry.instructions[0].opcode).toBe('store');
        expect(entry.instructions[0].operands).toEqual(['x', 10]);

        expect(entry.instructions[1].opcode).toBe('math_add');
        expect(entry.instructions[1].operands).toEqual(['x', 5]);

        expect(entry.instructions[2].opcode).toBe('math_add');
        expect(entry.instructions[2].operands).toEqual(['x', -2]);
    });
});
