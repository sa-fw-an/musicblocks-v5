import { useState } from 'react';
import { BlockTree } from '@/components/BlockTree';
import { Palette } from '@/components/palette/Palette';
import { Header } from '@/components/Header';
import { Canvas } from '@/components/Canvas';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { globalRegistry } from '@/main-registry';
import { DndContext, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { BlockNode } from '@/core/ast';
import { PaletteItem } from '@/components/palette/BlockListPanel';

function App() {
    const { blocks } = useWorkspaceStore();
    const [activeId, setActiveId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over, delta } = event;
        const activeIdString = active.id as string;
        setActiveId(null);

        // Scenario 1: Dragging from Palette (spawning new node)
        if (activeIdString.startsWith('palette-')) {
            if (over && over.id === 'trash-can') return;

            const type = active.data.current?.type as string;
            const def = globalRegistry.getBlock(type);
            const defaultInputs = def?.defaultInputs ?? active.data.current?.defaultInputs ?? {};

            const newBlock: BlockNode = {
                id: `b${Date.now()}`,
                type,
                inputs: { ...defaultInputs },
                x: active.rect.current.translated ? active.rect.current.translated.left - 312 : delta.x + 312,
                y: active.rect.current.translated ? active.rect.current.translated.top - 52 : delta.y,
            };

            useWorkspaceStore.getState().addBlock(newBlock);

            if (over) {
                const overId = over.id as string;
                if (overId.startsWith('drop-body-')) {
                    const parentId = overId.replace('drop-body-', '');
                    useWorkspaceStore.getState().connectBlocks(parentId, newBlock.id, 'body');
                } else if (overId.startsWith('drop-')) {
                    const parentId = overId.replace('drop-', '');
                    useWorkspaceStore.getState().connectBlocks(parentId, newBlock.id, 'next');
                }
            }
            return;
        }

        // Scenario 2: Moving existing block across the canvas
        if (activeIdString.startsWith('drag-')) {
            const rawDragId = activeIdString.replace('drag-', '');
            const block = blocks[rawDragId];
            if (!block) return;

            if (over && over.id === 'trash-can') {
                useWorkspaceStore.getState().deleteBlock(rawDragId);
                return;
            }

            if (over && (over.id as string).startsWith('drop-')) {
                const overIdStr = over.id as string;

                if (overIdStr.startsWith('drop-body-')) {
                    const rawDropId = overIdStr.replace('drop-body-', '');
                    if (rawDropId !== rawDragId) {
                        useWorkspaceStore.getState().detachBlock(rawDragId);
                        useWorkspaceStore.getState().connectBlocks(rawDropId, rawDragId, 'body');
                        return;
                    }
                } else {
                    const rawDropId = overIdStr.replace('drop-', '');
                    if (rawDropId !== rawDragId) {
                        useWorkspaceStore.getState().detachBlock(rawDragId);
                        useWorkspaceStore.getState().connectBlocks(rawDropId, rawDragId, 'next');
                        return;
                    }
                }
            }

            // Free float on canvas
            useWorkspaceStore.getState().detachBlock(rawDragId);
            const newX = active.rect.current.translated
                ? active.rect.current.translated.left - 312
                : (block.x || 0) + delta.x;
            const newY = active.rect.current.translated
                ? active.rect.current.translated.top - 52
                : (block.y || 0) + delta.y;
            useWorkspaceStore.getState().moveBlock(rawDragId, newX, newY);
        }
    };

    const renderDragOverlay = () => {
        if (!activeId) return null;

        if (activeId.startsWith('palette-')) {
            const type = activeId.replace('palette-', '');
            const def = globalRegistry.getBlock(type);
            if (def) return <PaletteItem def={def} isOverlay={true} />;
        }

        if (activeId.startsWith('drag-')) {
            const rawId = activeId.replace('drag-', '');
            if (blocks[rawId]) {
                return <BlockTree id={rawId} isRoot={true} isOverlay={true} />;
            }
        }

        return null;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {toastMessage && (
                <div className="toast">{toastMessage}</div>
            )}

            <Header onToast={showToast} />

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <Palette />
                    <Canvas />

                    <DragOverlay dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({
                            styles: { active: { opacity: '0.4' } },
                        }),
                    }}>
                        {renderDragOverlay()}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}

export default App;
