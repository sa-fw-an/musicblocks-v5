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

        const threadEndBlock = bbm.createBlock('thread_end');
        irFunc.blocks[threadEndBlock.label] = threadEndBlock;
        // The block is empty; execution naturally falls off and halts.

        const entryLabel = this.compileChain(startNode.id, threadEndBlock.label, blocks, bbm, irFunc);
        irFunc.entryBlockId = entryLabel;

        return irFunc;
    }

    private compileChain(nodeId: string | undefined, exitLabel: string, blocks: Record<BlockId, BlockNode>, bbm: BasicBlockManager, irFunc: IRFunction): string {
        if (!nodeId || !blocks[nodeId]) {
            return exitLabel;
        }

        const current = blocks[nodeId];
        const nextLabel = this.compileChain(current.next, exitLabel, blocks, bbm, irFunc);

        if (current.type === 'repeat') {
            const iterations = current.inputs.iterations || 2;
            const loopId = current.id;
            const iterVar = `_loop_iter_${loopId}`;

            const initBlock = bbm.createBlock(`loop_init_${loopId}`);
            const conditionBlock = bbm.createBlock(`loop_cond_${loopId}`);
            const incrementBlock = bbm.createBlock(`loop_increment_${loopId}`);

            irFunc.blocks[initBlock.label] = initBlock;
            irFunc.blocks[conditionBlock.label] = conditionBlock;
            irFunc.blocks[incrementBlock.label] = incrementBlock;

            // Increment body
            incrementBlock.instructions.push({ opcode: 'math_add', operands: [iterVar, iterVar, 1], astNodeId: current.id });
            incrementBlock.instructions.push({ opcode: 'jump', operands: [conditionBlock.label] });

            // Body chain - exit to incrementBlock
            const bodyStartLabel = this.compileChain(current.body, incrementBlock.label, blocks, bbm, irFunc);

            // Condition block
            conditionBlock.instructions.push({
                opcode: 'compare_jump',
                operands: ['<', iterVar, iterations, bodyStartLabel, nextLabel],
                astNodeId: current.id
            });

            // Init block
            initBlock.instructions.push({ opcode: 'sym_declare', operands: [iterVar, 0], astNodeId: current.id });
            initBlock.instructions.push({ opcode: 'jump', operands: [conditionBlock.label], astNodeId: current.id });

            return initBlock.label;
        } else {
            // Standard blocks & Custom blocks
            const block = bbm.createBlock(`block_${current.type}_${current.id}`);
            irFunc.blocks[block.label] = block;

            if (current.type === 'set_var') {
                block.instructions.push({
                    opcode: 'store',
                    operands: [current.inputs.varName, current.inputs.value],
                    astNodeId: current.id
                });
            } else if (current.type === 'change_var') {
                block.instructions.push({
                    opcode: 'math_add',
                    operands: [current.inputs.varName, current.inputs.amount],
                    astNodeId: current.id
                });
            } else {
                const customCompiler = this.registry.getBlockCompiler(current.type);
                if (customCompiler) {
                    customCompiler(current, block.instructions, { bbm, blocks: irFunc.blocks });
                }
            }

            // Always jump to the next label (which could be the next block or the exitLabel of the parent)
            block.instructions.push({ opcode: 'jump', operands: [nextLabel] });

            return block.label;
        }
    }
}
