import React from 'react';
import type { BlockDefinition } from '@/core/registry/types';
import { BlockShape } from '@/core/ui/BlockShape';
import { BlockInput } from '@/core/ui/BlockInput';
import { CATEGORY_COLORS } from '@/core/ui/constants';

const COLOR = CATEGORY_COLORS.number;

const RandomUI: React.FC<{ node: any; isActive: boolean; isBreakpoint: boolean; isOver: boolean }> = ({
    node, isActive, isBreakpoint, isOver,
}) => (
    <BlockShape shape="stack" color={COLOR} label="Random" argRows={3} isActive={isActive} isBreakpoint={isBreakpoint} isOver={isOver}>
        <BlockInput nodeId={node.id} field="varName" type="text"   label="store in" width={70} />
        <BlockInput nodeId={node.id} field="min"     type="number" label="min"       width={50} />
        <BlockInput nodeId={node.id} field="max"     type="number" label="max"       width={50} />
    </BlockShape>
);

export const RandomBlock: BlockDefinition = {
    type: 'random',
    label: 'Random',
    shape: 'stack',
    category: 'number',
    color: COLOR,
    args: [
        { name: 'varName', type: 'string', default: 'myVar' },
        { name: 'min',     type: 'number', default: 1 },
        { name: 'max',     type: 'number', default: 10 },
    ],
    defaultInputs: { varName: 'myVar', min: 1, max: 10 },
    component: RandomUI,
    compile: (node, ctx) => {
        const block = ctx.bbm.createBlock(`block_random_${node.id}`);
        ctx.irBlocks[block.label] = block;
        block.instructions.push({ opcode: 'math_random', operands: [node.inputs.varName, node.inputs.min, node.inputs.max], astNodeId: node.id });
        block.instructions.push({ opcode: 'jump', operands: [ctx.exitLabel] });
        return block.label;
    },
};
