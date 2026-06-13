'use client'
import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/* Wraps an intercepted blog post in a dismissable overlay. Desktop: centered
   dialog over a blurred backdrop. Mobile: fills the screen. Dismiss via the
   close button, the backdrop, or Escape — all router.back() to /blog. */
export default function BlogModal({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => router.back(), [router])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    // lock background scroll while the modal is open — lock both <html> and
    // <body> since the page's scroll root can be either
    const html = document.documentElement
    const prevHtml = html.style.overflow
    const prevBody = document.body.style.overflow
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    // flag for CSS that blurs the fixed header/footer behind the modal
    html.classList.add('blog-modal-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      html.style.overflow = prevHtml
      document.body.style.overflow = prevBody
      html.classList.remove('blog-modal-open')
    }
  }, [close])

  const onBackdropClick = (e: React.MouseEvent) => {
    if (!dialogRef.current?.contains(e.target as Node)) close()
  }

  return (
    <div className="blog-modal-overlay" onClick={onBackdropClick} role="presentation">
      <div className="blog-modal blog-post" ref={dialogRef} role="dialog" aria-modal="true">
        <button className="blog-modal-close" aria-label="close" onClick={close}>
          ✕
        </button>
        <div className="blog-modal-scroll">{children}</div>
      </div>
    </div>
  )
}
