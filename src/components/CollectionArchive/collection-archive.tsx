import { cn } from '@/utilities/ui'
import React from 'react'

import { PostCard, CardPostData } from '@/components/PostCard/post-card'
import { Collections } from '@/config'

export type Props = {
  posts: CardPostData[]
}

export const CollectionArchive: React.FC<Props> = (props) => {
  const { posts } = props

  return (
    <div className={cn('container')}>
      <div>
        <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-12 gap-y-4 gap-x-4 lg:gap-y-8 lg:gap-x-8 xl:gap-x-8">
          {posts?.map((result) => {
            if (!result || !result.slug) return null
            return (
              <div className="col-span-4" key={result.slug}>
                <PostCard className="h-full" doc={result} relationTo={Collections.POSTS} showCategories />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
