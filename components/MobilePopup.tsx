'use client'
import { useEffect, useRef } from 'react'

export default function MobilePopup() {
  const popupRef = useRef<HTMLDivElement>(null)

  const hide = () => {
    const popup = popupRef.current
    if (!popup || popup.style.display === 'none') return
    popup.classList.add('hiding')
    popup.addEventListener('animationend', () => {
      popup.style.display = 'none'
      popup.classList.remove('hiding')
    }, { once: true })
  }

  const handleClose = () => {
    hide()
    localStorage.setItem('popupDismissed', 'true')
  }

  useEffect(() => {
    const popup = popupRef.current
    if (!popup) return

    const check = () => {
      if (
        (window.innerWidth <= 768 || window.innerHeight <= 500) &&
        localStorage.getItem('popupDismissed') !== 'true'
      ) {
        popup.classList.remove('hiding')
        popup.style.display = 'block'
      } else {
        hide()
      }
    }

    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div ref={popupRef} className="mobile-popup" style={{ display: 'none' }}>
      <div className="popup-header">
        <h4 className="popup-title">hey listen!</h4>
        <button className="popup-close" onClick={handleClose}>ok</button>
      </div>
      <div className="popup-body">
        <p>this site is best experienced on desktop, so some functionality may be impacted on mobile. please check it out on desktop when you get the chance !</p>
      </div>
    </div>
  )
}
