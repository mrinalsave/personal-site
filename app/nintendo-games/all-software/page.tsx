export const dynamic = 'force-dynamic'

import { getNintendoGames } from '@/lib/queries'
import type { NintendoGame } from '@/lib/types'
import NintendoAllSoftware from '@/components/NintendoAllSoftware'

export default async function NintendoAllSoftwarePage() {
  const games: NintendoGame[] = (await getNintendoGames())
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
  return <NintendoAllSoftware games={games} />
}
