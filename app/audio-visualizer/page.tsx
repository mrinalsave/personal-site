'use client'
import dynamic from 'next/dynamic'

const AudioVisualizerCanvas = dynamic(
  () => import('@/components/AudioVisualizerCanvas'),
  { ssr: false }
)

export default function AudioVisualizerPage() {
  return <AudioVisualizerCanvas />
}
