import { useState } from 'react';
import { Compiler } from '@/engine/compiler';
import { AudioEngine } from '@/engine/audio';
import { BlockTree } from '@/components/BlockTree';
import { Palette, PaletteBlock } from '@/components/Palette';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DndContext, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { BlockNode } from '@/engine/ast';

// Single instance of engine
const engine = new AudioEngine();
const compiler = new Compiler();

function App() {
  const { blocks, rootBlocks, moveBlock, addBlock } = useWorkspaceStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const handlePlay = async () => {
    // Compile all 'start' blocks that exist as independent root sequences
    const startBlocks = rootBlocks
      .map(id => blocks[id])
      .filter(b => b?.type === 'start');

    if (startBlocks.length === 0) return;

    // Compile each start block tree into the flat array of events independently 
    // They will all start at time 0 so they play concurrently
    const allEvents = startBlocks.flatMap(startNode => compiler.compile(startNode, blocks));

    // Tell the audio engine to schedule and play the events
    await engine.play(allEvents);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);

    // Immediate Detachment Rule: If we are dragging an actual block off the canvas (not a palette spawner)
    const activeIdString = event.active.id as string;
    if (activeIdString.startsWith('drag-')) {
      const rawId = activeIdString.replace('drag-', '');
      useWorkspaceStore.getState().detachBlock(rawId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    const activeIdString = active.id as string;

    setActiveId(null);

    // Scenario 1: Dragging from Palette (Spawning new node)
    if (activeIdString.startsWith('palette-')) {
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

      // Snapping to an existing Droppable Node
      if (over && (over.id as string).startsWith('drop-')) {
        const rawDropId = (over.id as string).replace('drop-', '');

        // Do not connect to self
        if (rawDropId !== rawDragId) {
          useWorkspaceStore.getState().connectBlocks(rawDropId, rawDragId);
          return;
        }
      }

      // Dropped onto empty Canvas (Free float update)
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
    const block = blocks[activeId];
    if (block) {
      return <BlockTree id={activeId} isRoot={true} isOverlay={true} />;
    }

    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '1rem', backgroundColor: '#343a40', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Music Blocks Refined - Zustand + DnD</h1>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handlePlay}
            style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ▶️ Run Headless Test
          </button>
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
