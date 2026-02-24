import type { PluginModule } from '@/core/registry/types';
import { PlayNoteBlock }  from '@/plugins/musicblocks/rhythm/play_note/index';
import { RestBlock }      from '@/plugins/musicblocks/rhythm/rest/index';
import { SetTempoBlock }  from '@/plugins/musicblocks/meter/set_tempo/index';
import { SetVolumeBlock } from '@/plugins/musicblocks/volume/set_volume/index';
import { PrintBlock }     from '@/plugins/musicblocks/extras/print/index';
import { WaitBlock }      from '@/plugins/musicblocks/extras/wait/index';
import { ensureTone, cleanupSynth } from '@/plugins/musicblocks/tone-shared';

export const MusicBlocksPlugin: PluginModule = {
    name: 'MusicBlocks',
    blocks: [
        PlayNoteBlock,
        RestBlock,
        SetTempoBlock,
        SetVolumeBlock,
        PrintBlock,
        WaitBlock,
    ],
    onInitialize: ensureTone,
    onCleanup: cleanupSynth,
};
