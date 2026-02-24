import React from 'react';
import { Play, Pause, SkipForward, Square, Save, FolderOpen, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useVM } from '@/hooks/useVM';

interface HeaderProps {
    onToast: (msg: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToast }) => {
    const { play, stop, pause, resume, step } = useVM();
    const isVMPaused = useWorkspaceStore(state => state.isVMPaused);
    const rootBlocks = useWorkspaceStore(state => state.rootBlocks);

    const handlePlay = async () => {
        await play(rootBlocks);
    };

    const handleStop = () => {
        stop();
    };

    const handleSave = (e: React.MouseEvent) => {
        e.preventDefault();
        useWorkspaceStore.getState().saveProject();
        onToast('Project saved');
    };

    const handleLoad = (e: React.MouseEvent) => {
        e.preventDefault();
        const data = localStorage.getItem('musicblocks-save');
        if (data) {
            useWorkspaceStore.getState().loadProject(data);
            onToast('Project loaded');
        } else {
            onToast('No save file found');
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.preventDefault();
        useWorkspaceStore.getState().clearWorkspace();
        onToast('Workspace cleared');
    };

    return (
        <header className="app-header">
            <div className="app-header__mascot">
                <img src="/mouse-mascot.svg" alt="Music Blocks mascot" width={28} height={28} />
            </div>
            <span className="app-header__title">Music Blocks</span>

            <div className="app-header__btn-group">
                <button className="app-header__btn app-header__btn--save" onClick={handleSave} title="Save project">
                    <Save size={14} />
                    Save
                </button>
                <button className="app-header__btn app-header__btn--load" onClick={handleLoad} title="Load project">
                    <FolderOpen size={14} />
                    Load
                </button>
                <button className="app-header__btn app-header__btn--clear" onClick={handleClear} title="Clear workspace">
                    <Trash2 size={14} />
                    Clear
                </button>

                <div className="app-header__divider" />

                <button className="app-header__btn app-header__btn--play" onClick={handlePlay} title="Play">
                    <Play size={14} />
                    Play
                </button>
                <button
                    className={`app-header__btn ${isVMPaused ? 'app-header__btn--play' : 'app-header__btn--pause'}`}
                    onClick={isVMPaused ? resume : pause}
                    title={isVMPaused ? 'Resume' : 'Pause'}
                >
                    <Pause size={14} />
                    {isVMPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                    className="app-header__btn app-header__btn--step"
                    onClick={step}
                    disabled={!isVMPaused}
                    title="Step"
                >
                    <SkipForward size={14} />
                    Step
                </button>
                <button className="app-header__btn app-header__btn--stop" onClick={handleStop} title="Stop">
                    <Square size={14} />
                    Stop
                </button>
            </div>
        </header>
    );
};
