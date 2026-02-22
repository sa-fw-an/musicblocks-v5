export class SymbolTable {
    private scopes: Record<string, any>[] = [{}];

    pushScope() {
        this.scopes.push({});
    }

    popScope() {
        if (this.scopes.length > 1) {
            this.scopes.pop();
        }
    }

    declare(name: string, value: any) {
        this.scopes[this.scopes.length - 1][name] = value;
    }

    assign(name: string, value: any) {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (name in this.scopes[i]) {
                this.scopes[i][name] = value;
                return;
            }
        }
        this.declare(name, value);
    }

    query(name: string): any {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (name in this.scopes[i]) {
                return this.scopes[i][name];
            }
        }
        return undefined;
    }
}

export class ExecutionContext {
    public threadId: string;
    public memory: SymbolTable;
    public instructionPointer: number = 0;
    public currentBlockId: string;
    public currentAstNodeId?: string;

    constructor(threadId: string, entryBlockId: string) {
        this.threadId = threadId;
        this.memory = new SymbolTable();
        this.currentBlockId = entryBlockId;
    }
}
