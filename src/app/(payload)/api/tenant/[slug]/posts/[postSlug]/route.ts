import { NextResponse } from 'next/server'
import { getTenantContext } from '@/app/(payload)/api/tenant/_lib/tenantContext'

type RouteParams = {
  slug: string
  postSlug: string
}

export async function GET(_request: Request, { params }: { params: Promise<RouteParams> }) {
  const { slug, postSlug } = await params

  const { payload, tenant, req } = await getTenantContext(slug)
  if (!tenant || !req) {
    return NextResponse.json({ message: 'Tenant not found' }, { status: 404 })
  }

  const result = await payload.find({
    collection: 'posts',
    limit: 1,
    pagination: false,
    overrideAccess: false,
    req,
    where: {
      and: [
        { tenant: { equals: tenant.id } },
        { slug: { equals: postSlug } },
        { _status: { equals: 'published' } },
        { deletedAt: { exists: false } },
      ],
    },
  })

  const post = result.docs?.[0]
  if (!post) {
    return NextResponse.json({ message: 'Post not found' }, { status: 404 })
  }

  return NextResponse.json(post, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  })
}
