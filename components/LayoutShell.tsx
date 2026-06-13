'use client'
import { useState } from 'react'
import Header from './Header'
import Drawer from './Drawer'
import Footer from './Footer'
import MobilePopup from './MobilePopup'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <Header onHamburgerClick={() => setDrawerOpen(true)} />
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {children}
      <Footer />
      <MobilePopup />
    </>
  )
}
