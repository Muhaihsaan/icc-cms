import type { CollectionAfterReadHook } from 'payload'
import type { Post, User } from 'src/payload-types'
import { z } from 'zod'

type UserId = User['id']

const authorIdSchema = z.union([z.number(), z.object({ id: z.number() }).transform((obj) => obj.id)])

export const populateAuthors: CollectionAfterReadHook<Post> = async ({ doc, req }) => {
  if (!doc.authors || doc.authors.length === 0) return doc

  const authorIds: UserId[] = []
  for (const a of doc.authors) {
    const result = authorIdSchema.safeParse(a)
    if (result.success) authorIds.push(result.data)
  }

  try {
    const result = await req.payload.find({
      collection: 'users',
      depth: 0,
      limit: authorIds.length,
      where: { id: { in: authorIds } },
      overrideAccess: true,
      select: { id: true, name: true },
    })

    const byId = new Map<UserId, { id: UserId; name: User['name'] }>()
    for (const u of result.docs) {
      byId.set(u.id, { id: u.id, name: u.name })
    }

    doc.populatedAuthors = authorIds.map((id) => byId.get(id)).filter((x) => x !== undefined)
  } catch (err) {
    req.payload.logger.error({
      msg: 'populateAuthors failed',
      postId: doc.id,
      err,
    })
  }

  return doc
}
