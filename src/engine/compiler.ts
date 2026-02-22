import type { BlockNode, BlockId } from './ast';

export interface AudioEvent {
    time: number; // in seconds
    type: 'note' | 'rest';
    pitch?: string;
    duration?: string; // e.g., '1n' or '0.5'
}

export class Compiler {
    compile(startNode: BlockNode, blocks: Record<BlockId, BlockNode>): AudioEvent[] {
        return this._compileInner(startNode, blocks, 0).events;
    }

    private _compileInner(startNode: BlockNode, blocks: Record<BlockId, BlockNode>, startTime: number): { events: AudioEvent[], endTime: number } {
        const events: AudioEvent[] = [];
        let currentTime = startTime;

        let current: BlockNode | undefined = startNode;

        while (current) {
            if (current.type === 'play_note') {
                const pitch = (current.inputs.pitch as string) || 'C4';
                const beats = (current.inputs.beats as number) || 1;

                events.push({
                    time: currentTime,
                    type: 'note',
                    pitch,
                    duration: `${beats}n`,
                });

                // Calculate duration in seconds (assuming 120 BPM for now, where 1 beat = 0.5s)
                currentTime += beats * 0.5;

            } else if (current.type === 'rest') {
                const beats = (current.inputs.beats as number) || 1;
                currentTime += beats * 0.5;
            } else if (current.type === 'repeat') {
                const iterations = (current.inputs.iterations as number) || 2;
                if (current.body && blocks[current.body]) {
                    const bodyStartNode = blocks[current.body];
                    for (let i = 0; i < iterations; i++) {
                        const result = this._compileInner(bodyStartNode, blocks, currentTime);
                        events.push(...result.events);
                        currentTime = result.endTime;
                    }
                }
            }

            // Move to the next block in the chain by looking up its ID in the flat dictionary
            current = current.next ? blocks[current.next] : undefined;
        }

        return { events, endTime: currentTime };
    }
}
