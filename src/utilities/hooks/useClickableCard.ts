'use client'
import type { RefObject } from 'react'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

type UseClickableCardType<T extends HTMLElement> = {
  card: {
    ref: RefObject<T | null>
  }
  link: {
    ref: RefObject<HTMLAnchorElement | null>
  }
}

interface Props {
  external?: boolean
  newTab?: boolean
  scroll?: boolean
}

export function useClickableCard<T extends HTMLElement>({
  external = false,
  newTab = false,
  scroll = true,
}: Props): UseClickableCardType<T> {
  const router = useRouter()
  const cardRef = useRef<T>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)
  const timeDownRef = useRef<number>(0)
  const hasActiveParentRef = useRef<boolean>(false)
  const pressedButtonRef = useRef<number>(0)

  const handleMouseDown = useCallback((e: MouseEvent) => {
    const target = e.target
    if (!target || !(target instanceof Element)) return

    const timeNow = Date.now()
    const parent = target.closest('a')

    pressedButtonRef.current = e.button

    if (!parent) {
      hasActiveParentRef.current = false
      timeDownRef.current = timeNow
    } else {
      hasActiveParentRef.current = true
    }
  }, [])

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      const href = linkRef.current?.href
      if (!href) return

      const timeNow = Date.now()
      const difference = timeNow - timeDownRef.current

      if (difference > 250) return
      if (hasActiveParentRef.current) return
      if (pressedButtonRef.current !== 0) return
      if (e.ctrlKey) return

      if (external) {
        const target = newTab ? '_blank' : '_self'
        window.open(href, target)
      } else {
        router.push(href, { scroll })
      }
    },
    [external, newTab, scroll, router],
  )

  useEffect(() => {
    const cardNode = cardRef.current
    if (!cardNode) return

    const abortController = new AbortController()

    cardNode.addEventListener('mousedown', handleMouseDown, {
      signal: abortController.signal,
    })
    cardNode.addEventListener('mouseup', handleMouseUp, {
      signal: abortController.signal,
    })

    return () => {
      abortController.abort()
    }
  }, [handleMouseDown, handleMouseUp])

  return {
    card: {
      ref: cardRef,
    },
    link: {
      ref: linkRef,
    },
  }
}
