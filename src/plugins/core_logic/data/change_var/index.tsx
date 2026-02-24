import React from 'react';
import type { BlockDefinition } from '@/core/registry/types';
import { BlockShape } from '@/core/ui/BlockShape';
import { BlockInput } from '@/core/ui/BlockInput';
import { CATEGORY_COLORS } from '@/core/ui/constants';

const COLOR = CATEGORY_COLORS.boxes;

const ChangeVarUI: React.FC<{ node: any; isActive: boolean; isBreakpoint: boolean; isOver: boolean }> = ({
    node, isActive, isBreakpoint, isOver,
}) => (
    <BlockShape shape="twoArgBlock" color={COLOR} label="Change Variable" argRows={2} isActive={isActive} isBreakpoint={isBreakpoint} isOver={isOver}>
        <BlockInput nodeId={node.id} field="varName" type="text"   label="name"   width={80} />
        <BlockInput nodeId={node.id} field="amount"  type="text"   label="by"     width={60} />
    </BlockShape>
);

export const ChangeVarBlock: BlockDefinition = {
    type: 'change_var',
    label: 'Change Variable',
    shape: 'twoArgBlock',
    category: 'boxes',
    color: COLOR,
    args: [
        { name: 'varName', type: 'string', default: 'myVar' },
        { name: 'amount',  type: 'number', default: 1 },
    ],
    defaultInputs: { varName: 'myVar', amount: 1 },
    component: ChangeVarUI,
    compile: (node, ctx) => {
        const block = ctx.bbm.createBlock(`block_change_var_${node.id}`);
        ctx.irBlocks[block.label] = block;
        block.instructions.push({ opcode: 'math_add', operands: [node.inputs.varName, node.inputs.amount], astNodeId: node.id });
        block.instructions.push({ opcode: 'jump', operands: [ctx.exitLabel] });
        return block.label;
    },
};
