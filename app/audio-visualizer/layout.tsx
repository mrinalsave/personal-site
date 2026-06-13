import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'audio visualizer',
  icons: { icon: '/audio-visualizer/assets/images/favicon.ico' },
}

export default function AudioVisualizerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
