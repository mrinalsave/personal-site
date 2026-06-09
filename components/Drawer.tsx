'use client'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function Drawer({ isOpen, onClose }: DrawerProps) {
  const { isDark, toggle } = useTheme()

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
        <a href="#" onClick={handleThemeToggle}>
          {isDark ? '🌑 toggle dark mode' : '☀️ toggle light mode'}
        </a>
      </div>
    </>
  )
}
