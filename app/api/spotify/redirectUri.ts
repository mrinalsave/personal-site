// The OAuth redirect URI must EXACTLY match what's registered in the Spotify
// dashboard. Spotify requires the loopback IP (127.0.0.1), not "localhost", for
// non-HTTPS URIs. Override via SPOTIFY_REDIRECT_URI for production (your https URL).
export const SPOTIFY_REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI ?? 'http://127.0.0.1:3000/api/spotify/callback'
