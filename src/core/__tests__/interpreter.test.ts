import { describe, it, expect, vi } from 'vitest';
import { Interpreter } from '../interpreter';
import { ExecutionContext } from '../memory';
import { PluginRegistry } from '../plugin-registry';
import type { IRProgram } from '../ir';

describe('Interpreter', () => {
    it('executes basic IR blocks incrementally', () => {
        const mockRegistry = new PluginRegistry();
        const syscallSpy = vi.fn().mockReturnValue({ status: 'YIELD_UNTIL_TIME', resumeTimeMs: 1000 });

        mockRegistry.register({
            name: 'test',
            blockCompilers: {},
            syscalls: { 'testSyscall': syscallSpy }
        });

        const program: IRProgram = {
            functions: {
                'main': {
                    name: 'main',
                    entryBlockId: 'b1',
                    blocks: {
                        'b1': {
                            label: 'b1',
                            instructions: [
                                { opcode: 'sym_declare', operands: ['x', 5] },
                                { opcode: 'math_add', operands: ['x', 'x', 10] },
                                // In the interpreter, arg starting with '_' implies memory lookup
                                { opcode: 'sys_call', operands: ['testSyscall', '_x'] }
                            ]
                        }
                    }
                }
            }
        };

        const interpreter = new Interpreter(program, mockRegistry);
        const ctx = new ExecutionContext('t1', 'b1');

        // Execute 2 cycles (sym_declare, math_add)
        let status = interpreter.executeSlice('t1', 'main', ctx, 2, 0);
        expect(status.status).toBe('COMPLETED_SLICE');
        expect(ctx.instructionPointer).toBe(2);
        expect(ctx.memory.query('x')).toBe(15);

        // Execute 1 block (sys_call)
        status = interpreter.executeSlice('t1', 'main', ctx, 1, 0);
        expect(status.status).toBe('YIELD_UNTIL_TIME');
        expect(syscallSpy).toHaveBeenCalledWith([15], ctx, 0);
    });

    it('handles compare_jump branching', () => {
        const mockRegistry = new PluginRegistry();
        const program: IRProgram = {
            functions: {
                'main': {
                    name: 'main',
                    entryBlockId: 'b1',
                    blocks: {
                        'b1': {
                            label: 'b1',
                            instructions: [
                                { opcode: 'sym_declare', operands: ['x', 10] },
                                { opcode: 'compare_jump', operands: ['<', 'x', 20, 'true_block', 'false_block'] }
                            ]
                        },
                        'true_block': { label: 'true_block', instructions: [] },
                        'false_block': { label: 'false_block', instructions: [] }
                    }
                }
            }
        };

        const interpreter = new Interpreter(program, mockRegistry);
        const ctx = new ExecutionContext('t1', 'b1');

        interpreter.executeSlice('t1', 'main', ctx, 10, 0);
        expect(ctx.currentBlockId).toBe('true_block');
    });

    it('resolves dynamic operands starting with $', () => {
        const mockRegistry = new PluginRegistry();
        const program: IRProgram = {
            functions: {
                'main': {
                    name: 'main',
                    entryBlockId: 'b1',
                    blocks: {
                        'b1': {
                            label: 'b1',
                            instructions: [
                                { opcode: 'sym_declare', operands: ['x', 10] },
                                { opcode: 'store', operands: ['y', '$x'] },
                                { opcode: 'store', operands: ['z', '$undef'] }
                            ]
                        }
                    }
                }
            }
        };

        const interpreter = new Interpreter(program, mockRegistry);
        const ctx = new ExecutionContext('t1', 'b1');

        interpreter.executeSlice('t1', 'main', ctx, 10, 0);
        expect(ctx.memory.query('y')).toBe(10);
        expect(ctx.memory.query('z')).toBe(0); // Defaults to 0 when undefined
    });

    it('handles the new math_add opcode with 2 operands', () => {
        const mockRegistry = new PluginRegistry();
        const program: IRProgram = {
            functions: {
                'main': {
                    name: 'main',
                    entryBlockId: 'b1',
                    blocks: {
                        'b1': {
                            label: 'b1',
                            instructions: [
                                { opcode: 'sym_declare', operands: ['x', 10] },
                                { opcode: 'math_add', operands: ['x', 5] },
                                { opcode: 'math_add', operands: ['y', 5] }, // y is undefined, defaults to 0 + 5 = 5
                                { opcode: 'math_add', operands: ['x', '$y'] } // x becomes 15 + 5 = 20
                            ]
                        }
                    }
                }
            }
        };

        const interpreter = new Interpreter(program, mockRegistry);
        const ctx = new ExecutionContext('t1', 'b1');

        interpreter.executeSlice('t1', 'main', ctx, 10, 0);
        expect(ctx.memory.query('x')).toBe(20);
        expect(ctx.memory.query('y')).toBe(5);
    });
});
