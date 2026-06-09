import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'mrinalsave',
  description: 'my digital archive',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
