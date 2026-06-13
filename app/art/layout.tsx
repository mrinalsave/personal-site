import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'art gallery',
  icons: { icon: '/art/assets/images/favicon.ico' },
}

export default function ArtLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
