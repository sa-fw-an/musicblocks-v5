import type React from 'react';
import type { BlockNode } from '@/core/ast';
import type { IRBasicBlock } from '@/core/ir';
import type { ExecutionContext } from '@/core/memory';
import type { ExecutionStatus } from '@/core/interpreter';
import type { BasicBlockManager } from '@/core/compiler';

// ─── Compiler context passed to each block's compile() ───────────────────────

export interface BlockCompileCtx {
    exitLabel: string;
    bbm: BasicBlockManager;
    irBlocks: Record<string, IRBasicBlock>;
    /** Recursively compile a chain of blocks; returns entry label of that chain */
    compileChain: (nodeId: string | undefined, exitLabel: string) => string;
    /** The full block dictionary for the current thread */
    blocks: Record<string, BlockNode>;
}

// ─── Per-block definition ─────────────────────────────────────────────────────

export type BlockShape = 'stack' | 'hat' | 'clamp' | 'value' | 'boolean';

export interface ArgSpec {
    name: string;
    type: 'number' | 'string' | 'note' | 'boolean' | 'select';
    default: any;
    options?: string[]; // for select
}

export interface BlockUIProps {
    node: BlockNode;
    isActive: boolean;
    isBreakpoint: boolean;
    isOver: boolean;
    isBodyOver?: boolean;
}

export interface BlockDefinition {
    type: string;
    label: string;
    shape: BlockShape;
    category: string;
    color: string;
    args?: ArgSpec[];
    defaultInputs: Record<string, any>;
    /** React component that renders this block */
    component: React.FC<BlockUIProps>;
    /** Compile this block node into IR; returns the entry label */
    compile: (node: BlockNode, ctx: BlockCompileCtx) => string;
    /** Execute the sys_call for this block at runtime */
    execute?: (args: any[], context: ExecutionContext, currentTimeMs: number) => ExecutionStatus | null;
    onInitialize?: () => Promise<void> | void;
    onCleanup?: () => Promise<void> | void;
}

// ─── Plugin module ────────────────────────────────────────────────────────────

export interface PluginModule {
    name: string;
    blocks: BlockDefinition[];
    onInitialize?: () => Promise<void> | void;
    onCleanup?: () => Promise<void> | void;
}

// ─── Legacy compatibility (for PluginRegistry drop-in) ───────────────────────
export type SyscallFunction = (args: any[], context: ExecutionContext, currentTimeMs: number) => ExecutionStatus | null;
