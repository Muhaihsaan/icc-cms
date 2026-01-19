'use client'

import { useEffect, useState } from 'react'

/**
 * Hook that returns true only after component is fully mounted (past hydration).
 * Uses double requestAnimationFrame to ensure we're past React's hydration phase.
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    let frameId: number
    const frame1 = requestAnimationFrame(() => {
      frameId = requestAnimationFrame(() => {
        setIsMounted(true)
      })
    })
    return () => {
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frameId)
    }
  }, [])

  return isMounted
}

/**
 * Injects a style element into the document head.
 * Returns cleanup function to remove the style.
 */
export function injectStyle(id: string, css: string): () => void {
  const existing = document.getElementById(id)
  if (existing) existing.remove()

  if (!css) return () => {}

  const style = document.createElement('style')
  style.id = id
  style.textContent = css
  document.head.appendChild(style)

  return () => {
    document.getElementById(id)?.remove()
  }
}

/**
 * Creates a debounced MutationObserver that watches for DOM changes.
 * Returns cleanup function to disconnect the observer.
 */
export function observeDOM(
  callback: () => void,
  debounceMs = 50,
): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const debouncedCallback = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(callback, debounceMs)
  }

  // Run immediately
  callback()

  const observer = new MutationObserver(debouncedCallback)
  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    observer.disconnect()
  }
}

/**
 * Adds a CSS class to elements matching a text condition.
 */
export function markElementsByText(
  selector: string,
  textMatches: string[],
  className: string,
): void {
  const elements = document.querySelectorAll(selector)
  for (const el of elements) {
    const text = el.childNodes[0]?.textContent?.trim() || el.textContent?.trim() || ''
    if (textMatches.includes(text)) {
      el.classList.add(className)
    }
  }
}

/**
 * Removes a CSS class from all elements that have it.
 */
export function removeClassFromAll(className: string): void {
  const elements = document.querySelectorAll(`.${className}`)
  for (const el of elements) {
    el.classList.remove(className)
  }
}
