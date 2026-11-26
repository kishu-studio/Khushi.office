import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DESIGNER } from '../content.js'

// "Hire Khushi": opens a small panel with WhatsApp and email.
export default function Hire({ className = 'link', label = 'Hire Khushi', up = false }) {
  const [open, setOpen] = useState(null) // the button's rect while open
  const ref = useRef()
  const panel = useRef()
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && !panel.current?.contains(e.target) && setOpen(null)
    const esc = (e) => e.key === 'Escape' && setOpen(null)
    addEventListener('pointerdown', close)
    addEventListener('keydown', esc)
    return () => {
      removeEventListener('pointerdown', close)
      removeEventListener('keydown', esc)
    }
  }, [open])
  return (
    <span className={`hire ${up ? 'up' : ''}`} ref={ref}>
      <button className={className} onClick={(e) => setOpen((o) => (o ? null : e.currentTarget.getBoundingClientRect()))} aria-expanded={!!open}>
        {label}
      </button>
      {open &&
        createPortal(
        <span
          className="hire-panel"
          role="menu"
          ref={panel}
          style={{
            right: Math.max(12, innerWidth - open.right),
            ...(up ? { bottom: innerHeight - open.top + 10 } : { top: open.bottom + 10 }),
          }}
        >
          <strong>{DESIGNER.fullName}</strong>
          <a href={DESIGNER.whatsapp} target="_blank" rel="noopener noreferrer" role="menuitem">
            WhatsApp <em>{DESIGNER.phone}</em>
          </a>
          <a href={DESIGNER.mailto} role="menuitem">
            Email <em>{DESIGNER.email}</em>
          </a>
        </span>,
          document.body,
        )}
    </span>
  )
}
