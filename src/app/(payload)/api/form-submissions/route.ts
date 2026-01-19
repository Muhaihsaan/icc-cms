import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { Collections } from '@/config'

const submissionDataSchema = z.object({
  field: z.string(),
  value: z.string(),
})

const formSubmissionSchema = z.object({
  form: z.string().uuid(),
  submissionData: z.array(submissionDataSchema),
})

const tenantIdSchema = z.string().uuid()

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config: configPromise })

    const body: unknown = await request.json()
    const parsed = formSubmissionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request body', errors: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { form: formId, submissionData } = parsed.data

    const formResult = await payload.find({
      collection: Collections.FORMS,
      where: { id: { equals: formId } },
      limit: 1,
      depth: 0,
    })

    const form = formResult.docs[0]
    if (!form) {
      return NextResponse.json({ message: 'Form not found' }, { status: 404 })
    }

    // Extract tenant from form (multi-tenant plugin adds this field)
    const formTenant = (form as { tenant?: unknown }).tenant
    const tenantParsed = tenantIdSchema.safeParse(formTenant)

    const submission = await payload.create({
      collection: Collections.FORM_SUBMISSIONS,
      data: {
        form: formId,
        submissionData,
        ...(tenantParsed.success ? { tenant: tenantParsed.data } : {}),
      },
    })

    return NextResponse.json(
      { message: 'Submission received', id: submission.id },
      { status: 201 },
    )
  } catch (error) {
    try {
      const payload = await getPayload({ config: configPromise })
      payload.logger.error(
        { err: error, route: 'POST /api/form-submissions' },
        'Error creating form submission',
      )
    } catch {
      console.error('Error creating form submission:', error)
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
