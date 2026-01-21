'use client'

import Image from 'next/image'
import React from 'react'

export const Icon = () => {
  return (
    <Image
      src="/favicon.svg"
      alt="Icon"
      width={24}
      height={24}
    />
  )
}
