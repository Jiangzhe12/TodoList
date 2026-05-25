import { useCallback, useRef, useState } from 'react'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB
const SUPPORTED_MIMES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])

export interface PasteResult {
  filename: string
  url: string // app-image://<filename>
  mime: string
}

interface UseImagePasteOptions {
  // Called once per successful image save.
  onImage: (result: PasteResult) => void
}

export function useImagePaste({ onImage }: UseImagePasteOptions): {
  onPaste: (e: React.ClipboardEvent) => void
  error: string | null
  clearError: () => void
} {
  const [error, setError] = useState<string | null>(null)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flashError = useCallback((msg: string) => {
    setError(msg)
    if (errorTimer.current) clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setError(null), 3000)
  }, [])

  const clearError = useCallback(() => {
    if (errorTimer.current) clearTimeout(errorTimer.current)
    setError(null)
  }, [])

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const images: File[] = []
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        if (it.kind !== 'file') continue
        const file = it.getAsFile()
        if (!file) continue
        if (!SUPPORTED_MIMES.has(file.type)) continue
        images.push(file)
      }
      if (images.length === 0) return
      e.preventDefault()
      ;(async () => {
        for (const file of images) {
          if (file.size > MAX_IMAGE_BYTES) {
            flashError(`图片超过 5MB 上限（${(file.size / 1024 / 1024).toFixed(1)}MB），已忽略`)
            continue
          }
          try {
            const buffer = await file.arrayBuffer()
            const filename = await window.api.saveImage(buffer, file.type)
            onImage({ filename, url: `app-image://${filename}`, mime: file.type })
          } catch (err) {
            flashError(`保存图片失败: ${(err as Error).message}`)
          }
        }
      })()
    },
    [flashError, onImage]
  )

  return { onPaste, error, clearError }
}
