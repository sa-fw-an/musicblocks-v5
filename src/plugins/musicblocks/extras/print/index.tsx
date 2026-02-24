import React from 'react';
import type { BlockDefinition } from '@/core/registry/types';
import { BlockShape } from '@/core/ui/BlockShape';
import { BlockInput } from '@/core/ui/BlockInput';
import { CATEGORY_COLORS } from '@/core/ui/constants';

const COLOR = CATEGORY_COLORS.extras;

const PrintUI: React.FC<{ node: any; isActive: boolean; isBreakpoint: boolean; isOver: boolean }> = ({
    node, isActive, isBreakpoint, isOver,
}) => (
    <BlockShape shape="oneArgBlock" color={COLOR} label="Print" argRows={1} isActive={isActive} isBreakpoint={isBreakpoint} isOver={isOver}>
        <BlockInput nodeId={node.id} field="message" type="text" label="msg" width={110} />
    </BlockShape>
);

export const PrintBlock: BlockDefinition = {
    type: 'print',
    label: 'Print',
    shape: 'oneArgBlock',
    category: 'extras',
    color: COLOR,
    args: [{ name: 'message', type: 'string', default: 'Hello World' }],
    defaultInputs: { message: 'Hello World' },
    component: PrintUI,
    compile: (node, ctx) => {
        const message = node.inputs.message || '';
        const block = ctx.bbm.createBlock(`block_print_${node.id}`);
        ctx.irBlocks[block.label] = block;
        block.instructions.push({ opcode: 'sys_call', operands: ['print', message], astNodeId: node.id });
        block.instructions.push({ opcode: 'jump', operands: [ctx.exitLabel] });
        return block.label;
    },
    execute: (args) => {
        console.log('PRINT BLOCK:', args[0]);
        return null;
    },
};
