import type { IRInstruction } from '@/core/ir';
import type { BlockNode } from '@/core/ast';
import type { ExecutionContext } from '@/core/memory';
import type { ExecutionStatus } from '@/core/interpreter';

export type BlockCompilerFunction = (node: BlockNode, instructions: IRInstruction[], compilerCtx: any) => void;
export type SyscallFunction = (args: any[], context: ExecutionContext, currentTimeMs: number) => ExecutionStatus | null;

export interface CorePlugin {
    name: string;
    blockCompilers: Record<string, BlockCompilerFunction>;
    syscalls: Record<string, SyscallFunction>;
}

export class PluginRegistry {
    private plugins: Map<string, CorePlugin> = new Map();
    private blockCompilers: Map<string, BlockCompilerFunction> = new Map();
    private syscalls: Map<string, SyscallFunction> = new Map();

    register(plugin: CorePlugin) {
        this.plugins.set(plugin.name, plugin);
        for (const [blockType, compilerFn] of Object.entries(plugin.blockCompilers)) {
            this.blockCompilers.set(blockType, compilerFn);
        }
        for (const [syscallName, syscallFn] of Object.entries(plugin.syscalls)) {
            this.syscalls.set(syscallName, syscallFn);
        }
    }

    getBlockCompiler(blockType: string): BlockCompilerFunction | undefined {
        return this.blockCompilers.get(blockType);
    }

    getSyscall(syscallName: string): SyscallFunction | undefined {
        return this.syscalls.get(syscallName);
    }
}
