export const dynamic = 'force-dynamic'

import { getNintendoGames } from '@/lib/queries'
import type { NintendoGame } from '@/lib/types'
import NintendoAllSoftware from '@/components/NintendoAllSoftware'

export default async function NintendoAllSoftwarePage() {
  const games: NintendoGame[] = await getNintendoGames()
  return <NintendoAllSoftware games={games} />
}
