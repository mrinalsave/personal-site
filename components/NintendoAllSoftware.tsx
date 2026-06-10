'use client'
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { NintendoGame } from '@/lib/types'

interface Props { games: NintendoGame[] }

export default function NintendoAllSoftware({ games }: Props) {
  const initRef = useRef(false)

  useLayoutEffect(() => {
    document.body.classList.add('nintendo-page', 'page-loading')
    requestAnimationFrame(() => document.body.classList.remove('page-loading'))
    return () => document.body.classList.remove('nintendo-page')
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

    const softwareGrid = document.getElementById('software-grid') as HTMLDivElement
    if (!softwareGrid) return

    const COLS = 6
    let selectedIndex = 0
    let backSelected = false
    const backBtn = document.getElementById('back-btn') as HTMLButtonElement
    const softwareOkBtn = document.getElementById('software-ok-btn') as HTMLButtonElement
    const softwareScreenEl = document.getElementById('software-screen') as HTMLDivElement
    const gridWrapper = document.getElementById('software-grid-wrapper') as HTMLDivElement

    function setBackSelected(val: boolean) {
      backSelected = val
      if (backBtn) backBtn.classList.toggle('selected', val)
      if (softwareOkBtn) softwareOkBtn.classList.toggle('inactive', val)
      if (val) {
        document.querySelectorAll('#software-grid .game-icon').forEach(el => el.classList.remove('selected'))
        tooltip.classList.remove('visible')
      }
    }

    // Tooltip
    const tooltip = document.createElement('div')
    tooltip.className = 'game-title-tooltip'
    const tooltipDot = document.createElement('div')
    tooltipDot.className = 'game-title-tooltip-icon'
    const tooltipText = document.createElement('span')
    tooltipText.className = 'game-title-tooltip-text switch-text'
    tooltip.appendChild(tooltipDot)
    tooltip.appendChild(tooltipText)
    if (softwareScreenEl) softwareScreenEl.appendChild(tooltip)

    let ttW = 0, ttH = 0
    function measureTooltip(title: string) {
      tooltipText.textContent = title
      tooltip.style.visibility = 'hidden'
      tooltip.style.display = 'flex'
      ttW = tooltip.offsetWidth
      ttH = tooltip.offsetHeight
      tooltip.style.display = ''
      tooltip.style.visibility = ''
    }

    function positionTooltip(tileIndex: number, title: string) {
      if (!softwareScreenEl || !gridWrapper || !softwareGrid) return
      measureTooltip(title)
      const tileEl = softwareGrid.children[tileIndex] as HTMLElement
      const sRect = softwareScreenEl.getBoundingClientRect()
      const tRect = tileEl.getBoundingClientRect()
      const wRect = gridWrapper.getBoundingClientRect()
      const tileCenter = tRect.left - sRect.left + tRect.width / 2
      const tileTopRel = tRect.top - sRect.top
      const tileBotRel = tRect.bottom - sRect.top
      const gridLeft = wRect.left - sRect.left
      const gridRight = wRect.right - sRect.left
      const left = Math.max(gridLeft + ttW / 2, Math.min(tileCenter, gridRight - ttW / 2))
      const roomAbove = tRect.top - wRect.top
      const showBelow = roomAbove < ttH + 8
      tooltip.style.left = left + 'px'
      if (showBelow) {
        tooltip.style.top = tileBotRel + 6 + 'px'
        tooltip.style.transform = 'translateX(-50%)'
      } else {
        tooltip.style.top = tileTopRel + 'px'
        tooltip.style.transform = 'translateX(-50%) translateY(calc(-100% - 6px))'
      }
      tooltip.style.opacity = ''
      tooltip.classList.add('visible')
    }

    function onGridScroll() {
      if (!tooltip.classList.contains('visible') || backSelected) return
      const tileEl = softwareGrid.children[selectedIndex] as HTMLElement
      if (!tileEl) return
      const sRect = softwareScreenEl.getBoundingClientRect()
      const tRect = tileEl.getBoundingClientRect()
      const wRect = gridWrapper.getBoundingClientRect()
      if (tRect.bottom <= wRect.top || tRect.top >= wRect.bottom) { tooltip.style.opacity = '0'; return }
      tooltip.style.opacity = ''
      const tileCenter = tRect.left - sRect.left + tRect.width / 2
      const tileTopRel = tRect.top - sRect.top
      const tileBotRel = tRect.bottom - sRect.top
      const gridLeft = wRect.left - sRect.left
      const gridRight = wRect.right - sRect.left
      const left = Math.max(gridLeft + ttW / 2, Math.min(tileCenter, gridRight - ttW / 2))
      const roomAbove = tRect.top - wRect.top
      const showBelow = roomAbove < ttH + 8
      tooltip.style.left = left + 'px'
      if (showBelow) {
        tooltip.style.top = tileBotRel + 6 + 'px'
        tooltip.style.transform = 'translateX(-50%)'
      } else {
        tooltip.style.top = tileTopRel + 'px'
        tooltip.style.transform = 'translateX(-50%) translateY(calc(-100% - 6px))'
      }
    }
    gridWrapper?.addEventListener('scroll', onGridScroll, { passive: true })

    function selectTile(i: number) {
      if (i >= allGames.length) { setBackSelected(true); tooltip.classList.remove('visible'); return }
      setBackSelected(false)
      selectedIndex = Math.max(0, Math.min(i, allGames.length - 1))
      document.querySelectorAll('#software-grid .game-icon').forEach((el, idx) => {
        el.classList.toggle('selected', idx === selectedIndex)
      })
      tooltip.classList.remove('visible')
      const tile = softwareGrid.children[selectedIndex] as HTMLElement
      let needsScroll = false
      if (gridWrapper && tile) {
        const tRect = tile.getBoundingClientRect()
        const scrollable = gridWrapper.scrollHeight > gridWrapper.clientHeight
        if (scrollable) {
          const wRect = gridWrapper.getBoundingClientRect()
          if (tRect.bottom > wRect.bottom) { gridWrapper.scrollBy({ top: tRect.bottom - wRect.bottom + 12, behavior: 'smooth' }); needsScroll = true }
          else if (tRect.top < wRect.top) { gridWrapper.scrollBy({ top: -(wRect.top - tRect.top + 12), behavior: 'smooth' }); needsScroll = true }
        }
      }
      if (needsScroll) {
        const snapIndex = selectedIndex
        let scrollEndTimer: ReturnType<typeof setTimeout>
        const onScroll = () => {
          clearTimeout(scrollEndTimer)
          scrollEndTimer = setTimeout(() => {
            gridWrapper.removeEventListener('scroll', onScroll)
            if (selectedIndex === snapIndex) positionTooltip(snapIndex, allGames[snapIndex].title)
          }, 80)
        }
        gridWrapper.addEventListener('scroll', onScroll, { passive: true })
      } else {
        positionTooltip(selectedIndex, allGames[selectedIndex].title)
      }
    }

    function navigateBackToHome() {
      sessionStorage.setItem('homeSelectedIndex', String(allGames.length))
      fadeTo('/nintendo-games')
    }
    ;(window as any).navigateBackToHome = navigateBackToHome

    function softwareConfirm() {
      if (!backSelected && allGames[selectedIndex]?.url) window.open(allGames[selectedIndex].url, '_blank')
    }
    ;(window as any)._softwareConfirm = softwareConfirm

    // Render grid
    allGames.forEach((game, i) => {
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
      icon.addEventListener('click', () => selectTile(i))
      softwareGrid.appendChild(icon)
    })

    softwareOkBtn?.addEventListener('click', softwareConfirm)
    if (backBtn) backBtn.addEventListener('click', navigateBackToHome)

    selectTile(0)

    document.addEventListener('keydown', onKeyDown)
    function onKeyDown(e: KeyboardEvent) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault()
      if (backSelected) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { setBackSelected(false); selectTile(allGames.length - 1) }
        if (e.key === 'Enter' || e.key === 'b' || e.key === 'B') navigateBackToHome()
        return
      }
      if (e.key === 'ArrowRight') selectTile(selectedIndex + 1)
      if (e.key === 'ArrowLeft') selectTile(Math.max(0, selectedIndex - 1))
      if (e.key === 'ArrowDown') {
        const nextRow = selectedIndex + COLS
        const gamesInLastRow = allGames.length % COLS || COLS
        const isGameBelow = (((selectedIndex + 1) % COLS) <= gamesInLastRow) && (nextRow < allGames.length)
        const isGameInLastRow = selectedIndex >= allGames.length - gamesInLastRow
        if (isGameBelow) selectTile(nextRow)
        else if (selectedIndex === allGames.length - 1) setBackSelected(true)
        else if (isGameInLastRow) selectTile(selectedIndex + 1)
        else selectTile(allGames.length - 1)
      }
      if (e.key === 'ArrowUp') selectTile(selectedIndex - COLS < 0 ? selectedIndex : selectedIndex - COLS)
      if (e.key === 'a' || e.key === 'A' || e.key === 'Enter') softwareConfirm()
      if (e.key === 'b' || e.key === 'B') navigateBackToHome()
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const grid = document.getElementById('software-grid')
      if (grid) grid.innerHTML = ''
      tooltip.remove()
      initRef.current = false
    }
  }, [games])

  return (
    <main>
      <div id="software-screen">
        <div id="software-header">
          <div id="software-title">
            <div className="grid-icon-static">
              <span></span><span></span><span></span><span></span>
            </div>
            <h3 className="switch-text">All Software</h3>
          </div>
          <div id="software-controls">
            <span className="switch-text control-btn inactive">&#76; Groups</span>
            <span className="switch-text control-btn inactive">&#82; Sort/Filter</span>
          </div>
        </div>

        <hr id="software-divider" />

        <div id="software-grid-wrapper">
          <div id="software-grid"></div>
        </div>

        <div id="software-bottom-bar">
          <button id="back-btn" className="switch-text bottom-btn" tabIndex={-1}>
            <span className="btn-label">B</span><span className="btn-text"> Back</span>
          </button>
          <button id="software-ok-btn" className="switch-text bottom-btn" tabIndex={-1}>
            <span className="btn-label">A</span><span className="btn-text"> Start</span>
          </button>
        </div>
      </div>
    </main>
  )
}
