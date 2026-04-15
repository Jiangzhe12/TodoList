import { ReactNode } from 'react'

/**
 * Splits text into segments and wraps matching parts with <mark> tags.
 * Returns the original text if query is empty.
 */
export function highlightText(text: string, query: string): ReactNode {
  if (!query.trim()) return text

  // Escape regex special characters in query
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)

  if (parts.length === 1) return text

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="search-highlight">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}
