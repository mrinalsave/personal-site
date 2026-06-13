import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'art gallery',
  description: 'mrinal\'s digital art.',
  icons: { icon: '/art/assets/images/favicon.ico' },
  alternates: { canonical: 'https://www.mrinalsave.com/art' },
}

export default function ArtLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
