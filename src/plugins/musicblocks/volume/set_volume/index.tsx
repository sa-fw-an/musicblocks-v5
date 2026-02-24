import React from 'react';
import type { BlockDefinition } from '@/core/registry/types';
import { BlockShape } from '@/core/ui/BlockShape';
import { BlockInput } from '@/core/ui/BlockInput';
import { CATEGORY_COLORS } from '@/core/ui/constants';
import { getActiveTone } from '@/plugins/musicblocks/tone-shared';

const COLOR = CATEGORY_COLORS.volume;

const SetVolumeUI: React.FC<{ node: any; isActive: boolean; isBreakpoint: boolean; isOver: boolean }> = ({
    node, isActive, isBreakpoint, isOver,
}) => (
    <BlockShape shape="oneArgBlock" color={COLOR} label="Set Volume" argRows={1} isActive={isActive} isBreakpoint={isBreakpoint} isOver={isOver}>
        <BlockInput nodeId={node.id} field="level" type="number" label="level" min={0} max={100} width={60} />
    </BlockShape>
);

export const SetVolumeBlock: BlockDefinition = {
    type: 'set_volume',
    label: 'Set Volume',
    shape: 'oneArgBlock',
    category: 'volume',
    color: COLOR,
    args: [{ name: 'level', type: 'number', default: 50 }],
    defaultInputs: { level: 50 },
    component: SetVolumeUI,
    compile: (node, ctx) => {
        const level = node.inputs.level !== undefined ? node.inputs.level : 50;
        const block = ctx.bbm.createBlock(`block_set_volume_${node.id}`);
        ctx.irBlocks[block.label] = block;
        block.instructions.push({ opcode: 'sys_call', operands: ['set_volume', level], astNodeId: node.id });
        block.instructions.push({ opcode: 'jump', operands: [ctx.exitLabel] });
        return block.label;
    },
    execute: (args) => {
        const level = args[0] as number;
        const db = level <= 0 ? -100 : 20 * Math.log10(level / 100);
        const activeTone = getActiveTone();
        if (activeTone?.Destination) {
            activeTone.Destination.volume.value = db;
        }
        return null;
    },
};
