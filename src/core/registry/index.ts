import type { BlockDefinition, PluginModule, SyscallFunction } from '@/core/registry/types';

export class Registry {
    private blocks: Map<string, BlockDefinition> = new Map();
    private plugins: Map<string, PluginModule> = new Map();

    registerPlugin(plugin: PluginModule) {
        this.plugins.set(plugin.name, plugin);
        for (const def of plugin.blocks) {
            this.blocks.set(def.type, def);
        }
    }

    getBlock(type: string): BlockDefinition | undefined {
        return this.blocks.get(type);
    }

    getAllBlocks(): BlockDefinition[] {
        return Array.from(this.blocks.values());
    }

    getBlocksByCategory(category: string): BlockDefinition[] {
        return Array.from(this.blocks.values()).filter(b => b.category === category);
    }

    getCategories(): string[] {
        const cats = new Set<string>();
        for (const def of this.blocks.values()) {
            cats.add(def.category);
        }
        return Array.from(cats);
    }

    /** Legacy compat: get execute function by syscall name (= block type) */
    getSyscall(name: string): SyscallFunction | undefined {
        return this.blocks.get(name)?.execute;
    }

    async initializeAll() {
        for (const plugin of this.plugins.values()) {
            if (plugin.onInitialize) await plugin.onInitialize();
        }
        for (const def of this.blocks.values()) {
            if (def.onInitialize) await def.onInitialize();
        }
    }

    async cleanupAll() {
        for (const plugin of this.plugins.values()) {
            if (plugin.onCleanup) await plugin.onCleanup();
        }
        for (const def of this.blocks.values()) {
            if (def.onCleanup) await def.onCleanup();
        }
    }
}
