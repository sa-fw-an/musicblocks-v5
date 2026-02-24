import React from 'react';
import type { BlockDefinition } from '@/core/registry/types';
import { BlockShape } from '@/core/ui/BlockShape';
import { CATEGORY_COLORS } from '@/core/ui/constants';

const COLOR = CATEGORY_COLORS.program;

const StartUI: React.FC<{ node: any; isActive: boolean; isBreakpoint: boolean; isOver: boolean; bodySlot?: React.ReactNode }> = ({
    isActive, isBreakpoint, isOver, bodySlot,
}) => (
    <BlockShape shape="stackClampZeroArgBlock" color={COLOR} label="Start" isActive={isActive} isBreakpoint={isBreakpoint} isOver={isOver} bodySlot={bodySlot} />
);

export const StartBlock: BlockDefinition = {
    type: 'start',
    label: 'Start',
    shape: 'stackClampZeroArgBlock',
    category: 'program',
    color: COLOR,
    defaultInputs: {},
    component: StartUI,
    compile: (node, ctx) => {
        const block = ctx.bbm.createBlock(`block_start_${node.id}`);
        ctx.irBlocks[block.label] = block;
        block.instructions.push({ opcode: 'jump', operands: [ctx.exitLabel], astNodeId: node.id });
        return block.label;
    },
};
