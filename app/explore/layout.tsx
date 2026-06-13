import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'explore',
}

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
