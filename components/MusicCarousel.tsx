'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { coverDataUri, type Playlist, type Track } from '@/lib/musicMockData'

interface Props {
  playlists: Playlist[]
  defaultPlaylistId: string
}

/* Tuning ------------------------------------------------------------------ */
const BASE_SPEED = 0.0175  // deg / frame, the "resting" auto-spin speed
const BASE_DIR = -1       // direction of the resting spin (clockwise)
const FRICTION = 0.035    // how fast a flick decays back toward BASE_SPEED
const MAX_VELOCITY = 4    // clamp on flick speed (deg / frame)
const DRAG_SENS = 0.32    // deg of rotation per px dragged left/right
const FOCUS_EASE = 0.12   // easing when snapping a selected card to the focus spot
const TILT_DEG = 20       // must match `--tilt` in styles.css (how far the ring tips)

// Spotify release_date precision varies: "2021", "2021-09", or "2021-09-17".
const fmtDate = (raw: string) => {
  if (!raw) return ''
  const [y, m, d] = raw.split('-')
  if (!m) return y // year only
  const date = new Date(Number(y), Number(m) - 1, d ? Number(d) : 1)
  return date.toLocaleDateString('en-US',
    d ? { year: 'numeric', month: 'short', day: 'numeric' }
      : { year: 'numeric', month: 'short' })
}

export default function MusicCarousel({ playlists, defaultPlaylistId }: Props) {
  const defaultIdx = Math.max(0, playlists.findIndex((p) => p.id === defaultPlaylistId))
  const [playlistIdx, setPlaylistIdx] = useState(defaultIdx)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)

  const playlist = playlists[playlistIdx]
  const tracks = playlist.tracks
  const selected = tracks.find((tk) => tk.id === selectedId) ?? null

  // Live animation values kept in refs so the rAF loop never triggers renders.
  const rotRef = useRef(0)
  const velRef = useRef(BASE_SPEED * BASE_DIR)
  const focusRef = useRef<number | null>(null) // target rotation when a card is selected

  const ringRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const pointer = useRef({ x: 0, y: 0, t: 0 })
  const portraitRef = useRef(false)
  const selectedRef = useRef<string | null>(null)
  useEffect(() => { selectedRef.current = selectedId }, [selectedId])
  useEffect(() => { portraitRef.current = isPortrait }, [isPortrait])

  /* Hide the global site header on this page (clean, full-bleed carousel). */
  useEffect(() => {
    document.body.classList.add('music-page')
    return () => document.body.classList.remove('music-page')
  }, [])

  /* Orientation: vertical ring on portrait / small screens ---------------- */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px) and (orientation: portrait)')
    const sync = () => setIsPortrait(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const count = Math.max(1, tracks.length)
  const step = 360 / count

  /* Layout: the loop is sized to fit the viewport, and the card size adapts to
     how many tracks there are so they stay evenly spaced around the rim — a
     handful of tracks get larger, well-separated covers; a full playlist packs
     them tightly like books on a shelf. */
  const [radius, setRadius] = useState(300)
  const [cardSize, setCardSize] = useState(150)
  useEffect(() => {
    const measure = () => {
      if (portraitRef.current) {
        // Portrait spins on a horizontal axis, so the loop is a *vertical*
        // ellipse: its diameter is bounded by screen height, and it sits in the
        // left ~55% so the popped record + song title have the right whitespace.
        const r = Math.round(Math.min((window.innerHeight - 120) * 0.52, (window.innerWidth - 24) * 0.6))
        const chord = 2 * r * Math.sin(Math.PI / count)
        const card = Math.max(40, Math.min(Math.round(chord * 1.05), Math.round(r * 0.4)))
        setCardSize(card)
        setRadius(Math.max(110, r - Math.round(card / 2)))
        return
      }
      // Landscape: auto-fit the tilted ring to whichever screen edge it reaches
      // first. Tilting the ring by TILT_DEG squashes the loop's *vertical* extent
      // to sin(tilt)·radius, while its *horizontal* extent stays the full radius.
      // The upright covers also poke ~cos(tilt)·card past the top/bottom rim. So
      // each edge gives its own radius cap and we take the largest loop that fits.
      const tilt = (TILT_DEG * Math.PI) / 180
      const sin = Math.sin(tilt)
      const cos = Math.cos(tilt)
      const availW = window.innerWidth - 24
      const availH = window.innerHeight - 160 // head, footer, hint/details clearance
      let r = Math.min(availW / 2, availH / 2 / sin)
      let card = 0
      for (let i = 0; i < 6; i++) {
        // Size each cover to the gap between neighbours on the rim so they stay
        // evenly spaced for any track count — slight overlap (book-spine look)
        // for a packed playlist, larger well-separated covers for a short one.
        const chord = 2 * r * Math.sin(Math.PI / count)
        card = Math.max(40, Math.min(Math.round(chord * 1.05), Math.round(Math.min(availW, availH) * 0.28)))
        const rH = availW / 2 - Math.max(card / 2, 50)   // hits the left/right edges
        const rV = (availH / 2 - card * cos * 0.9) / sin // hits the top/bottom edges
        r = Math.max(160, Math.min(rH, rV))
      }
      setCardSize(card)
      setRadius(Math.round(r))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [count, isPortrait])

  /* The animation loop ---------------------------------------------------- */
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const focus = focusRef.current
      if (focus !== null) {
        // Snap the selected card to the front, then hold.
        let diff = focus - rotRef.current
        diff = ((diff + 180) % 360 + 360) % 360 - 180
        rotRef.current += diff * FOCUS_EASE
        velRef.current = 0
      } else if (!draggingRef.current) {
        rotRef.current += velRef.current
        // Decay the velocity back toward the resting speed (never to a stop).
        // The vertical (portrait) scroll rests in the opposite direction.
        const resting = BASE_SPEED * (portraitRef.current ? -BASE_DIR : BASE_DIR)
        velRef.current += (resting - velRef.current) * FRICTION
      }

      const ring = ringRef.current
      if (ring) {
        ring.style.setProperty('--rot', `${rotRef.current}deg`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* Drag handling --------------------------------------------------------- */
  const onPointerDown = (e: React.PointerEvent) => {
    if (selectedRef.current) return // locked onto a song
    draggingRef.current = true
    movedRef.current = false
    pointer.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const now = performance.now()
    const dx = e.clientX - pointer.current.x
    const dy = e.clientY - pointer.current.y
    if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true

    // Landscape spins with left/right drag; portrait is a vertical scroll.
    // (No across-track tilt drag in either orientation.)
    const along = portraitRef.current ? -dy : dx
    const dt = Math.max(now - pointer.current.t, 1)
    rotRef.current += along * DRAG_SENS
    velRef.current = (along * DRAG_SENS) / dt * 16 // px→deg/frame for the flick

    pointer.current = { x: e.clientX, y: e.clientY, t: now }
  }

  const onPointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    velRef.current = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velRef.current))
  }

  /* Selecting a song ------------------------------------------------------ */
  const deselect = useCallback(() => {
    // Let the wheel spin again from the resting speed.
    setSelectedId(null)
    setIsPlaying(false)
    focusRef.current = null
    velRef.current = BASE_SPEED * (portraitRef.current ? -BASE_DIR : BASE_DIR)
  }, [])

  const select = useCallback((track: Track, index: number) => {
    if (movedRef.current) return // ignore clicks that were really drags
    if (selectedRef.current === track.id) {
      deselect()
      return
    }
    setSelectedId(track.id)
    setIsPlaying(false)
    // Nearest rotation that brings card `index` to the front of the cylinder
    // (nearest the viewer) so it can straighten and lift toward focus.
    const target = -index * step
    const current = rotRef.current
    const k = Math.round((current - target) / 360)
    focusRef.current = target + k * 360
  }, [step, deselect])

  const switchPlaylist = (idx: number) => {
    setPlaylistIdx(idx)
    setSelectedId(null)
    setIsPlaying(false)
    focusRef.current = null
    velRef.current = BASE_SPEED * BASE_DIR
  }

  return (
    <div className={`music-carousel${isPortrait ? ' vertical' : ''}${selectedId ? ' has-selection' : ''}`}>
      <div className="mc-head">
        <p className="mc-sub">a spin through what&rsquo;s on rotation</p>
      </div>

      <div className="mc-picker">
        <span className="mc-picker-label">playlist</span>
        <div className="mc-select-wrap">
          <select
            className="mc-select"
            aria-label="select playlist"
            value={playlistIdx}
            onChange={(e) => switchPlaylist(Number(e.target.value))}
          >
            {playlists.map((p, i) => (
              <option key={p.id} value={i}>{p.emoji ? `${p.emoji}  ` : ''}{p.name}</option>
            ))}
          </select>
          <svg className="mc-select-caret" viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div
        className="mc-stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => { if (selectedRef.current) deselect() }}
      >
        <div
          className="mc-ring"
          ref={ringRef}
          style={{ ['--radius' as string]: `${radius}px`, ['--card' as string]: `${cardSize}px` }}
        >
          {tracks.map((track, i) => {
            const isSel = track.id === selectedId
            return (
              <div
                key={track.id}
                className={`mc-card${isSel ? ' selected' : ''}`}
                style={{ ['--theta' as string]: `${i * step}deg` }}
                onClick={(e) => { e.stopPropagation(); select(track, i) }}
              >
                <div className="mc-card-inner">
                  <div className={`mc-vinyl${isSel && isPlaying ? ' spinning' : ''}`} aria-hidden>
                    <div className="mc-vinyl-disc" />
                  </div>
                  <div className="mc-box" style={{ ['--cover-url' as string]: `url(${track.coverUrl ?? coverDataUri(track)})` }}>
                    <img className="mc-cover" src={track.coverUrl ?? coverDataUri(track)} alt={`${track.title} — ${track.artist}`} loading="lazy" draggable={false} />
                    <img className="mc-cover mc-cover-back" src={track.coverUrl ?? coverDataUri(track)} alt="" aria-hidden loading="lazy" draggable={false} />
                    <div className="mc-box-right"  aria-hidden />
                    <div className="mc-box-left"   aria-hidden />
                    <div className="mc-box-top"    aria-hidden />
                    <div className="mc-box-bottom" aria-hidden />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={`mc-details${selected ? ' open' : ''}`} aria-live="polite">
        {selected && (
          <>
            <div className="mc-details-text">
              <h2 className="mc-song-title">{selected.title}</h2>
              <p className="mc-song-meta">
                <span className="mc-artist">{selected.artist}</span>
                <span className="mc-dot">•</span>
                <span>{selected.album}</span>
                <span className="mc-dot">•</span>
                <span>{fmtDate(selected.releaseDate)}</span>
              </p>
            </div>
            <button
              className={`mc-play${isPlaying ? ' playing' : ''}`}
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? 'pause' : 'play'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" width="22" height="22"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
          </>
        )}
      </div>

      <p className="mc-hint">{selected ? 'tap the cover again to send it back' : 'drag to spin · tap a cover to play'}</p>
    </div>
  )
}