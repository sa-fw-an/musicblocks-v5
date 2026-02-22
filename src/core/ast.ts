export type BlockId = string;

export interface BlockNode {
    id: BlockId;
    type: string;
    inputs: Record<string, any>;
    next?: BlockId;
    body?: BlockId;
    x?: number;
    y?: number;
}
