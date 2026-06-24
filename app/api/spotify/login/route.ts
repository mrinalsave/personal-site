import { NextResponse } from 'next/server'
import { SPOTIFY_REDIRECT_URI } from '../redirectUri'

// One-time setup: visit /api/spotify/login, authorize, then copy the refresh
// token shown by the callback into SPOTIFY_REFRESH_TOKEN. Not used at runtime.
export const dynamic = 'force-dynamic'

export function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) return new NextResponse('SPOTIFY_CLIENT_ID not set', { status: 500 })

  const redirectUri = SPOTIFY_REDIRECT_URI
  const url = new URL('https://accounts.spotify.com/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', 'playlist-read-private playlist-read-collaborative')
  return NextResponse.redirect(url.toString())
}
