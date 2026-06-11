import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'oreo dashboard',
  icons: { icon: '/oreos/assets/images/favicon.ico' },
}

export default function OreosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
