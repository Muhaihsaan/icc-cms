import clsx from 'clsx'
import React, { memo } from 'react'
import RichText from '@/components/RichText'

import type { Post } from '@/payload-types'

import { Card } from '../../components/Card'
import { Collections } from '@/config/collections'
import { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'

export type RelatedPostsProps = {
  className?: string
  docs?: Post[]
  introContent?: DefaultTypedEditorState
}

export const RelatedPosts: React.FC<RelatedPostsProps> = memo(function RelatedPosts(props) {
  const { className, docs, introContent } = props

  return (
    <div className={clsx('lg:container', className)}>
      {introContent && <RichText data={introContent} enableGutter={false} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-stretch">
        {docs?.map((doc) => {
          if (!doc || !doc.slug) return null
          return <Card key={doc.slug} doc={doc} relationTo={Collections.POSTS} showCategories />
        })}
      </div>
    </div>
  )
})
