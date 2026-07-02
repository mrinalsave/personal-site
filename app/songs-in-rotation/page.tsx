import SongsInRotation from '@/components/SongsInRotation'
import { getMusicData } from '@/lib/spotify'

// How often the Spotify data is refreshed, in seconds (ISR). Easy to tweak.
export const revalidate = 3600

export default async function SongsInRotationPage() {
  const { playlists, defaultId, error } = await getMusicData()

  if (error) {
    return (
      <main className="songs-in-rotation-layout">
        <div className="songs-in-rotation-error">
          <p>oops, looks like something went wrong.</p>
          <p>come back and try again later!</p>
        </div>
      </main>
    )
  }

  return (
    <main className="songs-in-rotation-layout">
      <SongsInRotation playlists={playlists} defaultPlaylistId={defaultId} />
    </main>
  )
}
