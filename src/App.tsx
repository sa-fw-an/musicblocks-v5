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
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    const activeIdString = active.id as string;

    setActiveId(null);

    // If dragging from palette
    if (activeIdString.startsWith('palette-')) {
      // Create a new block
      const type = active.data.current?.type as string;
      const defaultInputs = active.data.current?.defaultInputs || {};

      const newBlock: BlockNode = {
        id: `b${Date.now()}`, // Unique ID
        type,
        inputs: defaultInputs,
        // Approximate drop coordinates against the main canvas bounding box by using the translated rect
        x: active.rect.current.translated ? active.rect.current.translated.left - 250 : delta.x + 250, // 250px is the palette width
        y: active.rect.current.translated ? active.rect.current.translated.top - 70 : delta.y // 70px approx header height
      };

      addBlock(newBlock);

      // Check if dropped over another block to snap it immediately
      if (over && over.id !== newBlock.id) {
        useWorkspaceStore.getState().connectBlocks(over.id as string, newBlock.id);
      }
      return;
    }

    // Moving an existing block
    const block = blocks[activeIdString];
    if (block) {
      if (over && over.id !== activeIdString) {
        // Snap!
        useWorkspaceStore.getState().connectBlocks(over.id as string, activeIdString);
      } else {
        // Free drop on the canvas
        const newX = (block.x || 0) + delta.x;
        const newY = (block.y || 0) + delta.y;
        moveBlock(activeIdString, newX, newY);
      }
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
