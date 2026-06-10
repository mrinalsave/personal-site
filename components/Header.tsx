'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

interface HeaderProps {
  onHamburgerClick: () => void
}

const BUILD_NOTES: Record<string, string> = {
  '/audio-visualizer':          '/devlog/2026-03-07-audio-visualizer',
  '/nintendo-games':            '/devlog/2026-03-21-nintendo-games',
  '/nintendo-games/all-software': '/devlog/2026-03-21-nintendo-games',
  '/pokemon-cards':             '/devlog/2026-02-25-pokemon-cards',
  '/oreos':                     '/devlog/2026-04-15-oreos-dashboard',
}

export default function Header({ onHamburgerClick }: HeaderProps) {
  const pathname = usePathname()
  const { isDark, toggle } = useTheme()

  const pageTitles: Record<string, string> = {
    '/art': 'art gallery',
    '/nintendo-games': 'nintendo switch games',
    '/nintendo-games/all-software': 'nintendo games',
    '/pokemon-cards': 'favorite pokémon cards',
    '/oreos': 'oreo dashboard',
    '/audio-visualizer': 'audio visualizer',
  }
  const pageTitle = pageTitles[pathname] ?? null
  const buildNotesHref = BUILD_NOTES[pathname] ?? null
  // Audio visualizer forces dark — theme toggle is replaced by build notes
  const showThemeToggle = pathname !== '/audio-visualizer'

  return (
    <header>
      <Link href="/" className="header-logo">🍀</Link>

      {pageTitle && (
        <p className="retro-text header-title">{pageTitle}</p>
      )}

      <nav>
        <Link href="/">home</Link>
        <Link href="/explore">explore</Link>
        <Link href="/devlog">blog</Link>
        <Link href="/about">about</Link>
        {buildNotesHref && (
          <Link href={buildNotesHref}>build notes</Link>
        )}
        {showThemeToggle && (
          <a href="#" onClick={(e) => { e.preventDefault(); toggle() }}>
            {isDark ? '🌑' : '☀️'}
          </a>
        )}
      </nav>

      <button
        className="hamburger"
        aria-label="open menu"
        onClick={onHamburgerClick}
      >
        <span /><span /><span />
      </button>
    </header>
  )
}
