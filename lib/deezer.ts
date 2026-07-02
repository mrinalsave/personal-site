// Server-only Deezer enrichment for the /songs-in-rotation carousel.
// fetchDeezerData() is called from the /api/deezer route on demand (when a
// card is tapped). Each underlying fetch is cached 24h by Next.js data cache,
// so the same track URL is only hit once per day.

export interface DeezerData {
  previewUrl?: string
}

async function deezerGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.deezer.com${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

interface SearchHit {
  preview: string
  title: string
  isrc?: string
  artist: { name: string }
}

interface SearchResult {
  data?: SearchHit[]
}

// Strips punctuation and lowercases so "Misbehave" ≈ "misbehave (feat. x)".
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()

// Title match: one must be a prefix of the other so "low (feat. x)" ≈ "low"
// but "dj low" ≠ "low".
const titleMatch = (a: string, b: string) => {
  const na = norm(a), nb = norm(b)
  return na === nb || na.startsWith(nb) || nb.startsWith(na)
}

// Artist match: exact, or the shorter name is ≥70% of the longer so minor
// suffixes/prefixes are tolerated but "hadi" ≠ "hadi wibowo" (36%).
const artistMatch = (a: string, b: string) => {
  const na = norm(a), nb = norm(b)
  if (na === nb) return true
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na]
  return longer.startsWith(shorter) && shorter.length / longer.length >= 0.7
}

export async function fetchDeezerData(artist: string, title: string, isrc?: string): Promise<DeezerData> {
  // Spotify joins multiple artists with ", "; Deezer indexes by primary artist only.
  const primaryArtist = artist.split(',')[0].trim()

  // Strict field search first; fall back to a plain query for artists whose
  // Spotify name has a slight variation on Deezer (e.g. features in the name).
  const strictQ = `artist:"${primaryArtist}" track:"${title}"`
  let search = await deezerGet<SearchResult>(
    `/search?q=${encodeURIComponent(strictQ)}&limit=1`,
  )
  if (!search?.data?.length) {
    const fallbackQ = `${primaryArtist} ${title}`
    search = await deezerGet<SearchResult>(
      `/search?q=${encodeURIComponent(fallbackQ)}&limit=1`,
    )
  }
  const hit = search?.data?.[0]
  if (!hit) return {}

  // Validate the match. ISRC is an exact cross-platform identifier, so prefer
  // it when Spotify provides one. Fall back to fuzzy title+artist checks only
  // when ISRC is absent (rare for real catalog tracks).
  if (isrc) {
    if (hit.isrc?.toUpperCase() !== isrc.toUpperCase()) return {}
  } else {
    if (!titleMatch(hit.title, title) || !artistMatch(hit.artist.name, primaryArtist)) return {}
  }

  const previewUrl = hit.preview || undefined

  return { previewUrl }
}
