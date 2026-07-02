'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type Playlist, type Track } from '@/lib/spotify'
import type { DeezerData } from '@/lib/deezer'

interface Props {
  playlists: Playlist[]
  defaultPlaylistId: string
}

/* Tuning ------------------------------------------------------------------ */
const FPS = 60            // frame rate the per-frame velocities are tuned against
const DEG_PER_TURN = 360
const BASE_SPEED = 0.075  // deg / frame, the "resting" auto-spin speed
const BASE_DIR = -1       // direction of the resting spin (clockwise)
const FRICTION = 0.035    // how fast a flick decays back toward BASE_SPEED
const MAX_VELOCITY = 4    // clamp on flick speed (deg / frame)
const VEL_SETTLE_EPS = 0.005 // |velocity − resting| below which the ring counts as settled
const DRAG_SENS = 0.32    // deg of rotation per px dragged left/right
const DRAG_MOVE_THRESHOLD = 4 // px of pointer travel before a press is treated as a drag, not a tap
const FOCUS_EASE = 0.12   // easing when snapping a selected card to the focus spot
const TILT_DEG = 20       // must match `--tilt` in styles.css (how far the ring tips)
const FADE_MS  = 800      // duration of play/pause and end-of-track volume fades
const FADE_STEPS = 20     // number of volume increments per fade
const MAX_VOLUME = 0.2   // Deezer previews are mastered loud; linear 0.2 ≈ -14dB feels much quieter
const PORTRAIT_NAV_LABEL_GAP = 34 // vertical space reserved between the album and each portrait nav arrow for the track-title label

// Vinyl disc spin (JS-driven so it can decelerate smoothly on pause).
const VINYL_PERIOD_S = 3.2                              // seconds per full revolution at play speed
const VINYL_FULL_SPEED = DEG_PER_TURN / (VINYL_PERIOD_S * FPS) // deg / frame at play speed
const VINYL_ACCEL_EASE = 0.05                          // easing toward target spin speed
const VINYL_SETTLE_SPEED = 0.01                        // deg / frame below which the disc counts as stopped

// Nav (prev/next track) button dimensions, in px.
const NAV_BTN_SIZE = 56       // diameter of a nav button
const NAV_LABEL_WIDTH = 110   // width of the track-title label beside a nav button
const NAV_LABEL_X_OFFSET = 27 // horizontal shift that centres the label under the button

// Idle spin: derived from BASE_SPEED/DIR so CSS animation period matches JS velocity exactly.
const IDLE_DEGS_PER_SEC = BASE_SPEED * BASE_DIR * FPS // -4.5 deg/sec
const IDLE_PERIOD_S = DEG_PER_TURN / Math.abs(IDLE_DEGS_PER_SEC) // 80 sec

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

export default function SongsInRotation({ playlists, defaultPlaylistId }: Props) {
  const defaultIdx = Math.max(0, playlists.findIndex((p) => p.id === defaultPlaylistId))
  const [playlistIdx, setPlaylistIdx] = useState(defaultIdx)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPortrait, setIsPortrait] = useState(false)

  // Deezer enrichment per track ID, populated lazily on select
  const [enrichment, setEnrichment] = useState<Record<string, DeezerData>>({})
  const fetchedRef = useRef<Set<string>>(new Set()) // avoid duplicate fetches

  // Audio playback
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)  // 0–1, current playhead position
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // True while a deselect-triggered fade-out is in progress so the effect
  // cleanup doesn't interrupt it by calling clearFade() / audio.pause() early.
  const fadingOutRef = useRef(false)

  const clearFade = () => {
    if (fadeTimerRef.current !== null) {
      clearInterval(fadeTimerRef.current)
      fadeTimerRef.current = null
    }
  }

  const fadeIn = (audio: HTMLAudioElement) => {
    clearFade()
    audio.volume = 0
    fadeTimerRef.current = setInterval(() => {
      audio.volume = Math.min(MAX_VOLUME, audio.volume + MAX_VOLUME / FADE_STEPS)
      if (audio.volume >= MAX_VOLUME) clearFade()
    }, FADE_MS / FADE_STEPS)
  }

  const fadeOut = (audio: HTMLAudioElement, onDone?: () => void) => {
    clearFade()
    const start = audio.volume
    fadeTimerRef.current = setInterval(() => {
      audio.volume = Math.max(0, audio.volume - start / FADE_STEPS)
      if (audio.volume <= 0) {
        clearFade()
        onDone?.()
      }
    }, FADE_MS / FADE_STEPS)
  }

  const playlist = playlists[playlistIdx]
  const tracks = playlist.tracks
  const selected = tracks.find((tk) => tk.id === selectedId) ?? null
  const selectedEnrichment = selectedId ? (enrichment[selectedId] ?? null) : null
  const previewUrl = selectedEnrichment?.previewUrl

  // Live animation values kept in refs so the rAF loop never triggers renders.
  const rotRef = useRef(0)
  const velRef = useRef(BASE_SPEED * BASE_DIR)
  const focusRef = useRef<number | null>(null) // target rotation when a card is selected

  // Vinyl disc rotation — driven by JS so it can decelerate smoothly on pause.
  const vinylRotRef = useRef(0)    // current angle (degrees)
  const vinylSpeedRef = useRef(0)  // current speed (degrees / frame)
  const vinylDiscRef = useRef<HTMLElement | null>(null) // cached DOM ref — avoids querySelector every frame

  const ringRef = useRef<HTMLDivElement>(null)
  const spinWrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  // Idle-mode state — when the ring is freely spinning at resting velocity with
  // nothing selected, we hand rotation off to a CSS animation on the GPU
  // compositor thread and pause the rAF loop entirely.
  const isIdleRef = useRef(false)
  const idleEnteredAtRef = useRef(0)
  const idleBaseRotRef = useRef(0)
  const rafRef = useRef<number>(0)
  const tickRef = useRef<(() => void) | null>(null)

  // exitIdle: call before any interaction that needs JS control of the ring.
  // Restores rotRef from elapsed CSS animation time, removes the animation, and
  // restarts the rAF loop.  Declared early so orientation/resize effects can use it.
  const exitIdle = useCallback(() => {
    if (!isIdleRef.current) return
    isIdleRef.current = false

    const elapsed = (performance.now() - idleEnteredAtRef.current) / 1000
    rotRef.current = idleBaseRotRef.current + IDLE_DEGS_PER_SEC * elapsed
    velRef.current = BASE_SPEED * BASE_DIR

    const spinWrap = spinWrapRef.current
    const ring = ringRef.current
    if (spinWrap) {
      spinWrap.classList.remove('mc-spin-land', 'mc-spin-port')
      spinWrap.style.animationDelay = ''
    }
    if (ring) {
      ring.classList.remove('mc-ring--idle')
      ring.style.setProperty('--rot', `${rotRef.current}deg`)
    }

    if (tickRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(tickRef.current)
    }
  }, [])

  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const pointer = useRef({ x: 0, y: 0, t: 0 })
  const dragStartRef = useRef({ x: 0, y: 0 })
  const portraitRef = useRef(false)
  const selectedRef = useRef<string | null>(null)
  const playingRef = useRef(false)
  useEffect(() => { selectedRef.current = selectedId }, [selectedId])
  useEffect(() => { portraitRef.current = isPortrait }, [isPortrait])
  useEffect(() => { playingRef.current = playing }, [playing])
  // Cache the selected vinyl disc element so the rAF loop never has to querySelector.
  useEffect(() => {
    vinylDiscRef.current = selectedId
      ? (ringRef.current?.querySelector<HTMLElement>('.mc-card.selected .mc-vinyl-disc') ?? null)
      : null
  }, [selectedId])

  /* Hide the global site header on this page (clean, full-bleed carousel). */
  useEffect(() => {
    document.body.classList.add('songs-in-rotation-page')
    return () => document.body.classList.remove('songs-in-rotation-page')
  }, [])

  /* Orientation: vertical ring on portrait / small screens ---------------- */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px) and (orientation: portrait)')
    const sync = () => {
      exitIdle() // portrait ↔ landscape swap: restart rAF with correct animation class
      setIsPortrait(mq.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [exitIdle])

  const count = Math.max(1, tracks.length)
  const step = 360 / count

  /* Layout: the loop is sized to fit the viewport, and the card size adapts to
     how many tracks there are so they stay evenly spaced around the rim — a
     handful of tracks get larger, well-separated covers; a full playlist packs
     them tightly like books on a shelf. */
  const [radius, setRadius] = useState(300)
  const [cardSize, setCardSize] = useState(150)
  const [selScale, setSelScale] = useState(2.0)
  const [selTy, setSelTy] = useState(80)
  // Landscape nav button positions relative to .mc-stage (absolute overlays outside the 3D scene)
  const [navY, setNavY] = useState(300)
  const [navXOff, setNavXOff] = useState(150)
  // Portrait nav button positions (same overlay approach, but above/below the album)
  const [portraitNavX, setPortraitNavX] = useState(80)
  const [portraitNavYUp, setPortraitNavYUp] = useState(100)
  const [portraitNavYDown, setPortraitNavYDown] = useState(300)
  // Portrait only: some longer playlists produce a ring tall enough to poke into
  // the header/track-count area, so the count label is hidden when it would overlap.
  const [portraitCountFits, setPortraitCountFits] = useState(true)
  useEffect(() => {
    const measure = () => {
      if (portraitRef.current) {
        // Portrait spins on a horizontal axis, so the loop is a *vertical*
        // ellipse: its diameter is bounded by screen height, and it sits in the
        // left ~55% so the popped record + song title have the right whitespace.
        const r = Math.round(Math.min((window.innerHeight - 120) * 0.52, (window.innerWidth - 24) * 0.6))
        const chord = 2 * r * Math.sin(Math.PI / count)
        const pFactor = Math.min(1.25, 1.05 + 0.005 * Math.max(0, count - 8))
        const card = Math.max(40, Math.min(Math.round(chord * pFactor), Math.round(r * 0.4)))
        const actualR = Math.max(110, r - Math.round(card / 2))
        setCardSize(card)
        setRadius(actualR)
        const selScale_p = parseFloat(Math.min(1.75, 220 / Math.max(1, card)).toFixed(3))
        setSelScale(selScale_p)
        setSelTy(60)
        // Portrait nav button positions from 3D projection (computed once per resize,
        // like landscape — no per-selection DOM measurement so buttons never jump).
        //
        // The selected card-inner center in ring-local space, derived from chained transforms
        // rotateY(−side)·translateZ(300)·translateX(80)·translateY(0.8·card)·scale(selScale)
        // with transform-origin at bottom (50% 100%):
        //   ci_x = 80·cos(side) − 300·sin(side)  ≈ 26.6px  (card-size-independent)
        //   ci_y = 0.3·card  (below ring centre)
        //   ci_z = radius + 300·cos(side)
        // Then ring's rotateY(+side) converts ring-local → world space.
        const SIDE = 10 * Math.PI / 180
        const ci_x = 80 * Math.cos(SIDE) - 300 * Math.sin(SIDE)
        const ci_z = actualR + 300 * Math.cos(SIDE)
        const worldX = ci_x * Math.cos(SIDE) + ci_z * Math.sin(SIDE)
        const worldZ = -ci_x * Math.sin(SIDE) + ci_z * Math.cos(SIDE)
        const stageTop_p = stageRef.current?.getBoundingClientRect().top ?? 52
        const stageH_p = window.innerHeight - stageTop_p
        const perspMag_p = 1600 / Math.max(1, 1600 - worldZ)
        // perspective-origin is 22% x, 50% y; ring sits at 45% y
        const albumX = window.innerWidth * 0.22 + worldX * perspMag_p
        const albumY = stageH_p * 0.50 + (-0.05 * stageH_p + 0.3 * card) * perspMag_p
        const albumHalfH = card * selScale_p * 0.5 * perspMag_p
        setPortraitNavX(Math.round(albumX - NAV_BTN_SIZE / 2))
        setPortraitNavYUp(Math.round(albumY - albumHalfH - 18 - PORTRAIT_NAV_LABEL_GAP - NAV_BTN_SIZE))
        setPortraitNavYDown(Math.round(albumY + albumHalfH + 18 + PORTRAIT_NAV_LABEL_GAP))
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
        // Large playlists: tighten the gap between covers (higher overlap factor)
        // so the ring looks like a solid band of albums rather than tiny slivers.
        const factor = Math.min(3.0, 1.30 + 0.02 * Math.max(0, count - 8))
        const minCard = Math.round(Math.min(availW, availH) * Math.min(0.07, 0.04 + 0.0003 * Math.max(0, count - 8)))
        // Raise the viewport cap (0.35 vs 0.28) so larger covers can grow to fill
        // the cross-section without the ring expanding in width.
        card = Math.max(minCard, Math.min(Math.round(chord * factor), Math.round(Math.min(availW, availH) * 0.35)))
        const rH = availW / 2 - Math.max(card / 2, 50)   // hits the left/right edges
        const rV = (availH / 2 - card * cos * 0.9) / sin // hits the top/bottom edges
        r = Math.max(160, Math.min(rH, rV))
      }
      setCardSize(card)
      setRadius(Math.round(r))
      // Compute selScale and selTy so album + vinyl fill the gap between the
      // ring and the details panel after selection, with 20px clearance each end.
      //
      // Key geometry (landscape selection state):
      //   - Ring center: stageTop + stageH×0.24 (matches perspective-origin-Y)
      //   - Gap = detailsTopY − ringCenterY  (detailsTopY = viewH − 138)
      //   - transform-origin is at the card BOTTOM, which is card/2 below ring center
      //   - Vinyl slides out 50% of card below the card face (CSS translateY(50%)),
      //     so the total visual height = 1.5 × card
      //   - Vinyl bottom world-Y from ring center: card×(1+scale/2) + selTy
      //     → screen-Y: ringCenterY + (card×(1+scale/2) + selTy)×perspMag = detailsTopY−20
      //     → selTy = (gapPx−20)/perspMag − card×(1+scale/2)
      //   - Negative selTy shifts the album UP above the ring center (needed on short viewports
      //     where the card+vinyl would otherwise overlap the details panel).
      const stageTop = stageRef.current?.getBoundingClientRect().top ?? 52
      const stageH = window.innerHeight - stageTop
      const ringCenterY = stageTop + stageH * 0.24
      const detailsTopY = window.innerHeight - 138
      const gapPx = Math.max(80, detailsTopY - ringCenterY)
      const perspMag = 2600 / Math.max(1, 2600 - (r + 350))
      // Fit card + vinyl (=1.5× card height) in the gap with 20px bottom margin
      const scale = Math.min(3.2, Math.max(0.5, (gapPx - 40) / (1.25 * card * perspMag)))
      setSelScale(parseFloat(scale.toFixed(3)))
      // Position vinyl bottom 20px above detailsTopY; negative shifts album up if needed
      const ty = Math.round((gapPx - 60) / perspMag - card * (1 + scale / 2))
      setSelTy(ty)
      // Nav button positions: stage-relative absolute coords (outside the 3D scene).
      // Sizes/gaps match what the buttons looked like when inside the 3D card:
      // local-space values are multiplied by scale×perspMag to get screen pixels.
      setNavY(Math.round(stageH * 0.24 + (ty + card * 1.25) * perspMag))
      // Gap from card edge = 18px local × scale × perspMag; navXOff is the left
      // edge of the right button (and the right edge of the left button) from center.
      setNavXOff(Math.round(scale * perspMag * card / 2 + 18))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [count, isPortrait])

  /* Portrait: hide the track-count label if the ring's on-screen bounding box
     (which reflects the real 3D projection, incl. tilt/perspective) pokes up
     into the header/label area — checked once after each layout pass since the
     ring's vertical envelope is rotation-invariant (spin only shifts phase). */
  useEffect(() => {
    if (!isPortrait) { setPortraitCountFits(true); return }
    const raf = requestAnimationFrame(() => {
      const ring = ringRef.current
      const stage = stageRef.current
      if (!ring || !stage) return
      const ringTop = ring.getBoundingClientRect().top
      const stageTop = stage.getBoundingClientRect().top
      // ~92px clears the "<N> / NO. OF TRACKS" label plus a safety margin.
      setPortraitCountFits(ringTop > stageTop + 92)
    })
    return () => cancelAnimationFrame(raf)
  }, [isPortrait, radius, cardSize])

  /* Audio: create / destroy the Audio element whenever the preview URL changes.
     This handles track switches and deselection automatically via the cascade:
     selectedId → selectedEnrichment → previewUrl → this effect. */
  useEffect(() => {
    let audio: HTMLAudioElement | null = null
    let onTimeUpdate: (() => void) | null = null
    let onProgressUpdate: (() => void) | null = null
    setPlaying(false)
    setProgress(0)
    if (previewUrl) {
      // Capture the track ID now so the fallback closure targets the right entry
      // even if the user switches tracks before the play promise settles.
      const trackId = selectedRef.current

      // When a preview URL exists but the audio fails to load or play, strip the
      // previewUrl from enrichment so the Spotify fallback link is shown instead.
      const fallbackToSpotify = (err?: unknown) => {
        // NotAllowedError = autoplay blocked by browser policy; keep the button
        // so the user can tap to start manually.
        if ((err as Error | undefined)?.name === 'NotAllowedError') {
          setPlaying(false)
          return
        }
        // If the user navigated away before the error resolved, the error was
        // likely caused by the navigation itself (abort, stale CDN URL, etc.).
        // Don't permanently strip the URL — the track is no longer selected anyway.
        if (trackId !== selectedRef.current) return
        if (trackId) {
          // Also clear fetchedRef so a fresh Deezer fetch is attempted next time
          // this track is selected, in case the URL has since expired.
          fetchedRef.current.delete(trackId)
          setEnrichment((prev) => {
            const entry = prev[trackId]
            if (!entry) return prev
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { previewUrl: _removed, ...rest } = entry
            return { ...prev, [trackId]: rest }
          })
        }
      }

      audio = new Audio(previewUrl)
      audio.onended = () => setPlaying(false)
      audio.onerror = () => fallbackToSpotify()

      // Fade out in the final FADE_MS of the preview so it doesn't cut off abruptly.
      onTimeUpdate = () => {
        if (!audio || !isFinite(audio.duration)) return
        if (audio.duration - audio.currentTime <= FADE_MS / 1000 + 0.7) {
          audio.removeEventListener('timeupdate', onTimeUpdate!)
          fadeOut(audio, () => setPlaying(false))
        }
      }
      audio.addEventListener('timeupdate', onTimeUpdate)

      onProgressUpdate = () => {
        if (!audio || !isFinite(audio.duration) || audio.duration === 0) return
        setProgress(audio.currentTime / audio.duration)
      }
      audio.addEventListener('timeupdate', onProgressUpdate)

      audioRef.current = audio

      // Auto-play as soon as the preview is ready.
      fadeIn(audio)
      audio.play().then(() => setPlaying(true)).catch((err) => {
        // AbortError means play() was interrupted by cleanup (e.g. React StrictMode
        // double-invocation or a quick track switch) — not an actual audio failure.
        // Falling through to fallbackToSpotify would incorrectly strip the previewUrl.
        if ((err as Error)?.name === 'AbortError') return
        fallbackToSpotify(err)
      })
    } else {
      audioRef.current = null
    }
    return () => {
      if (!fadingOutRef.current) clearFade()
      if (audio) {
        if (onTimeUpdate) audio.removeEventListener('timeupdate', onTimeUpdate)
        if (onProgressUpdate) audio.removeEventListener('timeupdate', onProgressUpdate)
        audio.onerror = null
        audio.onended = null
        if (!fadingOutRef.current) audio.pause()
      }
    }
  }, [selectedId, previewUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Cleanup on unmount */
  useEffect(() => {
    return () => { audioRef.current?.pause() }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      fadeOut(audio, () => {
        audio.pause()
        audio.volume = MAX_VOLUME // reset so the next play fades in from silence
        setPlaying(false)
      })
    } else {
      audio.play().catch(() => setPlaying(false))
      fadeIn(audio)
      setPlaying(true)
    }
  }

  /* Idle-mode helpers ----------------------------------------------------- */

  // enterIdleAnim: called from within the tick when the ring has settled.
  // Hands rotation off to a CSS keyframe animation so the rAF loop can stop.
  const enterIdleAnim = () => {
    isIdleRef.current = true
    idleEnteredAtRef.current = performance.now()
    idleBaseRotRef.current = rotRef.current

    // Compute a negative animation-delay to pre-seek the CSS animation to the
    // ring's current visual angle.  The animation goes 0 → -360° in IDLE_PERIOD_S.
    // At seek point |delay|: CSS angle = IDLE_DEGS_PER_SEC * |delay|
    // We want that to equal rotRef.current mod (-360, 0].
    let normalAngle = rotRef.current % 360
    if (normalAngle > 0) normalAngle -= 360   // ensure range (-360, 0]
    const seekSec = normalAngle / IDLE_DEGS_PER_SEC  // positive seconds (0–80)
    const delay = -seekSec                            // negative → pre-seek

    const spinWrap = spinWrapRef.current
    const ring = ringRef.current
    if (spinWrap) {
      spinWrap.style.animationDelay = `${delay}s`
      // Query the media match directly rather than portraitRef: on first load the
      // ring can settle (and enter idle) before the orientation effect's setState
      // has propagated to the ref, which previously picked the landscape spin axis
      // even on a portrait device until the next drag/select forced a re-sync.
      const isPortraitNow = window.matchMedia('(max-width: 1024px) and (orientation: portrait)').matches
      spinWrap.classList.add(isPortraitNow ? 'mc-spin-port' : 'mc-spin-land')
    }
    if (ring) {
      ring.classList.add('mc-ring--idle')
      ring.style.setProperty('--rot', '0deg')
    }
  }

  /* The animation loop ---------------------------------------------------- */
  useEffect(() => {
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
        const resting = BASE_SPEED * BASE_DIR
        velRef.current += (resting - velRef.current) * FRICTION
      }

      const ring = ringRef.current
      if (ring) {
        ring.style.setProperty('--rot', `${rotRef.current}deg`)
      }

      // Vinyl disc: accelerate to full speed while playing, decelerate to 0 on pause.
      // Skip entirely when settled (not playing and speed is negligible).
      if (playingRef.current || vinylSpeedRef.current > VINYL_SETTLE_SPEED) {
        const targetVinylSpeed = playingRef.current ? VINYL_FULL_SPEED : 0
        vinylSpeedRef.current += (targetVinylSpeed - vinylSpeedRef.current) * VINYL_ACCEL_EASE
        vinylRotRef.current = (vinylRotRef.current + vinylSpeedRef.current) % DEG_PER_TURN
        if (vinylDiscRef.current) {
          vinylDiscRef.current.style.transform = `rotate(${vinylRotRef.current}deg)`
        }
      }

      // Enter idle when no track is selected, no drag is in progress, vinyl has
      // stopped, and velocity has fully decayed back to resting speed.
      const settled =
        !draggingRef.current &&
        focusRef.current === null &&
        selectedRef.current === null &&
        !playingRef.current &&
        vinylSpeedRef.current <= VINYL_SETTLE_SPEED &&
        Math.abs(velRef.current - BASE_SPEED * BASE_DIR) < VEL_SETTLE_EPS

      if (settled) {
        enterIdleAnim()
        return // stop rescheduling — CSS animation takes over
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    tickRef.current = tick
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      tickRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* Drag handling --------------------------------------------------------- */
  const onPointerDown = (e: React.PointerEvent) => {
    exitIdle()
    draggingRef.current = true
    movedRef.current = false
    pointer.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const now = performance.now()
    const dx = e.clientX - pointer.current.x
    const dy = e.clientY - pointer.current.y
    if (Math.abs(dx) + Math.abs(dy) > DRAG_MOVE_THRESHOLD) movedRef.current = true

    if (!selectedRef.current) {
      // Landscape spins with left/right drag; portrait is a vertical scroll.
      const along = portraitRef.current ? -dy : dx
      const dt = Math.max(now - pointer.current.t, 1)
      rotRef.current += along * DRAG_SENS
      velRef.current = (along * DRAG_SENS) / dt * 16
    }
    // When selected, just track movement for swipe-to-navigate on pointer up.

    pointer.current = { x: e.clientX, y: e.clientY, t: now }
  }

  const SWIPE_THRESHOLD = 50 // px — minimum drag distance to trigger track navigation

  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    if (selectedRef.current) {
      if (movedRef.current) {
        const totalDx = e.clientX - dragStartRef.current.x
        const totalDy = e.clientY - dragStartRef.current.y
        if (portraitRef.current) {
          if (totalDy < -SWIPE_THRESHOLD)      navigate(1)
          else if (totalDy > SWIPE_THRESHOLD)  navigate(-1)
        } else {
          if (totalDx < -SWIPE_THRESHOLD)      navigate(-1)
          else if (totalDx > SWIPE_THRESHOLD)  navigate(1)
        }
      }
    } else {
      velRef.current = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velRef.current))
    }
  }

  const onPointerCancel = () => {
    draggingRef.current = false
    if (!selectedRef.current) {
      velRef.current = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velRef.current))
    }
  }

  /* Selecting a song ------------------------------------------------------ */
  const resetVinyl = () => {
    vinylRotRef.current = 0
    vinylSpeedRef.current = 0
  }

  // Fetch Deezer enrichment lazily — only once per track per session.
  const fetchEnrichment = useCallback((track: Track) => {
    if (fetchedRef.current.has(track.id)) return
    fetchedRef.current.add(track.id)
    fetch(`/api/deezer?artist=${encodeURIComponent(track.artist)}&title=${encodeURIComponent(track.title)}${track.isrc ? `&isrc=${encodeURIComponent(track.isrc)}` : ''}`)
      .then((r) => r.ok ? r.json() : {})
      .then((data: DeezerData) => {
        if (data.previewUrl) {
          setEnrichment((prev) => ({ ...prev, [track.id]: data }))
        } else {
          // Deezer returned nothing useful — allow retry on next select
          fetchedRef.current.delete(track.id)
        }
      })
      .catch(() => {
        fetchedRef.current.delete(track.id)
      })
  }, [])

  const deselect = useCallback(() => {
    if (vinylDiscRef.current) vinylDiscRef.current.style.transform = ''
    resetVinyl()

    // Fade the audio out in parallel with the visual return-to-ring animation.
    // The effect cleanup will see fadingOutRef=true and skip its own clearFade/pause
    // so the interval isn't cancelled when selectedId→null re-fires the effect.
    const audio = audioRef.current
    if (audio && playingRef.current) {
      fadingOutRef.current = true
      fadeOut(audio, () => {
        fadingOutRef.current = false
        audio.pause()
        audio.volume = MAX_VOLUME
      })
    }

    setSelectedId(null)
    focusRef.current = null
    velRef.current = BASE_SPEED * BASE_DIR
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const select = useCallback((track: Track, index: number) => {
    if (movedRef.current) return // ignore clicks that were really drags
    if (selectedRef.current === track.id) {
      deselect()
      return
    }
    // Cancel any in-progress deselect fade so the cleanup for the outgoing audio
    // runs normally (clearFade + pause) before the new track's audio starts.
    if (fadingOutRef.current) {
      fadingOutRef.current = false
      clearFade()
    }
    exitIdle()
    resetVinyl()
    setSelectedId(track.id)
    // Nearest rotation that brings card `index` to the front of the cylinder
    // (nearest the viewer) so it can straighten and lift toward focus.
    const target = -index * step
    const current = rotRef.current
    const k = Math.round((current - target) / 360)
    focusRef.current = target + k * 360
    fetchEnrichment(track)
  }, [step, deselect, fetchEnrichment, exitIdle])

  const navigate = useCallback((dir: 1 | -1) => {
    const curIdx = tracks.findIndex(t => t.id === selectedRef.current)
    if (curIdx === -1) return
    const newIdx = (curIdx + dir + tracks.length) % tracks.length
    const track = tracks[newIdx]
    if (fadingOutRef.current) {
      fadingOutRef.current = false
      clearFade()
    }
    exitIdle()
    resetVinyl()
    setSelectedId(track.id)
    const target = -newIdx * step
    const k = Math.round((rotRef.current - target) / 360)
    focusRef.current = target + k * 360
    fetchEnrichment(track)
  }, [tracks, step, fetchEnrichment, exitIdle])

  /* Keyboard navigation: arrow keys navigate tracks when a song is selected ----- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!selectedRef.current) return
      if (portraitRef.current) {
        if (e.key === 'ArrowUp')   { e.preventDefault(); navigate(1)  }
        else if (e.key === 'ArrowDown')  { e.preventDefault(); navigate(-1) }
      } else {
        if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1) }
        else if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1)  }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  const switchPlaylist = (idx: number) => {
    setPlaylistIdx(idx)
    setSelectedId(null)
    focusRef.current = null
    velRef.current = BASE_SPEED * BASE_DIR
  }

  const selectedIdx = tracks.findIndex((t) => t.id === selectedId)
  const prevTrack = selectedIdx !== -1 ? tracks[(selectedIdx - 1 + tracks.length) % tracks.length] : null
  const nextTrack = selectedIdx !== -1 ? tracks[(selectedIdx + 1) % tracks.length] : null

  const spotifyFallback = selected
    ? (selected.spotifyUrl ?? `https://open.spotify.com/search/${encodeURIComponent(`${selected.title} ${selected.artist}`)}`)
    : '#'

  return (
    <div className={`songs-in-rotation${isPortrait ? ' vertical' : ''}${selectedId ? ' has-selection' : ''}`}>
      {(!isPortrait || portraitCountFits) && (
        <div className="mc-track-count" aria-hidden={false}>
          <span className="mc-track-count-num">{tracks.length}</span>
          <span className="mc-track-count-label">no. of tracks</span>
        </div>
      )}

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
              <option key={p.id} value={i}>{p.name}</option>
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
        onPointerCancel={onPointerCancel}
        onClick={() => { if (selectedRef.current && !movedRef.current) deselect() }}
      >
        <div className="mc-ring-spin" ref={spinWrapRef}>
        <div
          className="mc-ring"
          ref={ringRef}
          style={{
            ['--radius' as string]: `${radius}px`,
            ['--card' as string]: `${cardSize}px`,
            ['--sel-scale' as string]: selScale.toFixed(3),
            ['--sel-ty' as string]: `${selTy}px`,
          }}
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
                  <div className="mc-vinyl" aria-hidden>
                    <div className="mc-vinyl-disc" />
                  </div>
                  <div className="mc-box" style={{ ['--cover-url' as string]: `url(${track.coverUrl ?? ''})` }}>
                    <img className="mc-cover" src={track.coverUrl ?? ''} alt={`${track.title} — ${track.artist}`} loading="lazy" draggable={false} />
                    <img className="mc-cover mc-cover-back" src={track.coverUrl ?? ''} alt="" aria-hidden loading="lazy" draggable={false} />
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
        </div>{/* mc-ring-spin */}
        {/* Portrait nav buttons: absolute overlays, above and below the album. */}
        {isPortrait && selectedId && (
          <>
            <button
              className="mc-nav-btn"
              style={{ position: 'absolute', width: NAV_BTN_SIZE, height: NAV_BTN_SIZE, top: portraitNavYUp, left: portraitNavX, display: 'flex', transform: 'none', zIndex: 5 }}
              onClick={(e) => { e.stopPropagation(); navigate(1) }}
              aria-label="Previous track"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <path d="M18 15l-6-6-6 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {nextTrack && (
              <p
                className="mc-nav-track-title"
                style={{ position: 'absolute', top: portraitNavYUp + NAV_BTN_SIZE, left: portraitNavX - NAV_LABEL_X_OFFSET, width: NAV_LABEL_WIDTH, zIndex: 5 }}
              >
                <span className="mc-nav-track-label">PREV</span> <span className="mc-dot">&bull;</span> {nextTrack.title}
              </p>
            )}
            <button
              className="mc-nav-btn"
              style={{ position: 'absolute', width: NAV_BTN_SIZE, height: NAV_BTN_SIZE, top: portraitNavYDown, left: portraitNavX, display: 'flex', transform: 'none', zIndex: 5 }}
              onClick={(e) => { e.stopPropagation(); navigate(-1) }}
              aria-label="Next track"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {prevTrack && (
              <p
                className="mc-nav-track-title"
                style={{ position: 'absolute', top: portraitNavYDown - PORTRAIT_NAV_LABEL_GAP, left: portraitNavX - NAV_LABEL_X_OFFSET, width: NAV_LABEL_WIDTH, zIndex: 5 }}
              >
                <span className="mc-nav-track-label">NEXT</span> <span className="mc-dot">&bull;</span> {prevTrack.title}
              </p>
            )}
          </>
        )}
        {/* Landscape nav buttons: absolute overlays on the stage, outside the 3D ring.
            Positioned at fixed stage coords so they stay put while albums animate in. */}
        {!isPortrait && selectedId && (
          <>
            <button
              className="mc-nav-btn mc-nav-prev"
              style={{ position: 'absolute', width: NAV_BTN_SIZE, height: NAV_BTN_SIZE, top: navY - NAV_BTN_SIZE / 2, left: 'auto', right: `calc(50% + ${navXOff}px)`, display: 'flex', transform: 'none', zIndex: 5 }}
              onClick={(e) => { e.stopPropagation(); navigate(-1) }}
              aria-label="Previous track"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {prevTrack && (
              <p
                className="mc-nav-track-title mc-nav-track-title-prev"
                style={{ position: 'absolute', top: navY + 30, left: 'auto', right: `calc(50% + ${navXOff - NAV_LABEL_X_OFFSET}px)`, width: NAV_LABEL_WIDTH, zIndex: 5 }}
              >
                <span className="mc-nav-track-label">PREV</span> <span className="mc-dot">&bull;</span> {prevTrack.title}
              </p>
            )}
            <button
              className="mc-nav-btn mc-nav-next"
              style={{ position: 'absolute', width: NAV_BTN_SIZE, height: NAV_BTN_SIZE, top: navY - NAV_BTN_SIZE / 2, left: `calc(50% + ${navXOff}px)`, display: 'flex', transform: 'none', zIndex: 5 }}
              onClick={(e) => { e.stopPropagation(); navigate(1) }}
              aria-label="Next track"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {nextTrack && (
              <p
                className="mc-nav-track-title mc-nav-track-title-next"
                style={{ position: 'absolute', top: navY + 30, left: `calc(50% + ${navXOff - NAV_LABEL_X_OFFSET}px)`, width: NAV_LABEL_WIDTH, zIndex: 5 }}
              >
                <span className="mc-nav-track-label">NEXT</span> <span className="mc-dot">&bull;</span> {nextTrack.title}
              </p>
            )}
          </>
        )}
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
              {previewUrl && (
                <div className="mc-playhead" aria-hidden>
                  <div className="mc-playhead-track">
                    <div className="mc-playhead-fill" style={{ width: `${progress * 100}%` }} />
                    <div className="mc-playhead-thumb" style={{ left: `${progress * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            {previewUrl ? (
              <button
                className={`mc-play${playing ? ' is-playing' : ''}`}
                onClick={togglePlay}
                aria-label={playing ? 'Pause preview' : 'Play preview'}
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            ) : (
              <a
                className="mc-play"
                href={spotifyFallback}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in Spotify"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M8 5v14l11-7z" /></svg>
              </a>
            )}
          </>
        )}
      </div>

      <p className="mc-hint">{selected ? '' : 'drag to spin · tap a cover to play'}</p>
    </div>
  )
}