export const dynamic = 'force-dynamic'

import { getNintendoGames } from '@/lib/queries'
import type { NintendoGame } from '@/lib/types'
import NintendoHomeScreen from '@/components/NintendoHomeScreen'

export default async function NintendoGamesPage() {
  const games: NintendoGame[] = await getNintendoGames()
  return <NintendoHomeScreen games={games} />
}
