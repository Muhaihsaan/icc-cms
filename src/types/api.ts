/**
 * API Types for External Frontend Consumption
 *
 * Copy this file to your frontend project for type-safe API calls.
 *
 * Endpoints:
 * - GET  /api/tenant/{slug}/categories     - List categories (paginated)
 * - GET  /api/tenant/{slug}/posts          - List published posts (paginated)
 * - GET  /api/tenant/{slug}/posts/{slug}   - Get single post
 * - GET  /api/tenant/{slug}/page/{slug}    - Get single page
 * - GET  /api/tenant/{slug}/header         - Get site header/navigation
 * - GET  /api/tenant/{slug}/footer         - Get site footer
 * - POST /api/form-submissions             - Submit form data
 */

// Shared types (used across multiple endpoints)

/** Rich text content from Lexical editor. Use a Lexical renderer library to display. */
export interface LexicalRichText {
  root: {
    type: string
    children: {
      type: string
      version: number
      [k: string]: unknown
    }[]
    direction: 'ltr' | 'rtl' | null // text direction
    format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | ''
    indent: number
    version: number
  }
  [k: string]: unknown
}

/** Responsive image size variant */
export interface MediaSize {
  url?: string | null // full URL to the image
  width?: number | null // width in pixels
  height?: number | null // height in pixels
  mimeType?: string | null // e.g. 'image/jpeg'
  filesize?: number | null // size in bytes
  filename?: string | null
}

/** Uploaded media file (image, video, etc.) */
export interface Media {
  id: string
  alt?: string | null // alt text for accessibility
  caption?: LexicalRichText | null // optional caption
  url?: string | null // original file URL
  thumbnailURL?: string | null // small preview URL
  filename?: string | null
  mimeType?: string | null
  filesize?: number | null
  width?: number | null // original width
  height?: number | null // original height
  sizes?: {
    thumbnail?: MediaSize // 100x100
    square?: MediaSize // 500x500
    small?: MediaSize // 600w
    medium?: MediaSize // 900w
    large?: MediaSize // 1400w
    xlarge?: MediaSize // 1920w
    og?: MediaSize // 1200x630, for social sharing
  }
  createdAt: string
  updatedAt: string
}

/** SEO metadata for pages and posts */
export interface SEOMeta {
  title?: string | null // page title for <title> tag
  description?: string | null // meta description
  image?: string | Media | null // og:image for social sharing
  canonicalUrl?: string | null // canonical URL override
  noIndex?: boolean | null // if true, add noindex meta tag
}

/** Wrapper for paginated list responses */
export interface PaginatedResponse<T> {
  docs: T[] // array of items
  totalDocs: number // total items across all pages
  limit: number // items per page
  totalPages: number // total number of pages
  page: number // current page number (1-indexed)
  pagingCounter: number // index of first item on current page
  hasPrevPage: boolean // true if previous page exists
  hasNextPage: boolean // true if next page exists
  prevPage: number | null // previous page number, or null
  nextPage: number | null // next page number, or null
}

/** Error response from API */
export interface APIErrorResponse {
  message: string // human-readable error message
  errors?: unknown // validation errors (if any)
}

// For fetching categories
// GET /api/tenant/{slug}/categories

/** Post category for organizing blog content */
export interface Category {
  id: string
  title: string // display name
  slug?: string | null // URL-friendly identifier
  fullUrl?: string | null // full path e.g. '/tech'
  createdAt: string
  updatedAt: string
}

export type CategoriesListResponse = PaginatedResponse<Category>
export type SingleCategoryResponse = Category

// For fetching posts
// GET /api/tenant/{slug}/posts?page=1&limit=10&category={categorySlug}
// GET /api/tenant/{slug}/posts/{postSlug}

/** Author information (sanitized, no email) */
export interface PostAuthor {
  id?: string | null
  name?: string | null
}

/** Full post data returned by single post endpoint */
export interface Post {
  id: string
  title: string
  slug?: string | null // URL-friendly identifier
  heroImage?: string | Media | null // featured image (string if not populated)
  content: LexicalRichText // main post content
  category?: string | Category | null // assigned category (string if not populated)
  relatedPosts?: (string | Post)[] | null // related posts for "read more"
  meta?: SEOMeta // SEO metadata
  publishedAt?: string | null // ISO date string
  readingTime?: number | null // estimated reading time in minutes
  authors: (string | PostAuthor)[] // post authors
  populatedAuthors?: PostAuthor[] | null // pre-populated author data
  createdAt: string
  updatedAt: string
  _status?: 'draft' | 'published' | null
}

/** Partial post data returned by posts list endpoint */
export interface PostListItem {
  id: string
  title: string
  slug?: string | null
  category?: string | Category | null
  meta?: SEOMeta // contains description and image for cards
  publishedAt?: string | null
}

export type PostsListResponse = PaginatedResponse<PostListItem>
export type SinglePostResponse = Post

// For fetching pages
// GET /api/tenant/{slug}/page/{pageSlug}

/** Available field types for dynamic page sections */
export type PageFieldType =
  | 'text' // single line text
  | 'textarea' // multi-line text
  | 'richText' // Lexical rich text editor
  | 'number' // numeric value
  | 'date' // ISO date string
  | 'select' // dropdown with options
  | 'media' // image/file upload
  | 'link' // internal link to page/post
  | 'array' // list of text or media items

/** Option for select field type */
export interface PageFieldSelectOption {
  value: string
  id?: string | null
}

/** Item in array field type */
export interface PageFieldArrayItem {
  type: 'text' | 'media'
  value?: string | null // used when type is 'text'
  media?: string | Media | null // used when type is 'media'
  id?: string | null
}

/** Internal link reference */
export interface PageFieldLinkValue {
  relationTo: 'pages' | 'posts' // which collection it links to
  value: string | Page | Post // the linked document (string if not populated)
}

/**
 * Dynamic field in a page section.
 * Check `type` to determine which value field to use:
 * - 'text' → textValue
 * - 'textarea' → textareaValue
 * - 'richText' → richTextValue
 * - 'number' → numberValue
 * - 'date' → dateValue
 * - 'select' → selectOptions
 * - 'media' → mediaValue
 * - 'link' → linkValue
 * - 'array' → arrayValue
 */
export interface PageField {
  type: PageFieldType // determines which value field is populated
  key: string // field identifier, e.g. 'title', 'description'
  textValue?: string | null // value when type is 'text'
  textareaValue?: string | null // value when type is 'textarea'
  richTextValue?: LexicalRichText | null // value when type is 'richText'
  numberValue?: number | null // value when type is 'number'
  dateValue?: string | null // value when type is 'date' (ISO string)
  selectOptions?: PageFieldSelectOption[] | null // value when type is 'select'
  mediaValue?: string | Media | null // value when type is 'media'
  linkValue?: PageFieldLinkValue | null // value when type is 'link'
  arrayValue?: PageFieldArrayItem[] | null // value when type is 'array'
  id?: string | null
}

/** Section of a page containing multiple fields */
export interface PageSection {
  name: string // section identifier, e.g. 'Hero', 'Features'
  slug?: string | null // for anchor links, e.g. #hero
  fields?: PageField[] | null // dynamic fields in this section
  id?: string | null
}

/** Dynamic page with sections and fields */
export interface Page {
  id: string
  title: string
  slug?: string | null // URL path, e.g. 'about', 'contact'
  sections?: PageSection[] | null // page content organized in sections
  meta?: {
    title?: string | null
    description?: string | null
    image?: string | Media | null
  }
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
  _status?: 'draft' | 'published' | null
}

export type SinglePageResponse = Page

// For fetching navigation
// GET /api/tenant/{slug}/header
// GET /api/tenant/{slug}/footer

/** Reference to an internal page or post */
export interface NavLinkReference {
  relationTo: 'pages' | 'posts'
  value: string | Page | Post // linked document (string if not populated)
}

/** Navigation link (internal or external) */
export interface NavLink {
  type?: 'reference' | 'custom' | null // 'reference' for internal, 'custom' for external
  newTab?: boolean | null // if true, open in new tab
  reference?: NavLinkReference | null // used when type is 'reference'
  url?: string | null // used when type is 'custom'
  label: string // display text
}

/** Navigation menu item */
export interface NavItem {
  link: NavLink
  id?: string | null
}

/** Site header with navigation */
export interface Header {
  id: string
  label: string // identifier for this header config
  navItems?: NavItem[] | null // main navigation links
  createdAt: string
  updatedAt: string
}

/** Site footer with navigation */
export interface Footer {
  id: string
  label: string
  navItems?: NavItem[] | null // footer navigation links
  createdAt: string
  updatedAt: string
}

// For form submissions
// POST /api/form-submissions

/** Available form field types */
export type FormFieldBlockType =
  | 'checkbox' // boolean toggle
  | 'email' // email input with validation
  | 'message' // display-only rich text (not a form input)
  | 'number' // numeric input
  | 'select' // dropdown
  | 'text' // single line text
  | 'textarea' // multi-line text

/** Option for select form field */
export interface FormFieldSelectOption {
  label: string // display text
  value: string // submitted value
  id?: string | null
}

/** Form field configuration */
export interface FormField {
  name?: string // field name for submission
  label?: string | null // display label
  width?: number | null // field width (1-100)
  required?: boolean | null // if true, field is required
  id?: string | null
  blockName?: string | null
  blockType: FormFieldBlockType // field type
  defaultValue?: string | number | boolean | null // pre-filled value
  placeholder?: string | null // placeholder text
  options?: FormFieldSelectOption[] | null // options for select type
  message?: LexicalRichText | null // content for message type
}

/** Form configuration */
export interface Form {
  id: string
  title: string
  slug?: string | null
  fields?: FormField[] | null // form fields to render
  confirmationType?: 'message' | 'redirect' | null // what happens after submit
  confirmationMessage?: LexicalRichText | null // shown when confirmationType is 'message'
  redirect?: {
    type?: 'page' | 'custom' | null
    page?: string | Page | null // redirect to internal page
    url?: string | null // redirect to external URL
  } | null
  createdAt: string
  updatedAt: string
}

/** Request body for form submission */
export interface FormSubmissionRequest {
  form: string // form ID (UUID)
  submissionData: {
    field: string // field name
    value: string // submitted value (stringify non-strings)
  }[]
}

/** Response after successful form submission */
export interface FormSubmissionResponse {
  message: string // success message
  id: string // submission ID
}
