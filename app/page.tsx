'use client'
import { useTheme } from '@/contexts/ThemeContext'

export default function Home() {
  const { isDark } = useTheme()

  return (
    <>
      <picture className="bg-gif">
        <source
          media="(max-width: 1024px) and (orientation: portrait)"
          srcSet={isDark ? '/assets/images/mobile-bg-dark.gif' : '/assets/images/mobile-bg.gif'}
        />
        <img
          src={isDark ? '/assets/images/desktop-bg-dark.gif' : '/assets/images/desktop-bg.gif'}
          alt=""
          aria-hidden
        />
      </picture>
      <main>
        <div className="content" />
      </main>
    </>
  )
}
