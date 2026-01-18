# Multi-Tenant Headless CMS

A multi-tenant headless CMS built with [Payload CMS](https://payloadcms.com) and [Next.js](https://nextjs.org). Each tenant gets isolated content (pages, posts, media, etc.) while sharing the same CMS infrastructure.

## Local Development Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd icc-cms
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database (PostgreSQL via Docker - matches docker-compose.yml)
DATABASE_URL=postgresql://icc:icc123@localhost:5644/icc-cms

# Security - generate a strong secret (min 32 chars)
PAYLOAD_SECRET=your-super-secret-key-min-32-characters

# Server URL (no trailing slash)
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Storage: "minio" for local, "vercel" for production
PAYLOAD_STORAGE=minio

# MinIO settings (for local development)
MINIO_ENDPOINT=http://localhost:19111
MINIO_REGION=us-east-1
MINIO_BUCKET=icc-dev
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### 3. Start the Database and Run Migrations

Run the reset script to start Docker, run migrations, and generate types:

```bash
pnpm reset
```

This command:
- Starts PostgreSQL via Docker
- Runs database migrations
- Generates TypeScript types
- Generates the import map

### 4. Start Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

### 5. Create First User (Super Admin)

1. Navigate to `http://localhost:3000/admin`
2. You'll see the "Create First User" form
3. Fill in your email and password
4. This user will automatically be assigned the **Super Admin** role

### 6. Create a Tenant

1. Go to **Tenants** in the sidebar
2. Click **Create New**
3. Fill in:
   - **Name**: Display name (e.g., "Acme Corp")
   - **Slug**: URL identifier (e.g., "acme")
   - **Domain**: The domain for this tenant (e.g., "acme.localhost" for local dev)
   - **Allowed Collections**: Which collections this tenant can use
   - **Allow Public Read**: Which collections are publicly accessible

### 7. Create a Tenant Admin

1. Go to **Users** in the sidebar
2. Click **Create New**
3. Fill in email and password
4. In the **Tenants** section:
   - Select the tenant you created
   - Assign the **Tenant Admin** role
5. Save the user

### 8. Test Tenant Access

1. Log out from Super Admin
2. Log in as the Tenant Admin
3. You should only see collections allowed for that tenant
4. Content created will be scoped to that tenant

## Role Hierarchy

| Role | Scope | Capabilities |
|------|-------|--------------|
| **Super Admin** | Global | Full access to everything, manage tenants and users |
| **Super Editor** | Global | Edit all content across tenants, cannot manage users/tenants |
| **Tenant Admin** | Tenant | Full access within their tenant, can manage tenant users |
| **Tenant User** | Tenant | Frontend authentication only, no admin panel access |
| **Guest Writer** | Tenant | Can create posts only (with configurable limit) |

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm reset` | Reset database (Docker + migrations + types) |
| `pnpm payload:migrate` | Run database migrations |
| `pnpm generate:types` | Generate TypeScript types |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run all tests |

## Project Structure

```
src/
├── access/              # Access control logic
│   ├── collections/     # Collection-specific access
│   ├── helpers/         # Access helper utilities
│   └── ...
├── app/
│   ├── (frontend)/      # Public landing page
│   └── (payload)/       # Payload admin & API routes
├── blocks/              # Content blocks (Hero, CTA, etc.)
├── collections/         # Payload collections
├── components/          # React components
├── config/              # Centralized configuration
├── fields/              # Reusable field configurations
├── hooks/               # Payload hooks
├── plugins/             # Payload plugins configuration
├── search/              # Search configuration
└── utilities/           # Utility functions
    ├── hooks/           # React hooks
    └── tenant/          # Tenant-related utilities
```

## Adding a New Collection

### Step 1: Add the Collection Slug

Add your collection slug to `src/config/index.ts`:

```ts
export const Collections = {
  PAGES: 'pages',
  POSTS: 'posts',
  // ... existing collections
  YOUR_COLLECTION: 'your-collection', // Add your new collection
} as const
```

### Step 2: Create the Collection File

Create a new file at `src/collections/YourCollection/index.ts`:

```ts
import type { CollectionConfig } from 'payload'
import {
  tenantCollectionAdminAccess,
  tenantCollectionCreateAccess,
  tenantCollectionUpdateAccess,
  tenantCollectionDeleteAccess,
  tenantCollectionReadAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
} from '@/access'
import { Collections } from '@/config'

export const YourCollection: CollectionConfig = {
  slug: Collections.YOUR_COLLECTION,
  access: {
    admin: tenantCollectionAdminAccess(Collections.YOUR_COLLECTION),
    create: withTenantCollectionAccess(Collections.YOUR_COLLECTION, tenantCollectionCreateAccess),
    update: withTenantCollectionAccess(Collections.YOUR_COLLECTION, tenantCollectionUpdateAccess),
    delete: withTenantCollectionAccess(Collections.YOUR_COLLECTION, tenantCollectionDeleteAccess),
    read: tenantCollectionReadAccess(Collections.YOUR_COLLECTION),
  },
  admin: {
    hidden: shouldHideCollection(Collections.YOUR_COLLECTION),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    // Add your fields here
  ],
}
```

### Step 3: Make it Tenant-Managed (Optional)

If you want the collection to be assignable per-tenant, add it to `tenantManagedCollections` in `src/config/index.ts`:

```ts
export const tenantManagedCollections = [
  Collections.PAGES,
  Collections.POSTS,
  // ... existing collections
  Collections.YOUR_COLLECTION, // Add here to make it tenant-assignable
] as const
```

### Step 4: Register in Payload Config

Add your collection to `src/payload.config.ts`:

```ts
import { YourCollection } from './collections/YourCollection'

export default buildConfig({
  // ...
  collections: [Pages, Posts, Media, /* ... */, YourCollection],
  // ...
})
```

### Step 5: Run Migrations

```bash
pnpm payload migrate:create   # Create migration for new collection
pnpm payload:migrate          # Run the migration
pnpm generate:types           # Regenerate TypeScript types
```

After these steps, the new collection will:
- Appear in the admin panel
- Be assignable to tenants (if added to `tenantManagedCollections`)
- Respect tenant-based access control
- Be hidden from users who don't have access to it

## Production Deployment

### Environment Variables (Required)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PAYLOAD_SECRET` | Strong secret for JWT encryption (min 32 chars) |
| `NEXT_PUBLIC_SERVER_URL` | Your production URL |
| `PAYLOAD_STORAGE` | Set to `vercel` for Vercel Blob storage |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (required when `PAYLOAD_STORAGE=vercel`) |

### Deploying to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add a PostgreSQL database (Vercel Postgres or Neon)
4. Add Blob storage for media files
5. Configure environment variables:
   - Set `PAYLOAD_STORAGE=vercel`
   - Add `BLOB_READ_WRITE_TOKEN` from Vercel Blob
6. Deploy

### Database Migrations

Before starting the production server, run migrations:

```bash
pnpm payload:migrate
pnpm build
pnpm start
```

## Multi-Tenant Domain Setup

For production, configure DNS for each tenant:

1. **Wildcard subdomain**: `*.yourdomain.com` → your server
2. **Individual domains**: Each tenant can have their own domain

Set the `domain` field in each tenant's configuration to match.

For local development, use unique hostnames per tenant (e.g., `a.localhost`, `b.localhost`) and map them in `/etc/hosts`. Avoid setting all tenants to plain `localhost` or they'll collide.

Example `/etc/hosts`:
```text
127.0.0.1 a.localhost
127.0.0.1 b.localhost
```
Then run `pnpm dev` and visit `http://a.localhost:3000` or `http://b.localhost:3000`.
Make sure each tenant's `domain` field matches its local hostname during dev.
After deployment, update each tenant's `domain` to the real hostname.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/users` | Users API |
| `/api/posts` | Posts API |
| `/api/pages` | Pages API |
| `/api/media` | Media API |
| `/api/tenants` | Tenants API |
| `/api/tenant` | List all tenants |
| `/api/tenant/[slug]/posts` | Get posts for a tenant |
| `/api/tenant/[slug]/posts/[postSlug]` | Get single post |
| `/api/tenant/[slug]/page/[pageSlug]` | Get single page |

## Troubleshooting

### Database connection issues

```bash
# Restart Docker containers
pnpm docker:down
pnpm docker:up

# Check if PostgreSQL is running
docker ps
```

### Type errors after schema changes

```bash
pnpm generate:types
```

### Migration issues

```bash
# Create a new migration
pnpm payload migrate:create

# Run pending migrations
pnpm payload:migrate
```

### Clear everything and start fresh

```bash
pnpm docker:down
docker volume rm icc-cms_postgres-data  # Remove data volume
pnpm reset
```

## License

MIT
