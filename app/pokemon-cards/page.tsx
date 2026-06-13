export const dynamic = 'force-dynamic'

import { getPokemonCards } from '@/lib/queries'
import type { PokemonCard } from '@/lib/types'
import PokemonCards from '@/components/PokemonCards'

export default async function PokemonCardsPage() {
  const all: PokemonCard[] = await getPokemonCards()
  const cards = all.filter(c => c.type === 'card')
  const gifs = all.filter(c => c.type === 'gif')
  return <PokemonCards cards={cards} gifs={gifs} />
}
