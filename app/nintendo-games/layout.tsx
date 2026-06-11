import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'nintendo switch games',
  icons: { icon: '/nintendo-games/assets/images/favicon.ico' },
}

export default function NintendoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
