import { fetchDeezerData } from '@/lib/deezer'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const artist = searchParams.get('artist')?.trim() ?? ''
  const title = searchParams.get('title')?.trim() ?? ''
  const isrc = searchParams.get('isrc')?.trim() || undefined
  if (!artist || !title) return Response.json({}, { status: 400 })

  console.log(`[deezer] artist=${artist} title=${title} isrc=${isrc ?? 'none'}`)
  const data = await fetchDeezerData(artist, title, isrc)
  return Response.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
