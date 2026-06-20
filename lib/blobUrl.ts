const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_URL ?? ''
const MEDIA_PREFIXES = ['/art/assets/images/', '/blog/portugal/']

export function resolveSrc(src: string): string {
  if (MEDIA_BASE && MEDIA_PREFIXES.some(p => src.startsWith(p))) {
    return `${MEDIA_BASE}${src}`
  }
  return src
}
