import 'reflect-metadata'

import { askarNodeJS } from '@openwallet-foundation/askar-nodejs'
import { registerAskar } from '@openwallet-foundation/askar-shared'

registerAskar({ askar: askarNodeJS })
