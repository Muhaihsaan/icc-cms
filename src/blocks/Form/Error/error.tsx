'use client'

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'

const errorMessageSchema = z.string()

export const Error = ({ name }: { name: string }) => {
  const {
    formState: { errors },
  } = useFormContext()

  const parsed = errorMessageSchema.safeParse(errors[name]?.message)
  const message = parsed.success ? parsed.data : 'This field is required'

  return <div className="mt-2 text-red-500 text-sm">{message}</div>
}
