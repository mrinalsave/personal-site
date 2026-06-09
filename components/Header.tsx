'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

interface HeaderProps {
  onHamburgerClick: () => void
}

export default function Header({ onHamburgerClick }: HeaderProps) {
  const pathname = usePathname()
  const { isDark, toggle } = useTheme()

  const pageTitle = pathname === '/art' ? 'art gallery' : null

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
        <a href="#" onClick={(e) => { e.preventDefault(); toggle() }}>
          {isDark ? '🌑' : '☀️'}
        </a>
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
