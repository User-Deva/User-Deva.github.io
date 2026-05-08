'use client'

import { useState, useEffect } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { label: 'Projects', href: '#projects' },
    { label: 'Skills',   href: '#skills'   },
    { label: 'Contact',  href: '#contact'  },
  ]

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '0 2rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,10,10,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Logo */}
      <a
        href="#"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.1rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          textDecoration: 'none',
          letterSpacing: '-0.02em',
        }}
      >
        DP<span style={{ color: 'var(--accent)' }}>.</span>
      </a>

      {/* Desktop nav */}
      <nav style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
        {links.map(link => (
          <a
            key={link.href}
            href={link.href}
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              letterSpacing: '0.02em',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            {link.label}
          </a>
        ))}
        <a
          href="/DPRSC.pdf"
          target="_blank"
          style={{
            padding: '0.4rem 1rem',
            border: '1px solid var(--border-hover)',
            borderRadius: '6px',
            color: 'var(--accent)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            letterSpacing: '0.02em',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(110,231,183,0.08)'
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'var(--border-hover)'
          }}
        >
          Resume
        </a>
      </nav>
    </header>
  )
}
