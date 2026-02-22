import { useRef, useCallback, useEffect } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Compiler } from '@/core/compiler';
import { Interpreter } from '@/core/interpreter';
import { Scheduler } from '@/core/scheduler';
import { PluginRegistry } from '@/core/plugin-registry';
import { MusicBlocksPlugin } from '@/plugins/musicblocks';
import type { BlockNode, BlockId } from '@/core/ast';

export function useVM() {
    const animationFrameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const schedulerRef = useRef<Scheduler | null>(null);

    const play = useCallback(async (rootBlockIds: BlockId[]) => {
        // Stop any existing loop
        stop();

        // Optional: Pre-warm Tone.js user gesture here if needed, but the plugin can also handle it.
        // It's safer to ensure AudioContext is started on the click handler boundary.
        const Tone = await import('tone');
        await Tone.start();

        const blocksObj = useWorkspaceStore.getState().blocks;

        // Convert the Zustand Block store object into AST BlockNode dictionary
        const blocks: Record<BlockId, BlockNode> = {};
        for (const id of Object.keys(blocksObj)) {
            const b = blocksObj[id];
            blocks[id] = {
                id: b.id,
                type: b.type,
                inputs: b.inputs || {},
                next: b.next,
                body: b.body
            };
        }

        const startNodes = rootBlockIds
            .map(id => blocks[id])
            .filter(node => node && node.type === 'start');

        if (startNodes.length === 0) {
            console.warn("No START blocks found");
            return;
        }

        // Initialize VM infrastructure
        const registry = new PluginRegistry();
        registry.register(MusicBlocksPlugin);

        const compiler = new Compiler(registry);
        const program = compiler.compile(startNodes, blocks);

        const interpreter = new Interpreter(program, registry);
        const scheduler = new Scheduler(interpreter);
        schedulerRef.current = scheduler;

        // Load all start threads
        for (const funcName of Object.keys(program.functions)) {
            const entryBlockId = program.functions[funcName].entryBlockId;
            scheduler.scheduleThread(`thread_${Math.random()}`, funcName, entryBlockId);
        }

        lastTimeRef.current = performance.now();

        // The Pulse Loop
        const loop = (time: number) => {
            const deltaTimeMs = time - lastTimeRef.current;
            lastTimeRef.current = time;

            if (schedulerRef.current) {
                schedulerRef.current.pulse(deltaTimeMs);

                // Track active blocks and avoid React re-renders unless changed
                const newActiveIds = schedulerRef.current.getActiveNodeIds();
                const currentActiveIds = useWorkspaceStore.getState().activeBlockIds;

                const changed = newActiveIds.length !== currentActiveIds.length ||
                    newActiveIds.some((id, i) => id !== currentActiveIds[i]);

                if (changed) {
                    useWorkspaceStore.getState().setActiveBlockIds(newActiveIds);
                }
            }

            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);
    }, []);

    const stop = useCallback(() => {
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        schedulerRef.current = null;

        // Clear Highlights
        useWorkspaceStore.getState().setActiveBlockIds([]);

        // Stop Tone.js transport/synths if needed, though they trigger linearly
        import('tone').then(() => {
            // Can add Tone.Transport.stop() here if we used it, but we are using triggerAttackRelease with Tone.now()
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return stop;
    }, [stop]);

    return { play, stop };
}
