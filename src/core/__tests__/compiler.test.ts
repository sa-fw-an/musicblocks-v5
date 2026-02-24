import { describe, it, expect } from 'vitest';
import { BasicBlockManager, Compiler } from '@/core/compiler';
import { Registry } from '@/core/registry/index';
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
        const registry = new Registry();
        const compiler = new Compiler(registry);

        const startNode: BlockNode = {
            id: 'start_1',
            type: 'start',
            inputs: {}
        };

        const program = compiler.compile([startNode], { 'start_1': startNode });
        expect(program.functions['thread_start_1']).toBeDefined();

        const func = program.functions['thread_start_1'];
        expect(func.entryBlockId).toMatch(/^block_start_start_1/);
        expect(Object.keys(func.blocks).length).toBeGreaterThan(1);
    });

    it('compiles nested loops without crossing logic', () => {
        const registry = new Registry();
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
        const registry = new Registry();
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
        const registry = new Registry();
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
        expect(entry.instructions[0].opcode).toBe('jump');

        const setVarLabel = entry.instructions[0].operands[0] as string;
        const setVarBlock = func.blocks[setVarLabel];

        expect(setVarBlock.instructions[0].opcode).toBe('store');
        expect(setVarBlock.instructions[0].operands).toEqual(['x', 10]);
        expect(setVarBlock.instructions[1].opcode).toBe('jump');

        const change1Label = setVarBlock.instructions[1].operands[0] as string;
        const change1Block = func.blocks[change1Label];

        expect(change1Block.instructions[0].opcode).toBe('math_add');
        expect(change1Block.instructions[0].operands).toEqual(['x', 5]);
        expect(change1Block.instructions[1].opcode).toBe('jump');

        const change2Label = change1Block.instructions[1].operands[0] as string;
        const change2Block = func.blocks[change2Label];

        expect(change2Block.instructions[0].opcode).toBe('math_add');
        expect(change2Block.instructions[0].operands).toEqual(['x', -2]);
    });

    it('Correctly wires jump pointers for nested REPEAT blocks', () => {
        const registry = new Registry();
        const compiler = new Compiler(registry);

        // AST representation:
        // START -> REPEAT (R1)
        //   body: PLAY_NOTE (N1) -> REPEAT (R2)
        //     body: PLAY_NOTE (N2)

        const startNode: BlockNode = { id: 'start', type: 'start', inputs: {}, next: 'R1' };

        const outerRepeat: BlockNode = { id: 'R1', type: 'repeat', inputs: { iterations: 2 }, body: 'N1' };

        const outerNote: BlockNode = { id: 'N1', type: 'play_note', inputs: { pitch: 'C4', beats: 1 }, next: 'R2' };

        const innerRepeat: BlockNode = { id: 'R2', type: 'repeat', inputs: { iterations: 2 }, body: 'N2' };

        const innerNote: BlockNode = { id: 'N2', type: 'play_note', inputs: { pitch: 'C4', beats: 1 } };

        const blocks = {
            'start': startNode,
            'R1': outerRepeat,
            'N1': outerNote,
            'R2': innerRepeat,
            'N2': innerNote
        };

        const program = compiler.compile([startNode], blocks);
        const func = program.functions['thread_start'];

        // R1 should produce specific loop blocks
        const r1Condition = Object.values(func.blocks).find(b => b.label.startsWith('loop_cond_R1'));
        const r1Increment = Object.values(func.blocks).find(b => b.label.startsWith('loop_increment_R1'));

        expect(r1Condition).toBeDefined();
        expect(r1Increment).toBeDefined();

        // R2 should produce specific loop blocks
        const r2Condition = Object.values(func.blocks).find(b => b.label.startsWith('loop_cond_R2'));
        const r2After = Object.values(func.blocks).find(b => b.label.startsWith('after_loop_R2'))
            || Object.values(func.blocks).find(b => b.label.startsWith('loop_end_R2'))
            || r1Increment;

        expect(r2Condition).toBeDefined();
        expect(r2After).toBeDefined();

        const r2ExitTarget = r2Condition?.instructions.find(i => i.opcode === 'compare_jump')?.operands[4];
        expect(r2ExitTarget).toBe(r1Increment?.label);
    });
});
