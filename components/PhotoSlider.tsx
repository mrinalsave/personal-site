'use client'
import { useEffect, useRef, useState } from 'react'

export type SlideItem = {
  src: string
  alt: string
  caption?: string
}

export default function PhotoSlider({ slides = [] }: { slides?: SlideItem[] }) {
  const n = slides.length
  // Extended: [last-clone, ...originals, first-clone]
  const ext = n > 0 ? [slides[n - 1], ...slides, slides[0]] : []
  const total = ext.length  // n + 2

  const [pos, setPos] = useState(1)
  const [animated, setAnimated] = useState(true)
  const [realIdx, setRealIdx] = useState(0)
  const [portraits, setPortraits] = useState<Set<string>>(new Set())
  const viewportRef = useRef<HTMLDivElement>(null)

  const canNav = n > 1

  const go = (dir: 1 | -1) => {
    setAnimated(true)
    setPos(p => p + dir)
    setRealIdx(i => (i + dir + n) % n)
  }

  // Dot click: jump directly (no slide-through animation)
  const goTo = (i: number) => {
    if (i === realIdx) return
    setAnimated(false)
    setPos(i + 1)
    setRealIdx(i)
  }

  // Normalize pos to [1, n] — handles both normal clone-snapping and
  // out-of-range positions caused by rapid clicking past the clones.
  const onTransitionEnd = () => {
    const normalPos = ((pos - 1) % n + n) % n + 1
    if (pos !== normalPos) {
      setAnimated(false)
      setPos(normalPos)
    }
  }

  // Re-enable transition one frame after an instant snap
  useEffect(() => {
    if (!animated) {
      const id = requestAnimationFrame(() => setAnimated(true))
      return () => cancelAnimationFrame(id)
    }
  }, [animated])

  // Detect already-cached images (onLoad won't fire for them)
  useEffect(() => {
    const imgs = viewportRef.current?.querySelectorAll<HTMLImageElement>('img.photo-slider-img')
    imgs?.forEach(img => {
      const src = img.getAttribute('src') ?? ''
      if (img.complete && img.naturalHeight > img.naturalWidth && src) {
        setPortraits(prev => new Set([...prev, src]))
      }
    })
  }, [])

  const markPortrait = (src: string, img: HTMLImageElement) => {
    if (img.naturalHeight > img.naturalWidth) {
      setPortraits(prev => new Set([...prev, src]))
    }
  }

  if (n === 0) return null

  const currentSlide = slides[realIdx]

  const trackStyle: React.CSSProperties = {
    display: 'flex',
    width: `${total * 100}%`,
    transform: `translateX(calc(${-pos} * 100% / ${total}))`,
    transition: animated ? 'transform 0.4s ease' : 'none',
    willChange: 'transform',
  }

  const slideStyle: React.CSSProperties = {
    width: `${100 / total}%`,
    flexShrink: 0,
    lineHeight: 0,
    display: 'flex',
    justifyContent: 'center',
  }

  return (
    <div className="photo-slider">
      <div className="photo-slider-viewport" ref={viewportRef}>
        <div style={trackStyle} onTransitionEnd={onTransitionEnd}>
          {ext.map((slide, i) => (
            <div key={i} style={slideStyle}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.src}
                alt={slide.alt}
                className={`photo-slider-img${portraits.has(slide.src) ? ' photo-slider-img--portrait' : ''}`}
                onLoad={e => markPortrait(slide.src, e.currentTarget)}
              />
            </div>
          ))}
        </div>

        {canNav && (
          <>
            <button
              className="photo-slider-btn photo-slider-btn--prev"
              onClick={() => go(-1)}
              aria-label="previous slide"
            >‹</button>
            <button
              className="photo-slider-btn photo-slider-btn--next"
              onClick={() => go(1)}
              aria-label="next slide"
            >›</button>
          </>
        )}
      </div>

      {(currentSlide.caption || canNav) && (
        <div className="photo-slider-footer">
          {currentSlide.caption && (
            <p className="photo-slider-caption">{currentSlide.caption}</p>
          )}
          {canNav && (
            <div className="photo-slider-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={`photo-slider-dot${i === realIdx ? ' active' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
