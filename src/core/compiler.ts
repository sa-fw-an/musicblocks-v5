import type { BlockNode, BlockId } from '@/core/ast';
import type { IRProgram, IRFunction, IRBasicBlock } from '@/core/ir';
import { PluginRegistry } from '@/core/plugin-registry';

export class BasicBlockManager {
    private counter = 0;
    createBlock(label: string): IRBasicBlock {
        this.counter++;
        return {
            label: `${label}_${this.counter}`,
            instructions: []
        };
    }
}

export class Compiler {
    private registry: PluginRegistry;

    constructor(registry: PluginRegistry) {
        this.registry = registry;
    }

    compile(startNodes: BlockNode[], blocks: Record<BlockId, BlockNode>): IRProgram {
        const program: IRProgram = { functions: {} };

        for (const startNode of startNodes) {
            const funcName = `thread_${startNode.id}`;
            const irFunc = this.compileThread(startNode, blocks);
            irFunc.name = funcName;
            program.functions[funcName] = irFunc;
        }

        return program;
    }

    private compileThread(startNode: BlockNode, blocks: Record<BlockId, BlockNode>): IRFunction {
        const bbm = new BasicBlockManager();
        const irFunc: IRFunction = {
            name: '',
            blocks: {},
            entryBlockId: ''
        };

        const entryBlock = bbm.createBlock('entry');
        irFunc.entryBlockId = entryBlock.label;
        irFunc.blocks[entryBlock.label] = entryBlock;

        let currentBlock = entryBlock;
        let loopCounter = 0;

        const stack: { node: BlockNode | undefined, returnToBlock?: IRBasicBlock }[] = [];
        stack.push({ node: startNode });

        while (stack.length > 0) {
            const frame = stack.pop()!;
            let current = frame.node;

            if (!current && frame.returnToBlock) {
                currentBlock.instructions.push({ opcode: 'jump', operands: [frame.returnToBlock.label] });
                currentBlock = frame.returnToBlock;
                continue;
            }

            while (current) {
                if (current.type === 'repeat') {
                    const iterations = current.inputs.iterations || 2;
                    loopCounter++;
                    const loopId = loopCounter;
                    const iterVar = `_loop_iter_${loopId}`;

                    const conditionBlock = bbm.createBlock('loop_condition');
                    const bodyBlock = bbm.createBlock('loop_body');
                    const endBlock = bbm.createBlock('loop_end');

                    irFunc.blocks[conditionBlock.label] = conditionBlock;
                    irFunc.blocks[bodyBlock.label] = bodyBlock;
                    irFunc.blocks[endBlock.label] = endBlock;

                    currentBlock.instructions.push({ opcode: 'sym_declare', operands: [iterVar, 0] });
                    currentBlock.instructions.push({ opcode: 'jump', operands: [conditionBlock.label] });

                    conditionBlock.instructions.push({
                        opcode: 'compare_jump',
                        operands: ['<', iterVar, iterations, bodyBlock.label, endBlock.label]
                    });

                    currentBlock = bodyBlock;

                    if (current.next && blocks[current.next]) {
                        const afterLoopBlock = bbm.createBlock('after_loop');
                        irFunc.blocks[afterLoopBlock.label] = afterLoopBlock;
                        endBlock.instructions.push({ opcode: 'jump', operands: [afterLoopBlock.label] });

                        stack.push({ node: blocks[current.next], returnToBlock: undefined });
                        stack.push({ node: undefined, returnToBlock: afterLoopBlock });
                    }

                    const incrementBlock = bbm.createBlock('loop_increment');
                    irFunc.blocks[incrementBlock.label] = incrementBlock;
                    incrementBlock.instructions.push({ opcode: 'math_add', operands: [iterVar, iterVar, 1] });
                    stack.push({ node: undefined, returnToBlock: conditionBlock });
                    stack.push({ node: undefined, returnToBlock: incrementBlock });

                    if (current.body && blocks[current.body]) {
                        current = blocks[current.body];
                    } else {
                        current = undefined;
                    }
                    continue;
                } else {
                    const customCompiler = this.registry.getBlockCompiler(current.type);
                    if (customCompiler) {
                        customCompiler(current, currentBlock.instructions, { bbm, blocks: irFunc.blocks });
                    } else {
                        // For unrecognised block types we could just skip or throw
                        // It's possible there are blocks we don't handle in testing.
                    }
                }

                current = current.next ? blocks[current.next] : undefined;
            }
        }

        return irFunc;
    }
}
