import React from 'react';
import type { BlockDefinition } from '@/core/registry/types';
import { BlockShape } from '@/core/ui/BlockShape';
import { CATEGORY_COLORS } from '@/core/ui/constants';

const COLOR = CATEGORY_COLORS.flow;

const ForeverUI: React.FC<{ node: any; isActive: boolean; isBreakpoint: boolean; isOver: boolean; isBodyOver?: boolean }> = ({
    isActive, isBreakpoint, isOver, isBodyOver,
}) => (
    <BlockShape shape="clamp" color={COLOR} label="Forever" isActive={isActive} isBreakpoint={isBreakpoint} isOver={isOver} isBodyOver={isBodyOver} />
);

export const ForeverBlock: BlockDefinition = {
    type: 'forever',
    label: 'Forever',
    shape: 'clamp',
    category: 'flow',
    color: COLOR,
    defaultInputs: {},
    component: ForeverUI,
    compile: (node, ctx) => {
        const loopHeader = ctx.bbm.createBlock(`forever_header_${node.id}`);
        ctx.irBlocks[loopHeader.label] = loopHeader;

        const bodyStartLabel = ctx.compileChain(node.body, loopHeader.label);

        loopHeader.instructions.push({ opcode: 'jump', operands: [bodyStartLabel], astNodeId: node.id });

        return loopHeader.label;
    },
};
