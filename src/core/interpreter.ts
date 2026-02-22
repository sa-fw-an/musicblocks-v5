import type { IRProgram } from './ir';
import { ExecutionContext } from './memory';
import { PluginRegistry } from './plugin-registry';

export type ExecutionStatus =
    | { status: 'COMPLETED_SLICE' }
    | { status: 'YIELD_UNTIL_TIME'; resumeTimeMs: number }
    | { status: 'THREAD_HALTED' };

export class Interpreter {
    private program: IRProgram;
    private registry: PluginRegistry;

    constructor(program: IRProgram, registry: PluginRegistry) {
        this.program = program;
        this.registry = registry;
    }

    executeSlice(_threadId: string, funcName: string, context: ExecutionContext, sliceSize: number, currentTimeMs: number): ExecutionStatus {
        const func = this.program.functions[funcName];
        if (!func) return { status: 'THREAD_HALTED' };

        let cycles = 0;

        while (cycles < sliceSize) {
            const block = func.blocks[context.currentBlockId];
            if (!block) return { status: 'THREAD_HALTED' };

            if (context.instructionPointer >= block.instructions.length) {
                return { status: 'THREAD_HALTED' };
            }

            const inst = block.instructions[context.instructionPointer];
            context.instructionPointer++;
            cycles++;

            if (inst.astNodeId) {
                context.currentAstNodeId = inst.astNodeId;
            }

            switch (inst.opcode) {
                case 'sym_declare':
                    context.memory.declare(inst.operands[0], inst.operands[1]);
                    break;
                case 'sym_assign':
                    context.memory.assign(inst.operands[0], inst.operands[1]);
                    break;
                case 'math_add': {
                    const [resVar, leftVar, rightNum] = inst.operands;
                    const val = context.memory.query(leftVar);
                    context.memory.assign(resVar, val + rightNum);
                    break;
                }
                case 'jump':
                    context.currentBlockId = inst.operands[0];
                    context.instructionPointer = 0;
                    break;
                case 'compare_jump': {
                    const [op, leftVar, rightVal, trueLabel, falseLabel] = inst.operands;
                    const leftVal = context.memory.query(leftVar);
                    let result = false;
                    if (op === '<=') result = leftVal <= rightVal;
                    else if (op === '<') result = leftVal < rightVal;
                    else if (op === '===') result = leftVal === rightVal;
                    else if (op === '>=') result = leftVal >= rightVal;

                    context.currentBlockId = result ? trueLabel : falseLabel;
                    context.instructionPointer = 0;
                    break;
                }
                case 'sys_call': {
                    const syscallName = inst.operands[0];
                    const args = inst.operands.slice(1).map(arg => {
                        if (typeof arg === 'string' && arg.startsWith('_')) {
                            const varName = arg.slice(1);
                            return context.memory.query(varName);
                        }
                        return arg;
                    });
                    const handler = this.registry.getSyscall(syscallName);
                    if (handler) {
                        const status = handler(args, context, currentTimeMs);
                        if (status) return status;
                    } else {
                        console.warn(`Syscall ${syscallName} not found by interpreter`);
                    }
                    break;
                }
                case 'yield':
                    return { status: 'COMPLETED_SLICE' };
            }
        }

        return { status: 'COMPLETED_SLICE' };
    }
}
