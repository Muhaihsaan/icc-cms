import { PayloadRequest, CollectionSlug } from 'payload'
import { z } from 'zod'

const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
  posts: '/posts',
  pages: '',
}

const tenantIdSchema = z.union([z.string(), z.number()])

const tenantObjectSchema = z.object({
  id: tenantIdSchema,
  previewUrl: z.string().nullish(),
  previewSecret: z.string().nullish(),
})

const dataWithTenantSchema = z.object({
  tenant: z.union([tenantIdSchema, tenantObjectSchema]),
})

type Props = {
  collection: keyof typeof collectionPrefixMap
  slug: string
  data: unknown
  req: PayloadRequest
}

export const generatePreviewPath = async ({ collection, slug, data, req }: Props): Promise<string> => {
  const path = `${collectionPrefixMap[collection]}/${slug}`

  const buildUrl = (baseUrl: string, secret?: string | null): string => {
    const params = new URLSearchParams({ slug, collection, path })
    if (secret) {
      params.set('secret', secret)
    }
    return `${baseUrl}?${params}`
  }

  // Try to get tenant from data
  const dataParsed = dataWithTenantSchema.safeParse(data)
  if (!dataParsed.success) {
    return buildUrl('/next/preview')
  }

  const tenantField = dataParsed.data.tenant

  // Check if tenant is already populated with previewUrl
  const tenantObjParsed = tenantObjectSchema.safeParse(tenantField)
  if (tenantObjParsed.success) {
    const { previewUrl, previewSecret } = tenantObjParsed.data
    if (previewUrl) {
      return buildUrl(previewUrl, previewSecret)
    }
  }

  // Tenant is just an ID, fetch the full tenant
  const tenantIdParsed = tenantIdSchema.safeParse(tenantField)
  if (!tenantIdParsed.success) {
    return buildUrl('/next/preview')
  }

  const tenant = await req.payload.findByID({
    collection: 'tenants',
    id: tenantIdParsed.data,
    depth: 0,
  })

  if (!tenant) {
    return buildUrl('/next/preview')
  }

  const tenantDataParsed = tenantObjectSchema.safeParse(tenant)
  if (!tenantDataParsed.success) {
    return buildUrl('/next/preview')
  }

  const { previewUrl, previewSecret } = tenantDataParsed.data
  if (!previewUrl) {
    return buildUrl('/next/preview')
  }

  return buildUrl(previewUrl, previewSecret)
}
