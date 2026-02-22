import { describe, it, expect, vi } from 'vitest';
import { Scheduler } from '../scheduler';
import { Interpreter } from '../interpreter';

describe('Scheduler', () => {
    it('manages run queue and wait queue successfully', () => {
        // Mock Interpreter
        const mockInterpreter = {
            executeSlice: vi.fn(),
            setBreakpoints: vi.fn()
        } as unknown as Interpreter;

        const scheduler = new Scheduler(mockInterpreter);

        // Schedule a thread
        scheduler.scheduleThread('t1', 'main', 'b1');
        expect((scheduler as any).runQueue.length).toBe(1);

        // Sequence 1: Yield until time
        vi.mocked(mockInterpreter.executeSlice).mockReturnValueOnce({ status: 'YIELD_UNTIL_TIME', resumeTimeMs: 100 });

        scheduler.pulse(50);
        expect((scheduler as any).runQueue.length).toBe(0);
        expect((scheduler as any).waitQueue.length).toBe(1);
        expect((scheduler as any).currentTimeMs).toBe(50);

        // Sequence 2: Pulse enough to wake up, but complete slice
        vi.mocked(mockInterpreter.executeSlice).mockReturnValueOnce({ status: 'COMPLETED_SLICE' });

        scheduler.pulse(60); // Time is now 110, wait queue triggers
        expect((scheduler as any).waitQueue.length).toBe(0);
        expect((scheduler as any).runQueue.length).toBe(1); // Enqueued due to complete slice

        // Sequence 3: Thread halted
        vi.mocked(mockInterpreter.executeSlice).mockReturnValueOnce({ status: 'THREAD_HALTED' });

        scheduler.pulse(10);
        expect((scheduler as any).runQueue.length).toBe(0); // Popped and halted
    });

    it('pause() prevents thread advancement on subsequent pulse calls', () => {
        const mockInterpreter = {
            executeSlice: vi.fn(),
            setBreakpoints: vi.fn()
        } as unknown as Interpreter;

        const scheduler = new Scheduler(mockInterpreter);
        scheduler.scheduleThread('t1', 'main', 'b1');

        scheduler.pause();
        scheduler.pulse(10);

        expect(mockInterpreter.executeSlice).not.toHaveBeenCalled();
    });

    it('step() advances exactly one instruction', () => {
        const mockInterpreter = {
            executeSlice: vi.fn(),
            setBreakpoints: vi.fn()
        } as unknown as Interpreter;

        const scheduler = new Scheduler(mockInterpreter);
        scheduler.scheduleThread('t1', 'main', 'b1');
        scheduler.pause();

        vi.mocked(mockInterpreter.executeSlice).mockReturnValueOnce({ status: 'COMPLETED_SLICE' });

        scheduler.step();

        // 0 pulse time, maxInstructions = 1
        expect(mockInterpreter.executeSlice).toHaveBeenCalledWith('t1', 'main', expect.anything(), 1, 0);
        expect((scheduler as any).isPaused).toBe(true);
    });

    it('setBreakpoints() triggers onBreakpointHit when execution hits marked node', () => {
        const mockInterpreter = {
            executeSlice: vi.fn(),
            setBreakpoints: vi.fn()
        } as unknown as Interpreter;

        const scheduler = new Scheduler(mockInterpreter);
        scheduler.scheduleThread('t1', 'main', 'b1');

        const hitCallback = vi.fn();
        scheduler.onBreakpointHit = hitCallback;

        // Mock the interpreter breaking
        vi.mocked(mockInterpreter.executeSlice).mockReturnValueOnce({ status: 'HIT_BREAKPOINT', astNodeId: 'b_test' });

        scheduler.pulse(10);

        expect(hitCallback).toHaveBeenCalledWith('b_test');
        expect((scheduler as any).isPaused).toBe(true);
        expect((scheduler as any).runQueue.length).toBe(1); // Pre-empted thread put back in queue to resume
    });
});
