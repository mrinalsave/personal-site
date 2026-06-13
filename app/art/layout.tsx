import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'art gallery',
  description: 'digital and traditional art by mrinal save.',
  icons: { icon: '/art/assets/images/favicon.ico' },
  alternates: { canonical: 'https://www.mrinalsave.com/art' },
}

export default function ArtLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
