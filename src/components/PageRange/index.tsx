import React from 'react'
import { z } from 'zod'

const totalDocsSchema = z.number()

const defaultLabels = {
  plural: 'Docs',
  singular: 'Doc',
}

const defaultCollectionLabels = {
  posts: {
    plural: 'Posts',
    singular: 'Post',
  },
}

export const PageRange: React.FC<{
  className?: string
  collection?: keyof typeof defaultCollectionLabels
  collectionLabels?: {
    plural?: string
    singular?: string
  }
  currentPage?: number
  limit?: number
  totalDocs?: number
}> = (props) => {
  const {
    className,
    collection,
    collectionLabels: collectionLabelsFromProps,
    currentPage,
    limit,
    totalDocs,
  } = props

  let indexStart = (currentPage ? currentPage - 1 : 1) * (limit || 1) + 1
  if (totalDocs && indexStart > totalDocs) indexStart = 0

  let indexEnd = (currentPage || 1) * (limit || 1)
  if (totalDocs && indexEnd > totalDocs) indexEnd = totalDocs

  const { plural, singular } =
    collectionLabelsFromProps ||
    (collection ? defaultCollectionLabels[collection] : undefined) ||
    defaultLabels ||
    {}

  const totalDocsParsed = totalDocsSchema.safeParse(totalDocs)
  const validTotalDocs = totalDocsParsed.success ? totalDocsParsed.data : 0

  return (
    <div className={[className, 'font-semibold'].filter(Boolean).join(' ')}>
      {validTotalDocs === 0 && 'Search produced no results.'}
      {validTotalDocs > 0 &&
        `Showing ${indexStart}${indexStart > 0 ? ` - ${indexEnd}` : ''} of ${validTotalDocs} ${
          validTotalDocs > 1 ? plural : singular
        }`}
    </div>
  )
}
