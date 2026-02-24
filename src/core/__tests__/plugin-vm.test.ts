import { describe, it, expect } from 'vitest';
import { Scheduler } from '@/core/scheduler';
import { Interpreter } from '@/core/interpreter';
import { Compiler } from '@/core/compiler';
import { Registry } from '@/core/registry/index';
import { CoreLogicPlugin } from '@/plugins/core_logic/index';
import { MusicBlocksPlugin } from '@/plugins/musicblocks';
import type { BlockNode } from '@/core/ast';

describe('Domain-Agnostic VM Architecture', () => {
    it('executes generic AST with domain-specific plugins correctly', async () => {
        // Setup global mock for the syscall
        (globalThis as any).__mockAudioEvents = [];

        // Mock Tone.js state and functions for headless Node environment
        const MockSynth = { triggerAttackRelease() { } };
        const MockTone = {
            context: { state: 'suspended' },
            start: () => { MockTone.context.state = 'running'; },
            PolySynth: class { toDestination() { return MockSynth; } },
            Synth: {},
            now: () => 0
        };
        (globalThis as any).__mockTone = MockTone;

        // 1. Setup Architecture
        const registry = new Registry();
        registry.registerPlugin(CoreLogicPlugin);
        registry.registerPlugin(MusicBlocksPlugin);

        // Initialize all plugins (sets up synth via ensureTone)
        await registry.initializeAll();

        const compiler = new Compiler(registry);

        // 2. Construct AST: START -> REPEAT(2) -> PLAY_NOTE("C4", 1)
        const startNode: BlockNode = {
            id: 'start_1',
            type: 'start',
            inputs: {},
            next: 'repeat_1'
        };

        const repeatNode: BlockNode = {
            id: 'repeat_1',
            type: 'repeat',
            inputs: { iterations: 2 },
            body: 'play_1'
        };

        const playNode: BlockNode = {
            id: 'play_1',
            type: 'play_note',
            inputs: { pitch: 'E4', beats: 1 } // 1 beat = 500ms
        };

        const blocks = {
            'start_1': startNode,
            'repeat_1': repeatNode,
            'play_1': playNode
        };

        // 3. Compile
        const program = compiler.compile([startNode], blocks);
        expect(program.functions['thread_start_1']).toBeDefined();

        // 4. Initialize Interpreter & Scheduler
        const interpreter = new Interpreter(program, registry);
        const scheduler = new Scheduler(interpreter);

        // Schedule the main thread
        const entryBlockId = program.functions['thread_start_1'].entryBlockId;
        scheduler.scheduleThread('thread_x', 'thread_start_1', entryBlockId);

        // 5. Run the Pulsing Engine
        let maxPulses = 100;
        let pulses = 0;

        // Run until both queues are empty or we hit max pulses
        while (pulses < maxPulses && ((scheduler as any).runQueue.length > 0 || (scheduler as any).waitQueue.length > 0)) {
            // Pulse the engine by 100ms at a time
            scheduler.pulse(100);
            pulses++;
        }

        // 6. Assertions
        const events = (globalThis as any).__mockAudioEvents;

        // REPEAT(2) means 2 notes should have been played
        expect(events.length).toBe(2);

        // The notes should be C4 and duration 500ms
        expect(events[0].pitch).toBe('E4');
        expect(events[0].durationMs).toBe(500);

        // The first note started at time 100 
        // (because the first tick pulses the time by 100ms before checking the runQueue)
        expect(events[0].time).toBe(100);

        // The second note should start strictly after the first note yielded (500ms delay)
        // Since we pulse by 100ms, the next execution frame handling the wake-up
        // will ideally be at time 600ms (100 + 500).
        expect(events[1].pitch).toBe('E4');
        expect(events[1].time).toBe(600);
    });

    it('executes dynamic variables and math operations correctly', () => {
        const registry = new Registry();
        registry.registerPlugin(CoreLogicPlugin);
        const compiler = new Compiler(registry);

        const startNode: BlockNode = {
            id: 'start_2',
            type: 'start',
            inputs: {},
            next: 'set_1'
        };

        const setNode: BlockNode = {
            id: 'set_1',
            type: 'set_var',
            inputs: { varName: 'myBeats', value: 1 },
            next: 'change_1'
        };

        const changeNode: BlockNode = {
            id: 'change_1',
            type: 'change_var',
            inputs: { varName: 'myBeats', amount: 2 }
        };

        const blocks = {
            'start_2': startNode,
            'set_1': setNode,
            'change_1': changeNode
        };

        const program = compiler.compile([startNode], blocks);
        const interpreter = new Interpreter(program, registry);
        const scheduler = new Scheduler(interpreter);

        let capturedContext: any;
        const originalExecuteSlice = interpreter.executeSlice.bind(interpreter);
        // @ts-ignore
        interpreter.executeSlice = (threadId, funcName, context, sliceSize, currentTimeMs) => {
            capturedContext = context;
            return originalExecuteSlice(threadId, funcName, context, sliceSize, currentTimeMs);
        };

        const entryBlockId = program.functions['thread_start_2'].entryBlockId;
        scheduler.scheduleThread('thread_test', 'thread_start_2', entryBlockId);

        scheduler.pulse(100);

        // Verify the symbol table memory
        expect(capturedContext.memory.query('myBeats')).toBe(3);
    });
});
