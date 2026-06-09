export const dynamic = 'force-dynamic'

import { getNintendoGames } from '@/lib/queries'
import type { NintendoGame } from '@/lib/types'

export default async function NintendoGamesPage() {
  const games: NintendoGame[] = await getNintendoGames()

  return (
    <main style={{ paddingTop: '52px' }}>
      {/* Phase 5: NintendoGamesCarousel — games data ready */}
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-retro)', fontSize: '1.2rem' }}>
          nintendo switch games
        </p>
        <p style={{ opacity: 0.5, fontSize: '0.85rem', marginTop: '0.5rem' }}>
          {games.length} titles · full UI coming soon
        </p>
      </div>
    </main>
  )
}
