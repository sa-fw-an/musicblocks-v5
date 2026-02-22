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

        // Assume 1 beat = 0.5 seconds (120 BPM) for a simple mapping
        const secondsPerBeat = 0.5;

        // Loop through events array and schedule
        for (const event of events) {
            if (event.type === 'note' && event.pitch && event.duration) {
                const startTimeInSeconds = event.timeOffset * secondsPerBeat;
                const durationInSeconds = event.duration * secondsPerBeat;

                // Schedule using Tone.Transport at the absolute time offset
                Tone.Transport.schedule((time) => {
                    this.synth.triggerAttackRelease(event.pitch!, durationInSeconds, time);
                }, startTimeInSeconds);
            }
        }

        // Start playback entirely independent of the main UI thread
        Tone.Transport.start();
    }
}
