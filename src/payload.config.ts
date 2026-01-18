import { postgresAdapter } from '@payloadcms/db-postgres'
import { z } from 'zod'

import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Tenants } from './collections/Tenants'
import { Sections } from './collections/Sections'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { getStoragePlugin } from './plugins/storage'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

// Get storage plugin based on environment
const storagePlugin = getStoragePlugin()

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Schema for parsing optional numeric environment variables with defaults
const envNumberSchema = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return defaultValue
      const num = parseInt(val, 10)
      if (Number.isNaN(num)) return defaultValue
      return num
    })

const poolConfig = z
  .object({
    max: envNumberSchema(10),
    min: envNumberSchema(0),
    idleTimeoutMillis: envNumberSchema(10000),
  })
  .parse({
    max: process.env.DATABASE_POOL_MAX,
    min: process.env.DATABASE_POOL_MIN,
    idleTimeoutMillis: process.env.DATABASE_POOL_IDLE_TIMEOUT,
  })

export default buildConfig({
  i18n: {
    translations: {
      en: {
        version: {
          trashedDocument: 'This page is trashed',
        },
      },
    },
  },
  admin: {
    components: {
      providers: [
        '@/components/HideTrashProvider#HideTrashProvider',
        '@/components/TenantSelector/TopLevelModeContext#TopLevelModeProvider',
      ],
      beforeDashboard: ['@/components/TenantSelector#TenantSelector'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || process.env.DATABASE_URI || '',
      // Using Neon pooler: use the "-pooler" connection string from Neon dashboard
      ...poolConfig,
    },
  }),
  collections: [Pages, Posts, Media, Categories, Users, Tenants, Header, Footer, Sections],
  cors: [getServerSideURL()].filter(Boolean),
  plugins: [...plugins, ...(storagePlugin ? [storagePlugin] : [])],
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${process.env.CRON_SECRET}`
      },
    },
    tasks: [],
  },
})
