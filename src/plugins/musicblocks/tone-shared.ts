// Shared Tone.js state for all musicblocks
let ToneMod: typeof import('tone') | null = null;
let synth: any = null;

export function getSynth(): any {
    return (globalThis as any).__mockSynth || synth;
}

export async function ensureTone() {
    if (!ToneMod) {
        ToneMod = await import('tone');
    }
    const activeTone = (globalThis as any).__mockTone || ToneMod;
    if (activeTone.context.state !== 'running') {
        await activeTone.start();
    }
    if (!synth) {
        synth = new activeTone.PolySynth(activeTone.Synth).toDestination();
    }
    return activeTone;
}

export function getActiveTone() {
    return (globalThis as any).__mockTone || ToneMod;
}

export function cleanupSynth() {
    if (synth) {
        synth.releaseAll();
        synth = null;
    }
}
