'use client'
import { useRef } from 'react'

export default function BlogBackToTop() {
  const ref = useRef<HTMLAnchorElement>(null)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const modalScroll = ref.current?.closest('.blog-modal-scroll')
    if (modalScroll) {
      modalScroll.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="blog-end-of-page">
      <a href="#" ref={ref} onClick={handleClick}>↑</a>
    </div>
  )
}
