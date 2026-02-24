import React from 'react';
import type { BlockDefinition } from '@/core/registry/types';
import { BlockShape } from '@/core/ui/BlockShape';
import { BlockInput } from '@/core/ui/BlockInput';
import { CATEGORY_COLORS } from '@/core/ui/constants';

const COLOR = CATEGORY_COLORS.flow;

const RepeatUI: React.FC<{ node: any; isActive: boolean; isBreakpoint: boolean; isOver: boolean; isBodyOver?: boolean; bodySlot?: React.ReactNode }> = ({
    node, isActive, isBreakpoint, isOver, isBodyOver, bodySlot,
}) => (
    <BlockShape shape="flowClampOneArgBlock" color={COLOR} label="Repeat" argRows={1} isActive={isActive} isBreakpoint={isBreakpoint} isOver={isOver} isBodyOver={isBodyOver} bodySlot={bodySlot}>
        <BlockInput nodeId={node.id} field="iterations" type="number" label="times" min={1} width={60} />
    </BlockShape>
);

export const RepeatBlock: BlockDefinition = {
    type: 'repeat',
    label: 'Repeat',
    shape: 'flowClampOneArgBlock',
    category: 'flow',
    color: COLOR,
    args: [{ name: 'iterations', type: 'number', default: 2 }],
    defaultInputs: { iterations: 2 },
    component: RepeatUI,
    compile: (node, ctx) => {
        const iterations = node.inputs.iterations || 2;
        const loopId = node.id;
        const iterVar = `_loop_iter_${loopId}`;

        const initBlock      = ctx.bbm.createBlock(`loop_init_${loopId}`);
        const conditionBlock = ctx.bbm.createBlock(`loop_cond_${loopId}`);
        const incrementBlock = ctx.bbm.createBlock(`loop_increment_${loopId}`);

        ctx.irBlocks[initBlock.label]      = initBlock;
        ctx.irBlocks[conditionBlock.label] = conditionBlock;
        ctx.irBlocks[incrementBlock.label] = incrementBlock;

        incrementBlock.instructions.push({ opcode: 'math_add', operands: [iterVar, iterVar, 1], astNodeId: node.id });
        incrementBlock.instructions.push({ opcode: 'jump', operands: [conditionBlock.label] });

        const bodyStartLabel = ctx.compileChain(node.body, incrementBlock.label);

        conditionBlock.instructions.push({
            opcode: 'compare_jump',
            operands: ['<', iterVar, iterations, bodyStartLabel, ctx.exitLabel],
            astNodeId: node.id,
        });

        initBlock.instructions.push({ opcode: 'sym_declare', operands: [iterVar, 0], astNodeId: node.id });
        initBlock.instructions.push({ opcode: 'jump', operands: [conditionBlock.label], astNodeId: node.id });

        return initBlock.label;
    },
};
