import type { PluginModule } from '@/core/registry/types';
import { StartBlock }     from '@/plugins/core_logic/control/start/index';
import { RepeatBlock }    from '@/plugins/core_logic/control/repeat/index';
import { ForeverBlock }   from '@/plugins/core_logic/control/forever/index';
import { SetVarBlock }    from '@/plugins/core_logic/data/set_var/index';
import { ChangeVarBlock } from '@/plugins/core_logic/data/change_var/index';
import { RandomBlock }    from '@/plugins/core_logic/data/random/index';
import { BoxBlock }       from '@/plugins/core_logic/data/box/index';

export const CoreLogicPlugin: PluginModule = {
    name: 'CoreLogic',
    blocks: [
        StartBlock,
        RepeatBlock,
        ForeverBlock,
        SetVarBlock,
        ChangeVarBlock,
        RandomBlock,
        BoxBlock,
    ],
};
