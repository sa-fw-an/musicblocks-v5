import { describe, it, expect } from 'vitest';
import { SymbolTable, ExecutionContext } from '../memory';

describe('Memory Hierarchy', () => {
    describe('SymbolTable', () => {
        it('declares and queries variables in the current scope', () => {
            const mem = new SymbolTable();
            mem.declare('x', 10);
            expect(mem.query('x')).toBe(10);
        });

        it('assigns to existing variable in current scope', () => {
            const mem = new SymbolTable();
            mem.declare('x', 10);
            mem.assign('x', 20);
            expect(mem.query('x')).toBe(20);
        });

        it('handles nested scopes and shadowing', () => {
            const mem = new SymbolTable();
            mem.declare('x', 10);

            mem.pushScope();
            expect(mem.query('x')).toBe(10); // Inherits from parent

            mem.declare('x', 20); // Shadow
            expect(mem.query('x')).toBe(20);

            mem.popScope();
            expect(mem.query('x')).toBe(10); // Back to parent
        });

        it('assigns to parent scope if not in current', () => {
            const mem = new SymbolTable();
            mem.declare('x', 10);

            mem.pushScope();
            mem.assign('x', 50); // Modifies parent's x

            mem.popScope();
            expect(mem.query('x')).toBe(50);
        });

        it('auto-declares on assign if variable does not exist', () => {
            const mem = new SymbolTable();
            mem.assign('y', 100);
            expect(mem.query('y')).toBe(100);
        });
    });

    describe('ExecutionContext', () => {
        it('initializes correctly', () => {
            const ctx = new ExecutionContext('t1', 'entry_1');
            expect(ctx.threadId).toBe('t1');
            expect(ctx.currentBlockId).toBe('entry_1');
            expect(ctx.instructionPointer).toBe(0);
            expect(ctx.memory).toBeInstanceOf(SymbolTable);
        });
    });
});
