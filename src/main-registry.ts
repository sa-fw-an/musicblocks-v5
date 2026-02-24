import { Registry } from '@/core/registry/index';
import { CoreLogicPlugin }   from '@/plugins/core_logic/index';
import { MusicBlocksPlugin } from '@/plugins/musicblocks/index';

export const globalRegistry = new Registry();
globalRegistry.registerPlugin(CoreLogicPlugin);
globalRegistry.registerPlugin(MusicBlocksPlugin);
