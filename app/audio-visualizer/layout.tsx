import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'audio visualizer',
  description: 'a real-time audio visualizer.',
  icons: { icon: '/audio-visualizer/assets/images/favicon.ico' },
  alternates: { canonical: 'https://www.mrinalsave.com/audio-visualizer' },
}

export default function AudioVisualizerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
