import type { CollectionAfterReadHook, PayloadRequest } from 'payload'
import type { Post, User } from 'src/payload-types'
import { z } from 'zod'
import { Collections } from '@/config'

type UserId = User['id']
type AuthorData = { id: UserId; name: User['name'] }

const authorIdSchema = z.union([
  z.string(),
  z.object({ id: z.string() }).transform((obj) => obj.id),
])

// Per-request cache for author data to avoid N+1 queries when loading multiple posts
const AUTHOR_CACHE_KEY = Symbol('authorCache')

type ReqWithAuthorCache = PayloadRequest & {
  [AUTHOR_CACHE_KEY]?: Map<UserId, AuthorData | null>
}

// Get or create the author cache for this request
const getAuthorCache = (req: ReqWithAuthorCache): Map<UserId, AuthorData | null> => {
  if (!req[AUTHOR_CACHE_KEY]) {
    req[AUTHOR_CACHE_KEY] = new Map()
  }
  return req[AUTHOR_CACHE_KEY]
}

// Fetch authors that aren't already cached
const fetchMissingAuthors = async (
  req: ReqWithAuthorCache,
  authorIds: UserId[],
): Promise<void> => {
  const cache = getAuthorCache(req)

  // Filter to only IDs not in cache
  const missingIds = authorIds.filter((id) => !cache.has(id))
  if (missingIds.length === 0) return

  const result = await req.payload.find({
    collection: Collections.USERS,
    depth: 0,
    limit: missingIds.length,
    where: { id: { in: missingIds } },
    overrideAccess: true,
    select: { id: true, name: true },
  })

  // Cache found authors
  for (const u of result.docs) {
    cache.set(u.id, { id: u.id, name: u.name })
  }

  // Mark missing authors as null to avoid re-fetching
  for (const id of missingIds) {
    if (!cache.has(id)) {
      cache.set(id, null)
    }
  }
}

export const populateAuthors: CollectionAfterReadHook<Post> = async ({ doc, req }) => {
  if (!doc.authors || doc.authors.length === 0) return doc

  const authorIds: UserId[] = []
  for (const a of doc.authors) {
    const result = authorIdSchema.safeParse(a)
    if (result.success) authorIds.push(result.data)
  }

  if (authorIds.length === 0) return doc

  try {
    // Fetch any missing authors (uses per-request cache)
    await fetchMissingAuthors(req as ReqWithAuthorCache, authorIds)

    // Get authors from cache
    const cache = getAuthorCache(req as ReqWithAuthorCache)
    doc.populatedAuthors = authorIds
      .map((id) => cache.get(id))
      .filter((x): x is AuthorData => x !== null && x !== undefined)
  } catch (err) {
    req.payload.logger.error({
      msg: 'populateAuthors failed',
      postId: doc.id,
      err,
    })
  }

  return doc
}
