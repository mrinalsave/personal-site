'use client'
import { useEffect, useRef } from 'react'
import { resolveSrc } from '@/lib/blobUrl'

// TODO: Hardcoded for now, but need to dynamically populate.
const imageList = [
  '0410.webp', '0510.webp', '0729.webp', '0823.webp',
  '0424.webp', '0810.webp', '0620.webp', '0325.webp',
  '0507.webp', '051024.webp', '0420.webp', '0514-0516.webp',
  '0214.webp', '0401.webp', '0726.webp', '0110.webp',
  '0124.webp', '0707.webp', '0503.webp', '0428-0429.webp',
  '0702.webp', '0108.webp',
]

export default function ArtGrid() {
  const gridRef = useRef<HTMLDivElement>(null)
  const lightboxRef = useRef<HTMLDivElement>(null)
  const lightboxImgRef = useRef<HTMLImageElement>(null)
  const initRef = useRef(false)

  useEffect(() => {
    const grid = gridRef.current
    const lightbox = lightboxRef.current
    const lightboxImg = lightboxImgRef.current
    if (!grid || !lightbox || !lightboxImg) return
    if (initRef.current) return
    initRef.current = true

    const closeLightbox = () => lightbox.classList.remove('active')

    const handleScrimClick = (e: MouseEvent) => {
      if (e.target === lightbox) closeLightbox()
    }
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
    }

    lightbox.addEventListener('click', handleScrimClick)
    document.addEventListener('keydown', handleKeydown)

    imageList.forEach(file => {
      const item = document.createElement('div')
      item.className = 'grid-item'
      const img = document.createElement('img')
      img.src = resolveSrc(`/art/assets/images/${file}`)
      item.appendChild(img)
      grid.appendChild(item)

      item.addEventListener('click', () => {
        const src = resolveSrc(`/art/assets/images/${file}`)
        lightboxImg.style.opacity = '0'
        const tempImg = new Image()
        tempImg.src = src
        tempImg.onload = () => {
          lightboxImg.src = src
          void lightboxImg.offsetWidth
          lightboxImg.style.opacity = '1'
          lightbox.classList.add('active')
        }
      })
    })

    Promise.all([
      import('masonry-layout'),
      import('imagesloaded'),
    ]).then(([{ default: Masonry }, { default: imagesLoaded }]) => {
      imagesLoaded(grid, () => {
        new Masonry(grid, {
          itemSelector: '.grid-item',
          columnWidth: '.grid-item',
          percentPosition: true,
        })
      })
    })

    return () => {
      lightbox.removeEventListener('click', handleScrimClick)
      document.removeEventListener('keydown', handleKeydown)
      grid.innerHTML = ''
      initRef.current = false
    }
  }, [])

  return (
    <>
      <div ref={gridRef} className="grid" />
      <div ref={lightboxRef} id="lightbox">
        <img ref={lightboxImgRef} id="lightbox-img" src={undefined} alt="full size artwork" />
      </div>
    </>
  )
}
