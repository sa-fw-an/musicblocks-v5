import React from 'react';
import type { BlockDefinition } from '@/core/registry/types';
import { BlockShape } from '@/core/ui/BlockShape';
import { BlockInput } from '@/core/ui/BlockInput';
import { CATEGORY_COLORS } from '@/core/ui/constants';

const COLOR = CATEGORY_COLORS.boxes;

const SetVarUI: React.FC<{ node: any; isActive: boolean; isBreakpoint: boolean; isOver: boolean }> = ({
    node, isActive, isBreakpoint, isOver,
}) => (
    <BlockShape shape="twoArgBlock" color={COLOR} label="Set Variable" argRows={2} isActive={isActive} isBreakpoint={isBreakpoint} isOver={isOver}>
        <BlockInput nodeId={node.id} field="varName" type="text" label="name" width={80} />
        <BlockInput nodeId={node.id} field="value"   type="text" label="value" width={80} />
    </BlockShape>
);

export const SetVarBlock: BlockDefinition = {
    type: 'set_var',
    label: 'Set Variable',
    shape: 'twoArgBlock',
    category: 'boxes',
    color: COLOR,
    args: [
        { name: 'varName', type: 'string', default: 'myVar' },
        { name: 'value',   type: 'number', default: 1 },
    ],
    defaultInputs: { varName: 'myVar', value: 1 },
    component: SetVarUI,
    compile: (node, ctx) => {
        const block = ctx.bbm.createBlock(`block_set_var_${node.id}`);
        ctx.irBlocks[block.label] = block;
        block.instructions.push({ opcode: 'store', operands: [node.inputs.varName, node.inputs.value], astNodeId: node.id });
        block.instructions.push({ opcode: 'jump', operands: [ctx.exitLabel] });
        return block.label;
    },
};
