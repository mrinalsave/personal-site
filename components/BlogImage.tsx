'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import type { ImgHTMLAttributes } from 'react'
import { resolveSrc } from '@/lib/blobUrl'

export default function BlogImage({ className, alt = '', src }: ImgHTMLAttributes<HTMLImageElement>) {
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

  if (!src) return null

  return (
    <Image
      ref={imgRef}
      src={resolveSrc(src as string)}
      className={classes}
      alt={alt}
      width={0}
      height={0}
      sizes="(max-width: 768px) 100vw, 800px"
      style={{ width: '100%', height: 'auto' }}
      onLoad={e => {
        const img = e.currentTarget
        if (img.naturalHeight > img.naturalWidth) setPortrait(true)
      }}
    />
  )
}
