import configPromise from '@payload-config'
import { createLocalReq, getPayload } from 'payload'
import type { Tenant } from '@/payload-types'
import type { TenantRequest } from '@/utilities/createTenantRequest'

type PayloadInstance = Awaited<ReturnType<typeof getPayload>>

type TenantContextSuccess = {
  success: true
  payload: PayloadInstance
  tenant: Tenant
  req: TenantRequest
}

type TenantContextFailure = {
  success: false
  payload: PayloadInstance
  errorMessage: string
  errorCode: number
}

type TenantContextResult = TenantContextSuccess | TenantContextFailure

export async function getTenantContext(slug: string): Promise<TenantContextResult> {
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })

  const tenant = docs[0]
  if (!tenant) {
    return { success: false, payload, errorMessage: 'Tenant not found', errorCode: 404 }
  }

  const req: TenantRequest = await createLocalReq({ user: undefined }, payload)
  req.tenant = tenant

  return { success: true, payload, tenant, req }
}
