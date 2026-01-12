import { NextResponse } from 'next/server'
import { getTenantContext } from '@/app/(payload)/api/tenant/_lib/tenantContext'

type RouteParams = {
  slug: string
}

export async function GET(request: Request, { params }: { params: Promise<RouteParams> }) {
  const { slug } = await params

  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') ?? '1')
  const limit = Number(url.searchParams.get('limit') ?? '10')

  const { payload, tenant, req } = await getTenantContext(slug)
  if (!tenant || !req) {
    return NextResponse.json({ message: 'Tenant not found' }, { status: 404 })
  }

  const result = await payload.find({
    collection: 'posts',
    page,
    limit,
    overrideAccess: false,
    req,
    where: {
      and: [
        { tenant: { equals: tenant.id } },
        { _status: { equals: 'published' } },
        { deletedAt: { exists: false } },
      ],
    },
    sort: '-publishedAt',
  })

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
    },
  })
}
