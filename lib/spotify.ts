// Server-only Spotify data for the /music carousel.
// Uses a one-time-authorized user refresh token (Authorization Code flow) so we
// can read the owner's playlists and their tracks. The refresh token lives in
// SPOTIFY_REFRESH_TOKEN (see app/api/spotify/login to mint it).
// On any failure it falls back to the bundled mock playlists so the page
// always renders.

import { PLAYLISTS, type Playlist, type Track } from './musicMockData'

/* ── Config (edit here) ─────────────────────────────────────────────── */
export const PLAYLIST_LIMIT = 10   // max playlists shown in the carousel
export const MAX_TRACKS = 200      // safety cap; effectively "all" for normal playlists

/* ── User access token via refresh token (cached until expiry) ───────── */
let cachedToken: { value: string; expires: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.value

  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET
  const refresh = process.env.SPOTIFY_REFRESH_TOKEN
  if (!id || !secret) throw new Error('SPOTIFY_CLIENT_ID/SECRET not set')
  if (!refresh) throw new Error('SPOTIFY_REFRESH_TOKEN not set (run /api/spotify/login once)')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  })
  if (!res.ok) throw new Error(`Spotify refresh -> ${res.status}`)
  const json = await res.json()
  cachedToken = {
    value: json.access_token,
    expires: Date.now() + (json.expires_in - 60) * 1000, // refresh a minute early
  }
  return cachedToken.value
}

async function spotifyGet(path: string, retries = 2): Promise<unknown> {
  const token = await getAccessToken()
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.status === 429 && retries > 0) {
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '1', 10)
    console.warn(`[spotify] 429 rate-limited on ${path} — waiting ${retryAfter}s (${retries} retr${retries === 1 ? 'y' : 'ies'} left)`)
    await new Promise((r) => setTimeout(r, retryAfter * 1_000))
    return spotifyGet(path, retries - 1)
  }

  if (!res.ok) throw new Error(`Spotify ${path} -> ${res.status}`)
  return res.json()
}

/* ── Mapping ─────────────────────────────────────────────────────────── */
interface SpotifyImage { url: string }
interface SpotifyApiTrack {
  id: string
  name: string
  type: string
  is_local: boolean
  artists: { name: string }[]
  album: { name: string; release_date: string; images: SpotifyImage[] }
}

// The current playlist-items endpoint nests the song under `item` (the old
// `/tracks` + `track` shape is deprecated and now returns 403).
function mapTrack(entry: { item: SpotifyApiTrack | null }): Track | null {
  const t = entry?.item
  if (!t || !t.id || t.is_local || t.type !== 'track') return null
  const images = t.album?.images ?? []
  return {
    id: t.id,
    title: t.name,
    artist: (t.artists ?? []).map((a) => a.name).join(', '),
    album: t.album?.name ?? '',
    releaseDate: t.album?.release_date ?? '',
    coverUrl: images[1]?.url ?? images[0]?.url, // ~300px, else largest
  }
}

const TRACK_FIELDS =
  'total,items(item(id,name,type,is_local,artists(name),album(name,release_date,images)))'

async function fetchTracks(playlistId: string): Promise<Track[]> {
  const seen = new Set<string>()
  const out: Track[] = []
  for (let offset = 0; offset < MAX_TRACKS; offset += 50) {
    const data = await spotifyGet(
      `/playlists/${playlistId}/items?limit=50&offset=${offset}&fields=${TRACK_FIELDS}`,
    ) as { total?: number; items?: { item: SpotifyApiTrack | null }[] }
    const items = data.items ?? []
    for (const item of items) {
      const track = mapTrack(item)
      if (track && !seen.has(track.id)) { seen.add(track.id); out.push(track) }
    }
    if (items.length < 50 || offset + 50 >= (data.total ?? 0)) break
  }
  return out
}

interface Summary { id: string; name: string }

// Matches playlist names like "[jan 13 to jan 29]" or "[jun 08 to"
const BRACKET_PLAYLIST_RE = /^\[(\w{3}) (\d{1,2})/i

async function fetchBracketPlaylists(): Promise<Summary[]> {
  // /me/playlists returns playlists sorted by most-recently-modified, so the
  // active (current-year) bracket playlists naturally appear first.
  const data = await spotifyGet('/me/playlists?limit=50') as { items?: Summary[] }
  return (data.items ?? [])
    .filter((p) => BRACKET_PLAYLIST_RE.test(p.name))
    .slice(0, PLAYLIST_LIMIT)
    .map((p) => ({ id: p.id, name: p.name }))
}

/* ── Public entry point ──────────────────────────────────────────────── */
export async function getMusicData(): Promise<{ playlists: Playlist[]; defaultId: string }> {
  try {
    const summaries = await fetchBracketPlaylists()

    const playlists = (
      await Promise.all(
        summaries.map(async (s) => ({ id: s.id, name: s.name, tracks: await fetchTracks(s.id) })),
      )
    ).filter((p) => p.tracks.length > 0)

    if (!playlists.length) throw new Error('no tracks returned')
    return { playlists, defaultId: playlists[0].id }
  } catch (err) {
    console.error('[music] Spotify fetch failed, using mock data:', (err as Error).message)
    return { playlists: PLAYLISTS, defaultId: PLAYLISTS[0].id }
  }
}
