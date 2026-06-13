import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'favorite pokémon cards',
  description: "mrinal\'s favorite pokémon cards.",
  icons: { icon: '/pokemon-cards/assets/images/favicon.ico' },
  alternates: { canonical: 'https://www.mrinalsave.com/pokemon-cards' },
}

export default function PokemonLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
