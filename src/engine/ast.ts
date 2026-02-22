export type BlockId = string;

export type PitchValue = string; // e.g. 'C4'
export type RhythmValue = number; // in beats, e.g. 1
export type FractionValue = { numerator: number; denominator: number }; // Output of fraction block

export interface BlockNode {
    id: BlockId;
    type: string;
    // e.g., 'start', 'play_note', 'repeat', 'rest', 'setTempo'

    inputs: Record<string, string | number | undefined>;

    next?: BlockId;

    // Workspace UI properties
    x?: number;
    y?: number;
}
