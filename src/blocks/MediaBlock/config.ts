import type { Block } from 'payload'
import { Collections } from '@/config'

export const MediaBlock: Block = {
  slug: 'mediaBlock',
  interfaceName: 'MediaBlock',
  fields: [
    {
      name: 'media',
      type: 'upload',
      relationTo: Collections.MEDIA,
    },
  ],
}
