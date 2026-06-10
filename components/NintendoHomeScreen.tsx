'use client'
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { NintendoGame } from '@/lib/types'

interface Props { games: NintendoGame[] }

export default function NintendoHomeScreen({ games }: Props) {
  const initRef = useRef(false)

  useLayoutEffect(() => {
    document.body.classList.add('nintendo-page', 'page-loading')
    requestAnimationFrame(() => document.body.classList.remove('page-loading'))
    return () => {
      document.body.classList.remove('nintendo-page', 'fade-out')
    }
  }, [])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const allGames = games.map(g => ({
      title: g.title,
      cover: g.cover_path ? `/nintendo-games/assets/images/games/${g.cover_path}` : '',
      url: g.store_url ?? '',
    }))

    function fadeTo(url: string) {
      document.body.classList.add('fade-out')
      setTimeout(() => { window.location.href = url }, 400)
    }

    const track = document.getElementById('carousel-track') as HTMLDivElement
    const trackOuter = document.getElementById('carousel-track-outer') as HTMLDivElement
    const arrowLeft = document.getElementById('arrow-left') as HTMLButtonElement
    const arrowRight = document.getElementById('arrow-right') as HTMLButtonElement
    const selectedTitle = document.getElementById('selected-title') as HTMLSpanElement
    const titleWrapper = document.getElementById('selected-title-wrapper') as HTMLDivElement
    const okBtn = document.getElementById('ok-btn') as HTMLButtonElement
    const backBtn = document.getElementById('back-btn') as HTMLButtonElement

    if (!track) return

    function ICON_SIZE() {
      const icon = track.querySelector('.game-icon') as HTMLElement
      return icon ? icon.offsetWidth : 160
    }
    function GAP() { return 12 }
    function STEP() { return ICON_SIZE() + GAP() }

    let displayGames: typeof allGames = []
    let scrollOffset = 0
    let selectedIndex = 0

    function renderTrack() {
      track.innerHTML = ''
      displayGames.forEach((game, i) => {
        const icon = document.createElement('div')
        icon.className = 'game-icon'
        const img = document.createElement('img')
        img.src = game.cover
        img.alt = game.title
        img.draggable = false
        const border = document.createElement('div')
        border.className = 'game-icon-border'
        icon.appendChild(img)
        icon.appendChild(border)
        icon.addEventListener('click', () => {
          selectGame(i)
          scrollToShowIndex(i)
        })
        track.appendChild(icon)
      })

      const allSoftware = document.createElement('div')
      allSoftware.className = 'all-software-icon'
      const gridIcon = document.createElement('div')
      gridIcon.className = 'grid-icon'
      for (let i = 0; i < 4; i++) gridIcon.appendChild(document.createElement('span'))
      const label = document.createElement('span')
      label.className = 'grid-label retro-text'
      allSoftware.appendChild(gridIcon)
      allSoftware.appendChild(label)
      allSoftware.addEventListener('click', () => {
        selectGame(displayGames.length)
        scrollToShowIndex(displayGames.length)
      })
      track.appendChild(allSoftware)
    }

    function selectGame(i: number) {
      selectedIndex = i
      const isAllSoftware = i === displayGames.length
      document.querySelectorAll('.game-icon').forEach((el, idx) => {
        el.classList.toggle('selected', idx === i)
      })
      const allSoftwareTile = document.querySelector('.all-software-icon')
      if (allSoftwareTile) allSoftwareTile.classList.toggle('selected', isAllSoftware)
      if (selectedTitle) selectedTitle.textContent = isAllSoftware ? 'All Software' : displayGames[i].title
      positionTitle(i)
      if (okBtn) {
        const btnText = okBtn.querySelector('.btn-text')
        if (btnText) btnText.textContent = isAllSoftware ? ' OK' : ' Start'
        okBtn.classList.remove('inactive')
        okBtn.disabled = false
      }
    }

    function positionTitle(i: number) {
      if (!selectedTitle || !titleWrapper) return
      const isAllSoftware = i === displayGames.length
      const iconCenterInTrack = isAllSoftware
        ? (() => {
            const el = track.querySelector('.all-software-icon') as HTMLElement
            const margin = el ? parseFloat(getComputedStyle(el).marginLeft) : 24
            return i * STEP() + margin + (el ? el.offsetWidth / 2 : 60)
          })()
        : i * STEP() + ICON_SIZE() / 2
      const trackOuterRect = trackOuter.getBoundingClientRect()
      const wrapperRect = titleWrapper.getBoundingClientRect()
      const trackLeft = trackOuterRect.left - wrapperRect.left + 12
      const center = trackLeft + iconCenterInTrack - scrollOffset
      const titleWidth = selectedTitle.offsetWidth
      const minLeft = titleWidth / 2
      const trackOuterRight = trackOuterRect.right - wrapperRect.left
      const maxLeft = trackOuterRight - titleWidth / 2
      selectedTitle.style.left = Math.max(minLeft, Math.min(center, maxLeft)) + 'px'
    }

    function confirmSelection() {
      if (selectedIndex === displayGames.length) {
        fadeTo('/nintendo-games/all-software')
      } else if (displayGames[selectedIndex]?.url) {
        window.open(displayGames[selectedIndex].url, '_blank')
      }
    }

    if (okBtn) okBtn.addEventListener('click', confirmSelection)
    if (backBtn) backBtn.addEventListener('click', () => fadeTo('/explore'))

    function maxScroll() {
      return Math.max(0, track.scrollWidth - trackOuter.clientWidth + 24)
    }

    function scrollTo(px: number, animate = false) {
      scrollOffset = Math.max(0, Math.min(px, maxScroll()))
      if (animate) {
        track.classList.add('animating')
        track.addEventListener('transitionend', () => track.classList.remove('animating'), { once: true })
      }
      track.style.transform = `translateX(-${scrollOffset}px)`
      updateArrows()
      setTimeout(() => positionTitle(selectedIndex), 310)
    }

    function updateArrows() {
      if (arrowLeft) arrowLeft.disabled = scrollOffset <= 0
      if (arrowRight) arrowRight.disabled = scrollOffset >= maxScroll()
    }

    const BORDER = 8
    function scrollToShowIndex(i: number) {
      if (i >= displayGames.length) { scrollToShowAllSoftware(); return }
      const iconLeft = i * STEP()
      const iconRight = iconLeft + ICON_SIZE()
      const viewLeft = scrollOffset
      const viewRight = scrollOffset + trackOuter.clientWidth
      if (iconLeft - BORDER < viewLeft) {
        scrollTo(iconLeft - BORDER - GAP(), true)
      } else if (iconRight + BORDER > viewRight) {
        scrollTo(iconRight + BORDER - trackOuter.clientWidth + GAP(), true)
      }
    }

    function scrollToShowAllSoftware() {
      const tile = track.querySelector('.all-software-icon')
      if (!tile) return
      const tileRect = tile.getBoundingClientRect()
      const outerRect = trackOuter.getBoundingClientRect()
      const tileLeft = tileRect.left - outerRect.left + scrollOffset
      const tileRight = tileRect.right - outerRect.left + scrollOffset
      const viewRight = trackOuter.clientWidth
      if (tileRight + BORDER > viewRight + scrollOffset) {
        scrollTo(tileRight + BORDER - trackOuter.clientWidth + GAP(), true)
      } else if (tileLeft - BORDER < scrollOffset) {
        scrollTo(tileLeft - BORDER - GAP(), true)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    function onKeyDown(e: KeyboardEvent) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault()
      if (e.key === 'ArrowLeft') { const n = Math.max(0, selectedIndex - 1); selectGame(n); scrollToShowIndex(n) }
      if (e.key === 'ArrowRight') { const n = Math.min(displayGames.length, selectedIndex + 1); selectGame(n); scrollToShowIndex(n) }
      if (e.key === 'Enter' || e.key === 'a' || e.key === 'A') confirmSelection()
      if (e.key === 'b' || e.key === 'B') fadeTo('/explore')
    }

    arrowLeft?.addEventListener('click', () => {
      const n = Math.max(0, selectedIndex - 1); selectGame(n); scrollToShowIndex(n)
    })
    arrowRight?.addEventListener('click', () => {
      const n = Math.min(displayGames.length, selectedIndex + 1); selectGame(n); scrollToShowIndex(n)
    })

    let dragStartX = 0, dragStartOffset = 0, isDragging = false
    trackOuter.addEventListener('mousedown', (e) => {
      isDragging = true; dragStartX = e.clientX; dragStartOffset = scrollOffset
      trackOuter.classList.add('dragging'); e.preventDefault()
    })
    trackOuter.addEventListener('mousemove', (e) => {
      if (!isDragging) return; scrollTo(dragStartOffset + (dragStartX - e.clientX))
    })
    trackOuter.addEventListener('mouseup', () => { isDragging = false; trackOuter.classList.remove('dragging') })
    trackOuter.addEventListener('mouseleave', () => { isDragging = false; trackOuter.classList.remove('dragging') })

    let touchStartX = 0, touchStartOffset = 0
    trackOuter.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX; touchStartOffset = scrollOffset
    }, { passive: true })
    trackOuter.addEventListener('touchmove', (e) => {
      const delta = touchStartX - e.touches[0].clientX
      if (Math.abs(delta) > 5) e.preventDefault()
      scrollTo(touchStartOffset + delta)
    }, { passive: false })

    function alignBottomBar() {
      const bar = document.getElementById('home-bottom-bar')
      if (!bar || !trackOuter) return
      const trackRect = trackOuter.getBoundingClientRect()
      const barParentRect = bar.parentElement!.getBoundingClientRect()
      bar.style.paddingLeft = Math.max(0, trackRect.left - barParentRect.left) + 'px'
      bar.style.paddingRight = Math.max(0, barParentRect.right - trackRect.right) + 'px'
    }

    function alignTopBar() {
      const bar = document.getElementById('home-top-bar')
      if (!bar || !trackOuter) return
      const trackRect = trackOuter.getBoundingClientRect()
      const barParentRect = bar.parentElement!.getBoundingClientRect()
      bar.style.paddingLeft = Math.max(0, trackRect.left - barParentRect.left) + 'px'
      bar.style.paddingRight = Math.max(0, barParentRect.right - trackRect.right) + 'px'
    }

    const shuffled = [...allGames].sort(() => Math.random() - 0.5)
    displayGames = shuffled.slice(0, 12)
    renderTrack()
    const restore = sessionStorage.getItem('homeSelectedIndex')
    const startIndex = restore !== null ? parseInt(restore, 10) : 0
    sessionStorage.removeItem('homeSelectedIndex')
    const idx = Math.min(startIndex, displayGames.length)
    selectGame(idx)
    scrollToShowIndex(idx)
    updateArrows()
    requestAnimationFrame(() => { alignBottomBar(); alignTopBar() })

    const resizeHandler = () => {
      updateArrows(); scrollTo(selectedIndex * STEP(), false)
      positionTitle(selectedIndex); alignBottomBar(); alignTopBar()
    }
    window.addEventListener('resize', resizeHandler)

    // Time and battery
    const timeEl = document.getElementById('current-time')
    const batteryEl = document.getElementById('current-battery')
    function updateClock() {
      if (timeEl) timeEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      if (batteryEl) {
        if ((navigator as any).getBattery) {
          (navigator as any).getBattery().then((bat: any) => {
            if (batteryEl) batteryEl.textContent = Math.round(bat.level * 100) + '%'
          })
        } else {
          batteryEl.textContent = '100%'
        }
      }
    }
    updateClock()
    const clockInterval = setInterval(updateClock, 1000)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', resizeHandler)
      clearInterval(clockInterval)
      initRef.current = false
    }
  }, [games])

  return (
    <div id="main">
      <div id="home-screen">
        <div id="home-top-bar">
          <div id="home-top-bar-left">
            <img id="avatar" src="/nintendo-games/assets/images/avatar.webp" alt="avatar" />
          </div>
          <div id="home-top-bar-right">
            <span id="current-time" className="switch-text"></span>
            <img id="wifi-icon" src="/nintendo-games/assets/images/wifi.webp" alt="wifi" />
            <img id="wifi-icon-dark" src="/nintendo-games/assets/images/wifi-light.webp" alt="wifi" className="dark-icon" />
            <div id="battery-group">
              <span id="current-battery" className="switch-text"></span>
              <img id="battery-icon" src="/nintendo-games/assets/images/battery.webp" alt="battery" />
              <img id="battery-icon-dark" src="/nintendo-games/assets/images/battery-light.webp" alt="battery" className="dark-icon" />
            </div>
          </div>
        </div>

        <div id="selected-title-wrapper">
          <span id="selected-title" className="switch-text"></span>
        </div>

        <div id="carousel-wrapper">
          <button id="arrow-left" className="carousel-arrow switch-text" aria-label="scroll left">&#8592;</button>
          <div id="carousel-track-outer">
            <div id="carousel-track"></div>
          </div>
          <button id="arrow-right" className="carousel-arrow switch-text" aria-label="scroll right">&#8594;</button>
        </div>

        <img id="navigation-bar" src="/nintendo-games/assets/images/navigation-bar.webp" alt="switch navigation bar reference" />

        <div id="home-bottom-bar">
          <img id="switch-icon" src="/nintendo-games/assets/images/switch.webp" alt="switch icon" />
          <img id="switch-icon-dark" src="/nintendo-games/assets/images/switch-light.webp" alt="switch icon" className="dark-icon" />
          <div id="home-bottom-bar-right">
            <button id="back-btn" className="switch-text bottom-btn" tabIndex={-1}>
              <span className="btn-label">B</span><span className="btn-text"> Back</span>
            </button>
            <button id="ok-btn" className="switch-text bottom-btn inactive" tabIndex={-1} disabled>
              <span className="btn-label">A</span><span className="btn-text"> Start</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
