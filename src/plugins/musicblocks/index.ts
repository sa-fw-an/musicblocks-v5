import type { CorePlugin } from '@/core/plugin-registry';
import * as Tone from 'tone';

let synth: Tone.PolySynth | null = null;

export const MusicBlocksPlugin: CorePlugin = {
    name: 'MusicBlocks',
    blockCompilers: {
        'play_note': (node, instructions) => {
            const pitch = node.inputs.pitch || 'C4';
            const duration = node.inputs.beats || 1;
            instructions.push({
                opcode: 'sys_call',
                operands: ['playNote', pitch, duration]
            });
        }
    },
    syscalls: {
        'playNote': (args, _context, currentTimeMs) => {
            const pitch = args[0] as string;
            const durationBeats = args[1] as number;

            // 1 beat = 500ms for testing this domain-specific plugin
            const durationMs = durationBeats * 500;

            // Initialize audio on first play
            // Use mocked Tone for unit tests if it exists
            const activeTone = (globalThis as any).__mockTone || Tone;

            if (activeTone.context.state !== 'running') {
                activeTone.start();
            }

            if (!synth) {
                synth = new activeTone.PolySynth(activeTone.Synth).toDestination();
            }

            // Trigger the note immediately using Tone.now() since the scheduler acts as our timing transport
            synth!.triggerAttackRelease(pitch, `${durationBeats}n`, activeTone.now());

            // Provide a side channel array to test execution
            (globalThis as any).__mockAudioEvents?.push({ pitch, durationMs, time: currentTimeMs });

            return { status: 'YIELD_UNTIL_TIME', resumeTimeMs: currentTimeMs + durationMs };
        }
    }
};
