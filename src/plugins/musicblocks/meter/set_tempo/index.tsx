import React from 'react';
import type { BlockDefinition } from '@/core/registry/types';
import { BlockShape } from '@/core/ui/BlockShape';
import { BlockInput } from '@/core/ui/BlockInput';
import { CATEGORY_COLORS } from '@/core/ui/constants';

const COLOR = CATEGORY_COLORS.meter;

const SetTempoUI: React.FC<{ node: any; isActive: boolean; isBreakpoint: boolean; isOver: boolean }> = ({
    node, isActive, isBreakpoint, isOver,
}) => (
    <BlockShape shape="stack" color={COLOR} label="Set Tempo" argRows={1} isActive={isActive} isBreakpoint={isBreakpoint} isOver={isOver}>
        <BlockInput nodeId={node.id} field="bpm" type="number" label="bpm" min={1} max={400} width={65} />
    </BlockShape>
);

export const SetTempoBlock: BlockDefinition = {
    type: 'set_tempo',
    label: 'Set Tempo',
    shape: 'stack',
    category: 'meter',
    color: COLOR,
    args: [{ name: 'bpm', type: 'number', default: 120 }],
    defaultInputs: { bpm: 120 },
    component: SetTempoUI,
    compile: (node, ctx) => {
        const bpm = node.inputs.bpm || 120;
        const block = ctx.bbm.createBlock(`block_set_tempo_${node.id}`);
        ctx.irBlocks[block.label] = block;
        block.instructions.push({ opcode: 'sys_call', operands: ['set_tempo', bpm], astNodeId: node.id });
        block.instructions.push({ opcode: 'jump', operands: [ctx.exitLabel] });
        return block.label;
    },
    execute: (args, context) => {
        const bpm = args[0] as number;
        context.memory.assign('_tempo', bpm);
        return null;
    },
};
