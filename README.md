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
| **Super Editor** | Global | Edit all content across tenants, limited user management |
| **Tenant Admin** | Tenant | Full access within their tenant, can manage tenant users |
| **Tenant User** | Tenant | Frontend authentication only, no admin panel access |
| **Guest Writer** | Tenant | Can create posts only (with configurable limit) |

### Super Editor Details

Super Editor is designed for content managers who need cross-tenant editing access without full administrative privileges.

**Can do:**
- Read and edit all content across all tenants (pages, posts, media, categories, etc.)
- Switch between tenants using the tenant selector
- Update tenant settings (name, domain, slug, logo)
- Create users for any tenant
- Edit tenant-level users (tenant-admin, tenant-user, guest-writer)
- Edit their own account

**Cannot do:**
- Create or delete tenants (Super Admin only)
- Delete users (Super Admin only)
- Edit other Super Admins or Super Editors
- Modify `allowedCollections` field on tenants (Super Admin only)

### Guest Writer Details

Guest Writer is designed for external contributors who need limited post creation access with editorial oversight.

**Post Limit:**
- Each guest writer has a configurable `guestWriterPostLimit` (default: 1)
- Only **Super Admins** can set/modify this limit via the user's sidebar field
- The limit counts posts that have been published (not drafts)
- Once the limit is reached, the guest writer cannot create new posts
- A status message shows: "Guest-writer limit: X of Y posts created. Remaining: Z."

**Can do:**
- Access the admin panel (Posts collection only)
- Create posts up to their configured limit
- Edit their own posts (drafts only)
- View their own posts (both drafts and published)

**Cannot do:**
- Publish posts directly (all posts are forced to draft status for admin review)
- Delete posts
- Access other collections (pages, media, categories, users, etc.)
- See other users' posts
- Set or modify the `publishedAt` date

**Editorial Workflow:**
1. Guest writer creates a post → automatically saved as draft
2. Guest writer is auto-assigned as author (cannot change this)
3. Tenant Admin or higher reviews the draft
4. Admin publishes the post when approved
5. Published post counts toward the guest writer's limit

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
| `/api/tenant/[slug]/page/[pageSlug]` | Get single page (includes sections) |

## Page Sections

Sections are embedded directly within Pages, allowing you to create flexible, structured content without code changes. Each page can have multiple sections, and each section defines its own fields and data.

### Creating Sections

1. Go to **Pages** in the admin panel
2. Open or create a Page
3. In the **Sections** array, click **Add Section**
4. Fill in:
   - **Name**: Section name (e.g., "Hero", "Features")
   - **Slug**: Optional anchor link slug (e.g., "hero" for #hero)
5. Add **Fields** using the available types:

| Type | Description | Stored Value |
|------|-------------|--------------|
| `Text` | Single-line text | `"string"` |
| `Textarea` | Multi-line text with line breaks | `"string"` |
| `Rich Text` | Formatted content editor | `{ lexical JSON }` |
| `Number` | Numeric values | `123` |
| `Date` | Date/time picker | `"2024-01-15T10:30:00.000Z"` |
| `Select` | Dropdown options | `["option1", "option2"]` |
| `Media` | Image/file upload | `{ url, alt, ... }` |
| `Internal Link` | Link to Page/Post | `{ id, slug, title }` |
| `Array` | List of text or media | `[...]` |

### Fetching Pages with Sections

```ts
// Fetch a page - sections are included automatically
const page = await fetch('/api/tenant/acme/page/home').then(r => r.json())

// Page includes sections with computed data
console.log(page.sections)
// [
//   { name: "Hero", slug: "hero", data: { title: "Welcome", heroImage: {...} } },
//   { name: "Features", slug: "features", data: { items: [...] } }
// ]
```

### API Response Structure

```json
{
  "id": 1,
  "title": "Homepage",
  "slug": "home",
  "sections": [
    {
      "name": "Hero",
      "slug": "hero",
      "fields": [
        { "type": "text", "key": "title", "textValue": "Welcome" },
        { "type": "media", "key": "heroImage", "mediaValue": { "url": "..." } }
      ],
      "data": {
        "title": "Welcome",
        "heroImage": { "url": "..." }
      }
    }
  ],
  "meta": {
    "title": "Homepage | Acme",
    "description": "..."
  }
}
```

The `data` object is auto-computed from `fields` for easier frontend access.

### Frontend Usage

```tsx
const page = await fetch('/api/tenant/acme/page/home').then(r => r.json())

return (
  <>
    <head>
      <title>{page.meta.title}</title>
      <meta name="description" content={page.meta.description} />
    </head>
    <main>
      {page.sections?.map(section => (
        <section key={section.name} id={section.slug}>
          {section.data.title && <h1>{section.data.title}</h1>}
          {section.data.description && (
            <p style={{ whiteSpace: 'pre-line' }}>{section.data.description}</p>
          )}
          {section.data.heroImage && (
            <img src={section.data.heroImage.url} alt={section.data.heroImage.alt} />
          )}
        </section>
      ))}
    </main>
  </>
)
```

## Categories

Categories organize posts by topic. Each tenant has their own categories, and categories can be nested using the parent field.

### Creating Categories

1. Go to **Categories** in the sidebar
2. Click **Create New**
3. Fill in:
   - **Title**: Display name (e.g., "Technology")
   - **Slug**: Auto-generated from title, or customize it
   - **Parent**: (Optional) Select a parent category for nesting
4. Click **Save**
5. The **Full URL** will be auto-generated (e.g., `/technology` or `/parent/technology`)

**Example: Creating Nested Categories**

```
1. Create "SEO" category (no parent)
   → Full URL: /seo

2. Create "SEO Tips" category (parent: SEO)
   → Full URL: /seo/seo-tips

3. Create "Technical SEO" category (parent: SEO)
   → Full URL: /seo/technical-seo
```

### Creating a Post with Categories

1. Go to **Posts** in the sidebar
2. Click **Create New**
3. Fill in the **Content** tab:
   - **Title**: Post title
   - **Hero Image**: (Optional) Featured image
   - **Content**: Write your post content
4. Click the **Meta** tab
5. In the **Categories** field:
   - Click the dropdown or **+** button
   - Select one or more categories
6. Fill in the **SEO** tab (optional but recommended)
7. Click **Save Draft** or **Publish**

**Tips:**
- You can assign multiple categories to a single post
- For nested categories, typically assign only the most specific one (e.g., "SEO Tips" not both "SEO" and "SEO Tips")
- Categories are tenant-specific - each tenant has their own set

### Category Structure

| Field | Description |
|-------|-------------|
| `title` | Display name (e.g., "SEO Tips") |
| `slug` | URL identifier (e.g., "seo-tips") |
| `parent` | Optional parent category for nesting |
| `fullUrl` | Auto-computed full path (e.g., "/seo/seo-tips") |

### Assigning Categories to Posts

1. Go to **Posts** → Edit a post
2. Click the **Meta** tab
3. Select categories in the **Categories** field
4. Save the post

### Category Archive Pages

Categories and posts have **separate URLs**:

| URL Pattern | Purpose |
|-------------|---------|
| `/blog/my-post-slug` | Single post page |
| `/blog/category/seo` | Category archive (list posts in "seo") |
| `/blog/category/seo/seo-tips` | Nested category archive |

### Fetching Category and Posts

**Step 1: Get category by fullUrl**

```ts
// Frontend route: /blog/category/[...slug]
// URL: /blog/category/seo/seo-tips
// categoryPath = "/seo/seo-tips"

const categoryRes = await fetch(
  `${API_URL}/api/categories?where[fullUrl][equals]=${categoryPath}&where[tenant][equals]=${tenantId}`
)
const category = categoryRes.docs[0]
```

**Step 2: Get posts in that category**

```ts
const postsRes = await fetch(
  `${API_URL}/api/posts?where[categories][contains]=${category.id}&where[tenant][equals]=${tenantId}`
)
const posts = postsRes.docs
```

**Using Payload Local API (Next.js Server)**

```ts
// In your Next.js page or API route
const category = await payload.find({
  collection: 'categories',
  where: {
    fullUrl: { equals: '/seo/seo-tips' },
    tenant: { equals: tenantId },
  },
  limit: 1,
})

const posts = await payload.find({
  collection: 'posts',
  where: {
    categories: { contains: category.docs[0].id },
    tenant: { equals: tenantId },
    _status: { equals: 'published' },
  },
})
```

### Including Child Categories

To get posts from a category AND all its children:

```ts
// Get the parent category and all children
const allCategories = await payload.find({
  collection: 'categories',
  where: {
    or: [
      { fullUrl: { equals: '/seo' } },           // Parent
      { fullUrl: { like: '/seo/%' } },           // Children (starts with /seo/)
    ],
    tenant: { equals: tenantId },
  },
})

const categoryIds = allCategories.docs.map(c => c.id)

// Get posts in any of these categories
const posts = await payload.find({
  collection: 'posts',
  where: {
    categories: { in: categoryIds },
    tenant: { equals: tenantId },
    _status: { equals: 'published' },
  },
})
```

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
