'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
}

const BUILD_NOTES: Record<string, string> = {
  '/audio-visualizer':             '/blog/audio-visualizer',
  '/nintendo-games':               '/blog/nintendo-games',
  '/nintendo-games/all-software':  '/blog/nintendo-games',
  '/pokemon-cards':                '/blog/pokemon-cards',
  '/oreos':                        '/blog/oreos-dashboard',
}

export default function Drawer({ isOpen, onClose }: DrawerProps) {
  const { isDark, toggle } = useTheme()
  const pathname = usePathname()
  const buildNotesHref = BUILD_NOTES[pathname] ?? null

  const handleThemeToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    toggle()
    ;(e.currentTarget as HTMLElement).blur()
  }

  return (
    <>
      <div
        className={`drawer-scrim${isOpen ? ' active' : ''}`}
        onClick={onClose}
      />
      <div className={`mobile-drawer${isOpen ? ' open' : ''}`}>
        <Link href="/" onClick={onClose}>home</Link>
        <Link href="/explore" onClick={onClose}>explore</Link>
        <Link href="/blog" onClick={onClose}>blog</Link>
        <Link href="/about" onClick={onClose}>about</Link>
        {buildNotesHref && (
          <Link href={buildNotesHref} onClick={onClose}>📑 see build notes</Link>
        )}
        <a href="#" onClick={handleThemeToggle}>
          {isDark ? '🌑 toggle dark mode' : '☀️ toggle light mode'}
        </a>
      </div>
    </>
  )
}
