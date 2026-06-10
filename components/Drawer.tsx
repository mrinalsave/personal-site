'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
}

const BUILD_NOTES: Record<string, string> = {
  '/audio-visualizer':             '/devlog/2026-03-07-audio-visualizer',
  '/nintendo-games':               '/devlog/2026-03-21-nintendo-games',
  '/nintendo-games/all-software':  '/devlog/2026-03-21-nintendo-games',
  '/pokemon-cards':                '/devlog/2026-02-25-pokemon-cards',
  '/oreos':                        '/devlog/2026-04-15-oreos-dashboard',
}

export default function Drawer({ isOpen, onClose }: DrawerProps) {
  const { isDark, toggle } = useTheme()
  const pathname = usePathname()
  const buildNotesHref = BUILD_NOTES[pathname] ?? null

  const handleThemeToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    toggle()
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
        <Link href="/devlog" onClick={onClose}>blog</Link>
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
