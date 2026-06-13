import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'explore',
  description: 'browse through projects and experiments by mrinal save.',
  alternates: { canonical: 'https://www.mrinalsave.com/explore' },
}

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
