import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'oreo dashboard',
  description: 'an interactive dashboard ranking every oreo flavor.',
  icons: { icon: '/oreos/assets/images/favicon.ico' },
  alternates: { canonical: 'https://www.mrinalsave.com/oreos' },
}

export default function OreosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
