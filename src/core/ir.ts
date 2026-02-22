export type IROpcode = 'sym_declare' | 'sym_assign' | 'sym_query' | 'compare_jump' | 'jump' | 'sys_call' | 'yield' | 'math_add' | 'store' | 'math_random';

export interface IRInstruction {
    opcode: IROpcode;
    operands: any[];
    astNodeId?: string;
}

export interface IRBasicBlock {
    label: string;
    instructions: IRInstruction[];
}

export interface IRFunction {
    name: string;
    blocks: Record<string, IRBasicBlock>;
    entryBlockId: string;
}

export interface IRProgram {
    functions: Record<string, IRFunction>;
}
