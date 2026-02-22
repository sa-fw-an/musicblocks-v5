import type { CorePlugin } from '@/core/plugin-registry';

let ToneMod: typeof import('tone') | null = null;
let synth: any = null;

export const MusicBlocksPlugin: CorePlugin = {
    name: 'MusicBlocks',
    onInitialize: async () => {
        if (!ToneMod) {
            ToneMod = await import('tone');
        }
        // Unit tests mock
        const activeTone = (globalThis as any).__mockTone || ToneMod;

        if (activeTone.context.state !== 'running') {
            await activeTone.start();
        }
        if (!synth) {
            synth = new activeTone.PolySynth(activeTone.Synth).toDestination();
        }
    },
    onCleanup: async () => {
        if (synth) {
            synth.releaseAll();
            // Since we lazy load tone and want things fresh, we could optionally disconnect/dispose but releaseAll is safe enough for stop
        }
    },
    blockCompilers: {
        'play_note': (node, instructions) => {
            const pitch = node.inputs.pitch || 'C4';
            const duration = node.inputs.beats || 1;
            instructions.push({
                opcode: 'sys_call',
                operands: ['playNote', pitch, duration],
                astNodeId: node.id
            });
        },
        'rest': (node, instructions) => {
            const duration = node.inputs.beats || 1;
            instructions.push({
                opcode: 'sys_call',
                operands: ['rest', duration],
                astNodeId: node.id
            });
        },
        'set_tempo': (node, instructions) => {
            const bpm = node.inputs.bpm || 120;
            instructions.push({ opcode: 'sys_call', operands: ['setTempo', bpm], astNodeId: node.id });
        },
        'set_volume': (node, instructions) => {
            const level = node.inputs.level !== undefined ? node.inputs.level : 50;
            instructions.push({ opcode: 'sys_call', operands: ['setVolume', level], astNodeId: node.id });
        },
        'print': (node, instructions) => {
            const message = node.inputs.message || '';
            instructions.push({ opcode: 'sys_call', operands: ['print', message], astNodeId: node.id });
        }
    },
    syscalls: {
        'setTempo': (args, context) => {
            const bpm = args[0] as number;
            context.memory.assign('_tempo', bpm);
            return null;
        },
        'setVolume': (args) => {
            const level = args[0] as number;
            // 0-100 to decibels approximation
            const db = level <= 0 ? -100 : 20 * Math.log10(level / 100);
            if (synth) {
                const activeTone = (globalThis as any).__mockTone || ToneMod;
                activeTone.Destination.volume.value = db;
            }
            return null;
        },
        'print': (args) => {
            console.log("PRINT BLOCK:", args[0]);
            return null;
        },
        'rest': (args, context, currentTimeMs) => {
            const durationBeats = args[0] as number;
            const bpm = context.memory.query('_tempo') || 120;
            const durationMs = durationBeats * (60000 / bpm);
            return { status: 'YIELD_UNTIL_TIME', resumeTimeMs: currentTimeMs + durationMs };
        },
        'playNote': (args, context, currentTimeMs) => {
            let pitch = args[0];
            const durationBeats = args[1] as number;

            const bpm = context.memory.query('_tempo') || 120;
            const durationMs = durationBeats * (60000 / bpm);

            const activeTone = (globalThis as any).__mockTone || ToneMod;

            if (activeTone.context.state !== 'running') {
                activeTone.start();
            }

            if (!synth) {
                synth = new activeTone.PolySynth(activeTone.Synth).toDestination();
            }

            // MIDI translation if pitch is a number
            if (typeof pitch === 'number' && activeTone.Frequency) {
                pitch = activeTone.Frequency(pitch, "midi").toNote();
            }

            synth!.triggerAttackRelease(pitch, `${durationBeats}n`, activeTone.now());

            (globalThis as any).__mockAudioEvents?.push({ pitch, durationMs, time: currentTimeMs });

            return { status: 'YIELD_UNTIL_TIME', resumeTimeMs: currentTimeMs + durationMs };
        }
    }
};
