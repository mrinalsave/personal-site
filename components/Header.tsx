'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

interface HeaderProps {
  onHamburgerClick: () => void
}

const BUILD_NOTES: Record<string, string> = {
  '/audio-visualizer':          '/blog/audio-visualizer',
  '/nintendo-games':            '/blog/nintendo-games',
  '/nintendo-games/all-software': '/blog/nintendo-games',
  '/pokemon-cards':             '/blog/pokemon-cards',
  '/oreos':                     '/blog/oreos-dashboard',
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
    '/songs-in-rotation': 'songs in rotation',
  }
  const pageTitle = pageTitles[pathname] ?? null
  const buildNotesHref = BUILD_NOTES[pathname] ?? null
  // Audio visualizer forces dark — don't show theme toggle.
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
        <Link href="/blog">blog</Link>
        <Link href="/about">about</Link>
        {buildNotesHref && (
          <Link href={buildNotesHref}>📑</Link>
        )}
        {showThemeToggle && (
          <button
            onClick={(e) => { toggle(); e.currentTarget.blur() }}
            aria-label="toggle theme"
            className="theme-toggle"
          >
            {isDark ? '🌑' : '☀️'}
          </button>
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
