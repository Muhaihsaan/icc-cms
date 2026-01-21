import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import configPromise from '@payload-config'
import { getTenantContext } from '@/app/(payload)/api/tenant/_lib/tenant-context'
import { Collections } from '@/config'
import { DocStatus } from '@/config'

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  category: z.string().optional(),
})

type RouteParams = {
  slug: string
}

export async function GET(request: Request, { params }: { params: Promise<RouteParams> }) {
  try {
    const { slug } = await params

    const url = new URL(request.url)
    const queryResult = querySchema.safeParse({
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
      category: url.searchParams.get('category'),
    })
    const { page, limit, category } = queryResult.success
      ? queryResult.data
      : { page: 1, limit: 10, category: undefined }

    const context = await getTenantContext(slug)
    if (!context.success) {
      return NextResponse.json({ message: context.errorMessage }, { status: context.errorCode })
    }

    const { payload, tenant, req } = context

    // Base where conditions
    const baseConditions: Where = {
      and: [
        { tenant: { equals: tenant.id } },
        { _status: { equals: DocStatus.PUBLISHED } },
        { deletedAt: { exists: false } },
      ],
    }

    // Filter by category slug if provided
    let whereQuery: Where = baseConditions

    if (category) {
      const categoryResult = await payload.find({
        collection: Collections.CATEGORIES,
        where: {
          and: [
            { tenant: { equals: tenant.id } },
            { slug: { equals: category } },
            { deletedAt: { exists: false } },
          ],
        },
        limit: 1,
      })

      const foundCategory = categoryResult.docs[0]
      if (!foundCategory) {
        return NextResponse.json({ message: 'Category not found' }, { status: 404 })
      }

      whereQuery = {
        and: [
          { tenant: { equals: tenant.id } },
          { _status: { equals: DocStatus.PUBLISHED } },
          { deletedAt: { exists: false } },
          { category: { equals: foundCategory.id } },
        ],
      }
    }

    const result = await payload.find({
      collection: Collections.POSTS,
      page,
      limit,
      overrideAccess: false,
      req,
      where: whereQuery,
      sort: '-publishedAt',
      select: {
        title: true,
        slug: true,
        category: true,
        meta: true,
        publishedAt: true,
      },
    })

    // Posts change frequently - use shorter cache (2 min fresh, 10 min stale)
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    // Use Payload logger for structured logging
    try {
      const payload = await getPayload({ config: configPromise })
      payload.logger.error({ err: error, route: 'GET /api/tenant/[slug]/posts' }, 'Error fetching posts')
    } catch {
      console.error('Error fetching posts:', error)
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
