import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Old devlog URLs → new /blog slugs (date prefix dropped)
      { source: '/devlog/2026-02-25-pokemon-cards', destination: '/blog/pokemon-cards', permanent: true },
      { source: '/devlog/2026-03-07-audio-visualizer', destination: '/blog/audio-visualizer', permanent: true },
      { source: '/devlog/2026-03-21-nintendo-games', destination: '/blog/nintendo-games', permanent: true },
      { source: '/devlog/2026-04-15-oreos-dashboard', destination: '/blog/oreos-dashboard', permanent: true },
      // Anything else under /devlog (and the index) → blog home
      { source: '/devlog', destination: '/blog', permanent: true },
      { source: '/devlog/:path*', destination: '/blog', permanent: true },
    ]
  },
}

export default nextConfig
