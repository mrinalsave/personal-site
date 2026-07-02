import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'songs in rotation',
  description: "a 3D carousel of mrinal's spotify playlists.",
  alternates: { canonical: 'https://www.mrinalsave.com/songs-in-rotation' },
}

export default function SongsInRotationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
