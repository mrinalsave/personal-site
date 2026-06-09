'use client'
import { useEffect, useRef } from 'react'
import type { PokemonCard } from '@/lib/types'

interface Props {
  cards: PokemonCard[]
  gifs: PokemonCard[]
}

export default function PokemonCards({ cards, gifs }: Props) {
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const grid = document.getElementById('grid') as HTMLDivElement
    const lightbox = document.getElementById('lightbox') as HTMLDivElement
    const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement
    const caption = document.getElementById('lightbox-caption') as HTMLParagraphElement
    const randomGif = document.getElementById('random-gif') as HTMLImageElement
    const backToTopLink = document.getElementById('back-to-top') as HTMLAnchorElement

    if (!grid) return

    // Build card elements
    const filenames = cards.map(c => c.filename)
    filenames.forEach(file => {
      const card = document.createElement('div')
      card.className = 'card data-tilt'

      const img = document.createElement('img')
      img.src = `/pokemon-cards/assets/images/cards/thumbnail/${file}`
      img.loading = 'lazy'
      card.appendChild(img)

      const shine = document.createElement('div')
      shine.className = 'shine'
      card.appendChild(shine)

      const glare = document.createElement('div')
      glare.className = 'glare'
      card.appendChild(glare)

      grid.appendChild(card)

      card.addEventListener('click', () => {
        const fullsizeSrc = `/pokemon-cards/assets/images/cards/fullsize/${file}`
        const tempImg = new Image()
        tempImg.src = fullsizeSrc
        lightboxImg.style.opacity = '0'
        tempImg.onload = () => {
          lightboxImg.src = fullsizeSrc
          void lightboxImg.offsetWidth
          lightboxImg.style.opacity = '1'

          const cardNumber = file
            .replace(/\.[^/.]+$/, '')
            .replace(/[-_]/g, ' ')
            .split(' ')
            .pop()

          caption.textContent = ''
          const captionLink = document.createElement('a')
          captionLink.href = `https://www.tcgcollector.com/cards/${cardNumber}`
          captionLink.textContent = `source: TCG card #${cardNumber}`
          captionLink.target = '_blank'
          captionLink.rel = 'noopener noreferrer'
          captionLink.classList.add('retro-text', 'caption-text')
          captionLink.addEventListener('click', e => e.stopPropagation())
          caption.appendChild(captionLink)
          lightbox.classList.add('active')
        }
      })
    })

    // Init vanilla-tilt dynamically
    import('vanilla-tilt').then(({ default: VanillaTilt }) => {
      VanillaTilt.init(Array.from(document.querySelectorAll('.card')) as HTMLElement[], {
        max: 15,
        speed: 500,
        scale: 1.2,
        perspective: 900,
      })

      document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('tiltChange', (e: Event) => {
          const { tiltX, tiltY } = (e as CustomEvent).detail
          const px = 50 + tiltX * 2
          const py = 50 - tiltY * 2
          ;(card as HTMLElement).style.setProperty('--pointer-x', `${px}%`)
          ;(card as HTMLElement).style.setProperty('--pointer-y', `${py}%`)
          ;(card as HTMLElement).style.setProperty('--background-x', `${px}%`)
          ;(card as HTMLElement).style.setProperty('--background-y', `${py}%`)
          const intensity = Math.sqrt(tiltX ** 2 + tiltY ** 2)
          ;(card as HTMLElement).style.setProperty('--card-opacity', (Math.min(intensity / 15, 1) * 0.25).toFixed(3))
        })
        card.addEventListener('mouseleave', () => {
          ;(card as HTMLElement).style.setProperty('--card-opacity', '0')
        })
      })
    })

    // Lightbox close handlers
    lightbox?.addEventListener('click', e => {
      if (e.target === lightbox) lightbox.classList.remove('active')
    })
    document.addEventListener('keydown', onKeyDown)
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') lightbox?.classList.remove('active')
    }

    // Random GIF
    const gifFilenames = gifs.map(g => g.filename)
    function setRandomGif() {
      if (!randomGif || gifFilenames.length === 0) return
      const selected = gifFilenames[Math.floor(Math.random() * gifFilenames.length)]
      randomGif.src = `/pokemon-cards/assets/images/gifs/${selected}`
      randomGif.alt = selected.replace('.gif', '')
    }
    setRandomGif()

    backToTopLink?.addEventListener('click', () => setRandomGif())

    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [cards, gifs])

  return (
    <>
      <main className="pokemon-main" style={{ paddingTop: 'var(--header-h)' }}>
        <div className="grid" id="grid"></div>
        <div className="end-of-page">
          <a href="#" id="back-to-top">
            <img id="random-gif" alt="random pokemon gif" /> ↑
          </a>
        </div>
      </main>

      <div className="lightbox" id="lightbox">
        <div className="lightbox-content">
          <img id="lightbox-img" alt="" />
          <p id="lightbox-caption"></p>
        </div>
      </div>
    </>
  )
}
