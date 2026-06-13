import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'oreo dashboard',
  description: 'mrinal and friends\' Oreo flavor ratings.',
  icons: { icon: '/oreos/assets/images/favicon.ico' },
  alternates: { canonical: 'https://www.mrinalsave.com/oreos' },
}

export default function OreosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
