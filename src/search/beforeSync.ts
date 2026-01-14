import { BeforeSync, DocToSync } from '@payloadcms/plugin-search/types'
import { z } from 'zod'

const categorySchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
})

export const beforeSyncWithSearch: BeforeSync = async ({ req, originalDoc, searchDoc }) => {
  const {
    doc: { relationTo: collection },
  } = searchDoc

  const { slug, id, categories, title, meta } = originalDoc

  const modifiedDoc: DocToSync = {
    ...searchDoc,
    slug,
    meta: {
      ...meta,
      title: meta?.title || title,
      image: meta?.image?.id || meta?.image,
      description: meta?.description,
    },
    categories: [],
  }

  if (categories && Array.isArray(categories) && categories.length > 0) {
    const populatedCategories: { id: string | number; title: string }[] = []
    const idsToFetch: (string | number)[] = []

    // First pass: collect already populated categories and IDs to fetch
    for (const category of categories) {
      if (!category) continue

      const categoryResult = categorySchema.safeParse(category)
      if (categoryResult.success) {
        populatedCategories.push(categoryResult.data)
        continue
      }

      // Category is just an ID, need to fetch
      const idSchema = z.union([z.string(), z.number()])
      const idResult = idSchema.safeParse(category)
      if (idResult.success) {
        idsToFetch.push(idResult.data)
      }
    }

    // Batch fetch all unpopulated categories in a single query
    if (idsToFetch.length > 0) {
      const fetchedDocs = await req.payload.find({
        collection: 'categories',
        where: { id: { in: idsToFetch } },
        depth: 0,
        limit: idsToFetch.length,
        select: { title: true },
        req,
      })

      for (const doc of fetchedDocs.docs) {
        populatedCategories.push({ id: doc.id, title: doc.title })
      }

      // Log any categories that weren't found
      if (fetchedDocs.docs.length < idsToFetch.length) {
        const foundIds = new Set(fetchedDocs.docs.map((d) => `${d.id}`))
        for (const missingId of idsToFetch) {
          if (!foundIds.has(`${missingId}`)) {
            req.payload.logger.error(
              `Category not found when syncing collection '${collection}' with id: '${id}' to search.`,
            )
          }
        }
      }
    }

    modifiedDoc.categories = populatedCategories.map((each) => ({
      relationTo: 'categories',
      categoryID: String(each.id),
      title: each.title,
    }))
  }

  return modifiedDoc
}
