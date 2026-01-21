'use client'

import Image from 'next/image'
import React from 'react'

export const Logo = () => {
  return (
    <Image
      src="/icc-logo.png"
      alt="ICC Logo"
      width={150}
      height={150}
    />
  )
}
