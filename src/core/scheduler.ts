import { ExecutionContext } from '@/core/memory';
import { Interpreter } from '@/core/interpreter';

export interface ThreadControlBlock {
    id: string;
    funcName: string;
    context: ExecutionContext;
}

export interface WaitQueueEntry {
    tcb: ThreadControlBlock;
    resumeTimeMs: number;
}

export class Scheduler {
    private interpreter: Interpreter;
    private runQueue: ThreadControlBlock[] = [];
    private waitQueue: WaitQueueEntry[] = [];
    private currentTimeMs: number = 0;

    constructor(interpreter: Interpreter) {
        this.interpreter = interpreter;
    }

    scheduleThread(threadId: string, funcName: string, entryBlockId: string) {
        const context = new ExecutionContext(threadId, entryBlockId);
        this.runQueue.push({ id: threadId, funcName, context });
    }

    pulse(deltaTimeMs: number) {
        this.currentTimeMs += deltaTimeMs;

        // 1. Check wait queue for unblocked threads
        for (let i = this.waitQueue.length - 1; i >= 0; i--) {
            if (this.currentTimeMs >= this.waitQueue[i].resumeTimeMs) {
                this.runQueue.push(this.waitQueue[i].tcb);
                this.waitQueue.splice(i, 1);
            }
        }

        // 2. Execute a slice for all threads in the run queue
        const activeThreadsCount = this.runQueue.length;
        for (let i = 0; i < activeThreadsCount; i++) {
            const tcb = this.runQueue.shift();
            if (!tcb) continue;

            const sliceSize = 10;
            const status = this.interpreter.executeSlice(tcb.id, tcb.funcName, tcb.context, sliceSize, this.currentTimeMs);

            if (status.status === 'COMPLETED_SLICE') {
                this.runQueue.push(tcb); // Add back to end of run queue
            } else if (status.status === 'YIELD_UNTIL_TIME') {
                this.waitQueue.push({ tcb, resumeTimeMs: status.resumeTimeMs });
            } else if (status.status === 'THREAD_HALTED') {
                // Do not re-enqueue
            }
        }
    }

    getActiveNodeIds(): string[] {
        const activeIds = new Set<string>();

        // Currently executing threads
        for (const tcb of this.runQueue) {
            if (tcb.context.currentAstNodeId) {
                activeIds.add(tcb.context.currentAstNodeId);
            }
        }

        // Threads waiting on sys_call duration (e.g., play_note)
        for (const entry of this.waitQueue) {
            if (entry.tcb.context.currentAstNodeId) {
                activeIds.add(entry.tcb.context.currentAstNodeId);
            }
        }

        return Array.from(activeIds);
    }

    getCurrentTime() {
        return this.currentTimeMs;
    }
}
