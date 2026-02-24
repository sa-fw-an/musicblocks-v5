import type { BlockNode, BlockId } from '@/core/ast';
import type { IRProgram, IRFunction, IRBasicBlock } from '@/core/ir';
import type { Registry } from '@/core/registry/index';
import type { BlockCompileCtx } from '@/core/registry/types';

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
    private registry: Registry;

    constructor(registry: Registry) {
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

        const entryLabel = this.compileChain(startNode.id, threadEndBlock.label, blocks, bbm, irFunc);
        irFunc.entryBlockId = entryLabel;

        return irFunc;
    }

    private compileChain(
        nodeId: string | undefined,
        exitLabel: string,
        blocks: Record<BlockId, BlockNode>,
        bbm: BasicBlockManager,
        irFunc: IRFunction
    ): string {
        if (!nodeId || !blocks[nodeId]) {
            return exitLabel;
        }

        const current = blocks[nodeId];

        // Closure that plugin compile() functions call for sub-chains
        const compileChainFn = (id: string | undefined, exit: string) =>
            this.compileChain(id, exit, blocks, bbm, irFunc);

        const nextLabel = compileChainFn(current.next, exitLabel);

        // Delegate to registered block definition first
        const def = this.registry.getBlock(current.type);
        if (def?.compile) {
            const ctx: BlockCompileCtx = {
                exitLabel: nextLabel,
                bbm,
                irBlocks: irFunc.blocks,
                compileChain: compileChainFn,
                blocks,
            };
            return def.compile(current, ctx);
        }

        // Fallback built-ins (keeps existing tests passing without needing plugin registration)
        if (current.type === 'repeat') {
            return this.compileRepeat(current, nextLabel, blocks, bbm, irFunc, compileChainFn);
        }

        const block = bbm.createBlock(`block_${current.type}_${current.id}`);
        irFunc.blocks[block.label] = block;

        if (current.type === 'set_var') {
            block.instructions.push({
                opcode: 'store',
                operands: [current.inputs.varName, current.inputs.value],
                astNodeId: current.id
            });
        } else if (current.type === 'random') {
            block.instructions.push({
                opcode: 'math_random',
                operands: [current.inputs.varName, current.inputs.min, current.inputs.max],
                astNodeId: current.id
            });
        } else if (current.type === 'change_var') {
            block.instructions.push({
                opcode: 'math_add',
                operands: [current.inputs.varName, current.inputs.amount],
                astNodeId: current.id
            });
        }
        // start / unknown blocks: emit no instruction, just jump through

        block.instructions.push({ opcode: 'jump', operands: [nextLabel] });
        return block.label;
    }

    private compileRepeat(
        current: BlockNode,
        nextLabel: string,
        _blocks: Record<BlockId, BlockNode>,
        bbm: BasicBlockManager,
        irFunc: IRFunction,
        compileChainFn: (id: string | undefined, exit: string) => string
    ): string {
        const iterations = current.inputs.iterations || 2;
        const loopId = current.id;
        const iterVar = `_loop_iter_${loopId}`;

        const initBlock      = bbm.createBlock(`loop_init_${loopId}`);
        const conditionBlock = bbm.createBlock(`loop_cond_${loopId}`);
        const incrementBlock = bbm.createBlock(`loop_increment_${loopId}`);

        irFunc.blocks[initBlock.label]      = initBlock;
        irFunc.blocks[conditionBlock.label] = conditionBlock;
        irFunc.blocks[incrementBlock.label] = incrementBlock;

        incrementBlock.instructions.push({ opcode: 'math_add', operands: [iterVar, iterVar, 1], astNodeId: current.id });
        incrementBlock.instructions.push({ opcode: 'jump', operands: [conditionBlock.label] });

        const bodyStartLabel = compileChainFn(current.body, incrementBlock.label);

        conditionBlock.instructions.push({
            opcode: 'compare_jump',
            operands: ['<', iterVar, iterations, bodyStartLabel, nextLabel],
            astNodeId: current.id
        });

        initBlock.instructions.push({ opcode: 'sym_declare', operands: [iterVar, 0], astNodeId: current.id });
        initBlock.instructions.push({ opcode: 'jump', operands: [conditionBlock.label], astNodeId: current.id });

        return initBlock.label;
    }
}
