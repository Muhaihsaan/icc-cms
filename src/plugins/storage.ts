import { s3Storage } from '@payloadcms/storage-s3'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import type { Plugin } from 'payload'

const StorageType = {
  MINIO: 'minio',
  VERCEL: 'vercel',
} as const

/**
 * Storage plugin that switches between MinIO (local) and Vercel Blob (production)
 * based on PAYLOAD_STORAGE environment variable.
 *
 * - PAYLOAD_STORAGE=minio → Uses MinIO/S3 compatible storage
 * - PAYLOAD_STORAGE=vercel → Uses Vercel Blob storage
 * - No PAYLOAD_STORAGE → Defaults to MinIO for local dev
 */
export const getStoragePlugin = (): Plugin | null => {
  const storageType = process.env.PAYLOAD_STORAGE

  // Vercel Blob storage
  if (storageType === StorageType.VERCEL) {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      console.warn('⚠️  PAYLOAD_STORAGE=vercel but BLOB_READ_WRITE_TOKEN is not set')
      return null
    }

    return vercelBlobStorage({
      collections: {
        media: true,
      },
      token,
    })
  }

  // MinIO/S3 storage (default for local development)
  if (storageType === StorageType.MINIO) {
    const bucket = process.env.MINIO_BUCKET
    const endpoint = process.env.MINIO_ENDPOINT
    const accessKey = process.env.MINIO_ACCESS_KEY
    const secretKey = process.env.MINIO_SECRET_KEY

    if (!bucket || !endpoint || !accessKey || !secretKey) {
      console.warn('⚠️  PAYLOAD_STORAGE=minio but MinIO credentials are not fully configured')
      return null
    }

    return s3Storage({
      collections: {
        media: true,
      },
      bucket,
      config: {
        endpoint,
        region: process.env.MINIO_REGION || 'us-east-1',
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
        forcePathStyle: true, // Required for MinIO
      },
    })
  }

  // No storage configured - use local filesystem (default Payload behavior)
  return null
}
