'use client'
import dynamic from 'next/dynamic'

const ArtGrid = dynamic(() => import('@/components/ArtGrid'), { ssr: false })

export default function ArtPage() {
  return (
    <main className="art-layout">
      <ArtGrid />
    </main>
  )
}
