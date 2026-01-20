import type { CollectionAfterChangeHook } from 'payload'
import { revalidateTag } from 'next/cache'

type RevalidationConfig = {
  tag: string
  logMessage: string
  checkDisableRevalidate?: boolean
}

export const createTagRevalidationHook = ({
  tag,
  logMessage,
  checkDisableRevalidate = true,
}: RevalidationConfig): CollectionAfterChangeHook => {
  return ({ doc, req: { payload, context } }) => {
    if (checkDisableRevalidate && context?.disableRevalidate) return doc

    payload.logger.info(logMessage)
    revalidateTag(tag)

    return doc
  }
}
