import React from 'react';
import type { BlockDefinition } from '@/core/registry/types';
import { BlockShape } from '@/core/ui/BlockShape';
import { BlockInput } from '@/core/ui/BlockInput';
import { CATEGORY_COLORS } from '@/core/ui/constants';

const COLOR = CATEGORY_COLORS.extras;

const WaitUI: React.FC<{ node: any; isActive: boolean; isBreakpoint: boolean; isOver: boolean }> = ({
    node, isActive, isBreakpoint, isOver,
}) => (
    <BlockShape shape="stack" color={COLOR} label="Wait" argRows={1} isActive={isActive} isBreakpoint={isBreakpoint} isOver={isOver}>
        <BlockInput nodeId={node.id} field="seconds" type="number" label="secs" min={0} width={60} />
    </BlockShape>
);

export const WaitBlock: BlockDefinition = {
    type: 'wait',
    label: 'Wait',
    shape: 'stack',
    category: 'extras',
    color: COLOR,
    args: [{ name: 'seconds', type: 'number', default: 1 }],
    defaultInputs: { seconds: 1 },
    component: WaitUI,
    compile: (node, ctx) => {
        const seconds = node.inputs.seconds || 1;
        const block = ctx.bbm.createBlock(`block_wait_${node.id}`);
        ctx.irBlocks[block.label] = block;
        block.instructions.push({ opcode: 'sys_call', operands: ['wait', seconds], astNodeId: node.id });
        block.instructions.push({ opcode: 'jump', operands: [ctx.exitLabel] });
        return block.label;
    },
    execute: (args, _ctx, currentTimeMs) => {
        const ms = (args[0] as number) * 1000;
        return { status: 'YIELD_UNTIL_TIME', resumeTimeMs: currentTimeMs + ms };
    },
};
