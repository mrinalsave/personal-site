import { SPOTIFY_REDIRECT_URI } from '../redirectUri'

// One-time setup: receives the OAuth code, exchanges it for a refresh token,
// and shows it so you can paste it into SPOTIFY_REFRESH_TOKEN (.env.local + Vercel).
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get('code')
  if (!code) return new Response('Missing ?code', { status: 400 })

  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET
  if (!id || !secret) return new Response('SPOTIFY_CLIENT_ID/SECRET not set', { status: 500 })

  const redirectUri = SPOTIFY_REDIRECT_URI
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  })
  const json = await res.json()
  if (!res.ok || !json.refresh_token) {
    return new Response(`Token exchange failed: ${JSON.stringify(json)}`, { status: 500 })
  }

  const html = `<!doctype html><meta charset="utf-8">
    <body style="font-family:system-ui;max-width:640px;margin:48px auto;line-height:1.5">
    <h2>Spotify connected ✅</h2>
    <p>Add this to <code>.env.local</code> (and your Vercel env), then restart the dev server:</p>
    <pre style="background:#f3f1ee;padding:16px;border-radius:8px;white-space:pre-wrap;word-break:break-all">SPOTIFY_REFRESH_TOKEN=${json.refresh_token}</pre>
    <p>Once saved you can delete <code>app/api/spotify/</code>.</p>
    </body>`
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
