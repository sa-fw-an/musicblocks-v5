import { useState } from 'react';
import { BlockTree } from '@/components/BlockTree';
import { Palette, PaletteBlock } from '@/components/Palette';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DndContext, DragOverlay, defaultDropAnimationSideEffects, useDroppable } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { BlockNode } from '@/core/ast';
import { useVM } from '@/hooks/useVM';

const TrashCan = () => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'trash-can',
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '80px',
        height: '80px',
        backgroundColor: isOver ? '#ffcdd2' : '#f8d7da',
        border: `3px dashed ${isOver ? '#d32f2f' : '#dc3545'}`,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        boxShadow: isOver ? '0 8px 16px rgba(220,53,69,0.3)' : '0 4px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.2s',
        zIndex: 100,
      }}
    >
      🗑️
    </div>
  );
};

function App() {
  const { blocks, rootBlocks, moveBlock, addBlock } = useWorkspaceStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { play, stop, pause, resume, step } = useVM();
  const isVMPaused = useWorkspaceStore(state => state.isVMPaused);

  const handlePlay = async () => {
    await play(rootBlocks);
  };

  const handleStop = () => {
    stop();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    const activeIdString = active.id as string;

    setActiveId(null);

    // Scenario 1: Dragging from Palette (Spawning new node)
    if (activeIdString.startsWith('palette-')) {
      if (over && over.id === 'trash-can') return; // Cancel spawn

      const type = active.data.current?.type as string;
      const defaultInputs = active.data.current?.defaultInputs || {};

      const newBlock: BlockNode = {
        id: `b${Date.now()}`,
        type,
        inputs: defaultInputs,
        x: active.rect.current.translated ? active.rect.current.translated.left - 250 : delta.x + 250,
        y: active.rect.current.translated ? active.rect.current.translated.top - 70 : delta.y
      };

      addBlock(newBlock);

      // Snap if dropped over a valid dropzone
      if (over && (over.id as string).startsWith('drop-')) {
        const dropId = (over.id as string).replace('drop-', '');
        useWorkspaceStore.getState().connectBlocks(dropId, newBlock.id);
      }
      return;
    }

    // Scenario 2: Moving existing block across the canvas
    if (activeIdString.startsWith('drag-')) {
      const rawDragId = activeIdString.replace('drag-', '');
      const block = blocks[rawDragId];

      if (!block) return;

      // Trash Can Drop
      if (over && over.id === 'trash-can') {
        useWorkspaceStore.getState().deleteBlock(rawDragId);
        return;
      }

      // Snapping to an existing Droppable Node
      if (over && (over.id as string).startsWith('drop-')) {
        const overIdStr = over.id as string;

        // Dropping into a REPEAT body
        if (overIdStr.startsWith('drop-body-')) {
          const rawDropId = overIdStr.replace('drop-body-', '');
          if (rawDropId !== rawDragId) {
            useWorkspaceStore.getState().detachBlock(rawDragId);
            useWorkspaceStore.getState().connectBlocks(rawDropId, rawDragId, 'body');
            return;
          }
        } else {
          // Standard next dropping
          const rawDropId = overIdStr.replace('drop-', '');
          if (rawDropId !== rawDragId) {
            useWorkspaceStore.getState().detachBlock(rawDragId);
            useWorkspaceStore.getState().connectBlocks(rawDropId, rawDragId, 'next');
            return; // done snapping
          }
        }
      }

      // Dropped onto empty Canvas (Free float update)
      useWorkspaceStore.getState().detachBlock(rawDragId);

      // Use exact translated coordinates of the ghost to place it where it was dropped
      const newX = active.rect.current.translated ? active.rect.current.translated.left - 250 : (block.x || 0) + delta.x;
      const newY = active.rect.current.translated ? active.rect.current.translated.top - 70 : (block.y || 0) + delta.y;
      moveBlock(rawDragId, newX, newY);
    }
  };

  // Render the overlay preview during dragging
  const renderDragOverlay = () => {
    if (!activeId) return null;

    // If it's a palette template being dragged
    if (activeId.startsWith('palette-')) {
      const type = activeId.replace('palette-', '');
      return <PaletteBlock type={type} defaultInputs={{}} isOverlay={true} />;
    }

    // If it's an existing block being dragged
    if (activeId.startsWith('drag-')) {
      const rawId = activeId.replace('drag-', '');
      const block = blocks[rawId];
      if (block) {
        return <BlockTree id={rawId} isRoot={true} isOverlay={true} />;
      }
    }

    return null;
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#343a40',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          fontWeight: 'bold',
          animation: 'fadeInOut 3s forwards'
        }}>
          {toastMessage}
        </div>
      )}

      <header style={{ padding: '1rem', backgroundColor: '#343a40', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Music Blocks Refined - Zustand + DnD</h1>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              useWorkspaceStore.getState().saveProject();
              showToast('💾 Project Saved Successfully!');
            }}
            style={{ padding: '6px 12px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            💾 Save
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              const data = localStorage.getItem('musicblocks-save');
              if (data) {
                useWorkspaceStore.getState().loadProject(data);
                showToast('📂 Project Loaded!');
              } else {
                showToast('⚠️ No save file found.');
              }
            }}
            style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            📂 Load
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              // Replace confirm with immediate clear for this polished version, 
              // or rely on the user visually seeing it clear.
              useWorkspaceStore.getState().clearWorkspace();
              showToast('🗑️ Workspace Cleared');
            }}
            style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            🗑️ Clear All
          </button>
          <div style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem', backgroundColor: '#495057', padding: '6px 8px', borderRadius: '6px' }}>
            <button
              onClick={handlePlay}
              style={{ padding: '6px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              title="Start or Restart execution"
            >
              ▶️ Play
            </button>
            <button
              onClick={isVMPaused ? resume : pause}
              style={{ padding: '6px 16px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              title={isVMPaused ? "Resume execution" : "Pause execution"}
            >
              {isVMPaused ? '▶️ Resume' : '⏸ Pause'}
            </button>
            <button
              onClick={step}
              disabled={!isVMPaused}
              style={{ padding: '6px 16px', backgroundColor: isVMPaused ? '#17a2b8' : '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: isVMPaused ? 'pointer' : 'not-allowed', fontWeight: 'bold', opacity: isVMPaused ? 1 : 0.6 }}
              title="Step forward one instruction"
            >
              ⏭ Step
            </button>
            <button
              onClick={handleStop}
              style={{ padding: '6px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              title="Stop execution completely"
            >
              ⏹ Stop
            </button>
          </div>
        </div>
      </header>

      {/* Main App Body with Sidebar and Canvas */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

          <Palette />

          {/* Main Canvas Area */}
          <main style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#f1f3f5' }}>
            {/* Grid background */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: 'linear-gradient(#e9ecef 1px, transparent 1px), linear-gradient(90deg, #e9ecef 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              pointerEvents: 'none' // Don't interfere with dragging
            }} />

            {/* Render all root blocks sitting on the canvas */}
            {rootBlocks.map((id) => {
              const block = blocks[id];
              if (!block) return null;
              return <BlockTree key={id} id={id} isRoot={true} />;
            })}

            <TrashCan />
          </main>

          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.4',
                },
              },
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
