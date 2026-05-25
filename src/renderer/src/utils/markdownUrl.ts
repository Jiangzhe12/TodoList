// react-markdown strips unknown URL schemes by default. We need to keep
// app-image:// (local images served via custom protocol) alongside the
// usual safe schemes.
export function markdownUrlTransform(url: string): string {
  if (!url) return ''
  if (url.startsWith('app-image://')) return url
  if (url.startsWith('#') || url.startsWith('/')) return url
  // Schemes considered safe to keep.
  if (/^(https?|mailto|tel):/i.test(url)) return url
  // Relative URL with no scheme — keep.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return url
  return ''
}
