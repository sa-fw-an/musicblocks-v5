import React from 'react';
import type { BlockDefinition } from '@/core/registry/types';
import { BlockShape } from '@/core/ui/BlockShape';
import { CATEGORY_COLORS } from '@/core/ui/constants';

const COLOR = CATEGORY_COLORS.boxes;

// "Box" = named variable read (reporter/value block)
const BoxUI: React.FC<{ node: any; isActive: boolean; isBreakpoint: boolean; isOver: boolean }> = ({
    node, isActive, isBreakpoint, isOver,
}) => (
    <BlockShape shape="value" color={COLOR} label={node.inputs.varName || 'box'} isActive={isActive} isBreakpoint={isBreakpoint} isOver={isOver} width={100} />
);

export const BoxBlock: BlockDefinition = {
    type: 'box',
    label: 'Box',
    shape: 'value',
    category: 'boxes',
    color: COLOR,
    args: [{ name: 'varName', type: 'string', default: 'myVar' }],
    defaultInputs: { varName: 'myVar' },
    component: BoxUI,
    compile: (node, ctx) => {
        // Reporter: emits a no-op stack block (value blocks are evaluated inline)
        const block = ctx.bbm.createBlock(`block_box_${node.id}`);
        ctx.irBlocks[block.label] = block;
        block.instructions.push({ opcode: 'jump', operands: [ctx.exitLabel] });
        return block.label;
    },
};
