import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'nintendo switch games',
  description: "mrinal's nintendo switch game collection and ratings.",
  icons: { icon: '/nintendo-games/assets/images/favicon.ico' },
  alternates: { canonical: 'https://www.mrinalsave.com/nintendo-games' },
}

export default function NintendoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
