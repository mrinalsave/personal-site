'use client'
import { useRef, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export default function Home() {
  const { isDark } = useTheme()
  const [animatedLoaded, setAnimatedLoaded] = useState(false)
  const animatedImgRef = useRef<HTMLImageElement>(null)

  // Handle already-cached images where onLoad fires before React attaches the handler
  const handleAnimatedRef = (el: HTMLImageElement | null) => {
    (animatedImgRef as React.MutableRefObject<HTMLImageElement | null>).current = el
    if (el?.complete) setAnimatedLoaded(true)
  }

  return (
    <>
      {!animatedLoaded && (
        <picture className="bg-gif">
          <source
            type="image/webp"
            media="(max-width: 1024px) and (orientation: portrait)"
            srcSet={isDark ? '/assets/images/mobile-bg-dark-poster.webp' : '/assets/images/mobile-bg-poster.webp'}
          />
          <img
            src={isDark ? '/assets/images/desktop-bg-dark-poster.webp' : '/assets/images/desktop-bg-poster.webp'}
            alt=""
            aria-hidden
          />
        </picture>
      )}
      <picture className={`bg-gif bg-gif--animated${animatedLoaded ? ' bg-gif--loaded' : ''}`}>
        <source
          type="image/webp"
          media="(max-width: 1024px) and (orientation: portrait)"
          srcSet={isDark ? '/assets/images/mobile-bg-dark.webp' : '/assets/images/mobile-bg.webp'}
        />
        <source
          media="(max-width: 1024px) and (orientation: portrait)"
          srcSet={isDark ? '/assets/images/mobile-bg-dark.gif' : '/assets/images/mobile-bg.gif'}
        />
        <source
          type="image/webp"
          srcSet={isDark ? '/assets/images/desktop-bg-dark.webp' : '/assets/images/desktop-bg.webp'}
        />
        <img
          ref={handleAnimatedRef}
          src={isDark ? '/assets/images/desktop-bg-dark.gif' : '/assets/images/desktop-bg.gif'}
          alt=""
          aria-hidden
          onLoad={() => setAnimatedLoaded(true)}
        />
      </picture>
      <main>
        <div className="content" />
      </main>
    </>
  )
}
