export const dynamic = 'force-dynamic'

import { getPokemonCards } from '@/lib/queries'
import type { PokemonCard } from '@/lib/types'

export default async function PokemonCardsPage() {
  const cards: PokemonCard[] = await getPokemonCards()
  const staticCards = cards.filter(c => c.type === 'card')
  const gifs = cards.filter(c => c.type === 'gif')

  return (
    <main style={{ paddingTop: '52px' }}>
      {/* Phase 5: PokemonCardGrid with vanilla-tilt — cards data ready */}
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-retro)', fontSize: '1.2rem' }}>
          favorite pokémon cards
        </p>
        <p style={{ opacity: 0.5, fontSize: '0.85rem', marginTop: '0.5rem' }}>
          {staticCards.length} cards · {gifs.length} gifs · full UI coming soon
        </p>
      </div>
    </main>
  )
}
