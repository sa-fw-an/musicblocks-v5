import type { IRProgram } from './ir';
import { ExecutionContext } from './memory';
import { PluginRegistry } from './plugin-registry';

export type ExecutionStatus =
    | { status: 'COMPLETED_SLICE' }
    | { status: 'YIELD_UNTIL_TIME'; resumeTimeMs: number }
    | { status: 'THREAD_HALTED' }
    | { status: 'HIT_BREAKPOINT'; astNodeId: string };

export class Interpreter {
    private program: IRProgram;
    private registry: PluginRegistry;
    private breakpoints: Set<string> = new Set();

    constructor(program: IRProgram, registry: PluginRegistry) {
        this.program = program;
        this.registry = registry;
    }

    setBreakpoints(breakpoints: Set<string>) {
        this.breakpoints = breakpoints;
    }

    private resolveOperand(operand: any, context: ExecutionContext): any {
        if (typeof operand === 'string' && operand.startsWith('$')) {
            const varName = operand.slice(1);
            const val = context.memory.query(varName);
            return val !== undefined ? val : 0;
        }
        return operand;
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

            if (
                inst.astNodeId &&
                this.breakpoints.has(inst.astNodeId) &&
                inst.astNodeId !== (context as any).lastBreakpointHit
            ) {
                (context as any).lastBreakpointHit = inst.astNodeId;
                return { status: 'HIT_BREAKPOINT', astNodeId: inst.astNodeId };
            }

            if (inst.astNodeId !== (context as any).lastBreakpointHit) {
                (context as any).lastBreakpointHit = undefined;
            }

            context.instructionPointer++;
            cycles++;

            if (inst.astNodeId) {
                context.currentAstNodeId = inst.astNodeId;
            }

            const resolvedOperands = inst.operands.map(op => this.resolveOperand(op, context));

            switch (inst.opcode) {
                case 'sym_declare':
                    context.memory.declare(inst.operands[0], resolvedOperands[1]);
                    break;
                case 'sym_assign':
                case 'store':
                    context.memory.assign(inst.operands[0], resolvedOperands[1]);
                    break;
                case 'math_add': {
                    if (inst.operands.length === 3) {
                        // legacy 3 operands: [resVar, leftVar, rightNum]
                        const [resVar, leftVar] = inst.operands;
                        const val = context.memory.query(leftVar) || 0;
                        context.memory.assign(resVar, val + resolvedOperands[2]);
                    } else {
                        // new 2 operands: [varName, amountToAdd]
                        const varName = inst.operands[0];
                        const current = context.memory.query(varName) || 0;
                        context.memory.assign(varName, current + resolvedOperands[1]);
                    }
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
                    const args = resolvedOperands.slice(1).map(arg => {
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
