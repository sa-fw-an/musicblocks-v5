import React from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface BlockInputProps {
    nodeId: string;
    field: string;
    type: 'number' | 'text' | 'select';
    label: string;
    options?: string[];
    min?: number;
    max?: number;
    width?: number;
}

export const BlockInput: React.FC<BlockInputProps> = ({
    nodeId,
    field,
    type,
    label,
    options,
    min,
    max,
    width = 70,
}) => {
    const value = useWorkspaceStore(state => state.blocks[nodeId]?.inputs[field]);

    const handleChange = (val: any) => {
        useWorkspaceStore.getState().updateBlockInput(nodeId, field, val);
    };

    const inputStyle: React.CSSProperties = {
        padding: '2px 6px',
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.4)',
        background: 'rgba(0,0,0,0.18)',
        color: '#fff',
        fontSize: 12,
        fontFamily: 'var(--font-ui)',
        width,
        outline: 'none',
        cursor: 'text',
    };

    const rowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        fontFamily: 'var(--font-ui)',
    };

    return (
        <div style={rowStyle}>
            <span style={{ fontWeight: 600, minWidth: 52, textAlign: 'right' }}>{label}:</span>
            {type === 'select' && options ? (
                <select
                    value={value ?? ''}
                    onChange={e => handleChange(e.target.value)}
                    onPointerDown={e => e.stopPropagation()}
                    style={{ ...inputStyle, width: width + 20, cursor: 'pointer' }}
                >
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            ) : type === 'number' ? (
                <input
                    type="number"
                    min={min}
                    max={max}
                    value={value ?? ''}
                    onChange={e => handleChange(Number(e.target.value))}
                    onPointerDown={e => e.stopPropagation()}
                    style={inputStyle}
                />
            ) : (
                <input
                    type="text"
                    value={value ?? ''}
                    onChange={e => {
                        const v = e.target.value;
                        const n = Number(v);
                        handleChange(!isNaN(n) && v !== '' ? n : v);
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    style={inputStyle}
                />
            )}
        </div>
    );
};
