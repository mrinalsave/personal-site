import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'music carousel',
  description: "a 3d carousel of mrinal's spotify playlists.",
  alternates: { canonical: 'https://www.mrinalsave.com/music' },
}

export default function MusicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
