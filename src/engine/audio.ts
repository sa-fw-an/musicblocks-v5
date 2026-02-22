import * as Tone from 'tone';
import type { AudioEvent } from '@/engine/compiler';

export class AudioEngine {
    private synth: Tone.PolySynth;

    constructor() {
        // Initialize a basic synthesizer and connect to destination (speakers)
        this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
    }

    async play(events: AudioEvent[]) {
        // Crucial: Must await Tone.start() for AudioContext user-gesture requirement
        await Tone.start();

        // Stop and clear any existing Transport events
        Tone.Transport.stop();
        Tone.Transport.cancel();

        // Loop through events array and schedule
        for (const event of events) {
            if (event.type === 'note' && event.pitch && event.duration !== undefined) {
                // Schedule using Tone.Transport at the absolute time offset (already in seconds)
                Tone.Transport.schedule((time) => {
                    this.synth.triggerAttackRelease(event.pitch!, event.duration!, time);
                }, event.time);
            }
        }

        // Start playback entirely independent of the main UI thread
        Tone.Transport.start();
    }
}
