import { useState } from 'react';
import { Compiler } from '@/engine/compiler';
import { AudioEngine } from '@/engine/audio';
import { BlockTree } from '@/components/BlockTree';
import { Palette } from '@/components/Palette';
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
    // For now, assume the first root block is the start of the sequence we want to play
    if (rootBlocks.length === 0) return;

    // Find the 'start' block in rootBlocks
    const startNodeId = rootBlocks.find(id => blocks[id]?.type === 'start');
    const startNode = startNodeId ? blocks[startNodeId] : null;

    if (!startNode) return;

    // Compile AST into a flat array of events
    const events = compiler.compile(startNode);
    // Tell the audio engine to schedule and play the events
    await engine.play(events);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
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
        // Since we drop on the flex container, the coordinates are relative to the screen. 
        // For a robust implementation we'd need a real ref to the canvas to calculate bounding rects.
        // For now, an approximation to prove it works:
        x: delta.x + 250, // 250px is the palette width
        y: delta.y
      };

      addBlock(newBlock);
      return;
    }

    // Moving an existing block
    const block = blocks[activeIdString];
    if (block) {
      const newX = (block.x || 0) + delta.x;
      const newY = (block.y || 0) + delta.y;
      moveBlock(activeIdString, newX, newY);
    }
  };

  // Render the overlay preview during dragging
  const renderDragOverlay = () => {
    if (!activeId) return null;

    // If it's a palette template being dragged
    if (activeId.startsWith('palette-')) {
      const type = activeId.replace('palette-', '');
      // Create a temporary mock node just for visual rendering in the overlay
      const mockNode: BlockNode = {
        id: 'overlay-temp',
        type,
        inputs: {},
      };
      return <BlockTree node={mockNode} isRoot={true} />;
    }

    // If it's an existing block being dragged
    const block = blocks[activeId];
    if (block) {
      return <BlockTree node={block} isRoot={true} />;
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
              // Don't render the block in its original spot while it's actively being dragged
              if (!block || activeId === id) return null;
              return <BlockTree key={id} node={block} isRoot={true} />;
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
