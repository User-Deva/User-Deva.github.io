'use client'

import { useEffect, useRef } from 'react'

export default function Hero() {
  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 2rem',
        maxWidth: '900px',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {/* Glow blob */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '-10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(110,231,183,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'pulse-slow 6s ease-in-out infinite',
        }}
      />

      {/* Availability badge */}
      <div
        className="animate-fade-up"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.9rem',
          border: '1px solid rgba(110,231,183,0.25)',
          borderRadius: '100px',
          fontSize: '0.8rem',
          color: 'var(--accent)',
          marginBottom: '2.5rem',
          width: 'fit-content',
          letterSpacing: '0.04em',
          fontFamily: 'var(--font-display)',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent)',
            animation: 'pulse-slow 2s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
        Available for work
      </div>

      {/* Main heading */}
      <h1
        className="animate-fade-up delay-100"
        style={{
          fontSize: 'clamp(3rem, 8vw, 6.5rem)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.0,
          marginBottom: '1.5rem',
          color: 'var(--text-primary)',
        }}
      >
        Optimizing supply
        <br />
        <span
          style={{
            color: 'transparent',
            WebkitTextStroke: '1px rgba(255,255,255,0.2)',
          }}
        >
          chains, end to end.
        </span>
      </h1>

      {/* Sub text */}
      <p
        className="animate-fade-up delay-200"
        style={{
          fontSize: '1.15rem',
          color: 'var(--text-secondary)',
          maxWidth: '520px',
          marginBottom: '3rem',
          lineHeight: 1.7,
          fontWeight: 300,
        }}
      >
        I'm <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Devang Patidar</strong>, a
        Supply Chain Analyst with 4+ years across aerospace, e-commerce, and logistics —
        turning demand forecasts, ERP data, and Lean Six Sigma into measurable cost
        savings and OTIF gains.
      </p>

      {/* CTA buttons */}
      <div
        className="animate-fade-up delay-300"
        style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}
      >
        <a
          href="#projects"
          style={{
            padding: '0.75rem 1.75rem',
            background: 'var(--accent)',
            color: '#000',
            borderRadius: '8px',
            textDecoration: 'none',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '0.9rem',
            letterSpacing: '0.01em',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          See my work
        </a>
        <a
          href="#contact"
          style={{
            padding: '0.75rem 1.75rem',
            border: '1px solid var(--border-hover)',
            color: 'var(--text-primary)',
            borderRadius: '8px',
            textDecoration: 'none',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '0.9rem',
            letterSpacing: '0.01em',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
        >
          Get in touch
        </a>
      </div>

      {/* Scroll indicator */}
      <div
        className="animate-fade-up delay-500"
        style={{
          position: 'absolute',
          bottom: '3rem',
          left: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          fontFamily: 'var(--font-display)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '1px',
            background: 'var(--text-muted)',
          }}
        />
        SCROLL
      </div>
    </section>
  )
}
