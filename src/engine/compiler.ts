import type { BlockNode } from '@/engine/ast';

export interface AudioEvent {
    timeOffset: number; // Time in beats from the start sequence
    type: 'note' | 'rest';
    pitch?: string;
    duration?: number;
}

export class Compiler {
    compile(startNode: BlockNode): AudioEvent[] {
        const events: AudioEvent[] = [];
        let currentTime = 0;

        let currentNode: BlockNode | undefined = startNode;

        while (currentNode) {
            if (currentNode.type === 'play_note') {
                const pitch = currentNode.inputs['pitch'] as string | undefined;
                const beats = (currentNode.inputs['beats'] as number) || 1;
                events.push({
                    timeOffset: currentTime,
                    type: 'note',
                    pitch,
                    duration: beats,
                });
                currentTime += beats;
            } else if (currentNode.type === 'rest') {
                const beats = (currentNode.inputs['beats'] as number) || 1;
                // Do not push an event, just advance the time counter
                currentTime += beats;
            }

            currentNode = currentNode.next;
        }

        return events;
    }
}
