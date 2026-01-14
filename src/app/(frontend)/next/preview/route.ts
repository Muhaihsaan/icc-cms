import type { CollectionSlug, PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import { z } from 'zod'

import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

import configPromise from '@payload-config'

const collectionSlugSchema = z.enum(['pages', 'posts', 'media', 'categories', 'users'])

// Adapter to convert NextRequest to PayloadRequest-compatible shape
// This is necessary at the Next.js/Payload framework boundary
function toPayloadRequest(req: NextRequest): PayloadRequest {
  return req as unknown as PayloadRequest
}

export async function GET(req: NextRequest): Promise<Response> {
  const payload = await getPayload({ config: configPromise })

  const { searchParams } = new URL(req.url)

  const path = searchParams.get('path')
  const collectionParam = searchParams.get('collection')
  const slug = searchParams.get('slug')
  const previewSecret = searchParams.get('previewSecret')

  if (previewSecret !== process.env.PREVIEW_SECRET) {
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  if (!path || !collectionParam || !slug) {
    return new Response('Insufficient search params', { status: 404 })
  }

  const collectionParsed = collectionSlugSchema.safeParse(collectionParam)
  if (!collectionParsed.success) {
    return new Response('Invalid collection', { status: 400 })
  }
  // Validated but unused - ensures only valid collections can be previewed
  const _collection: CollectionSlug = collectionParsed.data

  if (!path.startsWith('/')) {
    return new Response('This endpoint can only be used for relative previews', { status: 500 })
  }

  let user

  try {
    user = await payload.auth({
      req: toPayloadRequest(req),
      headers: req.headers,
    })
  } catch (error) {
    payload.logger.error({ err: error }, 'Error verifying token for live preview')
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  const draft = await draftMode()

  if (!user) {
    draft.disable()
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  // You can add additional checks here to see if the user is allowed to preview this page

  draft.enable()

  redirect(path)
}
