'use client'
import { useEffect, useRef, useState } from 'react'
import type { ImgHTMLAttributes } from 'react'

export default function BlogImage({ className, alt = '', ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const [portrait, setPortrait] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Detect already-cached images (onLoad won't fire for them)
  useEffect(() => {
    const el = imgRef.current
    if (el?.complete && el.naturalHeight > el.naturalWidth) setPortrait(true)
  }, [])

  const classes = ['blog-img', portrait ? 'blog-img--portrait' : '', className]
    .filter(Boolean)
    .join(' ')

  // eslint-disable-next-line @next/next/no-img-element
  return <img
    ref={imgRef}
    className={classes}
    alt={alt}
    onLoad={e => {
      const img = e.currentTarget
      if (img.naturalHeight > img.naturalWidth) setPortrait(true)
    }}
    {...rest}
  />
}
