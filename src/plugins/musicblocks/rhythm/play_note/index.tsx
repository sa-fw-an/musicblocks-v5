import React from 'react';
import type { BlockDefinition } from '@/core/registry/types';
import { BlockShape } from '@/core/ui/BlockShape';
import { BlockInput } from '@/core/ui/BlockInput';
import { CATEGORY_COLORS } from '@/core/ui/constants';
import { ensureTone, getActiveTone, cleanupSynth, getSynth } from '@/plugins/musicblocks/tone-shared';

const COLOR = CATEGORY_COLORS.rhythm;
const NOTES = ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5'];

const PlayNoteUI: React.FC<{ node: any; isActive: boolean; isBreakpoint: boolean; isOver: boolean }> = ({
    node, isActive, isBreakpoint, isOver,
}) => (
    <BlockShape shape="twoArgBlock" color={COLOR} label="Play Note" argRows={2} isActive={isActive} isBreakpoint={isBreakpoint} isOver={isOver}>
        <BlockInput nodeId={node.id} field="pitch" type="select" label="pitch" options={NOTES} width={70} />
        <BlockInput nodeId={node.id} field="beats" type="text"   label="beats" width={60} />
    </BlockShape>
);

export const PlayNoteBlock: BlockDefinition = {
    type: 'play_note',
    label: 'Play Note',
    shape: 'twoArgBlock',
    category: 'rhythm',
    color: COLOR,
    args: [
        { name: 'pitch', type: 'note',   default: 'C4' },
        { name: 'beats', type: 'number', default: 1 },
    ],
    defaultInputs: { pitch: 'C4', beats: 1 },
    component: PlayNoteUI,
    onInitialize: ensureTone,
    onCleanup: cleanupSynth,
    compile: (node, ctx) => {
        const pitch    = node.inputs.pitch || 'C4';
        const duration = node.inputs.beats || 1;
        const block = ctx.bbm.createBlock(`block_play_note_${node.id}`);
        ctx.irBlocks[block.label] = block;
        block.instructions.push({ opcode: 'sys_call', operands: ['play_note', pitch, duration], astNodeId: node.id });
        block.instructions.push({ opcode: 'jump', operands: [ctx.exitLabel] });
        return block.label;
    },
    execute: (args, context, currentTimeMs) => {
        let pitch = args[0];
        const durationBeats = args[1] as number;
        const bpm = context.memory.query('_tempo') || 120;
        const durationMs = durationBeats * (60000 / bpm);

        const activeTone = getActiveTone();
        if (!activeTone) return null;

        if (activeTone.context.state !== 'running') activeTone.start();

        let s = getSynth();
        if (!s) return null;

        if (typeof pitch === 'number' && activeTone.Frequency) {
            pitch = activeTone.Frequency(pitch, 'midi').toNote();
        }

        s.triggerAttackRelease(pitch, `${durationBeats}n`, activeTone.now());
        (globalThis as any).__mockAudioEvents?.push({ pitch, durationMs, time: currentTimeMs });

        return { status: 'YIELD_UNTIL_TIME', resumeTimeMs: currentTimeMs + durationMs };
    },
};
