import MusicCarousel from '@/components/MusicCarousel'
import { getMusicData } from '@/lib/spotify'

// How often the Spotify data is refreshed, in seconds (ISR). Easy to tweak.
export const revalidate = 3600

export default async function MusicPage() {
  const { playlists, defaultId } = await getMusicData()
  return (
    <main className="music-layout">
      <MusicCarousel playlists={playlists} defaultPlaylistId={defaultId} />
    </main>
  )
}
