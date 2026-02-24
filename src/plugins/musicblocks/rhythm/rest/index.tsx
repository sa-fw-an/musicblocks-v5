import React from 'react';
import type { BlockDefinition } from '@/core/registry/types';
import { BlockShape } from '@/core/ui/BlockShape';
import { BlockInput } from '@/core/ui/BlockInput';
import { CATEGORY_COLORS } from '@/core/ui/constants';

const COLOR = CATEGORY_COLORS.rhythm;

const RestUI: React.FC<{ node: any; isActive: boolean; isBreakpoint: boolean; isOver: boolean }> = ({
    node, isActive, isBreakpoint, isOver,
}) => (
    <BlockShape shape="stack" color={COLOR} label="Rest" argRows={1} isActive={isActive} isBreakpoint={isBreakpoint} isOver={isOver}>
        <BlockInput nodeId={node.id} field="beats" type="text" label="beats" width={60} />
    </BlockShape>
);

export const RestBlock: BlockDefinition = {
    type: 'rest',
    label: 'Rest',
    shape: 'stack',
    category: 'rhythm',
    color: COLOR,
    args: [{ name: 'beats', type: 'number', default: 1 }],
    defaultInputs: { beats: 1 },
    component: RestUI,
    compile: (node, ctx) => {
        const duration = node.inputs.beats || 1;
        const block = ctx.bbm.createBlock(`block_rest_${node.id}`);
        ctx.irBlocks[block.label] = block;
        block.instructions.push({ opcode: 'sys_call', operands: ['rest', duration], astNodeId: node.id });
        block.instructions.push({ opcode: 'jump', operands: [ctx.exitLabel] });
        return block.label;
    },
    execute: (args, context, currentTimeMs) => {
        const durationBeats = args[0] as number;
        const bpm = context.memory.query('_tempo') || 120;
        const durationMs = durationBeats * (60000 / bpm);
        return { status: 'YIELD_UNTIL_TIME', resumeTimeMs: currentTimeMs + durationMs };
    },
};
