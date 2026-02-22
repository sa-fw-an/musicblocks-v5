import { describe, it, expect, vi } from 'vitest';
import { Scheduler } from '@/core/scheduler';
import { Interpreter } from '@/core/interpreter';

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

    it('handles asymmetric polyphony yielding correctly', () => {
        const mockInterpreter = {
            executeSlice: vi.fn(),
            setBreakpoints: vi.fn()
        } as unknown as Interpreter;

        const scheduler = new Scheduler(mockInterpreter);

        scheduler.scheduleThread('threadA', 'main', 'b1');
        scheduler.scheduleThread('threadB', 'main', 'b1');

        vi.mocked(mockInterpreter.executeSlice)
            .mockReturnValueOnce({ status: 'YIELD_UNTIL_TIME', resumeTimeMs: 100 }) // threadA at 0
            .mockReturnValueOnce({ status: 'YIELD_UNTIL_TIME', resumeTimeMs: 50 })  // threadB at 0
            .mockReturnValueOnce({ status: 'THREAD_HALTED' })                       // threadB at 50
            .mockReturnValueOnce({ status: 'THREAD_HALTED' });                      // threadA at 100

        scheduler.pulse(0); // This executes both threads once

        expect((scheduler as any).waitQueue.length).toBe(2);
        expect((scheduler as any).runQueue.length).toBe(0);

        // Advance by 50ms
        scheduler.pulse(50);
        expect((scheduler as any).waitQueue.length).toBe(1); // threadA still waiting
        expect((scheduler as any).runQueue.length).toBe(0); // threadB executed and halted

        // Advance by 50ms more
        scheduler.pulse(50);
        expect((scheduler as any).waitQueue.length).toBe(0);
        expect((scheduler as any).runQueue.length).toBe(0); // both halted
    });

    it('processes runQueue correctly without advancing time in zero-delta pulses', () => {
        const mockInterpreter = {
            executeSlice: vi.fn(),
            setBreakpoints: vi.fn()
        } as unknown as Interpreter;

        const scheduler = new Scheduler(mockInterpreter);
        scheduler.scheduleThread('t1', 'main', 'b1');

        vi.mocked(mockInterpreter.executeSlice)
            .mockReturnValueOnce({ status: 'COMPLETED_SLICE' }) // t1 completes slice
            .mockReturnValueOnce({ status: 'YIELD_UNTIL_TIME', resumeTimeMs: 100 }); // t1 yields

        scheduler.pulse(0);
        expect((scheduler as any).runQueue.length).toBe(1); // re-enqueued because COMPLETED_SLICE
        expect((scheduler as any).waitQueue.length).toBe(0);

        scheduler.pulse(0);
        expect((scheduler as any).runQueue.length).toBe(0);
        expect((scheduler as any).waitQueue.length).toBe(1); // it yielded

        scheduler.pulse(0); // time blocked thread should not advance
        expect((scheduler as any).runQueue.length).toBe(0);
        expect((scheduler as any).waitQueue.length).toBe(1);
    });

    it('manages complex debugger state machine transitions (breakpoint, step, resume)', () => {
        const mockInterpreter = {
            executeSlice: vi.fn(),
            setBreakpoints: vi.fn()
        } as unknown as Interpreter;
        const scheduler = new Scheduler(mockInterpreter);

        scheduler.scheduleThread('t1', 'main', 'b1');

        // Add breakpoint and run until hit
        vi.mocked(mockInterpreter.executeSlice).mockReturnValueOnce({ status: 'HIT_BREAKPOINT', astNodeId: 'b_test' });
        scheduler.pulse(10);
        expect((scheduler as any).isPaused).toBe(true);

        // Step 3 times
        vi.mocked(mockInterpreter.executeSlice)
            .mockReturnValueOnce({ status: 'COMPLETED_SLICE' })
            .mockReturnValueOnce({ status: 'COMPLETED_SLICE' })
            .mockReturnValueOnce({ status: 'COMPLETED_SLICE' });

        scheduler.step();
        scheduler.step();
        scheduler.step();

        expect(mockInterpreter.executeSlice).toHaveBeenCalledTimes(4); // 1 break + 3 steps
        expect((scheduler as any).isPaused).toBe(true); // Should remain paused after stepping

        // Resume and finish
        vi.mocked(mockInterpreter.executeSlice).mockReturnValueOnce({ status: 'THREAD_HALTED' });
        scheduler.resume();
        expect((scheduler as any).isPaused).toBe(false);
        scheduler.pulse(10);

        expect((scheduler as any).runQueue.length).toBe(0);
        expect((scheduler as any).waitQueue.length).toBe(0);
        expect(mockInterpreter.executeSlice).toHaveBeenCalledTimes(5);
    });
});
